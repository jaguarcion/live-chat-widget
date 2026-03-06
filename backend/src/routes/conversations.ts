import { Router } from 'express';
import { getConversations, getConversationMessages, sendMessage, updateConversation } from '../controllers/conversations';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', getConversations);
router.get('/:id/messages', getConversationMessages);
router.post('/:id/messages', sendMessage);
router.patch('/:id', updateConversation);

export default router;
