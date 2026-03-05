import Settlement from '../models/Settlement.js';
import Group from '../models/Group.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { ApiError } from '../utils/ApiError.js';
import { ok, created } from '../utils/ApiResponse.js';

async function logSettlement(action, settlement, performedBy) {
  try {
    const paidById = settlement.paidBy?._id || settlement.paidBy;
    const paidToId = settlement.paidTo?._id || settlement.paidTo;
    await AuditLog.create({
      action,
      group:        settlement.group || null,
      participants: settlement.group ? [] : [String(paidById), String(paidToId)],
      performedBy,
      targetId:     settlement._id,
      meta: {
        description: `${settlement.paidBy?.name || ''} paid ${settlement.paidTo?.name || ''}`,
        amount:      settlement.amount,
        currency:    settlement.currency,
        paidByName:  settlement.paidBy?.name || '',
        memberNames: [settlement.paidTo?.name || ''],
        note:        settlement.note || '',
      },
    });
  } catch { /* never break the main flow */ }
}

export async function getSettlements(req, res, next) {
  try {
    const { groupId, friendId } = req.query;
    if (!groupId && !friendId) throw new ApiError(400, 'groupId or friendId required');

    let filter = {};

    if (groupId) {
      const group = await Group.findById(groupId);
      const isMember = group?.members.some((m) => m.user.equals(req.user._id));
      if (!isMember) throw new ApiError(403, 'Not a member');
      filter.group = groupId;
    } else {
      filter.$or = [
        { paidBy: req.user._id, paidTo: friendId },
        { paidBy: friendId,     paidTo: req.user._id },
      ];
      filter.directWith = { $ne: null };
    }

    const settlements = await Settlement.find(filter)
      .populate('paidBy', 'name email avatar')
      .populate('paidTo', 'name email avatar')
      .populate('expenseId', 'description amount')
      .sort({ date: -1 });

    ok(res, { settlements });
  } catch (err) {
    next(err);
  }
}

export async function createSettlement(req, res, next) {
  try {
    const { groupId, friendId, paidTo, amount, currency, note, date, expenseId } = req.body;
    if (!groupId && !friendId) throw new ApiError(400, 'groupId or friendId required');

    let settlementData = {
      paidBy:    req.user._id,
      paidTo,
      amount,
      note:      note || '',
      date:      date || Date.now(),
      createdBy: req.user._id,
      expenseId: expenseId || null,
    };

    if (groupId) {
      const group = await Group.findById(groupId);
      if (!group) throw new ApiError(404, 'Group not found');
      const isMember = group.members.some((m) => m.user.equals(req.user._id));
      if (!isMember) throw new ApiError(403, 'Not a member');
      settlementData.group    = groupId;
      settlementData.currency = currency || group.currency;
    } else {
      const me = await User.findById(req.user._id);
      if (!me.friends.some((f) => f.equals(friendId))) throw new ApiError(403, 'Not friends');
      settlementData.directWith = friendId;
      settlementData.currency   = currency || 'USD';
    }

    const settlement = await Settlement.create(settlementData);
    await settlement.populate('paidBy', 'name email avatar');
    await settlement.populate('paidTo', 'name email avatar');

    await logSettlement('settlement_added', settlement, req.user._id);
    created(res, { settlement });
  } catch (err) {
    next(err);
  }
}

export async function deleteSettlement(req, res, next) {
  try {
    const settlement = await Settlement.findById(req.params.id)
      .populate('paidBy', 'name email')
      .populate('paidTo', 'name email');
    if (!settlement) throw new ApiError(404, 'Settlement not found');
    if (!settlement.createdBy.equals(req.user._id)) throw new ApiError(403, 'No permission');
    await logSettlement('settlement_deleted', settlement, req.user._id);
    await settlement.deleteOne();
    ok(res, {}, 'Settlement removed');
  } catch (err) {
    next(err);
  }
}
