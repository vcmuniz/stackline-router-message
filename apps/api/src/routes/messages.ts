import { Router } from 'express';
import { PrismaClient, messageQueueService, webhookService, Prisma } from 'database';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET / - Listar mensagens com filtros
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

    // Para scroll infinito: buscar as N mais RECENTES e depois ordenar ASC
    const total = await prisma.message.count({ where });

    // Buscar TODAS as mensagens dessa conversa (não tem muitas, performance ok)
    const allMessages = await prisma.message.findMany({
      where,
      include: {
        integration: { select: { name: true, type: true } },
        fromContact: true,
        toContact: true
      }
    });

    // Ordenar por COALESCE(deliveredAt, sentAt, createdAt) ASC
    const sorted = allMessages.sort((a, b) => {
      const dateA = new Date(a.deliveredAt || a.sentAt || a.createdAt).getTime();
      const dateB = new Date(b.deliveredAt || b.sentAt || b.createdAt).getTime();
      return dateA - dateB;
    });

    // Paginação reversa: para página 1, pegar as últimas 20
    // Para página 2, pegar as 20 anteriores, etc
    const totalPages = Math.ceil(total / parseInt(limit));
    const reversePage = totalPages - parseInt(page) + 1;
    const startIdx = (reversePage - 1) * parseInt(limit);
    const messages = sorted.slice(startIdx, startIdx + parseInt(limit));

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

// GET /:id - Buscar mensagem por ID
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

// POST /send - Enviar mensagem usando messageQueueService
router.post('/send', authMiddleware, async (req: any, res) => {
  try {
    const {
      integrationId,
      toContact,
      content,
      mediaUrl,
      mediaType,
      scheduledAt,
      forceImmediate = true, // Padrão true para chat UI
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

    // Usar messageQueueService (forceImmediate vem do request)
    const message = await messageQueueService.createQueueMessage({
      integrationId,
      toPhone: toContact.phoneNumber,
      toEmail: toContact.email,
      toTelegramId: toContact.telegramId,
      toName: toContact.name,
      content,
      mediaUrl,
      mediaType,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      forceImmediate, // Usa valor do request (default true)
      metadata: {
        replyToId,
        threadId
      }
    });

    // Webhook já é enviado automaticamente no processMessage
    res.status(201).json(message);
  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
});

// PATCH /:id/status - Atualizar status da mensagem
router.patch('/:id/status', authMiddleware, async (req: any, res) => {
  try {
    const { status, errorMessage } = req.body;

    const message = await prisma.message.findFirst({
      where: {
        id: req.params.id,
        integration: { userId: req.userId }
      },
      include: { integration: true }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const updateData: any = { status };

    // Atualizar timestamps baseado no status
    if (status === 'DELIVERED') {
      updateData.deliveredAt = new Date();
    } else if (status === 'READ') {
      updateData.readAt = new Date();
    } else if (status === 'FAILED') {
      updateData.failedAt = new Date();
      updateData.errorMessage = errorMessage;
    }

    const updated = await prisma.message.update({
      where: { id: req.params.id },
      data: updateData
    });

    // Enviar webhook de acordo com o status
    if (status === 'DELIVERED') {
      await webhookService.sendEvent(message.integration.userId, 'message.delivered', {
        messageId: updated.id,
        integrationId: message.integrationId,
        deliveredAt: updated.deliveredAt
      });
    } else if (status === 'READ') {
      await webhookService.sendEvent(message.integration.userId, 'message.read', {
        messageId: updated.id,
        integrationId: message.integrationId,
        readAt: updated.readAt
      });
    } else if (status === 'FAILED') {
      await webhookService.sendEvent(message.integration.userId, 'message.failed', {
        messageId: updated.id,
        integrationId: message.integrationId,
        error: updated.errorMessage,
        failedAt: updated.failedAt
      });
    }

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating message status:', error);
    res.status(500).json({ error: error.message || 'Failed to update status' });
  }
});

// DELETE /:id - Deletar mensagem
router.delete('/:id', authMiddleware, async (req: any, res) => {
  try {
    const message = await prisma.message.findUnique({
      where: { id: req.params.id }
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

    await prisma.message.delete({
      where: { id: req.params.id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// GET /threads/:contactId - Buscar threads/conversas
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
