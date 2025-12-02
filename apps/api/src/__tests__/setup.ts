import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';

export function createTestApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Mock auth middleware
  app.use((req, _res, next) => {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      try {
        const token = auth.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev') as any;
        (req as any).userId = decoded.sub || 'test-user-123';
        (req as any).user = decoded;
      } catch {
        (req as any).userId = 'test-user-123';
      }
    }
    next();
  });

  // Mock prisma
  app.use((req, _res, next) => {
    (req as any).prisma = {
      user: { 
        findUnique: jest.fn(), 
        create: jest.fn(), 
        findMany: jest.fn() 
      },
      message: { 
        findMany: jest.fn(), 
        findUnique: jest.fn(),
        count: jest.fn(() => Promise.resolve(0)),
        create: jest.fn(), 
        update: jest.fn(),
        delete: jest.fn()
      },
      contact: { 
        findMany: jest.fn(), 
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(() => Promise.resolve(0)),
        create: jest.fn(), 
        update: jest.fn(),
        delete: jest.fn()
      },
      integration: { 
        findMany: jest.fn(), 
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(() => Promise.resolve(0)),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      },
      apiKey: { 
        findUnique: jest.fn(), 
        findFirst: jest.fn(),
        create: jest.fn(), 
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      },
      webhook: { 
        findMany: jest.fn(), 
        create: jest.fn(), 
        update: jest.fn() 
      },
    };
    next();
  });

  return app;
}
