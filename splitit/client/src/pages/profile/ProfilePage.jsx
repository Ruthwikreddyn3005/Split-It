import { useState } from 'react';
import { userApi } from '../../api/userApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { initials, extractError } from '../../utils/formatters.js';
import AppLayout from '../../components/layout/AppLayout.jsx';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({ name: user?.name || '', username: user?.username || '', currency: user?.currency || 'USD' });
  const [usernameError, setUsernameError] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const validateUsername = (val) => {
    if (!val) return 'Username is required';
    if (!/^[a-zA-Z0-9]+$/.test(val)) return 'Only letters and numbers allowed';
    if (val.length < 3 || val.length > 20) return 'Must be 3–20 characters';
    return '';
  };

  const handleUsernameChange = (e) => {
    const val = e.target.value;
    setForm({ ...form, username: val });
    setUsernameError(validateUsername(val));
  };

  const copyId = () => {
    navigator.clipboard.writeText(user?._id || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const uErr = validateUsername(form.username);
    if (uErr) return setUsernameError(uErr);
    setSaving(true);
    try {
      const res = await userApi.updateMe(form);
      updateUser(res.data.data.user);
      showToast('Profile updated!', 'success');
    } catch (err) {
      showToast(extractError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Profile</h1>
          <p className="page-subtitle">Manage your personal information</p>
        </div>
      </div>

      <div style={{ maxWidth: 480 }}>
        {/* Identity card */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="avatar avatar-lg">{initials(user?.name)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontWeight: 600, marginBottom: '0.125rem' }}>{user?.name}</h3>
              {user?.username
                ? <p style={{ color: 'var(--accent)', fontWeight: 500, fontSize: '0.9375rem', marginBottom: '0.125rem' }}>@{user.username}</p>
                : <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '0.125rem' }}>⚠ No username set — set one below</p>
              }
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{user?.email}</p>
            </div>
          </div>
        </div>

        {/* User ID card */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Your User ID
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <code style={{
              flex: 1, background: 'var(--bg-primary)', padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem',
              color: 'var(--text-primary)', fontFamily: 'monospace',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {user?._id}
            </code>
            <button className="btn btn-outline btn-sm" onClick={copyId} style={{ flexShrink: 0 }}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>
            Share your username instead — it's easier to remember.
          </p>
        </div>

        {/* Edit form */}
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: '1.25rem', fontSize: '0.9375rem' }}>Edit Profile</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input type="text" className="form-input"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Username</label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-muted)', fontWeight: 500, pointerEvents: 'none',
                }}>@</span>
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '1.75rem' }}
                  placeholder="e.g. john123"
                  value={form.username}
                  onChange={handleUsernameChange}
                  required
                />
              </div>
              {usernameError
                ? <p className="form-hint" style={{ color: 'var(--danger)' }}>{usernameError}</p>
                : <p className="form-hint">Letters and numbers only, 3–20 chars. Friends find you with this.</p>
              }
            </div>
            <div className="form-group">
              <label className="form-label">Default currency</label>
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
            <button type="submit" className="btn btn-primary" disabled={saving || !!usernameError}>
              {saving ? <span className="spinner spinner-sm" /> : 'Save changes'}
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
