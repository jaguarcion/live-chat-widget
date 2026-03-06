import { Router } from 'express';
import { initWidget, getHistory } from '../controllers/widget';
import { uploadFile } from '../controllers/upload';

const router = Router();

router.post('/init', initWidget);
router.get('/history/:conversationId', getHistory);
router.post('/upload', uploadFile);

export default router;
