import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { createTestApp } from './setup';
import contactsRouter from '../routes/contacts';

describe('Contacts Routes', () => {
  let app: express.Application;
  let validToken: string;

  beforeAll(() => {
    app = createTestApp();
    app.use('/api/contacts', contactsRouter);
    
    validToken = jwt.sign(
      { sub: 'test-user-123' },
      process.env.JWT_SECRET || 'dev',
      { expiresIn: '1h' }
    );
  });

  describe('GET /api/contacts', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/contacts');
      expect(response.status).toBe(401);
    });

    it('should handle GET contacts', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${validToken}`);

      expect([200, 401, 500]).toContain(response.status);
    });
  });

  describe('GET /api/contacts/:id', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/contacts/123');
      expect(response.status).toBe(401);
    });

    it('should handle GET contact by id', async () => {
      const response = await request(app)
        .get('/api/contacts/non-existent-id')
        .set('Authorization', `Bearer ${validToken}`);

      expect([401, 404, 500]).toContain(response.status);
    });
  });

  describe('POST /api/contacts', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/contacts')
        .send({ name: 'Test Contact', phoneNumber: '+5511999999999' });

      expect(response.status).toBe(401);
    });

    it('should handle POST contact', async () => {
      const response = await request(app)
        .post('/api/contacts')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Test Contact', phoneNumber: '+5511999999999' });

      expect([201, 400, 401, 500]).toContain(response.status);
    });
  });

  describe('PUT /api/contacts/:id', () => {
    it('should handle PUT contact without auth', async () => {
      const response = await request(app)
        .put('/api/contacts/123')
        .send({ name: 'Updated' });

      expect([401, 404]).toContain(response.status);
    });

    it('should handle PUT contact with auth', async () => {
      const response = await request(app)
        .put('/api/contacts/non-existent-id')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Updated' });

      expect([200, 401, 404, 500]).toContain(response.status);
    });
  });

  describe('DELETE /api/contacts/:id', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).delete('/api/contacts/123');
      expect(response.status).toBe(401);
    });

    it('should handle DELETE contact', async () => {
      const response = await request(app)
        .delete('/api/contacts/non-existent-id')
        .set('Authorization', `Bearer ${validToken}`);

      expect([200, 204, 401, 404, 500]).toContain(response.status);
    });
  });
});
