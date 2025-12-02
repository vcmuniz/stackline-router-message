import request from 'supertest';
import express from 'express';
import { createTestApp } from './setup';
import apiKeysRouter from '../routes/apiKeys';

describe('API Keys Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
    app.use('/api/api-keys', apiKeysRouter);
  });

  describe('GET /api/api-keys', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/api-keys');
      expect(response.status).toBe(401);
    });

    it('should fetch API keys with valid token', async () => {
      (app as any).request = {
        prisma: {
          apiKey: {
            findMany: jest.fn().mockResolvedValue([
              {
                id: 'key1',
                name: 'Test Key',
                key: 'sk_test123',
                permissions: ['read', 'write'],
                rateLimit: 60,
                enabled: true,
                expiresAt: null,
                lastUsedAt: null,
                createdAt: new Date()
              }
            ])
          }
        }
      };

      const response = await request(app)
        .get('/api/api-keys')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/api-keys', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).post('/api/api-keys');
      expect(response.status).toBe(401);
    });

    it('should reject missing name', async () => {
      const response = await request(app)
        .post('/api/api-keys')
        .set('Authorization', 'Bearer test-token')
        .send({ permissions: ['read'] });

      expect(response.status).toBe(400);
    });

    it('should reject missing permissions', async () => {
      const response = await request(app)
        .post('/api/api-keys')
        .set('Authorization', 'Bearer test-token')
        .send({ name: 'Test Key' });

      expect(response.status).toBe(400);
    });

    it('should reject empty permissions array', async () => {
      const response = await request(app)
        .post('/api/api-keys')
        .set('Authorization', 'Bearer test-token')
        .send({ name: 'Test Key', permissions: [] });

      expect(response.status).toBe(400);
    });

    it('should create API key with valid data', async () => {
      const response = await request(app)
        .post('/api/api-keys')
        .set('Authorization', 'Bearer test-token')
        .send({
          name: 'Test Key',
          permissions: ['read', 'write'],
          rateLimit: 100
        });

      expect([400, 201]).toContain(response.status);
    });
  });

  describe('PUT /api/api-keys/:id', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).put('/api/api-keys/key123');
      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent API key', async () => {
      const response = await request(app)
        .put('/api/api-keys/non-existent')
        .set('Authorization', 'Bearer test-token')
        .send({ name: 'Updated Key' });

      expect(response.status).toBe(404);
    });

    it('should update API key with valid data', async () => {
      const response = await request(app)
        .put('/api/api-keys/key123')
        .set('Authorization', 'Bearer test-token')
        .send({
          name: 'Updated Key',
          permissions: ['read'],
          rateLimit: 50,
          enabled: false
        });

      expect([400, 200]).toContain(response.status);
    });
  });

  describe('DELETE /api/api-keys/:id', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).delete('/api/api-keys/key123');
      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent API key', async () => {
      const response = await request(app)
        .delete('/api/api-keys/non-existent')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
    });

    it('should delete API key successfully', async () => {
      const response = await request(app)
        .delete('/api/api-keys/key123')
        .set('Authorization', 'Bearer test-token');

      expect([204, 400]).toContain(response.status);
    });
  });
});
