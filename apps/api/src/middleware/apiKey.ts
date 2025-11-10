import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from 'database';

const prisma = new PrismaClient();

// Rate limiting em memória (simples)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export interface ApiKeyRequest extends Request {
  apiKey?: any;
  userId?: number;
}

export const apiKeyMiddleware = async (req: ApiKeyRequest, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({ error: 'API Key required' });
    }

    // Buscar API Key no banco
    const key = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: { user: true }
    });

    if (!key) {
      return res.status(401).json({ error: 'Invalid API Key' });
    }

    if (!key.enabled) {
      return res.status(403).json({ error: 'API Key disabled' });
    }

    // Rate limiting
    const now = Date.now();
    const nowDate = new Date();

    if (key.expiresAt && key.expiresAt < nowDate) {
      return res.status(403).json({ error: 'API Key expired' });
    }
    const windowMs = 60 * 1000; // 1 minuto
    const limit = key.rateLimit;

    const rateLimit = rateLimitMap.get(apiKey);

    if (rateLimit && rateLimit.resetAt > now) {
      if (rateLimit.count >= limit) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          limit,
          resetIn: Math.ceil((rateLimit.resetAt - now) / 1000)
        });
      }
      rateLimit.count++;
    } else {
      rateLimitMap.set(apiKey, { count: 1, resetAt: now + windowMs });
    }

    // Atualizar lastUsedAt
    prisma.apiKey.update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() }
    }).catch(err => console.error('Error updating lastUsedAt:', err));

    req.apiKey = key;
    req.userId = key.userId;

    next();
  } catch (error) {
    console.error('API Key middleware error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

// Middleware para verificar permissões
export const requirePermission = (permission: string) => {
  return (req: ApiKeyRequest, res: Response, next: NextFunction) => {
    if (!req.apiKey) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const permissions = req.apiKey.permissions as string[];

    if (!permissions.includes(permission) && !permissions.includes('*')) {
      return res.status(403).json({ error: `Permission ${permission} required` });
    }

    next();
  };
};
