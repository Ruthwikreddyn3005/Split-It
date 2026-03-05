import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getFriends, addFriend, removeFriend, getFriendBalances } from '../controllers/friendController.js';

const router = Router();
router.use(protect);

router.get('/',               getFriends);
router.post('/',              addFriend);
router.delete('/:userId',     removeFriend);
router.get('/:userId/balances', getFriendBalances);

export default router;
