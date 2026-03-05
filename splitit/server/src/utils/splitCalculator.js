export function equalSplit(totalAmount, memberIds) {
  const n = memberIds.length;
  const share = Math.round((totalAmount / n) * 100) / 100;
  const splits = memberIds.map((userId) => ({ user: userId, amount: share }));
  const diff = Math.round((totalAmount - share * n) * 100) / 100;
  splits[0].amount = Math.round((splits[0].amount + diff) * 100) / 100;
  return splits;
}

export function exactSplit(totalAmount, entries) {
  const sum = entries.reduce((acc, e) => acc + e.amount, 0);
  if (Math.abs(sum - totalAmount) > 0.01) {
    throw new Error('Exact amounts must sum to total');
  }
  return entries.map((e) => ({ user: e.userId, amount: e.amount }));
}

export function percentageSplit(totalAmount, entries) {
  const totalPct = entries.reduce((acc, e) => acc + e.percentage, 0);
  if (Math.abs(totalPct - 100) > 0.01) {
    throw new Error('Percentages must sum to 100');
  }
  const splits = entries.map((e) => ({
    user: e.userId,
    amount: Math.round((totalAmount * e.percentage) / 100 * 100) / 100,
  }));
  const computed = splits.reduce((acc, s) => acc + s.amount, 0);
  splits[0].amount = Math.round((splits[0].amount + (totalAmount - computed)) * 100) / 100;
  return splits;
}

export function computeSplits(splitType, totalAmount, members) {
  switch (splitType) {
    case 'equal':
      return equalSplit(totalAmount, members.map((m) => m.userId));
    case 'exact':
      return exactSplit(totalAmount, members);
    case 'percentage':
      return percentageSplit(totalAmount, members);
    default:
      throw new Error('Invalid split type');
  }
}
