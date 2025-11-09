import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export class SMTPService {
  private transporter: nodemailer.Transporter | null = null;
  private config: SMTPConfig;

  constructor(config: SMTPConfig) {
    this.config = config;
    this.initialize();
  }

  // Inicializar transporter
  private initialize() {
    try {
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.user,
          pass: this.config.pass
        },
        tls: {
          rejectUnauthorized: false
        }
      });
    } catch (error) {
      console.error('Error initializing SMTP transporter:', error);
      throw new Error('Failed to initialize SMTP service');
    }
  }

  // Verificar conexão
  async verifyConnection(): Promise<boolean> {
    try {
      if (!this.transporter) {
        return false;
      }

      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('SMTP connection verification failed:', error);
      return false;
    }
  }

  // Enviar email
  async sendEmail(to: string | string[], subject: string, html: string, text?: string, attachments?: any[]) {
    try {
      if (!this.transporter) {
        throw new Error('SMTP transporter not initialized');
      }

      const mailOptions: nodemailer.SendMailOptions = {
        from: this.config.from,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html,
        text: text || this.htmlToText(html),
        attachments
      };

      const info = await this.transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response
      };
    } catch (error: any) {
      console.error('Error sending email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  // Enviar email com template
  async sendTemplateEmail(
    to: string | string[],
    templateName: string,
    variables: Record<string, any>
  ) {
    try {
      // Buscar template no banco
      const template = await prisma.messageTemplate.findFirst({
        where: {
          name: templateName,
          type: 'SMTP'
        }
      });

      if (!template) {
        throw new Error('Email template not found');
      }

      // Substituir variáveis no template
      let content = template.content;
      let subject = (template.metadata as any)?.['subject'] || 'Notification';

      Object.keys(variables).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        content = content.replace(regex, variables[key]);
        subject = subject.replace(regex, variables[key]);
      });

      return await this.sendEmail(to, subject, content);
    } catch (error) {
      console.error('Error sending template email:', error);
      throw error;
    }
  }

  // Converter HTML para texto
  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .trim();
  }

  // Fechar conexão
  close() {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
    }
  }
}

// Gerenciador de instâncias SMTP
export class SMTPManager {
  private instances: Map<string, SMTPService> = new Map();

  // Obter ou criar instância
  async getInstance(integrationId: string): Promise<SMTPService | null> {
    try {
      // Verificar cache
      if (this.instances.has(integrationId)) {
        return this.instances.get(integrationId)!;
      }

      // Buscar integração no banco
      const integration = await prisma.integration.findUnique({
        where: { id: integrationId }
      });

      if (!integration || integration.type !== 'SMTP') {
        return null;
      }

      // Parsear configuração
      const config = integration.config as any;

      const service = new SMTPService({
        host: config.host,
        port: parseInt(config.port),
        secure: config.secure || config.port === 465,
        user: config.user,
        pass: config.pass,
        from: config.from || config.user
      });

      // Verificar conexão
      const isConnected = await service.verifyConnection();

      if (isConnected) {
        // Atualizar status da integração
        await prisma.integration.update({
          where: { id: integrationId },
          data: {
            status: 'ACTIVE',
            lastSync: new Date()
          }
        });

        // Cachear instância
        this.instances.set(integrationId, service);
        return service;
      } else {
        // Marcar como erro
        await prisma.integration.update({
          where: { id: integrationId },
          data: {
            status: 'ERROR',
            errorLog: 'Failed to connect to SMTP server'
          }
        });
        return null;
      }
    } catch (error: any) {
      console.error('Error getting SMTP instance:', error);

      // Atualizar status de erro
      await prisma.integration.update({
        where: { id: integrationId },
        data: {
          status: 'ERROR',
          errorLog: error.message
        }
      });

      return null;
    }
  }

  // Limpar instância do cache
  removeInstance(integrationId: string) {
    const instance = this.instances.get(integrationId);
    if (instance) {
      instance.close();
      this.instances.delete(integrationId);
    }
  }

  // Processar envio de mensagem
  async sendMessage(
    integrationId: string,
    to: string,
    subject: string,
    content: string,
    attachments?: any[]
  ) {
    const instance = await this.getInstance(integrationId);

    if (!instance) {
      throw new Error('SMTP instance not found or connection failed');
    }

    return await instance.sendEmail(to, subject, content, undefined, attachments);
  }

  // Verificar todas as conexões SMTP
  async verifyAllConnections() {
    const smtpIntegrations = await prisma.integration.findMany({
      where: { type: 'SMTP' }
    });

    const results = [];

    for (const integration of smtpIntegrations) {
      try {
        const instance = await this.getInstance(integration.id);
        const isConnected = instance ? await instance.verifyConnection() : false;

        results.push({
          integrationId: integration.id,
          name: integration.name,
          connected: isConnected
        });

        // Atualizar status
        await prisma.integration.update({
          where: { id: integration.id },
          data: {
            status: isConnected ? 'ACTIVE' : 'ERROR',
            lastSync: isConnected ? new Date() : undefined,
            errorLog: isConnected ? null : 'Connection failed'
          }
        });
      } catch (error: any) {
        results.push({
          integrationId: integration.id,
          name: integration.name,
          connected: false,
          error: error.message
        });
      }
    }

    return results;
  }

  // Limpar todas as instâncias
  clearAll() {
    this.instances.forEach(instance => instance.close());
    this.instances.clear();
  }
}

// Exportar instância única do gerenciador
export const smtpManager = new SMTPManager();

// Criar template de email padrão
export async function createDefaultEmailTemplates() {
  try {
    const templates = [
      {
        name: 'welcome',
        type: 'SMTP' as const,
        content: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #2196f3; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background: #f5f5f5; }
              .footer { text-align: center; padding: 10px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Bem-vindo {{name}}!</h1>
              </div>
              <div class="content">
                <p>Obrigado por se cadastrar em nosso sistema.</p>
                <p>Sua conta foi criada com sucesso.</p>
              </div>
              <div class="footer">
                <p>© 2024 MessageHub. Todos os direitos reservados.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        metadata: {
          subject: 'Bem-vindo ao MessageHub, {{name}}!'
        },
        variables: {
          name: 'Nome do usuário'
        }
      },
      {
        name: 'notification',
        type: 'SMTP' as const,
        content: `
          <!DOCTYPE html>
          <html>
          <body style="font-family: Arial, sans-serif;">
            <h2>Nova Notificação</h2>
            <p>{{message}}</p>
            <p>Data: {{date}}</p>
          </body>
          </html>
        `,
        metadata: {
          subject: 'Notificação: {{title}}'
        },
        variables: {
          title: 'Título da notificação',
          message: 'Mensagem da notificação',
          date: 'Data do evento'
        }
      }
    ];

    for (const template of templates) {
      const existing = await prisma.messageTemplate.findFirst({
        where: { name: template.name }
      });

      if (existing) {
        await prisma.messageTemplate.update({
          where: { id: existing.id },
          data: template
        });
      } else {
        await prisma.messageTemplate.create({
          data: template
        });
      }
    }

    console.log('Default email templates created');
  } catch (error) {
    console.error('Error creating default email templates:', error);
  }
}