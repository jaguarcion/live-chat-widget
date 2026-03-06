import { Router } from 'express';
import { getQuickReplies, createQuickReply, updateQuickReply, deleteQuickReply } from '../controllers/quickReplies';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/project/:projectId', getQuickReplies);
router.post('/project/:projectId', createQuickReply);
router.put('/:id', updateQuickReply);
router.delete('/:id', deleteQuickReply);

export default router;
