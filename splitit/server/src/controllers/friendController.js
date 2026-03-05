import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/ApiResponse.js';
import { computeFriendBalances } from '../services/balanceService.js';

export async function getFriends(req, res, next) {
  try {
    const user = await User.findById(req.user._id).populate('friends', 'name email username avatar');
    ok(res, { friends: user.friends });
  } catch (err) {
    next(err);
  }
}

export async function addFriend(req, res, next) {
  try {
    const { identifier } = req.body;
    if (!identifier) throw new ApiError(400, 'Username or email required');

    // Determine if it's an email or username
    const isEmail = identifier.includes('@');
    const query = isEmail
      ? { email: identifier.toLowerCase().trim(), isEmailVerified: true }
      : { username: identifier.toLowerCase().trim(), isEmailVerified: true };

    const friend = await User.findOne(query);
    if (!friend) {
      throw new ApiError(404, isEmail
        ? 'No verified user with that email'
        : 'No verified user with that username');
    }
    if (friend._id.equals(req.user._id)) throw new ApiError(400, 'Cannot add yourself');

    const me = await User.findById(req.user._id);
    if (me.friends.some((f) => f.equals(friend._id))) {
      throw new ApiError(409, 'Already friends');
    }

    // Mutual: add to both sides
    await User.findByIdAndUpdate(req.user._id, { $push: { friends: friend._id } });
    await User.findByIdAndUpdate(friend._id,   { $push: { friends: req.user._id } });

    const populated = await User.findById(req.user._id).populate('friends', 'name email username avatar');
    ok(res, { friends: populated.friends }, 'Friend added');
  } catch (err) {
    next(err);
  }
}

export async function removeFriend(req, res, next) {
  try {
    await User.findByIdAndUpdate(req.user._id,       { $pull: { friends: req.params.userId } });
    await User.findByIdAndUpdate(req.params.userId,  { $pull: { friends: req.user._id } });
    ok(res, {}, 'Friend removed');
  } catch (err) {
    next(err);
  }
}

export async function getFriendBalances(req, res, next) {
  try {
    const { userId } = req.params;
    const me = await User.findById(req.user._id);
    if (!me.friends.some((f) => f.equals(userId))) {
      throw new ApiError(403, 'Not friends');
    }
    const balances = await computeFriendBalances(req.user._id.toString(), userId);
    ok(res, { balances });
  } catch (err) {
    next(err);
  }
}
