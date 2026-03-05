import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { groupApi } from '../../api/groupApi.js';
import { friendApi } from '../../api/friendApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatCurrency, initials } from '../../utils/formatters.js';
import AppLayout from '../../components/layout/AppLayout.jsx';

export default function BalancesPage() {
  const { user } = useAuth();
  const [groupSummaries, setGroupSummaries] = useState([]);
  const [friendSummaries, setFriendSummaries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      // Group balances
      groupApi.getGroups().then(async (res) => {
        const gs = res.data.data.groups;
        const results = await Promise.all(
          gs.map((g) =>
            groupApi.getBalances(g._id)
              .then((r) => ({ group: g, ...r.data.data.balances }))
              .catch(() => null)
          )
        );
        setGroupSummaries(results.filter(Boolean));
      }),
      // Friend balances
      friendApi.getFriends().then(async (res) => {
        const friends = res.data.data.friends;
        const results = await Promise.all(
          friends.map((f) =>
            friendApi.getFriendBalances(f._id)
              .then((r) => ({ friend: f, ...r.data.data.balances }))
              .catch(() => null)
          )
        );
        setFriendSummaries(results.filter(Boolean));
      }),
    ]).finally(() => setLoading(false));
  }, []);

  const totalGroupOwed = groupSummaries.reduce((acc, s) => acc + Math.max(0, s.net[user?._id] || 0), 0);
  const totalGroupOwe  = groupSummaries.reduce((acc, s) => acc + Math.max(0, -(s.net[user?._id] || 0)), 0);
  const totalFriendOwed = friendSummaries.reduce((acc, s) => acc + Math.max(0, s.net[user?._id] || 0), 0);
  const totalFriendOwe  = friendSummaries.reduce((acc, s) => acc + Math.max(0, -(s.net[user?._id] || 0)), 0);

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Balances</h1>
          <p className="page-subtitle">Your financial summary across groups and friends</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <>
          {/* Grand totals */}
          <div className="grid-2" style={{ marginBottom: '2rem' }}>
            <div className="stat-card">
              <div className="stat-label">Total you are owed</div>
              <div className="stat-value green">{formatCurrency(totalGroupOwed + totalFriendOwed)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total you owe</div>
              <div className="stat-value red">{formatCurrency(totalGroupOwe + totalFriendOwe)}</div>
            </div>
          </div>

          {/* Friends section */}
          {friendSummaries.length > 0 && (
            <>
              <h2 style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '1rem', color: 'var(--text-secondary)' }}>
                Friends
              </h2>
              {friendSummaries.map(({ friend, net, simplified }) => {
                const myNet = net[user?._id] || 0;
                if (Math.abs(myNet) < 0.01) return null;
                return (
                  <div key={friend._id} className="card" style={{ marginBottom: '1rem' }}>
                    <div className="card-header">
                      <Link to={`/friends/${friend._id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none' }}>
                        <div className="avatar avatar-sm">{initials(friend.name)}</div>
                        {friend.name}
                      </Link>
                      <span className={`badge ${myNet > 0 ? 'badge-green' : 'badge-red'}`}>
                        {myNet > 0 ? `${friend.name} owes you` : `You owe ${friend.name}`} · {formatCurrency(Math.abs(myNet))}
                      </span>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Groups section */}
          {groupSummaries.length > 0 && (
            <>
              <h2 style={{ fontWeight: 600, marginBottom: '0.75rem', marginTop: '1rem', fontSize: '1rem', color: 'var(--text-secondary)' }}>
                Groups
              </h2>
              {groupSummaries.map(({ group, net, simplified }) => {
                const myNet = net[user?._id] || 0;
                const myTransactions = simplified.filter((t) => t.from === user?._id || t.to === user?._id);
                if (myTransactions.length === 0 && Math.abs(myNet) < 0.01) return null;

                const memberMap = {};
                group.members.forEach((m) => { memberMap[m.user._id] = m.user; });

                return (
                  <div key={group._id} className="card" style={{ marginBottom: '1rem' }}>
                    <div className="card-header">
                      <Link to={`/groups/${group._id}`} style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {group.name}
                      </Link>
                      <span className={`badge ${myNet > 0 ? 'badge-green' : 'badge-red'}`}>
                        {myNet > 0 ? '+' : ''}{formatCurrency(myNet, group.currency)}
                      </span>
                    </div>
                    {myTransactions.map((t, i) => {
                      const isDebtor = t.from === user?._id;
                      const other = memberMap[isDebtor ? t.to : t.from];
                      return (
                        <div key={i} className="list-item">
                          <div className="avatar avatar-sm">{initials(other?.name)}</div>
                          <div className="list-item-info">
                            <div className="list-item-title" style={{ fontSize: '0.9rem' }}>
                              {isDebtor ? `You owe ${other?.name}` : `${other?.name} owes you`}
                            </div>
                          </div>
                          <div style={{ fontWeight: 600, color: isDebtor ? 'var(--danger)' : 'var(--success)' }}>
                            {formatCurrency(t.amount, group.currency)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}

          {groupSummaries.length === 0 && friendSummaries.length === 0 && (
            <div className="card">
              <div className="empty-state">
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚖️</div>
                <h3>All settled up!</h3>
                <p>No outstanding balances across any groups or friends.</p>
              </div>
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}
