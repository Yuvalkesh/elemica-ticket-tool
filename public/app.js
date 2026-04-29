// ─── shared helpers ──────────────────────────────────────────────────────────
const fmtDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const escapeHtml = (s = "") =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ─── /  inbox ────────────────────────────────────────────────────────────────
async function renderInbox() {
  const list = document.getElementById("list");
  const count = document.getElementById("count");
  const q = document.getElementById("q");
  const chips = [...document.querySelectorAll(".chip")];
  let activeFilter = "all";

  const tickets = await fetch("/api/tickets").then((r) => r.json());

  const draw = () => {
    const term = (q.value || "").toLowerCase();
    const filtered = tickets.filter((t) => {
      if (activeFilter === "urgent" && t.severity !== "urgent") return false;
      if (activeFilter !== "all" && activeFilter !== "urgent" && t.category !== activeFilter) return false;
      if (term && !`${t.subject} ${t.body}`.toLowerCase().includes(term)) return false;
      return true;
    });
    count.textContent = filtered.length;
    list.innerHTML = filtered.map(rowHTML).join("") || `<div style="color:var(--muted);text-align:center;padding:40px;font-size:.9rem">no tickets match.</div>`;
  };

  chips.forEach((c) => c.addEventListener("click", () => {
    chips.forEach((x) => x.classList.remove("on"));
    c.classList.add("on");
    activeFilter = c.dataset.filter;
    draw();
  }));
  q.addEventListener("input", draw);
  draw();
}

const rowHTML = (t) => `
  <div class="ticket-row">
    <div class="id">${t.id}</div>
    <div class="subject"><a href="/ticket.html?id=${encodeURIComponent(t.id)}">${escapeHtml(t.subject)}</a></div>
    <div><span class="tag cat-${t.category}">${t.category.replace("-", " ")}</span></div>
    <div><span class="sev sev-${t.severity}"><span class="sev-dot"></span>${t.severity}</span></div>
    <div class="reporter">${escapeHtml(t.reporter || "—")}</div>
  </div>
`;

