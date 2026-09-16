import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ChatPanel from '../components/ChatPanel';
import SettingsModal from '../components/SettingsModal';
import { useAuth } from '../contexts/AuthContext';
import { getConversations, deleteConversation } from '../api/client';
import '../App.css';
import './ChatApp.css';

export default function ChatApp() {
  const { logout } = useAuth();
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

  const handleNewChat = useCallback(() => {
    setActiveConversationId(null);
    localStorage.removeItem('active_conversation_id');
  }, []);

  // Global Ctrl+K / Cmd+K listener to start a new chat
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNewChat]);

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

  return (
    <div className="app-container">
      {/* 2-Column AI Workspace Layout */}
      <div className="app-workspace-layout">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          onDeleteConversation={handleDeleteConversation}
          loadingConversations={loadingConversations}
          onOpenSettings={() => setSettingsOpen(true)}
          onSignOut={handleSignOut}
        />

        <ChatPanel
          activeConversationId={activeConversationId}
          activeConversationTitle={activeConv?.title || ''}
          onConversationCreated={handleConversationCreated}
          onNewChat={handleNewChat}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />
      </div>

      {/* Account & Profile Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onLogout={handleSignOut}
      />
    </div>
  );
}
