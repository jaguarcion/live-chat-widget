import { Router } from 'express';
import { addMember, getMembers, updateMemberRole, removeMember } from '../controllers/members';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

// Project-level permissions are checked inside controller (OWNER/ADMIN/SUPER_ADMIN)
router.get('/:id/members', getMembers);
router.post('/:id/members', addMember);
router.patch('/:id/members/:userId', updateMemberRole);
router.delete('/:id/members/:userId', removeMember);

export default router;
