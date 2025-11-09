import { PrismaClient } from '@prisma/client';
import { evolutionManager } from './evolutionApi';
import { smtpManager } from './smtpService';

const prisma = new PrismaClient();

interface CreateQueueMessageParams {
  userId: number;
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
  forceImmediate?: boolean; // NOVO: Força envio imediato
}

export class MessageQueueService {
  // Criar mensagem na fila
  async createQueueMessage(params: CreateQueueMessageParams) {
    const {
      userId,
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

    // Verificar se está em horário permitido (06:00-22:00)
    let finalScheduledAt = scheduledAt;

    if (!forceImmediate && !scheduledAt) {
      const now = new Date();
      const hour = now.getHours();

      if (hour < 6 || hour >= 22) {
        // Agendar para 06:00 do próximo dia
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + (hour >= 22 ? 1 : 0));
        tomorrow.setHours(6, 0, 0, 0);
        finalScheduledAt = tomorrow;
      }
    }

    // Criar na fila
    const queueMessage = await prisma.messageQueue.create({
      data: {
        userId,
        integrationId,
        toPhone,
        toEmail,
        toTelegramId,
        toName,
        content,
        mediaUrl,
        mediaType,
        scheduledAt: finalScheduledAt,
        priority,
        minInterval,
        maxRetries,
        metadata,
        status: finalScheduledAt ? 'SCHEDULED' : 'PENDING'
      }
    });

    // Se forceImmediate, processar agora
    if (forceImmediate) {
      await this.processMessage(queueMessage.id);
    }

    return queueMessage;
  }

  // Buscar mensagens prontas para envio
  async getReadyMessages(limit: number = 50) {
    const now = new Date();

    // Buscar mensagens PENDING ou SCHEDULED que já passaram do horário
    const messages = await prisma.messageQueue.findMany({
      where: {
        status: {
          in: ['PENDING', 'SCHEDULED']
        },
        OR: [
          { scheduledAt: null },
          { scheduledAt: { lte: now } }
        ]
      },
      include: {
        integration: true,
        user: true
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ],
      take: limit
    });

    // Filtrar mensagens que respeitam intervalo mínimo
    const readyMessages = [];
    const processedPhones = new Set<string>();

    for (const msg of messages) {
      const phone = msg.toPhone || msg.toEmail || msg.toTelegramId;
      if (!phone) continue;

      // Prevenir duplicatas por execução
      if (processedPhones.has(phone)) continue;

      // Verificar intervalo mínimo desde última mensagem
      if (msg.lastAttemptAt) {
        const secondsSinceLastAttempt = (now.getTime() - msg.lastAttemptAt.getTime()) / 1000;
        if (secondsSinceLastAttempt < msg.minInterval) {
          continue;
        }
      }

      readyMessages.push(msg);
      processedPhones.add(phone);
    }

    return readyMessages;
  }

