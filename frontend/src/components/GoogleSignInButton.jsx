import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './GoogleSignInButton.css';

export default function GoogleSignInButton({
  text = 'Continue with Google',
  className = '',
  onSuccess,
}) {
  const { loginWithGoogle, authConfig } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Read Google Client ID strictly from environment variable, falling back to server config
  const googleClientId = (
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    authConfig?.google_client_id ||
    ''
  ).trim();

  const hiddenGsiRef = useRef(null);

  // Initialize Google Identity Services (GIS) if client ID is configured
  useEffect(() => {
    if (!googleClientId) return;

    const scriptId = 'google-gsi-client-script';
    let script = document.getElementById(scriptId);

    const initGsi = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async (response) => {
              if (response?.credential) {
                await handleGoogleCredential(response.credential);
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          // Pre-render hidden standard button to enable direct program clicking
          if (hiddenGsiRef.current) {
            window.google.accounts.id.renderButton(hiddenGsiRef.current, {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              width: 280,
            });
          }
        } catch (err) {
          console.warn('GIS initialization error:', err);
        }
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGsi;
      document.head.appendChild(script);
    } else {
      initGsi();
    }
  }, [googleClientId]);

  const handleGoogleCredential = async (credential) => {
    setLoading(true);
    setError('');
    try {
      await loginWithGoogle(credential);
      if (onSuccess) {
        onSuccess();
      } else {
        const destination = location.state?.from?.pathname || '/app';
        navigate(destination, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    setError('');

    // If Google Client ID is configured, trigger Google Identity prompt
    if (googleClientId) {
      if (window.google?.accounts?.id) {
        // Trigger One Tap prompt first
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // Fallback: click pre-rendered button if One-Tap prompt is suppressed
            const gsiBtn = hiddenGsiRef.current?.querySelector('div[role="button"]');
            if (gsiBtn) {
              gsiBtn.click();
            } else if (hiddenGsiRef.current) {
              window.google.accounts.id.renderButton(hiddenGsiRef.current, {
                type: 'standard',
                theme: 'outline',
                size: 'large',
              });
              const newlyRendered = hiddenGsiRef.current.querySelector('div[role="button"]');
              if (newlyRendered) newlyRendered.click();
            }
          }
        });
        return;
      }
    }

    // If client ID is missing or script didn't load, show configuration guidance modal
    setShowConfigModal(true);
  };

  return (
    <>
      <div className="google-auth-wrapper">
        <button
          type="button"
          onClick={handleClick}
          disabled={loading}
          className={`google-signin-btn ${className}`}
          title={
            googleClientId
              ? 'Sign in securely with your Google account'
              : 'Google Client ID missing — click for setup instructions'
          }
        >
          {loading ? (
            <span className="spinner-small" />
          ) : (
            <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
          )}
          <span className="google-btn-text">{loading ? 'Connecting…' : text}</span>
        </button>

        {error && <div className="google-auth-error">{error}</div>}

        {/* Hidden anchor for GIS button click delegation */}
        <div ref={hiddenGsiRef} className="hidden-gsi-anchor" aria-hidden="true" />
      </div>

      {/* Setup Guide Modal when GOOGLE_CLIENT_ID is not configured */}
      {showConfigModal && (
        <div className="google-modal-overlay" onClick={() => setShowConfigModal(false)}>
          <div className="google-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="google-modal-header">
              <div className="google-modal-icon-badge">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              </div>
              <h3 className="google-modal-title">Google Authentication Setup</h3>
              <button
                className="google-modal-close"
                onClick={() => setShowConfigModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="google-modal-body">
              <p className="google-modal-desc">
                To enable Google OAuth Sign-In, provide your Google Client ID in your environment configuration:
              </p>

              <div className="google-env-box">
                <code>
                  # frontend/.env<br />
                  VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com<br />
                  <br />
                  # backend/.env<br />
                  GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com<br />
                  GOOGLE_CLIENT_SECRET=your-backend-secret
                </code>
              </div>

              <div className="google-modal-steps">
                <div className="google-step">
                  <span className="step-num">1</span>
                  <span>
                    Open <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">Google Cloud Console</a> and create a Web OAuth 2.0 Client ID.
                  </span>
                </div>
                <div className="google-step">
                  <span className="step-num">2</span>
                  <span>
                    Add Authorized JavaScript Origins: <code>http://localhost:5173</code>
                  </span>
                </div>
                <div className="google-step">
                  <span className="step-num">3</span>
                  <span>
                    Add <code>VITE_GOOGLE_CLIENT_ID</code> to <code>frontend/.env</code> and restart the Vite dev server.
                  </span>
                </div>
              </div>
            </div>

            <div className="google-modal-footer">
              <button
                type="button"
                className="google-modal-btn-primary"
                onClick={() => setShowConfigModal(false)}
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
