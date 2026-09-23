import React from 'react';
import './DocumentProcessingCard.css';

const STAGE_LABELS = {
  QUEUED: 'Queued for processing',
  UPLOADING: 'Uploading document',
  UPLOADED: 'Uploaded to server',
  EXTRACTING: 'Extracting document text',
  PARSING: 'Parsing structure & pages',
  CHUNKING: 'Creating semantic chunks',
  EMBEDDING: 'Creating AI embeddings',
  INDEXING: 'Indexing in ChromaDB',
  FINALIZING: 'Finalizing vector store',
  COMPLETED: 'Document ready to query',
  FAILED: 'Ingestion failed',
};

const PIPELINE_STEPS = [
  { key: 'UPLOADING', label: 'Upload', rank: 1 },
  { key: 'EXTRACTING', label: 'Extract text', rank: 3 },
  { key: 'PARSING', label: 'Parse pages', rank: 4 },
  { key: 'CHUNKING', label: 'Semantic chunks', rank: 5 },
  { key: 'EMBEDDING', label: 'AI embeddings', rank: 6 },
  { key: 'INDEXING', label: 'Vector index', rank: 7 },
  { key: 'FINALIZING', label: 'Finalize', rank: 8 },
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
    chunks_processed = 0,
    chunks_total = 0,
    error,
  } = doc;

  const currentRank = STAGE_RANKS[processing_stage] ?? 0;
  const isFailed = processing_stage === 'FAILED';
  const isCompleted = processing_stage === 'COMPLETED';

  // Support both backend naming conventions
  const totalChunks = chunk_count || chunks_total || 0;
  const doneChunks = processed_chunks || chunks_processed || 0;

  const ext = (filename || '').split('.').pop()?.toLowerCase();
  const badgeClass = ext === 'pdf' ? 'tag-pdf' : ext === 'docx' ? 'tag-docx' : 'tag-txt';

  return (
    <div className={`doc-processing-card ${isFailed ? 'is-failed' : ''} ${isCompleted ? 'is-completed' : ''}`} role="region" aria-label={`Processing status for ${filename}`}>
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
            aria-label={`Dismiss processing card for ${filename}`}
          >
            ✕
          </button>
        )}
      </div>

      {/* Main Status or Error Alert */}
      {isFailed ? (
        <div className="proc-error-banner" role="alert">
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
            <span className="proc-completed-title">Ready for Grounded Chat</span>
            <span className="proc-completed-chunks">
              {totalChunks > 0 ? `${totalChunks} chunks indexed in ChromaDB` : 'Indexed and ready to query'}
            </span>
          </div>
        </div>
      ) : (
        <>
          {/* Active Stage Callout */}
          <div className="proc-active-status-bar">
            <span className="proc-active-indicator">
              <span className="pulse-dot" />
            </span>
            <span className="proc-active-text">
              {STAGE_LABELS[processing_stage] || 'Processing document…'}
            </span>
          </div>

          {/* Visual Stage Stepper */}
          <ul className="proc-stepper-list" aria-label="Ingestion Stages">
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
                    {step.label}
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
            {totalChunks > 0 ? (
              <span className="proc-chunks-info">
                {doneChunks > 0 ? `${doneChunks} / ` : ''}
                {totalChunks} chunks
              </span>
            ) : (
              <span className="proc-chunks-info">Extracting content…</span>
            )}
            {message && <span className="proc-status-msg" title={message}>{message}</span>}
          </div>
        </>
      )}
    </div>
  );
}
