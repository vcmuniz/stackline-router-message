import { Router } from 'express';
import jwt from 'jsonwebtoken';
const router = Router();

router.use((req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: 'Sem token' });
  try {
    const token = auth.replace('Bearer ', '');
    (req as any).user = jwt.verify(token, process.env.JWT_SECRET || 'dev');
    next();
  } catch { return res.status(401).json({ message: 'Token inválido' }); }
});

router.get('/', async (req, res) => {
  res.json({ cards: [
    { title: 'Usuários', value: 42 },
    { title: 'Pedidos', value: 17 },
    { title: 'Faturamento', value: 'R$ 12.300' }
  ] });
});

export default router;
