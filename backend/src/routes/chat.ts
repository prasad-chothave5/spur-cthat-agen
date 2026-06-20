import { Router, Request, Response } from "express";
import { z } from "zod";
import {
  createConversation,
  getConversation,
  insertMessage,
  getMessagesByConversation,
  getRecentHistory,
} from "../db/queries";
import { generateReply } from "../services/llm";

const router = Router();

const MAX_MESSAGE_LENGTH = 2000;

// ── Input schema ───────────────────────────────────────────────
const ChatSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(MAX_MESSAGE_LENGTH, `Message must be under ${MAX_MESSAGE_LENGTH} characters`)
    .transform((s) => s.trim()),
  sessionId: z.string().uuid().optional(),
});

// ── POST /chat/message ─────────────────────────────────────────
router.post("/message", async (req: Request, res: Response) => {
  const parsed = ChatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.errors[0]?.message ?? "Invalid input",
    });
  }

  const { message, sessionId } = parsed.data;

  let conversationId: string;

  if (sessionId) {
    const existing = getConversation(sessionId);
    if (!existing) {
      const conv = createConversation();
      conversationId = conv.id;
    } else {
      conversationId = existing.id;
    }
  } else {
    const conv = createConversation();
    conversationId = conv.id;
  }

  insertMessage(conversationId, "user", message);

  const history = getRecentHistory(conversationId);
  const historyWithoutCurrent = history.slice(0, -1);

  let reply: string;
  try {
    reply = await generateReply(historyWithoutCurrent, message);
  } catch (err: unknown) {
    console.error("LLM error:", err);
    reply =
      "I'm having trouble connecting to my knowledge base right now. Please try again in a moment, or contact support@shopbreezy.com.";
  }

  insertMessage(conversationId, "ai", reply);

  return res.json({ reply, sessionId: conversationId });
});

// ── GET /chat/history/:sessionId ───────────────────────────────
router.get("/history/:sessionId", (req: Request, res: Response) => {
  const { sessionId } = req.params;

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(sessionId)) {
    return res.status(400).json({ error: "Invalid session ID format" });
  }

  const conversation = getConversation(sessionId);
  if (!conversation) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  const messages = getMessagesByConversation(sessionId);
  return res.json({ sessionId, messages });
});

export default router;