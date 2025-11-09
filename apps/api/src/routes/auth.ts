import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const router = Router();
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(4) });

router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const prisma = (req as any).prisma;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Credenciais inválidas' });

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) return res.status(401).json({ message: 'Credenciais inválidas' });

    const token = jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET || 'dev', { expiresIn: '1h' });
    res.json({ token });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/register', async (req, res) => {
  try {
    const prisma = (req as any).prisma;
    const { email, password } = loginSchema.parse(req.body);
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, password: hashedPassword } });
    res.json({ id: user.id });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

export default router;
