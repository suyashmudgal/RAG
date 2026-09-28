import { useState, useMemo, useRef, useEffect } from 'react';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../contexts/AuthContext';
import './Sidebar.css';

export default function Sidebar({
  isOpen = false,
  onClose,
  conversations = [],
  activeConversationId = null,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  onTogglePinConversation,
  loadingConversations = false,
  onOpenSettings,
  onSignOut,
  onToggleDocPanel,
  docPanelOpen = false,
  documentCount = 0,
  processingCount = 0,
  isSelectionMode = false,
  onToggleSelectionMode,
  selectedConvIds = new Set(),
  onToggleSelectConv,
  onSelectAllConvs,
  onClearSelection,
  onRequestBulkDelete,
}) {
  const { user } = useAuth();

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Three-dot action menu
  const [openMenuId, setOpenMenuId] = useState(null);

  // Inline rename state
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const editInputRef = useRef(null);

  // Close menus on outside click or Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpenMenuId(null);
        setEditingId(null);
      }
    };

    const handleClickOutside = (e) => {
      if (!e.target.closest('.conv-menu-container') && !e.target.closest('.conv-menu-popover')) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Auto-focus inline rename input
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // Instant search filter
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) =>
      (c.title || 'New Conversation').toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  // Partition into Pinned and Recent
  const pinnedList = useMemo(() => {
    return filteredConversations.filter((c) => Boolean(c.is_pinned));
  }, [filteredConversations]);

  const recentList = useMemo(() => {
    return filteredConversations.filter((c) => !c.is_pinned);
  }, [filteredConversations]);

  // Relative timestamp formatting
  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  /* ── Inline Rename ── */
  const startRename = (conv, e) => {
    e.stopPropagation();
    setOpenMenuId(null);
    setEditingId(conv.id);
    setEditTitle(conv.title || 'New Conversation');
  };

  const handleSaveRename = async (convId) => {
    const trimmed = editTitle.trim();
    setEditingId(null);
    if (!trimmed) return;
    if (onRenameConversation) {
      await onRenameConversation(convId, trimmed);
    }
  };

  const handleRenameKeyDown = (e, convId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveRename(convId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingId(null);
    }
  };

  /* ── Pin / Unpin ── */
  const handleTogglePin = async (conv, e) => {
    e.stopPropagation();
    setOpenMenuId(null);
    if (onTogglePinConversation) {
      await onTogglePinConversation(conv.id, !conv.is_pinned);
    }
  };

  /* ── Delete Single ── */
  const handleDeleteSingle = (convId, e) => {
    e.stopPropagation();
    setOpenMenuId(null);
    if (onDeleteConversation) {
      onDeleteConversation(convId);
    }
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  const selectedCount = selectedConvIds?.size || 0;
  const isAllSelected = filteredConversations.length > 0 && selectedCount === filteredConversations.length;

  const renderConversationRow = (conv) => {
    const isActive = conv.id === activeConversationId;
    const isEditing = editingId === conv.id;
    const isMenuOpen = openMenuId === conv.id;
    const isSelected = selectedConvIds?.has(conv.id);

    return (
      <li
        key={conv.id}
        className={`sidebar-chat-row ${isActive ? 'is-active' : ''} ${conv.is_pinned ? 'is-pinned' : ''} ${isSelected ? 'is-selected' : ''}`}
        onClick={() => {
          if (isSelectionMode) {
            onToggleSelectConv?.(conv.id);
          } else if (!isEditing && onSelectConversation) {
            onSelectConversation(conv.id);
            if (onClose) onClose();
          }
        }}
        role="listitem"
      >
        {/* Selection Checkbox (when in selection mode) */}
        {isSelectionMode ? (
          <div
            className="chat-row-checkbox-wrap"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelectConv?.(conv.id);
            }}
          >
            <div className={`chat-row-checkbox ${isSelected ? 'checked' : ''}`}>
              {isSelected && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
          </div>
        ) : (
          <div className="chat-row-icon">
            {conv.is_pinned ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M16 12V4H17V2H7V4H8V12L5 15V17H11V22L12 23L13 22V17H19V15L16 12Z" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            )}
          </div>
        )}

        {isEditing ? (
          <div className="chat-row-inline-edit" onClick={(e) => e.stopPropagation()}>
            <input
              ref={editInputRef}
              type="text"
              className="chat-rename-input"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => handleRenameKeyDown(e, conv.id)}
              onBlur={() => handleSaveRename(conv.id)}
              aria-label="Edit chat title"
            />
          </div>
        ) : (
          <div className="chat-row-text">
            <span className="chat-row-title" title={conv.title || 'New Conversation'}>
              {conv.title || 'New Conversation'}
            </span>
            <span className="chat-row-time">
              {formatTime(conv.updated_at || conv.created_at)}
            </span>
          </div>
        )}

        {/* Hover-only More Menu */}
        {!isSelectionMode && !isEditing && (
          <div className="conv-menu-container" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={`conv-item-action-btn ${isMenuOpen ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(isMenuOpen ? null : conv.id);
              }}
              title="More options"
              aria-label="Conversation options"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>

            {isMenuOpen && (
              <div className="conv-menu-popover" role="menu">
                <button
                  type="button"
                  className="conv-menu-item"
                  onClick={(e) => startRename(conv, e)}
                  role="menuitem"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  <span>Rename</span>
                </button>

                <button
                  type="button"
                  className="conv-menu-item"
                  onClick={(e) => handleTogglePin(conv, e)}
                  role="menuitem"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="17" x2="12" y2="22" />
                    <path d="M5 17h14v-2l-3-3V4h1V2H7v2h1v8l-3 3v2z" />
                  </svg>
                  <span>{conv.is_pinned ? 'Unpin' : 'Pin'}</span>
                </button>

                <div className="conv-menu-divider" />

                <button
                  type="button"
                  className="conv-menu-item delete-item"
                  onClick={(e) => handleDeleteSingle(conv.id, e)}
                  role="menuitem"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        )}
      </li>
    );
  };

  return (
    <>
      {isOpen && <div className="sidebar-mobile-backdrop" onClick={onClose} />}

      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`} aria-label="Chat conversations navigation">
        {/* Brand Bar */}
        <div className="sidebar-top-bar">
          <div className="sidebar-brand-lockup">
            <div className="sidebar-brand-glyph">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <div className="sidebar-brand-meta">
              <span className="sidebar-brand-name">DocChat</span>
            </div>
          </div>

          <div className="sidebar-top-actions">
            {onToggleSelectionMode && conversations.length > 0 && (
              <button
                type="button"
                className={`sidebar-mode-toggle-btn ${isSelectionMode ? 'active' : ''}`}
                onClick={onToggleSelectionMode}
                title={isSelectionMode ? 'Exit selection mode' : 'Select multiple chats'}
              >
                {isSelectionMode ? 'Done' : 'Select'}
              </button>
            )}

            {onClose && (
              <button
                type="button"
                className="sidebar-close-btn-mobile"
                onClick={onClose}
                aria-label="Close sidebar"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Action: + New Chat */}
        <div className="sidebar-new-chat-container">
          <button
            type="button"
            className="sidebar-primary-btn"
            onClick={() => {
              if (onNewChat) onNewChat();
              if (onClose) onClose();
            }}
            title="Start new conversation (Ctrl+K)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>New Chat</span>
            <kbd className="sidebar-shortcut-kbd">Ctrl K</kbd>
          </button>
        </div>

        {/* Search Bar */}
        <div className="sidebar-search-container">
          <div className="sidebar-search-box">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="sidebar-search-input"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search conversations"
            />
            {searchQuery && (
              <button
                type="button"
                className="sidebar-search-clear-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Multi-Select Action Bar (Active when in selection mode) */}
        {isSelectionMode && (
          <div className="sidebar-selection-action-bar">
            <div className="selection-bar-header">
              <span className="selection-count-badge">
                {selectedCount} selected
              </span>
              <div className="selection-bar-actions">
                <button
                  type="button"
                  className="selection-btn text-btn"
                  onClick={isAllSelected ? onClearSelection : onSelectAllConvs}
                >
                  {isAllSelected ? 'Deselect all' : 'Select all'}
                </button>
                <button
                  type="button"
                  className="selection-btn text-btn"
                  onClick={onToggleSelectionMode}
                >
                  Cancel
                </button>
              </div>
            </div>
            {selectedCount > 0 && (
              <button
                type="button"
                className="selection-delete-btn"
                onClick={onRequestBulkDelete}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                <span>Delete {selectedCount > 1 ? `(${selectedCount})` : ''}</span>
              </button>
            )}
          </div>
        )}

        {/* Scrollable Conversation List */}
        <div className="sidebar-threads-scroll">
          {loadingConversations ? (
            <div className="sidebar-skeleton-stack" aria-label="Loading conversations">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="sidebar-skeleton-row skeleton-shimmer">
                  <div className="skeleton-line medium" style={{ marginBottom: '6px' }} />
                  <div className="skeleton-line short" style={{ marginBottom: '0' }} />
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="sidebar-empty-threads">
              {searchQuery ? (
                <p className="empty-sub">No conversations match &ldquo;{searchQuery}&rdquo;</p>
              ) : (
                <p className="empty-sub">No conversations yet.</p>
              )}
            </div>
          ) : (
            <>
              {/* PINNED SECTION */}
              {pinnedList.length > 0 && (
                <div className="sidebar-section-group">
                  <div className="sidebar-section-header">
                    <span className="sidebar-section-label">Pinned</span>
                    <span className="sidebar-section-count">{pinnedList.length}</span>
                  </div>
                  <ul className="sidebar-threads-list" role="list">
                    {pinnedList.map(renderConversationRow)}
                  </ul>
                </div>
              )}

              {/* RECENT SECTION */}
              <div className="sidebar-section-group">
                <div className="sidebar-section-header">
                  <span className="sidebar-section-label">Recent</span>
                  <span className="sidebar-section-count">{recentList.length}</span>
                </div>
                {recentList.length === 0 && pinnedList.length > 0 ? (
                  <p className="sidebar-section-empty">All conversations pinned</p>
                ) : (
                  <ul className="sidebar-threads-list" role="list">
                    {recentList.map(renderConversationRow)}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>

        {/* Knowledge Base Toggle Control */}
        <div className="sidebar-kb-control-container">
          <button
            type="button"
            className={`sidebar-kb-control-btn ${docPanelOpen ? 'active' : ''}`}
            onClick={() => onToggleDocPanel?.()}
            title={docPanelOpen ? 'Close Knowledge Base' : 'Open Knowledge Base'}
            aria-label="Toggle Knowledge Base panel"
          >
            <div className="sidebar-kb-left">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <span className="sidebar-kb-title">Knowledge Base</span>
            </div>
            <div className="sidebar-kb-badge-wrap">
              {processingCount > 0 ? (
                <span className="sidebar-kb-badge processing">
                  <span className="pulse-dot" />
                  <span>{processingCount}</span>
                </span>
              ) : documentCount > 0 ? (
                <span className="sidebar-kb-badge ready">{documentCount}</span>
              ) : null}
            </div>
          </button>
        </div>

        {/* Account Row */}
        <div className="sidebar-footer-account">
          <div
            className="sidebar-account-card"
            onClick={onOpenSettings}
            title="Settings & Profile"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenSettings?.();
              }
            }}
          >
            <div className="sidebar-account-avatar">{userInitial}</div>
            <div className="sidebar-account-info">
              <span className="sidebar-account-name">{user?.name || 'User'}</span>
              <span className="sidebar-account-email">{user?.email || ''}</span>
            </div>
          </div>

          <div className="sidebar-footer-controls">
            <ThemeToggle />
            <button
              type="button"
              className="sidebar-signout-btn"
              onClick={onSignOut}
              title="Sign out"
              aria-label="Sign out"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
