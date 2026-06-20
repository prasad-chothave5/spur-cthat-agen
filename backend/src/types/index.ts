export interface Message {
  id: string;
  conversationId: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  createdAt: string;
  metadata?: string;
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
}

export interface ChatResponse {
  reply: string;
  sessionId: string;
}

export interface ConversationHistory {
  role: "user" | "assistant";
  content: string;
}
