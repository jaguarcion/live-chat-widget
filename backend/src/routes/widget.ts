import { Router } from 'express';
import { initWidget, getHistory, sendWidgetMessage, updateVisitorContact } from '../controllers/widget';
import { uploadFile } from '../controllers/upload';
import { createRateLimit } from '../middlewares/rateLimit';

const router = Router();

const widgetInitLimiter = createRateLimit({
	windowMs: 1 * 60 * 1000,
	max: 30,
	message: 'Too many widget init requests. Please try again later.'
});

const widgetMessageLimiter = createRateLimit({
	windowMs: 1 * 60 * 1000,
	max: 45,
	message: 'Too many widget message requests. Please slow down.'
});

const widgetVisitorLimiter = createRateLimit({
	windowMs: 5 * 60 * 1000,
	max: 30,
	message: 'Too many visitor update requests. Please try again later.'
});

const widgetUploadLimiter = createRateLimit({
	windowMs: 10 * 60 * 1000,
	max: 20,
	message: 'Too many file uploads. Please try again later.'
});

router.post('/init', widgetInitLimiter, initWidget);
router.get('/history/:conversationId', getHistory);
router.post('/message', widgetMessageLimiter, sendWidgetMessage);
router.post('/visitor', widgetVisitorLimiter, updateVisitorContact);
router.post('/upload', widgetUploadLimiter, uploadFile);

export default router;

