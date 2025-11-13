import { Router } from 'express';
import { PrismaClient } from 'database';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// Middleware para validar webhook
const validateWebhook = async (req: any, res: any, next: any) => {
  try {
    const webhookUrl = req.originalUrl;
    const authHeader = req.headers['x-webhook-key'] || req.headers['authorization'];

    // Buscar integração pelo webhook URL
    const integration = await prisma.integration.findFirst({
      where: {
        webhookUrl: {
          contains: webhookUrl.split('/webhook/')[1]?.split('?')[0]
        }
      }
    });

    if (!integration) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    // Validar chave se configurada E enviada (Evolution API não envia header de autenticação)
    // Apenas valida se o header foi enviado
    if (authHeader && integration.webhookKey && authHeader !== integration.webhookKey) {
      return res.status(401).json({ error: 'Invalid webhook key' });
    }

    req.integration = integration;
    next();
  } catch (error) {
    console.error('Webhook validation error:', error);
    res.status(500).json({ error: 'Webhook validation failed' });
  }
};

// Registrar log do webhook
const logWebhook = async (req: any, res: any, next: any) => {
  try {
    const log = await prisma.webhookLog.create({
      data: {
        url: req.originalUrl,
        method: req.method,
        headers: req.headers,
        body: req.body,
        processed: false
      }
    });
    req.webhookLogId = log.id;
    next();
  } catch (error) {
    console.error('Error logging webhook:', error);
    next();
  }
};

