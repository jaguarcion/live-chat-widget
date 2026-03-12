import { Router } from 'express';
import { initWidget, getHistory, sendWidgetMessage, updateVisitorContact } from '../controllers/widget';
import { uploadFile } from '../controllers/upload';

const router = Router();

router.post('/init', initWidget);
router.get('/history/:conversationId', getHistory);
router.post('/message', sendWidgetMessage);
router.post('/visitor', updateVisitorContact);
router.post('/upload', uploadFile);

export default router;

