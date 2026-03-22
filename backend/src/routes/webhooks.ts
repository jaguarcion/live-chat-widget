import { Router } from 'express';
import { getWebhooks, createWebhook, updateWebhook, deleteWebhook } from '../controllers/webhooks';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/:projectId', getWebhooks);
router.post('/:projectId', createWebhook);
router.put('/:id', updateWebhook);
router.delete('/:id', deleteWebhook);

export default router;
