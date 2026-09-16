import { useState, useEffect, useCallback, useRef } from 'react';
import FileUpload from './FileUpload';
import DocumentProcessingCard from './DocumentProcessingCard';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../contexts/AuthContext';
import { getDocuments, deleteDocument, getDocumentStatus, downloadDocumentFile } from '../api/client';
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
  onOpenSettings,
  onSignOut,
}) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'docs'
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [deletingDoc, setDeletingDoc] = useState(null);
  const [downloadingDoc, setDownloadingDoc] = useState(null);
  const [deletingConv, setDeletingConv] = useState(null);

  // Active document processing jobs: { [docId]: statusData }
  const [processingDocs, setProcessingDocs] = useState({});
  const pollingTimersRef = useRef({});

  /* ── Fetch documents ── */
  const fetchDocs = useCallback(async () => {
    try {
      setLoadingDocs(true);
      const data = await getDocuments();
      const docList = data.documents || [];
      setDocuments(docList);

      // Check if any indexed doc from server is currently in an active processing stage
      docList.forEach((d) => {
        const stage = d.processing_stage || d.status;
        const isTerminal = stage === 'COMPLETED' || stage === 'FAILED' || stage === 'processed';
        if (!isTerminal && d.document_id) {
          setProcessingDocs((prev) => {
            if (prev[d.document_id]) return prev;
            return {
              ...prev,
              [d.document_id]: {
                document_id: d.document_id,
                filename: d.filename,
                processing_stage: stage || 'QUEUED',
                progress: d.progress || 25,
                message: d.message || 'Processing in background…',
                chunk_count: d.chunk_count || 0,
                processed_chunks: d.processed_chunks || 0,
                error: null,
              },
            };
          });
        }
      });

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

  /* ── Status Polling per document ── */
  const pollDocumentStatus = useCallback(
    async (docId) => {
      try {
        const statusData = await getDocumentStatus(docId);

        setProcessingDocs((prev) => {
          if (!prev[docId]) return prev;
          return {
            ...prev,
            [docId]: {
              ...prev[docId],
              ...statusData,
            },
          };
        });

        const stage = statusData.processing_stage || statusData.status;

        if (stage === 'COMPLETED') {
          // Terminal completion
          if (pollingTimersRef.current[docId]) {
            clearTimeout(pollingTimersRef.current[docId]);
            delete pollingTimersRef.current[docId];
          }
          await fetchDocs();
          return;
        }

        if (stage === 'FAILED') {
          // Terminal failure
          if (pollingTimersRef.current[docId]) {
            clearTimeout(pollingTimersRef.current[docId]);
            delete pollingTimersRef.current[docId];
          }
          return;
        }

        // Schedule next poll in 750ms
        pollingTimersRef.current[docId] = setTimeout(() => {
          pollDocumentStatus(docId);
        }, 750);
      } catch (err) {
        console.warn(`Transient status poll error for ${docId}:`, err);
        // Retry gracefully after 1500ms without crashing or spamming
        pollingTimersRef.current[docId] = setTimeout(() => {
          pollDocumentStatus(docId);
        }, 1500);
      }
    },
    [fetchDocs]
  );

  // Monitor processingDocs and start polling for active docs not yet in pollingTimers
  useEffect(() => {
    Object.entries(processingDocs).forEach(([docId, doc]) => {
      const stage = doc.processing_stage || doc.status;
      const isTerminal = stage === 'COMPLETED' || stage === 'FAILED';
      if (!isTerminal && !pollingTimersRef.current[docId]) {
        // Start polling immediately
        pollDocumentStatus(docId);
      }
    });
  }, [processingDocs, pollDocumentStatus]);

  // Clean up all polling timers on unmount
  useEffect(() => {
    const timers = pollingTimersRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  /* ── Queued files from upload ── */
  const handleFilesQueued = (newJobs) => {
    setActiveTab('docs');
    setProcessingDocs((prev) => {
      const updated = { ...prev };
      newJobs.forEach((job) => {
        const id = job.document_id || job.id;
        if (id) {
          updated[id] = {
            document_id: id,
            filename: job.filename,
            processing_stage: job.processing_stage || job.status || 'UPLOADED',
            progress: job.progress ?? 25,
            message: job.message || 'Uploaded to server',
            chunk_count: job.chunk_count || 0,
            processed_chunks: job.processed_chunks || 0,
            error: null,
          };
        }
      });
      return updated;
    });
  };

  const handleDismissProcessing = (docId) => {
    if (pollingTimersRef.current[docId]) {
      clearTimeout(pollingTimersRef.current[docId]);
      delete pollingTimersRef.current[docId];
    }
    setProcessingDocs((prev) => {
      const copy = { ...prev };
      delete copy[docId];
      return copy;
    });
  };

  /* ── Download Document ── */
  const handleDownloadDoc = async (doc) => {
    if (downloadingDoc) return;
    setDownloadingDoc(doc.document_id);
    try {
      await downloadDocumentFile(doc.document_id, doc.filename);
    } catch (err) {
      alert(`Download failed: ${err.message}`);
    } finally {
      setDownloadingDoc(null);
    }
  };

  /* ── Delete Document ── */
  const handleDeleteDoc = async (docId) => {
    if (deletingDoc) return;
    setDeletingDoc(docId);
    // Optimistically update list
    const previousDocs = documents;
    setDocuments((prev) => prev.filter((d) => d.document_id !== docId));
    try {
      await deleteDocument(docId);
      await fetchDocs();
    } catch (err) {
      setDocuments(previousDocs);
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

  const activeProcessingCount = Object.values(processingDocs).filter(
    (d) => d.processing_stage !== 'COMPLETED' && d.processing_stage !== 'FAILED'
  ).length;

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <>
      {isOpen && <div className="sidebar-mobile-backdrop" onClick={onClose} />}

      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        {/* Header & Logo */}
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
              <span className="sidebar-app-title">DocChat AI</span>
              <span className="sidebar-app-badge">RAG Workspace</span>
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

        {/* Primary Action: New Chat */}
        <div className="sidebar-action-wrap">
          <button
            type="button"
            className="sidebar-new-chat-btn"
            onClick={() => {
              if (onNewChat) onNewChat();
              if (onClose) onClose();
            }}
            title="Start a new chat thread (Ctrl+K)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>New Chat</span>
            <span className="shortcut-hint">Ctrl K</span>
          </button>
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
            {activeProcessingCount > 0 ? (
              <span className="sidebar-tab-badge badge-active-proc" title={`${activeProcessingCount} processing`}>
                {activeProcessingCount}
              </span>
            ) : (
              <span className="sidebar-tab-badge">{documents.length}</span>
            )}
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="sidebar-scrollable-content">
          {/* ── CHATS TAB ── */}
          {activeTab === 'chats' && (
            <div className="sidebar-pane-chats">
              <div className="sidebar-section-header">
                <span className="section-title">Previous Chats</span>
              </div>

              {loadingConversations ? (
                <div className="skeleton-conversation-list" aria-label="Loading conversations">
                  {[1, 2, 3, 4, 5].map((idx) => (
                    <div key={idx} className="skeleton-conversation-item skeleton-shimmer">
                      <div className="skeleton-line medium" style={{ marginBottom: '6px' }} />
                      <div className="skeleton-line short" style={{ marginBottom: '0' }} />
                    </div>
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <p className="empty-title">No previous chats</p>
                  <p className="empty-hint">Start a conversation to analyze documents with verifiable citations.</p>
                </div>
              ) : (
                <ul className="conversation-list" role="list">
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
                        role="listitem"
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
          )}

          {/* ── DOCUMENTS TAB ── */}
          {activeTab === 'docs' && (
            <div className="sidebar-pane-docs">
              <FileUpload
                onUploadComplete={fetchDocs}
                onFilesQueued={handleFilesQueued}
              />

              {/* Active Document Processing Queue */}
              {Object.keys(processingDocs).length > 0 && (
                <div className="processing-queue-section">
                  <div className="queue-section-header">
                    <span className="queue-title">Live Ingestion Pipeline</span>
                    <span className="pulse-dot" />
                  </div>
                  <div className="processing-cards-container">
                    {Object.values(processingDocs).map((pDoc) => (
                      <DocumentProcessingCard
                        key={pDoc.document_id}
                        doc={pDoc}
                        onDismiss={handleDismissProcessing}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Indexed Files Section */}
              <div className="documents-section">
                <div className="documents-section-header">
                  <div className="documents-title-row">
                    <span className="documents-title">Indexed Files</span>
                    <span className="doc-count-badge">{documents.length}</span>
                  </div>
                </div>

                {loadingDocs && documents.length === 0 ? (
                  <div className="skeleton-doc-list">
                    {[1, 2, 3].map((idx) => (
                      <div key={idx} className="skeleton-card skeleton-shimmer">
                        <div className="skeleton-line medium" style={{ marginBottom: '6px' }} />
                        <div className="skeleton-line short" style={{ marginBottom: '0' }} />
                      </div>
                    ))}
                  </div>
                ) : documents.length === 0 && Object.keys(processingDocs).length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                        <polyline points="13 2 13 9 20 9" />
                      </svg>
                    </div>
                    <p className="empty-title">No documents yet</p>
                    <p className="empty-hint">Upload PDF, DOCX, or TXT above to ground AI answers with verifiable citations.</p>
                  </div>
                ) : (
                  <ul className="document-list" role="list">
                    {documents.map((doc) => {
                      const isDeleting = deletingDoc === doc.document_id;
                      const isDownloading = downloadingDoc === doc.document_id;
                      return (
                        <li key={doc.document_id} className="document-item" role="listitem">
                          <div className="doc-info">
                            <div className="doc-badge-col">{getFormatBadge(doc.filename)}</div>
                            <div className="doc-details">
                              <span className="doc-name" title={doc.filename}>
                                {doc.filename}
                              </span>
                              <div className="doc-meta-row">
                                <span className="doc-meta">
                                  {doc.chunk_count} chunks
                                  {doc.file_size ? ` • ${formatSize(doc.file_size)}` : ''}
                                </span>
                                <span className="doc-status-pill ready">Ready</span>
                              </div>
                            </div>
                          </div>

                          <div className="doc-actions">
                            {/* Download Action */}
                            <button
                              type="button"
                              className="doc-action-btn download-btn"
                              onClick={() => handleDownloadDoc(doc)}
                              disabled={isDownloading || isDeleting}
                              title={`Download ${doc.filename}`}
                              aria-label={`Download ${doc.filename}`}
                            >
                              {isDownloading ? (
                                <span className="spinner-small" />
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                  <polyline points="7 10 12 15 17 10" />
                                  <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                              )}
                            </button>

                            {/* Delete Action */}
                            <button
                              type="button"
                              className="doc-action-btn delete-btn"
                              onClick={() => handleDeleteDoc(doc.document_id)}
                              disabled={isDeleting || isDownloading}
                              title={`Delete ${doc.filename}`}
                              aria-label={`Delete ${doc.filename}`}
                            >
                              {isDeleting ? (
                                <span className="spinner-small" />
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── User & Profile Section at Bottom ── */}
        <div className="sidebar-footer">
          <div
            className="sidebar-user-card"
            onClick={onOpenSettings}
            title="Open Account Settings"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenSettings?.();
              }
            }}
          >
            <div className="sidebar-user-avatar">{initial}</div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.name || 'User'}</span>
              <span className="sidebar-user-email">{user?.email || ''}</span>
            </div>
            <div className="sidebar-user-gear">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
          </div>

          <div className="sidebar-footer-actions">
            <ThemeToggle />
            <button
              type="button"
              className="sidebar-signout-btn"
              onClick={onSignOut}
              title="Sign out of your session"
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
