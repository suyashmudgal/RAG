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
        errors.push(`${f.name}: exceeds ${MAX_SIZE_MB} MB`);
      } else {
        valid.push(f);
      }
    }
    return { valid, errors };
  };

  /* ── upload handler ─────────────────────────────────────────────────── */

  const handleUpload = useCallback(async (fileList) => {
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
        ...(ok.length ? [`✅ ${ok.length} file(s) processed`] : []),
        ...fail.map((f) => `❌ ${f.filename}: ${f.message}`),
        ...errors.map((e) => `⚠️ ${e}`),
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
  }, [onUploadComplete]);

  /* ── drag handlers ──────────────────────────────────────────────────── */

  const onDragOver  = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
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
      >
        {uploading ? (
          <>
            <div className="spinner" />
            <span>Processing documents…</span>
          </>
        ) : (
          <>
            <span className="upload-icon">⬆️</span>
            <span className="upload-text">Drop files or click to upload</span>
            <span className="upload-hint">PDF, DOCX, TXT — max {MAX_SIZE_MB} MB</span>
          </>
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
        <div className={`upload-status ${status.type}`}>
          {status.msgs.map((m, i) => <p key={i}>{m}</p>)}
          <button className="dismiss-btn" onClick={() => setStatus(null)}>×</button>
        </div>
      )}
    </div>
  );
}
