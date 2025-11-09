import { Router } from 'express';
import { PrismaClient } from 'database';
import { authMiddleware } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// Listar API Keys do usuário
router.get('/', authMiddleware, async (req: any, res) => {
  try {
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: req.userId },
      select: {
        id: true,
        name: true,
        key: true,
        permissions: true,
        rateLimit: true,
        enabled: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(apiKeys);
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

// Criar nova API Key
router.post('/', authMiddleware, async (req: any, res) => {
  try {
    const { name, permissions, rateLimit = 60, expiresAt } = req.body;

    if (!name || !permissions || permissions.length === 0) {
      return res.status(400).json({ error: 'name and permissions are required' });
    }

    // Gerar chave única
    const key = `sk_${crypto.randomBytes(32).toString('hex')}`;

    const apiKey = await prisma.apiKey.create({
      data: {
        userId: req.userId,
        name,
        key,
        permissions,
        rateLimit,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      }
    });

    res.status(201).json(apiKey);
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

// Atualizar API Key
router.put('/:id', authMiddleware, async (req: any, res) => {
  try {
    const { name, permissions, rateLimit, enabled, expiresAt } = req.body;

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!apiKey) {
      return res.status(404).json({ error: 'API Key not found' });
    }

    const updated = await prisma.apiKey.update({
      where: { id: req.params.id },
      data: {
        name,
        permissions,
        rateLimit,
        enabled,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating API key:', error);
    res.status(500).json({ error: 'Failed to update API key' });
  }
});

// Deletar API Key
router.delete('/:id', authMiddleware, async (req: any, res) => {
  try {
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!apiKey) {
      return res.status(404).json({ error: 'API Key not found' });
    }

    await prisma.apiKey.delete({
      where: { id: req.params.id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

export default router;
