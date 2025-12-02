import request from 'supertest';
import express from 'express';
import { createTestApp } from './setup';
import dashboardRouter from '../routes/dashboard';

describe('Dashboard Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
    app.use('/api/dashboard', dashboardRouter);
  });

  describe('GET /api/dashboard', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/dashboard');
      expect(response.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it('should return dashboard cards with valid token', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.cards).toBeDefined();
      expect(Array.isArray(response.body.cards)).toBe(true);
    });

    it('should have expected dashboard card properties', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', 'Bearer test-token');

      if (response.status === 200 && response.body.cards) {
        response.body.cards.forEach((card: any) => {
          expect(card).toHaveProperty('title');
          expect(card).toHaveProperty('value');
        });
      }
    });
  });
});
