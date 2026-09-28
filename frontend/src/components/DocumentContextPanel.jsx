import { useState, useMemo } from 'react';
import FileUpload from './FileUpload';
import DocumentProcessingCard from './DocumentProcessingCard';
import DeleteDocumentModal from './DeleteDocumentModal';
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
  
  const [docToDelete, setDocToDelete] = useState(null);
  const [isDeletingModalDoc, setIsDeletingModalDoc] = useState(false);
  const [deleteModalError, setDeleteModalError] = useState(null);

  const processingList = useMemo(() => {
    return Object.values(processingDocs);
  }, [processingDocs]);

  const activeProcessingCount = useMemo(() => {
    return processingList.filter(
      (d) => d.processing_stage !== 'COMPLETED' && d.processing_stage !== 'FAILED'
    ).length;
  }, [processingList]);

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

  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const getFormatBadge = (name) => {
    const ext = (name || '').split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <span className="doc-format-badge badge-pdf">PDF</span>;
    if (ext === 'docx') return <span className="doc-format-badge badge-docx">DOC</span>;
    return <span className="doc-format-badge badge-txt">TXT</span>;
  };

  const handleConfirmModalDelete = async () => {
    if (!docToDelete || isDeletingModalDoc) return;
    setIsDeletingModalDoc(true);
    setDeleteModalError(null);
    try {
      if (onDeleteDoc) {
        await onDeleteDoc(docToDelete.document_id);
      }
      setDocToDelete(null);
    } catch (err) {
      setDeleteModalError(err.message || 'Failed to delete document.');
    } finally {
      setIsDeletingModalDoc(false);
    }
  };

  return (
    <>
      {isOpen && <div className="doc-panel-mobile-backdrop" onClick={onClose} />}

      <aside
        className={`doc-context-panel ${isOpen ? 'is-open' : 'is-collapsed'}`}
        aria-label="Knowledge Base"
      >
        {/* Header */}
        <div className="doc-panel-header">
          <div className="doc-panel-title-group">
            <div className="doc-panel-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <div>
              <h3 className="doc-panel-heading">Knowledge Base</h3>
              <span className="doc-panel-subheading">
                {documents.length} document{documents.length === 1 ? '' : 's'}
                {activeProcessingCount > 0 && ` &bull; ${activeProcessingCount} processing`}
              </span>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              className="doc-panel-close-btn"
              onClick={onClose}
              title="Close Knowledge Base"
              aria-label="Close Knowledge Base"
            >
              ✕
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

          {/* Live Ingestion Pipeline */}
          {processingList.length > 0 && (
            <section className="doc-panel-section pipeline-section" aria-live="polite">
              <div className="doc-section-header">
                <span className="doc-section-title">Processing</span>
                {activeProcessingCount > 0 && (
                  <span className="pipeline-live-badge">
                    <span className="pulse-dot" />
                    <span>In progress</span>
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
              <span className="doc-section-title">Documents</span>
              <span className="doc-section-count">{documents.length}</span>
            </div>

            {/* Document Search Filter */}
            {documents.length > 1 && (
              <div className="doc-search-box">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  className="doc-search-input"
                  placeholder="Filter documents…"
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  aria-label="Filter documents"
                />
                {docSearch && (
                  <button
                    type="button"
                    className="doc-search-clear"
                    onClick={() => setDocSearch('')}
                    aria-label="Clear filter"
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
                  <p className="doc-empty-text">No documents match &ldquo;{docSearch}&rdquo;</p>
                ) : (
                  <p className="doc-empty-desc">
                    No documents indexed yet. Upload a PDF, DOCX, or TXT above.
                  </p>
                )}
              </div>
            ) : (
              <ul className="doc-library-list" role="list">
                {filteredDocs.map((doc) => {
                  const isDeleting = deletingDoc === doc.document_id || (isDeletingModalDoc && docToDelete?.document_id === doc.document_id);
                  const isDownloading = downloadingDoc === doc.document_id;
                  const activeJob = processingDocs[doc.document_id];
                  const isProcessing = activeJob && activeJob.processing_stage !== 'COMPLETED' && activeJob.processing_stage !== 'FAILED';

                  return (
                    <li key={doc.document_id} className="doc-library-item" role="listitem">
                      <div className="doc-library-main">
                        <div className="doc-badge-wrap">{getFormatBadge(doc.filename)}</div>
                        <div className="doc-library-details">
                          <span className="doc-library-name" title={doc.filename}>
                            {doc.filename}
                          </span>
                          <div className="doc-library-meta">
                            <span className="doc-status-pill ready">Ready</span>
                            {doc.chunk_count > 0 && (
                              <span className="doc-chunk-info">
                                &bull; {doc.chunk_count} chunks
                              </span>
                            )}
                            {doc.file_size && (
                              <span className="doc-size-info">
                                &bull; {formatSize(doc.file_size)}
                              </span>
                            )}
                            {doc.created_at && (
                              <span className="doc-date-info">
                                &bull; {formatDate(doc.created_at)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

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
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                          )}
                        </button>

                        <button
                          type="button"
                          className="doc-action-icon-btn delete"
                          onClick={() => {
                            setDocToDelete(doc);
                            setDeleteModalError(null);
                          }}
                          disabled={isDeleting || isDownloading}
                          title={`Delete ${doc.filename}`}
                          aria-label={`Delete ${doc.filename}`}
                        >
                          {isDeleting ? (
                            <span className="spinner-small" />
                          ) : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          </section>
        </div>

        {/* Delete Confirmation Modal */}
        <DeleteDocumentModal
          isOpen={Boolean(docToDelete)}
          doc={docToDelete}
          isDeleting={isDeletingModalDoc}
          error={deleteModalError}
          onConfirm={handleConfirmModalDelete}
          onCancel={() => {
            if (!isDeletingModalDoc) {
              setDocToDelete(null);
              setDeleteModalError(null);
            }
          }}
        />
      </aside>
    </>
  );
}
