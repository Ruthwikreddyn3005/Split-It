import Expense from '../models/Expense.js';
import Settlement from '../models/Settlement.js';
import Group from '../models/Group.js';
import AuditLog from '../models/AuditLog.js';
import { ApiError } from '../utils/ApiError.js';
import { ok, created } from '../utils/ApiResponse.js';
import { computeSplits } from '../utils/splitCalculator.js';

async function logExpense(action, expense, performedBy) {
  try {
    const allIds = [expense.paidBy?._id || expense.paidBy, ...expense.splits.map((s) => s.user?._id || s.user)];
    await AuditLog.create({
      action,
      group:        expense.group || null,
      participants: expense.group ? [] : [...new Set(allIds.map(String))],
      performedBy,
      targetId:     expense._id,
      meta: {
        description: expense.description,
        amount:      expense.amount,
        currency:    expense.currency,
        paidByName:  expense.paidBy?.name || '',
        memberNames: expense.splits?.map((s) => s.user?.name || '') || [],
      },
    });
  } catch { /* never break the main flow */ }
}

export async function getExpenses(req, res, next) {
  try {
    const { groupId, friendId } = req.query;

    if (!groupId && !friendId) throw new ApiError(400, 'groupId or friendId required');

    let filter = { isDeleted: false };

    if (groupId) {
      const group = await Group.findById(groupId);
      if (!group) throw new ApiError(404, 'Group not found');
      const isMember = group.members.some((m) => m.user.equals(req.user._id));
      if (!isMember) throw new ApiError(403, 'Not a member');
      filter.group = groupId;
    } else {
      // Direct friend expenses — both users must be involved
      filter.directWith = { $ne: null };
      filter.$or = [
        { paidBy: req.user._id, directWith: friendId },
        { paidBy: friendId,     directWith: req.user._id },
        { directWith: req.user._id, 'splits.user': friendId },
        { directWith: friendId,     'splits.user': req.user._id },
      ];
    }

    const expenses = await Expense.find(filter)
      .populate('paidBy', 'name email avatar')
      .populate('splits.user', 'name email avatar')
      .populate('createdBy', 'name email')
      .sort({ date: -1 });

    // For friend expenses, keep only those where both users are involved
    const result = friendId
      ? expenses.filter((exp) => {
          const ids = [exp.paidBy._id.toString(), ...exp.splits.map((s) => s.user._id.toString())];
          return ids.includes(req.user._id.toString()) && ids.includes(friendId);
        })
      : expenses;

    ok(res, { expenses: result });
  } catch (err) {
    next(err);
  }
}

export async function createExpense(req, res, next) {
  try {
    const { groupId, friendId, description, amount, currency, paidBy,
            splitType, members, date, category, notes } = req.body;

    if (!groupId && !friendId) throw new ApiError(400, 'groupId or friendId required');

    let expenseData = {
      description, amount,
      currency,
      paidBy,
      splitType: splitType || 'equal',
      date: date || Date.now(),
      category: category || 'general',
      notes: notes || '',
      createdBy: req.user._id,
    };

    if (groupId) {
      const group = await Group.findById(groupId);
      if (!group) throw new ApiError(404, 'Group not found');
      const isMember = group.members.some((m) => m.user.equals(req.user._id));
      if (!isMember) throw new ApiError(403, 'Not a member');
      expenseData.group = groupId;
      expenseData.currency = currency || group.currency;
    } else {
      expenseData.directWith = friendId;
      expenseData.group = null;
    }

    let splits;
    if ((splitType || 'equal') === 'equal') {
      splits = computeSplits('equal', amount, members.map((id) => ({ userId: id })));
    } else {
      splits = computeSplits(splitType, amount, members);
    }

    const expense = await Expense.create({ ...expenseData, splits });
    await expense.populate('paidBy', 'name email avatar');
    await expense.populate('splits.user', 'name email avatar');

    await logExpense('expense_added', expense, req.user._id);
    created(res, { expense });
  } catch (err) {
    next(err);
  }
}

