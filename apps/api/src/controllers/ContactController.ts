import { Request, Response } from 'express';
import { ContactService } from '../services/ContactService';

export class ContactController {
  static async list(req: any, res: Response) {
    try {
      const result = await ContactService.listContacts(req.userId, req.query);
      res.json(result);
    } catch (error: any) {
      console.error('Error fetching contacts:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch contacts' });
    }
  }

  static async getById(req: any, res: Response) {
    try {
      const contact = await ContactService.getContactById(req.userId, req.params.id);
      res.json(contact);
    } catch (error: any) {
      if (error.message === 'Contact not found') {
        return res.status(404).json({ error: error.message });
      }
      console.error('Error fetching contact:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch contact' });
    }
  }

  static async upsert(req: any, res: Response) {
    try {
      const contact = await ContactService.upsertContact(req.userId, req.body);
      res.json(contact);
    } catch (error: any) {
      console.error('Error upserting contact:', error);
      res.status(500).json({ error: error.message || 'Failed to upsert contact' });
    }
  }

  static async update(req: any, res: Response) {
    try {
      const contact = await ContactService.updateContact(req.userId, req.params.id, req.body);
      res.json(contact);
    } catch (error: any) {
      if (error.message === 'Contact not found') {
        return res.status(404).json({ error: error.message });
      }
      console.error('Error updating contact:', error);
      res.status(500).json({ error: error.message || 'Failed to update contact' });
    }
  }

  static async delete(req: any, res: Response) {
    try {
      await ContactService.deleteContact(req.userId, req.params.id);
      res.status(204).send();
    } catch (error: any) {
      if (error.message === 'Contact not found') {
        return res.status(404).json({ error: error.message });
      }
      console.error('Error deleting contact:', error);
      res.status(500).json({ error: error.message || 'Failed to delete contact' });
    }
  }
}
