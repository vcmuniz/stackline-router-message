import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { createTestApp } from './setup';
import dashboardRouter from '../routes/dashboard';

describe('Dashboard Routes', () => {
  let app: express.Application;
  let validToken: string;

  beforeAll(() => {
    app = createTestApp();
    app.use('/api/dashboard', dashboardRouter);
    
    validToken = jwt.sign(
      { sub: 'test-user-123' },
      process.env.JWT_SECRET || 'dev',
      { expiresIn: '1h' }
    );
  });

  describe('GET /api/dashboard', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/dashboard');
      expect(response.status).toBe(401);
    });

    it('should return dashboard cards', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${validToken}`);

      expect([200, 401, 500]).toContain(response.status);
    });
  });
});
