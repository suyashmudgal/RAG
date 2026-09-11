import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        background: 'var(--bg-primary, #0a0a12)',
        color: 'var(--text-secondary, #9898b8)',
        gap: '16px',
      }}>
        <div className="spinner" style={{ width: '36px', height: '36px' }} />
        <span style={{ fontSize: '0.95rem', letterSpacing: '0.02em' }}>Authenticating session…</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
