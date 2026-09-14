import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ChatPanel from '../components/ChatPanel';
import ThemeToggle from '../components/ThemeToggle';
import SettingsModal from '../components/SettingsModal';
import { useAuth } from '../contexts/AuthContext';
import { getConversations, deleteConversation } from '../api/client';
import '../App.css';
import './ChatApp.css';

export default function ChatApp() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(() => {
    return localStorage.getItem('active_conversation_id') || null;
  });
  const [loadingConversations, setLoadingConversations] = useState(false);

  /* Load conversations from PostgreSQL */
  const loadConversations = useCallback(async () => {
    try {
      setLoadingConversations(true);
      const list = await getConversations();
      setConversations(list || []);

      const savedId = localStorage.getItem('active_conversation_id');
      if (savedId && list.some((c) => c.id === savedId)) {
        setActiveConversationId(savedId);
      } else if (list.length > 0 && !savedId) {
        setActiveConversationId(list[0].id);
        localStorage.setItem('active_conversation_id', list[0].id);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleSelectConversation = (convId) => {
    setActiveConversationId(convId);
    localStorage.setItem('active_conversation_id', convId);
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    localStorage.removeItem('active_conversation_id');
  };

  const handleDeleteConversation = async (convId) => {
    try {
      await deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConversationId === convId) {
        handleNewChat();
      }
    } catch (err) {
      alert(`Delete conversation failed: ${err.message}`);
    }
  };

  const handleConversationCreated = async (resolvedId) => {
    setActiveConversationId(resolvedId);
    localStorage.setItem('active_conversation_id', resolvedId);
    await loadConversations();
  };

  const handleSignOut = async () => {
    localStorage.removeItem('active_conversation_id');
    setActiveConversationId(null);
    setConversations([]);
    await logout();
    navigate('/', { replace: true });
  };

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="app-container">
      {/* Top Bar */}
      <header className="app-top-nav">
        <div className="app-top-nav-left">
          <button
            type="button"
            className="mobile-sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle Sidebar"
            aria-label="Toggle Sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
            <span className="mobile-toggle-text">Menu</span>
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
            <span>PostgreSQL & ChromaDB Active</span>
          </div>
        </div>

        <div className="app-top-nav-right">
          <ThemeToggle />

          {/* Interactive User Profile Pill */}
          <button
            type="button"
            className="user-profile-badge user-profile-clickable"
            onClick={() => setSettingsOpen(true)}
            title="Open Account & Settings"
          >
            <div className="user-avatar">{initial}</div>
            <div className="user-info">
              <span className="user-name">{user?.name || 'User'}</span>
              <span className="user-email">{user?.email || ''}</span>
            </div>
            <div className="user-settings-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
          </button>

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
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          onDeleteConversation={handleDeleteConversation}
          loadingConversations={loadingConversations}
        />
        <ChatPanel
          activeConversationId={activeConversationId}
          activeConversationTitle={activeConv?.title || ''}
          onConversationCreated={handleConversationCreated}
          onNewChat={handleNewChat}
        />
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onLogout={handleSignOut}
      />
    </div>
  );
}
