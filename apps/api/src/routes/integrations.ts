import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { IntegrationController } from '../controllers/IntegrationController';

const router = Router();

router.get('/', authMiddleware, IntegrationController.list);
router.get('/:id', authMiddleware, IntegrationController.getById);
router.get('/by-instance/:instanceName', authMiddleware, IntegrationController.getByInstance);
router.post('/', authMiddleware, IntegrationController.create);
router.put('/:id', authMiddleware, IntegrationController.update);
router.delete('/:id', authMiddleware, IntegrationController.delete);
router.post('/:id/toggle', authMiddleware, IntegrationController.toggle);
router.get('/:id/qrcode', authMiddleware, IntegrationController.getQRCode);
router.post('/:id/sync-status', authMiddleware, IntegrationController.syncStatus);
router.get('/:id/stats', authMiddleware, IntegrationController.getStats);

export default router;
