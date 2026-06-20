import "dotenv/config";
import express from "express";
import cors from "cors";
import { runMigrations } from "./db/migrate";
import chatRouter from "./routes/chat";

const app = express();
const PORT = process.env.PORT ?? 3001;

// ── Middleware ─────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
    methods: ["GET", "POST"],
  })
);
app.use(express.json({ limit: "50kb" }));

// ── Routes ─────────────────────────────────────────────────────
app.use("/chat", chatRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
);

// ── Boot ───────────────────────────────────────────────────────
runMigrations();

app.listen(PORT, () => {
  console.log(`🚀 Spur Chat backend running on http://localhost:${PORT}`);
});

export default app;
