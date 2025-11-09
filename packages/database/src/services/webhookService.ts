import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import crypto from 'crypto';

const prisma = new PrismaClient();

interface WebhookEvent {
  event: string;
  data: any;
  timestamp: string;
}

export class WebhookService {
  // Enviar evento para todos webhooks subscritos
  async sendEvent(userId: number, event: string, data: any) {
    // Buscar todos webhooks habilitados do usuário e filtrar por evento
    const allEndpoints = await prisma.webhookEndpoint.findMany({
      where: {
        userId,
        enabled: true
      }
    });

    // Filtrar endpoints que têm o evento subscrito
    const endpoints = allEndpoints.filter(endpoint => {
      const events = Array.isArray(endpoint.events) ? endpoint.events : [];
      return events.includes(event);
    });

    if (endpoints.length === 0) {
      return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    const promises = endpoints.map(async (endpoint) => {
      try {
        await this.sendWebhook(endpoint.id, endpoint.url, endpoint.secret, event, data);
        sent++;
      } catch (error) {
        failed++;
        console.error(`❌ Erro ao enviar webhook para ${endpoint.url}:`, error);
      }
    });

    await Promise.allSettled(promises);

    return { sent, failed };
  }

  // Enviar webhook individual
  private async sendWebhook(endpointId: string, url: string, secret: string, event: string, data: any) {
    const payload: WebhookEvent = {
      event,
      data,
      timestamp: new Date().toISOString()
    };

    // Gerar assinatura HMAC
    const signature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    try {
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event
        },
        timeout: 10000
      });

      // Log de sucesso
      await prisma.webhookOutboundLog.create({
        data: {
          endpointId,
          event,
          url,
          payload,
          response: response.data,
          statusCode: response.status,
          success: true
        }
      });

      // Atualizar estatísticas
      await prisma.webhookEndpoint.update({
        where: { id: endpointId },
        data: {
          totalSent: { increment: 1 },
          lastSentAt: new Date()
        }
      });

      return { success: true };
    } catch (error: any) {
      // Log de falha
      await prisma.webhookOutboundLog.create({
        data: {
          endpointId,
          event,
          url,
          payload,
          response: error.response?.data,
          statusCode: error.response?.status,
          success: false,
          errorMessage: error.message
        }
      });

      // Atualizar estatísticas
      await prisma.webhookEndpoint.update({
        where: { id: endpointId },
        data: {
          totalFailed: { increment: 1 }
        }
      });

      throw error;
    }
  }

  // Testar webhook
  async testWebhook(endpointId: string, userId: number) {
    const endpoint = await prisma.webhookEndpoint.findFirst({
      where: { id: endpointId, userId }
    });

    if (!endpoint) {
      throw new Error('Webhook endpoint not found');
    }

    await this.sendWebhook(
      endpoint.id,
      endpoint.url,
      endpoint.secret,
      'webhook.test',
      { message: 'Este é um teste de webhook', timestamp: new Date().toISOString() }
    );

    return { success: true };
  }
}

export const webhookService = new WebhookService();
