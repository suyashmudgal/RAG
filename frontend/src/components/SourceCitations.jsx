import { useState } from 'react';
import './SourceCitations.css';

export default function SourceCitations({ sources }) {
  const [expandedIndex, setExpandedIndex] = useState(null);

  if (!sources || sources.length === 0) return null;

  const getFormatTag = (name) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <span className="cite-badge badge-pdf">PDF</span>;
    if (ext === 'docx') return <span className="cite-badge badge-docx">DOC</span>;
    return <span className="cite-badge badge-txt">TXT</span>;
  };

  return (
    <div className="source-citations-container">
      <div className="citations-top-label">
        <div className="citations-label-inner">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <span className="citations-title">Verified Sources ({sources.length})</span>
        </div>
        <span className="citations-hint">Citations from ChromaDB vector search</span>
      </div>

      <div className="citations-grid">
        {sources.map((src, i) => {
          const hasExcerpt = Boolean(src.text || src.excerpt);
          const isExpanded = expandedIndex === i;

          return (
            <div key={i} className="citation-card-item">
              <button
                type="button"
                className={`citation-chip ${isExpanded ? 'active' : ''}`}
                onClick={() => hasExcerpt && setExpandedIndex(isExpanded ? null : i)}
                title={hasExcerpt ? 'Click to inspect excerpt' : src.filename}
              >
                {getFormatTag(src.filename)}
                <span className="citation-filename" title={src.filename}>
                  {src.filename}
                </span>

                {src.page_number != null && src.page_number > 0 && (
                  <span className="citation-page-badge">p. {src.page_number}</span>
                )}

                {src.score != null && (
                  <span className="citation-score-badge">
                    {typeof src.score === 'number' ? src.score.toFixed(2) : src.score}
                  </span>
                )}

                {hasExcerpt && (
                  <span className="citation-expand-caret">{isExpanded ? '▲' : '▼'}</span>
                )}
              </button>

              {/* Expandable Excerpt */}
              {isExpanded && (
                <div className="citation-excerpt-drawer">
                  <div className="excerpt-header">
                    <span>Passage excerpt from {src.filename}</span>
                    <button
                      type="button"
                      className="excerpt-close"
                      onClick={() => setExpandedIndex(null)}
                    >
                      ✕
                    </button>
                  </div>
                  <p className="excerpt-text">&ldquo;{src.text || src.excerpt}&rdquo;</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
