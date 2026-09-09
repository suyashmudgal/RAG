import { useState, useEffect, useCallback } from 'react';
import FileUpload from './FileUpload';
import { getDocuments, deleteDocument } from '../api/client';
import './Sidebar.css';

export default function Sidebar() {
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

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

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

  const icon = (name) => {
    const ext = name.split('.').pop()?.toLowerCase();
    return ext === 'pdf' ? '📕' : ext === 'docx' ? '📘' : '📄';
  };

  const size = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  /* ── render ─────────────────────────────────────────────────────────── */

  return (
    <aside className="sidebar">
      {/* header */}
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon">🤖</span>
          <h1>DocChat AI</h1>
        </div>
        <p className="tagline">Chat with your documents</p>
      </div>

      {/* upload */}
      <FileUpload onUploadComplete={fetchDocs} />

      {/* document list */}
      <div className="documents-section">
        <h2 className="section-title">
          <span>📚</span> Documents
          <span className="doc-count">{documents.length}</span>
        </h2>

        {loading ? (
          <div className="loading-state"><div className="spinner" /><span>Loading…</span></div>
        ) : documents.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📂</span>
            <p>No documents uploaded yet</p>
            <p className="empty-hint">Upload PDF, DOCX, or TXT files to get started</p>
          </div>
        ) : (
          <ul className="document-list">
            {documents.map((doc) => (
              <li key={doc.document_id} className="document-item">
                <div className="doc-info">
                  <span className="doc-icon">{icon(doc.filename)}</span>
                  <div className="doc-details">
                    <span className="doc-name" title={doc.filename}>{doc.filename}</span>
                    <span className="doc-meta">
                      {doc.chunk_count} chunks{doc.file_size ? ` · ${size(doc.file_size)}` : ''}
                    </span>
                  </div>
                </div>
                <button
                  className="delete-btn"
                  onClick={() => handleDelete(doc.document_id)}
                  disabled={deleting === doc.document_id}
                  title="Delete document"
                >
                  {deleting === doc.document_id ? <span className="spinner-small" /> : '🗑️'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
