import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { authApi } from '../../api/authApi.js';

export default function VerifyEmailPage() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    authApi.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="auth-layout">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          <p>Verifying your email…</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="auth-layout">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <h2 style={{ marginBottom: '0.75rem' }}>Email verified!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Your account is ready. Log in to get started.
          </p>
          <Link to="/login" className="btn btn-primary btn-full">Go to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-layout">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
        <h2 style={{ marginBottom: '0.75rem' }}>Invalid or expired link</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          The verification link has expired or is invalid.
        </p>
        <Link to="/login" className="btn btn-outline btn-full">Back to login</Link>
      </div>
    </div>
  );
}
