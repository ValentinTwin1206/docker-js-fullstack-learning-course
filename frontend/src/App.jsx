import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster }                 from 'react-hot-toast';

import { AuthProvider }            from './hooks/useAuth';
import LoginPage                   from './pages/LoginPage';
import HomePage                    from './pages/HomePage';
import ProfilePage                 from './pages/ProfilePage';
import UsersPage                   from './pages/UsersPage';
import StatisticsPage              from './pages/StatisticsPage';
import ProtectedRoute              from './components/ProtectedRoute';

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="bottom-right" />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/home" element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } />

        <Route path="/admin/users" element={
          <ProtectedRoute>
            <UsersPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/statistics" element={
          <ProtectedRoute>
            <StatisticsPage />
          </ProtectedRoute>
        } />

        {/* Redirect root and unknown paths */}
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}
