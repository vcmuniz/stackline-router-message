import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

let prisma: PrismaClient | null = null;

const getPrisma = () => {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
};

export class IntegrationService {
  static async listIntegrations(userId: string) {
    const client = getPrisma();
    return await client.integration.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            messages: true,
            contacts: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getIntegrationById(userId: string, integrationId: string) {
    const client = getPrisma();
    const integration = await client.integration.findFirst({
      where: {
        id: integrationId,
        userId
      },
      include: {
        _count: {
          select: {
            messages: true,
            contacts: true,
          }
        }
      }
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    return integration;
  }

  static async getIntegrationByInstance(userId: string, instanceName: string) {
    const client = getPrisma();
    const integration = await client.integration.findFirst({
      where: {
        userId,
        type: "WHATSAPP_EVOLUTION"
      }
    });

    const config = integration?.config as any;
    if (config?.instanceName === instanceName) {
      return integration;
    }

    throw new Error('Integration not found');
  }

  static async createIntegration(userId: string, data: any) {
    const { name, type, config } = data;
    const client = getPrisma();

    const webhookKey = randomBytes(32).toString('hex');
    const webhookUrl = `${process.env.WEBHOOK_BASE_URL || 'http://localhost:4000'}/webhook/${randomBytes(16).toString('hex')}`;

    return await client.integration.create({
      data: {
        name,
        type,
        config,
        webhookUrl,
        webhookKey,
        userId,
        status: 'INACTIVE'
      }
    });
  }

  static async updateIntegration(userId: string, integrationId: string, data: any) {
    const { name, config, status } = data;
    const client = getPrisma();

    const integration = await client.integration.findFirst({
      where: {
        id: integrationId,
        userId
      }
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    return await client.integration.update({
      where: { id: integrationId },
      data: {
        name,
        config,
        status,
        updatedAt: new Date()
      }
    });
  }

  static async deleteIntegration(userId: string, integrationId: string) {
    const client = getPrisma();
    const integration = await client.integration.findFirst({
      where: {
        id: integrationId,
        userId
      }
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    await client.integration.delete({
      where: { id: integrationId }
    });
  }

  static async toggleIntegration(userId: string, integrationId: string) {
    const client = getPrisma();
    const integration = await client.integration.findFirst({
      where: {
        id: integrationId,
        userId
      }
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    const newStatus = integration.status === 'ACTIVE' ? 'INACTIVE' : 'PENDING';

    return await client.integration.update({
      where: { id: integrationId },
      data: {
        status: newStatus,
        lastSync: newStatus === 'PENDING' ? new Date() : integration.lastSync
      }
    });
  }

  static async getQRCode(userId: string, integrationId: string) {
    const client = getPrisma();
    const integration = await client.integration.findFirst({
      where: {
        id: integrationId,
        userId,
        type: 'WHATSAPP_EVOLUTION'
      }
    });

    if (!integration) {
      throw new Error('WhatsApp integration not found');
    }

    throw new Error('QR Code retrieval not implemented');
  }

  static async syncStatus(userId: string, integrationId: string) {
    const client = getPrisma();
    const integration = await client.integration.findFirst({
      where: {
        id: integrationId,
        userId,
        type: 'WHATSAPP_EVOLUTION'
      }
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    return 'ACTIVE';
  }

  static async getStats(userId: string, integrationId: string) {
    const client = getPrisma();
    const integration = await client.integration.findFirst({
      where: {
        id: integrationId,
        userId
      }
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    const [
      totalMessages,
      todayMessages,
      sentMessages,
      receivedMessages,
      deliveredMessages,
      failedMessages
    ] = await Promise.all([
      client.message.count({
        where: { integrationId }
      }),
      client.message.count({
        where: {
          integrationId,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      client.message.count({
        where: {
          integrationId,
          direction: 'OUTBOUND'
        }
      }),
      client.message.count({
        where: {
          integrationId,
          direction: 'INBOUND'
        }
      }),
      client.message.count({
        where: {
          integrationId,
          status: 'DELIVERED'
        }
      }),
      client.message.count({
        where: {
          integrationId,
          status: 'FAILED'
        }
      })
    ]);

    const deliveryRate = sentMessages > 0
      ? ((deliveredMessages / sentMessages) * 100).toFixed(1)
      : '0';

    return {
      totalMessages,
      todayMessages,
      sentMessages,
      receivedMessages,
      deliveredMessages,
      failedMessages,
      deliveryRate: `${deliveryRate}%`
    };
  }
}
