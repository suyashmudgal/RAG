import { useState, useRef, useCallback } from 'react';
import { uploadFiles } from '../api/client';
import './FileUpload.css';

const ALLOWED_EXTS = ['.pdf', '.docx', '.txt'];
const MAX_SIZE_MB = 50;

export default function FileUpload({ onUploadComplete, onFilesQueued }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null);
  const inputRef = useRef(null);

  /* ── validation ─────────────────────────────────────────────────────── */
  const validate = (files) => {
    const valid = [];
    const errors = [];
    for (const f of files) {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_EXTS.includes(ext)) {
        errors.push(`${f.name}: unsupported format (only PDF, DOCX, TXT allowed)`);
      } else if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        errors.push(`${f.name}: exceeds ${MAX_SIZE_MB} MB limit`);
      } else {
        valid.push(f);
      }
    }
    return { valid, errors };
  };

  /* ── upload handler ─────────────────────────────────────────────────── */
  const handleUpload = useCallback(
    async (fileList) => {
      const { valid, errors } = validate(fileList);

      if (errors.length && !valid.length) {
        setStatus({ type: 'error', msgs: errors });
        return;
      }
      if (!valid.length) return;

      setUploading(true);
      setStatus({ type: 'uploading', msgs: [`Uploading ${valid.length} file(s) to server…`] });

      try {
        const data = await uploadFiles(valid);
        const results = data.results || [];
        const ok = results.filter((r) => r.status !== 'error' && (r.document_id || r.id));
        const fail = results.filter((r) => r.status === 'error');

        // Immediately notify parent with the queued document jobs
        if (ok.length > 0) {
          if (onFilesQueued) {
            onFilesQueued(ok);
          }
          if (onUploadComplete) {
            onUploadComplete();
          }
        }

        const msgs = [
          ...(ok.length ? [`Started processing ${ok.length} file(s) in background`] : []),
          ...fail.map((f) => `${f.filename}: ${f.message}`),
          ...errors.map((e) => `Warning: ${e}`),
        ];

        setStatus({
          type: fail.length && !ok.length ? 'error' : 'success',
          msgs,
        });
      } catch (err) {
        setStatus({ type: 'error', msgs: [err.message || 'Upload failed'] });
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [onUploadComplete, onFilesQueued]
  );

  /* ── drag handlers ──────────────────────────────────────────────────── */
  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) handleUpload(Array.from(e.dataTransfer.files));
  };

  return (
    <div className="file-upload">
      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''} ${uploading ? 'uploading' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !uploading) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Upload PDF, DOCX, or TXT documents"
      >
        {uploading ? (
          <div className="uploading-state">
            <div className="spinner" />
            <span className="uploading-text">Uploading to server…</span>
          </div>
        ) : (
          <div className="drop-zone-content">
            <div className="upload-icon-circle">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <span className="upload-primary-text">Drop documents here or click to browse</span>
            <div className="upload-format-tags">
              <span className="upload-format-chip">PDF</span>
              <span className="upload-format-chip">DOCX</span>
              <span className="upload-format-chip">TXT</span>
              <span className="upload-format-sep">•</span>
              <span className="upload-format-max">Max {MAX_SIZE_MB}MB</span>
            </div>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.txt"
        onChange={(e) => handleUpload(Array.from(e.target.files || []))}
        style={{ display: 'none' }}
        aria-hidden="true"
      />

      {status && (
        <div className={`upload-status status-${status.type}`}>
          <div className="status-msgs">
            {status.msgs.map((m, i) => (
              <p key={i} className="status-msg-line">
                {m}
              </p>
            ))}
          </div>
          <button
            type="button"
            className="dismiss-status-btn"
            onClick={() => setStatus(null)}
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
