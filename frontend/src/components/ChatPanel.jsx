import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import MessageBubble from './MessageBubble';
import ThemeToggle from './ThemeToggle';
import { streamMessage, getConversation } from '../api/client';
import './ChatPanel.css';

const SUGGESTION_CARDS = [
  {
    icon: '📄',
    title: 'Summarize my document',
    desc: 'Extract key findings, themes, and takeaways',
    prompt: 'Can you summarize the most important findings and takeaways across the uploaded documents?',
  },
  {
    icon: '💡',
    title: 'Explain in simple terms',
    desc: 'Break down complex concepts clearly',
    prompt: 'Explain the key concepts and ideas in these documents in simple, beginner-friendly terms.',
  },
  {
    icon: '🎯',
    title: 'Find important points',
    desc: 'Identify critical policies, rules, and facts',
    prompt: 'What are the main requirements, policy rules, and critical points outlined in these files?',
  },
  {
    icon: '📊',
    title: 'Ask about metrics & numbers',
    desc: 'Locate statistics, data points, and figures',
    prompt: 'Extract all key figures, numerical data, statistics, and metrics mentioned in the documents.',
  },
];

export default function ChatPanel({
  activeConversationId = null,
  activeConversationTitle = '',
  onConversationCreated,
  onNewChat,
  onToggleSidebar,
}) {
  const [messages, setMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [userScrolledUp, setUserScrolledUp] = useState(false);

  // In-memory conversation cache: { [convId]: messagesArray }
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

  return (
    <main className="chat-panel">
      {/* Top Header */}
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

          <Link to="/" className="chat-home-link" title="Return to Landing Page">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Landing Page</span>
          </Link>

          <div className="chat-title-group">
            <h2 className="chat-title-text">
              {activeConversationTitle || 'Grounded AI Assistant'}
            </h2>
            {activeConversationId ? (
              <span className="chat-thread-badge" title={`Conversation ID: ${activeConversationId}`}>
                Thread #{activeConversationId.slice(0, 6)}
              </span>
            ) : (
              <span className="chat-thread-badge new-thread">New Session</span>
            )}
          </div>
        </div>

        <div className="chat-header-right">
          <div className="rag-status-indicator" title="Grounded by local ChromaDB vector store">
            <span className="pulse-dot" />
            <span className="rag-status-text">ChromaDB Grounded</span>
          </div>

          <ThemeToggle />

          <button
            type="button"
            className="chat-header-new-btn"
            onClick={onNewChat}
            title="Start new chat"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>New Chat</span>
          </button>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div
        className="messages-scroll-area"
        ref={scrollContainerRef}
        onScroll={handleScroll}
      >
        <div className="messages-centered-column">
          {loadingHistory ? (
            /* Skeleton Messages */
            <div className="skeleton-chat-container" aria-label="Loading messages">
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
            /* Empty State */
            <div className="chat-empty-state">
              <div className="empty-state-aura">
                <div className="empty-state-glyph">
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
              </div>

              <h1 className="empty-hero-title">Your documents, understood.</h1>
              <p className="empty-hero-subtitle">
                Upload a document and ask anything about it. Responses are grounded in your files with page-level citations.
              </p>

              {/* Curated Suggestion Cards */}
              <div className="suggestions-grid">
                {SUGGESTION_CARDS.map((card, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="suggestion-card"
                    onClick={() => handleSend(card.prompt)}
                    title={card.prompt}
                  >
                    <div className="suggestion-card-header">
                      <span className="suggestion-icon">{card.icon}</span>
                      <span className="suggestion-title">{card.title}</span>
                    </div>
                    <p className="suggestion-desc">{card.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message List */
            <div className="messages-list">
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

      {/* Composer Input Dock */}
      <footer className="chat-composer-dock">
        <div className="composer-inner-wrapper">
          <div className="composer-box">
            <textarea
              ref={inputRef}
              className="composer-textarea"
              value={input}
              onChange={handleInputChange}
              onKeyDown={onKeyDown}
              placeholder={isStreaming ? 'Synthesizing response from documents…' : 'Ask anything about your documents…'}
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
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
              Verified by precision citation filters
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
