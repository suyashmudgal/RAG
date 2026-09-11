import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ChatPanel from '../components/ChatPanel';
import ThemeToggle from '../components/ThemeToggle';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';
import './ChatApp.css';

export default function ChatApp() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="app-container">
      {/* Top Bar for authenticated user actions */}
      <header className="app-top-nav">
        <div className="app-top-nav-left">
          {/* Mobile Sidebar Toggle Button */}
          <button
            type="button"
            className="mobile-sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle Documents Sidebar"
            aria-label="Toggle Documents Sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
            <span className="mobile-toggle-text">Documents</span>
          </button>

          <Link to="/" className="app-home-link" title="Return to Landing Page">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Landing Page</span>
          </Link>

          <div className="app-badge-indicator">
            <span className="app-status-dot" />
            <span>RAG Active · ChromaDB</span>
          </div>
        </div>

        <div className="app-top-nav-right">
          {/* Theme Toggle Button */}
          <ThemeToggle />

          {/* User Profile Pill */}
          <div className="user-profile-badge">
            <div className="user-avatar">{initial}</div>
            <div className="user-info">
              <span className="user-name">{user?.name || 'User'}</span>
              <span className="user-email">{user?.email || ''}</span>
            </div>
          </div>

          {/* Sign Out Action */}
          <button
            className="signout-btn"
            onClick={handleSignOut}
            title="Sign out of your session"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* RAG Chat & Sidebar Workspace */}
      <div className="app">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <ChatPanel />
      </div>
    </div>
  );
}
