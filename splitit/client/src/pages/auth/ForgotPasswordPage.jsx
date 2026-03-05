import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/authApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { extractError } from '../../utils/formatters.js';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      showToast(extractError(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="auth-layout">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
          <h2 style={{ marginBottom: '0.75rem' }}>Check your email</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            If an account exists for <strong>{email}</strong>, a reset link has been sent.
          </p>
          <Link to="/login" className="btn btn-outline btn-full">Back to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>💸 SplitIt</h1>
          <p>Reset your password</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? <span className="spinner spinner-sm" /> : 'Send reset link'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.875rem' }}>
          <Link to="/login">← Back to login</Link>
        </div>
      </div>
    </div>
  );
}

export function ResetPasswordPage() {
  const { token } = useParams();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return showToast('Passwords do not match', 'error');
    setLoading(true);
    try {
      await authApi.resetPassword(token, form.password);
      showToast('Password reset! Please log in.', 'success');
      navigate('/login');
    } catch (err) {
      showToast(extractError(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>💸 SplitIt</h1>
          <p>Set a new password</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">New password</label>
            <input type="password" className="form-input" placeholder="Min 8 characters"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              required minLength={8} />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm new password</label>
            <input type="password" className="form-input" placeholder="••••••••"
              value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              required />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? <span className="spinner spinner-sm" /> : 'Reset password'}
          </button>
        </form>
      </div>
    </div>
  );
}
