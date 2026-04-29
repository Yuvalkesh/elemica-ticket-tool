# Workshop · Stage-by-stage guide

Open this file on your second monitor. Each stage tells you exactly what to paste into Claude Code.

**The deal:** raise 🙋 in Zoom chat the moment you fall 30 seconds behind. Yuval pauses. Always.

---

## Stage 1 · Verify + see the goal · 0:00 → 0:30 · 🚀 20 min build

**Goal:** confirm your laptop is ready. See the Triage click live. Set the side-by-side rule.

### 1a · Run these in your terminal

```bash
$ node --version       # expect: v20.x or higher
$ claude --version     # expect: claude-code 1.x
$ cd elemica-ticket-tool && npm start
  → ticket list at http://localhost:3000 with 10 tickets visible

$ node -e "import('@anthropic-ai/sdk').then(()=>console.log('SDK ok'))"
  → prints "SDK ok"  (the SDK is installed)

$ grep -q ANTHROPIC_API_KEY .env && echo "✓ API token connected" || echo "✗ MISSING — add it to .env"
  → prints "✓ API token connected"  (your key is loaded for Triage + Resolver)
```

**Anyone failing?** Drop the exact error in Zoom chat. We fix it now, not in the last 5 minutes.

### 1b · See the goal click

Click any ticket → click 🤖 AI Triage. Returns a stub (gold pill, "this is a stub"). That's expected. The room watches the goal click together so you know what we're building.

---

## Stage 2 · Make it yours · 0:30 → 1:10 · 🚀 30 min build

**Goal:** use Claude Code to branch, edit, commit, and push. Personalize the tool to your name.

### Paste into Claude Code

> Create a branch called `try/<your-name>`. In `public/index.html`, change the page header `<div class="brand-name">Elemica <span class="accent">Ticket Tool</span></div>` to read `<your-name>'s Tickets` instead. Commit with a clear message. Push to my fork.

Reload `localhost:3000`. Your name appears in the header. Branch is on YOUR fork.

**Why this matters:** connects your code to GitHub. Render deploys from here in Stage 6.

---

## Stage 3 · Add tickets manually · 1:10 → 1:40 · 🚀 22 min build

**Goal:** add a `+ Add Ticket` form on the inbox so you can paste your real anonymized ticket directly. No vendor in the loop.

### Paste into Claude Code

> In `public/index.html`, add a `+ Add Ticket` button at the top of the ticket list (right of the page-head). Clicking it opens a modal with these fields: `subject` (required), `body` (required, textarea), `category` (dropdown: edi-mapping, xcarrier-change, sap-request, escalation, legacy-deployment, idx-extraction, infra-cloud), `severity` (dropdown: low | medium | high | urgent), `reporter` (default: "me").
>
> Use the existing `POST /api/tickets` endpoint in `server.js` (already wired). On successful save, close the modal and refresh the ticket list so the new ticket appears at the top.

Restart the server. Click `+ Add Ticket`. Paste the anonymized ticket you brought. **That's what AI Triage runs on in 45 minutes.**

**Why this matters:** your data, your tool, your control. Same pattern transfers later to Zendesk / Jira / Confluence / iFlow.

---

## Stage 4 · Build the AI brain — Triage ⭐ · 1:55 → 2:40 · 🚀 35 min build

**Goal:** wire 🤖 AI Triage end-to-end. Stub becomes a real Anthropic call returning live results. **First centerpiece.**

### Paste into Claude Code

> Open `lib/triage.js`. Replace the stub with a real call to Anthropic's Messages API using `process.env.ANTHROPIC_API_KEY`.
>
> The system prompt must classify tickets into one of: `edi-mapping`, `xcarrier-change`, `sap-request`, `escalation`, `legacy-deployment`, `idx-extraction`, `infra-cloud`, `unknown`.
>
> Severity: `low` | `medium` | `high` | `urgent`.
>
> Return JSON matching the exact shape in the comment block at the top of the file. Use the SDK `@anthropic-ai/sdk`.

