import { Router } from 'express';
import { getProjectPresence } from '../controllers/presence';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/:projectId', getProjectPresence);

export default router;
