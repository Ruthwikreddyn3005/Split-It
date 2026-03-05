export function equalSplit(totalAmount, memberIds) {
  const n = memberIds.length;
  const share = Math.round((totalAmount / n) * 100) / 100;
  const splits = memberIds.map((userId) => ({ userId, amount: share }));
  const diff = Math.round((totalAmount - share * n) * 100) / 100;
  splits[0].amount = Math.round((splits[0].amount + diff) * 100) / 100;
  return splits;
}

export function exactSplit(entries) {
  return entries.map((e) => ({ userId: e.userId, amount: e.amount }));
}

export function percentageSplit(totalAmount, entries) {
  const splits = entries.map((e) => ({
    userId: e.userId,
    amount: Math.round((totalAmount * e.percentage) / 100 * 100) / 100,
    percentage: e.percentage,
  }));
  const computed = splits.reduce((acc, s) => acc + s.amount, 0);
  splits[0].amount = Math.round((splits[0].amount + (totalAmount - computed)) * 100) / 100;
  return splits;
}
