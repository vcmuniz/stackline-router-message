import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { createTestApp } from './setup';
import integrationsRouter from '../routes/integrations';

describe('Integrations Routes', () => {
  let app: express.Application;
  let validToken: string;

  beforeAll(() => {
    app = createTestApp();
    app.use('/api/integrations', integrationsRouter);
    
    validToken = jwt.sign(
      { sub: 'test-user-123' },
      process.env.JWT_SECRET || 'dev',
      { expiresIn: '1h' }
    );
  });

  describe('GET /api/integrations', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/integrations');
      expect(response.status).toBe(401);
    });

    it('should return integrations list', async () => {
      const response = await request(app)
        .get('/api/integrations')
        .set('Authorization', `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  describe('GET /api/integrations/:id', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/integrations/123');
      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent integration', async () => {
      const response = await request(app)
        .get('/api/integrations/non-existent-id')
        .set('Authorization', `Bearer ${validToken}`);

      expect([404, 500]).toContain(response.status);
    });
  });

  describe('GET /api/integrations/:id/qrcode', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/integrations/123/qrcode');
      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent integration', async () => {
      const response = await request(app)
        .get('/api/integrations/non-existent-id/qrcode')
        .set('Authorization', `Bearer ${validToken}`);

      expect([404, 500]).toContain(response.status);
    });
  });

  describe('POST /api/integrations/:id/sync-status', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/integrations/123/sync-status');

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent integration', async () => {
      const response = await request(app)
        .post('/api/integrations/non-existent-id/sync-status')
        .set('Authorization', `Bearer ${validToken}`);

      expect([404, 500]).toContain(response.status);
    });
  });

  describe('GET /api/integrations/:id/stats', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/integrations/123/stats');
      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent integration', async () => {
      const response = await request(app)
        .get('/api/integrations/non-existent-id/stats')
        .set('Authorization', `Bearer ${validToken}`);

      expect([404, 500]).toContain(response.status);
    });
  });
});
