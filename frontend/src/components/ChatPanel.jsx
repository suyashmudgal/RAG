import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import MessageBubble from './MessageBubble';
import { streamMessage, getConversation, exportConversationPdf, renameConversation } from '../api/client';
import './ChatPanel.css';

export default function ChatPanel({
  activeConversationId = null,
  activeConversationTitle = '',
  onConversationCreated,
  onNewChat,
  onToggleSidebar,
  onToggleDocPanel,
  docPanelOpen = false,
  indexedDocCount = 0,
  onOpenUpload,
}) {
  const [messages, setMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [userScrolledUp, setUserScrolledUp] = useState(false);

  // PDF Export state
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);
  const [pdfError, setPdfError] = useState('');

  // Inline rename header state
  const [isRenamingHeader, setIsRenamingHeader] = useState(false);
  const [headerTitle, setHeaderTitle] = useState('');
  const headerInputRef = useRef(null);

  // In-memory conversation messages cache: { [convId]: messagesArray }
  const messageCacheRef = useRef({});
  const inFlightFetchRef = useRef(null);

  const scrollContainerRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const isNearBottomRef = useRef(true);

  /* ── Load conversation with in-memory caching & skeletons ── */
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      setLoadingHistory(false);
      return;
    }

    // Check in-memory cache first for instant 0ms switching
    if (messageCacheRef.current[activeConversationId]) {
      setMessages(messageCacheRef.current[activeConversationId]);
      setLoadingHistory(false);
      return;
    }

    // Otherwise fetch with skeleton placeholder
    setLoadingHistory(true);
    inFlightFetchRef.current = activeConversationId;

    getConversation(activeConversationId)
      .then((data) => {
        if (inFlightFetchRef.current !== activeConversationId) return;
        const loaded = (data.messages || []).map((m) => ({
          role: m.role,
          content: m.content,
          created_at: m.created_at,
          sources: m.sources || [],
        }));
        messageCacheRef.current[activeConversationId] = loaded;
        setMessages(loaded);
      })
      .catch((err) => {
        console.error('Failed to load conversation history:', err);
      })
      .finally(() => {
        if (inFlightFetchRef.current === activeConversationId) {
          setLoadingHistory(false);
        }
      });
  }, [activeConversationId]);

  /* ── Scroll handling ── */
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distFromBottom = scrollHeight - scrollTop - clientHeight;
    const nearBottom = distFromBottom < 80;
    isNearBottomRef.current = nearBottom;
    setUserScrolledUp(!nearBottom && messages.length > 0);
  };

  // Auto-scroll follow
  useEffect(() => {
    if (isNearBottomRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: isStreaming ? 'auto' : 'smooth' });
    }
  }, [messages, isStreaming]);

  const scrollToBottom = () => {
    isNearBottomRef.current = true;
    setUserScrolledUp(false);
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  /* ── Auto-resize textarea ── */
  const handleInputChange = (e) => {
    setInput(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 180);
    textarea.style.height = `${newHeight}px`;
  };

  /* ── Send message ── */
  const handleSend = useCallback(
    async (overrideText) => {
      const question = (overrideText || input).trim();
      if (!question || isStreaming) return;

      setInput('');
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }

      // Optimistically append user message and placeholder assistant message
      const userMsg = { role: 'user', content: question };
      const assistantMsg = { role: 'assistant', content: '', isStreaming: true, sources: [] };

      const updatedWithOptimistic = [...messages, userMsg, assistantMsg];
      setMessages(updatedWithOptimistic);
      setIsStreaming(true);
      isNearBottomRef.current = true;
      setUserScrolledUp(false);

      let tokenBuffer = '';
      let rafId = null;

      const flushTokens = () => {
        if (!tokenBuffer) return;
        const buffered = tokenBuffer;
        tokenBuffer = '';
        setMessages((prev) => {
          const copy = [...prev];
          const last = { ...copy[copy.length - 1] };
          last.content += buffered;
          copy[copy.length - 1] = last;

          // Update cache
          if (activeConversationId) {
            messageCacheRef.current[activeConversationId] = copy;
          }
          return copy;
        });
        rafId = null;
      };

      await streamMessage(
        question,
        activeConversationId,
        /* onToken */
        (token) => {
          tokenBuffer += token;
          if (!rafId) {
            rafId = requestAnimationFrame(flushTokens);
          }
        },
        /* onSources */
        (sources) => {
          if (rafId) {
            cancelAnimationFrame(rafId);
            flushTokens();
          }
          setMessages((prev) => {
            const copy = [...prev];
            const last = { ...copy[copy.length - 1] };
            last.sources = sources;
            copy[copy.length - 1] = last;

            if (activeConversationId) {
              messageCacheRef.current[activeConversationId] = copy;
            }
            return copy;
          });
        },
        /* onError */
        (error) => {
          if (rafId) {
            cancelAnimationFrame(rafId);
            flushTokens();
          }
          setMessages((prev) => {
            const copy = [...prev];
            const last = { ...copy[copy.length - 1] };
            if (!last.content) last.content = `⚠️ ${error}`;
            last.isError = true;
            last.isStreaming = false;
            copy[copy.length - 1] = last;

            if (activeConversationId) {
              messageCacheRef.current[activeConversationId] = copy;
            }
            return copy;
          });
          setIsStreaming(false);
        },
        /* onDone */
        (resolvedConvId) => {
          if (rafId) {
            cancelAnimationFrame(rafId);
            flushTokens();
          }
          setMessages((prev) => {
            const copy = [...prev];
            const last = { ...copy[copy.length - 1] };
            last.isStreaming = false;
            copy[copy.length - 1] = last;

            const finalId = resolvedConvId || activeConversationId;
            if (finalId) {
              messageCacheRef.current[finalId] = copy;
            }
            return copy;
          });
          setIsStreaming(false);

          if (resolvedConvId && onConversationCreated) {
            onConversationCreated(resolvedConvId);
          }
        }
      );
    },
    [input, isStreaming, activeConversationId, messages, onConversationCreated]
  );

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ── Save Chat as PDF ── */
  const handleExportPdf = async () => {
    if (!activeConversationId || exportingPdf) return;
    setExportingPdf(true);
    setPdfError('');
    setPdfSuccess(false);

    try {
      const safeTitle = (activeConversationTitle || 'Conversation')
        .replace(/[^a-zA-Z0-9_\- ]/g, '')
        .trim();
      await exportConversationPdf(activeConversationId, `${safeTitle || 'conversation'}.pdf`);
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 3000);
    } catch (err) {
      console.error('PDF export failed:', err);
      setPdfError(err.message || 'Export failed');
      setTimeout(() => setPdfError(''), 4000);
    } finally {
      setExportingPdf(false);
    }
  };

  /* ── Header Inline Rename ── */
  const startHeaderRename = () => {
    if (!activeConversationId) return;
    setHeaderTitle(activeConversationTitle || 'New Conversation');
    setIsRenamingHeader(true);
    setTimeout(() => {
      headerInputRef.current?.focus();
      headerInputRef.current?.select();
    }, 50);
  };

  const handleSaveHeaderRename = async () => {
    const trimmed = headerTitle.trim();
    setIsRenamingHeader(false);
    if (!trimmed || trimmed === activeConversationTitle) return;

    try {
      await renameConversation(activeConversationId, trimmed);
      if (onConversationCreated) {
        onConversationCreated(activeConversationId);
      }
    } catch (err) {
      console.error('Failed to rename conversation:', err);
    }
  };

  return (
    <main className="chat-panel" role="main">
      {/* ── Top Header ── */}
      <header className="chat-header">
        <div className="chat-header-left">
          {onToggleSidebar && (
            <button
              type="button"
              className="chat-mobile-toggle-btn"
              onClick={onToggleSidebar}
              title="Toggle sidebar"
              aria-label="Toggle sidebar navigation"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          )}

          <Link to="/" className="chat-home-nav-link" title="Back to Landing Page">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Landing</span>
          </Link>

          {/* Conversation Title */}
          <div className="chat-title-container">
            {isRenamingHeader ? (
              <input
                ref={headerInputRef}
                type="text"
                className="chat-header-rename-input"
                value={headerTitle}
                onChange={(e) => setHeaderTitle(e.target.value)}
                onBlur={handleSaveHeaderRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveHeaderRename();
                  if (e.key === 'Escape') setIsRenamingHeader(false);
                }}
                aria-label="Rename conversation title"
              />
            ) : (
              <div
                className="chat-title-interactive"
                onClick={activeConversationId ? startHeaderRename : undefined}
                title={activeConversationId ? 'Click to rename' : ''}
              >
                <h1 className="chat-title-text">
                  {activeConversationTitle || 'New Conversation'}
                </h1>
                {activeConversationId && (
                  <svg className="chat-rename-hint-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="chat-header-right">
          {/* Save as PDF Button */}
          {activeConversationId && messages.length > 0 && (
            <button
              type="button"
              className={`chat-header-action-btn pdf-btn ${exportingPdf ? 'loading' : ''} ${pdfSuccess ? 'success' : ''}`}
              onClick={handleExportPdf}
              disabled={exportingPdf}
              title="Save conversation as formatted PDF"
              aria-label="Save conversation as PDF"
            >
              {exportingPdf ? (
                <>
                  <span className="spinner-small" />
                  <span className="btn-label-desktop">Preparing PDF…</span>
                </>
              ) : pdfSuccess ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="btn-label-desktop">PDF saved</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                  <span className="btn-label-desktop">Save as PDF</span>
                </>
              )}
            </button>
          )}

          {pdfError && <span className="pdf-error-hint">{pdfError}</span>}

          {/* Toggle Knowledge Base Panel */}
          {onToggleDocPanel && (
            <button
              type="button"
              className={`chat-header-action-btn doc-panel-toggle-btn ${docPanelOpen ? 'active' : ''}`}
              onClick={onToggleDocPanel}
              title={docPanelOpen ? 'Close Knowledge Base panel' : 'Open Knowledge Base panel'}
              aria-label="Toggle Document Knowledge Base"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <span className="btn-label-desktop">Knowledge Base</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Messages Canvas ── */}
      <div
        className="messages-scroll-area"
        ref={scrollContainerRef}
        onScroll={handleScroll}
      >
        <div className="messages-centered-column">
          {loadingHistory ? (
            /* Skeleton Messages during thread switch */
            <div className="skeleton-chat-container" aria-label="Loading conversation history">
              <div className="skeleton-msg-row user">
                <div className="skeleton-bubble user skeleton-shimmer">
                  <div className="skeleton-line medium" />
                </div>
              </div>
              <div className="skeleton-msg-row assistant">
                <div className="skeleton-avatar skeleton-shimmer" />
                <div className="skeleton-bubble assistant skeleton-shimmer">
                  <div className="skeleton-line long" />
                  <div className="skeleton-line medium" />
                  <div className="skeleton-line short" />
                </div>
              </div>
              <div className="skeleton-msg-row user">
                <div className="skeleton-bubble user skeleton-shimmer">
                  <div className="skeleton-line short" />
                </div>
              </div>
            </div>
          ) : messages.length === 0 ? (
            /* ── Clean Empty States ── */
            <div className="chat-empty-canvas">
              {indexedDocCount === 0 ? (
                /* State 1: Clean empty state before any indexed document */
                <div className="empty-canvas-hero">
                  <div className="empty-orbital-container">
                    <div className="orbital-ring ring-outer" />
                    <div className="orbital-ring ring-middle" />
                    <div className="orbital-core-glyph">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="12" y1="18" x2="12" y2="12" />
                        <line x1="9" y1="15" x2="15" y2="15" />
                      </svg>
                    </div>
                  </div>

                  <h2 className="empty-hero-headline">Upload a document to get started</h2>
                  <p className="empty-hero-description">
                    Add a PDF, DOCX, or TXT to start asking questions.
                  </p>

                  <div className="empty-upload-cta-wrap">
                    <button
                      type="button"
                      className="empty-upload-cta-btn"
                      onClick={() => {
                        if (onOpenUpload) onOpenUpload();
                        else if (onToggleDocPanel) onToggleDocPanel();
                      }}
                      aria-label="Upload Documents"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <span>Upload Documents</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* State 2: Ready state after document is successfully indexed */
                <div className="empty-canvas-hero ready-state">
                  <div className="empty-orbital-container ready-orbital">
                    <div className="orbital-ring ring-outer ring-ready" />
                    <div className="orbital-core-glyph ready-glyph">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  </div>

                  <h2 className="empty-hero-headline">Your knowledge base is ready.</h2>
                  <p className="empty-hero-description">
                    Ask anything about your documents.
                  </p>

                  <div className="empty-ready-badge">
                    <span className="ready-status-dot" />
                    <span>{indexedDocCount} document{indexedDocCount === 1 ? '' : 's'} indexed</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── Message List ── */
            <div className="messages-thread-list">
              {messages.map((msg, idx) => (
                <MessageBubble key={idx} message={msg} />
              ))}
            </div>
          )}

          <div ref={bottomRef} style={{ height: 1 }} />
        </div>
      </div>

      {/* Floating Jump-To-Latest Button */}
      {userScrolledUp && (
        <button
          type="button"
          className="jump-to-bottom-btn"
          onClick={scrollToBottom}
          title="Jump to latest message"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <span>Latest message</span>
        </button>
      )}

      {/* ── Composer Dock ── */}
      <footer className="chat-composer-dock">
        <div className="composer-inner-wrapper">
          <div className="composer-box">
            <textarea
              ref={inputRef}
              className="composer-textarea"
              value={input}
              onChange={handleInputChange}
              onKeyDown={onKeyDown}
              placeholder={
                isStreaming
                  ? 'Synthesizing response from verified documents…'
                  : indexedDocCount > 0
                  ? 'Ask anything about your documents…'
                  : 'Ask anything or upload documents for grounded citations…'
              }
              disabled={isStreaming}
              rows={1}
              aria-label="Chat input message"
            />

            <button
              type="button"
              className="composer-send-btn"
              onClick={() => handleSend()}
              disabled={!input.trim() || isStreaming}
              title="Send message (Enter)"
              aria-label="Send message"
            >
              {isStreaming ? (
                <span className="spinner-small" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>

          <div className="composer-footer-hints">
            <span className="composer-hint">
              Press <strong>Enter</strong> to send • <strong>Shift + Enter</strong> for a new line
            </span>
            <span className="composer-security">
              Grounded with verifiable page citations
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
