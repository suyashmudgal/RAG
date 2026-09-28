import { useState, useRef, useEffect, useCallback } from 'react';
import MessageBubble from './MessageBubble';
import { streamMessage, getConversation, exportConversationPdf, renameConversation } from '../api/client';
import './ChatPanel.css';

export default function ChatPanel({
  activeConversationId = null,
  activeConversationTitle = '',
  onConversationCreated,
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

  // In-memory conversation messages cache
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

    if (messageCacheRef.current[activeConversationId]) {
      setMessages(messageCacheRef.current[activeConversationId]);
      setLoadingHistory(false);
      return;
    }

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
        (token) => {
          tokenBuffer += token;
          if (!rafId) {
            rafId = requestAnimationFrame(flushTokens);
          }
        },
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
        (errorMsg) => {
          if (rafId) {
            cancelAnimationFrame(rafId);
            flushTokens();
          }
          setMessages((prev) => {
            const copy = [...prev];
            const last = { ...copy[copy.length - 1] };
            last.content = last.content
              ? `${last.content}\n\n⚠️ Error: ${errorMsg}`
              : `⚠️ Error: ${errorMsg}`;
            last.isStreaming = false;
            last.isError = true;
            copy[copy.length - 1] = last;

            if (activeConversationId) {
              messageCacheRef.current[activeConversationId] = copy;
            }
            return copy;
          });
          setIsStreaming(false);
        },
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

            if (resolvedConvId) {
              messageCacheRef.current[resolvedConvId] = copy;
            }
            return copy;
          });
          setIsStreaming(false);

          if (!activeConversationId && resolvedConvId && onConversationCreated) {
            onConversationCreated(resolvedConvId);
          }
        }
      );
    },
    [input, isStreaming, messages, activeConversationId, onConversationCreated]
  );

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ── Header Title Inline Rename ── */
  const handleStartHeaderRename = () => {
    if (!activeConversationId) return;
    setHeaderTitle(activeConversationTitle || 'New Conversation');
    setIsRenamingHeader(true);
    setTimeout(() => {
      headerInputRef.current?.focus();
      headerInputRef.current?.select();
    }, 40);
  };

  const handleSaveHeaderRename = async () => {
    setIsRenamingHeader(false);
    const trimmed = headerTitle.trim();
    if (!trimmed || trimmed === activeConversationTitle) return;
    try {
      await renameConversation(activeConversationId, trimmed);
      if (onConversationCreated) {
        onConversationCreated(activeConversationId);
      }
    } catch (err) {
      console.error('Failed to rename from header:', err);
    }
  };

  /* ── PDF Export ── */
  const handleExportPdf = async () => {
    if (!activeConversationId || exportingPdf) return;
    try {
      setExportingPdf(true);
      setPdfError('');
      setPdfSuccess(false);

      const title = activeConversationTitle || 'Conversation';
      const safeTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
      const filename = `${safeTitle}_DocChat.pdf`;

      await exportConversationPdf(activeConversationId, filename);
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 2500);
    } catch (err) {
      setPdfError(err.message || 'Export failed');
      setTimeout(() => setPdfError(''), 4000);
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <main className="chat-panel" role="main" aria-label="Chat Conversation Canvas">
      {/* ── Compact Header ── */}
      <header className="chat-header">
        <div className="chat-header-left">
          {onToggleSidebar && (
            <button
              type="button"
              className="chat-mobile-toggle-btn"
              onClick={onToggleSidebar}
              title="Toggle Sidebar"
              aria-label="Toggle Sidebar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          )}

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
                aria-label="Edit conversation title"
              />
            ) : (
              <div
                className="chat-title-interactive"
                onClick={handleStartHeaderRename}
                title={activeConversationId ? 'Click to rename conversation' : ''}
              >
                <h1 className="chat-title-text">
                  {activeConversationTitle || (activeConversationId ? 'Conversation' : 'New Chat')}
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
              title="Save conversation as PDF"
              aria-label="Save conversation as PDF"
            >
              {exportingPdf ? (
                <>
                  <span className="spinner-small" />
                  <span className="btn-label-desktop">Exporting…</span>
                </>
              ) : pdfSuccess ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="btn-label-desktop">Saved</span>
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                  <span className="btn-label-desktop">Save PDF</span>
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
              title={docPanelOpen ? 'Close Knowledge Base' : 'Open Knowledge Base'}
              aria-label="Toggle Knowledge Base"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <span className="btn-label-desktop">Knowledge Base</span>
              {indexedDocCount > 0 && (
                <span className="header-doc-count-pill">{indexedDocCount}</span>
              )}
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
            <div className="skeleton-chat-container" aria-label="Loading conversation history">
              <div className="skeleton-msg-row user">
                <div className="skeleton-bubble user skeleton-shimmer">
                  <div className="skeleton-line medium" />
                </div>
              </div>
              <div className="skeleton-msg-row assistant">
                <div className="skeleton-bubble assistant skeleton-shimmer">
                  <div className="skeleton-line long" />
                  <div className="skeleton-line medium" />
                  <div className="skeleton-line short" />
                </div>
              </div>
            </div>
          ) : messages.length === 0 ? (
            /* ── Clean Restrained Empty States (No fake AI elements) ── */
            <div className="chat-empty-canvas">
              {indexedDocCount === 0 ? (
                /* State 1: Clean empty state before any indexed document */
                <div className="empty-canvas-hero">
                  <div className="empty-icon-glyph">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="12" y1="18" x2="12" y2="12" />
                      <line x1="9" y1="15" x2="15" y2="15" />
                    </svg>
                  </div>

                  <h2 className="empty-hero-headline">Upload a document to start</h2>
                  <p className="empty-hero-description">
                    Upload a PDF, DOCX, or TXT document to begin asking questions.
                  </p>

                  <div className="empty-upload-cta-wrap">
                    <button
                      type="button"
                      className="empty-upload-cta-btn"
                      onClick={() => {
                        if (onOpenUpload) onOpenUpload();
                        else if (onToggleDocPanel) onToggleDocPanel();
                      }}
                      aria-label="Upload document"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <span>Upload document</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* State 2: Ready state after document is successfully indexed */
                <div className="empty-canvas-hero ready-state">
                  <div className="empty-icon-glyph ready-glyph">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>

                  <h2 className="empty-hero-headline">Your documents are ready.</h2>
                  <p className="empty-hero-description">
                    Ask anything about your uploaded documents.
                  </p>
                </div>
              )}
            </div>
          ) : (
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
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                  ? 'Generating response…'
                  : indexedDocCount > 0
                  ? 'Ask anything about your documents…'
                  : 'Upload documents or ask a question…'
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>

          <div className="composer-footer-hints">
            <span className="composer-hint">
              Press <strong>Enter</strong> to send &bull; <strong>Shift + Enter</strong> for new line
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
