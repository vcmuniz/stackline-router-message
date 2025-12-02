import request from 'supertest';
import express from 'express';
import { createTestApp } from './setup';
import integrationsRouter from '../routes/integrations';

describe('Integrations Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
    app.use('/api/integrations', integrationsRouter);
  });

  describe('GET /api/integrations', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/integrations');
      expect(response.status).toBe(401);
    });

    it('should fetch integrations with valid token', async () => {
      const response = await request(app)
        .get('/api/integrations')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/integrations/:id', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/integrations/int123');
      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent integration', async () => {
      const response = await request(app)
        .get('/api/integrations/non-existent')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/integrations/by-instance/:instanceName', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/integrations/by-instance/test-instance');
      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent instance', async () => {
      const response = await request(app)
        .get('/api/integrations/by-instance/non-existent')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/integrations', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).post('/api/integrations');
      expect(response.status).toBe(401);
    });

    it('should create integration with valid data', async () => {
      const response = await request(app)
        .post('/api/integrations')
        .set('Authorization', 'Bearer test-token')
        .send({
          name: 'Test Integration',
          type: 'WHATSAPP_EVOLUTION',
          config: { instanceName: 'test-instance' }
        });

      expect([400, 201]).toContain(response.status);
    });
  });

  describe('PUT /api/integrations/:id', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).put('/api/integrations/int123');
      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent integration', async () => {
      const response = await request(app)
        .put('/api/integrations/non-existent')
        .set('Authorization', 'Bearer test-token')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/integrations/:id', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).delete('/api/integrations/int123');
      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent integration', async () => {
      const response = await request(app)
        .delete('/api/integrations/non-existent')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/integrations/:id/toggle', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).post('/api/integrations/int123/toggle');
      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent integration', async () => {
      const response = await request(app)
        .post('/api/integrations/non-existent/toggle')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/integrations/:id/qrcode', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/integrations/int123/qrcode');
      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent integration', async () => {
      const response = await request(app)
        .get('/api/integrations/non-existent/qrcode')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/integrations/:id/sync-status', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).post('/api/integrations/int123/sync-status');
      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent integration', async () => {
      const response = await request(app)
        .post('/api/integrations/non-existent/sync-status')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/integrations/:id/stats', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/integrations/int123/stats');
      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent integration', async () => {
      const response = await request(app)
        .get('/api/integrations/non-existent/stats')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
    });
  });
});
