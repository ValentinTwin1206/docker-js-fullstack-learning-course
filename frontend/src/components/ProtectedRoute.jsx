import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Wrapper that redirects unauthenticated users to /login.
 * Replaces the `requireUserSession` middleware for UI routes.
 *
 * Usage:
 *   <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // While the initial /auth/me check is in flight, show a spinner
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
