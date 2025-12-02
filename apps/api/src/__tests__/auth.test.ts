import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createTestApp } from './setup';
import authRouter from '../routes/auth';

describe('Auth Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
    app.use('/auth', authRouter);
  });

  describe('POST /auth/login', () => {
    it('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Credenciais inválidas');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'invalid-email', password: 'password123' });

      expect(response.status).toBe(400);
    });

    it('should reject password shorter than 4 characters', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'abc' });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /auth/register', () => {
    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({ email: 'invalid-email', password: 'password123' });

      expect(response.status).toBe(400);
    });

    it('should reject password shorter than 4 characters', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({ email: 'test@example.com', password: 'abc' });

      expect(response.status).toBe(400);
    });

    it('should return error on registration failure', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(400);
    });
  });
});
