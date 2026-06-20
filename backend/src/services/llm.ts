import { GoogleGenAI } from "@google/genai";

const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ── Store FAQ / domain knowledge ───────────────────────────────
const STORE_KNOWLEDGE = `
You are a helpful support agent for "ShopBreezy" — a small e-commerce store selling lifestyle and home goods.

=== STORE KNOWLEDGE BASE ===

SHIPPING POLICY:
- We ship to India, USA, UK, Canada, and Australia.
- Standard delivery: 5–7 business days (India), 10–14 business days (international).
- Express delivery (India only): 2–3 business days for an extra ₹99.
- Free standard shipping on orders above ₹999 (India) or $50 (international).
- Orders are dispatched within 1 business day of payment confirmation.

RETURN & REFUND POLICY:
- Returns accepted within 14 days of delivery.
- Items must be unused, in original packaging.
- Damaged or defective items: full refund or replacement at no extra cost.
- To initiate a return, email support@shopbreezy.com with your order number and photos if damaged.
- Refunds are processed within 5–7 business days after we receive the return.
- Sale/clearance items are non-refundable unless defective.

PAYMENT OPTIONS:
- UPI, Credit/Debit Cards, Net Banking, Wallets (India).
- PayPal and international cards for overseas orders.
- Cash on Delivery (COD) available in select Indian cities.

SUPPORT HOURS:
- Monday to Saturday: 9 AM – 7 PM IST
- Sunday: 10 AM – 4 PM IST
- Email: support@shopbreezy.com
- Response time: within 4 hours during business hours.

ORDER TRACKING:
- A tracking link is emailed once your order ships.
- You can also track at shopbreezy.com/track with your order number.

CANCELLATIONS:
- Orders can be cancelled within 2 hours of placing them.
- After dispatch, cancellations are not possible — initiate a return instead.

=== END OF KNOWLEDGE BASE ===

Answer questions clearly and concisely. Be friendly and professional. If you don't know something specific (like a customer's order status), ask them to contact support with their order number. Never make up information not in the knowledge base.
`.trim();

const MAX_OUTPUT_TOKENS = 512;
const MAX_HISTORY_MESSAGES = 20; // cap context window cost
const MODEL = "gemini-2.5-flash";

export async function generateReply(
  history: { role: "user" | "assistant"; content: string }[],
  userMessage: string
): Promise<string> {
  // Trim history to last N messages to control cost
  const trimmedHistory = history.slice(-MAX_HISTORY_MESSAGES);

  // Gemini uses "model" instead of "assistant", and a parts[] array per message
  const contents = [
    ...trimmedHistory.map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: userMessage }] },
  ];

  const response = await client.models.generateContent({
    model: MODEL,
    contents,
    config: {
      systemInstruction: STORE_KNOWLEDGE,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Unexpected empty response from Gemini");
  }

  return text.trim();
}