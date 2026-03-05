import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { initials } from '../../utils/formatters.js';
import GlobalAddExpenseModal from '../GlobalAddExpenseModal.jsx';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: IconGrid },
  { to: '/groups',    label: 'Groups',    icon: IconUsers },
  { to: '/friends',   label: 'Friends',   icon: IconHeart },
  { to: '/expenses',  label: 'Expenses',  icon: IconReceipt },
  { to: '/balances',  label: 'Balances',  icon: IconScale },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  const handleLogout = async () => {
    await logout();
    showToast('Logged out', 'success');
    navigate('/login');
  };

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h2>💸 SplitIt</h2>
        </div>

        <button
          className="btn btn-primary"
          style={{ margin: '0 0.75rem 1rem', width: 'calc(100% - 1.5rem)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          onClick={() => setShowExpenseModal(true)}
        >
          <IconPlus /> Add Expense
        </button>

        <nav className="sidebar-nav">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <NavLink to="/profile" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <div className="avatar avatar-sm">{initials(user?.name)}</div>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name}
            </span>
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <IconSettings />
            Settings
          </NavLink>
          <button className="nav-link btn-ghost" onClick={handleLogout} style={{ width: '100%' }}>
            <IconLogout />
            Logout
          </button>
        </div>
      </aside>

      {showExpenseModal && (
        <GlobalAddExpenseModal onClose={() => setShowExpenseModal(false)} />
      )}
    </>
  );
}

function IconPlus() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
function IconGrid() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
}
function IconUsers() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
function IconReceipt() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 2v20l3-2 2 2 3-2 3 2 2-2 3 2V2"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>;
}
function IconScale() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v18"/><path d="M3 9l9-7 9 7"/><path d="M4 15l8-6 8 6"/></svg>;
}
function IconHeart() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
}
function IconSettings() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
}
function IconLogout() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
}
