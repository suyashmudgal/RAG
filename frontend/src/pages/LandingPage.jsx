import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';
import ThemeToggle from '../components/ThemeToggle';
import './LandingPage.css';

const SAMPLE_DEMOS = {
  policy: {
    id: 'policy',
    title: 'Employee Handbook',
    fileName: 'Employee_Handbook_2024.pdf',
    fileType: 'pdf',
    fileSize: '1.2 MB',
    chunks: 14,
    question: 'What is the reimbursement limit and eligibility for home office equipment?',
    answer:
      'According to Section 4.2 of the **Employee Handbook 2024**, full-time employees are eligible for a one-time remote setup stipend of up to **$750** within their first 90 days of employment. Eligible equipment includes monitors, ergonomic chairs, and desk accessories.\n\nIn addition, recurring monthly internet connectivity is reimbursable up to **$60/month** when submitted with itemized service provider invoices.',
    citations: [
      {
        filename: 'Employee_Handbook_2024.pdf',
        page: 6,
        score: '0.94',
        excerpt:
          'Section 4.2: Remote Office Reimbursement — Full-time employees may claim a one-time stipend of up to $750 for ergonomic desks, external displays, and approved peripherals within 90 days of hire. Ongoing broadband internet is subsidized up to $60 monthly upon expense submission.',
      },
      {
        filename: 'Employee_Handbook_2024.pdf',
        page: 7,
        score: '0.88',
        excerpt:
          'Receipt submission must be completed through the internal financial portal by the 25th calendar day of each operating month.',
      },
    ],
  },
  financial: {
    id: 'financial',
    title: 'Quarterly Earnings Report',
    fileName: 'Q3_Financial_Summary.pdf',
    fileType: 'pdf',
    fileSize: '2.4 MB',
    chunks: 28,
    question: 'What was the reported revenue growth in Q3 and what primary factors drove it?',
    answer:
      'Total consolidated revenue reached **$48.6M**, reflecting a **34.2% year-over-year increase** compared to Q3 of the prior fiscal year.\n\nThe principal growth drivers cited were accelerated enterprise customer expansion (+42% YoY) and strong retention metrics, with Net Revenue Retention (NRR) improving to **118%**.',
    citations: [
      {
        filename: 'Q3_Financial_Summary.pdf',
        page: 3,
        score: '0.96',
        excerpt:
          'Revenue for the third fiscal quarter ended September 30 totaled $48.6 million, an increase of 34.2% from $36.2 million in the comparable prior-year period.',
      },
      {
        filename: 'Q3_Financial_Summary.pdf',
        page: 5,
        score: '0.91',
        excerpt:
          'Operating Highlights: Enterprise segment expansion grew 42% YoY, with dollar-based net retention rate expanding to 118%, driven by multi-product contract adoptions.',
      },
    ],
  },
  architecture: {
    id: 'architecture',
    title: 'System Architecture Spec',
    fileName: 'System_Architecture_v2.docx',
    fileType: 'docx',
    fileSize: '840 KB',
    chunks: 19,
    question: 'How is data indexed in the vector store and what embedding model is utilized?',
    answer:
      "The ingestion pipeline parses documents with format-specific loaders (PyPDF, Docx2txt, and TextLoader) and splits content using LangChain's **RecursiveCharacterTextSplitter** with an 800-character chunk window and 200-character overlap.\n\nEmbeddings are computed locally using **sentence-transformers/all-MiniLM-L6-v2** producing 384-dimensional dense vectors stored in a persistent local **ChromaDB** collection.",
    citations: [
      {
        filename: 'System_Architecture_v2.docx',
        page: null,
        score: '0.97',
        excerpt:
          'Data Ingestion Pipeline: Ingested documents undergo recursive character chunking (chunk_size=800, overlap=200). Chunks are vectorized using the HuggingFace all-MiniLM-L6-v2 model and indexed in persistent ChromaDB storage.',
      },
    ],
  },
};

