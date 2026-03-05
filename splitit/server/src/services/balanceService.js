import Expense from '../models/Expense.js';
import Settlement from '../models/Settlement.js';

export async function computeGroupBalances(groupId, userId) {
  const expenses = await Expense.find({ group: groupId, isDeleted: false });
  const settlements = await Settlement.find({ group: groupId });
  const result = buildBalances(expenses, settlements);
  result.settledExpenseIds = userId
    ? settlements
        .filter((s) => s.paidBy.toString() === userId.toString() && s.expenseId)
        .map((s) => s.expenseId.toString())
    : [];
  return result;
}

export async function computeFriendBalances(userId, friendId) {
  const expenses = await Expense.find({
    isDeleted: false,
    directWith: { $ne: null },
    $or: [
      { paidBy: userId, directWith: friendId },
      { paidBy: friendId, directWith: userId },
      { directWith: userId, 'splits.user': friendId },
      { directWith: friendId, 'splits.user': userId },
    ],
  });

  // Keep only expenses where both users are actually involved
  const relevant = expenses.filter((exp) => {
    const ids = [exp.paidBy.toString(), ...exp.splits.map((s) => s.user.toString())];
    return ids.includes(userId.toString()) && ids.includes(friendId.toString());
  });

  const settlements = await Settlement.find({
    $or: [
      { paidBy: userId, paidTo: friendId, directWith: { $ne: null } },
      { paidBy: friendId, paidTo: userId, directWith: { $ne: null } },
    ],
  });

  const result = buildBalances(relevant, settlements);
  result.settledExpenseIds = settlements
    .filter((s) => s.paidBy.toString() === userId.toString() && s.expenseId)
    .map((s) => s.expenseId.toString());
  return result;
}

function buildBalances(expenses, settlements) {
  const net = {};
  const ensure = (id) => { if (!net[id]) net[id] = 0; };

  for (const exp of expenses) {
    const payer = exp.paidBy.toString();
    ensure(payer);
    net[payer] += exp.amount;
    for (const split of exp.splits) {
      const debtor = split.user.toString();
      ensure(debtor);
      net[debtor] -= split.amount;
    }
  }

  for (const s of settlements) {
    const from = s.paidBy.toString();
    const to   = s.paidTo.toString();
    ensure(from);
    ensure(to);
    net[from] += s.amount;
    net[to]   -= s.amount;
  }

  return { net, simplified: simplifyDebts(net) };
}

function simplifyDebts(net) {
  const creditors = [];
  const debtors   = [];

  for (const [userId, amount] of Object.entries(net)) {
    const rounded = Math.round(amount * 100) / 100;
    if (rounded > 0.01)  creditors.push({ userId, amount: rounded });
    else if (rounded < -0.01) debtors.push({ userId, amount: -rounded });
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transactions = [];
  let ci = 0, di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci];
    const debt   = debtors[di];
    const settle = Math.min(credit.amount, debt.amount);

    transactions.push({
      from:   debt.userId,
      to:     credit.userId,
      amount: Math.round(settle * 100) / 100,
    });

    credit.amount -= settle;
    debt.amount   -= settle;

    if (credit.amount < 0.01) ci++;
    if (debt.amount   < 0.01) di++;
  }

  return transactions;
}
