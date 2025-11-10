import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cron from 'node-cron';
import dotenv from 'dotenv';
import path from 'path';
import { messageQueueService } from 'database';

// Carregar .env do diretório do app realtime
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

// Rota para notificar nova mensagem
app.post('/notify/message', (req, res) => {
  const { message } = req.body;
  console.log('📨 Notificando nova mensagem via socket');
  io.emit('message:new', message);
  res.json({ success: true });
});

io.on('connection', socket => {
  console.log('client connected', socket.id);
  socket.emit('welcome', { message: 'Bem-vindo ao realtime' });

  // Join room do usuário (para notificações específicas)
  socket.on('join:user', (userId: number) => {
    socket.join(`user:${userId}`);
    console.log(`User ${userId} joined room`);
  });
});

// Função para notificar nova mensagem
export function notifyNewMessage(userId: number, message: any) {
  io.to(`user:${userId}`).emit('message:new', message);
}

// Cron: Processar fila de mensagens (a cada minuto)
cron.schedule('* * * * *', async () => {
  try {
    const result = await messageQueueService.processQueue();
    io.emit('queue:processed', result);
  } catch (error) {
    console.error('❌ Erro no cron de processamento de fila:', error);
  }
});

// Cron: Limpeza de mensagens antigas (todo dia às 03:00)
cron.schedule('0 3 * * *', async () => {
  try {
    console.log('🧹 Iniciando limpeza de mensagens antigas...');
    // TODO: Implementar limpeza de mensagens antigas
  } catch (error) {
    console.error('❌ Erro na limpeza de mensagens:', error);
  }
});

// Teste a cada 5 segundos
cron.schedule('*/5 * * * * *', () => {
  io.emit('tick', { at: new Date().toISOString() });
});

const port = process.env.RT_PORT || 4500;
httpServer.listen(port, () => {
  console.log(`Realtime server on ${port}`);
  console.log('📨 Cron de fila de mensagens ativo (executa a cada minuto)');
  console.log('🧹 Cron de limpeza ativo (executa diariamente às 03:00)');
});
