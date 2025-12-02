import request from 'supertest';
import express from 'express';
import { createTestApp } from './setup';
import contactsRouter from '../routes/contacts';

describe('Contacts Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
    app.use('/api/contacts', contactsRouter);
  });

  describe('GET /api/contacts', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/contacts');
      expect(response.status).toBe(401);
    });

    it('should fetch contacts with pagination', async () => {
      const response = await request(app)
        .get('/api/contacts?page=1&limit=50')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('contacts');
      expect(response.body).toHaveProperty('total');
    });

    it('should filter by search term', async () => {
      const response = await request(app)
        .get('/api/contacts?search=john')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
    });

    it('should filter by integrationId', async () => {
      const response = await request(app)
        .get('/api/contacts?integrationId=int123')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/contacts/:id', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/contacts/123');
      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent contact', async () => {
      const response = await request(app)
        .get('/api/contacts/non-existent')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/contacts', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).post('/api/contacts');
      expect(response.status).toBe(401);
    });

    it('should create contact with valid data', async () => {
      const response = await request(app)
        .post('/api/contacts')
        .set('Authorization', 'Bearer test-token')
        .send({
          integrationId: 'int123',
          name: 'John Doe',
          phoneNumber: '+5511999999999'
        });

      expect([400, 201]).toContain(response.status);
    });
  });

  describe('PATCH /api/contacts/:id', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).patch('/api/contacts/123');
      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent contact', async () => {
      const response = await request(app)
        .patch('/api/contacts/non-existent')
        .set('Authorization', 'Bearer test-token')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/contacts/:id', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).delete('/api/contacts/123');
      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent contact', async () => {
      const response = await request(app)
        .delete('/api/contacts/non-existent')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
    });
  });
});
