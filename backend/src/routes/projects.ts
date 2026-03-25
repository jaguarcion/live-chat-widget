import { Router } from 'express';
import { createProject, getProjects, freezeProject, archiveProject, getProjectDeleteImpact, deleteProject, reassignAdmin, getProjectStats, getAllUsers } from '../controllers/projects';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.post('/', createProject);
router.get('/', getProjects);
router.get('/users/all', getAllUsers);
router.patch('/:projectId/freeze', freezeProject);
router.patch('/:projectId/archive', archiveProject);
router.get('/:projectId/delete-impact', getProjectDeleteImpact);
router.delete('/:projectId', deleteProject);
router.patch('/:projectId/admin', reassignAdmin);
router.get('/:projectId/stats', getProjectStats);

export default router;
