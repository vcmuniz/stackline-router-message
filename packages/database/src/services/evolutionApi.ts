import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import FormData from 'form-data';

const prisma = new PrismaClient();

interface EvolutionConfig {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
}

export class EvolutionApiService {
  private apiUrl: string;
  private apiKey: string;
  private instanceName: string;

  constructor(config: EvolutionConfig) {
    this.apiUrl = config.apiUrl || 'http://evolution-api:8080';
    this.apiKey = config.apiKey;
    this.instanceName = config.instanceName;
  }

  // Criar headers padrão
  private getHeaders() {
    return {
      'apikey': this.apiKey,
      'Content-Type': 'application/json'
    };
  }

  // Criar nova instância
  async createInstance() {
    try {
      const response = await axios.post(
        `${this.apiUrl}/instance/create`,
        {
          instanceName: this.instanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS'
        },
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error creating Evolution instance:', error.response?.data || error.message);
      throw error;
    }
  }

  // Obter status da instância
  async getInstanceStatus() {
    try {
      const response = await axios.get(
        `${this.apiUrl}/instance/connectionState/${this.instanceName}`,
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error getting instance status:', error.response?.data || error.message);
      return { state: 'DISCONNECTED' };
    }
  }

  // Obter QR Code
  async getQRCode() {
    try {
      const response = await axios.get(
        `${this.apiUrl}/instance/connect/${this.instanceName}`,
        { headers: this.getHeaders() }
      );

      // A Evolution API retorna { code, base64, pairingCode, count } ou { state }
      if (response.data.code) {
        return {
          qrcode: response.data,
          status: 'PENDING'
        };
      }

      // Se não tem QR Code, verificar status da conexão
      const connectionState = response.data.state || response.data.instance?.state;

      return {
        qrcode: null,
        status: connectionState === 'open' ? 'CONNECTED' : 'DISCONNECTED'
      };
    } catch (error: any) {
      console.error('Error getting QR code:', error.response?.data || error.message);
      throw error;
    }
  }

  // Desconectar instância
  async disconnect() {
    try {
      const response = await axios.delete(
        `${this.apiUrl}/instance/logout/${this.instanceName}`,
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error disconnecting instance:', error.response?.data || error.message);
      throw new Error('Failed to disconnect instance');
    }
  }

  // Enviar mensagem de texto
  async sendTextMessage(to: string, message: string) {
    try {
      const number = this.formatPhoneNumber(to);

      const response = await axios.post(
        `${this.apiUrl}/message/sendText/${this.instanceName}`,
        {
          number,
          text: message
        },
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        messageId: response.data.key?.id || response.data.messageId,
        data: response.data
      };
    } catch (error: any) {
      console.error('Error sending text message:', error.response?.data || error.message);
      throw new Error('Failed to send text message');
    }
  }

  // Enviar mídia
  async sendMediaMessage(to: string, mediaUrl: string, caption?: string, type: 'image' | 'video' | 'audio' | 'document' = 'image') {
    try {
      const number = this.formatPhoneNumber(to);

      // Endpoint unificado sendMedia (Evolution API v2+)
      const payload: any = {
        number,
        mediatype: type,
        media: mediaUrl,
        caption: caption || ''
      };

      if (type === 'document') {
        payload.fileName = 'document';
      }

      const response = await axios.post(
        `${this.apiUrl}/message/sendMedia/${this.instanceName}`,
        payload,
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        messageId: response.data.key?.id || response.data.messageId,
        data: response.data
      };
    } catch (error: any) {
      console.error('Error sending media message:', error.response?.data || error.message);
      throw new Error('Failed to send media message');
    }
  }

  // Configurar webhook
  async setWebhook(webhookUrl: string, events?: string[]) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/webhook/set/${this.instanceName}`,
        {
          webhook: {
            enabled: true,
            url: webhookUrl,
            events: events || [
              'MESSAGES_UPSERT',
              'MESSAGES_UPDATE',
              'CONNECTION_UPDATE'
            ]
          }
        },
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error setting webhook:', error.response?.data || error.message);
      throw new Error('Failed to set webhook');
    }
  }

  // Buscar contatos
  async getContacts() {
    try {
      const response = await axios.get(
        `${this.apiUrl}/chat/findContacts/${this.instanceName}`,
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error getting contacts:', error.response?.data || error.message);
      return [];
    }
  }

  // Buscar mensagens
  async getMessages(remoteJid: string, limit: number = 20) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/chat/findMessages/${this.instanceName}`,
        {
          where: {
            remoteJid: this.formatPhoneNumber(remoteJid) + '@s.whatsapp.net'
          },
          limit
        },
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error getting messages:', error.response?.data || error.message);
      return [];
    }
  }

  // Formatar número de telefone
  private formatPhoneNumber(phone: string): string {
    // Remove caracteres não numéricos
    let cleaned = phone.replace(/\D/g, '');

    // Adiciona código do país se não tiver
    if (!cleaned.startsWith('55') && cleaned.length <= 11) {
      cleaned = '55' + cleaned;
    }

    return cleaned;
  }

  // Verificar se número existe no WhatsApp
  async checkNumberExists(phone: string) {
    try {
      const number = this.formatPhoneNumber(phone);

      const response = await axios.post(
        `${this.apiUrl}/chat/whatsappNumbers/${this.instanceName}`,
        {
          numbers: [`${number}@s.whatsapp.net`]
        },
        { headers: this.getHeaders() }
      );

      return response.data[0]?.exists || false;
    } catch (error: any) {
      console.error('Error checking number:', error.response?.data || error.message);
      return false;
    }
  }

  // Buscar foto do perfil
  async getProfilePicture(phone: string) {
    try {
      const number = this.formatPhoneNumber(phone);

      const response = await axios.get(
        `${this.apiUrl}/chat/fetchProfilePictureUrl/${this.instanceName}/${number}@s.whatsapp.net`,
        { headers: this.getHeaders() }
      );

      return response.data.profilePictureUrl;
    } catch (error: any) {
      console.error('Error getting profile picture:', error.response?.data || error.message);
      return null;
    }
  }
}

// Gerenciador de instâncias Evolution
export class EvolutionManager {
  private instances: Map<string, EvolutionApiService> = new Map();