// ─── /ticket.html ────────────────────────────────────────────────────────────
async function renderTicket() {
  const root = document.getElementById("ticket-root");
  const id = new URLSearchParams(location.search).get("id");
  if (!id) { root.innerHTML = `<p style="color:var(--muted)">missing ?id= param</p>`; return; }

  const t = await fetch(`/api/tickets/${encodeURIComponent(id)}`).then((r) => r.ok ? r.json() : null);
  if (!t) { root.innerHTML = `<p style="color:var(--muted)">ticket not found.</p>`; return; }

  root.innerHTML = `
    <div class="ticket-page">
      <div>
        <div class="ticket-header">
          <div class="id">${t.id}</div>
          <h1>${escapeHtml(t.subject)}</h1>
          <div class="meta">
            <span class="tag cat-${t.category}">${t.category.replace("-", " ")}</span>
            <span class="sev sev-${t.severity}"><span class="sev-dot"></span>${t.severity}</span>
            <span class="reporter">${escapeHtml(t.reporter || "—")}</span>
            <span>· ${fmtDate(t.created)}</span>
          </div>
        </div>

        <div class="ticket-body">${escapeHtml(t.body)}</div>

        <h3 style="font-size:.78rem;color:var(--muted);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:12px">AI actions</h3>

        <div class="todo-grid">
          <button class="todo-btn" data-action="triage">
            <div class="ic">🤖</div>
            <div class="name">AI Triage</div>
            <div class="desc">Stage 4 · classify category, severity, target systems</div>
          </button>
          <button class="todo-btn pending" data-action="resolve" disabled title="Run AI Triage first">
            <div class="ic">🪄</div>
            <div class="name">Draft Resolution</div>
            <div class="desc">Stage 5 · steps + commands + client message · human approves</div>
          </button>
        </div>

        <div class="result-panel" id="result"></div>
      </div>

      <aside>
        <div class="side-card">
          <h3>Ticket meta</h3>
          <div class="row"><span class="k">id</span><span class="v">${t.id}</span></div>
          <div class="row"><span class="k">status</span><span class="v">${t.status || "open"}</span></div>
          <div class="row"><span class="k">created</span><span class="v">${fmtDate(t.created)}</span></div>
          <div class="row"><span class="k">category</span><span class="v">${t.category}</span></div>
          <div class="row"><span class="k">severity</span><span class="v">${t.severity}</span></div>
        </div>
        <div class="side-card">
          <h3>Workshop hint · Stage 4</h3>
          <p style="font-size:.84rem;color:var(--text);line-height:1.65">
            Open Claude Code in your terminal and paste the Stage 4 prompt from <code>workshop/stages.md</code>:<br><br>
            <code style="background:#0a0a12;padding:8px 10px;border-radius:6px;display:block;font-size:.75rem;color:var(--accent);font-family:'IBM Plex Mono',monospace">claude "open lib/triage.js and replace the stub with a real Anthropic Messages API call. use the JSON shape from the comment block."</code>
          </p>
        </div>
      </aside>
    </div>
  `;

  // Per-page state — last triage result + last resolution draft
  const state = { triage: null, draft: null };

  const triageBtn = document.querySelector('.todo-btn[data-action="triage"]');
  const resolveBtn = document.querySelector('.todo-btn[data-action="resolve"]');

  triageBtn.addEventListener("click", () => runTriage(triageBtn, resolveBtn, t.id, state));
  resolveBtn.addEventListener("click", () => runResolve(resolveBtn, t.id, state));

  if (t.status === "solved") {
    markHeaderSolved(t);
    const result = document.getElementById("result");
    result.classList.add("on");
    result.innerHTML = `
      <div class="solved-banner">
        <div class="solved-tick">✓</div>
        <div class="solved-body">
          <div class="solved-title">Solved by ${escapeHtml(t.solved_by || "—")}</div>
          <div class="solved-sub">${t.solved_at ? new Date(t.solved_at).toLocaleString() : ""} · team was notified</div>
        </div>
      </div>
    `;
  }
}

async function runTriage(btn, resolveBtn, id, state) {
  const result = document.getElementById("result");
  btn.classList.add("loading");
  result.classList.add("on");
  result.innerHTML = `<h3>🤖 AI Triage <span class="pill">running…</span></h3>`;
  try {
    const data = await fetch(`/api/tickets/${encodeURIComponent(id)}/triage`, { method: "POST" }).then((r) => r.json());
    const isStub = data.todo === true;
    result.innerHTML = `
      <h3>🤖 AI Triage <span class="pill ${isStub ? '' : 'done'}">${isStub ? "stub" : "live"}</span></h3>
      ${isStub ? `<div class="stub-note">⚠ ${escapeHtml(data.note || "Stub.")}</div>` : ""}
      <pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre>
    `;
    if (!isStub) {
      state.triage = data;
      resolveBtn.disabled = false;
      resolveBtn.classList.remove("pending");
      resolveBtn.title = "Draft a resolution from this triage";
    }
  } catch (err) {
    result.innerHTML = errorPanel("🤖 AI Triage", err);
  } finally {
    btn.classList.remove("loading");
  }
}

async function runResolve(btn, id, state) {
  if (!state.triage) return;
  const result = document.getElementById("result");
  btn.classList.add("loading");
  result.classList.add("on");
  result.innerHTML = `<h3>🪄 Draft Resolution <span class="pill">drafting…</span></h3>`;
  try {
    const draft = await fetch("/api/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket_id: id, triage: state.triage }),
    }).then((r) => r.json());
    if (draft.error) throw new Error(draft.error);
    state.draft = draft;
    renderResolutionEditor(result, id, state);
  } catch (err) {
    result.innerHTML = errorPanel("🪄 Draft Resolution", err);
  } finally {
    btn.classList.remove("loading");
  }
}

