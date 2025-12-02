import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

let prisma: PrismaClient | null = null;

const getPrisma = () => {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
};

export class ApiKeyService {
  static async listApiKeys(userId: string) {
    const client = getPrisma();
    return await client.apiKey.findMany({
      where: { userId },
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
  }

  static async createApiKey(userId: string, data: any) {
    const { name, permissions, rateLimit = 60, expiresAt } = data;
    const client = getPrisma();

    if (!name || !permissions || permissions.length === 0) {
      throw new Error('name and permissions are required');
    }

    const key = `sk_${crypto.randomBytes(32).toString('hex')}`;

    return await client.apiKey.create({
      data: {
        userId,
        name,
        key,
        permissions,
        rateLimit,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      }
    });
  }

  static async updateApiKey(userId: string, apiKeyId: string, data: any) {
    const { name, permissions, rateLimit, enabled, expiresAt } = data;
    const client = getPrisma();

    const apiKey = await client.apiKey.findFirst({
      where: {
        id: apiKeyId,
        userId
      }
    });

    if (!apiKey) {
      throw new Error('API Key not found');
    }

    return await client.apiKey.update({
      where: { id: apiKeyId },
      data: {
        name,
        permissions,
        rateLimit,
        enabled,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      }
    });
  }

  static async deleteApiKey(userId: string, apiKeyId: string) {
    const client = getPrisma();
    const apiKey = await client.apiKey.findFirst({
      where: {
        id: apiKeyId,
        userId
      }
    });

    if (!apiKey) {
      throw new Error('API Key not found');
    }

    await client.apiKey.delete({
      where: { id: apiKeyId }
    });
  }
}
