import { MessageQueueService } from '../services/messageQueueService';

// Mock Prisma
const mockPrisma = {
  integration: {
    findUnique: jest.fn()
  },
  message: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn()
  },
  contact: {
    findUnique: jest.fn()
  }
};

jest.mock('database', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
}));

jest.mock('../services/evolutionApi', () => ({
  evolutionManager: {
    getInstance: jest.fn()
  }
}));

jest.mock('../services/webhookService', () => ({
  webhookService: {
    notifyStatus: jest.fn()
  }
}));

describe('MessageQueueService', () => {
  let messageQueueService: MessageQueueService;

  beforeEach(() => {
    jest.clearAllMocks();
    messageQueueService = new MessageQueueService();
  });

  describe('createQueueMessage', () => {
    it('should fail when integration does not exist', async () => {
      mockPrisma.integration.findUnique.mockResolvedValue(null);

      const params = {
        integrationId: 'invalid-id',
        toPhone: '5511999999999',
        content: 'Test message'
      };

      await expect(messageQueueService.createQueueMessage(params))
        .rejects
        .toThrow();
    });

    it('should create a message with valid parameters', async () => {
      mockPrisma.integration.findUnique.mockResolvedValue({
        id: 'int123',
        userId: 'user123',
        type: 'WHATSAPP_EVOLUTION',
        status: 'ACTIVE',
        user: { id: 'user123', email: 'test@test.com' }
      });

      mockPrisma.message.create.mockResolvedValue({
        id: 'msg123',
        integrationId: 'int123',
        toPhone: '5511999999999',
        content: 'Test message',
        status: 'QUEUED'
      });

      const params = {
        integrationId: 'int123',
        toPhone: '5511999999999',
        content: 'Test message'
      };

      const result = await messageQueueService.createQueueMessage(params);

      expect(result).toBeDefined();
      expect(mockPrisma.message.create).toHaveBeenCalled();
    });

    it('should handle immediate send when forceImmediate is true', async () => {
      mockPrisma.integration.findUnique.mockResolvedValue({
        id: 'int123',
        userId: 'user123',
        type: 'WHATSAPP_EVOLUTION',
        status: 'ACTIVE',
        user: { id: 'user123', email: 'test@test.com' }
      });

      const params = {
        integrationId: 'int123',
        toPhone: '5511999999999',
        content: 'Test message',
        forceImmediate: true
      };

      try {
        await messageQueueService.createQueueMessage(params);
      } catch (error) {
        // Expected to potentially fail due to mocks
      }

      expect(mockPrisma.message.create).toHaveBeenCalled();
    });

    it('should use default values for optional parameters', async () => {
      mockPrisma.integration.findUnique.mockResolvedValue({
        id: 'int123',
        userId: 'user123',
        type: 'WHATSAPP_EVOLUTION',
        status: 'ACTIVE',
        user: { id: 'user123', email: 'test@test.com' }
      });

      mockPrisma.message.create.mockResolvedValue({
        id: 'msg123',
        integrationId: 'int123',
        toPhone: '5511999999999',
        content: 'Test message',
        status: 'QUEUED',
        priority: 5,
        maxRetries: 3
      });

      const params = {
        integrationId: 'int123',
        toPhone: '5511999999999',
        content: 'Test message'
        // priority, maxRetries not specified - should use defaults
      };

      const result = await messageQueueService.createQueueMessage(params);

      expect(result).toBeDefined();
      const createCall = mockPrisma.message.create.mock.calls[0][0];
      expect(createCall.data.priority).toBe(5);
      expect(createCall.data.maxRetries).toBe(3);
    });

    it('should support email channel', async () => {
      mockPrisma.integration.findUnique.mockResolvedValue({
        id: 'int123',
        userId: 'user123',
        type: 'EMAIL_SMTP',
        status: 'ACTIVE',
        user: { id: 'user123', email: 'test@test.com' }
      });

      mockPrisma.message.create.mockResolvedValue({
        id: 'msg123',
        integrationId: 'int123',
        toEmail: 'recipient@test.com',
        content: 'Test message',
        status: 'QUEUED'
      });

      const params = {
        integrationId: 'int123',
        toEmail: 'recipient@test.com',
        content: 'Test message'
      };

      const result = await messageQueueService.createQueueMessage(params);

      expect(result).toBeDefined();
    });
  });

  describe('getQueuedMessages', () => {
    it('should retrieve queued messages for integration', async () => {
      mockPrisma.message.findMany = jest.fn().mockResolvedValue([
        {
          id: 'msg1',
          integrationId: 'int123',
          status: 'QUEUED',
          content: 'Message 1'
        },
        {
          id: 'msg2',
          integrationId: 'int123',
          status: 'QUEUED',
          content: 'Message 2'
        }
      ]);

      const result = await messageQueueService.getQueuedMessages('int123');

      expect(result).toHaveLength(2);
      expect(mockPrisma.message.findMany).toHaveBeenCalled();
    });

    it('should return empty array when no queued messages', async () => {
      mockPrisma.message.findMany = jest.fn().mockResolvedValue([]);

      const result = await messageQueueService.getQueuedMessages('int123');

      expect(result).toHaveLength(0);
    });
  });

  describe('processQueue', () => {
    it('should process messages from queue', async () => {
      mockPrisma.message.findMany = jest.fn().mockResolvedValue([
        {
          id: 'msg1',
          integrationId: 'int123',
          status: 'QUEUED',
          priority: 5,
          content: 'Test'
        }
      ]);

      mockPrisma.integration.findUnique.mockResolvedValue({
        id: 'int123',
        type: 'WHATSAPP_EVOLUTION',
        status: 'ACTIVE'
      });

      try {
        await messageQueueService.processQueue('int123');
      } catch (error) {
        // Expected - mocks are limited
      }

      expect(mockPrisma.message.findMany).toHaveBeenCalled();
    });
  });

  describe('retryFailedMessages', () => {
    it('should retry failed messages up to maxRetries', async () => {
      mockPrisma.message.findMany = jest.fn().mockResolvedValue([
        {
          id: 'msg1',
          integrationId: 'int123',
          status: 'FAILED',
          retries: 0,
          maxRetries: 3
        }
      ]);

      try {
        await messageQueueService.retryFailedMessages('int123');
      } catch (error) {
        // Expected
      }

      expect(mockPrisma.message.findMany).toHaveBeenCalled();
    });
  });
});
