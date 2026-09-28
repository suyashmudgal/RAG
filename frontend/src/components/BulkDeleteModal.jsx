import { useEffect, useRef } from 'react';
import './BulkDeleteModal.css';

export default function BulkDeleteModal({
  isOpen = false,
  count = 0,
  isDeleting = false,
  onConfirm,
  onCancel,
}) {
  const cancelBtnRef = useRef(null);
  const deleteBtnRef = useRef(null);
  const lastActiveElementRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      lastActiveElementRef.current = document.activeElement;
      const timer = setTimeout(() => {
        cancelBtnRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else if (lastActiveElementRef.current) {
      lastActiveElementRef.current.focus?.();
    }
  }, [isOpen]);

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

  if (!isOpen) return null;

  return (
    <div
      className="bulk-delete-backdrop"
      onClick={!isDeleting ? onCancel : undefined}
      role="presentation"
    >
      <div
        className="bulk-delete-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-delete-title"
        aria-describedby="bulk-delete-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bulk-delete-icon-wrap" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </div>

        <h3 id="bulk-delete-title" className="bulk-delete-title">
          Delete {count} conversation{count === 1 ? '' : 's'}?
        </h3>

        <p id="bulk-delete-desc" className="bulk-delete-description">
          This action permanently deletes the selected conversation{count === 1 ? '' : 's'} and their messages.
        </p>

        <div className="bulk-delete-actions">
          <button
            ref={cancelBtnRef}
            type="button"
            className="bulk-delete-btn btn-cancel"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            ref={deleteBtnRef}
            type="button"
            className="bulk-delete-btn btn-destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <span className="spinner-small" />
                <span>Deleting...</span>
              </>
            ) : (
              `Delete ${count > 1 ? `${count} conversations` : 'conversation'}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
