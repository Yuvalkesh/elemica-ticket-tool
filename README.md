# Elemica Ticket Tool

Workshop starter for the **Elemica R&D × Adva Solutions Claude Code Workshop** — April 29, 2026.

By the end of the 4-hour session your fork is live at `https://<your-name>-tickets.onrender.com` with two AI features and a human-in-the-loop review gate, running on a ticket you brought from your own queue.

---

## ⚡ 60-second quick start

```bash
# 1. FORK this repo into your own GitHub account:
#    👉 https://github.com/Yuvalkesh/elemica-ticket-tool/fork
#    (Render needs YOUR fork to deploy — git clone alone is not enough.)

# 2. Clone your fork (replace <your-username>):
git clone https://github.com/<your-username>/elemica-ticket-tool.git
cd elemica-ticket-tool

# 3. Configure
cp .env.example .env
# open .env and paste your ANTHROPIC_API_KEY

# 4. Install + run
npm install
npm start
# → open http://localhost:3000

# 5. Verify the API key is loaded (Stage 1 · 0:05)
grep -q ANTHROPIC_API_KEY .env && echo "✓ API token connected" || echo "✗ MISSING — add it to .env"
```

You should see a dark ticket inbox with 10 mock tickets. **If you do, you're set for April 29.**

---

## 🎯 Today's goal — the aha moment

By 4:00 you see all the AI opportunities in your queue. And exactly how to take them.

**Four steps. Two AI features. One live URL.**

| # | Step | What you ship |
|---|---|---|
| 01 | Set up | Claude Code creates the project, drops the files, commits, pushes to GitHub |
| 02 | Your ticket | "+ Add Ticket" form. Implementation OR R&D — your call. Paste one from your queue. |
| 03 | Triage ⭐ | Claude classifies your ticket in 2 seconds — category, severity, target systems, what's verified, what's not |
| 04 | Resolve ⭐ | Claude drafts the fix — steps, commands, client message. You approve, edit, or reject. **Human in the loop.** |

---

## 🚀 One-click deploy to Render (we do this together in Stage 6)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Yuvalkesh/elemica-ticket-tool)

Render reads `render.yaml` and provisions everything automatically. Free tier — 750 instance hours/month, GitHub auto-deploy on every push.

---

## 📚 Workshop stage-by-stage

The full guide lives at [`workshop/stages.md`](workshop/stages.md) with every paste prompt for Claude Code. **Open it on your second monitor as we go — no improvising.**

| Time | Stage | 🚀 You build | What we end with |
|---|---|---|---|
| 0:00 → 0:30 | Stage 1 · Verify + see the goal | 20 min | Tool running on your laptop |
| 0:30 → 1:10 | Stage 2 · Make it yours | 30 min | Personal branch on YOUR fork, pushed to GitHub |
| 1:10 → 1:40 | Stage 3 · Add tickets manually | 22 min | "+ Add Ticket" form. Your real ticket on screen. |
| 1:40 → 1:55 | Break | — | — |
| 1:55 → 2:40 | Stage 4 · Build the AI brain (Triage) ⭐ | 35 min | Triage button works on your tickets |
| 2:40 → 3:20 | Stage 5 · Build the Resolver (HITL) ⭐ | 30 min | Drafted resolution + human review gate |
| 3:20 → 3:45 | Stage 6 · Ship it to Render | 20 min | Your live URL on the public internet |
| 3:45 → 4:00 | Stage 7 · Share + close | 14 min | URLs in chat, 30-day plan committed |

---

## 🎯 What's already built (the starter)

- **Ticket inbox** — sortable, filterable list of incoming tickets at `/`
- **Single ticket view** — full ticket detail with the 🤖 Triage button at `/ticket.html?id=…`
- **Submit page** — paste a ticket into the system at `/submit.html` (improved into an inline "+ Add Ticket" modal in Stage 3)
- **Express API** — `GET/POST /api/tickets`, `GET /api/tickets/:id`, `POST /api/tickets/:id/triage`
- **Render config** — one-click deploy via `render.yaml`
- **Mock data** — 10 realistic anonymized Elemica tickets covering EDI / XCarrier / SAP / IDX / cloud
- **AI Triage stub** — `lib/triage.js` returns a hard-coded shape so the UI works before you wire it up

## 🛠 What you build during the workshop

| Stage | What you build | Lives in |
|---|---|---|
| 3 | "+ Add Ticket" inline form on the inbox | `public/index.html` + new `POST /api/tickets` handler logic |
| 4 ⭐ | Real **AI Triage** call to Anthropic | `lib/triage.js` — replace stub |
| 5 ⭐ | New **Resolver** with human-in-the-loop gate | `lib/resolve.js` (NEW) + `POST /api/resolve` route + UI panel |

Each stage in [`workshop/stages.md`](workshop/stages.md) has the exact prompt to paste into Claude Code. The AI does the typing — you direct.

---

## 📦 Repo layout

```
elemica-ticket-tool/
├── README.md                  ← you are here
├── server.js                  ← Express server, all routes
├── package.json
├── render.yaml                ← Render auto-deploy config
├── .env.example               ← copy to .env, paste your ANTHROPIC_API_KEY
├── data/
│   └── tickets.json           ← 10 mock Elemica tickets (anonymized)
├── public/
│   ├── index.html             ← ticket inbox
│   ├── ticket.html            ← single ticket + AI buttons
│   ├── submit.html            ← submit form (Stage 3 improves into inline modal)
│   ├── styles.css
│   └── app.js
├── lib/
│   └── triage.js              ← Stage 4 stub (you replace with real Anthropic call)
└── workshop/
    └── stages.md              ← per-stage paste prompts
```

---

## 🧱 Stack & decisions

- **Node 20+** runtime
- **Express** — one file, ~60 lines
- **No build step** — vanilla HTML + CSS + JS in `public/`
- **JSON file as the database** — `data/tickets.json` is the source of truth. No database vendor.
- **Render** for deployment — free tier, GitHub auto-deploy, ~30 second cold start

Why no React / build pipeline / database vendor: every line in this repo is meant to be readable in 30 seconds. Beginners can hold the whole thing in their head; advanced users can extend without fighting a framework.

**No Jira. No middleware vendor.** The lesson is the pattern — your data, your tool, your control. Same plumbing transfers later to Zendesk / Jira / Confluence / iFlow when you want it.

---

## 👥 Who owns what during the workshop

| Stage | Owner | If you're stuck, ask… |
|---|---|---|
| Setup (pre-workshop) | You | **Matan** — `matan@adva-solutions.com` |
| Stages 1–3 (setup, make it yours, add ticket) | You | **Trenton + Sloan** (advanced co-pilots in Zoom) |
| Stage 4 (Triage centerpiece) | You | **Yuval** (live, main room) |
| Stage 5 (Resolver + HITL) | You | **Yuval** |
| Stages 6–7 (deploy, share) | You | **Yuval + Matan** |
| 30 days after | You | **Matan** — `matan@adva-solutions.com` |

**The deal**: drop a 🙋 in Zoom chat any time you're stuck. The co-pilots check chat every minute.

---

## After the workshop

Fork stays yours forever. Customize for your own ticket queue, push patterns the whole team can re-use back to `main`. This repo is the seed of the **Elemica internal tools repo** Blake described in the readiness assessment.

Questions? Email Matan — `matan@adva-solutions.com` — subject line `[Elemica follow-up]`.

— Adva Solutions · April 2026
