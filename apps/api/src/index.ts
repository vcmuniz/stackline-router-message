import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient, setupBullDashboard, createDefaultEmailTemplates } from 'database';
import authRouter from './routes/auth';
import dashboardRouter from './routes/dashboard';
import integrationsRouter from './routes/integrations';
import messagesRouter from './routes/messages';
import contactsRouter from './routes/contacts';
import webhookRouter from './routes/webhook';

dotenv.config();
const app = express();
const prisma = new PrismaClient();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use((req, _res, next) => { (req as any).prisma = prisma; next(); });

// Rotas
app.use('/auth', authRouter);
app.use('/dashboard', dashboardRouter);
app.use('/api/integrations', integrationsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/contacts', contactsRouter);
app.use('/webhook', webhookRouter);

// Dashboard de filas (desenvolvimento)
if (process.env.NODE_ENV !== 'production') {
  setupBullDashboard(app);
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

const port = process.env.PORT || 4000;

// Inicializar servidor
async function startServer() {
  try {
    // Conectar ao banco
    await prisma.$connect();
    console.log('Connected to database');

    // Criar templates padrão
    await createDefaultEmailTemplates();

    // Iniciar servidor
    app.listen(port, () => {
      console.log(`API listening on http://localhost:${port}`);
      console.log(`Queue dashboard: http://localhost:${port}/admin/queues`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