Restart the server (Ctrl-C then `npm start`), then click 🤖 AI Triage on any ticket. The result panel turns green. Pill flips from `stub` (gold) to `live` (green).

**Why this matters:** teach Claude your team's playbook. Triage encodes the move your senior team already makes automatically.

---

## Stage 5 · Build the Resolver — Human-in-the-Loop ⭐ · 2:40 → 3:20 · 🚀 30 min build

**Goal:** add a 🪄 `Draft Resolution` button. Claude reads the ticket + triage output, drafts the resolution: steps, commands, client message. **Nothing ships without a human approve.**

### Paste into Claude Code

> Create `lib/resolve.js` with one function: `draftResolution(ticket, triage)`. It calls Anthropic's Messages API with a system prompt that instructs the model to return a **resolution draft** matching this JSON shape:
>
> `{ summary, steps[], commands[], client_message, confidence (0-1), unverified[], requires_human: true }`
>
> Steps are numbered actions. Commands are CLI / SQL / API calls the engineer would run. Client_message is the proposed reply if customer-facing. Unverified is the list of assumptions the engineer must check.
>
> Add a `POST /api/resolve` route in `server.js` that calls `draftResolution` and returns the draft. (Hint: it follows the same shape as the existing triage route.)
>
> In `public/app.js` (the `renderTicket` function), enable the 🪄 `Draft Resolution` button (currently disabled). When clicked after triage has returned, POST to `/api/resolve` and show a panel with: editable `steps`, editable `commands`, editable `client_message`, and three buttons: **Approve** (greyed out until "I've reviewed" checkbox is checked), **Edit** (saves draft to local state), **Reject** (logs reason).
>
> Every action POSTs to `/api/resolutions` and appends to `data/resolutions.json` with timestamp + reviewer.

Restart the server. Triage a ticket → click 🪄 Draft Resolution → review → check "I've reviewed" → Approve / Edit / Reject.

**Why this matters:** **HITL is the contract.** AI suggests; senior engineer ships. The 80% accuracy your team already saw? You catch the 20% — at the speed of reading, not writing.

---

## Stage 6 · Ship it to Render · 3:20 → 3:45 · 🚀 20 min build

**Goal:** deploy your fork to Render. Both AI features live on the public web.

### Steps

1. Terminal: `git add . && git commit -m "wire Triage + Resolver" && git push`
2. Open your fork's README on GitHub. Click the **Deploy to Render** button.
3. Render reads `render.yaml` and provisions a free web service. Name it `<your-name>-tickets`.
4. Render dashboard → **Environment** tab: add `ANTHROPIC_API_KEY = sk-ant-...` (the same key from your local `.env`).
5. Wait ~3 minutes for the build. Watch **Logs** tab. When you see `Your service is live at...` — open the URL.
6. Click 🤖 AI Triage AND 🪄 Draft Resolution on the public web. Drop your URL in Zoom chat.

**Why this matters:** design tools the way teammates will use them. Severity colors, button placement, verify gates — design as kindness.

---

## Stage 7 · Share + close · 3:45 → 4:00 · 🚀 14 min do

**Goal:** drop your live URL in Zoom chat. Click 2 other people's URLs. For each: drop one specific compliment + one specific question in chat. Yuval reads the highlight reel out loud.

**Why this format:** chat-shared feedback creates a written artifact every attendee can revisit. Specific compliments + specific questions force precision over pleasantries.

### The 30-day champion commitment

By next Friday at 17:00:
1. Show your URL in your team's Slack.
2. Demo the click (60 seconds).
3. Pick ONE teammate. Get them to fork your repo by next Wednesday.

**The 30-day Friday tracker:** one Slack poll every Friday at 17:00 — three questions:
1. Is your URL still up?
2. How many TODOs wired?
3. Have you shown it to anyone outside R&D yet?

Target: 60%+ still using by day 30.

---

## Stuck? Email Matan — `matan@adva-solutions.com` — subject line `[Elemica follow-up]`.
