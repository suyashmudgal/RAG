import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="app-container">
        <div className="app-workspace-layout" style={{ opacity: 0.85 }}>
          {/* Skeleton Sidebar */}
          <aside className="sidebar skeleton-shimmer" style={{ width: '280px', flexShrink: 0 }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
              <div className="skeleton-line medium" style={{ height: '24px' }} />
            </div>
            <div style={{ padding: '16px' }}>
              <div className="skeleton-line long" style={{ height: '38px', borderRadius: 'var(--radius-md)', marginBottom: '20px' }} />
              <div className="skeleton-line short" style={{ marginBottom: '12px' }} />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton-line long" style={{ height: '36px', marginBottom: '8px', borderRadius: 'var(--radius-sm)' }} />
              ))}
            </div>
          </aside>

          {/* Skeleton Main Workspace */}
          <main className="chat-panel" style={{ flex: 1 }}>
            <header className="chat-header">
              <div className="skeleton-line medium" style={{ width: '220px', height: '22px' }} />
              <div className="skeleton-line short" style={{ width: '120px', height: '28px', borderRadius: 'var(--radius-full)' }} />
            </header>
            <div className="messages-scroll-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', maxWidth: '400px', width: '100%', padding: '24px' }}>
                <div className="skeleton-avatar skeleton-shimmer" style={{ width: '56px', height: '56px', margin: '0 auto 20px auto' }} />
                <div className="skeleton-line medium skeleton-shimmer" style={{ height: '20px', margin: '0 auto 12px auto' }} />
                <div className="skeleton-line short skeleton-shimmer" style={{ height: '14px', margin: '0 auto' }} />
              </div>
            </div>
            <footer className="chat-composer-dock">
              <div className="composer-inner-wrapper">
                <div className="composer-box skeleton-shimmer" style={{ height: '54px', borderRadius: 'var(--radius-lg)' }} />
              </div>
            </footer>
          </main>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
