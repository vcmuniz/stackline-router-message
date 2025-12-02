import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { ContactController } from '../controllers/ContactController';

const router = Router();

router.get('/', authMiddleware, ContactController.list);
router.get('/:id', authMiddleware, ContactController.getById);
router.post('/', authMiddleware, ContactController.upsert);
router.patch('/:id', authMiddleware, ContactController.update);
router.delete('/:id', authMiddleware, ContactController.delete);

export default router;
