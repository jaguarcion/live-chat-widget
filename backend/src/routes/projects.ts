import { Router } from 'express';
import { createProject, getProjects } from '../controllers/projects';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.post('/', createProject);
router.get('/', getProjects);

export default router;