  // Obter ou criar instância
  async getInstance(integrationId: string): Promise<EvolutionApiService | null> {
    try {
      // Verificar cache
      if (this.instances.has(integrationId)) {
        return this.instances.get(integrationId)!;
      }

      // Buscar integração no banco
      const integration = await prisma.integration.findUnique({
        where: { id: integrationId }
      });

      if (!integration || integration.type !== 'WHATSAPP_EVOLUTION') {
        return null;
      }

      // Parsear configuração
      const config = integration.config as any;

      const service = new EvolutionApiService({
        apiUrl: config.apiUrl,
        apiKey: config.apiKey,
        instanceName: config.instanceName || `instance-${integrationId}`
      });

      // Cachear instância
      this.instances.set(integrationId, service);

      return service;
    } catch (error) {
      console.error('Error getting Evolution instance:', error);
      return null;
    }
  }

  // Limpar instância do cache
  removeInstance(integrationId: string) {
    this.instances.delete(integrationId);
  }

  // Processar envio de mensagem
  async sendMessage(integrationId: string, to: string, content: string, mediaUrl?: string, mediaType?: string) {
    const instance = await this.getInstance(integrationId);

    if (!instance) {
      throw new Error('Evolution instance not found');
    }

    if (mediaUrl && mediaType) {
      return await instance.sendMediaMessage(to, mediaUrl, content, mediaType as any);
    } else {
      return await instance.sendTextMessage(to, content);
    }
  }

  // Atualizar status da integração
  async updateIntegrationStatus(integrationId: string) {
    const instance = await this.getInstance(integrationId);

    if (!instance) {
      return;
    }

    const status = await instance.getInstanceStatus();

    let integrationStatus: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'ERROR' = 'INACTIVE';

    switch (status.state) {
      case 'open':
      case 'connected':
        integrationStatus = 'ACTIVE';
        break;
      case 'connecting':
      case 'qr':
        integrationStatus = 'PENDING';
        break;
      case 'disconnected':
      case 'close':
        integrationStatus = 'INACTIVE';
        break;
      default:
        integrationStatus = 'ERROR';
    }

    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        status: integrationStatus,
        lastSync: integrationStatus === 'ACTIVE' ? new Date() : undefined,
        errorLog: status.error || null
      }
    });

    return integrationStatus;
  }
}

// Exportar instância única do gerenciador
export const evolutionManager = new EvolutionManager();