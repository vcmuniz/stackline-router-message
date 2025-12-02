import { Request, Response } from 'express';
import { ApiKeyService } from '../services/ApiKeyService';

export class ApiKeyController {
  static async list(req: any, res: Response) {
    try {
      const apiKeys = await ApiKeyService.listApiKeys(req.userId);
      res.json(apiKeys);
    } catch (error: any) {
      console.error('Error fetching API keys:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch API keys' });
    }
  }

  static async create(req: any, res: Response) {
    try {
      const apiKey = await ApiKeyService.createApiKey(req.userId, req.body);
      res.status(201).json(apiKey);
    } catch (error: any) {
      console.error('Error creating API key:', error);
      res.status(400).json({ error: error.message });
    }
  }

  static async update(req: any, res: Response) {
    try {
      const apiKey = await ApiKeyService.updateApiKey(req.userId, req.params.id, req.body);
      res.json(apiKey);
    } catch (error: any) {
      if (error.message === 'API Key not found') {
        return res.status(404).json({ error: error.message });
      }
      console.error('Error updating API key:', error);
      res.status(500).json({ error: error.message || 'Failed to update API key' });
    }
  }

  static async delete(req: any, res: Response) {
    try {
      await ApiKeyService.deleteApiKey(req.userId, req.params.id);
      res.status(204).send();
    } catch (error: any) {
      if (error.message === 'API Key not found') {
        return res.status(404).json({ error: error.message });
      }
      console.error('Error deleting API key:', error);
      res.status(500).json({ error: error.message || 'Failed to delete API key' });
    }
  }
}