export default function LandingPage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('policy');
  const [expandedCitation, setExpandedCitation] = useState(null);
  const [faqOpen, setFaqOpen] = useState({ 0: true });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeDemo = SAMPLE_DEMOS[activeTab];

  const toggleFaq = (index) => {
    setFaqOpen((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const getDocIcon = (type) => {
    if (type === 'pdf') {
      return (
        <span className="file-badge-icon badge-pdf" aria-label="PDF">
          PDF
        </span>
      );
    }
    if (type === 'docx') {
      return (
        <span className="file-badge-icon badge-docx" aria-label="DOCX">
          DOC
        </span>
      );
    }
    return (
      <span className="file-badge-icon badge-txt" aria-label="TXT">
        TXT
      </span>
    );
  };

  return (
    <div className="landing-root">
      {/* ── 1. Navbar ──────────────────────────────────────────────────────── */}
      <header className="site-header">
        <div className="nav-container">
          <Link to="/" className="brand-logo" aria-label="DocChat AI Home">
            <div className="brand-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <span className="brand-name">
              DocChat <span className="brand-highlight">AI</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="nav-menu" aria-label="Main Navigation">
            <a href="#preview" className="nav-item">Interactive Demo</a>
            <a href="#features" className="nav-item">Capabilities</a>
            <a href="#pipeline" className="nav-item">Pipeline</a>
            <a href="#usecases" className="nav-item">Use Cases</a>
            <a href="#architecture" className="nav-item">Architecture</a>
            <a href="#faq" className="nav-item">FAQ</a>
          </nav>

          {/* Right Nav Actions */}
          <div className="nav-actions-group">
            <ThemeToggle />

            {user ? (
              <div className="nav-auth-user">
                <Link to="/app" className="btn-nav-primary">
                  <span>Workspace</span>
                  <span className="nav-btn-arrow">→</span>
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="btn-nav-ghost"
                  title="Sign out of your account"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="nav-auth-guest">
                <Link to="/login" className="btn-nav-ghost">
                  Sign In
                </Link>
                <Link to="/signup" className="btn-nav-primary">
                  <span>Get Started</span>
                  <span className="nav-btn-arrow">→</span>
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              className="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {mobileMenuOpen ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </>
                ) : (
                  <>
                    <line x1="4" y1="6" x2="20" y2="6" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" y1="18" x2="20" y2="18" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="mobile-nav-drawer">
            <div className="mobile-nav-links">
              <a href="#preview" onClick={() => setMobileMenuOpen(false)}>Interactive Demo</a>
              <a href="#features" onClick={() => setMobileMenuOpen(false)}>Capabilities</a>
              <a href="#pipeline" onClick={() => setMobileMenuOpen(false)}>Pipeline</a>
              <a href="#usecases" onClick={() => setMobileMenuOpen(false)}>Use Cases</a>
              <a href="#architecture" onClick={() => setMobileMenuOpen(false)}>Architecture</a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
            </div>
            <div className="mobile-nav-actions">
              {user ? (
                <>
                  <Link to="/app" className="btn-mobile-primary" onClick={() => setMobileMenuOpen(false)}>
                    Open Workspace →
                  </Link>
                  <button type="button" onClick={() => { logout(); setMobileMenuOpen(false); }} className="btn-mobile-ghost">
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/signup" className="btn-mobile-primary" onClick={() => setMobileMenuOpen(false)}>
                    Get Started Free →
                  </Link>
                  <Link to="/login" className="btn-mobile-ghost" onClick={() => setMobileMenuOpen(false)}>
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── 2. Hero Section ────────────────────────────────────────────────── */}
      <section className="hero-section">
        <div className="hero-backdrop-glow hero-glow-1" />
        <div className="hero-backdrop-glow hero-glow-2" />

        <div className="landing-container hero-container">
          <div className="hero-content">
            {/* Pill Eyebrow */}
            <div className="hero-eyebrow">
              <span className="eyebrow-pulse" />
              <span>DocChat AI 2.0 · Grounded RAG with Provenance</span>
            </div>

            {/* Main Headline */}
            <h1 className="hero-headline">
              Ask questions across your documents.{' '}
              <br className="headline-br" />
              Get answers backed by <span className="text-gradient">exact citations.</span>
            </h1>

            {/* Subheadline */}
            <p className="hero-description">
              Upload PDF, DOCX, and TXT files. DocChat AI parses, embeds, and indexes your files locally
              with ChromaDB, retrieving precise passages to synthesize hallucination-free, streamed answers.
            </p>

            {/* Hero CTAs */}
            <div className="hero-cta-group">
              {user ? (
                <div className="hero-actions-row">
                  <Link to="/app" className="btn-hero-primary">
                    <span>Open Workspace</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </Link>
                  <a href="#preview" className="btn-hero-secondary">
                    View Live Preview ↓
                  </a>
                </div>
              ) : (
                <div className="hero-guest-grid">
                  <div className="hero-google-box">
                    <GoogleSignInButton text="Continue with Google" />
                  </div>
                  <div className="hero-actions-row">
                    <Link to="/signup" className="btn-hero-primary">
                      <span>Create Free Account</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </Link>
                    <a href="#preview" className="btn-hero-ghost">
                      See Live Demo ↓
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Spec Badges Bar */}
            <div className="hero-specs-row">
              <div className="spec-item">
                <svg className="spec-check" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>PDF, DOCX &amp; TXT Ingestion</span>
              </div>
              <div className="spec-item">
                <svg className="spec-check" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Page-Specific Source Citations</span>
              </div>
              <div className="spec-item">
                <svg className="spec-check" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Local ChromaDB Vector Storage</span>
              </div>
              <div className="spec-item">
                <svg className="spec-check" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Sub-Second Streaming Inference</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Product Preview Showcase ────────────────────────────────────── */}
      <section className="preview-section" id="preview">
        <div className="landing-container">
          <div className="section-head text-center">
            <span className="section-kicker">Interactive Product Demo</span>
            <h2 className="section-title">See how grounded answers are generated</h2>
            <p className="section-subtitle">
              Select a sample document below to inspect real-time query answers and verifiable citations.
            </p>
          </div>

          {/* Document Switcher Tab Bar */}
          <div className="preview-tab-bar">
            {Object.values(SAMPLE_DEMOS).map((demo) => (
              <button
                key={demo.id}
                type="button"
                className={`preview-tab-btn ${activeTab === demo.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(demo.id);
                  setExpandedCitation(null);
                }}
              >
                {getDocIcon(demo.fileType)}
                <span className="tab-title">{demo.title}</span>
              </button>
            ))}
          </div>

          {/* Window Container */}
          <div className="app-preview-frame">
            {/* Window Header */}
            <div className="preview-window-header">
              <div className="window-dots">
                <span className="dot dot-close" />
                <span className="dot dot-min" />
                <span className="dot dot-expand" />
              </div>
              <div className="window-center-title">
                <span className="status-dot-active" />
                <span className="window-file-name">{activeDemo.fileName}</span>
              </div>
              <div className="window-info-badge">
                <span>{activeDemo.chunks} chunks indexed</span>
              </div>
            </div>

            {/* Window Body */}
            <div className="preview-window-body">
              {/* Left Sidebar Simulation */}
              <aside className="preview-sidebar">
                <div className="preview-sidebar-header">
                  <span className="sidebar-label">Documents</span>
                  <span className="sidebar-count-badge">3</span>
                </div>

                <div className="preview-doc-items">
                  {Object.values(SAMPLE_DEMOS).map((demo) => (
                    <div
                      key={demo.id}
                      className={`preview-doc-card ${activeTab === demo.id ? 'selected' : ''}`}
                      onClick={() => {
                        setActiveTab(demo.id);
                        setExpandedCitation(null);
                      }}
                    >
                      <div className="doc-icon-box">{getDocIcon(demo.fileType)}</div>
                      <div className="doc-info-block">
                        <span className="doc-filename">{demo.fileName}</span>
                        <span className="doc-submeta">
                          {demo.fileSize} · {demo.chunks} chunks
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="preview-sidebar-stats">
                  <div className="stat-pill">
                    <span className="stat-key">Embedding</span>
                    <span className="stat-value">all-MiniLM-L6-v2</span>
                  </div>
                  <div className="stat-pill">
                    <span className="stat-key">LLM Inference</span>
                    <span className="stat-value">Groq Llama 3</span>
                  </div>
                </div>
              </aside>

              {/* Right Chat Area Simulation */}
              <main className="preview-chat-area">
                <div className="preview-messages-flow">
                  {/* User Query */}
                  <div className="preview-msg user-msg">
                    <div className="msg-avatar user-avatar-box">U</div>
                    <div className="msg-bubble user-bubble-content">
                      <p>{activeDemo.question}</p>
                    </div>
                  </div>

                  {/* Assistant Answer */}
                  <div className="preview-msg assistant-msg">
                    <div className="msg-avatar assistant-avatar-box">🤖</div>
                    <div className="msg-bubble assistant-bubble-content">
                      <div className="assistant-text">
                        {activeDemo.answer.split('\n\n').map((para, idx) => (
                          <p
                            key={idx}
                            dangerouslySetInnerHTML={{
                              __html: para
                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                .replace(/`(.*?)`/g, '<code>$1</code>'),
                            }}
                          />
                        ))}
                      </div>

                      {/* Source Citations */}
                      <div className="preview-citations-wrapper">
                        <div className="citations-label-row">
                          <span className="cite-pin">📌</span>
                          <span className="cite-label">Verified Sources ({activeDemo.citations.length})</span>
                          <span className="cite-instruction">Click to inspect excerpt</span>
                        </div>

                        <div className="citations-chips-group">
                          {activeDemo.citations.map((cite, cIdx) => (
                            <button
                              key={cIdx}
                              type="button"
                              className={`demo-cite-chip ${expandedCitation === cIdx ? 'chip-active' : ''}`}
                              onClick={() =>
                                setExpandedCitation(expandedCitation === cIdx ? null : cIdx)
                              }
                            >
                              <span className="chip-file">{cite.filename}</span>
                              {cite.page != null && (
                                <span className="chip-page">p. {cite.page}</span>
                              )}
                              <span className="chip-score">{cite.score}</span>
                            </button>
                          ))}
                        </div>

                        {/* Expandable Excerpt Panel */}
                        {expandedCitation !== null && activeDemo.citations[expandedCitation] && (
                          <div className="citation-peek-box">
                            <div className="citation-peek-header">
                              <span>
                                Excerpt from <strong>{activeDemo.citations[expandedCitation].filename}</strong>
                                {activeDemo.citations[expandedCitation].page != null &&
                                  ` (Page ${activeDemo.citations[expandedCitation].page})`}
                              </span>
                              <button
                                type="button"
                                className="peek-close-btn"
                                onClick={() => setExpandedCitation(null)}
                                aria-label="Close excerpt"
                              >
                                ✕
                              </button>
                            </div>
                            <blockquote className="citation-peek-quote">
                              &ldquo;{activeDemo.citations[expandedCitation].excerpt}&rdquo;
                            </blockquote>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Simulated Input Bar */}
                <div className="preview-fake-input">
                  <span className="fake-placeholder">
                    Ask follow-up question regarding {activeDemo.fileName}…
                  </span>
                  <button type="button" className="fake-send-btn" aria-label="Send">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </div>
              </main>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Core Features ──────────────────────────────────────────────── */}
      <section className="features-section" id="features">
        <div className="landing-container">
          <div className="section-head text-center">
            <span className="section-kicker">Engineered Capabilities</span>
            <h2 className="section-title">Built for precision document intelligence</h2>
            <p className="section-subtitle">
              Every stage is architected to guarantee factual accuracy, fast retrieval, and verifiable provenance.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-badge">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <h3 className="feature-title">Multi-Format Parsing</h3>
              <p className="feature-desc">
                Extract text cleanly from PDFs (with page-level tracking via PyPDF),
                Word documents (.docx), and plaintext files up to 50MB per file.
              </p>
              <div className="feature-pill">LangChain Loaders</div>
            </div>

            <div className="feature-card">
              <div className="feature-icon-badge">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <h3 className="feature-title">Dense Semantic Search</h3>
              <p className="feature-desc">
                Chunks are vectorized into 384-dimensional dense vectors using Sentence-Transformers.
                Persistent ChromaDB collections enable fast cosine similarity retrieval.
              </p>
              <div className="feature-pill">ChromaDB Vector Store</div>
            </div>

            <div className="feature-card">
              <div className="feature-icon-badge">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <h3 className="feature-title">Ultra-Fast Groq Inference</h3>
              <p className="feature-desc">
                Retrieved chunks are passed to high-throughput Groq inference running Llama 3
                to synthesize answers in milliseconds with zero lag.
              </p>
              <div className="feature-pill">Groq Acceleration</div>
            </div>

            <div className="feature-card">
              <div className="feature-icon-badge">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <h3 className="feature-title">Verifiable Source Citations</h3>
              <p className="feature-desc">
                Inspect the exact documents, page numbers, and similarity metrics
                underpinning each generated claim. Verify answers against original passages.
              </p>
              <div className="feature-pill">Provenance Tracking</div>
            </div>

            <div className="feature-card">
              <div className="feature-icon-badge">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12h20" />
                  <path d="M20 12l-4-4" />
                  <path d="M20 12l-4 4" />
                </svg>
              </div>
              <h3 className="feature-title">Token-by-Token Streaming</h3>
              <p className="feature-desc">
                Responses stream via Server-Sent Events (SSE) directly from FastAPI to the browser.
                Tokens render progressively in real-time as they generate.
              </p>
              <div className="feature-pill">FastAPI SSE Streaming</div>
            </div>

            <div className="feature-card">
              <div className="feature-icon-badge">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3 className="feature-title">Conversational Memory</h3>
              <p className="feature-desc">
                Ask natural follow-up questions without repeating context. The RAG service
                tracks conversation turns within each active session to resolve dependencies.
              </p>
              <div className="feature-pill">Multi-Turn History</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Technical Pipeline ─────────────────────────────────────────── */}
      <section className="pipeline-section" id="pipeline">
        <div className="landing-container">
          <div className="section-head text-center">
            <span className="section-kicker">Technical Pipeline</span>
            <h2 className="section-title">From raw files to verified answers</h2>
            <p className="section-subtitle">
              A transparent, 4-stage retrieval-augmented generation workflow.
            </p>
          </div>

          <div className="pipeline-grid">
            <div className="pipeline-card">
              <div className="pipeline-step-badge">01</div>
              <h3 className="pipeline-card-title">Upload &amp; Extract</h3>
              <p className="pipeline-card-desc">
                Files (.pdf, .docx, .txt) are parsed with specialized extractors, preserving
                page numbers and document boundaries.
              </p>
            </div>

            <div className="pipeline-card">
              <div className="pipeline-step-badge">02</div>
              <h3 className="pipeline-card-title">Chunk &amp; Vectorize</h3>
              <p className="pipeline-card-desc">
                Content is split into 800-character segments (200-character overlap) and converted into
                384-dimensional embeddings via Sentence-Transformers.
              </p>
            </div>

            <div className="pipeline-card">
              <div className="pipeline-step-badge">03</div>
              <h3 className="pipeline-card-title">Semantic Retrieval</h3>
              <p className="pipeline-card-desc">
                ChromaDB vector store scores query embeddings to retrieve the top-K most
                relevant passages matching the user question.
              </p>
            </div>

            <div className="pipeline-card">
              <div className="pipeline-step-badge">04</div>
              <h3 className="pipeline-card-title">Streamed Synthesis</h3>
              <p className="pipeline-card-desc">
                Groq LLM synthesizes an accurate answer strictly grounded in the retrieved passages,
                accompanied by linked citations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. Real-World Use Cases ───────────────────────────────────────── */}
      <section className="usecases-section" id="usecases">
        <div className="landing-container">
          <div className="section-head text-center">
            <span className="section-kicker">Real-World Workflows</span>
            <h2 className="section-title">Built for document-heavy professionals</h2>
            <p className="section-subtitle">
              Accelerate research, compliance checks, and knowledge discovery across departments.
            </p>
          </div>

          <div className="usecases-grid">
            <div className="usecase-card">
              <div className="usecase-badge">Technical Teams</div>
              <h3 className="usecase-title">API Specs &amp; Architecture Guides</h3>
              <p className="usecase-desc">
                Query complex software documentation, database schemas, and microservice guidelines.
                Verify parameter rules without manual text searches.
              </p>
              <ul className="usecase-list">
                <li>Find configuration parameters across multi-page Word specs</li>
                <li>Understand infrastructure topologies and requirements</li>
                <li>Verify endpoint schemas and authentication protocols</li>
              </ul>
            </div>

            <div className="usecase-card">
              <div className="usecase-badge">Business &amp; Finance</div>
              <h3 className="usecase-title">Financial Filings &amp; Earnings Reports</h3>
              <p className="usecase-desc">
                Navigate quarterly 10-Q filings, audit notes, and investor presentations with
                page-level confidence and verifiable excerpts.
              </p>
              <ul className="usecase-list">
                <li>Compare YoY revenue growth and margin commentary</li>
                <li>Extract specific balance sheet footnotes and disclosures</li>
                <li>Verify financial projections against stated assumptions</li>
              </ul>
            </div>

            <div className="usecase-card">
              <div className="usecase-badge">Operations &amp; HR</div>
              <h3 className="usecase-title">Policies, Compliance &amp; Handbooks</h3>
              <p className="usecase-desc">
                Provide instant, cited answers on company travel policies, reimbursement rules,
                benefits, and compliance checklists.
              </p>
              <ul className="usecase-list">
                <li>Confirm travel policy allowances and expense deadlines</li>
                <li>Review remote working equipment stipends and eligibility</li>
                <li>Search internal compliance protocols quickly</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. Architecture & Stack ───────────────────────────────────────── */}
      <section className="architecture-section" id="architecture">
        <div className="landing-container">
          <div className="section-head text-center">
            <span className="section-kicker">Architecture &amp; Privacy</span>
            <h2 className="section-title">Local vector privacy with cloud LLM speed</h2>
            <p className="section-subtitle">
              Your vectors remain on your server. Fast, secure, and production-ready.
            </p>
          </div>

          <div className="stack-grid">
            <div className="stack-card">
              <div className="stack-card-header">
                <span className="stack-card-name">FastAPI Backend</span>
                <span className="stack-card-tag">Python 3.10+</span>
              </div>
              <p className="stack-card-desc">
                Asynchronous request handling, Server-Sent Events streaming, and secure cookie-based session management.
              </p>
            </div>

            <div className="stack-card">
              <div className="stack-card-header">
                <span className="stack-card-name">ChromaDB Vector Store</span>
                <span className="stack-card-tag">Local Storage</span>
              </div>
              <p className="stack-card-desc">
                Persistent file-backed vector database. Embeddings are stored on your local disk without third-party vector cloud egress.
              </p>
            </div>

            <div className="stack-card">
              <div className="stack-card-header">
                <span className="stack-card-name">Groq API</span>
                <span className="stack-card-tag">Llama 3 Inference</span>
              </div>
              <p className="stack-card-desc">
                Ultra-low latency inference engine generating grounded answers from retrieved context at lightning speeds.
              </p>
            </div>

            <div className="stack-card">
              <div className="stack-card-header">
                <span className="stack-card-name">Local Embeddings</span>
                <span className="stack-card-tag">all-MiniLM-L6-v2</span>
              </div>
              <p className="stack-card-desc">
                Sentence-Transformers model produces 384-dimensional dense semantic vectors locally with zero per-token cost.
              </p>
            </div>

            <div className="stack-card">
              <div className="stack-card-header">
                <span className="stack-card-name">React 18 + Vite</span>
                <span className="stack-card-tag">Modern SPA</span>
              </div>
              <p className="stack-card-desc">
                Responsive SPA with markdown rendering, syntax highlighting, LaTeX math support, and Dark/Light mode.
              </p>
            </div>

            <div className="stack-card">
              <div className="stack-card-header">
                <span className="stack-card-name">JWT &amp; Google Auth</span>
                <span className="stack-card-tag">OAuth 2.0 / GIS</span>
              </div>
              <p className="stack-card-desc">
                HttpOnly cookies with SameSite protection. Seamless Google Sign-In and local SQLite credential stores.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. FAQ ────────────────────────────────────────────────────────── */}
      <section className="faq-section" id="faq">
        <div className="landing-container faq-container">
          <div className="section-head text-center">
            <span className="section-kicker">Frequently Asked Questions</span>
            <h2 className="section-title">Everything you need to know</h2>
          </div>

          <div className="faq-list">
            {[
              {
                q: 'What document file types are supported?',
                a: 'DocChat AI supports PDF (.pdf), Microsoft Word (.docx), and Plain Text (.txt) files. Each format uses dedicated extractors that track document boundaries and page numbers.',
              },
              {
                q: 'Where are my documents and embeddings stored?',
                a: 'Your documents are stored in the local server uploads directory, and vector embeddings are stored locally in a file-backed ChromaDB directory. They are never sent to any external proprietary vector clouds.',
              },
              {
                q: 'How do source citations work?',
                a: 'When you ask a question, the backend retrieves the most similar chunks from ChromaDB and supplies them as grounded context to the LLM. The system renders citation chips showing the document name and page number for immediate verification.',
              },
              {
                q: 'How does Google Authentication work?',
                a: 'DocChat AI supports Google Identity Services (GIS). Clicking "Continue with Google" signs you in securely. The backend validates your Google ID token, links or creates your account, and establishes an httpOnly session cookie.',
              },
              {
                q: 'Is there a limit on uploaded file sizes?',
                a: 'The default upload limit is configured to 50MB per file, configurable via the MAX_FILE_SIZE_MB setting in your environment configuration.',
              },
            ].map((item, idx) => (
              <div key={idx} className={`faq-card ${faqOpen[idx] ? 'faq-open' : ''}`}>
                <button
                  type="button"
                  className="faq-question-btn"
                  onClick={() => toggleFaq(idx)}
                >
                  <span className="faq-question-text">{item.q}</span>
                  <span className="faq-toggle-icon">{faqOpen[idx] ? '−' : '+'}</span>
                </button>
                {faqOpen[idx] && (
                  <div className="faq-answer-body">
                    <p>{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 9. Final Call to Action ───────────────────────────────────────── */}
      <section className="cta-banner-section">
        <div className="landing-container">
          <div className="cta-card">
            <div className="cta-card-content">
              <h2 className="cta-title">Start questioning your documents in seconds</h2>
              <p className="cta-desc">
                Upload contracts, research papers, or software specs. Experience grounded,
                verifiable answers with source citations.
              </p>

              <div className="cta-actions-wrap">
                {user ? (
                  <Link to="/app" className="btn-cta-primary">
                    <span>Open DocChat AI Workspace</span>
                    <span className="btn-arrow">→</span>
                  </Link>
                ) : (
                  <div className="cta-buttons-row">
                    <div className="cta-google-holder">
                      <GoogleSignInButton text="Continue with Google" />
                    </div>
                    <Link to="/signup" className="btn-cta-secondary">
                      Create Free Account →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 10. Footer ────────────────────────────────────────────────────── */}
      <footer className="site-footer">
        <div className="landing-container">
          <div className="footer-grid">
            <div className="footer-brand-col">
              <div className="brand-logo footer-logo">
                <div className="brand-badge">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <span className="brand-name">
                  DocChat <span className="brand-highlight">AI</span>
                </span>
              </div>
              <p className="footer-tagline">
                Grounded Retrieval-Augmented Generation with verifiable citations for PDF, DOCX, and TXT documents.
              </p>
              <div className="footer-status">
                <span className="pulse-dot" />
                <span>RAG Pipeline Operational</span>
              </div>
            </div>

            <div className="footer-nav-col">
              <h4 className="footer-col-title">Navigation</h4>
              <ul className="footer-links">
                <li><a href="#preview">Interactive Demo</a></li>
                <li><a href="#features">Capabilities</a></li>
                <li><a href="#pipeline">How It Works</a></li>
                <li><a href="#usecases">Use Cases</a></li>
                <li><a href="#architecture">Architecture</a></li>
              </ul>
            </div>

            <div className="footer-nav-col">
              <h4 className="footer-col-title">Authentication</h4>
              <ul className="footer-links">
                {user ? (
                  <>
                    <li><Link to="/app">Workspace</Link></li>
                    <li><button type="button" onClick={logout} className="footer-signout-btn">Sign Out</button></li>
                  </>
                ) : (
                  <>
                    <li><Link to="/login">Sign In</Link></li>
                    <li><Link to="/signup">Create Account</Link></li>
                  </>
                )}
              </ul>
            </div>

            <div className="footer-nav-col">
              <h4 className="footer-col-title">Technologies</h4>
              <ul className="footer-links">
                <li>FastAPI &amp; ChromaDB</li>
                <li>Sentence-Transformers</li>
                <li>Groq Inference Cloud</li>
                <li>React 18 &amp; Vite</li>
                <li>Google Identity Services</li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <p className="footer-copyright">
              © {new Date().getFullYear()} DocChat AI. Grounded document question-answering with verifiable citations.
            </p>
            <div className="footer-bottom-badges">
              <span>Local Vector Persistence</span>
              <span>•</span>
              <span>Open Source Architecture</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
