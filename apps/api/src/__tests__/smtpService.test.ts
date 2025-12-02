import { SMTPService } from '../services/smtpService';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    verify: jest.fn().mockResolvedValue(true),
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-msg-id' })
  })
}));

jest.mock('database', () => ({
  PrismaClient: jest.fn(() => ({
    message: {
      update: jest.fn()
    }
  }))
}));

describe('SMTPService', () => {
  let smtpService: SMTPService;

  const mockConfig = {
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    user: 'test@example.com',
    pass: 'password123',
    from: 'noreply@example.com'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    smtpService = new SMTPService(mockConfig);
  });

  describe('initialize', () => {
    it('should initialize with valid config', () => {
      expect(smtpService).toBeDefined();
    });

    it('should throw error on invalid config', () => {
      const nodemailer = require('nodemailer');
      nodemailer.createTransport.mockImplementationOnce(() => {
        throw new Error('Invalid config');
      });

      expect(() => {
        new SMTPService(mockConfig);
      }).toThrow();
    });
  });

  describe('verifyConnection', () => {
    it('should verify connection successfully', async () => {
      const result = await smtpService.verifyConnection();
      expect(result).toBe(true);
    });

    it('should return false on verification failure', async () => {
      const nodemailer = require('nodemailer');
      const mockTransporter = nodemailer.createTransport.mock.results[0].value;
      mockTransporter.verify.mockRejectedValueOnce(new Error('Connection failed'));

      const result = await smtpService.verifyConnection();
      expect(result).toBe(false);
    });

    it('should return false when transporter is null', async () => {
      smtpService['transporter'] = null;
      const result = await smtpService.verifyConnection();
      expect(result).toBe(false);
    });
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      const result = await smtpService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test email</p>'
      });

      expect(result).toBeDefined();
    });

    it('should handle missing required fields', async () => {
      const result = await smtpService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject'
        // html missing
      });

      expect(result).toBeDefined();
    });

    it('should use from address from config', async () => {
      const nodemailer = require('nodemailer');
      const mockTransporter = nodemailer.createTransport.mock.results[0].value;

      await smtpService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      });

      const sendMailCall = mockTransporter.sendMail.mock.calls[0];
      expect(sendMailCall[0].from).toBe(mockConfig.from);
    });

    it('should handle email send failure', async () => {
      const nodemailer = require('nodemailer');
      const mockTransporter = nodemailer.createTransport.mock.results[0].value;
      mockTransporter.sendMail.mockRejectedValueOnce(new Error('Send failed'));

      await expect(
        smtpService.sendEmail({
          to: 'recipient@example.com',
          subject: 'Test',
          html: '<p>Test</p>'
        })
      ).rejects.toThrow();
    });
  });

  describe('sendBulkEmail', () => {
    it('should send emails to multiple recipients', async () => {
      const recipients = [
        'user1@example.com',
        'user2@example.com',
        'user3@example.com'
      ];

      const result = await smtpService.sendBulkEmail({
        to: recipients,
        subject: 'Bulk Test',
        html: '<p>Test email</p>'
      });

      expect(result).toBeDefined();
    });

    it('should handle partial failures in bulk send', async () => {
      const nodemailer = require('nodemailer');
      const mockTransporter = nodemailer.createTransport.mock.results[0].value;

      mockTransporter.sendMail
        .mockResolvedValueOnce({ messageId: 'msg1' })
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ messageId: 'msg3' });

      const result = await smtpService.sendBulkEmail({
        to: ['user1@example.com', 'user2@example.com', 'user3@example.com'],
        subject: 'Test',
        html: '<p>Test</p>'
      });

      expect(result).toBeDefined();
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email format', () => {
      const isValid = smtpService.validateEmail('test@example.com');
      expect(isValid).toBe(true);
    });

    it('should reject invalid email format', () => {
      const isValid = smtpService.validateEmail('invalid-email');
      expect(isValid).toBe(false);
    });

    it('should reject email without domain', () => {
      const isValid = smtpService.validateEmail('test@');
      expect(isValid).toBe(false);
    });
  });
});