// Webhook genérico para receber mensagens
router.post('/:webhookId', logWebhook, validateWebhook, async (req: any, res) => {
  try {
    const integration = req.integration;
    const payload = req.body;

    console.log('📨 Webhook recebido:', {
      integrationId: integration.id,
      integrationName: integration.name,
      type: integration.type,
      event: payload.event,
      timestamp: new Date().toISOString()
    });
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));

    let messageData: any = null;

    // Processar payload baseado no tipo de integração
    switch (integration.type) {
      case 'WHATSAPP_EVOLUTION':
        messageData = await processEvolutionWebhook(payload, integration);
        break;
      case 'SMS_TWILIO':
        messageData = await processTwilioWebhook(payload, integration);
        break;
      case 'TELEGRAM':
        messageData = await processTelegramWebhook(payload, integration);
        break;
      default:
        console.log('Unknown integration type:', integration.type);
    }

    if (messageData) {
      // Buscar ou criar contato
      let contact = await prisma.contact.findFirst({
        where: {
          integrationId: integration.id,
          OR: [
            { phoneNumber: messageData.fromNumber },
            { email: messageData.fromEmail },
            { telegramId: messageData.fromTelegramId }
          ]
        }
      });

      if (!contact) {
        contact = await prisma.contact.create({
          data: {
            integrationId: integration.id,
            phoneNumber: messageData.fromNumber,
            email: messageData.fromEmail,
            telegramId: messageData.fromTelegramId,
            name: messageData.fromName,
            avatar: messageData.fromAvatar
          }
        });
      }

      // Criar mensagem
      const message = await prisma.message.create({
        data: {
          integrationId: integration.id,
          externalId: messageData.externalId,
          fromContactId: contact.id,
          content: messageData.content,
          mediaUrl: messageData.mediaUrl,
          mediaType: messageData.mediaType,
          direction: 'INBOUND',
          status: 'RECEIVED',
          metadata: messageData.metadata,
          threadId: messageData.threadId,
          createdAt: messageData.timestamp || new Date()
        },
        include: {
          fromContact: true,
          toContact: true
        }
      });

      // Notificar realtime via HTTP
      try {
        const realtimeUrl = process.env.REALTIME_URL || 'http://localhost:4500';
        await require('axios').default.post(`${realtimeUrl}/notify/message`, { message });
      } catch (err) {
        console.error('Erro ao notificar realtime:', err);
      }

      // Atualizar contador de mensagens recebidas
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          messagesReceived: { increment: 1 },
          lastSync: new Date()
        }
      });

      // Marcar webhook como processado
      if (req.webhookLogId) {
        await prisma.webhookLog.update({
          where: { id: req.webhookLogId },
          data: {
            processed: true,
            response: { messageId: message.id }
          }
        });
      }

      res.json({ success: true, messageId: message.id });
    } else {
      res.json({ success: true, message: 'Webhook received but not processed' });
    }
  } catch (error) {
    console.error('Error processing webhook:', error);

    // Registrar erro no log
    if (req.webhookLogId) {
      await prisma.webhookLog.update({
        where: { id: req.webhookLogId },
        data: {
          error: (error as any).toString(),
          statusCode: 500
        }
      });
    }

    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

// Webhook específico para status de mensagens
router.post('/:webhookId/status', logWebhook, validateWebhook, async (req: any, res) => {
  try {
    const integration = req.integration;
    const { messageId, status, errorMessage } = req.body;

    // Buscar mensagem pelo ID externo
    const message = await prisma.message.findFirst({
      where: {
        integrationId: integration.id,
        externalId: messageId
      }
    });

    if (message) {
      const updateData: any = { status };

      switch (status) {
        case 'sent':
          updateData.status = 'SENT';
          updateData.sentAt = new Date();
          break;
        case 'delivered':
          updateData.status = 'DELIVERED';
          updateData.deliveredAt = new Date();
          break;
        case 'read':
          updateData.status = 'READ';
          updateData.readAt = new Date();
          break;
        case 'failed':
          updateData.status = 'FAILED';
          updateData.failedAt = new Date();
          updateData.errorMessage = errorMessage;
          break;
      }

      await prisma.message.update({
        where: { id: message.id },
        data: updateData
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error processing status webhook:', error);
    res.status(500).json({ error: 'Failed to process status webhook' });
  }
});

// Processar webhook da Evolution API
async function processEvolutionWebhook(payload: any, integration: any) {
  try {
    // Formato Evolution API
    if (payload.event === 'messages.upsert' && payload.data) {
      const data = payload.data;
      const key = data.key;
      const message = data.message;

      // Ignorar mensagens enviadas por nós mesmos
      if (!key.fromMe) {
        // Se remoteJid tem @lid, usar remoteJidAlt
        let phoneNumber = key.remoteJid;
        if (key.remoteJid?.includes('@lid') && key.remoteJidAlt) {
          phoneNumber = key.remoteJidAlt;
        }

        return {
          externalId: key.id,
          fromNumber: phoneNumber?.replace('@s.whatsapp.net', '').replace('@lid', ''),
          fromName: data.pushName || null,
          content: message?.conversation ||
                  message?.extendedTextMessage?.text ||
                  null,
          mediaUrl: message?.imageMessage?.url ||
                   message?.videoMessage?.url ||
                   message?.audioMessage?.url ||
                   message?.documentMessage?.url ||
                   null,
          mediaType: message?.imageMessage ? 'image' :
                    message?.videoMessage ? 'video' :
                    message?.audioMessage ? 'audio' :
                    message?.documentMessage ? 'document' :
                    null,
          metadata: payload,
          timestamp: new Date(data.messageTimestamp * 1000)
        };
      }
    }
  } catch (error) {
    console.error('Error processing Evolution webhook:', error);
  }
  return null;
}

// Processar webhook do Twilio
async function processTwilioWebhook(payload: any, integration: any) {
  try {
    if (payload.Body) {
      return {
        externalId: payload.MessageSid,
        fromNumber: payload.From,
        content: payload.Body,
        mediaUrl: payload.MediaUrl0 || null,
        mediaType: payload.MediaContentType0 ? 'image' : null,
        metadata: payload
      };
    }
  } catch (error) {
    console.error('Error processing Twilio webhook:', error);
  }
  return null;
}

// Processar webhook do Telegram
async function processTelegramWebhook(payload: any, integration: any) {
  try {
    if (payload.message) {
      const msg = payload.message;
      return {
        externalId: msg.message_id.toString(),
        fromTelegramId: msg.from.id.toString(),
        fromName: `${msg.from.first_name} ${msg.from.last_name || ''}`.trim(),
        content: msg.text || msg.caption || null,
        mediaUrl: msg.photo ? msg.photo[msg.photo.length - 1].file_id : null,
        mediaType: msg.photo ? 'image' :
                  msg.video ? 'video' :
                  msg.audio ? 'audio' :
                  msg.document ? 'document' :
                  null,
        metadata: payload,
        timestamp: new Date(msg.date * 1000)
      };
    }
  } catch (error) {
    console.error('Error processing Telegram webhook:', error);
  }
  return null;
}

export default router;