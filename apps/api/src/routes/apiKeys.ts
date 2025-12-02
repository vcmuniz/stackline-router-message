import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { ApiKeyController } from '../controllers/ApiKeyController';

const router = Router();

router.get('/', authMiddleware, ApiKeyController.list);
router.post('/', authMiddleware, ApiKeyController.create);
router.put('/:id', authMiddleware, ApiKeyController.update);
router.delete('/:id', authMiddleware, ApiKeyController.delete);

export default router;
