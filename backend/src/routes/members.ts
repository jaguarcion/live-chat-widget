import { Router } from 'express';
import { addMember, getMembers, updateMemberRole, removeMember } from '../controllers/members';
import { authenticate } from '../middlewares/auth';
import { requireRole } from '../middlewares/requireRole';

const router = Router();

router.use(authenticate);

// All member management requires OWNER or ADMIN role
router.get('/:id/members', getMembers);
router.post('/:id/members', requireRole('OWNER', 'ADMIN'), addMember);
router.patch('/:id/members/:userId', requireRole('OWNER', 'ADMIN'), updateMemberRole);
router.delete('/:id/members/:userId', requireRole('OWNER', 'ADMIN'), removeMember);

export default router;
