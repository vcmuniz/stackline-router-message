import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | null = null;

const getPrisma = () => {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
};

export class ContactService {
  static async listContacts(userId: string, filters: any) {
    const { integrationId, search, page = 1, limit = 50 } = filters;
    const client = getPrisma();

    const where: any = {
      integration: {
        userId
      }
    };

    if (integrationId) {
      where.integrationId = integrationId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phoneNumber: { contains: search } },
        { email: { contains: search } }
      ];
    }

    const [contacts, total] = await Promise.all([
      client.contact.findMany({
        where,
        include: {
          integration: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          _count: {
            select: {
              sentMessages: true,
              receivedMessages: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit)
      }),
      client.contact.count({ where })
    ]);

    const contactsWithLastMessage = await Promise.all(
      contacts.map(async (contact) => {
        const [lastMessage, unreadCount] = await Promise.all([
          client.message.findFirst({
            where: {
              OR: [
                { fromContactId: contact.id },
                { toContactId: contact.id }
              ]
            },
            select: {
              content: true,
              createdAt: true,
              direction: true
            },
            orderBy: { createdAt: 'desc' }
          }),
          client.message.count({
            where: {
              fromContactId: contact.id,
              direction: 'INBOUND',
              status: 'RECEIVED'
            }
          })
        ]);

        return {
          ...contact,
          lastMessage,
          unreadCount
        };
      })
    );

    return {
      contacts: contactsWithLastMessage,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    };
  }

  static async getContactById(userId: string, contactId: string) {
    const client = getPrisma();
    const contact = await client.contact.findFirst({
      where: {
        id: contactId,
        integration: {
          userId
        }
      },
      include: {
        integration: true,
        _count: {
          select: {
            sentMessages: true,
            receivedMessages: true
          }
        }
      }
    });

    if (!contact) {
      throw new Error('Contact not found');
    }

    return contact;
  }

  static async upsertContact(userId: string, data: any) {
    const { integrationId, phoneNumber, email, telegramId, name, tags } = data;
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

    let contact = null;

    if (phoneNumber) {
      contact = await client.contact.findFirst({
        where: {
          phoneNumber,
          integrationId
        }
      });
    } else if (email) {
      contact = await client.contact.findFirst({
        where: {
          email,
          integrationId
        }
      });
    }

    if (contact) {
      return await client.contact.update({
        where: { id: contact.id },
        data: {
          name,
          tags,
          phoneNumber,
          email,
          telegramId
        }
      });
    } else {
      return await client.contact.create({
        data: {
          integrationId,
          phoneNumber,
          email,
          telegramId,
          name,
          tags
        }
      });
    }
  }

  static async updateContact(userId: string, contactId: string, data: any) {
    const client = getPrisma();
    const contact = await client.contact.findFirst({
      where: {
        id: contactId,
        integration: {
          userId
        }
      }
    });

    if (!contact) {
      throw new Error('Contact not found');
    }

    return await client.contact.update({
      where: { id: contactId },
      data
    });
  }

  static async deleteContact(userId: string, contactId: string) {
    const client = getPrisma();
    const contact = await client.contact.findFirst({
      where: {
        id: contactId,
        integration: {
          userId
        }
      }
    });

    if (!contact) {
      throw new Error('Contact not found');
    }

    await client.contact.delete({
      where: { id: contactId }
    });
  }
}
