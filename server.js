import "dotenv/config";
import express from "express";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { triage } from "./lib/triage.js";
import { draftResolution } from "./lib/resolve.js";
import { postSolvedNotification } from "./lib/slack.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "data", "tickets.json");
const RESOLUTIONS_PATH = join(__dirname, "data", "resolutions.json");

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(join(__dirname, "public")));

const loadTickets = async () => JSON.parse(await readFile(DATA_PATH, "utf8"));
const saveTickets = async (t) => writeFile(DATA_PATH, JSON.stringify(t, null, 2));
const loadResolutions = async () => JSON.parse(await readFile(RESOLUTIONS_PATH, "utf8"));
const saveResolutions = async (r) => writeFile(RESOLUTIONS_PATH, JSON.stringify(r, null, 2));

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

// ─── Stage 5 · Draft Resolution + audit log ────────────────────────────────
app.post("/api/resolve", async (req, res) => {
  const { ticket_id, triage: triageRecord } = req.body ?? {};
  if (!ticket_id || !triageRecord) {
    return res.status(400).json({ error: "ticket_id and triage are required" });
  }
  const tickets = await loadTickets();
  const ticket = tickets.find((x) => x.id === ticket_id);
  if (!ticket) return res.status(404).json({ error: "ticket not found" });
  const draft = await draftResolution(ticket, triageRecord);
  res.json(draft);
});

app.post("/api/resolutions", async (req, res) => {
  const { ticket_id, decision, draft, reviewer = "self", reason = "" } = req.body ?? {};
  if (!ticket_id || !decision || !draft) {
    return res.status(400).json({ error: "ticket_id, decision, and draft are required" });
  }
  if (!["approve", "edit", "reject"].includes(decision)) {
    return res.status(400).json({ error: "decision must be approve | edit | reject" });
  }
  const log = await loadResolutions();
  const entry = {
    id: `RES-${String(Date.now()).slice(-8)}`,
    ticket_id,
    decision,
    reviewer,
    reason,
    draft,
    created: new Date().toISOString(),
  };
  log.unshift(entry);
  await saveResolutions(log);
  res.status(201).json(entry);
});

// ─── Mark a ticket as solved + notify (stubbed) ────────────────────────────
app.post("/api/tickets/:id/solve", async (req, res) => {
  const { operator } = req.body ?? {};
  if (!operator || typeof operator !== "string" || !operator.trim()) {
    return res.status(400).json({ error: "operator is required" });
  }

  const tickets = await loadTickets();
  const idx = tickets.findIndex((x) => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "ticket not found" });

  const ticket = tickets[idx];
  if (ticket.status === "solved") {
    return res.status(409).json({ error: "ticket already solved" });
  }

  const log = await loadResolutions();
  const hasApproval = log.some((e) => e.ticket_id === ticket.id && e.decision === "approve");
  if (!hasApproval) {
    return res.status(400).json({ error: "approve the draft before solving" });
  }

  const now = new Date().toISOString();
  const updated = { ...ticket, status: "solved", solved_at: now, solved_by: operator.trim() };
  tickets[idx] = updated;
  await saveTickets(tickets);

  const solveEntry = {
    id: `RES-${String(Date.now()).slice(-8)}`,
    ticket_id: ticket.id,
    decision: "solved",
    operator: operator.trim(),
    created: now,
  };
  log.unshift(solveEntry);
  await saveResolutions(log);

  const slack = await postSolvedNotification({ ticket: updated, operator: operator.trim() });

  res.status(200).json({ ok: true, ticket: updated, slack });
});

// ─── boot ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`elemica-ticket-tool · http://localhost:${PORT}`);
});