function renderResolutionEditor(root, ticketId, state) {
  const d = state.draft;
  const confidencePct = Math.round((d.confidence ?? 0) * 100);
  root.innerHTML = `
    <h3>🪄 Draft Resolution <span class="pill done">live</span> <span class="pill">requires human</span></h3>

    <div class="res-grid">
      <label class="res-field">
        <span class="res-label">summary</span>
        <textarea data-k="summary" rows="2">${escapeHtml(d.summary)}</textarea>
      </label>

      <label class="res-field">
        <span class="res-label">steps · one per line</span>
        <textarea data-k="steps" rows="${Math.max(4, d.steps.length + 1)}">${escapeHtml(d.steps.join("\n"))}</textarea>
      </label>

      <label class="res-field">
        <span class="res-label">commands · one per line</span>
        <textarea data-k="commands" rows="${Math.max(3, d.commands.length + 1)}" class="mono">${escapeHtml(d.commands.join("\n"))}</textarea>
      </label>

      <label class="res-field">
        <span class="res-label">client message</span>
        <textarea data-k="client_message" rows="${d.client_message ? 4 : 2}" placeholder="${d.client_message ? '' : '(internal-only — leave blank)'}">${escapeHtml(d.client_message)}</textarea>
      </label>

      <div class="res-meta">
        <div><span class="res-label">model confidence</span><div class="confidence"><div class="bar"><div class="fill" style="width:${confidencePct}%"></div></div><span>${confidencePct}%</span></div></div>
        <div><span class="res-label">unverified · ${d.unverified.length}</span>
          <ul class="unverified">${d.unverified.map((u) => `<li>${escapeHtml(u)}</li>`).join("") || "<li class='muted'>none flagged</li>"}</ul>
        </div>
      </div>
    </div>

    <div class="res-gate">
      <label><input type="checkbox" id="reviewed"> I've reviewed every step, command, and the client message.</label>
    </div>

    <div class="res-actions">
      <button class="res-btn approve" id="btn-approve" disabled>✓ Approve</button>
      <button class="res-btn edit" id="btn-edit">✎ Save edits</button>
      <button class="res-btn reject" id="btn-reject">✗ Reject</button>
      <button class="res-btn solve" id="btn-solve" disabled title="Approve the draft first">🚀 Mark as solved</button>
    </div>

    <div id="res-feedback" class="res-feedback"></div>
  `;

  const reviewed = root.querySelector("#reviewed");
  const approveBtn = root.querySelector("#btn-approve");
  reviewed.addEventListener("change", () => { approveBtn.disabled = !reviewed.checked; });

  const collectDraft = () => {
    const fields = root.querySelectorAll("textarea[data-k]");
    const updated = { ...state.draft };
    fields.forEach((f) => {
      const k = f.dataset.k;
      if (k === "steps" || k === "commands") {
        updated[k] = f.value.split("\n").map((s) => s.trim()).filter(Boolean);
      } else {
        updated[k] = f.value;
      }
    });
    state.draft = updated;
    return updated;
  };

  approveBtn.addEventListener("click", () => postResolution(root, ticketId, "approve", collectDraft()));
  root.querySelector("#btn-edit").addEventListener("click", () => postResolution(root, ticketId, "edit", collectDraft()));
  root.querySelector("#btn-reject").addEventListener("click", () => {
    const reason = prompt("Reject reason (logged for the audit trail):") || "";
    if (reason === null) return;
    postResolution(root, ticketId, "reject", collectDraft(), reason);
  });
  root.querySelector("#btn-solve").addEventListener("click", () => handleSolve(root, ticketId));
}

