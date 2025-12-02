import request from 'supertest';
import express from 'express';
import { createTestApp } from './setup';
import messagesRouter from '../routes/messages';

describe('Messages Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
    app.use('/api/messages', messagesRouter);
  });

  describe('GET /api/messages', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/messages');
      expect(response.status).toBe(401);
    });

    it('should fetch messages with pagination', async () => {
      const response = await request(app)
        .get('/api/messages?page=1&limit=20')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.messages).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/messages/:id', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/messages/123');
      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent message', async () => {
      const response = await request(app)
        .get('/api/messages/non-existent')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/messages/send', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).post('/api/messages/send');
      expect(response.status).toBe(401);
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/messages/send')
        .set('Authorization', 'Bearer test-token')
        .send({});

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('PATCH /api/messages/:id/status', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).patch('/api/messages/123/status');
      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent message', async () => {
      const response = await request(app)
        .patch('/api/messages/non-existent/status')
        .set('Authorization', 'Bearer test-token')
        .send({ status: 'DELIVERED' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/messages/:id', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).delete('/api/messages/123');
      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent message', async () => {
      const response = await request(app)
        .delete('/api/messages/non-existent')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/messages/threads/:contactId', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/messages/threads/contact123');
      expect(response.status).toBe(401);
    });
  });
});