  // Processar uma mensagem específica
  async processMessage(messageId: string) {
    const queueMessage = await prisma.messageQueue.findUnique({
      where: { id: messageId },
      include: { integration: true }
    });

    if (!queueMessage) {
      throw new Error('Queue message not found');
    }

    // Marcar como processando
    await prisma.messageQueue.update({
      where: { id: messageId },
      data: {
        status: 'PROCESSING',
        lastAttemptAt: new Date(),
        currentRetry: { increment: 1 }
      }
    });

    // Registrar tentativa
    const attempt = await prisma.queueAttempt.create({
      data: {
        queueId: messageId,
        attemptNumber: queueMessage.currentRetry + 1,
        status: 'PENDING'
      }
    });

    try {
      let result: any;

      // Enviar baseado no tipo de integração
      switch (queueMessage.integration.type) {
        case 'WHATSAPP_EVOLUTION':
        case 'WHATSAPP_BAILEYS':
          result = await evolutionManager.sendMessage(
            queueMessage.integrationId,
            queueMessage.toPhone!,
            queueMessage.content,
            queueMessage.mediaUrl,
            queueMessage.mediaType
          );
          break;

        case 'SMTP':
          result = await smtpManager.sendEmail(
            queueMessage.integrationId,
            queueMessage.toEmail!,
            'Mensagem',
            queueMessage.content
          );
          break;

        default:
          throw new Error(`Tipo de integração não suportado: ${queueMessage.integration.type}`);
      }

      // Sucesso
      await Promise.all([
        prisma.queueAttempt.update({
          where: { id: attempt.id },
          data: {
            status: 'SENT',
            responseCode: 200,
            responseMessage: 'OK',
            externalId: result.messageId || result.id,
            externalData: result,
            completedAt: new Date()
          }
        }),
        prisma.messageQueue.update({
          where: { id: messageId },
          data: {
            status: 'SENT',
            sentAt: new Date()
          }
        })
      ]);

      return { success: true, result };
    } catch (error: any) {
      // Falha
      const errorMessage = error.message || String(error);

      await prisma.queueAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'FAILED',
          failureReason: errorMessage,
          responseCode: error.response?.status || 500,
          responseMessage: error.response?.data?.message || errorMessage,
          completedAt: new Date()
        }
      });

      // Verificar se deve fazer retry ou marcar como falhou
      if (queueMessage.currentRetry + 1 >= queueMessage.maxRetries) {
        await prisma.messageQueue.update({
          where: { id: messageId },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            errorMessage
          }
        });
      } else {
        // Voltar para PENDING para retry
        await prisma.messageQueue.update({
          where: { id: messageId },
          data: { status: 'PENDING' }
        });
      }

      return { success: false, error: errorMessage };
    }
  }

  // Processar fila (chamado pelo cron)
  async processQueue() {
    console.log('📨 [Queue Processor] Iniciando processamento...');

    const messages = await this.getReadyMessages(50);

    console.log(`📊 Encontradas ${messages.length} mensagens prontas`);

    let sent = 0;
    let failed = 0;

    for (const msg of messages) {
      try {
        const result = await this.processMessage(msg.id);
        if (result.success) {
          sent++;
          console.log(`✅ [${msg.id}] Enviada para ${msg.toPhone || msg.toEmail}`);
        } else {
          failed++;
          console.log(`❌ [${msg.id}] Falhou: ${result.error}`);
        }
      } catch (error) {
        failed++;
        console.error(`❌ [${msg.id}] Erro:`, error);
      }
    }

    console.log(`📊 Resumo: ${sent} enviadas, ${failed} falhadas`);

    return { processed: messages.length, sent, failed };
  }

  // Cancelar mensagem
  async cancelMessage(messageId: string, userId: number) {
    const message = await prisma.messageQueue.findFirst({
      where: {
        id: messageId,
        userId,
        status: { in: ['PENDING', 'SCHEDULED'] }
      }
    });

    if (!message) {
      throw new Error('Message not found or cannot be cancelled');
    }

    await prisma.messageQueue.update({
      where: { id: messageId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date()
      }
    });

    return { success: true };
  }

  // Limpar mensagens antigas (executado diariamente)
  async cleanOldMessages(daysToKeep: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.messageQueue.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        status: { in: ['SENT', 'FAILED', 'CANCELLED'] }
      }
    });

    console.log(`🧹 Limpeza: ${result.count} mensagens antigas removidas`);

    return result;
  }

  // Estatísticas da fila
  async getQueueStats(userId?: number) {
    const where = userId ? { userId } : {};

    const stats = await prisma.messageQueue.groupBy({
      by: ['status'],
      where,
      _count: true
    });

    return stats.reduce((acc: any, stat: any) => {
      acc[stat.status.toLowerCase()] = stat._count;
      return acc;
    }, {
      pending: 0,
      scheduled: 0,
      processing: 0,
      sent: 0,
      failed: 0,
      cancelled: 0
    });
  }

  // Obter histórico de tentativas
  async getAttempts(messageId: string, userId: number) {
    const message = await prisma.messageQueue.findFirst({
      where: { id: messageId, userId }
    });

    if (!message) {
      throw new Error('Message not found');
    }

    return await prisma.queueAttempt.findMany({
      where: { queueId: messageId },
      orderBy: { attemptNumber: 'asc' }
    });
  }
}

export const messageQueueService = new MessageQueueService();
