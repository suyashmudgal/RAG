import { useEffect, useRef } from 'react';
import './DeleteDocumentModal.css';

export default function DeleteDocumentModal({
  isOpen = false,
  doc = null,
  isDeleting = false,
  error = null,
  onConfirm,
  onCancel,
}) {
  const cancelBtnRef = useRef(null);
  const deleteBtnRef = useRef(null);
  const modalCardRef = useRef(null);
  const lastActiveElementRef = useRef(null);

  // Capture active element and set initial focus on Cancel (safe default)
  useEffect(() => {
    if (isOpen) {
      lastActiveElementRef.current = document.activeElement;
      // Small timeout to ensure DOM is rendered before focusing
      const timer = setTimeout(() => {
        cancelBtnRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else if (lastActiveElementRef.current) {
      // Return focus to trigger button when modal closes
      lastActiveElementRef.current.focus?.();
    }
  }, [isOpen]);

  // Accessibility: Escape key and focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (!isDeleting && onCancel) {
          e.preventDefault();
          onCancel();
        }
        return;
      }

      if (e.key === 'Tab') {
        const focusable = [cancelBtnRef.current, deleteBtnRef.current].filter(Boolean);
        if (focusable.length < 2) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onCancel]);

  if (!isOpen || !doc) return null;

  return (
    <div
      className="delete-modal-backdrop"
      onClick={!isDeleting ? onCancel : undefined}
      role="presentation"
    >
      <div
        ref={modalCardRef}
        className="delete-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-desc"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Destructive Warning Icon */}
        <div className="delete-modal-icon-wrap" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </div>

        {/* Header & Description */}
        <h3 id="delete-dialog-title" className="delete-modal-title">
          Delete document?
        </h3>

        <p id="delete-dialog-desc" className="delete-modal-description">
          Are you sure you want to delete{' '}
          <span className="delete-modal-filename" title={doc.filename}>
            &ldquo;{doc.filename}&rdquo;
          </span>
          ?
          <br />
          This will permanently remove the document from your knowledge base.
        </p>

        {/* Error notification if delete failed */}
        {error && (
          <div className="delete-modal-error" role="alert">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="delete-modal-actions">
          <button
            ref={cancelBtnRef}
            type="button"
            className="delete-modal-btn btn-cancel"
            onClick={onCancel}
            disabled={isDeleting}
            aria-label="Cancel deletion"
          >
            Cancel
          </button>
          <button
            ref={deleteBtnRef}
            type="button"
            className="delete-modal-btn btn-destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            aria-label={isDeleting ? 'Deleting document…' : 'Delete document'}
          >
            {isDeleting ? (
              <>
                <span className="spinner-small" />
                <span>Deleting...</span>
              </>
            ) : (
              'Delete document'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
