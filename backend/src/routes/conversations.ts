import { Router } from 'express';
import { getConversations, searchConversations, getConversationMessages, sendMessage, updateConversation, markAsRead } from '../controllers/conversations';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', getConversations);
router.get('/search', searchConversations);
router.get('/:id/messages', getConversationMessages);
router.post('/:id/messages', sendMessage);
router.patch('/:id/read', markAsRead);
router.patch('/:id', updateConversation);

export default router;
