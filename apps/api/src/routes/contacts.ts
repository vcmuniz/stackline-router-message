import { Router } from 'express';
import { PrismaClient } from 'database';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Listar contatos
router.get('/', authMiddleware, async (req: any, res) => {
  try {
    const { integrationId, search, page = 1, limit = 50 } = req.query;

    const where: any = {
      integration: {
        userId: req.userId
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
      prisma.contact.findMany({
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
      prisma.contact.count({ where })
    ]);

    res.json({
      contacts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// Buscar contato por ID
router.get('/:id', authMiddleware, async (req: any, res) => {
  try {
    const contact = await prisma.contact.findFirst({
      where: {
        id: req.params.id,
        integration: {
          userId: req.userId
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
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json(contact);
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

// Criar/Atualizar contato
router.post('/', authMiddleware, async (req: any, res) => {
  try {
    const { integrationId, phoneNumber, email, telegramId, name, tags } = req.body;

    // Verificar se a integração pertence ao usuário
    const integration = await prisma.integration.findFirst({
      where: {
        id: integrationId,
        userId: req.userId
      }
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Tentar encontrar contato existente
    let contact = null;

    if (phoneNumber) {
      contact = await prisma.contact.findFirst({
        where: {
          phoneNumber,
          integrationId
        }
      });
    } else if (email) {
      contact = await prisma.contact.findFirst({
        where: {
          email,
          integrationId
        }
      });
    }

    if (contact) {
      // Atualizar
      contact = await prisma.contact.update({
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
      // Criar
      contact = await prisma.contact.create({
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

    res.json(contact);
  } catch (error) {
    console.error('Error upserting contact:', error);
    res.status(500).json({ error: 'Failed to upsert contact' });
  }
});

// Deletar contato
router.delete('/:id', authMiddleware, async (req: any, res) => {
  try {
    const contact = await prisma.contact.findFirst({
      where: {
        id: req.params.id,
        integration: {
          userId: req.userId
        }
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    await prisma.contact.delete({
      where: { id: req.params.id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

export default router;
