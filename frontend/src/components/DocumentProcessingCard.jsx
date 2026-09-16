import React from 'react';
import './DocumentProcessingCard.css';

const STAGE_LABELS = {
  QUEUED: 'Waiting in queue',
  UPLOADING: 'Uploading file',
  UPLOADED: 'Upload complete',
  EXTRACTING: 'Extracting text',
  PARSING: 'Reading document',
  CHUNKING: 'Creating document chunks',
  EMBEDDING: 'Creating AI embeddings',
  INDEXING: 'Indexing document',
  FINALIZING: 'Finalizing',
  COMPLETED: 'Document ready',
  FAILED: 'Processing failed',
};

const PIPELINE_STEPS = [
  { key: 'UPLOADING', label: 'Uploading file', rank: 1 },
  { key: 'EXTRACTING', label: 'Extracting text', rank: 3 },
  { key: 'PARSING', label: 'Reading document', rank: 4 },
  { key: 'CHUNKING', label: 'Creating chunks', rank: 5 },
  { key: 'EMBEDDING', label: 'Creating embeddings', rank: 6 },
  { key: 'INDEXING', label: 'Indexing document', rank: 7 },
  { key: 'FINALIZING', label: 'Finalizing', rank: 8 },
];

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

export default function DocumentProcessingCard({ doc, onDismiss }) {
  const {
    document_id,
    filename,
    processing_stage = 'QUEUED',
    progress = 0,
    message,
    chunk_count = 0,
    processed_chunks = 0,
    error,
  } = doc;

  const currentRank = STAGE_RANKS[processing_stage] ?? 0;
  const isFailed = processing_stage === 'FAILED';
  const isCompleted = processing_stage === 'COMPLETED';

  const ext = (filename || '').split('.').pop()?.toLowerCase();
  const badgeClass = ext === 'pdf' ? 'tag-pdf' : ext === 'docx' ? 'tag-docx' : 'tag-txt';

  return (
    <div className={`doc-processing-card ${isFailed ? 'is-failed' : ''} ${isCompleted ? 'is-completed' : ''}`}>
      {/* Header */}
      <div className="proc-card-header">
        <div className="proc-file-info">
          <span className={`proc-ext-badge ${badgeClass}`}>
            {ext ? ext.toUpperCase() : 'DOC'}
          </span>
          <span className="proc-filename" title={filename}>
            {filename}
          </span>
        </div>
        {onDismiss && (isFailed || isCompleted) && (
          <button
            type="button"
            className="proc-dismiss-btn"
            onClick={() => onDismiss(document_id)}
            title="Dismiss card"
            aria-label="Dismiss card"
          >
            ✕
          </button>
        )}
      </div>

      {/* Main Status or Error Alert */}
      {isFailed ? (
        <div className="proc-error-banner">
          <div className="proc-error-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="proc-error-content">
            <span className="proc-error-title">Processing Failed</span>
            <p className="proc-error-msg">{error || message || 'An error occurred during ingestion.'}</p>
          </div>
        </div>
      ) : isCompleted ? (
        <div className="proc-completed-banner">
          <div className="proc-completed-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="proc-completed-content">
            <span className="proc-completed-title">Document Ready</span>
            <span className="proc-completed-chunks">
              {chunk_count} chunk{chunk_count === 1 ? '' : 's'} indexed &amp; ready to query
            </span>
          </div>
        </div>
      ) : (
        <>
          {/* Visual Stage Stepper */}
          <ul className="proc-stepper-list" aria-label="Processing Stages">
            {PIPELINE_STEPS.map((step) => {
              const isDone = currentRank > step.rank || isCompleted;
              const isActive = !isCompleted && !isFailed && (
                currentRank === step.rank ||
                (step.key === 'UPLOADING' && currentRank === 2) // UPLOADED
              );
              const isFuture = !isDone && !isActive;

              return (
                <li
                  key={step.key}
                  className={`proc-step-item ${isDone ? 'done' : ''} ${isActive ? 'active' : ''} ${isFuture ? 'future' : ''}`}
                >
                  <span className="proc-step-bullet">
                    {isDone ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : isActive ? (
                      <span className="proc-active-dot" />
                    ) : (
                      <span className="proc-future-circle" />
                    )}
                  </span>
                  <span className="proc-step-label">
                    {isActive
                      ? STAGE_LABELS[processing_stage] || step.label
                      : step.label}
                  </span>
                </li>
              );
            })}
          </ul>

          {/* Progress Bar & Numeric Indicator */}
          <div className="proc-progress-row">
            <div className="proc-progress-track">
              <div
                className="proc-progress-fill"
                style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
              />
            </div>
            <span className="proc-percentage">{Math.min(Math.max(progress, 0), 100)}%</span>
          </div>

          {/* Chunks & Context Meta */}
          <div className="proc-meta-footer">
            {chunk_count > 0 ? (
              <span className="proc-chunks-info">
                {processed_chunks > 0 ? `${processed_chunks} / ` : ''}
                {chunk_count} chunks
              </span>
            ) : (
              <span className="proc-chunks-info">Analyzing document structure…</span>
            )}
            {message && <span className="proc-status-msg" title={message}>{message}</span>}
          </div>
        </>
      )}
    </div>
  );
}
