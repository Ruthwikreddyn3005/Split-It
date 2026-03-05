import { useState, useEffect } from 'react';
import { groupApi } from '../api/groupApi.js';
import { friendApi } from '../api/friendApi.js';
import { expenseApi } from '../api/expenseApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatCurrency, extractError } from '../utils/formatters.js';
import { equalSplit, exactSplit, percentageSplit } from '../utils/splitCalculator.js';

const CATEGORIES = ['general', 'food', 'transport', 'accommodation', 'entertainment', 'utilities', 'shopping', 'health'];

export default function GlobalAddExpenseModal({ onClose }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  // Step 1 state
  const [splitWith, setSplitWith] = useState('friend'); // 'friend' | 'group'
  const [friends, setFriends] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [step, setStep] = useState(1); // 1 = pick who, 2 = expense details
  const [loadingData, setLoadingData] = useState(true);

  // Step 2 state
  const [form, setForm] = useState({ description: '', amount: '', paidBy: user?._id, splitType: 'equal', category: 'general', notes: '' });
  const [exactAmounts, setExactAmounts] = useState({});
  const [percentages, setPercentages] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([friendApi.getFriends(), groupApi.getGroups()])
      .then(([fr, gr]) => {
        setFriends(fr.data.data.friends);
        setGroups(gr.data.data.groups);
      })
      .catch(() => {})
      .finally(() => setLoadingData(false));
  }, []);

  // Derived: who are the members for split preview
  const members = splitWith === 'friend' && selectedFriend
    ? [user._id, selectedFriend._id]
    : splitWith === 'group' && selectedGroup
      ? selectedGroup.members.map((m) => m.user._id)
      : [];

  const memberNames = splitWith === 'friend' && selectedFriend
    ? { [user._id]: 'You', [selectedFriend._id]: selectedFriend.name }
    : splitWith === 'group' && selectedGroup
      ? Object.fromEntries(selectedGroup.members.map((m) => [
          m.user._id,
          m.user._id === user._id ? 'You' : m.user.name,
        ]))
      : {};

  // Init exact/percentage when members set
  useEffect(() => {
    if (members.length === 0) return;
    const ea = {}; const pc = {};
    members.forEach((id) => { ea[id] = ''; pc[id] = String(Math.round(100 / members.length)); });
    setExactAmounts(ea);
    setPercentages(pc);
    setForm((f) => ({ ...f, paidBy: user._id }));
  }, [selectedFriend?._id, selectedGroup?._id]);

  const total = parseFloat(form.amount) || 0;

  const getPreview = () => {
    if (!total || members.length === 0) return null;
    try {
      if (form.splitType === 'equal') return equalSplit(total, members);
      if (form.splitType === 'exact') {
        const entries = members.map((id) => ({ userId: id, amount: parseFloat(exactAmounts[id]) || 0 }));
        return exactSplit(entries);
      }
      if (form.splitType === 'percentage') {
        const entries = members.map((id) => ({ userId: id, percentage: parseFloat(percentages[id]) || 0 }));
        return percentageSplit(total, entries);
      }
    } catch { return null; }
  };

  const handleNext = () => {
    if (splitWith === 'friend' && !selectedFriend) return showToast('Select a friend', 'error');
    if (splitWith === 'group' && !selectedGroup) return showToast('Select a group', 'error');
    setStep(2);
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

      const payload = {
        description: form.description,
        amount: total,
        paidBy: form.paidBy,
        splitType: form.splitType,
        members: memberData,
        category: form.category,
        notes: form.notes,
      };

      if (splitWith === 'friend') {
        payload.friendId = selectedFriend._id;
      } else {
        payload.groupId = selectedGroup._id;
      }

      await expenseApi.createExpense(payload);
      showToast('Expense added!', 'success');
      onClose();
    } catch (err) {
      showToast(extractError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const preview = getPreview();
  const currency = splitWith === 'group' && selectedGroup ? selectedGroup.currency : 'USD';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {step === 1 ? 'New Expense' : `Split with ${splitWith === 'friend' ? selectedFriend?.name : selectedGroup?.name}`}
          </h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {step === 1 ? (
          /* ── Step 1: pick friend or group ── */
          <div>
            {loadingData ? (
              <div className="loading-center" style={{ padding: '2rem' }}><div className="spinner" /></div>
            ) : (
              <>
                {/* Toggle */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  {['friend', 'group'].map((t) => (
                    <button key={t} type="button"
                      className={`btn btn-sm ${splitWith === t ? 'btn-primary' : 'btn-outline'}`}
                      style={{ flex: 1 }}
                      onClick={() => { setSplitWith(t); setSelectedFriend(null); setSelectedGroup(null); }}>
                      {t === 'friend' ? '👤 With a Friend' : '👥 With a Group'}
                    </button>
                  ))}
                </div>

                {/* Friend list */}
                {splitWith === 'friend' && (
                  friends.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>
                      No friends yet. Add friends first.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 280, overflowY: 'auto' }}>
                      {friends.map((f) => (
                        <div key={f._id}
                          onClick={() => setSelectedFriend(f)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            padding: '0.75rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                            background: selectedFriend?._id === f._id ? 'var(--accent-light)' : 'var(--bg-primary)',
                            border: `1.5px solid ${selectedFriend?._id === f._id ? 'var(--accent)' : 'transparent'}`,
                          }}>
                          <div className="avatar avatar-sm">{(f.name || '?')[0].toUpperCase()}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 500 }}>{f.name}</div>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                              {f.username ? `@${f.username}` : f.email}
                            </div>
                          </div>
                          {selectedFriend?._id === f._id && (
                            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>✓</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* Group list */}
                {splitWith === 'group' && (
                  groups.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>
                      No groups yet. Create a group first.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 280, overflowY: 'auto' }}>
                      {groups.map((g) => (
                        <div key={g._id}
                          onClick={() => setSelectedGroup(g)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            padding: '0.75rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                            background: selectedGroup?._id === g._id ? 'var(--accent-light)' : 'var(--bg-primary)',
                            border: `1.5px solid ${selectedGroup?._id === g._id ? 'var(--accent)' : 'transparent'}`,
                          }}>
                          <div className="avatar avatar-sm" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                            {g.icon === 'users' ? '👥' : '🏠'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 500 }}>{g.name}</div>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                              {g.members.length} members · {g.currency}
                            </div>
                          </div>
                          {selectedGroup?._id === g._id && (
                            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>✓</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                )}

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                  <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
                  <button type="button" className="btn btn-primary"
                    onClick={handleNext}
                    disabled={(splitWith === 'friend' && !selectedFriend) || (splitWith === 'group' && !selectedGroup)}>
                    Next →
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          /* ── Step 2: expense form ── */
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Description *</label>
              <input type="text" className="form-input" placeholder="e.g. Dinner"
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required autoFocus />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Amount *</label>
                <input type="number" className="form-input" placeholder="0.00" step="0.01" min="0.01"
                  value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Paid by</label>
                <select className="form-input" value={form.paidBy}
                  onChange={(e) => setForm({ ...form, paidBy: e.target.value })}>
                  {members.map((id) => (
                    <option key={id} value={id}>{memberNames[id]}</option>
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

            {form.splitType === 'exact' && members.map((id) => (
              <div key={id} className="form-group">
                <label className="form-label">{memberNames[id]}'s share</label>
                <input type="number" className="form-input" placeholder="0.00" step="0.01" min="0"
                  value={exactAmounts[id] || ''} onChange={(e) => setExactAmounts({ ...exactAmounts, [id]: e.target.value })} />
              </div>
            ))}

            {form.splitType === 'percentage' && members.map((id) => (
              <div key={id} className="form-group">
                <label className="form-label">{memberNames[id]}'s %</label>
                <input type="number" className="form-input" placeholder="0" step="1" min="0" max="100"
                  value={percentages[id] || ''} onChange={(e) => setPercentages({ ...percentages, [id]: e.target.value })} />
              </div>
            ))}

            {preview && total > 0 && (
              <div style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', padding: '0.875rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Split preview</div>
                {preview.map((s) => (
                  <div key={s.userId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                    <span>{memberNames[s.userId]}</span>
                    <strong>{formatCurrency(s.amount, currency)}</strong>
                  </div>
                ))}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input" value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => (
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
              <button type="button" className="btn btn-outline" onClick={() => setStep(1)}>← Back</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner spinner-sm" /> : 'Add expense'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
