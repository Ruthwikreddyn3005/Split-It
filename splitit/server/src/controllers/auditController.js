import AuditLog from '../models/AuditLog.js';
import Group from '../models/Group.js';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/ApiResponse.js';

export async function getAuditLog(req, res, next) {
  try {
    const { groupId, friendId } = req.query;
    if (!groupId && !friendId) throw new ApiError(400, 'groupId or friendId required');

    let filter = {};

    if (groupId) {
      const group = await Group.findById(groupId);
      if (!group) throw new ApiError(404, 'Group not found');
      const isMember = group.members.some((m) => m.user.equals(req.user._id));
      if (!isMember) throw new ApiError(403, 'Not a member');
      filter.group = groupId;
    } else {
      filter.group = null;
      filter.participants = { $all: [req.user._id.toString(), friendId] };
    }

    const logs = await AuditLog.find(filter)
      .populate('performedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(200);

    ok(res, { logs });
  } catch (err) {
    next(err);
  }
}
