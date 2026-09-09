/* eslint-disable no-unused-vars */
/**
 * API client — all fetch wrappers for the FastAPI backend.
 */

const API_BASE = 'http://localhost:8000';

/* ── Upload ─────────────────────────────────────────────────────────────── */

export async function uploadFiles(files) {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || 'Upload failed');
  }
  return res.json();
}

/* ── Documents ──────────────────────────────────────────────────────────── */

export async function getDocuments() {
  const res = await fetch(`${API_BASE}/documents`);
  if (!res.ok) throw new Error('Failed to fetch documents');
  return res.json();
}

export async function deleteDocument(documentId) {
  const res = await fetch(`${API_BASE}/documents/${documentId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Delete failed' }));
    throw new Error(err.detail || 'Delete failed');
  }
  return res.json();
}

/* ── Chat (non-streaming) ───────────────────────────────────────────────── */

export async function sendMessage(question, sessionId) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, session_id: sessionId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Chat request failed' }));
    throw new Error(err.detail || 'Chat request failed');
  }
  return res.json();
}

/* ── Chat (streaming SSE via fetch) ─────────────────────────────────────── */

export async function streamMessage(question, sessionId, onToken, onSources, onError, onDone) {
  let finished = false;

  try {
    const res = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, session_id: sessionId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Stream failed' }));
      throw new Error(err.detail || 'Stream failed');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          switch (data.type) {
            case 'token':
              onToken(data.content);
              break;
            case 'sources':
              onSources(data.sources || []);
              break;
            case 'error':
              onError(data.content);
              finished = true;
              break;
            case 'done':
              finished = true;
              onDone();
              break;
          }
        } catch {
          /* skip unparseable SSE lines */
        }
      }
    }

    if (!finished) onDone();
  } catch (error) {
    onError(error.message || 'Connection error');
  }
}
