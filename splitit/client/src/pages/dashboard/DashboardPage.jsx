import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { groupApi } from '../../api/groupApi.js';
import { friendApi } from '../../api/friendApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatCurrency, formatRelative, initials } from '../../utils/formatters.js';
import AppLayout from '../../components/layout/AppLayout.jsx';

export default function DashboardPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [groupBalances, setGroupBalances] = useState([]);
  const [friendBalances, setFriendBalances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      groupApi.getGroups().then(async (res) => {
        const gs = res.data.data.groups;
        setGroups(gs);
        const bals = await Promise.all(
          gs.map((g) =>
            groupApi.getBalances(g._id)
              .then((r) => ({ group: g, ...r.data.data.balances }))
              .catch(() => null)
          )
        );
        setGroupBalances(bals.filter(Boolean));
      }),
      friendApi.getFriends().then(async (res) => {
        const friends = res.data.data.friends;
        const bals = await Promise.all(
          friends.map((f) =>
            friendApi.getFriendBalances(f._id)
              .then((r) => ({ friend: f, ...r.data.data.balances }))
              .catch(() => null)
          )
        );
        setFriendBalances(bals.filter(Boolean));
      }),
    ]).finally(() => setLoading(false));
  }, []);

  const uid = user?._id;

  const totalOwed = [...groupBalances, ...friendBalances]
    .reduce((acc, s) => acc + Math.max(0, s.net[uid] || 0), 0);
  const totalOwe = [...groupBalances, ...friendBalances]
    .reduce((acc, s) => acc + Math.max(0, -(s.net[uid] || 0)), 0);
  const netBalance = totalOwed - totalOwe;

  const activeFriendBals = friendBalances.filter((s) => Math.abs(s.net[uid] || 0) >= 0.01);
  const activeGroupBals  = groupBalances.filter((s)  => Math.abs(s.net[uid] || 0) >= 0.01);

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user?.name?.split(' ')[0]}</h1>
          <p className="page-subtitle">Here is what is happening with your expenses</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <>
          {/* Overall balance hero */}
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Overall Balance
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: netBalance > 0 ? 'var(--success)' : netBalance < 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                  {netBalance > 0 ? '+' : ''}{formatCurrency(netBalance)}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  {netBalance > 0
                    ? 'You are owed more than you owe'
                    : netBalance < 0
                      ? 'You owe more than you are owed'
                      : 'All settled up!'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '2rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Owed to you</div>
                  <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: '1.25rem' }}>{formatCurrency(totalOwed)}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>You owe</div>
                  <div style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '1.25rem' }}>{formatCurrency(totalOwe)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Friend balances */}
          {activeFriendBals.length > 0 && (
            <div className="card" style={{ marginBottom: '1.25rem' }}>
              <div className="card-header">
                <h2 className="card-title">Friends</h2>
                <Link to="/friends" className="btn btn-outline btn-sm">View all</Link>
              </div>
              {activeFriendBals.map(({ friend, net }) => {
                const myNet = net[uid] || 0;
                return (
                  <Link key={friend._id} to={`/friends/${friend._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="list-item">
                      <div className="avatar avatar-sm">{initials(friend.name)}</div>
                      <div className="list-item-info">
                        <div className="list-item-title">{friend.name}</div>
                        <div className="list-item-sub" style={{ color: myNet > 0 ? 'var(--success)' : 'var(--danger)' }}>
                          {myNet > 0 ? 'owes you' : 'you owe'}
                        </div>
                      </div>
                      <span style={{ fontWeight: 700, color: myNet > 0 ? 'var(--success)' : 'var(--danger)', fontSize: '0.9375rem' }}>
                        {myNet > 0 ? '+' : '-'}{formatCurrency(Math.abs(myNet))}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Group balances */}
          {activeGroupBals.length > 0 && (
            <div className="card" style={{ marginBottom: '1.25rem' }}>
              <div className="card-header">
                <h2 className="card-title">Groups</h2>
                <Link to="/balances" className="btn btn-outline btn-sm">Full view</Link>
              </div>
              {activeGroupBals.map(({ group, net }) => {
                const myNet = net[uid] || 0;
                return (
                  <Link key={group._id} to={`/groups/${group._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="list-item">
                      <div className="avatar avatar-sm" style={{ background: 'var(--accent-light)', color: 'var(--accent)', fontSize: '1rem' }}>
                        {group.icon === 'users' ? '👥' : '🏠'}
                      </div>
                      <div className="list-item-info">
                        <div className="list-item-title">{group.name}</div>
                        <div className="list-item-sub" style={{ color: myNet > 0 ? 'var(--success)' : 'var(--danger)' }}>
                          {myNet > 0 ? 'you are owed' : 'you owe'}
                        </div>
                      </div>
                      <span style={{ fontWeight: 700, color: myNet > 0 ? 'var(--success)' : 'var(--danger)', fontSize: '0.9375rem' }}>
                        {myNet > 0 ? '+' : '-'}{formatCurrency(Math.abs(myNet), group.currency)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* All settled */}
          {activeFriendBals.length === 0 && activeGroupBals.length === 0 && (
            <div className="card" style={{ marginBottom: '1.25rem' }}>
              <div className="empty-state" style={{ padding: '1.5rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                <h3>All settled up!</h3>
                <p>No outstanding balances with any friends or groups.</p>
              </div>
            </div>
          )}

          {/* Your groups quick access */}
          {groups.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Your Groups</h2>
                <Link to="/groups" className="btn btn-outline btn-sm">View all</Link>
              </div>
              {groups.slice(0, 4).map((group) => (
                <Link key={group._id} to={`/groups/${group._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="list-item">
                    <div className="avatar" style={{ fontSize: '1.25rem', background: 'var(--accent-light)', color: 'var(--accent)' }}>
                      {group.icon === 'users' ? '👥' : '🏠'}
                    </div>
                    <div className="list-item-info">
                      <div className="list-item-title">{group.name}</div>
                      <div className="list-item-sub">{group.members.length} members</div>
                    </div>
                    <span className="badge badge-purple">{group.currency}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}
