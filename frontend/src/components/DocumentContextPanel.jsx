import { useState, useMemo } from 'react';
import FileUpload from './FileUpload';
import DocumentProcessingCard from './DocumentProcessingCard';
import './DocumentContextPanel.css';

export default function DocumentContextPanel({
  isOpen = false,
  onClose,
  documents = [],
  loadingDocs = false,
  processingDocs = {},
  onUploadComplete,
  onFilesQueued,
  onDismissProcessing,
  onDownloadDoc,
  onDeleteDoc,
  deletingDoc = null,
  downloadingDoc = null,
}) {
  const [docSearch, setDocSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Active processing jobs array
  const processingList = useMemo(() => {
    return Object.values(processingDocs);
  }, [processingDocs]);

  const activeProcessingCount = useMemo(() => {
    return processingList.filter(
      (d) => d.processing_stage !== 'COMPLETED' && d.processing_stage !== 'FAILED'
    ).length;
  }, [processingList]);

  // Client-side search across indexed documents
  const filteredDocs = useMemo(() => {
    if (!docSearch.trim()) return documents;
    const q = docSearch.toLowerCase();
    return documents.filter((d) => (d.filename || '').toLowerCase().includes(q));
  }, [documents, docSearch]);

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const getFormatBadge = (name) => {
    const ext = (name || '').split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <span className="doc-format-badge badge-pdf">PDF</span>;
    if (ext === 'docx') return <span className="doc-format-badge badge-docx">DOC</span>;
    return <span className="doc-format-badge badge-txt">TXT</span>;
  };

  const handleDeleteClick = (docId) => {
    setConfirmDeleteId(docId);
  };

  const handleConfirmDelete = async (docId) => {
    setConfirmDeleteId(null);
    if (onDeleteDoc) {
      await onDeleteDoc(docId);
    }
  };

  return (
    <aside
      className={`doc-context-panel ${isOpen ? 'is-open' : 'is-collapsed'}`}
      aria-label="Document Knowledge Base"
    >
      {/* Header */}
      <div className="doc-panel-header">
        <div className="doc-panel-title-group">
          <div className="doc-panel-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <div>
            <h3 className="doc-panel-heading">Knowledge Base</h3>
            <span className="doc-panel-subheading">
              {documents.length} document{documents.length === 1 ? '' : 's'} indexed
              {activeProcessingCount > 0 && ` • ${activeProcessingCount} processing`}
            </span>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            className="doc-panel-close-btn"
            onClick={onClose}
            title="Close knowledge panel"
            aria-label="Close knowledge panel"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      <div className="doc-panel-content">
        {/* Upload Drop Zone */}
        <section className="doc-panel-section upload-section">
          <FileUpload
            onUploadComplete={onUploadComplete}
            onFilesQueued={onFilesQueued}
          />
        </section>

        {/* Live Processing Pipeline */}
        {processingList.length > 0 && (
          <section className="doc-panel-section pipeline-section" aria-live="polite">
            <div className="doc-section-header">
              <span className="doc-section-title">Live Ingestion Pipeline</span>
              {activeProcessingCount > 0 && (
                <span className="pipeline-live-badge">
                  <span className="pulse-dot" />
                  <span>Processing</span>
                </span>
              )}
            </div>
            <div className="processing-cards-stack">
              {processingList.map((pDoc) => (
                <DocumentProcessingCard
                  key={pDoc.document_id}
                  doc={pDoc}
                  onDismiss={onDismissProcessing}
                />
              ))}
            </div>
          </section>
        )}

        {/* Indexed Documents Library */}
        <section className="doc-panel-section library-section">
          <div className="doc-section-header">
            <span className="doc-section-title">Indexed Files</span>
            <span className="doc-section-count">{documents.length}</span>
          </div>

          {/* Quick Search */}
          {documents.length > 3 && (
            <div className="doc-search-box">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="doc-search-input"
                placeholder="Filter files…"
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                aria-label="Filter indexed files"
              />
              {docSearch && (
                <button
                  type="button"
                  className="doc-search-clear"
                  onClick={() => setDocSearch('')}
                  aria-label="Clear document filter"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {loadingDocs && documents.length === 0 ? (
            <div className="doc-skeleton-list">
              {[1, 2, 3].map((i) => (
                <div key={i} className="doc-skeleton-item skeleton-shimmer">
                  <div className="skeleton-line medium" style={{ marginBottom: '6px' }} />
                  <div className="skeleton-line short" style={{ marginBottom: '0' }} />
                </div>
              ))}
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="doc-empty-state">
              {docSearch ? (
                <p className="doc-empty-text">No files match &ldquo;{docSearch}&rdquo;</p>
              ) : (
                <>
                  <div className="doc-empty-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <p className="doc-empty-title">No documents yet</p>
                  <p className="doc-empty-desc">
                    Upload PDF, DOCX, or TXT above to ground AI answers with verifiable citations.
                  </p>
                </>
              )}
            </div>
          ) : (
            <ul className="doc-library-list" role="list">
              {filteredDocs.map((doc) => {
                const isDeleting = deletingDoc === doc.document_id;
                const isDownloading = downloadingDoc === doc.document_id;
                const isConfirming = confirmDeleteId === doc.document_id;

                return (
                  <li key={doc.document_id} className="doc-library-item" role="listitem">
                    <div className="doc-library-main">
                      <div className="doc-badge-wrap">{getFormatBadge(doc.filename)}</div>
                      <div className="doc-library-details">
                        <span className="doc-library-name" title={doc.filename}>
                          {doc.filename}
                        </span>
                        <div className="doc-library-meta">
                          <span className="doc-chunk-info">
                            {doc.chunk_count || 0} chunk{doc.chunk_count === 1 ? '' : 's'}
                          </span>
                          {doc.file_size ? (
                            <>
                              <span className="doc-meta-dot">•</span>
                              <span className="doc-size-info">{formatSize(doc.file_size)}</span>
                            </>
                          ) : null}
                          <span className="doc-status-ready">Ready</span>
                        </div>
                      </div>
                    </div>

                    {isConfirming ? (
                      <div className="doc-delete-confirm-box">
                        <span className="doc-confirm-msg">Delete file?</span>
                        <button
                          type="button"
                          className="doc-confirm-yes-btn"
                          onClick={() => handleConfirmDelete(doc.document_id)}
                          aria-label="Confirm delete"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          className="doc-confirm-cancel-btn"
                          onClick={() => setConfirmDeleteId(null)}
                          aria-label="Cancel delete"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="doc-library-actions">
                        <button
                          type="button"
                          className="doc-action-icon-btn"
                          onClick={() => onDownloadDoc && onDownloadDoc(doc)}
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

                        <button
                          type="button"
                          className="doc-action-icon-btn delete"
                          onClick={() => handleDeleteClick(doc.document_id)}
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
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </aside>
  );
}
