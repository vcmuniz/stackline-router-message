import { Router } from 'express';
import { PrismaClient, webhookService } from 'database';
import { authMiddleware } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// Listar webhooks do usuário
router.get('/', authMiddleware, async (req: any, res) => {
  try {
    const webhooks = await prisma.webhookEndpoint.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(webhooks);
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    res.status(500).json({ error: 'Failed to fetch webhooks' });
  }
});

// Criar webhook
router.post('/', authMiddleware, async (req: any, res) => {
  try {
    const { name, url, events } = req.body;

    if (!name || !url || !events || events.length === 0) {
      return res.status(400).json({ error: 'name, url and events are required' });
    }

    // Gerar secret para validação HMAC
    const secret = crypto.randomBytes(32).toString('hex');

    const webhook = await prisma.webhookEndpoint.create({
      data: {
        userId: req.userId,
        name,
        url,
        secret,
        events
      }
    });

    res.status(201).json(webhook);
  } catch (error) {
    console.error('Error creating webhook:', error);
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});

// Atualizar webhook
router.put('/:id', authMiddleware, async (req: any, res) => {
  try {
    const { name, url, events, enabled } = req.body;

    const webhook = await prisma.webhookEndpoint.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    const updated = await prisma.webhookEndpoint.update({
      where: { id: req.params.id },
      data: { name, url, events, enabled }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating webhook:', error);
    res.status(500).json({ error: 'Failed to update webhook' });
  }
});

// Deletar webhook
router.delete('/:id', authMiddleware, async (req: any, res) => {
  try {
    const webhook = await prisma.webhookEndpoint.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    await prisma.webhookEndpoint.delete({
      where: { id: req.params.id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting webhook:', error);
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
});

// Testar webhook
router.post('/:id/test', authMiddleware, async (req: any, res) => {
  try {
    await webhookService.testWebhook(req.params.id, req.userId);
    res.json({ success: true, message: 'Test webhook sent' });
  } catch (error: any) {
    console.error('Error testing webhook:', error);
    res.status(500).json({ error: error.message || 'Failed to test webhook' });
  }
});

// Logs do webhook
router.get('/:id/logs', authMiddleware, async (req: any, res) => {
  try {
    const webhook = await prisma.webhookEndpoint.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    const logs = await prisma.webhookOutboundLog.findMany({
      where: { endpointId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    res.json(logs);
  } catch (error) {
    console.error('Error fetching webhook logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

export default router;
