import { useState, useEffect, useCallback } from 'react';
import FileUpload from './FileUpload';
import { getDocuments, deleteDocument } from '../api/client';
import './Sidebar.css';

export default function Sidebar({
  isOpen = false,
  onClose,
  conversations = [],
  activeConversationId = null,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  loadingConversations = false,
  onDocsChanged,
}) {
  const [activeTab, setActiveTab] = useState('chats');
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [deletingDoc, setDeletingDoc] = useState(null);
  const [deletingConv, setDeletingConv] = useState(null);

  /* ── Fetch documents ── */
  const fetchDocs = useCallback(async () => {
    try {
      setLoadingDocs(true);
      const data = await getDocuments();
      setDocuments(data.documents || []);
      if (onDocsChanged) onDocsChanged();
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  }, [onDocsChanged]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  /* ── Delete Document ── */
  const handleDeleteDoc = async (docId) => {
    if (deletingDoc) return;
    setDeletingDoc(docId);
    try {
      await deleteDocument(docId);
      await fetchDocs();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setDeletingDoc(null);
    }
  };

  /* ── Delete Conversation ── */
  const handleDeleteConv = async (convId, e) => {
    e.stopPropagation();
    if (deletingConv) return;
    setDeletingConv(convId);
    try {
      if (onDeleteConversation) {
        await onDeleteConversation(convId);
      }
    } finally {
      setDeletingConv(null);
    }
  };

  const getFormatBadge = (name) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <span className="doc-type-tag tag-pdf">PDF</span>;
    if (ext === 'docx') return <span className="doc-type-tag tag-docx">DOC</span>;
    return <span className="doc-type-tag tag-txt">TXT</span>;
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const formatTimestamp = (isoString) => {
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

  return (
    <>
      {isOpen && <div className="sidebar-mobile-backdrop" onClick={onClose} />}

      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <div className="sidebar-brand-text">
              <h2 className="sidebar-app-title">DocChat AI</h2>
              <span className="sidebar-app-subtitle">RAG & Conversations</span>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              className="sidebar-close-mobile-btn"
              onClick={onClose}
              aria-label="Close Sidebar"
            >
              ✕
            </button>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="sidebar-tabs">
          <button
            type="button"
            className={`sidebar-tab-btn ${activeTab === 'chats' ? 'active' : ''}`}
            onClick={() => setActiveTab('chats')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>Chats</span>
            <span className="sidebar-tab-badge">{conversations.length}</span>
          </button>
          <button
            type="button"
            className={`sidebar-tab-btn ${activeTab === 'docs' ? 'active' : ''}`}
            onClick={() => setActiveTab('docs')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
              <polyline points="13 2 13 9 20 9" />
            </svg>
            <span>Documents</span>
            <span className="sidebar-tab-badge">{documents.length}</span>
          </button>
        </div>

        {/* CHATS TAB */}
        {activeTab === 'chats' && (
          <div className="sidebar-conversations-pane">
            <button
              type="button"
              className="sidebar-new-chat-btn"
              onClick={() => {
                if (onNewChat) onNewChat();
                if (onClose) onClose();
              }}
              title="Start a new chat thread"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>New Chat</span>
            </button>

            <div className="conversations-section">
              <div className="conversations-section-header">
                <span className="section-title">Previous Chats</span>
              </div>

              {loadingConversations ? (
                <div className="loading-state">
                  <div className="spinner" />
                  <span>Loading history…</span>
                </div>
              ) : conversations.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <p className="empty-title">No chats yet</p>
                  <p className="empty-hint">Start a new conversation to ask questions with citations.</p>
                </div>
              ) : (
                <ul className="conversation-list">
                  {conversations.map((conv) => {
                    const isActive = conv.id === activeConversationId;
                    return (
                      <li
                        key={conv.id}
                        className={`conversation-item ${isActive ? 'active' : ''}`}
                        onClick={() => {
                          if (onSelectConversation) onSelectConversation(conv.id);
                          if (onClose) onClose();
                        }}
                        title={conv.title}
                      >
                        <div className="conv-icon">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                        </div>
                        <div className="conv-details">
                          <span className="conv-title">{conv.title || 'New Conversation'}</span>
                          <span className="conv-date">{formatTimestamp(conv.updated_at || conv.created_at)}</span>
                        </div>
                        <button
                          type="button"
                          className="delete-conv-btn"
                          onClick={(e) => handleDeleteConv(conv.id, e)}
                          disabled={deletingConv === conv.id}
                          title="Delete conversation"
                          aria-label={`Delete ${conv.title}`}
                        >
                          {deletingConv === conv.id ? (
                            <span className="spinner-small" />
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* DOCUMENTS TAB */}
        {activeTab === 'docs' && (
          <div className="sidebar-documents-pane">
            <FileUpload onUploadComplete={fetchDocs} />

            <div className="documents-section">
              <div className="documents-section-header">
                <div className="documents-title-row">
                  <span className="documents-title">Indexed Files</span>
                  <span className="doc-count-badge">{documents.length}</span>
                </div>
              </div>

              {loadingDocs ? (
                <div className="loading-state">
                  <div className="spinner" />
                  <span>Indexing documents…</span>
                </div>
              ) : documents.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                      <polyline points="13 2 13 9 20 9" />
                    </svg>
                  </div>
                  <p className="empty-title">No documents uploaded</p>
                  <p className="empty-hint">Drop PDF, DOCX, or TXT files above to query them with citations</p>
                </div>
              ) : (
                <ul className="document-list">
                  {documents.map((doc) => (
                    <li key={doc.document_id} className="document-item">
                      <div className="doc-info">
                        <div className="doc-badge-col">{getFormatBadge(doc.filename)}</div>
                        <div className="doc-details">
                          <span className="doc-name" title={doc.filename}>
                            {doc.filename}
                          </span>
                          <span className="doc-meta">
                            {doc.chunk_count} chunks
                            {doc.file_size ? ` • ${formatSize(doc.file_size)}` : ''}
                          </span>
                        </div>
                      </div>

                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteDoc(doc.document_id)}
                        disabled={deletingDoc === doc.document_id}
                        title="Remove document from vector store"
                        aria-label={`Delete ${doc.filename}`}
                      >
                        {deletingDoc === doc.document_id ? (
                          <span className="spinner-small" />
                        ) : (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
