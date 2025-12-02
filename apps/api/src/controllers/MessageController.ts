import { Request, Response } from 'express';
import { MessageService } from '../services/MessageService';

export class MessageController {
  static async list(req: any, res: Response) {
    try {
      const result = await MessageService.listMessages(req.userId, req.query);
      res.json(result);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch messages' });
    }
  }

  static async getById(req: any, res: Response) {
    try {
      const message = await MessageService.getMessageById(req.params.id);
      res.json(message);
    } catch (error: any) {
      if (error.message === 'Message not found') {
        return res.status(404).json({ error: error.message });
      }
      console.error('Error fetching message:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch message' });
    }
  }

  static async send(req: any, res: Response) {
    try {
      const message = await MessageService.sendMessage(req.body);
      res.status(201).json(message);
    } catch (error: any) {
      console.error('Error sending message:', error);
      res.status(500).json({ error: error.message || 'Failed to send message' });
    }
  }

  static async updateStatus(req: any, res: Response) {
    try {
      const { status, errorMessage } = req.body;
      const message = await MessageService.updateMessageStatus(req.params.id, status, errorMessage);
      res.json(message);
    } catch (error: any) {
      if (error.message === 'Message not found') {
        return res.status(404).json({ error: error.message });
      }
      console.error('Error updating message status:', error);
      res.status(500).json({ error: error.message || 'Failed to update message status' });
    }
  }

  static async delete(req: any, res: Response) {
    try {
      await MessageService.deleteMessage(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      if (error.message === 'Message not found') {
        return res.status(404).json({ error: error.message });
      }
      console.error('Error deleting message:', error);
      res.status(500).json({ error: error.message || 'Failed to delete message' });
    }
  }

  static async getThread(req: any, res: Response) {
    try {
      const messages = await MessageService.getThread(req.params.contactId);
      res.json(messages);
    } catch (error: any) {
      console.error('Error fetching thread:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch thread' });
    }
  }
}
