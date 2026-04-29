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
          <button class="todo-btn pending" data-action="resolve" disabled title="You add this in Stage 5">
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

  document.querySelectorAll(".todo-btn:not([disabled])").forEach((btn) => {
    btn.addEventListener("click", () => runAction(btn, t.id, btn.dataset.action));
  });
}

async function runAction(btn, id, action) {
  const result = document.getElementById("result");
  btn.classList.add("loading");
  result.classList.add("on");
  result.innerHTML = `<h3>${labelForAction(action)} <span class="pill">running…</span></h3>`;
  try {
    const data = await fetch(`/api/tickets/${encodeURIComponent(id)}/${action}`, { method: "POST" }).then((r) => r.json());
    const isStub = data.todo === true;
    result.innerHTML = `
      <h3>${labelForAction(action)} <span class="pill ${isStub ? '' : 'done'}">${isStub ? "stub" : "live"}</span></h3>
      ${isStub ? `<div class="stub-note">⚠ ${escapeHtml(data.note || "Stub — wire this up during the workshop.")}</div>` : ""}
      <pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre>
    `;
  } catch (err) {
    result.innerHTML = `<h3>${labelForAction(action)} <span class="pill" style="background:var(--red-soft);color:var(--red);border-color:var(--red-border)">error</span></h3><pre>${escapeHtml(String(err))}</pre>`;
  } finally {
    btn.classList.remove("loading");
  }
}

const labelForAction = (a) => ({
  "triage": "🤖 AI Triage",
  "resolve": "🪄 Draft Resolution",
}[a] || a);

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
