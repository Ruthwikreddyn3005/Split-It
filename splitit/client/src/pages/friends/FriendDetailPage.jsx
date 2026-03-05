import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { friendApi } from '../../api/friendApi.js';
import { expenseApi } from '../../api/expenseApi.js';
import { settlementApi } from '../../api/settlementApi.js';
import { auditApi } from '../../api/auditApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { formatCurrency, formatDate, initials, extractError } from '../../utils/formatters.js';
import { equalSplit, exactSplit, percentageSplit } from '../../utils/splitCalculator.js';
import AppLayout from '../../components/layout/AppLayout.jsx';

export default function FriendDetailPage() {
  const { id: friendId } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [friend, setFriend] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState(null);
  const [tab, setTab] = useState('expenses');
  const [loading, setLoading] = useState(true);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleTarget, setSettleTarget] = useState(null);
  const [editExpense, setEditExpense] = useState(null);
  const [settledMap, setSettledMap] = useState(new Map()); // expenseId → settlementId

  const fetchAll = async () => {
    try {
      const [friendsRes, expRes, balRes] = await Promise.all([
        friendApi.getFriends(),
        expenseApi.getExpenses(null, friendId),
        friendApi.getFriendBalances(friendId),
      ]);
      const f = friendsRes.data.data.friends.find((fr) => fr._id === friendId);
      setFriend(f || null);
      setExpenses(expRes.data.data.expenses);
      setBalances(balRes.data.data.balances);
    } catch (err) {
      showToast(extractError(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [friendId]);

  const myNet = balances?.net?.[user?._id] || 0;
  const serverSettledIds = new Set(balances?.settledExpenseIds || []);

  if (loading) return <AppLayout><div className="loading-center"><div className="spinner" /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/friends" className="btn btn-ghost btn-sm">← Back</Link>
          <div className="avatar avatar-lg">{initials(friend?.name || '?')}</div>
          <div>
            <h1 className="page-title">{friend?.name || 'Friend'}</h1>
            <p className="page-subtitle">{friend?.email}</p>
          </div>
        </div>
        {tab === 'expenses' && (
          <button className="btn btn-primary" onClick={() => setShowExpenseModal(true)}>
            + Add Expense
          </button>
        )}
      </div>

      {/* Balance summary */}
      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-label">Your balance</div>
          <div className={`stat-value ${myNet > 0 ? 'green' : myNet < 0 ? 'red' : ''}`}>
            {formatCurrency(Math.abs(myNet))}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {myNet > 0 ? `${friend?.name} owes you` : myNet < 0 ? `You owe ${friend?.name}` : 'All settled up'}
          </div>
        </div>
        <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {myNet < 0 ? (
            <button className="btn btn-primary" onClick={() => {
              setSettleTarget({ to: friendId, amount: Math.abs(myNet) });
              setShowSettleModal(true);
            }}>
              Settle up — {formatCurrency(Math.abs(myNet))}
            </button>
          ) : myNet > 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Waiting for {friend?.name} to settle up
            </p>
          ) : (
            <p style={{ color: 'var(--success)', fontSize: '0.875rem', fontWeight: 500 }}>✓ All settled</p>
          )}
        </div>
      </div>

      <div className="tabs">
        {['expenses', 'history', 'activity'].map((t) => (
          <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'expenses' && (
        <div className="card">
          {expenses.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🧾</div>
              <h3>No expenses yet</h3>
              <p>Add an expense to start tracking what you share.</p>
            </div>
          ) : expenses.map((exp) => {
            const myShare = exp.splits.find((s) => s.user._id === user?._id)?.amount || 0;
            const iPaid   = exp.paidBy._id === user?._id;
            return (
              <div key={exp._id} className="list-item">
                <div className="avatar" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>💳</div>
                <div className="list-item-info">
                  <div className="list-item-title">{exp.description}</div>
                  <div className="list-item-sub">{formatDate(exp.date)} · {exp.category}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600 }}>{formatCurrency(exp.amount)}</div>
                  {(() => {
                    const isExpSettled = serverSettledIds.has(exp._id) || settledMap.has(exp._id) || myNet >= 0;
                    return (
                      <div style={{ fontSize: '0.8125rem', color: iPaid ? 'var(--success)' : isExpSettled ? 'var(--success)' : 'var(--danger)' }}>
                        {iPaid
                          ? `you lent ${formatCurrency(exp.amount - myShare)}`
                          : isExpSettled
                            ? `you settled ${formatCurrency(myShare)}`
                            : `you owe ${formatCurrency(myShare)}`}
                      </div>
                    );
                  })()}
                </div>
                {!iPaid && myShare > 0.01 && myNet < 0 && !serverSettledIds.has(exp._id) && !settledMap.has(exp._id) && (
                  <button className="btn btn-primary btn-sm" title="Settle this expense"
                    onClick={() => { setSettleTarget({ to: friendId, amount: myShare, expenseId: exp._id }); setShowSettleModal(true); }}>
                    Settle
                  </button>
                )}
                <button className="btn btn-ghost btn-icon" title="Edit"
                  onClick={() => setEditExpense(exp)}>✎</button>
                <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)' }}
                  title="Delete" onClick={async () => {
                    await expenseApi.deleteExpense(exp._id);
                    showToast('Deleted', 'success');
                    fetchAll();
                  }}>✕</button>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'history' && <SettlementHistory friendId={friendId} user={user} onRefresh={async (deletedExpenseId) => {
        if (deletedExpenseId) {
          setSettledMap((prev) => { const m = new Map(prev); m.delete(deletedExpenseId); return m; });
        } else {
          setSettledMap(new Map());
        }
        await fetchAll();
      }} />}

      {tab === 'activity' && <ActivityTab friendId={friendId} user={user} />}

      {showExpenseModal && friend && (
        <AddFriendExpenseModal
          friend={friend}
          user={user}
          onClose={() => setShowExpenseModal(false)}
          onSave={async (data) => {
            await expenseApi.createExpense({ ...data, friendId });
            showToast('Expense added!', 'success');
            setShowExpenseModal(false);
            fetchAll();
          }}
        />
      )}

      {showSettleModal && settleTarget && (
        <SettleUpModal
          target={settleTarget}
          friendName={friend?.name}
          onClose={() => { setShowSettleModal(false); setSettleTarget(null); }}
          onSave={async (data) => {
            await settlementApi.createSettlement({ ...data, friendId, expenseId: settleTarget.expenseId || null });
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

      {editExpense && friend && (
        <EditFriendExpenseModal
          expense={editExpense}
          friend={friend}
          user={user}
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

function AuditFeed({ logs, user }) {
  const CONFIG = {
    expense_added:      { color: 'var(--success)',    icon: '＋', label: 'Added',   strike: false },
    expense_edited:     { color: 'var(--warning)',    icon: '✎',  label: 'Edited',  strike: false },
    expense_deleted:    { color: 'var(--danger)',     icon: '✕',  label: 'Deleted', strike: true  },
    settlement_added:   { color: 'var(--accent)',     icon: '✓',  label: 'Settled', strike: false },
    settlement_deleted: { color: 'var(--text-muted)', icon: '↩', label: 'Undone',  strike: true  },
  };

  return (
    <div className="card">
      {logs.map((log) => {
        const cfg = CONFIG[log.action] || { color: 'var(--text-muted)', icon: '·', label: log.action, strike: false };
        const byMe = log.performedBy?._id === user?._id || log.performedBy === user?._id;

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

function ActivityTab({ friendId, user }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auditApi.getLog(null, friendId)
      .then((r) => setLogs(r.data.data.logs))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [friendId]);

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

function SettlementHistory({ friendId, user, onRefresh }) {
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    settlementApi.getSettlements(null, friendId)
      .then((r) => setSettlements(r.data.data.settlements))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [friendId]);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  if (!settlements.length) return (
    <div className="card">
      <div className="empty-state">
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
        <h3>No settlements yet</h3>
        <p>Settlements recorded between you and this friend will appear here.</p>
      </div>
    </div>
  );

  return (
    <div className="card">
      {settlements.map((s) => {
        const iSent = s.paidBy._id === user?._id;
        return (
          <div key={s._id} className="list-item">
            <div className="avatar" style={{ background: iSent ? 'var(--success-light)' : 'var(--warning-light)', color: iSent ? 'var(--success)' : 'var(--warning)', fontSize: '1rem' }}>
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
              <div className="list-item-sub">{formatDate(s.date)}{s.note ? ` · ${s.note}` : ''}</div>
            </div>
            <div style={{ fontWeight: 600, color: iSent ? 'var(--success)' : 'var(--warning)' }}>
              {formatCurrency(s.amount)}
            </div>
            {s.paidBy._id === user?._id && (
              <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)' }}
                onClick={async () => {
                  try {
                    await settlementApi.deleteSettlement(s._id);
                    setSettlements((prev) => prev.filter((x) => x._id !== s._id));
                    showToast('Removed', 'success');
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

function AddFriendExpenseModal({ friend, user, onClose, onSave }) {
  const [form, setForm] = useState({ description: '', amount: '', paidBy: user._id, splitType: 'equal', category: 'general', notes: '' });
  const [exactAmounts, setExactAmounts] = useState({ [user._id]: '', [friend._id]: '' });
  const [percentages, setPercentages] = useState({ [user._id]: '50', [friend._id]: '50' });
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const total = parseFloat(form.amount) || 0;
  const members = [user._id, friend._id];
  const memberNames = { [user._id]: 'You', [friend._id]: friend.name };

  const getPreview = () => {
    if (!total) return null;
    if (form.splitType === 'equal') return equalSplit(total, members);
    if (form.splitType === 'exact') {
      const entries = members.map((id) => ({ userId: id, amount: parseFloat(exactAmounts[id]) || 0 }));
      try { return exactSplit(entries); } catch { return null; }
    }
    if (form.splitType === 'percentage') {
      const entries = members.map((id) => ({ userId: id, percentage: parseFloat(percentages[id]) || 0 }));
      try { return percentageSplit(total, entries); } catch { return null; }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let memberData;
      if (form.splitType === 'equal') {
        memberData = members;
      } else if (form.splitType === 'exact') {
        memberData = members.map((id) => ({ userId: id, amount: parseFloat(exactAmounts[id]) }));
      } else {
        memberData = members.map((id) => ({ userId: id, percentage: parseFloat(percentages[id]) }));
      }
      await onSave({ description: form.description, amount: total, paidBy: form.paidBy, splitType: form.splitType, members: memberData, category: form.category, notes: form.notes });
    } catch (err) {
      showToast(extractError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const preview = getPreview();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add Expense with {friend.name}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Description *</label>
            <input type="text" className="form-input" placeholder="e.g. Dinner"
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Amount *</label>
              <input type="number" className="form-input" placeholder="0.00" step="0.01" min="0.01"
                value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Paid by</label>
              <select className="form-input" value={form.paidBy} onChange={(e) => setForm({ ...form, paidBy: e.target.value })}>
                <option value={user._id}>You</option>
                <option value={friend._id}>{friend.name}</option>
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

          {form.splitType === 'exact' && members.map((id) => (
            <div key={id} className="form-group">
              <label className="form-label">{memberNames[id]}'s share</label>
              <input type="number" className="form-input" placeholder="0.00" step="0.01" min="0"
                value={exactAmounts[id]} onChange={(e) => setExactAmounts({ ...exactAmounts, [id]: e.target.value })} />
            </div>
          ))}

          {form.splitType === 'percentage' && members.map((id) => (
            <div key={id} className="form-group">
              <label className="form-label">{memberNames[id]}'s %</label>
              <input type="number" className="form-input" placeholder="50" step="1" min="0" max="100"
                value={percentages[id]} onChange={(e) => setPercentages({ ...percentages, [id]: e.target.value })} />
            </div>
          ))}

          {preview && total > 0 && (
            <div style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', padding: '0.875rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Split preview</div>
              {preview.map((s) => (
                <div key={s.userId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  <span>{memberNames[s.userId]}</span>
                  <strong>{formatCurrency(s.amount)}</strong>
                </div>
              ))}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {['general', 'food', 'transport', 'accommodation', 'entertainment', 'utilities', 'shopping', 'health'].map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input type="text" className="form-input" placeholder="Optional"
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

function EditFriendExpenseModal({ expense, friend, user, onClose, onSave }) {
  const members = [user._id, friend._id];
  const memberNames = { [user._id]: 'You', [friend._id]: friend.name };

  const existingExact = {};
  const existingPct = {};
  members.forEach((id) => {
    const s = expense.splits.find((sp) => sp.user._id === id);
    existingExact[id] = s ? String(s.amount) : '';
    existingPct[id] = '50';
  });

  const [form, setForm] = useState({
    description: expense.description,
    amount: String(expense.amount),
    paidBy: expense.paidBy._id,
    splitType: expense.splitType,
    category: expense.category || 'general',
    notes: expense.notes || '',
  });
  const [exactAmounts, setExactAmounts] = useState(existingExact);
  const [percentages, setPercentages] = useState(existingPct);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const total = parseFloat(form.amount) || 0;

  const getPreview = () => {
    if (!total) return null;
    if (form.splitType === 'equal') return equalSplit(total, members);
    if (form.splitType === 'exact') {
      try { return exactSplit(members.map((id) => ({ userId: id, amount: parseFloat(exactAmounts[id]) || 0 }))); } catch { return null; }
    }
    if (form.splitType === 'percentage') {
      try { return percentageSplit(total, members.map((id) => ({ userId: id, percentage: parseFloat(percentages[id]) || 0 }))); } catch { return null; }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let memberData;
      if (form.splitType === 'equal') {
        memberData = members;
      } else if (form.splitType === 'exact') {
        memberData = members.map((id) => ({ userId: id, amount: parseFloat(exactAmounts[id]) }));
      } else {
        memberData = members.map((id) => ({ userId: id, percentage: parseFloat(percentages[id]) }));
      }
      await onSave({ description: form.description, amount: total, paidBy: form.paidBy, splitType: form.splitType, members: memberData, category: form.category, notes: form.notes });
    } catch (err) {
      showToast(extractError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const preview = getPreview();

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
            <input type="text" className="form-input" placeholder="e.g. Dinner"
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Amount *</label>
              <input type="number" className="form-input" placeholder="0.00" step="0.01" min="0.01"
                value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Paid by</label>
              <select className="form-input" value={form.paidBy} onChange={(e) => setForm({ ...form, paidBy: e.target.value })}>
                <option value={user._id}>You</option>
                <option value={friend._id}>{friend.name}</option>
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

          {form.splitType === 'exact' && members.map((id) => (
            <div key={id} className="form-group">
              <label className="form-label">{memberNames[id]}'s share</label>
              <input type="number" className="form-input" placeholder="0.00" step="0.01" min="0"
                value={exactAmounts[id]} onChange={(e) => setExactAmounts({ ...exactAmounts, [id]: e.target.value })} />
            </div>
          ))}

          {form.splitType === 'percentage' && members.map((id) => (
            <div key={id} className="form-group">
              <label className="form-label">{memberNames[id]}'s %</label>
              <input type="number" className="form-input" placeholder="50" step="1" min="0" max="100"
                value={percentages[id]} onChange={(e) => setPercentages({ ...percentages, [id]: e.target.value })} />
            </div>
          ))}

          {preview && total > 0 && (
            <div style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', padding: '0.875rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Split preview</div>
              {preview.map((s) => (
                <div key={s.userId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  <span>{memberNames[s.userId]}</span>
                  <strong>{formatCurrency(s.amount)}</strong>
                </div>
              ))}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {['general', 'food', 'transport', 'accommodation', 'entertainment', 'utilities', 'shopping', 'health'].map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input type="text" className="form-input" placeholder="Optional"
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

function SettleUpModal({ target, friendName, onClose, onSave }) {
  const [amount, setAmount] = useState(target.amount.toFixed(2));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

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
            Record a payment to <strong>{friendName}</strong>
          </p>
          <div className="form-group">
            <label className="form-label">Amount</label>
            <input type="number" className="form-input" step="0.01" min="0.01"
              value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Note (optional)</label>
            <input type="text" className="form-input" placeholder="e.g. Paid via Venmo"
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
