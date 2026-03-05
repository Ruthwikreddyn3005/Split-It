import Group from '../models/Group.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { ok, created } from '../utils/ApiResponse.js';
import { computeGroupBalances } from '../services/balanceService.js';

export async function getGroups(req, res, next) {
  try {
    const groups = await Group.find({
      'members.user': req.user._id,
      isArchived: false,
    })
      .populate('members.user', 'name email avatar')
      .populate('createdBy', 'name email')
      .sort({ updatedAt: -1 });

    ok(res, { groups });
  } catch (err) {
    next(err);
  }
}

export async function createGroup(req, res, next) {
  try {
    const { name, description, icon, currency } = req.body;
    const group = await Group.create({
      name,
      description,
      icon,
      currency,
      createdBy: req.user._id,
      members: [{ user: req.user._id, role: 'admin' }],
    });
    await group.populate('members.user', 'name email avatar');
    created(res, { group });
  } catch (err) {
    next(err);
  }
}

export async function getGroup(req, res, next) {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members.user', 'name email avatar')
      .populate('createdBy', 'name email');

    if (!group) throw new ApiError(404, 'Group not found');

    const isMember = group.members.some((m) => m.user._id.equals(req.user._id));
    if (!isMember) throw new ApiError(403, 'Not a member of this group');

    ok(res, { group });
  } catch (err) {
    next(err);
  }
}

export async function updateGroup(req, res, next) {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) throw new ApiError(404, 'Group not found');

    const member = group.members.find((m) => m.user.equals(req.user._id));
    if (!member || member.role !== 'admin') throw new ApiError(403, 'Admin only');

    const { name, description, icon } = req.body;
    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    if (icon) group.icon = icon;
    await group.save();

    ok(res, { group });
  } catch (err) {
    next(err);
  }
}

export async function archiveGroup(req, res, next) {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) throw new ApiError(404, 'Group not found');

    const member = group.members.find((m) => m.user.equals(req.user._id));
    if (!member || member.role !== 'admin') throw new ApiError(403, 'Admin only');

    group.isArchived = true;
    await group.save();
    ok(res, {}, 'Group archived');
  } catch (err) {
    next(err);
  }
}

export async function addMember(req, res, next) {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) throw new ApiError(404, 'Group not found');

    const admin = group.members.find((m) => m.user.equals(req.user._id));
    if (!admin || admin.role !== 'admin') throw new ApiError(403, 'Admin only');

    const { email } = req.body;
    const newUser = await User.findOne({ email, isEmailVerified: true });
    if (!newUser) throw new ApiError(404, 'No verified user with that email');

    const alreadyMember = group.members.some((m) => m.user.equals(newUser._id));
    if (alreadyMember) throw new ApiError(409, 'User already in this group');

    group.members.push({ user: newUser._id, role: 'member' });
    await group.save();
    await group.populate('members.user', 'name email avatar');

    ok(res, { group });
  } catch (err) {
    next(err);
  }
}

export async function removeMember(req, res, next) {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) throw new ApiError(404, 'Group not found');

    const admin = group.members.find((m) => m.user.equals(req.user._id));
    if (!admin || admin.role !== 'admin') throw new ApiError(403, 'Admin only');

    group.members = group.members.filter((m) => !m.user.equals(req.params.userId));
    await group.save();
    ok(res, {}, 'Member removed');
  } catch (err) {
    next(err);
  }
}

export async function getGroupBalances(req, res, next) {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) throw new ApiError(404, 'Group not found');

    const isMember = group.members.some((m) => m.user.equals(req.user._id));
    if (!isMember) throw new ApiError(403, 'Not a member');

    const balances = await computeGroupBalances(req.params.id, req.user._id.toString());
    ok(res, { balances });
  } catch (err) {
    next(err);
  }
}
