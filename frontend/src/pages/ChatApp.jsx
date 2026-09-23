import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ChatPanel from '../components/ChatPanel';
import DocumentContextPanel from '../components/DocumentContextPanel';
import SettingsModal from '../components/SettingsModal';
import { useAuth } from '../contexts/AuthContext';
import {
  getConversations,
  deleteConversation,
  renameConversation,
  pinConversation,
  getDocuments,
  deleteDocument,
  getDocumentStatus,
  downloadDocumentFile,
} from '../api/client';
import '../App.css';
import './ChatApp.css';

export default function ChatApp() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  // Mobile navigation drawers
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Right-hand Document Knowledge Base panel
  const [docPanelOpen, setDocPanelOpen] = useState(() => {
    // Open by default on wide desktop displays (>= 1280px)
    return window.innerWidth >= 1280;
  });

  // Conversations state & in-memory cache
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(() => {
    return localStorage.getItem('active_conversation_id') || null;
  });
  const [loadingConversations, setLoadingConversations] = useState(false);

  // Documents state & live processing queue
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState(null);
  const [downloadingDoc, setDownloadingDoc] = useState(null);

  // Active document processing jobs: { [docId]: statusData }
  const [processingDocs, setProcessingDocs] = useState({});
  const pollingTimersRef = useRef({});

  /* ── 1. Fetch Conversations with lean loading ── */
  const loadConversations = useCallback(async () => {
    try {
      setLoadingConversations(true);
      const list = await getConversations();
      const safeList = list || [];
      setConversations(safeList);

      const savedId = localStorage.getItem('active_conversation_id');
      if (savedId && safeList.some((c) => c.id === savedId)) {
        setActiveConversationId(savedId);
      } else if (safeList.length > 0 && !savedId) {
        setActiveConversationId(safeList[0].id);
        localStorage.setItem('active_conversation_id', safeList[0].id);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  /* ── 2. Fetch Documents ── */
  const fetchDocs = useCallback(async () => {
    try {
      setLoadingDocs(true);
      const data = await getDocuments();
      const docList = data.documents || [];
      setDocuments(docList);

      // Inspect any active processing status on server
      docList.forEach((d) => {
        const stage = d.processing_stage || d.status;
        const isTerminal = stage === 'COMPLETED' || stage === 'FAILED' || stage === 'processed';
        if (!isTerminal && d.document_id) {
          setProcessingDocs((prev) => {
            if (prev[d.document_id]) return prev;
            return {
              ...prev,
              [d.document_id]: {
                document_id: d.document_id,
                filename: d.filename,
                processing_stage: stage || 'QUEUED',
                progress: d.progress || 25,
                message: d.message || 'Processing on server…',
                chunk_count: d.chunk_count || 0,
                processed_chunks: d.processed_chunks || 0,
                error: null,
              },
            };
          });
        }
      });
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  /* ── 3. Status Polling Manager (Decoupled per document) ── */
  const pollDocumentStatus = useCallback(
    async (docId) => {
      try {
        const statusData = await getDocumentStatus(docId);

        setProcessingDocs((prev) => {
          if (!prev[docId]) return prev;
          return {
            ...prev,
            [docId]: {
              ...prev[docId],
              ...statusData,
            },
          };
        });

        const stage = statusData.processing_stage || statusData.status;

        if (stage === 'COMPLETED') {
          if (pollingTimersRef.current[docId]) {
            clearTimeout(pollingTimersRef.current[docId]);
            delete pollingTimersRef.current[docId];
          }
          await fetchDocs();
          return;
        }

        if (stage === 'FAILED') {
          if (pollingTimersRef.current[docId]) {
            clearTimeout(pollingTimersRef.current[docId]);
            delete pollingTimersRef.current[docId];
          }
          return;
        }

        // Schedule next poll in 750ms
        pollingTimersRef.current[docId] = setTimeout(() => {
          pollDocumentStatus(docId);
        }, 750);
      } catch (err) {
        console.warn(`Transient status poll error for ${docId}:`, err);
        // Retry gracefully without spamming
        pollingTimersRef.current[docId] = setTimeout(() => {
          pollDocumentStatus(docId);
        }, 1500);
      }
    },
    [fetchDocs]
  );

  // Monitor processing queue and trigger polling for untracked jobs
  useEffect(() => {
    Object.entries(processingDocs).forEach(([docId, doc]) => {
      const stage = doc.processing_stage || doc.status;
      const isTerminal = stage === 'COMPLETED' || stage === 'FAILED';
      if (!isTerminal && !pollingTimersRef.current[docId]) {
        pollDocumentStatus(docId);
      }
    });
  }, [processingDocs, pollDocumentStatus]);

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      const timers = pollingTimersRef.current;
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  /* ── 4. Upload & Processing Queues ── */
  const handleFilesQueued = (newJobs) => {
    setDocPanelOpen(true);
    setProcessingDocs((prev) => {
      const updated = { ...prev };
      newJobs.forEach((job) => {
        const id = job.document_id || job.id;
        if (id) {
          updated[id] = {
            document_id: id,
            filename: job.filename,
            processing_stage: job.processing_stage || job.status || 'UPLOADED',
            progress: job.progress ?? 25,
            message: job.message || 'Uploaded to server',
            chunk_count: job.chunk_count || 0,
            processed_chunks: job.processed_chunks || 0,
            error: null,
          };
        }
      });
      return updated;
    });
  };

  const handleDismissProcessing = (docId) => {
    if (pollingTimersRef.current[docId]) {
      clearTimeout(pollingTimersRef.current[docId]);
      delete pollingTimersRef.current[docId];
    }
    setProcessingDocs((prev) => {
      const copy = { ...prev };
      delete copy[docId];
      return copy;
    });
  };

  /* ── 5. Document Actions ── */
  const handleDownloadDoc = async (doc) => {
    if (downloadingDoc) return;
    setDownloadingDoc(doc.document_id);
    try {
      await downloadDocumentFile(doc.document_id, doc.filename);
    } catch (err) {
      alert(`Download failed: ${err.message}`);
    } finally {
      setDownloadingDoc(null);
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (deletingDoc) return;
    setDeletingDoc(docId);
    const previousDocs = documents;
    setDocuments((prev) => prev.filter((d) => d.document_id !== docId));
    try {
      await deleteDocument(docId);
      await fetchDocs();
    } catch (err) {
      setDocuments(previousDocs);
      alert(`Delete document failed: ${err.message}`);
    } finally {
      setDeletingDoc(null);
    }
  };

  /* ── 6. Conversation Actions ── */
  const handleSelectConversation = (convId) => {
    setActiveConversationId(convId);
    localStorage.setItem('active_conversation_id', convId);
  };

  const handleNewChat = useCallback(() => {
    setActiveConversationId(null);
    localStorage.removeItem('active_conversation_id');
  }, []);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNewChat]);

  // Rename conversation
  const handleRenameConversation = async (convId, newTitle) => {
    // Optimistic local update
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, title: newTitle, is_custom_title: true } : c))
    );
    try {
      await renameConversation(convId, newTitle);
    } catch (err) {
      console.error('Rename conversation failed on backend:', err);
      // Revert if error
      await loadConversations();
    }
  };

  // Pin / Unpin conversation
  const handleTogglePinConversation = async (convId, nextPinned) => {
    // Optimistic local update with pinned-first sort
    setConversations((prev) => {
      const updated = prev.map((c) => (c.id === convId ? { ...c, is_pinned: nextPinned } : c));
      return updated.sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return b.is_pinned ? 1 : -1;
        const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
        const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
        return dateB - dateA;
      });
    });

    try {
      await pinConversation(convId, nextPinned);
    } catch (err) {
      console.error('Pin conversation failed on backend:', err);
      await loadConversations();
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (convId) => {
    const previous = conversations;
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (activeConversationId === convId) {
      handleNewChat();
    }
    try {
      await deleteConversation(convId);
    } catch (err) {
      setConversations(previous);
      alert(`Delete conversation failed: ${err.message}`);
    }
  };

  const handleConversationCreated = async (resolvedId) => {
    setActiveConversationId(resolvedId);
    localStorage.setItem('active_conversation_id', resolvedId);
    await loadConversations();
  };

  const handleSignOut = async () => {
    // Clean up all polling timers immediately
    const timers = pollingTimersRef.current;
    Object.values(timers).forEach(clearTimeout);
    pollingTimersRef.current = {};

    localStorage.removeItem('active_conversation_id');
    setActiveConversationId(null);
    setConversations([]);
    await logout();
    navigate('/', { replace: true });
  };

  const activeConv = conversations.find((c) => c.id === activeConversationId);

  const activeProcessingCount = useMemo(() => {
    return Object.values(processingDocs).filter(
      (d) => d.processing_stage !== 'COMPLETED' && d.processing_stage !== 'FAILED'
    ).length;
  }, [processingDocs]);

  // Compute strictly completed/indexed documents (excluding documents currently processing or failed)
  const indexedDocCount = useMemo(() => {
    return documents.filter((d) => {
      const activeJob = processingDocs[d.document_id];
      if (activeJob) {
        const stage = (activeJob.processing_stage || activeJob.status || '').toUpperCase();
        if (stage !== 'COMPLETED' && stage !== 'PROCESSED') {
          return false;
        }
      }
      const docStage = (d.processing_stage || d.status || '').toUpperCase();
      if (docStage === 'FAILED' || docStage === 'ERROR') return false;
      return docStage === 'COMPLETED' || docStage === 'PROCESSED' || docStage === 'INDEXED' || (!docStage && !d.error);
    }).length;
  }, [documents, processingDocs]);

  return (
    <div className="app-container">
      {/* 3-Column Modern AI Workspace */}
      <div className="app-workspace-layout">
        {/* Left: Conversations Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          onDeleteConversation={handleDeleteConversation}
          onRenameConversation={handleRenameConversation}
          onTogglePinConversation={handleTogglePinConversation}
          loadingConversations={loadingConversations}
          onOpenSettings={() => setSettingsOpen(true)}
          onSignOut={handleSignOut}
          onToggleDocPanel={() => setDocPanelOpen((prev) => !prev)}
          docPanelOpen={docPanelOpen}
          documentCount={indexedDocCount}
          processingCount={activeProcessingCount}
        />

        {/* Center: AI Chat Workspace Canvas */}
        <ChatPanel
          activeConversationId={activeConversationId}
          activeConversationTitle={activeConv?.title || ''}
          onConversationCreated={handleConversationCreated}
          onNewChat={handleNewChat}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          onToggleDocPanel={() => setDocPanelOpen((prev) => !prev)}
          docPanelOpen={docPanelOpen}
          indexedDocCount={indexedDocCount}
          onOpenUpload={() => setDocPanelOpen(true)}
        />

        {/* Right: Document Knowledge Base & Live Pipeline */}
        <DocumentContextPanel
          isOpen={docPanelOpen}
          onClose={() => setDocPanelOpen(false)}
          documents={documents}
          loadingDocs={loadingDocs}
          processingDocs={processingDocs}
          onUploadComplete={fetchDocs}
          onFilesQueued={handleFilesQueued}
          onDismissProcessing={handleDismissProcessing}
          onDownloadDoc={handleDownloadDoc}
          onDeleteDoc={handleDeleteDoc}
          deletingDoc={deletingDoc}
          downloadingDoc={downloadingDoc}
        />
      </div>

      {/* Account & Profile Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onLogout={handleSignOut}
      />
    </div>
  );
}
