import { Router } from 'express';
import { PrismaClient, messageQueueService } from 'database';
import { apiKeyMiddleware, requirePermission } from '../middleware/apiKey';

const router = Router();
const prisma = new PrismaClient();

// Todas as rotas v1 usam API Key
router.use(apiKeyMiddleware);

// POST /v1/messages/send - Enviar mensagem
router.post('/messages/send', requirePermission('messages:send'), async (req: any, res) => {
  try {
    const {
      integrationId,
      phone,
      email,
      telegramId,
      message,
      mediaUrl,
      mediaType,
      scheduledAt,
      priority,
      forceImmediate = false
    } = req.body;

    if (!integrationId || !message) {
      return res.status(400).json({ error: 'integrationId and message are required' });
    }

    if (!phone && !email && !telegramId) {
      return res.status(400).json({ error: 'At least one contact method (phone, email, telegramId) is required' });
    }

    // Verificar se integração pertence ao usuário
    const integration = await prisma.integration.findFirst({
      where: {
        id: integrationId,
        userId: req.userId
      }
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Criar na fila
    const queueMessage = await messageQueueService.createQueueMessage({
      integrationId,
      toPhone: phone,
      toEmail: email,
      toTelegramId: telegramId,
      content: message,
      mediaUrl,
      mediaType,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      priority,
      forceImmediate
    });

    res.status(201).json({
      success: true,
      data: {
        id: queueMessage.id,
        status: queueMessage.status,
        scheduledAt: queueMessage.scheduledAt,
        message: forceImmediate ? 'Message sent immediately' : 'Message queued successfully'
      }
    });
  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
});

// GET /v1/messages - Listar mensagens
router.get('/messages', requirePermission('messages:read'), async (req: any, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    const where: any = {
      integration: { userId: req.userId },
      direction: 'OUTBOUND'
    };
    if (status) where.status = status;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: {
          integration: { select: { id: true, name: true, type: true } },
          toContact: { select: { name: true, phoneNumber: true, email: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.message.count({ where })
    ]);

    res.json({
      success: true,
      data: messages,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error listing messages:', error);
    res.status(500).json({ error: 'Failed to list messages' });
  }
});

// GET /v1/messages/:id - Detalhes da mensagem
router.get('/messages/:id', requirePermission('messages:read'), async (req: any, res) => {
  try {
    const message = await prisma.message.findFirst({
      where: {
        id: req.params.id,
        integration: { userId: req.userId }
      },
      include: {
        integration: true,
        toContact: true,
        fromContact: true
      }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ success: true, data: message });
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

// POST /v1/messages/:id/cancel - Cancelar mensagem
router.post('/messages/:id/cancel', requirePermission('messages:send'), async (req: any, res) => {
  try {
    const message = await prisma.message.findFirst({
      where: {
        id: req.params.id,
        integration: { userId: req.userId },
        status: 'PENDING'
      }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found or cannot be cancelled' });
    }

    await prisma.message.update({
      where: { id: req.params.id },
      data: { status: 'FAILED', errorMessage: 'Cancelled by user' }
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET /v1/messages/stats - Estatísticas
router.get('/messages/stats', requirePermission('messages:read'), async (req: any, res) => {
  try {
    const stats = await prisma.message.groupBy({
      by: ['status'],
      where: {
        integration: { userId: req.userId },
        direction: 'OUTBOUND'
      },
      _count: true
    });

    const result = stats.reduce((acc: any, stat: any) => {
      acc[stat.status.toLowerCase()] = stat._count;
      return acc;
    }, { pending: 0, sent: 0, delivered: 0, read: 0, failed: 0, received: 0 });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /v1/contacts - Listar contatos
router.get('/contacts', requirePermission('contacts:read'), async (req: any, res) => {
  try {
    const { integrationId, limit = 50, offset = 0 } = req.query;

    const where: any = {
      integration: { userId: req.userId }
    };

    if (integrationId) where.integrationId = integrationId;

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: {
          integration: { select: { id: true, name: true, type: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.contact.count({ where })
    ]);

    res.json({
      success: true,
      data: contacts,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error listing contacts:', error);
    res.status(500).json({ error: 'Failed to list contacts' });
  }
});

export default router;