async function handleSolve(root, ticketId) {
  let name = localStorage.getItem("elemica.operator_name");
  if (!name) {
    const entered = prompt("Your name (saved locally for future solves):");
    if (!entered || !entered.trim()) return;
    name = entered.trim();
    localStorage.setItem("elemica.operator_name", name);
  }

  const solveBtn = root.querySelector("#btn-solve");
  const fb = root.querySelector("#res-feedback");
  solveBtn.disabled = true;
  fb.textContent = "marking solved…";
  fb.className = "res-feedback";

  try {
    const res = await fetch(`/api/tickets/${encodeURIComponent(ticketId)}/solve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operator: name }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `server returned ${res.status}`);
    }
    const data = await res.json();
    renderSolvedConfirmation(root, data);
    markHeaderSolved(data.ticket);
  } catch (err) {
    solveBtn.disabled = false;
    fb.textContent = `error: ${err.message}`;
    fb.classList.add("err");
  }
}

function renderSolvedConfirmation(root, data) {
  const grid = root.querySelector(".res-grid");
  const gate = root.querySelector(".res-gate");
  const actions = root.querySelector(".res-actions");
  const fb = root.querySelector("#res-feedback");

  const banner = document.createElement("div");
  banner.className = "solved-banner";
  banner.innerHTML = `
    <div class="solved-tick">✓</div>
    <div class="solved-body">
      <div class="solved-title">Marked solved by ${escapeHtml(data.ticket.solved_by)}</div>
      <div class="solved-sub">team notified · ${new Date(data.ticket.solved_at).toLocaleString()}</div>
      <div class="solved-msg mono">${escapeHtml(data.slack.message)}</div>
    </div>
  `;

  if (grid) grid.style.opacity = "0.55";
  if (gate) gate.remove();
  if (actions) actions.replaceWith(banner);
  if (fb) fb.remove();
}

function markHeaderSolved(ticket) {
  const meta = document.querySelector(".ticket-header .meta");
  if (meta && !meta.querySelector(".sev-solved")) {
    const pill = document.createElement("span");
    pill.className = "sev sev-solved";
    pill.innerHTML = `<span class="sev-dot"></span>solved`;
    meta.prepend(pill);
  }
  const triageBtn = document.querySelector('.todo-btn[data-action="triage"]');
  const resolveBtn = document.querySelector('.todo-btn[data-action="resolve"]');
  [triageBtn, resolveBtn].forEach((b) => {
    if (b) {
      b.disabled = true;
      b.classList.add("pending");
      b.title = "Ticket already solved";
    }
  });
}

async function postResolution(root, ticketId, decision, draft, reason = "") {
  const fb = root.querySelector("#res-feedback");
  fb.textContent = "saving…";
  fb.className = "res-feedback";
  try {
    const res = await fetch("/api/resolutions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket_id: ticketId, decision, draft, reason }),
    });
    if (!res.ok) throw new Error(`server returned ${res.status}`);
    const entry = await res.json();
    const verb = { approve: "approved ✓", edit: "edits saved", reject: "rejected ✗" }[decision];
    fb.textContent = `${verb} · logged as ${entry.id} · ${new Date(entry.created).toLocaleTimeString()}`;
    fb.classList.add(decision === "reject" ? "err" : "ok");

    if (decision === "approve") {
      const solveBtn = root.querySelector("#btn-solve");
      if (solveBtn) {
        solveBtn.disabled = false;
        solveBtn.title = "Notify the team and close this ticket";
        solveBtn.classList.add("ready");
      }
    }
  } catch (err) {
    fb.textContent = `error: ${err.message}`;
    fb.classList.add("err");
  }
}

const errorPanel = (label, err) =>
  `<h3>${label} <span class="pill" style="background:var(--red-soft);color:var(--red);border-color:var(--red-border)">error</span></h3><pre>${escapeHtml(String(err.message || err))}</pre>`;

// ─── /submit.html ────────────────────────────────────────────────────────────
function wireSubmit() {
  const form = document.getElementById("submit-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const body = Object.fromEntries(fd.entries());
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const t = await res.json();
      location.href = `/ticket.html?id=${encodeURIComponent(t.id)}`;
    } else {
      alert("could not save ticket — see server logs");
    }
  });
}
