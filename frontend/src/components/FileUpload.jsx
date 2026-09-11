import { useState, useRef, useCallback } from 'react';
import { uploadFiles } from '../api/client';
import './FileUpload.css';

const ALLOWED_EXTS = ['.pdf', '.docx', '.txt'];
const MAX_SIZE_MB = 50;

export default function FileUpload({ onUploadComplete }) {
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
        errors.push(`${f.name}: unsupported format`);
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
      setStatus({ type: 'uploading', msgs: [`Processing ${valid.length} file(s)…`] });

      try {
        const data = await uploadFiles(valid);
        const results = data.results || [];
        const ok = results.filter((r) => r.status !== 'error');
        const fail = results.filter((r) => r.status === 'error');

        const msgs = [
          ...(ok.length ? [`Successfully indexed ${ok.length} file(s)`] : []),
          ...fail.map((f) => `${f.filename}: ${f.message}`),
          ...errors.map((e) => `Warning: ${e}`),
        ];

        setStatus({
          type: fail.length && !ok.length ? 'error' : 'success',
          msgs,
        });

        if (ok.length) onUploadComplete?.();
      } catch (err) {
        setStatus({ type: 'error', msgs: [err.message] });
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [onUploadComplete]
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

  /* ── render ─────────────────────────────────────────────────────────── */

  return (
    <div className="file-upload">
      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''} ${uploading ? 'uploading' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload files"
      >
        {uploading ? (
          <div className="uploading-state">
            <div className="spinner" />
            <span className="uploading-text">Indexing into ChromaDB…</span>
          </div>
        ) : (
          <div className="drop-zone-content">
            <div className="upload-icon-circle">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <span className="upload-primary-text">Click to upload or drag &amp; drop</span>
            <span className="upload-sub-text">PDF, DOCX, TXT · Max {MAX_SIZE_MB}MB</span>
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
