import { useState, useRef, useEffect, useCallback } from 'react';
import MessageBubble from './MessageBubble';
import { streamMessage } from '../api/client';
import './ChatPanel.css';

const STARTER_PROMPTS = [
  {
    icon: '📑',
    title: 'Summarize Key Takeaways',
    prompt: 'Can you summarize the most important findings and takeaways across the uploaded documents?',
  },
  {
    icon: '🔍',
    title: 'Extract Policies & Rules',
    prompt: 'What are the main requirements, rules, and policy constraints outlined in these files?',
  },
  {
    icon: '📊',
    title: 'Identify Metrics & Numbers',
    prompt: 'Extract all relevant metrics, figures, statistics, and financial projections mentioned.',
  },
  {
    icon: '⚡',
    title: 'Actionable Next Steps',
    prompt: 'What are the recommended next steps, action items, and implementation milestones?',
  },
];

export default function ChatPanel() {
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  /* auto-scroll to latest message */
  useEffect(() => {
    if (isStreaming) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    } else {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming]);

  /* auto-resize textarea */
  const handleInputResize = (e) => {
    setInput(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 180);
    textarea.style.height = `${newHeight}px`;
  };

  /* ── new chat ───────────────────────────────────────────────────────── */

  const handleNewChat = () => {
    setSessionId(crypto.randomUUID());
    setMessages([]);
    setInput('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.focus();
    }
  };

  /* ── send message ───────────────────────────────────────────────────── */

  const handleSend = useCallback(
    async (customText) => {
      const question = (customText || input).trim();
      if (!question || isStreaming) return;

      setInput('');
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
      setIsStreaming(true);

      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Append user + placeholder AI message
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: question, timestamp },
        { role: 'assistant', content: '', sources: [], isStreaming: true, timestamp },
      ]);

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
          return copy;
        });
        rafId = null;
      };

      await streamMessage(
        question,
        sessionId,
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
            return copy;
          });
          setIsStreaming(false);
        },
        /* onDone */
        () => {
          if (rafId) {
            cancelAnimationFrame(rafId);
            flushTokens();
          }
          setMessages((prev) => {
            const copy = [...prev];
            const last = { ...copy[copy.length - 1] };
            last.isStreaming = false;
            copy[copy.length - 1] = last;
            return copy;
          });
          setIsStreaming(false);
        }
      );
    },
    [input, isStreaming, sessionId]
  );

  /* ── keyboard shortcut ──────────────────────────────────────────────── */

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePromptClick = (promptText) => {
    setInput(promptText);
    if (inputRef.current) {
      inputRef.current.focus();
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.style.height = 'auto';
          inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 180)}px`;
        }
      }, 10);
    }
  };

  /* ── render ─────────────────────────────────────────────────────────── */

  return (
    <main className="chat-panel">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-title">
          <h2 className="chat-title-text">Grounded Assistant</h2>
          <span className="session-id-pill" title="Unique session conversation thread">
            Session: {sessionId.slice(0, 8)}
          </span>
        </div>

        <div className="chat-header-actions">
          <button
            type="button"
            className="new-chat-btn"
            onClick={handleNewChat}
            title="Clear active thread and start new session"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="messages-scroll-area">
        <div className="messages-centered-column">
          {messages.length === 0 ? (
            <div className="chat-welcome-state">
              <div className="welcome-avatar-aura">
                <div className="welcome-avatar-icon">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
              </div>

              <h2 className="welcome-heading">What would you like to explore?</h2>
              <p className="welcome-subtext">
                Ask questions across your uploaded documents. Answers will be retrieved from ChromaDB
                and synthesized with exact source citations.
              </p>

              {/* Starter Suggestion Cards */}
              <div className="starter-prompts-grid">
                {STARTER_PROMPTS.map((item, index) => (
                  <button
                    key={index}
                    type="button"
                    className="starter-prompt-card"
                    onClick={() => handlePromptClick(item.prompt)}
                  >
                    <div className="starter-card-top">
                      <span className="starter-icon">{item.icon}</span>
                      <span className="starter-title">{item.title}</span>
                    </div>
                    <p className="starter-preview-text">&ldquo;{item.prompt}&rdquo;</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} />
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Bottom Floating Input Dock */}
      <div className="chat-input-dock">
        <div className="chat-dock-inner">
          <div className="chat-input-box">
            <textarea
              ref={inputRef}
              className="chat-textarea"
              value={input}
              onChange={handleInputResize}
              onKeyDown={onKeyDown}
              placeholder={isStreaming ? 'Synthesizing response…' : 'Ask anything about your documents…'}
              disabled={isStreaming}
              rows={1}
            />

            <button
              type="button"
              className="chat-send-btn"
              onClick={() => handleSend()}
              disabled={!input.trim() || isStreaming}
              title="Send question (Enter)"
              aria-label="Send question"
            >
              {isStreaming ? (
                <span className="spinner-small" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>

          <div className="chat-input-footer">
            <span className="input-hint">Press <strong>Enter</strong> to send · <strong>Shift + Enter</strong> for new line</span>
            <span className="input-guarantee">Backed by ChromaDB vector similarity</span>
          </div>
        </div>
      </div>
    </main>
  );
}
