import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { friendApi } from '../../api/friendApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { initials, extractError } from '../../utils/formatters.js';
import AppLayout from '../../components/layout/AppLayout.jsx';

export default function FriendsPage() {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [adding, setAdding] = useState(false);
  const { showToast } = useToast();

  const fetchFriends = () =>
    friendApi.getFriends()
      .then((r) => setFriends(r.data.data.friends))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => { fetchFriends(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      await friendApi.addFriend(identifier);
      showToast('Friend added!', 'success');
      setShowModal(false);
      setIdentifier('');
      fetchFriends();
    } catch (err) {
      showToast(extractError(err), 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (userId) => {
    try {
      await friendApi.removeFriend(userId);
      showToast('Friend removed', 'success');
      fetchFriends();
    } catch (err) {
      showToast(extractError(err), 'error');
    }
  };

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Friends</h1>
          <p className="page-subtitle">Split expenses one-on-one</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Add Friend
        </button>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : friends.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🤝</div>
            <h3>No friends yet</h3>
            <p>Search by username or email to connect with friends.</p>
          </div>
        </div>
      ) : (
        <div className="card">
          {friends.map((friend) => (
            <div key={friend._id} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem', borderRadius: 'var(--radius-sm)' }}>
              <div className="avatar">{initials(friend.name)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{friend.name}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  @{friend.username} · {friend.email}
                </div>
              </div>
              <Link to={`/friends/${friend._id}`} className="btn btn-outline btn-sm">
                View
              </Link>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}
                onClick={() => handleRemove(friend._id)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setIdentifier(''); }}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Friend</h2>
              <button className="modal-close" onClick={() => { setShowModal(false); setIdentifier(''); }}>×</button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label className="form-label">Username or email</label>
                <input type="text" className="form-input" placeholder="john123 or friend@example.com"
                  value={identifier} onChange={(e) => setIdentifier(e.target.value)} required autoFocus />
                <p className="form-hint">They must have a verified SplitIt account.</p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => { setShowModal(false); setIdentifier(''); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={adding}>
                  {adding ? <span className="spinner spinner-sm" /> : 'Add friend'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
