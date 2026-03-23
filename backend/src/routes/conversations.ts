import { Router } from 'express';
import { getConversations, searchConversations, getConversationMessages, sendMessage, updateConversation, markAsRead, sendNote, pinConversation } from '../controllers/conversations';
import { authenticate } from '../middlewares/auth';
import { createRateLimit } from '../middlewares/rateLimit';

const router = Router();

const searchLimiter = createRateLimit({
	windowMs: 60 * 1000,
	max: 30,
	message: 'Too many search requests. Please try again later.'
});

router.use(authenticate);

router.get('/', getConversations);
router.get('/search', searchLimiter, searchConversations);
router.get('/:id/messages', getConversationMessages);
router.post('/:id/messages', sendMessage);
router.post('/:id/notes', sendNote);
router.patch('/:id/read', markAsRead);
router.patch('/:id/pin', pinConversation);
router.patch('/:id', updateConversation);

export default router;

