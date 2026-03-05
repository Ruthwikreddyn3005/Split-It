import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/authApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { extractError } from '../../utils/formatters.js';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', confirm: '' });
  const [usernameError, setUsernameError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const uErr = validateUsername(form.username);
    if (uErr) return setUsernameError(uErr);
    if (form.password !== form.confirm) {
      return showToast('Passwords do not match', 'error');
    }
    setLoading(true);
    try {
      await authApi.register({ name: form.name, username: form.username, email: form.email, password: form.password });
      setDone(true);
    } catch (err) {
      showToast(extractError(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="auth-layout">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
          <h2 style={{ marginBottom: '0.75rem' }}>Check your email</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            We sent a verification link to <strong>{form.email}</strong>. Click it to activate your account.
          </p>
          <Link to="/login" className="btn btn-primary btn-full">Back to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>💸 SplitIt</h1>
          <p>Create your account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full name</label>
            <input
              type="text"
              className="form-input"
              placeholder="John Doe"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className={`form-input${usernameError ? ' input-error' : ''}`}
              placeholder="e.g. john123"
              value={form.username}
              onChange={handleUsernameChange}
              required
              autoComplete="username"
            />
            {usernameError
              ? <p className="form-hint" style={{ color: 'var(--danger)' }}>{usernameError}</p>
              : <p className="form-hint">Letters and numbers only, 3–20 characters. Friends can find you with this.</p>
            }
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Min 8 characters"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={8}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading || !!usernameError}>
            {loading ? <span className="spinner spinner-sm" /> : 'Create account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.875rem' }}>
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
}
