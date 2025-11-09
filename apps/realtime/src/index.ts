import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cron from 'node-cron';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

io.on('connection', socket => {
  console.log('client connected', socket.id);
  socket.emit('welcome', { message: 'Bem-vindo ao realtime' });
});

cron.schedule('*/5 * * * * *', () => {
  io.emit('tick', { at: new Date().toISOString() });
});

const port = process.env.RT_PORT || 4500;
httpServer.listen(port, () => console.log('Realtime server on ' + port));
