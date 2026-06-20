# Spur – AI Live Chat Agent

A mini AI-powered customer support chat for a fictional e-commerce store ("ShopBreezy"), built as the Spur founding engineer take-home assignment.

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Backend   | Node.js + TypeScript + Express      |
| Frontend  | SvelteKit                           |
| Database  | SQLite (via `better-sqlite3`)       |
| LLM       | Anthropic Claude (`claude-sonnet-4-6`) |

---

## Local Setup

### Prerequisites

- Node.js ≥ 18
- An Anthropic API key ([get one here](https://console.anthropic.com/))

---

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd spur-chat
```

---

### 2. Backend setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and set your ANTHROPIC_API_KEY

# Run DB migrations (creates SQLite file at backend/data/spur_chat.db)
npm run db:migrate

# Start dev server (port 3001)
npm run dev
```

---

### 3. Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# VITE_API_URL defaults to http://localhost:3001 — no change needed for local dev

# Start dev server (port 5173)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Environment Variables

### Backend (`backend/.env`)

| Variable           | Required | Description                          |
|--------------------|----------|--------------------------------------|
| `ANTHROPIC_API_KEY`| ✅       | Your Anthropic API key               |
| `PORT`             | ❌       | Server port (default: `3001`)        |
| `FRONTEND_URL`     | ❌       | CORS origin (default: `http://localhost:5173`) |

### Frontend (`frontend/.env`)

| Variable       | Required | Description                        |
|----------------|----------|------------------------------------|
| `VITE_API_URL` | ❌       | Backend URL (default: `http://localhost:3001`) |

---

## API Reference

### `POST /chat/message`

Send a user message and get an AI reply.

**Request body:**
```json
{
  "message": "What's your return policy?",
  "sessionId": "optional-uuid-to-continue-existing-conversation"
}
```

**Response:**
```json
{
  "reply": "You can return items within 14 days of delivery...",
  "sessionId": "uuid-v4"
}
```

**Error responses:**
- `400` — empty message, too long, invalid sessionId format
- `500` — unexpected server error

---

### `GET /chat/history/:sessionId`

Fetch all messages for an existing conversation.

**Response:**
```json
{
  "sessionId": "uuid-v4",
  "messages": [
    {
      "id": "uuid",
      "conversationId": "uuid",
      "sender": "user",
      "text": "Do you ship to USA?",
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

## Architecture Overview

```
spur-chat/
├── backend/
│   └── src/
│       ├── index.ts          # Express app bootstrap, CORS, global error handler
│       ├── routes/
│       │   └── chat.ts       # POST /chat/message, GET /chat/history/:id
│       ├── services/
│       │   └── llm.ts        # Anthropic client, generateReply(), FAQ knowledge base
│       ├── db/
│       │   ├── connection.ts # SQLite connection singleton
│       │   ├── migrate.ts    # Schema creation (idempotent)
│       │   └── queries.ts    # All DB access (repository pattern)
│       └── types/
│           └── index.ts      # Shared TypeScript interfaces
└── frontend/
    └── src/
        ├── routes/
        │   └── +page.svelte  # Chat UI (messages, input, typing indicator)
        └── lib/
            ├── api.ts        # Typed fetch wrappers for the backend
            └── session.ts    # Svelte store — persists sessionId in localStorage
```

### Key design decisions

- **Separation of concerns**: routes → services → db, each layer only touches its own concern. Adding a WhatsApp or Instagram channel would mean creating a new route file and reusing `generateReply()` and the DB queries unchanged.
- **Repository pattern** (`db/queries.ts`): all SQL is in one place, no raw queries scattered across routes.
- **LLM encapsulation**: `generateReply(history, message)` is the only public surface. Swapping from Claude to OpenAI means editing one file.
- **SQLite + WAL mode**: sufficient for the exercise, low operational overhead, easy to swap for PostgreSQL by replacing `better-sqlite3` with `pg` and updating `queries.ts`.

---

## LLM Notes

- **Provider**: Anthropic Claude (`claude-sonnet-4-6`)
- **System prompt**: Contains the full ShopBreezy knowledge base (shipping, returns, payments, support hours, tracking, cancellations). Hardcoded in `services/llm.ts` for simplicity; can be moved to DB.
- **Context**: Last 20 messages are sent as history on every request, keeping replies contextual without blowing up token cost.
- **Max tokens**: 512 per reply — enough for support answers, keeps cost low.
- **Error handling**: All LLM/API errors are caught; a friendly fallback message is returned to the user. The backend never crashes on LLM failure.

---

## Robustness

- Empty messages rejected with `400`
- Messages over 2,000 characters rejected
- Invalid/missing `sessionId` creates a fresh conversation (graceful degradation)
- LLM timeouts / rate limits / invalid keys all surface as a friendly UI message
- `express.json({ limit: '50kb' })` prevents request body bombs
- CORS restricted to frontend origin
- No secrets committed (`.env` in `.gitignore`)

---

## Trade-offs & "If I had more time…"

| Area | Current | With more time |
|------|---------|----------------|
| DB | SQLite | PostgreSQL for production; add connection pooling |
| Auth | None | Session tokens or simple magic-link email auth |
| Streaming | Polling (full reply at once) | Server-sent events for token-by-token streaming |
| FAQ storage | Hardcoded in system prompt | Store in DB, admin UI to edit |
| Tests | None | Vitest for services + routes; Playwright for E2E |
| Rate limiting | None | Per-IP rate limit with `express-rate-limit` |
| Deployment | Manual | Docker Compose, one-command deploy |
| Multi-channel | Single chat | Shared `generateReply` service, new route per channel |
