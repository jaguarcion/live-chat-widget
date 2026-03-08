import { Router } from 'express';
import { initWidget, getHistory, sendWidgetMessage } from '../controllers/widget';
import { uploadFile } from '../controllers/upload';

const router = Router();

router.post('/init', initWidget);
router.get('/history/:conversationId', getHistory);
router.post('/message', sendWidgetMessage);
router.post('/upload', uploadFile);

export default router;

