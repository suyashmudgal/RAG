import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile, changePassword } from '../api/client';
import './SettingsModal.css';

export default function SettingsModal({ isOpen = false, onClose, onLogout }) {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security'

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

  return (
    <div className="settings-modal-backdrop" onClick={onClose}>
      <div className="settings-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="settings-modal-header">
          <div className="settings-header-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <h2>Account Settings</h2>
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
        <div className="settings-modal-tabs">
          <button
            type="button"
            className={`settings-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>Profile</span>
          </button>

          <button
            type="button"
            className={`settings-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Security</span>
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
                <span className="settings-helper-text">
                  Your email address is permanent and cannot be changed.
                </span>
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
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                  </div>
                  <div className="oauth-notice-content">
                    <h4>Google OAuth Account</h4>
                    <p>
                      Your account was authenticated using Google Single Sign-On.
                      Password changes are managed directly in your Google Account security settings.
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
                      placeholder="At least 6 characters"
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
                      {savingPassword ? <span className="spinner-small" /> : 'Change Password'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer with Account Sign Out */}
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
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
