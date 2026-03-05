import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { groupApi } from '../../api/groupApi.js';
import { expenseApi } from '../../api/expenseApi.js';
import { settlementApi } from '../../api/settlementApi.js';
import { friendApi } from '../../api/friendApi.js';
import { userApi } from '../../api/userApi.js';
import { auditApi } from '../../api/auditApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { formatCurrency, formatDate, initials, extractError } from '../../utils/formatters.js';
import { equalSplit, exactSplit, percentageSplit } from '../../utils/splitCalculator.js';
import AppLayout from '../../components/layout/AppLayout.jsx';

export default function GroupDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState(null);

  const [tab, setTab] = useState('expenses');
  const [loading, setLoading] = useState(true);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleTarget, setSettleTarget] = useState(null);
  const [editExpense, setEditExpense] = useState(null);
  const [settledMap, setSettledMap] = useState(new Map()); // expenseId → settlementId

  const fetchAll = async () => {
    try {
      const [groupRes, expRes, balRes] = await Promise.all([
        groupApi.getGroup(id),
        expenseApi.getExpenses(id),
        groupApi.getBalances(id),
      ]);
      setGroup(groupRes.data.data.group);
      setExpenses(expRes.data.data.expenses);
      setBalances(balRes.data.data.balances);
    } catch (err) {
      showToast(extractError(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [id]);

  const isAdmin = group?.members.find((m) => m.user._id === user?._id)?.role === 'admin';

  if (loading) return <AppLayout><div className="loading-center"><div className="spinner" /></div></AppLayout>;
  if (!group) return <AppLayout><p>Group not found.</p></AppLayout>;

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">{group.name}</h1>
          <p className="page-subtitle">{group.description || `${group.members.length} members · ${group.currency}`}</p>
        </div>
        {tab === 'expenses' && (
          <button className="btn btn-primary" onClick={() => setShowExpenseModal(true)}>+ Add Expense</button>
        )}
        {tab === 'members' && isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowMemberModal(true)}>+ Add Member</button>
        )}
      </div>

      <div className="tabs">
        {['expenses', 'balances', 'history', 'members', 'activity'].map((t) => (
          <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'expenses' && (
        <ExpensesTab expenses={expenses} group={group} user={user} balances={balances}
          settledMap={settledMap}
          onEdit={(exp) => setEditExpense(exp)}
          onSettle={(t) => { setSettleTarget(t); setShowSettleModal(true); }}
          onDelete={async (eid) => {
            try {
              await expenseApi.deleteExpense(eid);
              showToast('Expense deleted', 'success');
              await fetchAll();
            } catch (err) {
              showToast(extractError(err), 'error');
            }
          }} />
      )}

      {tab === 'balances' && (
        <BalancesTab balances={balances} group={group} user={user}
          onSettle={(t) => { setSettleTarget(t); setShowSettleModal(true); }} />
      )}

      {tab === 'members' && (
        <MembersTab members={group.members} isAdmin={isAdmin} user={user}
          onRemove={async (uid) => {
            await groupApi.removeMember(id, uid);
            showToast('Member removed', 'success');
            fetchAll();
          }} />
      )}

      {tab === 'history' && (
        <GroupSettlementHistory
          groupId={id} group={group} user={user}
          onRefresh={async (deletedExpenseId) => {
            if (deletedExpenseId) {
              setSettledMap((prev) => { const m = new Map(prev); m.delete(deletedExpenseId); return m; });
            } else {
              setSettledMap(new Map());
            }
            await fetchAll();
          }}
        />
      )}

      {tab === 'activity' && <ActivityTab groupId={id} user={user} />}

      {showExpenseModal && (
        <AddExpenseModal
          group={group}
          onClose={() => setShowExpenseModal(false)}
          onSave={async (data) => {
            await expenseApi.createExpense({ ...data, groupId: id });
            showToast('Expense added!', 'success');
            setShowExpenseModal(false);
            fetchAll();
          }}
        />
      )}

      {showMemberModal && (
        <AddMemberModal
          group={group}
          onClose={() => setShowMemberModal(false)}
          onSave={async (email) => {
            await groupApi.addMember(id, email);
            showToast('Member added!', 'success');
            setShowMemberModal(false);
            fetchAll();
          }}
        />
      )}

      {showSettleModal && settleTarget && (
        <SettleUpModal
          target={settleTarget}
          group={group}
          onClose={() => { setShowSettleModal(false); setSettleTarget(null); }}
          onSave={async (data) => {
            await settlementApi.createSettlement({ ...data, groupId: id, expenseId: settleTarget.expenseId || null });
            showToast('Settlement recorded!', 'success');
            if (settleTarget.expenseId) {
              setSettledMap((prev) => new Map([...prev, [settleTarget.expenseId, true]]));
            }
            setShowSettleModal(false);
            setSettleTarget(null);
            await fetchAll();
          }}
        />
      )}

      {editExpense && (
        <EditExpenseModal
          expense={editExpense}
          group={group}
          onClose={() => setEditExpense(null)}
          onSave={async (data) => {
            await expenseApi.updateExpense(editExpense._id, data);
            showToast('Expense updated!', 'success');
            setEditExpense(null);
            fetchAll();
          }}
        />
      )}
    </AppLayout>
  );
}

function ExpensesTab({ expenses, group, user, balances, settledMap, onEdit, onSettle, onDelete }) {
  if (!expenses.length) {
    return (
      <div className="card">
        <div className="empty-state">
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🧾</div>
          <h3>No expenses yet</h3>
          <p>Add an expense to track who owes what.</p>
        </div>
      </div>
    );
  }

  const iStillOwe = (balances?.net?.[user?._id] || 0) < 0;
  const serverSettledIds = new Set(balances?.settledExpenseIds || []);

  return (
    <div className="card">
      {expenses.map((exp) => {
        const myShare = exp.splits.find((s) => s.user._id === user?._id)?.amount || 0;
        const iPaid = exp.paidBy._id === user?._id;
        return (
          <div key={exp._id} className="list-item">
            <div className="avatar" style={{ background: 'var(--accent-light)', color: 'var(--accent)', fontSize: '1rem' }}>
              💳
            </div>
            <div className="list-item-info">
              <div className="list-item-title">{exp.description}</div>
              <div className="list-item-sub">
                {formatDate(exp.date)} · Paid by {iPaid ? 'you' : exp.paidBy.name}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 600 }}>{formatCurrency(exp.amount, group.currency)}</div>
              {(() => {
                const isExpSettled = serverSettledIds.has(exp._id) || settledMap.has(exp._id) || !iStillOwe;
                return (
                  <div style={{ fontSize: '0.8125rem', color: iPaid ? 'var(--success)' : isExpSettled ? 'var(--success)' : 'var(--danger)' }}>
                    {iPaid
                      ? `you lent ${formatCurrency(exp.amount - myShare, group.currency)}`
                      : isExpSettled
                        ? `you settled ${formatCurrency(myShare, group.currency)}`
                        : `you owe ${formatCurrency(myShare, group.currency)}`}
                  </div>
                );
              })()}
            </div>
            {!iPaid && myShare > 0.01 && iStillOwe && !serverSettledIds.has(exp._id) && !settledMap.has(exp._id) && (
              <button className="btn btn-primary btn-sm" title="Settle this expense"
                onClick={() => onSettle({ to: exp.paidBy._id, amount: myShare, expenseId: exp._id })}>
                Settle
              </button>
            )}
            <button className="btn btn-ghost btn-icon" title="Edit" onClick={() => onEdit(exp)}>✎</button>
            <button className="btn btn-ghost btn-icon" title="Delete"
              onClick={() => onDelete(exp._id)} style={{ color: 'var(--danger)' }}>
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}

function BalancesTab({ balances, group, user, onSettle }) {
  if (!balances) return <div className="loading-center"><div className="spinner" /></div>;

  const { simplified } = balances;

  const userNet = balances.net[user?._id] || 0;
  const myTransactions = simplified.filter(
    (t) => t.from === user?._id || t.to === user?._id
  );

  const memberMap = {};
  group.members.forEach((m) => { memberMap[m.user._id] = m.user; });

  return (
    <div>
      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-label">You are owed</div>
          <div className={`stat-value ${userNet > 0 ? 'green' : 'red'}`}>
            {formatCurrency(Math.abs(userNet), group.currency)}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {userNet > 0 ? 'you lent more than you borrowed' : userNet < 0 ? 'you owe money' : 'you are settled up'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Suggested settlements</div>
          <div className="stat-value purple">{simplified.length}</div>
        </div>
      </div>

      {myTransactions.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
            <h3>All settled up!</h3>
            <p>No outstanding balances for you in this group.</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Your settlements</h3>
          {myTransactions.map((t, i) => {
            const isDebtor = t.from === user?._id;
            const other = memberMap[isDebtor ? t.to : t.from];
            return (
              <div key={i} className="list-item">
                <div className="avatar">{initials(other?.name)}</div>
                <div className="list-item-info">
                  <div className="list-item-title">
                    {isDebtor ? `You owe ${other?.name}` : `${other?.name} owes you`}
                  </div>
                  <div className="list-item-sub">{formatCurrency(t.amount, group.currency)}</div>
                </div>
                {isDebtor && (
                  <button className="btn btn-primary btn-sm" onClick={() => onSettle(t)}>
                    Settle up
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MembersTab({ members, isAdmin, user, onRemove }) {
  return (
    <div className="card">
      {members.map((m) => (
        <div key={m.user._id} className="list-item">
          <div className="avatar">{initials(m.user.name)}</div>
          <div className="list-item-info">
            <div className="list-item-title">
              {m.user.name} {m.user._id === user?._id && <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>(you)</span>}
            </div>
            <div className="list-item-sub">{m.user.email}</div>
          </div>
          <span className={`badge ${m.role === 'admin' ? 'badge-purple' : 'badge-yellow'}`}>{m.role}</span>
          {isAdmin && m.user._id !== user?._id && (
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}
              onClick={() => onRemove(m.user._id)}>Remove</button>
          )}
        </div>
      ))}
    </div>
  );
}

function GroupSettlementHistory({ groupId, group, user, onRefresh }) {
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    settlementApi.getSettlements(groupId, null)
      .then((r) => setSettlements(r.data.data.settlements))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [groupId]);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  if (!settlements.length) return (
    <div className="card">
      <div className="empty-state">
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
        <h3>No settlements yet</h3>
        <p>Payments recorded in this group will appear here.</p>
      </div>
    </div>
  );

  return (
    <div className="card">
      {settlements.map((s) => {
        const iSent = s.paidBy._id === user?._id;
        return (
          <div key={s._id} className="list-item">
            <div className="avatar" style={{
              background: iSent ? 'var(--success-light)' : 'var(--warning-light)',
              color: iSent ? 'var(--success)' : 'var(--warning)', fontSize: '1rem',
            }}>
              {iSent ? '↑' : '↓'}
            </div>
            <div className="list-item-info">
              <div className="list-item-title">
                {iSent ? `You paid ${s.paidTo.name}` : `${s.paidBy.name} paid you`}
                {s.expenseId && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.4rem' }}>
                    · for "{s.expenseId.description}"
                  </span>
                )}
              </div>
              <div className="list-item-sub">
                {formatDate(s.date)}{s.note ? ` · ${s.note}` : ''}
              </div>
            </div>
            <div style={{ fontWeight: 600, color: iSent ? 'var(--success)' : 'var(--warning)' }}>
              {formatCurrency(s.amount, group.currency)}
            </div>
            {s.paidBy._id === user?._id && (
              <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)' }}
                onClick={async () => {
                  try {
                    await settlementApi.deleteSettlement(s._id);
                    setSettlements((prev) => prev.filter((x) => x._id !== s._id));
                    showToast('Settlement removed', 'success');
                    await onRefresh(s.expenseId?._id || null);
                  } catch (err) {
                    showToast(extractError(err), 'error');
                  }
                }}>✕</button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AuditFeed({ logs, user }) {
  const CONFIG = {
    expense_added:       { color: 'var(--success)',  icon: '＋', label: 'Added',     strike: false },
    expense_edited:      { color: 'var(--warning)',  icon: '✎',  label: 'Edited',    strike: false },
    expense_deleted:     { color: 'var(--danger)',   icon: '✕',  label: 'Deleted',   strike: true  },
    settlement_added:    { color: 'var(--accent)',   icon: '✓',  label: 'Settled',   strike: false },
    settlement_deleted:  { color: 'var(--text-muted)', icon: '↩', label: 'Undone',  strike: true  },
  };

  return (
    <div className="card">
      {logs.map((log) => {
        const cfg = CONFIG[log.action] || { color: 'var(--text-muted)', icon: '·', label: log.action, strike: false };
        const byMe = log.performedBy?._id === user?._id || log.performedBy === user?._id;
        // const members = log.meta.memberNames used for future display

        return (
          <div key={log._id} className="list-item" style={{ alignItems: 'flex-start', gap: '0.75rem' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0, marginTop: 2,
              background: cfg.color + '20', color: cfg.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1rem',
            }}>
              {cfg.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{
                  fontWeight: 600,
                  textDecoration: cfg.strike ? 'line-through' : 'none',
                  color: cfg.strike ? 'var(--text-muted)' : 'var(--text-primary)',
                }}>
                  {log.meta.description}
                </span>
                <span style={{
                  fontSize: '0.75rem', fontWeight: 600, padding: '0.125rem 0.5rem',
                  borderRadius: 999, background: cfg.color + '20', color: cfg.color,
                }}>
                  {cfg.label}
                </span>
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                {formatCurrency(log.meta.amount, log.meta.currency)}
                {log.meta.paidByName ? ` · paid by ${log.meta.paidByName}` : ''}
                {log.meta.note ? ` · ${log.meta.note}` : ''}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                by {byMe ? 'you' : log.performedBy?.name} · {formatDate(log.createdAt)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActivityTab({ groupId, user }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auditApi.getLog(groupId, null)
      .then((r) => setLogs(r.data.data.logs))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [groupId]);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  if (!logs.length) return (
    <div className="card">
      <div className="empty-state">
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
        <h3>No activity yet</h3>
        <p>Every expense and settlement action will be recorded here permanently.</p>
      </div>
    </div>
  );

  return <AuditFeed logs={logs} user={user} />;
}

function AddExpenseModal({ group, onClose, onSave }) {
  const [form, setForm] = useState({
    description: '', amount: '', paidBy: '', splitType: 'equal',
    category: 'general', notes: '',
  });
  const [memberSplits, setMemberSplits] = useState(
    group.members.map((m) => ({ userId: m.user._id, name: m.user.name, amount: '', percentage: '' }))
  );
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const total = parseFloat(form.amount) || 0;

  const preview = () => {
    if (!total) return [];
    try {
      if (form.splitType === 'equal') return equalSplit(total, memberSplits.map((m) => m.userId));
      if (form.splitType === 'exact') return exactSplit(memberSplits.map((m) => ({ userId: m.userId, amount: parseFloat(m.amount) || 0 })));
      if (form.splitType === 'percentage') return percentageSplit(total, memberSplits.map((m) => ({ userId: m.userId, percentage: parseFloat(m.percentage) || 0 })));
    } catch { return []; }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.paidBy) return showToast('Select who paid', 'error');
    setSaving(true);
    try {
      const splits = preview();
      if (!splits.length) throw new Error('Invalid split data');

      let members;
      if (form.splitType === 'equal') {
        members = memberSplits.map((m) => m.userId);
      } else if (form.splitType === 'exact') {
        members = memberSplits.map((m) => ({ userId: m.userId, amount: parseFloat(m.amount) }));
      } else {
        members = memberSplits.map((m) => ({ userId: m.userId, percentage: parseFloat(m.percentage) }));
      }

      await onSave({
        description: form.description,
        amount: total,
        paidBy: form.paidBy,
        splitType: form.splitType,
        members,
        category: form.category,
        notes: form.notes,
      });
    } catch (err) {
      showToast(extractError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const splitPreview = preview();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add Expense</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Description *</label>
            <input type="text" className="form-input" placeholder="e.g. Dinner at restaurant"
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Amount *</label>
              <input type="number" className="form-input" placeholder="0.00" step="0.01" min="0.01"
                value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Paid by *</label>
              <select className="form-input" value={form.paidBy}
                onChange={(e) => setForm({ ...form, paidBy: e.target.value })} required>
                <option value="">Select person</option>
                {group.members.map((m) => (
                  <option key={m.user._id} value={m.user._id}>{m.user.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Split type</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['equal', 'exact', 'percentage'].map((t) => (
                <button key={t} type="button"
                  className={`btn btn-sm ${form.splitType === t ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setForm({ ...form, splitType: t })}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {form.splitType !== 'equal' && (
            <div className="form-group">
              <label className="form-label">
                {form.splitType === 'exact' ? 'Amounts per person' : 'Percentages per person'}
              </label>
              {memberSplits.map((m, i) => (
                <div key={m.userId} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ flex: 1, fontSize: '0.875rem' }}>{m.name}</span>
                  <input type="number" className="form-input" style={{ width: '120px' }}
                    placeholder={form.splitType === 'exact' ? '0.00' : '%'} step="0.01" min="0"
                    value={form.splitType === 'exact' ? m.amount : m.percentage}
                    onChange={(e) => {
                      const updated = [...memberSplits];
                      if (form.splitType === 'exact') updated[i].amount = e.target.value;
                      else updated[i].percentage = e.target.value;
                      setMemberSplits(updated);
                    }} />
                </div>
              ))}
            </div>
          )}

          {total > 0 && splitPreview.length > 0 && (
            <div style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', padding: '0.875rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Split preview</div>
              {splitPreview.map((s) => {
                const member = group.members.find((m) => m.user._id === s.userId || m.user._id === s.user);
                return (
                  <div key={s.userId || s.user} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                    <span>{member?.user.name}</span>
                    <strong>{formatCurrency(s.amount, group.currency)}</strong>
                  </div>
                );
              })}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-input" value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {['general', 'food', 'transport', 'accommodation', 'entertainment', 'utilities', 'shopping', 'health'].map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input type="text" className="form-input" placeholder="Optional note"
              value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner spinner-sm" /> : 'Add expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddMemberModal({ group, onClose, onSave }) {
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const { showToast } = useToast();
  const searchTimer = useRef(null);

  const existingIds = new Set(group.members.map((m) => m.user._id));

  useEffect(() => {
    friendApi.getFriends()
      .then((res) => setFriends(res.data.data.friends.filter((f) => !existingIds.has(f._id))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await userApi.searchUsers(searchQuery.trim());
        setSearchResults(res.data.data.users.filter((u) => !existingIds.has(u._id)));
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 350);
  }, [searchQuery]);

  const handleAdd = async (user) => {
    setSavingId(user._id);
    try {
      await onSave(user.email);
    } catch (err) {
      showToast(extractError(err), 'error');
      setSavingId(null);
    }
  };

  const displayList = searchQuery.trim() ? searchResults : friends;
  const showingSearch = !!searchQuery.trim();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add Member</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="form-group">
          <label className="form-label">Search by username or email</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. john or john@example.com"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        {!showingSearch && friends.length > 0 && (
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Your Friends
          </div>
        )}

        <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {searching && (
            <div style={{ textAlign: 'center', padding: '1rem' }}><div className="spinner" /></div>
          )}

          {!searching && displayList.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem', fontSize: '0.875rem' }}>
              {showingSearch ? 'No users found.' : 'No friends to add — all are already in the group or you have no friends yet.'}
            </p>
          )}

          {!searching && displayList.map((u) => (
            <div key={u._id} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.625rem 0.75rem', borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-primary)',
            }}>
              <div className="avatar avatar-sm">{initials(u.name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: '0.9375rem' }}>{u.name}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.username ? `@${u.username}` : ''}{u.username && u.email ? ' · ' : ''}{u.email}
                </div>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleAdd(u)}
                disabled={savingId === u._id}
              >
                {savingId === u._id ? <span className="spinner spinner-sm" /> : 'Add'}
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

function EditExpenseModal({ expense, group, onClose, onSave }) {
  const [form, setForm] = useState({
    description: expense.description,
    amount: String(expense.amount),
    paidBy: expense.paidBy._id,
    splitType: expense.splitType,
    category: expense.category || 'general',
    notes: expense.notes || '',
  });
  const [memberSplits, setMemberSplits] = useState(
    group.members.map((m) => {
      const existing = expense.splits.find((s) => s.user._id === m.user._id);
      return { userId: m.user._id, name: m.user.name, amount: existing ? String(existing.amount) : '', percentage: '' };
    })
  );
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const total = parseFloat(form.amount) || 0;

  const preview = () => {
    if (!total) return [];
    try {
      if (form.splitType === 'equal') return equalSplit(total, memberSplits.map((m) => m.userId));
      if (form.splitType === 'exact') return exactSplit(memberSplits.map((m) => ({ userId: m.userId, amount: parseFloat(m.amount) || 0 })));
      if (form.splitType === 'percentage') return percentageSplit(total, memberSplits.map((m) => ({ userId: m.userId, percentage: parseFloat(m.percentage) || 0 })));
    } catch { return []; }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let members;
      if (form.splitType === 'equal') {
        members = memberSplits.map((m) => m.userId);
      } else if (form.splitType === 'exact') {
        members = memberSplits.map((m) => ({ userId: m.userId, amount: parseFloat(m.amount) }));
      } else {
        members = memberSplits.map((m) => ({ userId: m.userId, percentage: parseFloat(m.percentage) }));
      }
      await onSave({ description: form.description, amount: total, paidBy: form.paidBy, splitType: form.splitType, members, category: form.category, notes: form.notes });
    } catch (err) {
      showToast(extractError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const splitPreview = preview();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Edit Expense</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Description *</label>
            <input type="text" className="form-input" placeholder="e.g. Dinner at restaurant"
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Amount *</label>
              <input type="number" className="form-input" placeholder="0.00" step="0.01" min="0.01"
                value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Paid by *</label>
              <select className="form-input" value={form.paidBy}
                onChange={(e) => setForm({ ...form, paidBy: e.target.value })} required>
                {group.members.map((m) => (
                  <option key={m.user._id} value={m.user._id}>{m.user.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Split type</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['equal', 'exact', 'percentage'].map((t) => (
                <button key={t} type="button"
                  className={`btn btn-sm ${form.splitType === t ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setForm({ ...form, splitType: t })}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {form.splitType !== 'equal' && (
            <div className="form-group">
              <label className="form-label">
                {form.splitType === 'exact' ? 'Amounts per person' : 'Percentages per person'}
              </label>
              {memberSplits.map((m, i) => (
                <div key={m.userId} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ flex: 1, fontSize: '0.875rem' }}>{m.name}</span>
                  <input type="number" className="form-input" style={{ width: '120px' }}
                    placeholder={form.splitType === 'exact' ? '0.00' : '%'} step="0.01" min="0"
                    value={form.splitType === 'exact' ? m.amount : m.percentage}
                    onChange={(e) => {
                      const updated = [...memberSplits];
                      if (form.splitType === 'exact') updated[i].amount = e.target.value;
                      else updated[i].percentage = e.target.value;
                      setMemberSplits(updated);
                    }} />
                </div>
              ))}
            </div>
          )}

          {total > 0 && splitPreview.length > 0 && (
            <div style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', padding: '0.875rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Split preview</div>
              {splitPreview.map((s) => {
                const member = group.members.find((m) => m.user._id === s.userId || m.user._id === s.user);
                return (
                  <div key={s.userId || s.user} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                    <span>{member?.user.name}</span>
                    <strong>{formatCurrency(s.amount, group.currency)}</strong>
                  </div>
                );
              })}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-input" value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {['general', 'food', 'transport', 'accommodation', 'entertainment', 'utilities', 'shopping', 'health'].map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input type="text" className="form-input" placeholder="Optional note"
              value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner spinner-sm" /> : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SettleUpModal({ target, group, onClose, onSave }) {
  const [amount, setAmount] = useState(target.amount.toFixed(2));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const memberMap = {};
  group.members.forEach((m) => { memberMap[m.user._id] = m.user; });
  const receiver = memberMap[target.to];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ paidTo: target.to, amount: parseFloat(amount), note });
    } catch (err) {
      showToast(extractError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Settle Up</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <p style={{ marginBottom: '1.25rem', color: 'var(--text-secondary)' }}>
            Record a payment to <strong>{receiver?.name}</strong>
          </p>
          <div className="form-group">
            <label className="form-label">Amount</label>
            <input type="number" className="form-input" step="0.01" min="0.01"
              value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Note (optional)</label>
            <input type="text" className="form-input" placeholder="e.g. Via bank transfer"
              value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner spinner-sm" /> : 'Record payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
