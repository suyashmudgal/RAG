import { useState, useRef, useEffect, useCallback } from 'react';
import MessageBubble from './MessageBubble';
import { streamMessage } from '../api/client';
import './ChatPanel.css';

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

  /* ── new chat ───────────────────────────────────────────────────────── */

  const handleNewChat = () => {
    setSessionId(crypto.randomUUID());
    setMessages([]);
    setInput('');
    inputRef.current?.focus();
  };

  /* ── send message ───────────────────────────────────────────────────── */

  const handleSend = useCallback(async () => {
    const question = input.trim();
    if (!question || isStreaming) return;

    setInput('');
    setIsStreaming(true);

    // Append user + placeholder AI message
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: question },
      { role: 'assistant', content: '', sources: [], isStreaming: true },
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
  }, [input, isStreaming, sessionId]);


  /* ── keyboard shortcut ──────────────────────────────────────────────── */

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ── render ─────────────────────────────────────────────────────────── */

  return (
    <main className="chat-panel">
      {/* header */}
      <div className="chat-header">
        <h2>💬 Chat</h2>
        <div className="chat-header-actions">
          <span className="session-badge">Session: {sessionId.slice(0, 8)}</span>
          <button className="new-chat-btn" onClick={handleNewChat}>+ New Chat</button>
        </div>
      </div>

      {/* messages */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="welcome-screen">
            <div className="welcome-icon">🤖</div>
            <h2>Welcome to DocChat AI</h2>
            <p>Upload documents and start asking questions.</p>
            <div className="welcome-tips">
              <div className="tip"><span>📄</span><p>Upload PDF, DOCX, or TXT files</p></div>
              <div className="tip"><span>💡</span><p>Ask questions about your documents</p></div>
              <div className="tip"><span>📌</span><p>Get answers with source citations</p></div>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => <MessageBubble key={i} message={msg} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* input */}
      <div className="chat-input-container">
        <div className="chat-input-wrapper">
          <textarea
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={isStreaming ? 'Waiting for response…' : 'Ask about your documents…'}
            disabled={isStreaming}
            rows={1}
          />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            title="Send message"
          >
            {isStreaming ? (
              <span className="spinner-small" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
