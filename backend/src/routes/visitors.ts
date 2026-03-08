import { Router } from 'express';
import { getVisitor, updateVisitorNotes, getVisitorPages } from '../controllers/visitors';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/:id', getVisitor);
router.patch('/:id', updateVisitorNotes);
router.get('/:id/pages', getVisitorPages);

export default router;
