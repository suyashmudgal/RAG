import { useState, useMemo, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import vscDarkPlus from 'react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus.js';
import './MarkdownRenderer.css';

/**
 * Normalizes LaTeX math delimiters while safely protecting code blocks:
 * - Preserves fenced code blocks (```...```) and inline code (`...`) completely intact.
 * - Converts \[ ... \] to $$ ... $$ (display math)
 * - Converts \( ... \) to $ ... $ (inline math)
 * - Wraps LaTeX equation/align blocks in $$ ... $$
 * - Wraps standalone unenclosed LaTeX equations (e.g. \frac{266}{11}\text{ minutes}) in $$ ... $$
 * - Leaves standard $$ ... $$ and $ ... $ intact.
 */
function normalizeMathDelimiters(text) {
  if (!text) return '';

  // Protect code blocks: split by code fences ```...```
  const codeBlockRegex = /(```[\s\S]*?```)/g;
  const parts = text.split(codeBlockRegex);

  return parts
    .map((part, index) => {
      // If inside a fenced code block, leave untouched
      if (index % 2 === 1) return part;

      // Protect inline code `...`
      const inlineCodeRegex = /(`[^`\n]+`)/g;
      const subParts = part.split(inlineCodeRegex);

      return subParts
        .map((subPart, subIndex) => {
          if (subIndex % 2 === 1) return subPart;

          let res = subPart;

          // Normalize LaTeX display math \[ ... \] -> $$ ... $$
          res = res.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `$$\n${math.trim()}\n$$`);

          // Normalize LaTeX inline math \( ... \) -> $ ... $
          res = res.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math.trim()}$`);

          // Normalize \begin{equation/align/gather/matrix} ... \end{...} -> $$ ... $$
          res = res.replace(
            /\\begin\{(equation\*?|align\*?|gather\*?|pmatrix\*?|bmatrix\*?|vmatrix\*?)\}([\s\S]*?)\\end\{\1\}/g,
            (_, env, body) => `$$\n\\begin{${env}}${body}\\end{${env}}\n$$`
          );

          // Normalize standalone lines starting with LaTeX commands (e.g. \frac{266}{11}\text{ minutes})
          res = res.replace(
            /(^|\n)\s*(\\(?:frac|sqrt|sum|int|prod|lim)\b[^\n$]+?)(\n|$)/g,
            (match, prefix, math, suffix) => {
              const openBraces = (math.match(/\{/g) || []).length;
              const closeBraces = (math.match(/\}/g) || []).length;
              if (openBraces > 0 && openBraces === closeBraces) {
                return `${prefix}$$\n${math.trim()}\n$$${suffix}`;
              }
              return match;
            }
          );

          return res;
        })
        .join('');
    })
    .join('');
}

/**
 * CodeBlock component with syntax highlighting, language badge,
 * and a copy-to-clipboard button.
 */
const CodeBlock = memo(function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const displayLang = language || 'code';

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-lang-tag">{displayLang}</span>
        <button
          type="button"
          className={`copy-code-btn ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
          aria-label={copied ? 'Copied to clipboard' : 'Copy code to clipboard'}
          title={copied ? 'Copied!' : 'Copy code'}
        >
          {copied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="code-block-body">
        <SyntaxHighlighter
          language={language || 'text'}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: '14px 16px',
            background: '#09090b',
            fontSize: '13px',
            lineHeight: 1.6,
            borderRadius: '0 0 var(--radius-sm) var(--radius-sm)',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          }}
          wrapLongLines={true}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
});


export default function MarkdownRenderer({ content, isStreaming }) {
  const processedContent = useMemo(() => {
    return normalizeMathDelimiters(content);
  }, [content]);

  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
        components={{
          // Custom responsive table wrapper
          table({ node, ...props }) {
            return (
              <div className="markdown-table-wrapper">
                <table className="markdown-table" {...props} />
              </div>
            );
          },
          thead({ node, ...props }) {
            return <thead className="markdown-thead" {...props} />;
          },
          tbody({ node, ...props }) {
            return <tbody className="markdown-tbody" {...props} />;
          },
          tr({ node, ...props }) {
            return <tr className="markdown-tr" {...props} />;
          },
          th({ node, ...props }) {
            return <th className="markdown-th" {...props} />;
          },
          td({ node, ...props }) {
            return <td className="markdown-td" {...props} />;
          },

          // Code blocks & inline code
          pre(props) {
            const codeElement = props.children;
            const className = codeElement?.props?.className || '';
            const match = /language-(\w+)/.exec(className);
            const language = match ? match[1] : '';
            const codeString = String(codeElement?.props?.children || '').replace(/\n$/, '');

            return <CodeBlock language={language} code={codeString} />;
          },
          code(props) {
            // Inline code
            return <code className="inline-code" {...props} />;
          },

          // Safe external links
          a({ node, ...props }) {
            return (
              <a
                target="_blank"
                rel="noopener noreferrer"
                className="markdown-link"
                {...props}
              />
            );
          },

          // Blockquotes
          blockquote({ node, ...props }) {
            return <blockquote className="markdown-blockquote" {...props} />;
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>

      {/* Streaming cursor */}
      {isStreaming && <span className="streaming-cursor" />}
    </div>
  );
}
