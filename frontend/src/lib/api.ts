const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export interface Message {
  id: string;
  conversationId: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export interface SendMessageResult {
  reply: string;
  sessionId: string;
}

export async function sendMessage(
  message: string,
  sessionId?: string
): Promise<SendMessageResult> {
  const res = await fetch(`${API_BASE}/chat/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'Network error');
  }

  return res.json();
}

export async function loadHistory(
  sessionId: string
): Promise<{ sessionId: string; messages: Message[] }> {
  const res = await fetch(`${API_BASE}/chat/history/${sessionId}`);
  if (!res.ok) throw new Error('Could not load conversation history');
  return res.json();
}
