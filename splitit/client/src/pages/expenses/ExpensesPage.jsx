import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { groupApi } from '../../api/groupApi.js';
import { expenseApi } from '../../api/expenseApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import AppLayout from '../../components/layout/AppLayout.jsx';

export default function ExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    groupApi.getGroups().then(async (res) => {
      const gs = res.data.data.groups;
      setGroups(gs);
      const allExpenses = await Promise.all(
        gs.map((g) =>
          expenseApi.getExpenses(g._id)
            .then((r) => r.data.data.expenses.map((e) => ({ ...e, groupName: g.name, groupId: g._id, currency: g.currency })))
            .catch(() => [])
        )
      );
      const flat = allExpenses.flat().sort((a, b) => new Date(b.date) - new Date(a.date));
      setExpenses(flat);
    }).finally(() => setLoading(false));
  }, []);

  const totalSpent = expenses.reduce((acc, e) => {
    const myShare = e.splits?.find((s) => s.user._id === user?._id)?.amount || 0;
    return acc + myShare;
  }, 0);

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">All Expenses</h1>
          <p className="page-subtitle">Expenses across all your groups</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <>
          <div className="stat-card" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-label">Your total share</div>
            <div className="stat-value red">{formatCurrency(totalSpent)}</div>
          </div>

          {expenses.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🧾</div>
                <h3>No expenses yet</h3>
                <p>Add expenses in a group to see them here.</p>
              </div>
            </div>
          ) : (
            <div className="card">
              {expenses.map((exp) => {
                const myShare = exp.splits?.find((s) => s.user._id === user?._id)?.amount || 0;
                const iPaid = exp.paidBy?._id === user?._id;
                return (
                  <div key={exp._id} className="list-item">
                    <div className="avatar" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                      💳
                    </div>
                    <div className="list-item-info">
                      <div className="list-item-title">{exp.description}</div>
                      <div className="list-item-sub">
                        {formatDate(exp.date)} ·{' '}
                        <Link to={`/groups/${exp.groupId}`} style={{ color: 'var(--accent)' }}>
                          {exp.groupName}
                        </Link>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600 }}>{formatCurrency(exp.amount, exp.currency)}</div>
                      <div style={{ fontSize: '0.8125rem', color: iPaid ? 'var(--success)' : 'var(--danger)' }}>
                        {iPaid
                          ? `you lent ${formatCurrency(exp.amount - myShare, exp.currency)}`
                          : `you owe ${formatCurrency(myShare, exp.currency)}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}
