import Bull from 'bull';
import { PrismaClient } from '@prisma/client';
import { evolutionManager } from './evolutionApi';
import { smtpManager } from './smtpService';

const prisma = new PrismaClient();

// Configuração do Redis
const redisConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  }
};

// Filas
export const messageQueue = new Bull('messages', redisConfig);
export const webhookQueue = new Bull('webhooks', redisConfig);
export const statusQueue = new Bull('status', redisConfig);

// Processador de mensagens
messageQueue.process(async (job) => {
  const { messageId } = job.data;

  try {
    // Buscar mensagem no banco
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        integration: true,
        toContact: true
      }
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Processar baseado no tipo de integração
    let result: any;

    switch (message.integration.type) {
      case 'WHATSAPP_EVOLUTION':
        result = await processWhatsAppMessage(message);
        break;
      case 'SMTP':
        result = await processEmailMessage(message);
        break;
      case 'SMS_TWILIO':
        result = await processSMSMessage(message);
        break;
      default:
        throw new Error(`Unsupported integration type: ${message.integration.type}`);
    }

    // Atualizar status da mensagem
    await prisma.message.update({
      where: { id: messageId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        externalId: result.messageId,
        metadata: result.data
      }
    });

    // Incrementar contador
    await prisma.integration.update({
      where: { id: message.integrationId },
      data: {
        messagesSent: { increment: 1 }
      }
    });

    return result;
  } catch (error: any) {
    console.error('Error processing message:', error);

    // Marcar como falha
    await prisma.message.update({
      where: { id: messageId },
      data: {
        status: 'FAILED',
        failedAt: new Date(),
        errorMessage: error.message
      }
    });

    // Incrementar contador de falhas
    const message = await prisma.message.findUnique({
      where: { id: messageId }
    });

    if (message) {
      await prisma.integration.update({
        where: { id: message.integrationId },
        data: {
          messagesFailed: { increment: 1 }
        }
      });
    }

    throw error;
  }
});

// Processador de webhooks
webhookQueue.process(async (job) => {
  const { webhookLogId } = job.data;

  try {
    const log = await prisma.webhookLog.findUnique({
      where: { id: webhookLogId }
    });

    if (!log || log.processed) {
      return;
    }

    // Processar webhook baseado na URL
    // ... lógica de processamento ...

    // Marcar como processado
    await prisma.webhookLog.update({
      where: { id: webhookLogId },
      data: {
        processed: true,
        statusCode: 200
      }
    });
  } catch (error: any) {
    console.error('Error processing webhook:', error);

    await prisma.webhookLog.update({
      where: { id: webhookLogId },
      data: {
        error: error.message,
        statusCode: 500
      }
    });

    throw error;
  }
});

// Processador de status
statusQueue.process(async (job) => {
  const { integrationId } = job.data;

  try {
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId }
    });

    if (!integration) {
      return;
    }

    // Verificar status baseado no tipo
    switch (integration.type) {
      case 'WHATSAPP_EVOLUTION':
        await evolutionManager.updateIntegrationStatus(integrationId);
        break;
      case 'SMTP':
        const smtpInstance = await smtpManager.getInstance(integrationId);
        const isConnected = smtpInstance ? await smtpInstance.verifyConnection() : false;

        await prisma.integration.update({
          where: { id: integrationId },
          data: {
            status: isConnected ? 'ACTIVE' : 'ERROR',
            lastSync: isConnected ? new Date() : undefined
          }
        });
        break;
    }
  } catch (error) {
    console.error('Error updating integration status:', error);
    throw error;
  }
});

// Funções auxiliares para processar mensagens
async function processWhatsAppMessage(message: any) {
  const { integration, toContact, content, mediaUrl, mediaType } = message;

  if (!toContact?.phoneNumber) {
    throw new Error('Phone number is required for WhatsApp');
  }

  return await evolutionManager.sendMessage(
    integration.id,
    toContact.phoneNumber,
    content,
    mediaUrl,
    mediaType
  );
}

async function processEmailMessage(message: any) {
  const { integration, toContact, content } = message;

  if (!toContact?.email) {
    throw new Error('Email address is required for SMTP');
  }

  // Extrair assunto do conteúdo ou usar padrão
  const subject = message.metadata?.subject || 'Nova mensagem';

  return await smtpManager.sendMessage(
    integration.id,
    toContact.email,
    subject,
    content
  );
}

async function processSMSMessage(message: any) {
  // TODO: Implementar Twilio
  throw new Error('SMS not implemented yet');
}

// Adicionar mensagem à fila
export async function queueMessage(messageId: string, priority: number = 0) {
  return await messageQueue.add(
    { messageId },
    {
      priority,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    }
  );
}

// Adicionar webhook à fila
export async function queueWebhook(webhookLogId: string) {
  return await webhookQueue.add(
    { webhookLogId },
    {
      attempts: 3,
      backoff: {
        type: 'fixed',
        delay: 1000
      }
    }
  );
}

// Adicionar verificação de status à fila
export async function queueStatusCheck(integrationId: string) {
  return await statusQueue.add(
    { integrationId },
    {
      repeat: {
        every: 60000 // A cada minuto
      }
    }
  );
}

// Eventos da fila
messageQueue.on('completed', (job, result) => {
  console.log(`Message ${job.data.messageId} sent successfully`);
});

messageQueue.on('failed', (job, err) => {
  console.error(`Message ${job.data.messageId} failed:`, err.message);
});

// Dashboard Bull (opcional)
export function setupBullDashboard(app: any) {
  const { createBullBoard } = require('@bull-board/api');
  const { BullAdapter } = require('@bull-board/api/bullAdapter');
  const { ExpressAdapter } = require('@bull-board/express');

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [
      new BullAdapter(messageQueue),
      new BullAdapter(webhookQueue),
      new BullAdapter(statusQueue)
    ],
    serverAdapter
  });

  app.use('/admin/queues', serverAdapter.getRouter());
}

// Limpar filas antigas
export async function cleanOldJobs() {
  const grace = 1000 * 60 * 60 * 24 * 7; // 7 dias

  await messageQueue.clean(grace, 'completed');
  await messageQueue.clean(grace, 'failed');
  await webhookQueue.clean(grace, 'completed');
  await webhookQueue.clean(grace, 'failed');
}

// Agendar limpeza
setInterval(cleanOldJobs, 1000 * 60 * 60 * 24); // Diariamente