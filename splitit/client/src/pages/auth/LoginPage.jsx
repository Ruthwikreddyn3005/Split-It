import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { authApi } from '../../api/authApi.js';
import { extractError } from '../../utils/formatters.js';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unverified, setUnverified] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setUnverified(false);
    setResendMsg('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      const msg = extractError(err);
      const status = err?.response?.status;
      if (status === 403 && msg.toLowerCase().includes('verify')) {
        setUnverified(true);
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setResendMsg('');
    try {
      await authApi.resendVerification(form.email);
      setResendMsg('Verification email sent! Check your inbox.');
    } catch (err) {
      setResendMsg(extractError(err));
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>💸 SplitIt</h1>
          <p>Split expenses with friends</p>
        </div>

        {error && (
          <div style={{
            background: 'var(--danger-light)',
            color: 'var(--danger)',
            border: '1px solid var(--danger)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem 1rem',
            fontSize: '0.875rem',
            marginBottom: unverified ? '0.5rem' : '1rem',
          }}>
            {error}
          </div>
        )}

        {unverified && (
          <div style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
            {resendMsg ? (
              <p style={{ color: resendMsg.includes('sent') ? 'var(--success)' : 'var(--danger)', margin: 0 }}>{resendMsg}</p>
            ) : (
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}
                onClick={handleResend}
                disabled={resendLoading}
              >
                {resendLoading ? <span className="spinner spinner-sm" /> : 'Resend verification email'}
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
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
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <div style={{ textAlign: 'right', marginTop: '0.35rem' }}>
              <Link to="/forgot-password" style={{ fontSize: '0.8125rem' }}>Forgot password?</Link>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? <span className="spinner spinner-sm" /> : 'Log in'}
          </button>
        </form>

        <div className="divider-text" style={{ marginTop: '1.5rem' }}>
          Don't have an account? <Link to="/register">Sign up</Link>
        </div>
      </div>
    </div>
  );
}
