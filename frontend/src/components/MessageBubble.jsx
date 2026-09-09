import MarkdownRenderer from './MarkdownRenderer';
import SourceCitations from './SourceCitations';
import './MessageBubble.css';

export default function MessageBubble({ message }) {
  const { role, content, sources, isStreaming, isError } = message;

  return (
    <div className={`message ${role}${isError ? ' error' : ''}`}>
      <div className="message-avatar">{role === 'user' ? '👤' : '🤖'}</div>

      <div className="message-content">
        {role === 'assistant' ? (
          <div className="assistant-message-body">
            {!content && isStreaming ? (
              <div className="thinking-indicator">
                <span className="streaming-cursor" />
                <span className="thinking-text">Generating response…</span>
              </div>
            ) : (
              <MarkdownRenderer content={content || ''} isStreaming={isStreaming} />
            )}
          </div>
        ) : (
          <div className="user-message-body">
            {content}
          </div>
        )}

        {sources && sources.length > 0 && !isStreaming && (
          <SourceCitations sources={sources} />
        )}
      </div>
    </div>
  );
}
