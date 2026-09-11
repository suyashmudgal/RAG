import { useState, useEffect, useCallback } from 'react';
import FileUpload from './FileUpload';
import { getDocuments, deleteDocument } from '../api/client';
import './Sidebar.css';

export default function Sidebar({ isOpen = false, onClose }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  /* ── fetch ──────────────────────────────────────────────────────────── */

  const fetchDocs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getDocuments();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  /* ── delete ─────────────────────────────────────────────────────────── */

  const handleDelete = async (docId) => {
    if (deleting) return;
    setDeleting(docId);
    try {
      await deleteDocument(docId);
      await fetchDocs();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setDeleting(null);
    }
  };

  /* ── helpers ────────────────────────────────────────────────────────── */

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

  /* ── render ─────────────────────────────────────────────────────────── */

  return (
    <>
      {/* Mobile backdrop overlay */}
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
              <h2 className="sidebar-app-title">Knowledge Base</h2>
              <span className="sidebar-app-subtitle">ChromaDB Vector Store</span>
            </div>
          </div>

          {/* Close button on mobile */}
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

        {/* Upload Dropzone */}
        <FileUpload onUploadComplete={fetchDocs} />

        {/* Documents Section */}
        <div className="documents-section">
          <div className="documents-section-header">
            <div className="documents-title-row">
              <span className="documents-title">Indexed Files</span>
              <span className="doc-count-badge">{documents.length}</span>
            </div>
          </div>

          {loading ? (
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
                        {doc.file_size ? ` · ${formatSize(doc.file_size)}` : ''}
                      </span>
                    </div>
                  </div>

                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(doc.document_id)}
                    disabled={deleting === doc.document_id}
                    title="Remove document from vector store"
                    aria-label={`Delete ${doc.filename}`}
                  >
                    {deleting === doc.document_id ? (
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
      </aside>
    </>
  );
}
