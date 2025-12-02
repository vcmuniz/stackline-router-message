import { Request, Response } from 'express';
import { IntegrationService } from '../services/IntegrationService';

export class IntegrationController {
  static async list(req: any, res: Response) {
    try {
      const integrations = await IntegrationService.listIntegrations(req.userId);
      res.json(integrations);
    } catch (error: any) {
      console.error('Error fetching integrations:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch integrations' });
    }
  }

  static async getById(req: any, res: Response) {
    try {
      const integration = await IntegrationService.getIntegrationById(req.userId, req.params.id);
      res.json(integration);
    } catch (error: any) {
      if (error.message === 'Integration not found') {
        return res.status(404).json({ error: error.message });
      }
      console.error('Error fetching integration:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch integration' });
    }
  }

  static async getByInstance(req: any, res: Response) {
    try {
      const integration = await IntegrationService.getIntegrationByInstance(req.userId, req.params.instanceName);
      res.json(integration);
    } catch (error: any) {
      res.status(404).json({ error: error.message || 'Failed to fetch integration' });
    }
  }

  static async create(req: any, res: Response) {
    try {
      const integration = await IntegrationService.createIntegration(req.userId, req.body);
      res.status(201).json(integration);
    } catch (error: any) {
      console.error('Error creating integration:', error);
      res.status(500).json({ error: error.message || 'Failed to create integration' });
    }
  }

  static async update(req: any, res: Response) {
    try {
      const integration = await IntegrationService.updateIntegration(req.userId, req.params.id, req.body);
      res.json(integration);
    } catch (error: any) {
      if (error.message === 'Integration not found') {
        return res.status(404).json({ error: error.message });
      }
      console.error('Error updating integration:', error);
      res.status(500).json({ error: error.message || 'Failed to update integration' });
    }
  }

  static async delete(req: any, res: Response) {
    try {
      await IntegrationService.deleteIntegration(req.userId, req.params.id);
      res.status(204).send();
    } catch (error: any) {
      if (error.message === 'Integration not found') {
        return res.status(404).json({ error: error.message });
      }
      console.error('Error deleting integration:', error);
      res.status(500).json({ error: error.message || 'Failed to delete integration' });
    }
  }

  static async toggle(req: any, res: Response) {
    try {
      const updated = await IntegrationService.toggleIntegration(req.userId, req.params.id);
      res.json(updated);
    } catch (error: any) {
      if (error.message === 'Integration not found') {
        return res.status(404).json({ error: error.message });
      }
      console.error('Error toggling integration:', error);
      res.status(500).json({ error: error.message || 'Failed to toggle integration' });
    }
  }

  static async getQRCode(req: any, res: Response) {
    try {
      const qrcodeData = await IntegrationService.getQRCode(req.userId, req.params.id);
      res.json(qrcodeData);
    } catch (error: any) {
      if (error.message === 'WhatsApp integration not found') {
        return res.status(404).json({ error: error.message });
      }
      console.error('Error fetching QR code:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch QR code' });
    }
  }

  static async syncStatus(req: any, res: Response) {
    try {
      const status = await IntegrationService.syncStatus(req.userId, req.params.id);
      res.json({ status });
    } catch (error: any) {
      if (error.message === 'Integration not found') {
        return res.status(404).json({ error: error.message });
      }
      console.error('Error syncing status:', error);
      res.status(500).json({ error: error.message || 'Failed to sync status' });
    }
  }

  static async getStats(req: any, res: Response) {
    try {
      const stats = await IntegrationService.getStats(req.userId, req.params.id);
      res.json(stats);
    } catch (error: any) {
      if (error.message === 'Integration not found') {
        return res.status(404).json({ error: error.message });
      }
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch statistics' });
    }
  }
}
