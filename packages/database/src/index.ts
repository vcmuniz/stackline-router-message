import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export { prisma, PrismaClient };
export * from '@prisma/client';

// Export services
export * from './services/evolutionApi';
export * from './services/queueService';
export * from './services/smtpService';
