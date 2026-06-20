import { v4 as uuidv4 } from "uuid";
import db from "./connection";
import type { Conversation, Message } from "../types";

// ── Conversations ──────────────────────────────────────────────

export function createConversation(): Conversation {
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  db.prepare(
    "INSERT INTO conversations (id, created_at) VALUES (?, ?)"
  ).run(id, createdAt);
  return { id, createdAt };
}

export function getConversation(id: string): Conversation | null {
  const row = db
    .prepare("SELECT id, created_at as createdAt FROM conversations WHERE id = ?")
    .get(id) as Conversation | undefined;
  return row ?? null;
}

// ── Messages ───────────────────────────────────────────────────

export function insertMessage(
  conversationId: string,
  sender: "user" | "ai",
  text: string
): Message {
  const id = uuidv4();
  const timestamp = new Date().toISOString();
  db.prepare(
    "INSERT INTO messages (id, conversation_id, sender, text, timestamp) VALUES (?, ?, ?, ?, ?)"
  ).run(id, conversationId, sender, text, timestamp);
  return { id, conversationId, sender, text, timestamp };
}

export function getMessagesByConversation(conversationId: string): Message[] {
  return db
    .prepare(
      `SELECT id, conversation_id as conversationId, sender, text, timestamp
       FROM messages
       WHERE conversation_id = ?
       ORDER BY timestamp ASC`
    )
    .all(conversationId) as Message[];
}

// Return last N messages as LLM history (user + ai alternating)
export function getRecentHistory(
  conversationId: string,
  limit = 20
): { role: "user" | "assistant"; content: string }[] {
  const rows = db
    .prepare(
      `SELECT sender, text FROM messages
       WHERE conversation_id = ?
       ORDER BY timestamp DESC
       LIMIT ?`
    )
    .all(conversationId, limit) as { sender: string; text: string }[];

  return rows
    .reverse()
    .map((r) => ({
      role: r.sender === "user" ? "user" : ("assistant" as "user" | "assistant"),
      content: r.text,
    }));
}
