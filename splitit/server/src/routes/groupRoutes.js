import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getGroups, createGroup, getGroup, updateGroup,
  archiveGroup, addMember, removeMember, getGroupBalances,
} from '../controllers/groupController.js';

const router = Router();
router.use(protect);

router.get('/', getGroups);
router.post('/', createGroup);
router.get('/:id', getGroup);
router.put('/:id', updateGroup);
router.delete('/:id', archiveGroup);
router.post('/:id/members', addMember);
router.delete('/:id/members/:userId', removeMember);
router.get('/:id/balances', getGroupBalances);

export default router;
