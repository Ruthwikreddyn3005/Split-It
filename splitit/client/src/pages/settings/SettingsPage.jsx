import { useState } from 'react';
import { userApi } from '../../api/userApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { extractError } from '../../utils/formatters.js';
import AppLayout from '../../components/layout/AppLayout.jsx';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [savingPw, setSavingPw] = useState(false);

  const handleThemeChange = async (t) => {
    setTheme(t);
    try {
      await userApi.updateTheme(t);
      updateUser({ theme: t });
    } catch (err) {
      showToast(extractError(err), 'error');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) {
      return showToast('Passwords do not match', 'error');
    }
    setSavingPw(true);
    try {
      await userApi.changePassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      showToast('Password changed!', 'success');
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      showToast(extractError(err), 'error');
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account preferences</p>
        </div>
      </div>

      <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Theme */}
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: '1.25rem' }}>Appearance</h3>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {[
              { value: 'light', label: '☀️ Light' },
              { value: 'dark',  label: '🌙 Dark' },
              { value: 'system', label: '🖥 System' },
            ].map((t) => (
              <button
                key={t.value}
                className={`btn ${theme === t.value ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => handleThemeChange(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Change Password */}
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: '1.25rem' }}>Change Password</h3>
          <form onSubmit={handlePasswordChange}>
            <div className="form-group">
              <label className="form-label">Current password</label>
              <input type="password" className="form-input" placeholder="••••••••"
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">New password</label>
              <input type="password" className="form-input" placeholder="Min 8 characters"
                value={pwForm.newPassword}
                onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                required minLength={8} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm new password</label>
              <input type="password" className="form-input" placeholder="••••••••"
                value={pwForm.confirm}
                onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={savingPw}>
              {savingPw ? <span className="spinner spinner-sm" /> : 'Update password'}
            </button>
          </form>
        </div>

        {/* Account Info */}
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Account</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Email</span>
              <span>{user?.email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Email verified</span>
              <span className={`badge ${user?.isEmailVerified ? 'badge-green' : 'badge-red'}`}>
                {user?.isEmailVerified ? 'Verified' : 'Not verified'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
