import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { DashboardService } from '../services/DashboardService';

export class DashboardController {
  static async getCards(req: Request, res: Response) {
    try {
      const auth = req.headers.authorization;
      if (!auth) return res.status(401).json({ message: 'Sem token' });

      try {
        const token = auth.replace('Bearer ', '');
        const user = jwt.verify(token, process.env.JWT_SECRET || 'dev');
        (req as any).user = user;
      } catch {
        return res.status(401).json({ message: 'Token inválido' });
      }

      const result = await DashboardService.getCards();
      res.json(result);
    } catch (error: any) {
      console.error('Error fetching dashboard:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch dashboard' });
    }
  }
}
