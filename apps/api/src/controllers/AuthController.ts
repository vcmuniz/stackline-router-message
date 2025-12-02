import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }

  static async register(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.register(email, password);
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }
}
