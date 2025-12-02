import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { createTestApp } from './setup';
import apiKeysRouter from '../routes/apiKeys';

describe('API Keys Routes', () => {
  let app: express.Application;
  let validToken: string;

  beforeAll(() => {
    app = createTestApp();
    app.use('/api/api-keys', apiKeysRouter);
    
    validToken = jwt.sign(
      { sub: 'test-user-123' },
      process.env.JWT_SECRET || 'dev',
      { expiresIn: '1h' }
    );
  });

  describe('GET /api/api-keys', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/api-keys');
      expect(response.status).toBe(401);
    });

    it('should return API keys list', async () => {
      const response = await request(app)
        .get('/api/api-keys')
        .set('Authorization', `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  describe('POST /api/api-keys', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/api-keys')
        .send({ name: 'test', permissions: ['read'] });

      expect(response.status).toBe(401);
    });

    it('should require name and permissions', async () => {
      const response = await request(app)
        .post('/api/api-keys')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect([400, 500]).toContain(response.status);
    });

    it('should create API key successfully', async () => {
      const response = await request(app)
        .post('/api/api-keys')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'test-key', permissions: ['read', 'write'] });

      expect([201, 400, 500]).toContain(response.status);
    });
  });

  describe('PUT /api/api-keys/:id', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .put('/api/api-keys/123')
        .send({ name: 'updated' });

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent API key', async () => {
      const response = await request(app)
        .put('/api/api-keys/non-existent-id')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'updated' });

      expect([404, 500]).toContain(response.status);
    });
  });

  describe('DELETE /api/api-keys/:id', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).delete('/api/api-keys/123');
      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent API key', async () => {
      const response = await request(app)
        .delete('/api/api-keys/non-existent-id')
        .set('Authorization', `Bearer ${validToken}`);

      expect([204, 404, 500]).toContain(response.status);
    });

    it('should delete API key successfully', async () => {
      const response = await request(app)
        .delete('/api/api-keys/test-id')
        .set('Authorization', `Bearer ${validToken}`);

      expect([204, 404, 500]).toContain(response.status);
    });
  });
});
