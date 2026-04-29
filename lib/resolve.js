import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are the senior resolution engineer at Elemica · Adva Solutions. You receive a customer ticket and the triage record produced for it, and you draft the resolution that a human engineer will review, edit, and ship.

You do NOT ship. A senior engineer reviews every word before anything reaches the customer or production. Bias toward making the human's review fast: be specific, surface what you don't know, and never fabricate command syntax or system names.

Return ONLY a JSON object — no prose, no markdown, no code fences. Match this exact shape:

{
  "summary": string,                    // one or two sentences — the resolution in plain language
  "steps": string[],                    // numbered actions in execution order, each a single concrete action
  "commands": string[],                 // CLI / SQL / API calls the engineer will run, in order — empty array if none apply
  "client_message": string,             // the proposed reply to the customer (or "" if internal-only)
  "confidence": number,                 // 0.0–1.0 — your confidence the proposed resolution is correct
  "unverified": string[],               // assumptions the engineer must verify before executing
  "requires_human": true                // always true — this is a draft, not an action
}

Rules:
- Steps are atomic — one action per item. "Verify X" and "Roll back Y" are separate steps.
- Commands must be safe to read but never assume cluster names, account IDs, or paths you weren't given. Use placeholders like <CUSTOMER_TENANT> or <MAP_VERSION_ID> when the value is unknown.
- client_message must match the ticket's tone. If the reporter is internal (engineering, BA, ops), the message is internal-only — set client_message to "".
- confidence reflects YOUR uncertainty about the proposed plan, not the ticket severity. A clean fix on a familiar pattern is 0.8+. A guess is 0.4 or lower.
- unverified is the most useful field for the engineer. List every assumption that, if wrong, breaks the plan.`;

export async function draftResolution(ticket, triage) {
  const userMessage = `Ticket
------
ID: ${ticket.id}
Reporter: ${ticket.reporter ?? "unknown"}
Subject: ${ticket.subject}

Body:
${ticket.body}

Triage record
-------------
Category: ${triage.category}
Severity: ${triage.severity}
Target systems: ${(triage.target_systems ?? []).join(", ") || "—"}
Summary: ${triage.summary}
Assumptions taken: ${(triage.assumptions ?? []).join(" | ") || "—"}
Open questions from triage: ${(triage.unverified ?? []).join(" | ") || "—"}

Draft the resolution.`;

  const response = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock) {
    throw new Error("draftResolution: no text block in model response");
  }

  let parsed;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch (err) {
    throw new Error(`draftResolution: model returned non-JSON: ${textBlock.text.slice(0, 200)}`);
  }

  return {
    live: true,
    ticket_id: ticket.id,
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    steps: Array.isArray(parsed.steps) ? parsed.steps.map(String) : [],
    commands: Array.isArray(parsed.commands) ? parsed.commands.map(String) : [],
    client_message: typeof parsed.client_message === "string" ? parsed.client_message : "",
    confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0,
    unverified: Array.isArray(parsed.unverified) ? parsed.unverified.map(String) : [],
    requires_human: true,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  };
}
