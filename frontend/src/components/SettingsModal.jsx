import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { updateProfile, changePassword } from '../api/client';
import './SettingsModal.css';

export default function SettingsModal({ isOpen = false, onClose, onLogout }) {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security' | 'appearance'

  // Profile Form State
  const [name, setName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user) {
      setName(user.name || '');
    }
    setProfileMsg({ type: '', text: '' });
    setPasswordMsg({ type: '', text: '' });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  }, [user, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  /* ── Profile Update ── */
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setProfileMsg({ type: 'error', text: 'Name cannot be empty' });
      return;
    }

    try {
      setSavingProfile(true);
      setProfileMsg({ type: '', text: '' });
      const updated = await updateProfile({ name: trimmed });
      updateUser(updated);
      setProfileMsg({ type: 'success', text: 'Profile name updated successfully' });
      addToast('Profile updated', 'success');
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setSavingProfile(false);
    }
  };

  /* ── Password Change ── */
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordMsg({ type: 'error', text: 'Please enter your current password' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    try {
      setSavingPassword(true);
      setPasswordMsg({ type: '', text: '' });
      await changePassword(currentPassword, newPassword);
      setPasswordMsg({ type: 'success', text: 'Password changed successfully' });
      addToast('Password changed successfully', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.message || 'Failed to change password' });
    } finally {
      setSavingPassword(false);
    }
  };

  const isOAuth = Boolean(user?.is_oauth);

  const formatCreationDate = (isoString) => {
    if (!isoString) return 'Active Member';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return 'Active Member';
    }
  };

  return (
    <div className="settings-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="settings-modal-container"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="settings-modal-header">
          <div className="settings-header-title">
            <h2 id="settings-dialog-title">Account Settings</h2>
          </div>
          <button
            type="button"
            className="settings-modal-close-btn"
            onClick={onClose}
            aria-label="Close Settings"
          >
            ✕
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="settings-modal-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'profile'}
            className={`settings-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'security'}
            className={`settings-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            Security
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'appearance'}
            className={`settings-tab-btn ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            Appearance
          </button>
        </div>

        {/* Modal Body */}
        <div className="settings-modal-body">
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="settings-form">
              <div className="settings-form-group">
                <label htmlFor="settings-name" className="settings-label">Full Name</label>
                <input
                  id="settings-name"
                  type="text"
                  className="settings-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  disabled={savingProfile}
                  required
                />
              </div>

              <div className="settings-form-group">
                <div className="settings-label-row">
                  <label htmlFor="settings-email" className="settings-label">Email Address</label>
                  <span className="readonly-pill">Read Only</span>
                </div>
                <input
                  id="settings-email"
                  type="email"
                  className="settings-input disabled-input"
                  value={user?.email || ''}
                  disabled
                  readOnly
                />
              </div>

              <div className="settings-meta-summary">
                <div className="meta-summary-row">
                  <span className="meta-summary-label">Account Created</span>
                  <span className="meta-summary-val">{formatCreationDate(user?.created_at)}</span>
                </div>
                <div className="meta-summary-row">
                  <span className="meta-summary-label">Authentication</span>
                  <span className="meta-summary-val">
                    {isOAuth ? 'Google Single Sign-On' : 'Email & Password'}
                  </span>
                </div>
              </div>

              {profileMsg.text && (
                <div className={`settings-alert ${profileMsg.type}`}>
                  {profileMsg.text}
                </div>
              )}

              <div className="settings-form-actions">
                <button
                  type="submit"
                  className="settings-submit-btn"
                  disabled={savingProfile || name.trim() === user?.name}
                >
                  {savingProfile ? <span className="spinner-small" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <div className="settings-security-pane">
              {isOAuth ? (
                <div className="oauth-notice-box">
                  <div className="oauth-notice-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                  </div>
                  <div className="oauth-notice-content">
                    <h4>Google OAuth Account</h4>
                    <p>
                      Your account was authenticated using Google Single Sign-On.
                      Password changes are managed through your Google Account security settings.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleChangePassword} className="settings-form">
                  <div className="settings-form-group">
                    <label htmlFor="current-pw" className="settings-label">Current Password</label>
                    <input
                      id="current-pw"
                      type="password"
                      className="settings-input"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={savingPassword}
                      required
                    />
                  </div>

                  <div className="settings-form-group">
                    <label htmlFor="new-pw" className="settings-label">New Password</label>
                    <input
                      id="new-pw"
                      type="password"
                      className="settings-input"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      disabled={savingPassword}
                      required
                    />
                  </div>

                  <div className="settings-form-group">
                    <label htmlFor="confirm-pw" className="settings-label">Confirm New Password</label>
                    <input
                      id="confirm-pw"
                      type="password"
                      className="settings-input"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={savingPassword}
                      required
                    />
                  </div>

                  {passwordMsg.text && (
                    <div className={`settings-alert ${passwordMsg.type}`}>
                      {passwordMsg.text}
                    </div>
                  )}

                  <div className="settings-form-actions">
                    <button
                      type="submit"
                      className="settings-submit-btn"
                      disabled={savingPassword || !currentPassword || !newPassword}
                    >
                      {savingPassword ? <span className="spinner-small" /> : 'Update Password'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* APPEARANCE TAB */}
          {activeTab === 'appearance' && (
            <div className="settings-appearance-pane">
              <span className="settings-label">Theme Mode</span>
              <p className="settings-helper-text">
                Select your preferred interface surface style.
              </p>
              <div className="theme-options-grid">
                <button
                  type="button"
                  className={`theme-card-option ${theme === 'dark' ? 'active' : ''}`}
                  onClick={() => setTheme('dark')}
                >
                  <div className="theme-preview-box dark-preview" />
                  <div className="theme-option-text">
                    <span className="theme-name">Dark (Obsidian)</span>
                    <span className="theme-desc">Neutral charcoal and black</span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`theme-card-option ${theme === 'light' ? 'active' : ''}`}
                  onClick={() => setTheme('light')}
                >
                  <div className="theme-preview-box light-preview" />
                  <div className="theme-option-text">
                    <span className="theme-name">Light</span>
                    <span className="theme-desc">Crisp architectural slate</span>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Sign Out */}
        <div className="settings-modal-footer">
          <div className="footer-account-info">
            <span className="account-label">Logged in as <strong>{user?.email}</strong></span>
          </div>
          <button
            type="button"
            className="settings-logout-btn"
            onClick={() => {
              onClose();
              if (onLogout) onLogout();
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
