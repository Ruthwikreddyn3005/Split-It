import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { groupApi } from '../../api/groupApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { extractError } from '../../utils/formatters.js';
import AppLayout from '../../components/layout/AppLayout.jsx';

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', currency: 'USD' });
  const [creating, setCreating] = useState(false);
  const { showToast } = useToast();

  const fetchGroups = () =>
    groupApi.getGroups()
      .then((r) => setGroups(r.data.data.groups))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => { fetchGroups(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await groupApi.createGroup(form);
      showToast('Group created!', 'success');
      setShowModal(false);
      setForm({ name: '', description: '', currency: 'USD' });
      fetchGroups();
    } catch (err) {
      showToast(extractError(err), 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Groups</h1>
          <p className="page-subtitle">Manage your expense groups</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + New Group
        </button>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : groups.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>👥</div>
            <h3>No groups yet</h3>
            <p>Create a group to start splitting expenses.</p>
          </div>
        </div>
      ) : (
        <div className="grid-2">
          {groups.map((group) => (
            <Link key={group._id} to={`/groups/${group._id}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <div className="avatar avatar-lg" style={{ background: 'var(--accent-light)', color: 'var(--accent)', fontSize: '1.5rem' }}>
                    👥
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{group.name}</h3>
                    {group.description && (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                        {group.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span className="badge badge-purple">{group.currency}</span>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Create Group</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Group name *</label>
                <input type="text" className="form-input" placeholder="e.g. Weekend Trip"
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input type="text" className="form-input" placeholder="Optional"
                  value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Currency</label>
                <select className="form-input" value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option>
                  <option value="INR">INR — Indian Rupee</option>
                  <option value="CAD">CAD — Canadian Dollar</option>
                  <option value="AUD">AUD — Australian Dollar</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? <span className="spinner spinner-sm" /> : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
