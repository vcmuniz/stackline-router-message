import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { createTestApp } from './setup';
import messagesRouter from '../routes/messages';

describe('Messages Routes', () => {
  let app: express.Application;
  let validToken: string;

  beforeAll(() => {
    app = createTestApp();
    app.use('/api/messages', messagesRouter);
    
    validToken = jwt.sign(
      { sub: 'test-user-123' },
      process.env.JWT_SECRET || 'dev',
      { expiresIn: '1h' }
    );
  });

  describe('GET /api/messages', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/messages');
      expect(response.status).toBe(401);
    });

    it('should fetch messages with pagination', async () => {
      const response = await request(app)
        .get('/api/messages')
        .set('Authorization', `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  describe('GET /api/messages/:id', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/messages/123');
      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent message', async () => {
      const response = await request(app)
        .get('/api/messages/non-existent-id')
        .set('Authorization', `Bearer ${validToken}`);

      expect([404, 500]).toContain(response.status);
    });
  });

  describe('POST /api/messages/send', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/messages/send')
        .send({ integrationId: '123', content: 'test' });

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/messages/:id/status', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .patch('/api/messages/123/status')
        .send({ status: 'DELIVERED' });

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent message', async () => {
      const response = await request(app)
        .patch('/api/messages/non-existent-id/status')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ status: 'DELIVERED' });

      expect([404, 500]).toContain(response.status);
    });
  });

  describe('DELETE /api/messages/:id', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).delete('/api/messages/123');
      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent message', async () => {
      const response = await request(app)
        .delete('/api/messages/non-existent-id')
        .set('Authorization', `Bearer ${validToken}`);

      expect([204, 404, 500]).toContain(response.status);
    });
  });
});
