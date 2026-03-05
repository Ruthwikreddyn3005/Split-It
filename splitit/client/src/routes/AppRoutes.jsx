import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';

import LoginPage from '../pages/auth/LoginPage.jsx';
import RegisterPage from '../pages/auth/RegisterPage.jsx';
import VerifyEmailPage from '../pages/auth/VerifyEmailPage.jsx';
import { ForgotPasswordPage, ResetPasswordPage } from '../pages/auth/ForgotPasswordPage.jsx';

import DashboardPage from '../pages/dashboard/DashboardPage.jsx';
import GroupsPage from '../pages/groups/GroupsPage.jsx';
import GroupDetailPage from '../pages/groups/GroupDetailPage.jsx';
import ExpensesPage from '../pages/expenses/ExpensesPage.jsx';
import BalancesPage from '../pages/balances/BalancesPage.jsx';
import FriendsPage from '../pages/friends/FriendsPage.jsx';
import FriendDetailPage from '../pages/friends/FriendDetailPage.jsx';
import ProfilePage from '../pages/profile/ProfilePage.jsx';
import SettingsPage from '../pages/settings/SettingsPage.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

      {/* Protected */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/groups" element={<ProtectedRoute><GroupsPage /></ProtectedRoute>} />
      <Route path="/groups/:id" element={<ProtectedRoute><GroupDetailPage /></ProtectedRoute>} />
      <Route path="/friends" element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
      <Route path="/friends/:id" element={<ProtectedRoute><FriendDetailPage /></ProtectedRoute>} />
      <Route path="/expenses" element={<ProtectedRoute><ExpensesPage /></ProtectedRoute>} />
      <Route path="/balances" element={<ProtectedRoute><BalancesPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
