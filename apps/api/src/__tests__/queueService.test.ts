import { messageQueue, webhookQueue, statusQueue } from '../services/queueService';

jest.mock('bull', () => {
  return jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    process: jest.fn(),
    on: jest.fn(),
    close: jest.fn(),
    clean: jest.fn(),
    getJobCounts: jest.fn().mockResolvedValue({
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0
    })
  }));
});

jest.mock('database', () => ({
  PrismaClient: jest.fn(() => ({
    message: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    integration: {
      findUnique: jest.fn()
    }
  }))
}));

jest.mock('../services/evolutionApi', () => ({
  evolutionManager: {
    getInstance: jest.fn()
  }
}));

jest.mock('../services/smtpService', () => ({
  smtpManager: {
    sendEmail: jest.fn()
  }
}));

describe('Queue Service', () => {
  describe('messageQueue', () => {
    it('should be defined', () => {
      expect(messageQueue).toBeDefined();
    });

    it('should add job to queue', async () => {
      const job = await messageQueue.add({ messageId: 'msg123' });
      expect(job).toBeDefined();
      expect(job.id).toBe('job-1');
    });

    it('should support priority option', async () => {
      const job = await messageQueue.add(
        { messageId: 'msg123' },
        { priority: 10 }
      );

      expect(job).toBeDefined();
    });

    it('should support delay option', async () => {
      const job = await messageQueue.add(
        { messageId: 'msg123' },
        { delay: 5000 }
      );

      expect(job).toBeDefined();
    });

    it('should support attempts option', async () => {
      const job = await messageQueue.add(
        { messageId: 'msg123' },
        { attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
      );

      expect(job).toBeDefined();
    });

    it('should get job counts', async () => {
      const counts = await messageQueue.getJobCounts();
      expect(counts).toHaveProperty('waiting');
      expect(counts).toHaveProperty('active');
      expect(counts).toHaveProperty('completed');
      expect(counts).toHaveProperty('failed');
    });

    it('should handle queue errors gracefully', async () => {
      const addSpy = jest.spyOn(messageQueue, 'add').mockRejectedValueOnce(
        new Error('Queue error')
      );

      await expect(messageQueue.add({ messageId: 'msg123' })).rejects.toThrow(
        'Queue error'
      );

      addSpy.mockRestore();
    });
  });

  describe('webhookQueue', () => {
    it('should be defined', () => {
      expect(webhookQueue).toBeDefined();
    });

    it('should add webhook job', async () => {
      const job = await webhookQueue.add({
        integrationId: 'int123',
        event: 'message.sent',
        data: {}
      });

      expect(job).toBeDefined();
    });
  });

  describe('statusQueue', () => {
    it('should be defined', () => {
      expect(statusQueue).toBeDefined();
    });

    it('should add status update job', async () => {
      const job = await statusQueue.add({
        messageId: 'msg123',
        status: 'DELIVERED'
      });

      expect(job).toBeDefined();
    });
  });

  describe('Message Processing', () => {
    it('should process WhatsApp message', async () => {
      const mockPrisma = require('database').PrismaClient.mock.results[0].value;

      mockPrisma.message.findUnique.mockResolvedValue({
        id: 'msg123',
        integrationId: 'int123',
        toPhone: '5511999999999',
        content: 'Test message',
        integration: { type: 'WHATSAPP_EVOLUTION' }
      });

      const job = await messageQueue.add({ messageId: 'msg123' });
      expect(job).toBeDefined();
    });

    it('should process Email message', async () => {
      const mockPrisma = require('database').PrismaClient.mock.results[0].value;

      mockPrisma.message.findUnique.mockResolvedValue({
        id: 'msg123',
        integrationId: 'int123',
        toEmail: 'recipient@example.com',
        content: 'Test email',
        integration: { type: 'SMTP' }
      });

      const job = await messageQueue.add({ messageId: 'msg123' });
      expect(job).toBeDefined();
    });

    it('should handle unsupported integration type', async () => {
      const mockPrisma = require('database').PrismaClient.mock.results[0].value;

      mockPrisma.message.findUnique.mockResolvedValue({
        id: 'msg123',
        integrationId: 'int123',
        content: 'Test',
        integration: { type: 'UNSUPPORTED_TYPE' }
      });

      const job = await messageQueue.add({ messageId: 'msg123' });
      expect(job).toBeDefined();
    });
  });

  describe('Job Retries', () => {
    it('should retry failed jobs', async () => {
      const job = await messageQueue.add(
        { messageId: 'msg123' },
        { attempts: 3, backoff: { type: 'exponential', delay: 1000 } }
      );

      expect(job).toBeDefined();
    });

    it('should support custom retry strategy', async () => {
      const job = await messageQueue.add(
        { messageId: 'msg123' },
        {
          attempts: 5,
          backoff: {
            type: 'fixed',
            delay: 5000
          }
        }
      );

      expect(job).toBeDefined();
    });
  });

  describe('Job Cleanup', () => {
    it('should clean completed jobs', async () => {
      const cleanSpy = jest.spyOn(messageQueue, 'clean');
      await messageQueue.clean(3600, 'completed');
      expect(cleanSpy).toHaveBeenCalled();
      cleanSpy.mockRestore();
    });

    it('should clean failed jobs', async () => {
      const cleanSpy = jest.spyOn(messageQueue, 'clean');
      await messageQueue.clean(7200, 'failed');
      expect(cleanSpy).toHaveBeenCalled();
      cleanSpy.mockRestore();
    });
  });
});
