import './SourceCitations.css';

export default function SourceCitations({ sources }) {
  if (!sources || sources.length === 0) return null;

  const icon = (name) => {
    const ext = name.split('.').pop()?.toLowerCase();
    return ext === 'pdf' ? '📕' : ext === 'docx' ? '📘' : '📄';
  };

  return (
    <div className="source-citations">
      <div className="citations-header">
        <span className="citations-icon">📌</span>
        <span>Sources</span>
      </div>
      <div className="citations-list">
        {sources.map((src, i) => (
          <div key={i} className="citation-chip">
            <span className="citation-file-icon">{icon(src.filename)}</span>
            <span className="citation-filename">{src.filename}</span>
            {src.page_number != null && src.page_number > 0 && (
              <span className="citation-page">Page {src.page_number}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
