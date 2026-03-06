import { Router } from 'express';
import { getProjectSettings, updateProjectSettings, checkOnlineStatus } from '../controllers/settings';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Public endpoint for widget
router.get('/:projectId/online', checkOnlineStatus as any);

// Protected endpoints for dashboard
router.get('/:projectId', authenticate, getProjectSettings);
router.put('/:projectId', authenticate, updateProjectSettings);

export default router;
