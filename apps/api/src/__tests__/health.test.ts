import request from 'supertest';
import express from 'express';
import { createTestApp } from './setup';

describe('Health Check', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date() });
    });
  });

  it('should return 200 with status ok', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.timestamp).toBeDefined();
  });

  it('should return JSON content type', async () => {
    const response = await request(app).get('/health');

    expect(response.type).toBe('application/json');
  });
});
