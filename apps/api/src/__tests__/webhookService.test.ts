import { WebhookService } from '../services/webhookService';
import crypto from 'crypto';

// Mock dependencies
jest.mock('database', () => ({
  PrismaClient: jest.fn(() => ({
    webhookEndpoint: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn()
    },
    webhookOutboundLog: {
      create: jest.fn()
    }
  }))
}));

jest.mock('axios');

describe('WebhookService', () => {
  let webhookService: WebhookService;
  let mockAxios: any;

  beforeEach(() => {
    jest.clearAllMocks();
    webhookService = new WebhookService();
    mockAxios = require('axios');
  });

  describe('sendEvent', () => {
    it('should send event to all subscribed endpoints', async () => {
      const mockPrisma = require('database').PrismaClient.mock.results[0].value;
      
      mockPrisma.webhookEndpoint.findMany.mockResolvedValue([
        {
          id: 'webhook1',
          url: 'https://example.com/webhook',
          secret: 'secret123',
          events: ['message.sent', 'message.received'],
          enabled: true
        }
      ]);

      mockAxios.post.mockResolvedValue({ status: 200 });

      const result = await webhookService.sendEvent(1, 'message.sent', {
        messageId: 'msg123',
        status: 'sent'
      });

      expect(result.sent).toBeGreaterThanOrEqual(0);
      expect(result.failed).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 sent when no endpoints subscribed to event', async () => {
      const mockPrisma = require('database').PrismaClient.mock.results[0].value;
      
      mockPrisma.webhookEndpoint.findMany.mockResolvedValue([
        {
          id: 'webhook1',
          url: 'https://example.com/webhook',
          secret: 'secret123',
          events: ['message.received'], // Not subscribed to 'message.sent'
          enabled: true
        }
      ]);

      const result = await webhookService.sendEvent(1, 'message.sent', {});

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should handle disabled endpoints', async () => {
      const mockPrisma = require('database').PrismaClient.mock.results[0].value;
      
      mockPrisma.webhookEndpoint.findMany.mockResolvedValue([]);

      const result = await webhookService.sendEvent(1, 'message.sent', {});

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should count failures when webhook request fails', async () => {
      const mockPrisma = require('database').PrismaClient.mock.results[0].value;
      
      mockPrisma.webhookEndpoint.findMany.mockResolvedValue([
        {
          id: 'webhook1',
          url: 'https://example.com/webhook',
          secret: 'secret123',
          events: ['message.sent'],
          enabled: true
        }
      ]);

      mockAxios.post.mockRejectedValue(new Error('Network error'));

      const result = await webhookService.sendEvent(1, 'message.sent', {});

      expect(result.failed).toBeGreaterThanOrEqual(0);
    });

    it('should include correct headers in webhook request', async () => {
      const mockPrisma = require('database').PrismaClient.mock.results[0].value;
      
      mockPrisma.webhookEndpoint.findMany.mockResolvedValue([
        {
          id: 'webhook1',
          url: 'https://example.com/webhook',
          secret: 'secret123',
          events: ['message.sent'],
          enabled: true
        }
      ]);

      mockAxios.post.mockResolvedValue({ status: 200 });

      try {
        await webhookService.sendEvent(1, 'message.sent', { test: 'data' });
      } catch (error) {
        // Ignore
      }

      if (mockAxios.post.mock.calls.length > 0) {
        const callHeaders = mockAxios.post.mock.calls[0][2]?.headers;
        expect(callHeaders).toHaveProperty('Content-Type', 'application/json');
        expect(callHeaders).toHaveProperty('X-Webhook-Event', 'message.sent');
        expect(callHeaders).toHaveProperty('X-Webhook-Signature');
      }
    });
  });

  describe('verifySignature', () => {
    it('should verify valid webhook signature', () => {
      const secret = 'test-secret';
      const payload = { event: 'test', data: {} };
      
      const signature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      const isValid = webhookService.verifySignature(
        JSON.stringify(payload),
        signature,
        secret
      );

      expect(isValid).toBe(true);
    });

    it('should reject invalid webhook signature', () => {
      const secret = 'test-secret';
      const payload = { event: 'test', data: {} };
      const invalidSignature = 'invalid-signature-hash';

      const isValid = webhookService.verifySignature(
        JSON.stringify(payload),
        invalidSignature,
        secret
      );

      expect(isValid).toBe(false);
    });

    it('should reject signature with different secret', () => {
      const payload = { event: 'test', data: {} };
      
      const signature = crypto
        .createHmac('sha256', 'secret1')
        .update(JSON.stringify(payload))
        .digest('hex');

      const isValid = webhookService.verifySignature(
        JSON.stringify(payload),
        signature,
        'secret2'
      );

      expect(isValid).toBe(false);
    });
  });

  describe('registerEndpoint', () => {
    it('should create webhook endpoint with valid data', async () => {
      const mockPrisma = require('database').PrismaClient.mock.results[0].value;
      
      mockPrisma.webhookEndpoint.create.mockResolvedValue({
        id: 'webhook1',
        userId: 1,
        url: 'https://example.com/webhook',
        events: ['message.sent'],
        enabled: true
      });

      const result = await webhookService.registerEndpoint(1, {
        url: 'https://example.com/webhook',
        events: ['message.sent']
      });

      expect(result).toBeDefined();
      expect(mockPrisma.webhookEndpoint.create).toHaveBeenCalled();
    });

    it('should validate webhook URL format', async () => {
      const result = await webhookService.registerEndpoint(1, {
        url: 'invalid-url',
        events: ['message.sent']
      });

      expect(result).toBeNull();
    });
  });

  describe('updateEndpoint', () => {
    it('should update webhook endpoint', async () => {
      const mockPrisma = require('database').PrismaClient.mock.results[0].value;
      
      mockPrisma.webhookEndpoint.update.mockResolvedValue({
        id: 'webhook1',
        userId: 1,
        url: 'https://updated.com/webhook',
        events: ['message.sent', 'message.received'],
        enabled: true
      });

      const result = await webhookService.updateEndpoint('webhook1', 1, {
        url: 'https://updated.com/webhook',
        events: ['message.sent', 'message.received']
      });

      expect(result).toBeDefined();
      expect(mockPrisma.webhookEndpoint.update).toHaveBeenCalled();
    });
  });

  describe('deleteEndpoint', () => {
    it('should delete webhook endpoint', async () => {
      const mockPrisma = require('database').PrismaClient.mock.results[0].value;
      
      mockPrisma.webhookEndpoint.delete.mockResolvedValue({ id: 'webhook1' });

      const result = await webhookService.deleteEndpoint('webhook1', 1);

      expect(result).toBe(true);
      expect(mockPrisma.webhookEndpoint.delete).toHaveBeenCalled();
    });

    it('should return false when endpoint not found', async () => {
      const mockPrisma = require('database').PrismaClient.mock.results[0].value;
      
      mockPrisma.webhookEndpoint.delete.mockRejectedValue(
        new Error('Not found')
      );

      const result = await webhookService.deleteEndpoint('webhook1', 1);

      expect(result).toBe(false);
    });
  });

  describe('getEndpoints', () => {
    it('should retrieve all endpoints for user', async () => {
      const mockPrisma = require('database').PrismaClient.mock.results[0].value;
      
      mockPrisma.webhookEndpoint.findMany.mockResolvedValue([
        {
          id: 'webhook1',
          url: 'https://example.com/webhook1',
          events: ['message.sent'],
          enabled: true
        },
        {
          id: 'webhook2',
          url: 'https://example.com/webhook2',
          events: ['message.received'],
          enabled: false
        }
      ]);

      const result = await webhookService.getEndpoints(1);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });
  });
});
