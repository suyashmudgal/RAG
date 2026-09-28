import React from 'react';
import './DocumentProcessingCard.css';

const STAGE_LABELS = {
  QUEUED: 'Queued',
  UPLOADING: 'Uploading',
  UPLOADED: 'Uploaded',
  EXTRACTING: 'Reading document',
  PARSING: 'Understanding pages',
  CHUNKING: 'Preparing knowledge',
  EMBEDDING: 'Creating semantic index',
  INDEXING: 'Building search index',
  FINALIZING: 'Finishing',
  COMPLETED: 'Ready',
  FAILED: 'Failed',
};

const STAGE_RANKS = {
  QUEUED: 0,
  UPLOADING: 1,
  UPLOADED: 2,
  EXTRACTING: 3,
  PARSING: 4,
  CHUNKING: 5,
  EMBEDDING: 6,
  INDEXING: 7,
  FINALIZING: 8,
  COMPLETED: 9,
  FAILED: -1,
};

const PIPELINE_STEPS = [
  { key: 'UPLOADING', label: 'Upload', rank: 1 },
  { key: 'EXTRACTING', label: 'Read text', rank: 3 },
  { key: 'PARSING', label: 'Pages', rank: 4 },
  { key: 'CHUNKING', label: 'Knowledge', rank: 5 },
  { key: 'EMBEDDING', label: 'Semantics', rank: 6 },
  { key: 'INDEXING', label: 'Index', rank: 7 },
  { key: 'FINALIZING', label: 'Finalize', rank: 8 },
];

function sanitizeErrorMessage(raw) {
  if (!raw) return 'An error occurred during ingestion.';
  // Strip backend tracebacks or raw python error names
  const clean = raw.split('\n')[0]
    .replace(/^Traceback.*$/i, '')
    .replace(/^[A-Za-z]+Error:\s*/, '')
    .trim();
  return clean.length > 120 ? `${clean.slice(0, 117)}…` : clean || 'Could not process document';
}

export default function DocumentProcessingCard({ doc, onDismiss, onRetry }) {
  const {
    document_id,
    filename,
    processing_stage = 'QUEUED',
    progress = 0,
    message,
    chunk_count = 0,
    processed_chunks = 0,
    chunks_processed = 0,
    chunks_total = 0,
    error,
  } = doc;

  const currentRank = STAGE_RANKS[processing_stage] ?? 0;
  const isFailed = processing_stage === 'FAILED';
  const isCompleted = processing_stage === 'COMPLETED';

  const totalChunks = chunk_count || chunks_total || 0;
  const ext = (filename || '').split('.').pop()?.toLowerCase();
  const badgeLabel = ext ? ext.toUpperCase() : 'DOC';

  /* ── 1. COMPLETED: Compact document row (Req 17) ── */
  if (isCompleted) {
    return (
      <div className="proc-compact-completed-row" role="region" aria-label={`${filename} is ready`}>
        <div className="proc-completed-check">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div className="proc-compact-meta">
          <span className="proc-compact-filename" title={filename}>{filename}</span>
          <span className="proc-compact-sub">
            {totalChunks > 0 ? `${totalChunks} chunks` : 'Indexed'} &bull; Ready
          </span>
        </div>
        {onDismiss && (
          <button
            type="button"
            className="proc-compact-dismiss-btn"
            onClick={() => onDismiss(document_id)}
            title="Dismiss notification"
            aria-label="Dismiss"
          >
            ✕
          </button>
        )}
      </div>
    );
  }

  /* ── 2. FAILED: Clean safe error card (Req 18) ── */
  if (isFailed) {
    const safeError = sanitizeErrorMessage(error || message);
    return (
      <div className="proc-compact-failed-card" role="alert" aria-label={`Processing failed for ${filename}`}>
        <div className="proc-failed-top">
          <div className="proc-failed-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="proc-failed-info">
            <span className="proc-failed-name" title={filename}>{filename}</span>
            <span className="proc-failed-sub">Couldn&apos;t finish processing</span>
          </div>
          {onDismiss && (
            <button
              type="button"
              className="proc-compact-dismiss-btn"
              onClick={() => onDismiss(document_id)}
              title="Remove"
              aria-label="Remove"
            >
              ✕
            </button>
          )}
        </div>
        <p className="proc-failed-msg">{safeError}</p>
        <div className="proc-failed-actions">
          {onDismiss && (
            <button
              type="button"
              className="proc-action-btn btn-ghost"
              onClick={() => onDismiss(document_id)}
            >
              Remove
            </button>
          )}
          {onRetry && (
            <button
              type="button"
              className="proc-action-btn btn-retry"
              onClick={() => onRetry(doc)}
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ── 3. IN PROGRESS: Compact modern progress card (Req 14, 15, 16) ── */
  const humanStage = STAGE_LABELS[processing_stage] || 'Processing document…';
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className="doc-processing-card" role="region" aria-label={`Processing ${filename}`}>
      {/* File row */}
      <div className="proc-card-header">
        <div className="proc-file-info">
          <span className="proc-ext-badge">{badgeLabel}</span>
          <span className="proc-filename" title={filename}>{filename}</span>
        </div>
        <span className="proc-percentage">{clampedProgress}%</span>
      </div>

      {/* Progress Track */}
      <div className="proc-progress-row">
        <div className="proc-progress-track">
          <div
            className="proc-progress-fill"
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
      </div>

      {/* Current Step */}
      <div className="proc-step-current-row">
        <div className="proc-step-label-group">
          <span className="proc-step-pulse" />
          <span className="proc-step-current-text">{humanStage}</span>
        </div>
        {totalChunks > 0 && (
          <span className="proc-step-chunks-count">
            {chunks_processed || processed_chunks ? `${chunks_processed || processed_chunks} / ` : ''}
            {totalChunks} chunks
          </span>
        )}
      </div>

      {/* Compact Mini-steps indicator */}
      <div className="proc-mini-steps-list">
        {PIPELINE_STEPS.map((step) => {
          const isDone = currentRank > step.rank;
          const isActive = currentRank === step.rank || (step.key === 'UPLOADING' && currentRank === 2);
          return (
            <div
              key={step.key}
              className={`proc-mini-step-pill ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}
              title={step.label}
            >
              {isDone ? '✓' : step.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
