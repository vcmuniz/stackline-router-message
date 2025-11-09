import { Router } from 'express';
import { PrismaClient, evolutionManager, smtpManager } from 'database';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Listar mensagens com filtros
router.get('/', authMiddleware, async (req: any, res) => {
  try {
    const {
      integrationId,
      status,
      direction,
      contactId,
      threadId,
      page = 1,
      limit = 20
    } = req.query;

    // Verificar se o usuário tem acesso às integrações
    const userIntegrations = await prisma.integration.findMany({
      where: { userId: req.userId },
      select: { id: true }
    });

    const integrationIds = userIntegrations.map(i => i.id);

    const where: any = {
      integrationId: {
        in: integrationId ? [integrationId] : integrationIds
      }
    };

    if (status) where.status = status;
    if (direction) where.direction = direction;
    if (contactId) where.OR = [
      { fromContactId: contactId },
      { toContactId: contactId }
    ];
    if (threadId) where.threadId = threadId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: {
          integration: {
            select: {
              name: true,
              type: true
            }
          },
          fromContact: true,
          toContact: true,
          replyTo: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.message.count({ where })
    ]);

    res.json({
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Buscar mensagem por ID
router.get('/:id', authMiddleware, async (req: any, res) => {
  try {
    const message = await prisma.message.findUnique({
      where: { id: req.params.id },
      include: {
        integration: true,
        fromContact: true,
        toContact: true,
        replies: {
          include: {
            fromContact: true,
            toContact: true
          }
        },
        replyTo: true
      }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Verificar se o usuário tem acesso a essa mensagem
    const integration = await prisma.integration.findFirst({
      where: {
        id: message.integrationId,
        userId: req.userId
      }
    });

    if (!integration) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(message);
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

// Enviar mensagem
router.post('/send', authMiddleware, async (req: any, res) => {
  try {
    const {
      integrationId,
      toContact,
      content,
      mediaUrl,
      mediaType,
      replyToId,
      threadId
    } = req.body;

    // Verificar se a integração pertence ao usuário
    const integration = await prisma.integration.findFirst({
      where: {
        id: integrationId,
        userId: req.userId
      }
    });

    if (!integration) {
      return res.status(403).json({ error: 'Integration not found or access denied' });
    }

    if (integration.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Integration is not active' });
    }

    // Buscar ou criar contato
    let contact = await prisma.contact.findFirst({
      where: {
        integrationId,
        OR: [
          { phoneNumber: toContact.phoneNumber },
          { email: toContact.email },
          { telegramId: toContact.telegramId }
        ]
      }
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          integrationId,
          phoneNumber: toContact.phoneNumber,
          email: toContact.email,
          telegramId: toContact.telegramId,
          name: toContact.name
        }
      });
    }

    // Criar mensagem
    const message = await prisma.message.create({
      data: {
        integrationId,
        toContactId: contact.id,
        content,
        mediaUrl,
        mediaType,
        direction: 'OUTBOUND',
        status: 'PENDING',
        replyToId,
        threadId: threadId || undefined
      },
      include: {
        integration: true,
        toContact: true
      }
    });

    // Enviar mensagem através do serviço apropriado
    try {
      switch (integration.type) {
        case 'WHATSAPP_EVOLUTION':
        case 'WHATSAPP_BAILEYS':
          // Enviar via Evolution API
          const result = await evolutionManager.sendMessage(
            integrationId,
            contact.phoneNumber!,
            content,
            mediaUrl,
            mediaType
          );

          // Atualizar mensagem com ID externo e status
          await prisma.message.update({
            where: { id: message.id },
            data: {
              externalId: result.messageId,
              status: 'SENT',
              sentAt: new Date()
            }
          });
          break;

        case 'SMTP':
          // Enviar via SMTP
          await smtpManager.sendEmail(
            integrationId,
            contact.email!,
            'Nova Mensagem',
            content
          );

          await prisma.message.update({
            where: { id: message.id },
            data: {
              status: 'SENT',
              sentAt: new Date()
            }
          });
          break;

        default:
          // Outros tipos ainda não implementados
          console.log(`Envio não implementado para tipo: ${integration.type}`);
      }
    } catch (sendError) {
      console.error('Error sending message:', sendError);

      // Marcar como falhou
      await prisma.message.update({
        where: { id: message.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          errorMessage: String(sendError)
        }
      });
    }

    // Atualizar contador da integração
    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        messagesSent: { increment: 1 }
      }
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Atualizar status da mensagem
router.patch('/:id/status', authMiddleware, async (req: any, res) => {
  try {
    const { status, errorMessage } = req.body;

    const message = await prisma.message.findUnique({
      where: { id: req.params.id }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Verificar permissão
    const integration = await prisma.integration.findFirst({
      where: {
        id: message.integrationId,
        userId: req.userId
      }
    });

    if (!integration) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Atualizar timestamps baseado no status
    const updateData: any = { status };

    switch (status) {
      case 'SENT':
        updateData.sentAt = new Date();
        break;
      case 'DELIVERED':
        updateData.deliveredAt = new Date();
        await prisma.integration.update({
          where: { id: message.integrationId },
          data: { messagesDelivered: { increment: 1 } }
        });
        break;
      case 'READ':
        updateData.readAt = new Date();
        break;
      case 'FAILED':
        updateData.failedAt = new Date();
        updateData.errorMessage = errorMessage;
        await prisma.integration.update({
          where: { id: message.integrationId },
          data: { messagesFailed: { increment: 1 } }
        });
        break;
    }

    const updated = await prisma.message.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating message status:', error);
    res.status(500).json({ error: 'Failed to update message status' });
  }
});

// Deletar mensagem
router.delete('/:id', authMiddleware, async (req: any, res) => {
  try {
    const message = await prisma.message.findUnique({
      where: { id: req.params.id }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Verificar permissão
    const integration = await prisma.integration.findFirst({
      where: {
        id: message.integrationId,
        userId: req.userId
      }
    });

    if (!integration) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.message.delete({
      where: { id: req.params.id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Buscar threads/conversas
router.get('/threads/:contactId', authMiddleware, async (req: any, res) => {
  try {
    const { contactId } = req.params;
    const { integrationId } = req.query;

    // Verificar se o usuário tem acesso
    const integration = await prisma.integration.findFirst({
      where: {
        id: integrationId as string,
        userId: req.userId
      }
    });

    if (!integration) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const messages = await prisma.message.findMany({
      where: {
        integrationId: integrationId as string,
        OR: [
          { fromContactId: contactId },
          { toContactId: contactId }
        ]
      },
      include: {
        fromContact: true,
        toContact: true,
        replyTo: true
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json(messages);
  } catch (error) {
    console.error('Error fetching thread:', error);
    res.status(500).json({ error: 'Failed to fetch thread' });
  }
});

export default router;