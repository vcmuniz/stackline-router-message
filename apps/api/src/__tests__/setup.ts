import express from 'express';
import cors from 'cors';

export function createTestApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Mock prisma
  app.use((req, _res, next) => {
    (req as any).prisma = {
      user: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn() },
      message: { findMany: jest.fn(), create: jest.fn() },
      contact: { findMany: jest.fn(), create: jest.fn() },
      integration: { findMany: jest.fn(), findUnique: jest.fn() },
      apiKey: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn() },
      webhook: { findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    };
    next();
  });

  return app;
}
