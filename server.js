import "dotenv/config";
import express from "express";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { triage } from "./lib/triage.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "data", "tickets.json");

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(join(__dirname, "public")));

const loadTickets = async () => JSON.parse(await readFile(DATA_PATH, "utf8"));
const saveTickets = async (t) => writeFile(DATA_PATH, JSON.stringify(t, null, 2));

// ─── REST: tickets ─────────────────────────────────────────────────────────
app.get("/api/tickets", async (_req, res) => {
  const tickets = await loadTickets();
  res.json(tickets);
});

app.get("/api/tickets/:id", async (req, res) => {
  const tickets = await loadTickets();
  const t = tickets.find((x) => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: "ticket not found" });
  res.json(t);
});

app.post("/api/tickets", async (req, res) => {
  const { subject, body, category = "unknown", severity = "medium", reporter = "self" } = req.body ?? {};
  if (!subject || !body) return res.status(400).json({ error: "subject and body are required" });
  const tickets = await loadTickets();
  const id = `MAN-${String(Date.now()).slice(-6)}`;
  const ticket = { id, subject, body, category, severity, reporter, status: "open", created: new Date().toISOString() };
  tickets.unshift(ticket);
  await saveTickets(tickets);
  res.status(201).json(ticket);
});

// ─── Stage 4 · AI Triage (centerpiece) ─────────────────────────────────────
app.post("/api/tickets/:id/triage", async (req, res) => {
  const tickets = await loadTickets();
  const ticket = tickets.find((x) => x.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: "ticket not found" });
  const result = await triage(ticket);
  res.json(result);
});

// ─── Stage 5 · You add this route during the workshop ──────────────────────
// POST /api/resolve  →  calls draftResolution(ticket, triage) from lib/resolve.js
// (See workshop/stages.md · Stage 5 for the paste prompt.)

// ─── boot ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`elemica-ticket-tool · http://localhost:${PORT}`);
});
