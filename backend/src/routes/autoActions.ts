import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { getAutoActions, getAutoActionTriggers, updateAutoActions } from '../controllers/autoActions';

const router = Router();

router.use(authenticate);
router.get('/:projectId', getAutoActions);
router.get('/:projectId/triggers', getAutoActionTriggers);
router.put('/:projectId', updateAutoActions);

export default router;
