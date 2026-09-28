import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';
import ThemeToggle from '../components/ThemeToggle';
import './AuthPages.css';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect to /app
  useEffect(() => {
    if (user) {
      const destination = location.state?.from?.pathname || '/app';
      navigate(destination, { replace: true });
    }
  }, [user, navigate, location]);

  // Capture OAuth redirect errors if any
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const err = searchParams.get('error');
    if (err) {
      setError(decodeURIComponent(err));
    }
  }, [location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!password) {
      setError('Please enter your password');
      return;
    }

    try {
      setIsSubmitting(true);
      await login(trimmedEmail, password);
      const destination = location.state?.from?.pathname || '/app';
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-editorial-layout">
      {/* Left Column: Editorial Brand Manifesto */}
      <div className="login-editorial-aside">
        <div className="editorial-top-brand">
          <Link to="/" className="editorial-logo">
            <span className="editorial-logo-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </span>
            <span className="editorial-logo-text">DocChat</span>
          </Link>
        </div>

        <div className="editorial-quote-wrap">
          <h2 className="editorial-headline">
            Grounded knowledge, retrieved with precision.
          </h2>
          <p className="editorial-subline">
            Query documentation, specifications, and reports with verified page citations and zero hallucination retrieval.
          </p>

          <div className="editorial-features-list">
            <div className="editorial-feature-item">
              <span className="editorial-feature-bullet">&bull;</span>
              <span>Semantic indexing with exact passage attribution</span>
            </div>
            <div className="editorial-feature-item">
              <span className="editorial-feature-bullet">&bull;</span>
              <span>Isolated, encrypted workspace storage</span>
            </div>
            <div className="editorial-feature-item">
              <span className="editorial-feature-bullet">&bull;</span>
              <span>Zero training on your private files</span>
            </div>
          </div>
        </div>

        <div className="editorial-footer-note">
          <span>Enterprise document intelligence</span>
        </div>
      </div>

      {/* Right Column: Focused Sign In Form */}
      <div className="login-form-pane">
        <div className="login-top-bar">
          <Link to="/" className="auth-back-link">
            &larr; Back to home
          </Link>
          <ThemeToggle />
        </div>

        <div className="login-form-card">
          <div className="auth-header-block">
            <h1 className="auth-main-title">Sign in</h1>
            <p className="auth-main-subtitle">
              Enter your credentials to access your workspace.
            </p>
          </div>

          {error && (
            <div className="auth-error-banner" role="alert">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="auth-oauth-wrap">
            <GoogleSignInButton text="Continue with Google" />
          </div>

          <div className="auth-separator">
            <span>or sign in with email</span>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-input-group">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                className="auth-input-field"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="auth-input-group">
              <div className="auth-label-row">
                <label htmlFor="login-password">Password</label>
              </div>
              <div className="auth-input-with-action">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input-field"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex="-1"
                >
                  {showPassword ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="auth-primary-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-small" />
                  <span>Signing in…</span>
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="auth-footer-prompt">
            <span>Don&apos;t have an account?</span>{' '}
            <Link to="/signup" className="auth-action-link">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
