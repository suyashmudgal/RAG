/* eslint-disable no-unused-vars */
/**
 * API client — all fetch wrappers for the FastAPI backend.
 * Includes credentials: 'include' for secure cookie-based authentication.
 */

const API_BASE = 'http://localhost:8000';

/* ── Auth API ───────────────────────────────────────────────────────────── */

export async function apiSignUp(name, email, password) {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name, email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Sign up failed' }));
    throw new Error(err.detail || 'Sign up failed');
  }
  return res.json();
}

export async function apiSignIn(email, password) {
  const res = await fetch(`${API_BASE}/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Sign in failed' }));
    throw new Error(err.detail || 'Sign in failed');
  }
  return res.json();
}

export async function apiSignOut() {
  const res = await fetch(`${API_BASE}/auth/signout`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Sign out failed' }));
    throw new Error(err.detail || 'Sign out failed');
  }
  return res.json();
}

export async function apiGetMe() {
  const res = await fetch(`${API_BASE}/auth/me`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Not authenticated' }));
    throw new Error(err.detail || 'Not authenticated');
  }
  return res.json();
}

export async function apiGoogleAuth(credential) {
  const res = await fetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ credential }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Google sign in failed' }));
    throw new Error(err.detail || 'Google sign in failed');
  }
  return res.json();
}

export async function apiGetAuthConfig() {
  try {
    const res = await fetch(`${API_BASE}/auth/config`);
    if (!res.ok) return { google_client_id: '', google_enabled: false };
    return res.json();
  } catch {
    return { google_client_id: '', google_enabled: false };
  }
}

/* ── Upload ─────────────────────────────────────────────────────────────── */

export async function uploadFiles(files) {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    credentials: 'include',
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
  const res = await fetch(`${API_BASE}/documents`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch documents');
  return res.json();
}

export async function deleteDocument(documentId) {
  const res = await fetch(`${API_BASE}/documents/${documentId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Delete failed' }));
    throw new Error(err.detail || 'Delete failed');
  }
  return res.json();
}

/* ── Conversations (Persistent Chat History) ────────────────────────────── */

export async function getConversations() {
  const res = await fetch(`${API_BASE}/conversations`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch conversations');
  return res.json();
}

export async function createConversation(title = 'New Conversation') {
  const res = await fetch(`${API_BASE}/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error('Failed to create conversation');
  return res.json();
}

export async function getConversation(conversationId) {
  const res = await fetch(`${API_BASE}/conversations/${conversationId}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch conversation');
  return res.json();
}

export async function deleteConversation(conversationId) {
  const res = await fetch(`${API_BASE}/conversations/${conversationId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Delete failed' }));
    throw new Error(err.detail || 'Delete failed');
  }
  return res.json();
}

/* ── Chat (non-streaming) ────────────────────────────────────────────────── */

export async function sendMessage(question, conversationId) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      question,
      conversation_id: conversationId || undefined,
      session_id: conversationId || undefined,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Chat request failed' }));
    throw new Error(err.detail || 'Chat request failed');
  }
  return res.json();
}

/* ── Chat (streaming SSE via fetch) ──────────────────────────────────────── */

export async function streamMessage(question, conversationId, onToken, onSources, onError, onDone) {
  let finished = false;
  let resolvedConvId = conversationId;

  try {
    const res = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        question,
        conversation_id: conversationId || undefined,
        session_id: conversationId || undefined,
      }),
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
              resolvedConvId = data.conversation_id || resolvedConvId;
              onDone(resolvedConvId);
              break;
          }
        } catch {
          /* skip unparseable SSE lines */
        }
      }
    }

    if (!finished) onDone(resolvedConvId);
  } catch (error) {
    onError(error.message || 'Connection error');
  }
}


/* ── Profile & Password Settings ────────────────────────────────────────── */

export async function updateProfile(data) {
  const res = await fetch(`${API_BASE}/auth/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update profile' }));
    throw new Error(err.detail || 'Failed to update profile');
  }
  return res.json();
}

export async function changePassword(currentPassword, newPassword) {
  const res = await fetch(`${API_BASE}/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to change password' }));
    throw new Error(err.detail || 'Failed to change password');
  }
  return res.json();
}
