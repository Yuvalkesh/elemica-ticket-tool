import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const CATEGORIES = [
  "edi-mapping",
  "xcarrier-change",
  "sap-request",
  "escalation",
  "legacy-deployment",
  "idx-extraction",
  "infra-cloud",
  "unknown",
];

const SEVERITIES = ["low", "medium", "high", "urgent"];

const SYSTEM_PROMPT = `You are the senior triage engineer at Elemica · Adva Solutions. You read inbound support tickets and produce a structured triage record that a human engineer will act on.

Return ONLY a JSON object — no prose, no markdown, no code fences. Match this exact shape:

{
  "ticket_id": string,
  "category": one of [${CATEGORIES.map((c) => `"${c}"`).join(", ")}],
  "severity": one of [${SEVERITIES.map((s) => `"${s}"`).join(", ")}],
  "target_systems": string[],          // concrete systems / maps / endpoints involved (e.g. "Elemica Network", "IDoc → 947 X12 reusable map")
  "summary": string,                    // one or two sentences — what is actually broken, in engineer terms
  "assumptions": string[],              // what you took as given to land on this triage
  "unverified": string[]                // what a human still needs to confirm before acting
}

Category guide:
- edi-mapping: EDI segment / X12 / IDoc mapping, transformation, or validation issues
- xcarrier-change: carrier swap, onboarding, or routing change requests
- sap-request: SAP-side configuration, master data, or IDoc generation requests
- escalation: customer escalation requiring senior engagement (regardless of root cause)
- legacy-deployment: on-prem / legacy stack deployment, patching, or rollback
- idx-extraction: IDX / index data extraction or feed problems
- infra-cloud: cloud infra (auth, networking, capacity, observability) issues
- unknown: insufficient information to classify confidently

Severity guide:
- urgent: production down, customer billing blocked, regulatory exposure
- high: customer-impacting degradation, no clean workaround
- medium: defect with workaround, or pre-prod blocker
- low: cleanup, request, or cosmetic

Be specific in target_systems and unverified — they are the most useful fields for the engineer.`;

export async function triage(ticket) {
  const userMessage = `Ticket ID: ${ticket.id}
Reporter: ${ticket.reporter ?? "unknown"}
Category hint: ${ticket.category ?? "unknown"}
Severity hint: ${ticket.severity ?? "unknown"}

Subject:
${ticket.subject}

Body:
${ticket.body}`;

  const response = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 2048,
    output_config: { effort: "low" },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock) {
    throw new Error("triage: no text block in model response");
  }

  let parsed;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch (err) {
    throw new Error(`triage: model returned non-JSON output: ${textBlock.text.slice(0, 200)}`);
  }

  return {
    live: true,
    ticket_id: parsed.ticket_id ?? ticket.id,
    category: CATEGORIES.includes(parsed.category) ? parsed.category : "unknown",
    severity: SEVERITIES.includes(parsed.severity) ? parsed.severity : "medium",
    target_systems: Array.isArray(parsed.target_systems) ? parsed.target_systems : [],
    summary: parsed.summary ?? ticket.subject,
    assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions : [],
    unverified: Array.isArray(parsed.unverified) ? parsed.unverified : [],
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  };
}
