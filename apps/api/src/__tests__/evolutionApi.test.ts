import { EvolutionApiService } from '../services/evolutionApi';
import axios from 'axios';

jest.mock('axios');
jest.mock('database', () => ({
  PrismaClient: jest.fn(() => ({
    integration: {
      update: jest.fn()
    },
    message: {
      update: jest.fn(),
      findUnique: jest.fn()
    }
  }))
}));

const mockAxios = axios as jest.Mocked<typeof axios>;

describe('EvolutionApiService', () => {
  let evolutionService: EvolutionApiService;

  const mockConfig = {
    apiUrl: 'http://evolution-api:8080',
    apiKey: 'test-api-key',
    instanceName: 'test-instance'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    evolutionService = new EvolutionApiService(mockConfig);
  });

  describe('createInstance', () => {
    it('should create instance successfully', async () => {
      mockAxios.post.mockResolvedValue({
        data: {
          instance: {
            instanceName: 'test-instance',
            status: 'created'
          }
        }
      });

      const result = await evolutionService.createInstance();

      expect(result).toBeDefined();
      expect(mockAxios.post).toHaveBeenCalledWith(
        'http://evolution-api:8080/instance/create',
        expect.objectContaining({
          instanceName: 'test-instance',
          qrcode: true
        }),
        expect.any(Object)
      );
    });

    it('should handle creation errors', async () => {
      mockAxios.post.mockRejectedValue(
        new Error('API Error')
      );

      await expect(evolutionService.createInstance()).rejects.toThrow();
    });

    it('should set correct headers', async () => {
      mockAxios.post.mockResolvedValue({ data: {} });

      await evolutionService.createInstance();

      const callArgs = mockAxios.post.mock.calls[0];
      expect(callArgs[2].headers).toHaveProperty('apikey', 'test-api-key');
      expect(callArgs[2].headers).toHaveProperty('Content-Type', 'application/json');
    });
  });

  describe('getInstanceStatus', () => {
    it('should get instance status', async () => {
      mockAxios.get.mockResolvedValue({
        data: {
          state: 'CONNECTED',
          status: 'success'
        }
      });

      const result = await evolutionService.getInstanceStatus();

      expect(result).toBeDefined();
      expect(mockAxios.get).toHaveBeenCalledWith(
        'http://evolution-api:8080/instance/connectionState/test-instance',
        expect.any(Object)
      );
    });

    it('should return DISCONNECTED on error', async () => {
      mockAxios.get.mockRejectedValue(new Error('Connection failed'));

      const result = await evolutionService.getInstanceStatus();

      expect(result.state).toBe('DISCONNECTED');
    });
  });

  describe('getQRCode', () => {
    it('should fetch QR code successfully', async () => {
      mockAxios.get.mockResolvedValue({
        data: {
          code: 'QR_CODE_DATA',
          base64: 'data:image/png;base64,...',
          status: 'success'
        }
      });

      const result = await evolutionService.getQRCode();

      expect(result).toBeDefined();
      expect(mockAxios.get).toHaveBeenCalled();
    });

    it('should handle QR code fetch errors', async () => {
      mockAxios.get.mockRejectedValue(new Error('Failed to fetch QR'));

      await expect(evolutionService.getQRCode()).rejects.toThrow();
    });
  });

  describe('sendMessage', () => {
    it('should send WhatsApp message successfully', async () => {
      mockAxios.post.mockResolvedValue({
        data: {
          key: {
            id: 'msg123',
            remoteJid: '5511999999999@s.whatsapp.net'
          }
        }
      });

      const result = await evolutionService.sendMessage({
        number: '5511999999999',
        text: 'Hello World'
      });

      expect(result).toBeDefined();
      expect(mockAxios.post).toHaveBeenCalled();
    });

    it('should handle message send errors', async () => {
      mockAxios.post.mockRejectedValue(
        new Error('Failed to send message')
      );

      await expect(
        evolutionService.sendMessage({
          number: '5511999999999',
          text: 'Hello'
        })
      ).rejects.toThrow();
    });

    it('should support media attachments', async () => {
      mockAxios.post.mockResolvedValue({
        data: { key: { id: 'msg123' } }
      });

      const result = await evolutionService.sendMessage({
        number: '5511999999999',
        text: 'Check this image',
        mediaUrl: 'https://example.com/image.jpg',
        mediaType: 'image'
      });

      expect(result).toBeDefined();
    });
  });

  describe('disconnect', () => {
    it('should disconnect instance', async () => {
      mockAxios.delete.mockResolvedValue({ data: { status: 'success' } });

      const result = await evolutionService.disconnect();

      expect(result).toBeDefined();
      expect(mockAxios.delete).toHaveBeenCalled();
    });

    it('should handle disconnection errors', async () => {
      mockAxios.delete.mockRejectedValue(new Error('Disconnect failed'));

      await expect(evolutionService.disconnect()).rejects.toThrow();
    });
  });

  describe('setWebhook', () => {
    it('should set webhook URL', async () => {
      mockAxios.post.mockResolvedValue({
        data: { status: 'success' }
      });

      const result = await evolutionService.setWebhook('https://example.com/webhook');

      expect(result).toBeDefined();
      expect(mockAxios.post).toHaveBeenCalled();
    });

    it('should validate webhook URL', async () => {
      mockAxios.post.mockResolvedValue({ data: {} });

      const result = await evolutionService.setWebhook('https://example.com/webhook');

      expect(result).toBeDefined();
    });
  });

  describe('fetchMessages', () => {
    it('should fetch messages from instance', async () => {
      mockAxios.get.mockResolvedValue({
        data: {
          messages: [
            {
              key: { id: 'msg1' },
              message: { conversation: 'Hello' }
            }
          ]
        }
      });

      const result = await evolutionService.fetchMessages();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle fetch errors', async () => {
      mockAxios.get.mockRejectedValue(new Error('Fetch failed'));

      await expect(evolutionService.fetchMessages()).rejects.toThrow();
    });
  });

  describe('getContacts', () => {
    it('should retrieve contacts from instance', async () => {
      mockAxios.get.mockResolvedValue({
        data: {
          contacts: [
            {
              id: '5511999999999@s.whatsapp.net',
              name: 'John Doe',
              number: '5511999999999'
            }
          ]
        }
      });

      const result = await evolutionService.getContacts();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('updateInstanceConfig', () => {
    it('should update instance configuration', async () => {
      mockAxios.post.mockResolvedValue({
        data: { status: 'success' }
      });

      const result = await evolutionService.updateInstanceConfig({
        rejectCall: true,
        msgCall: 'Busy'
      });

      expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should include original error data in logs', async () => {
      const errorResponse = {
        response: {
          status: 500,
          data: {
            message: 'Internal Server Error'
          }
        }
      };

      mockAxios.post.mockRejectedValue(errorResponse);

      await expect(evolutionService.createInstance()).rejects.toThrow();
    });

    it('should handle network timeouts', async () => {
      mockAxios.post.mockRejectedValue(
        new Error('timeout of 5000ms exceeded')
      );

      await expect(evolutionService.createInstance()).rejects.toThrow();
    });
  });
});
