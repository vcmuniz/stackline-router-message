import { Router } from 'express';
import { PrismaClient, evolutionManager } from 'database';
import { authMiddleware } from '../middleware/auth';
import { randomBytes } from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// Listar todas as integrações
// Buscar por instanceName
router.get("/by-instance/:instanceName", authMiddleware, async (req: any, res) => {
  try {
    const integration = await prisma.integration.findFirst({
      where: {
        userId: req.userId,
        type: "WHATSAPP_EVOLUTION"
      }
    });
    const config = integration?.config as any;
    if (config?.instanceName === req.params.instanceName) {
      return res.json(integration);
    }
    return res.status(404).json({ error: "Integration not found" });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch integration" });
  }
});

router.get('/', authMiddleware, async (req: any, res) => {
  try {
    const integrations = await prisma.integration.findMany({
      where: { userId: req.userId },
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

    res.json(integrations);
  } catch (error) {
    console.error('Error fetching integrations:', error);
    res.status(500).json({ error: 'Failed to fetch integrations' });
  }
});

// Buscar integração por ID
router.get('/:id', authMiddleware, async (req: any, res) => {
  try {
    const integration = await prisma.integration.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
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
      return res.status(404).json({ error: 'Integration not found' });
    }

    res.json(integration);
  } catch (error) {
    console.error('Error fetching integration:', error);
    res.status(500).json({ error: 'Failed to fetch integration' });
  }
});

// Criar nova integração
router.post('/', authMiddleware, async (req: any, res) => {
  try {
    const { name, type, config } = req.body;

    // Gerar webhook URL e key únicos
    const webhookKey = randomBytes(32).toString('hex');
    const webhookUrl = `${process.env.WEBHOOK_BASE_URL || 'http://localhost:4000'}/webhook/${randomBytes(16).toString('hex')}`;

    const integration = await prisma.integration.create({
      data: {
        name,
        type,
        config,
        webhookUrl,
        webhookKey,
        userId: req.userId,
        status: 'INACTIVE'
      }
    });

    // A instância Evolution será criada quando o usuário clicar em "Conectar"
    // Não criamos automaticamente para permitir configuração manual primeiro

    res.status(201).json(integration);
  } catch (error) {
    console.error('Error creating integration:', error);
    res.status(500).json({ error: 'Failed to create integration' });
  }
});

// Atualizar integração
router.put('/:id', authMiddleware, async (req: any, res) => {
  try {
    const { name, config, status } = req.body;

    const integration = await prisma.integration.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    const updated = await prisma.integration.update({
      where: { id: req.params.id },
      data: {
        name,
        config,
        status,
        updatedAt: new Date()
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating integration:', error);
    res.status(500).json({ error: 'Failed to update integration' });
  }
});

// Deletar integração
router.delete('/:id', authMiddleware, async (req: any, res) => {
  try {
    const integration = await prisma.integration.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Deletar integração (cascata deleta mensagens e contatos)
    await prisma.integration.delete({
      where: { id: req.params.id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting integration:', error);
    res.status(500).json({ error: 'Failed to delete integration' });
  }
});

// Conectar/Desconectar integração
router.post('/:id/toggle', authMiddleware, async (req: any, res) => {
  try {
    const integration = await prisma.integration.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    const newStatus = integration.status === 'ACTIVE' ? 'INACTIVE' : 'PENDING';

    // Executar ações específicas por tipo
    if (integration.type === 'WHATSAPP_EVOLUTION') {
      const evolutionService = await evolutionManager.getInstance(integration.id);

      if (newStatus === 'PENDING') {
        // Conectar: criar instância e configurar webhook
        try {
          if (evolutionService) {
            // Tentar criar a instância (se já existir, ignora o erro)
            try {
              await evolutionService.createInstance();
              console.log(`Evolution instance created for ${integration.id}`);
            } catch (createError: any) {
              // Se já existe, apenas loga e continua para configurar o webhook
              if (createError.response?.data?.response?.message?.[0]?.includes('already in use')) {
                console.log(`Instance already exists, skipping creation for ${integration.id}`);
              } else {
                throw createError;
              }
            }

            // Configurar webhook na Evolution API
            await evolutionService.setWebhook(integration.webhookUrl || '');
            console.log(`Webhook configured for ${integration.id}`);
          }
        } catch (error: any) {
          console.error('Error setting up Evolution instance:', error);
          throw new Error(error.response?.data?.response?.message?.[0] || 'Failed to setup instance');
        }
      } else {
        // Desconectar: fazer logout da instância
        try {
          if (evolutionService) {
            await evolutionService.disconnect();
            console.log(`Evolution instance disconnected for ${integration.id}`);
          }
        } catch (error) {
          console.error('Error disconnecting Evolution instance:', error);
        }
      }
    }

    const updated = await prisma.integration.update({
      where: { id: req.params.id },
      data: {
        status: newStatus,
        lastSync: newStatus === 'PENDING' ? new Date() : integration.lastSync
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error toggling integration:', error);
    res.status(500).json({ error: 'Failed to toggle integration' });
  }
});

// Obter QR Code para WhatsApp
router.get('/:id/qrcode', authMiddleware, async (req: any, res) => {
  try {
    const integration = await prisma.integration.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
        type: 'WHATSAPP_EVOLUTION'
      }
    });

    if (!integration) {
      return res.status(404).json({ error: 'WhatsApp integration not found' });
    }

    // Buscar QR Code da Evolution API
    const evolutionService = await evolutionManager.getInstance(integration.id);

    if (!evolutionService) {
      return res.status(404).json({ error: 'Evolution service not found' });
    }

    // Tentar buscar QR Code, se não existir instância, criar
    try {
      const qrcodeData = await evolutionService.getQRCode();
      res.json(qrcodeData);
    } catch (error: any) {
      // Se instância não existe, criar e buscar QR Code
      console.log('QR Code error caught:', error.response?.status, error.message);

      if (error.response?.status === 404) {
        try {
          // Limpar cache antes de recriar
          evolutionManager.removeInstance(integration.id);

          // Obter nova instância (vai recriar o service com config atualizado)
          const newService = await evolutionManager.getInstance(integration.id);

          if (newService) {
            await newService.createInstance();
            await newService.setWebhook(integration.webhookUrl || '');

            // Aguardar um pouco para a instância estar pronta
            await new Promise(resolve => setTimeout(resolve, 2000));

            const qrcodeData = await newService.getQRCode();
            res.json(qrcodeData);
          }
        } catch (createError) {
          console.error('Error creating instance for QR Code:', createError);
          throw error;
        }
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error fetching QR code:', error);
    res.status(500).json({ error: 'Failed to fetch QR code' });
  }
});

// Sincronizar status com Evolution API
router.post('/:id/sync-status', authMiddleware, async (req: any, res) => {
  try {
    const integration = await prisma.integration.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
        type: 'WHATSAPP_EVOLUTION'
      }
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Atualizar status via evolutionManager
    const newStatus = await evolutionManager.updateIntegrationStatus(integration.id);

    res.json({ status: newStatus });
  } catch (error) {
    console.error('Error syncing status:', error);
    res.status(500).json({ error: 'Failed to sync status' });
  }
});

// Estatísticas da integração
router.get('/:id/stats', authMiddleware, async (req: any, res) => {
  try {
    const integration = await prisma.integration.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Buscar estatísticas de mensagens
    const [
      totalMessages,
      todayMessages,
      sentMessages,
      receivedMessages,
      deliveredMessages,
      failedMessages
    ] = await Promise.all([
      prisma.message.count({
        where: { integrationId: req.params.id }
      }),
      prisma.message.count({
        where: {
          integrationId: req.params.id,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      prisma.message.count({
        where: {
          integrationId: req.params.id,
          direction: 'OUTBOUND'
        }
      }),
      prisma.message.count({
        where: {
          integrationId: req.params.id,
          direction: 'INBOUND'
        }
      }),
      prisma.message.count({
        where: {
          integrationId: req.params.id,
          status: 'DELIVERED'
        }
      }),
      prisma.message.count({
        where: {
          integrationId: req.params.id,
          status: 'FAILED'
        }
      })
    ]);

    const deliveryRate = sentMessages > 0
      ? ((deliveredMessages / sentMessages) * 100).toFixed(1)
      : '0';

    res.json({
      totalMessages,
      todayMessages,
      sentMessages,
      receivedMessages,
      deliveredMessages,
      failedMessages,
      deliveryRate: `${deliveryRate}%`
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;