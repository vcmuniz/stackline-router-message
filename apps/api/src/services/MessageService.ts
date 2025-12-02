import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | null = null;

const getPrisma = () => {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
};

export class MessageService {
  static async listMessages(userId: string, filters: any) {
    const {
      integrationId,
      status,
      direction,
      contactId,
      threadId,
      page = 1,
      limit = 20
    } = filters;
    const client = getPrisma();

    const userIntegrations = await client.integration.findMany({
      where: { userId },
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

    const total = await client.message.count({ where });

    const allMessages = await client.message.findMany({
      where,
      include: {
        integration: { select: { name: true, type: true } },
        fromContact: true,
        toContact: true
      }
    });

    const sorted = allMessages.sort((a, b) => {
      const dateA = new Date(a.deliveredAt || a.sentAt || a.createdAt).getTime();
      const dateB = new Date(b.deliveredAt || b.sentAt || b.createdAt).getTime();
      return dateA - dateB;
    });

    const totalPages = Math.ceil(total / parseInt(limit));
    const reversePage = totalPages - parseInt(page) + 1;
    const startIdx = (reversePage - 1) * parseInt(limit);
    const messages = sorted.slice(startIdx, startIdx + parseInt(limit));

    return {
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    };
  }

  static async getMessageById(messageId: string) {
    const client = getPrisma();
    const message = await client.message.findUnique({
      where: { id: messageId },
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
      throw new Error('Message not found');
    }

    return message;
  }

  static async sendMessage(data: any) {
    throw new Error('sendMessage not implemented - requires queue service');
  }

  static async updateMessageStatus(messageId: string, status: string, errorMessage?: string) {
    const client = getPrisma();
    const message = await client.message.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      throw new Error('Message not found');
    }

    const updateData: any = { status };

    if (status === 'DELIVERED') {
      updateData.deliveredAt = new Date();
    } else if (status === 'READ') {
      updateData.readAt = new Date();
    } else if (status === 'FAILED') {
      updateData.failedAt = new Date();
      updateData.errorMessage = errorMessage;
    }

    return await client.message.update({
      where: { id: messageId },
      data: updateData
    });
  }

  static async deleteMessage(messageId: string) {
    const client = getPrisma();
    const message = await client.message.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      throw new Error('Message not found');
    }

    await client.message.delete({
      where: { id: messageId }
    });
  }

  static async getThread(contactId: string) {
    const client = getPrisma();
    const messages = await client.message.findMany({
      where: {
        OR: [
          { fromContactId: contactId },
          { toContactId: contactId }
        ]
      },
      include: {
        integration: { select: { name: true, type: true } },
        fromContact: true,
        toContact: true
      },
      orderBy: { createdAt: 'asc' }
    });

    return messages;
  }
}
