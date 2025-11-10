import { PrismaClient } from '@prisma/client';
import { evolutionManager } from './evolutionApi';
import { webhookService } from './webhookService';

const prisma = new PrismaClient();

interface CreateQueueMessageParams {
  integrationId: string;
  toPhone?: string;
  toEmail?: string;
  toTelegramId?: string;
  toName?: string;
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  scheduledAt?: Date;
  priority?: number;
  minInterval?: number;
  maxRetries?: number;
  metadata?: any;
  forceImmediate?: boolean;
}

export class MessageQueueService {
  // Criar mensagem (na fila ou envio imediato)
  async createQueueMessage(params: CreateQueueMessageParams) {
    const {
      integrationId,
      toPhone,
      toEmail,
      toTelegramId,
      toName,
      content,
      mediaUrl,
      mediaType,
      scheduledAt,
      priority = 5,
      minInterval = 300,
      maxRetries = 3,
      metadata,
      forceImmediate = false
    } = params;

    // Verificar integração
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
      include: { user: true }
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    // Verificar horário permitido (06:00-22:00) se não for forceImmediate
    let finalScheduledAt = scheduledAt;

    if (!forceImmediate && !scheduledAt) {
      const now = new Date();
      const hour = now.getHours();

      if (hour < 6 || hour >= 22) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + (hour >= 22 ? 1 : 0));
        tomorrow.setHours(6, 0, 0, 0);
        finalScheduledAt = tomorrow;
      }
    }

    // Normalizar telefone (remover +)
    const normalizedPhone = toPhone?.replace(/^\+/, '');

    // Buscar ou criar contato
    let contact = null;

    if (normalizedPhone) {
      contact = await prisma.contact.findFirst({
        where: { phoneNumber: normalizedPhone, integrationId }
      });
    } else if (toEmail) {
      contact = await prisma.contact.findFirst({
        where: { email: toEmail, integrationId }
      });
    }

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          integrationId,
          phoneNumber: normalizedPhone,
          email: toEmail,
          telegramId: toTelegramId,
          name: toName
        }
      });
    }

    // Criar mensagem
    const message = await prisma.message.create({
      data: {
        integrationId,
        toContactId: contact.id,
        direction: 'OUTBOUND',
        status: 'PENDING',
        content,
        mediaUrl,
        mediaType,
        metadata,
        priority,
        maxRetries,
        minInterval,
        scheduledAt: finalScheduledAt
      }
    });

    // Se forceImmediate, processar agora
    if (forceImmediate) {
      await this.processMessage(message.id);

      // Recarregar mensagem com dados atualizados
      const updatedMessage = await prisma.message.findUnique({
        where: { id: message.id },
        include: {
          integration: true,
          toContact: true,
          fromContact: true
        }
      });

      // Notificar realtime
      try {
        const axios = require('axios');
        await axios.post('http://localhost:4500/notify/message', { message: updatedMessage });
      } catch (err) {
        console.log('Erro ao notificar realtime:', err);
      }

      return updatedMessage || message;
    }

    return message;
  }

  // Buscar mensagens prontas
  async getReadyMessages(limit: number = 50) {
    const now = new Date();

    const messages = await prisma.message.findMany({
      where: {
        status: 'PENDING',
        direction: 'OUTBOUND',
        OR: [
          { scheduledAt: null },
          { scheduledAt: { lte: now } }
        ]
      },
      include: {
        integration: true,
        toContact: true
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ],
      take: limit
    });

    // Filtrar por intervalo mínimo
    const ready = [];
    const processedContacts = new Set<string>();

    for (const msg of messages) {
      const contactKey = msg.toContact?.phoneNumber || msg.toContact?.email || '';
      if (!contactKey) continue;

      if (processedContacts.has(contactKey)) continue;

      if (msg.lastAttemptAt) {
        const secondsSince = (now.getTime() - msg.lastAttemptAt.getTime()) / 1000;
        if (secondsSince < msg.minInterval) continue;
      }

      ready.push(msg);
      processedContacts.add(contactKey);
    }

    return ready;
  }

  // Processar mensagem
  async processMessage(messageId: string) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { integration: true, toContact: true }
    });

    if (!message) throw new Error('Message not found');

    await prisma.message.update({
      where: { id: messageId },
      data: {
        lastAttemptAt: new Date(),
        currentRetry: { increment: 1 }
      }
    });

    try {
      let result: any;

      switch (message.integration.type) {
        case 'WHATSAPP_EVOLUTION':
        case 'WHATSAPP_BAILEYS':
          result = await evolutionManager.sendMessage(
            message.integrationId,
            message.toContact!.phoneNumber!,
            message.content!,
            message.mediaUrl || undefined,
            message.mediaType || undefined
          );
          break;

        default:
          throw new Error(`Tipo não suportado: ${message.integration.type}`);
      }

      // Sucesso
      await prisma.message.update({
        where: { id: messageId },
        data: {
          status: 'SENT',
          externalId: result.messageId,
          sentAt: new Date()
        }
      });

      // Enviar webhook
      await webhookService.sendEvent(message.integration.userId, 'message.sent', {
        messageId: message.id,
        integrationId: message.integrationId,
        contact: message.toContact,
        content: message.content
      });

      return { success: true };
    } catch (error: any) {
      if (message.currentRetry + 1 >= message.maxRetries) {
        await prisma.message.update({
          where: { id: messageId },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            errorMessage: error.message
          }
        });

        await webhookService.sendEvent(message.integration.userId, 'message.failed', {
          messageId: message.id,
          error: error.message
        });
      }

      return { success: false, error: error.message };
    }
  }

  // Processar fila
  async processQueue() {
    console.log('📨 [Queue] Processando...');

    const messages = await this.getReadyMessages(50);
    console.log(`📊 ${messages.length} mensagens prontas`);

    let sent = 0;
    let failed = 0;

    for (const msg of messages) {
      const result = await this.processMessage(msg.id);
      if (result.success) {
        sent++;
        console.log(`✅ [${msg.id}] Enviada`);
      } else {
        failed++;
        console.log(`❌ [${msg.id}] Falhou: ${result.error}`);
      }
    }

    console.log(`📊 Resumo: ${sent} enviadas, ${failed} falhadas`);
    return { processed: messages.length, sent, failed };
  }
}

export const messageQueueService = new MessageQueueService();
