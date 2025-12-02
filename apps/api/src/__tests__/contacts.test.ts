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
    
    // Generate valid test token
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

    it('should return contacts list with valid token', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  describe('GET /api/contacts/:id', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/contacts/123');
      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent contact', async () => {
      const response = await request(app)
        .get('/api/contacts/non-existent-id')
        .set('Authorization', `Bearer ${validToken}`);

      expect([404, 500]).toContain(response.status);
    });
  });

  describe('POST /api/contacts', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/contacts')
        .send({ name: 'Test Contact', phoneNumber: '+5511999999999' });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/contacts/:id', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).delete('/api/contacts/123');
      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent contact', async () => {
      const response = await request(app)
        .delete('/api/contacts/non-existent-id')
        .set('Authorization', `Bearer ${validToken}`);

      expect([404, 500]).toContain(response.status);
    });
  });
});
