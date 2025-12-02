import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { MessageController } from '../controllers/MessageController';

const router = Router();

router.get('/', authMiddleware, MessageController.list);
router.get('/:id', authMiddleware, MessageController.getById);
router.post('/send', authMiddleware, MessageController.send);
router.patch('/:id/status', authMiddleware, MessageController.updateStatus);
router.delete('/:id', authMiddleware, MessageController.delete);
router.get('/threads/:contactId', authMiddleware, MessageController.getThread);

export default router;
