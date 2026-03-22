import { Router } from 'express';
import { uploadOperatorFile } from '../controllers/upload';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/', authenticate, uploadOperatorFile);

export default router;