export async function getExpense(req, res, next) {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, isDeleted: false })
      .populate('paidBy', 'name email avatar')
      .populate('splits.user', 'name email avatar')
      .populate('createdBy', 'name email');

    if (!expense) throw new ApiError(404, 'Expense not found');

    // Permission check
    if (expense.group) {
      const group = await Group.findById(expense.group);
      const isMember = group?.members.some((m) => m.user.equals(req.user._id));
      if (!isMember) throw new ApiError(403, 'Not a member');
    } else {
      const involved = [expense.paidBy._id.toString(), ...expense.splits.map((s) => s.user._id.toString())];
      if (!involved.includes(req.user._id.toString())) throw new ApiError(403, 'Not involved');
    }

    ok(res, { expense });
  } catch (err) {
    next(err);
  }
}

export async function updateExpense(req, res, next) {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, isDeleted: false });
    if (!expense) throw new ApiError(404, 'Expense not found');

    let canEdit = expense.createdBy.equals(req.user._id);
    if (!canEdit && expense.group) {
      const group = await Group.findById(expense.group);
      const member = group?.members.find((m) => m.user.equals(req.user._id));
      canEdit = member?.role === 'admin';
    }
    if (!canEdit) throw new ApiError(403, 'No permission to edit');

    const { description, amount, currency, paidBy, splitType, members, date, category, notes } = req.body;

    if (amount && splitType && members) {
      let splits;
      if (splitType === 'equal') {
        splits = computeSplits('equal', amount, members.map((id) => ({ userId: id })));
      } else {
        splits = computeSplits(splitType, amount, members);
      }
      expense.splits = splits;
    }

    if (description) expense.description = description;
    if (amount)      expense.amount = amount;
    if (currency)    expense.currency = currency;
    if (paidBy)      expense.paidBy = paidBy;
    if (splitType)   expense.splitType = splitType;
    if (date)        expense.date = date;
    if (category)    expense.category = category;
    if (notes !== undefined) expense.notes = notes;

    await expense.save();
    await expense.populate('paidBy', 'name email avatar');
    await expense.populate('splits.user', 'name email avatar');

    await logExpense('expense_edited', expense, req.user._id);
    ok(res, { expense });
  } catch (err) {
    next(err);
  }
}

export async function getActivity(req, res, next) {
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
      filter.directWith = { $ne: null };
      filter.$or = [
        { paidBy: req.user._id, directWith: friendId },
        { paidBy: friendId,     directWith: req.user._id },
        { directWith: req.user._id, 'splits.user': friendId },
        { directWith: friendId,     'splits.user': req.user._id },
      ];
    }

    const expenses = await Expense.find(filter)
      .populate('paidBy', 'name email')
      .populate('splits.user', 'name email')
      .populate('createdBy', 'name email')
      .sort({ updatedAt: -1 })
      .limit(100);

    const result = friendId
      ? expenses.filter((exp) => {
          const ids = [exp.paidBy._id.toString(), ...exp.splits.map((s) => s.user._id.toString())];
          return ids.includes(req.user._id.toString()) && ids.includes(friendId);
        })
      : expenses;

    ok(res, { expenses: result });
  } catch (err) {
    next(err);
  }
}

export async function deleteExpense(req, res, next) {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, isDeleted: false });
    if (!expense) throw new ApiError(404, 'Expense not found');

    let canDelete = false;
    if (expense.group) {
      const group = await Group.findById(expense.group);
      canDelete = group?.members.some((m) => m.user.equals(req.user._id));
    } else {
      // Direct expenses: either participant can delete
      const involved = [expense.paidBy.toString(), ...expense.splits.map((s) => s.user.toString())];
      canDelete = involved.includes(req.user._id.toString());
    }
    if (!canDelete) throw new ApiError(403, 'No permission to delete');

    expense.isDeleted = true;
    await expense.save();
    // Remove any settlements linked to this expense so they don't skew balances
    await Settlement.deleteMany({ expenseId: expense._id });
    await expense.populate('paidBy', 'name email');
    await expense.populate('splits.user', 'name email');
    await logExpense('expense_deleted', expense, req.user._id);
    ok(res, {}, 'Expense deleted');
  } catch (err) {
    next(err);
  }
}
