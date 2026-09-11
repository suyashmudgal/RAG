import { useState } from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import SourceCitations from './SourceCitations';
import './MessageBubble.css';

export default function MessageBubble({ message }) {
  const { role, content, sources, isStreaming, isError, timestamp } = message;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  };

  const isAssistant = role === 'assistant';

  return (
    <div className={`message-row ${role}${isError ? ' is-error' : ''}`}>
      {/* Avatar */}
      <div className="message-avatar-wrap">
        {isAssistant ? (
          <div className="avatar-ai">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
        ) : (
          <div className="avatar-user">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        )}
      </div>

      {/* Content Container */}
      <div className="message-body-wrap">
        <div className="message-meta-header">
          <span className="message-sender-name">
            {isAssistant ? 'DocChat Assistant' : 'You'}
          </span>
          {timestamp && <span className="message-timestamp">{timestamp}</span>}
        </div>

        {isAssistant ? (
          <div className="assistant-message-content">
            {!content && isStreaming ? (
              <div className="thinking-bubble">
                <div className="thinking-dots">
                  <span className="dot dot-1" />
                  <span className="dot dot-2" />
                  <span className="dot dot-3" />
                </div>
                <span className="thinking-status">
                  Retrieving context from ChromaDB &amp; synthesizing answer…
                </span>
              </div>
            ) : (
              <>
                <MarkdownRenderer content={content || ''} isStreaming={isStreaming} />

                {/* Response Actions */}
                {!isStreaming && content && (
                  <div className="message-actions-bar">
                    <button
                      type="button"
                      className={`copy-msg-btn ${copied ? 'is-copied' : ''}`}
                      onClick={handleCopy}
                      title={copied ? 'Copied to clipboard!' : 'Copy response'}
                    >
                      {copied ? (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Sources */}
            {sources && sources.length > 0 && !isStreaming && (
              <SourceCitations sources={sources} />
            )}
          </div>
        ) : (
          <div className="user-message-bubble">
            {content}
          </div>
        )}
      </div>
    </div>
  );
}
