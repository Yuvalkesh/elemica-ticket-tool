// ╭─ Stage 4 · AI Triage (the first centerpiece) ─────────────────────────╮
// │ Replace this stub with a real Anthropic Messages API call.            │
// │                                                                       │
// │ Open Claude Code in the repo and paste the Stage 4 prompt from        │
// │ workshop/stages.md (or the slide deck, slide 20).                     │
// │                                                                       │
// │ Required: process.env.ANTHROPIC_API_KEY  (already verified in Stage 1)│
// ╰───────────────────────────────────────────────────────────────────────╯

export async function triage(ticket) {
  // STUB — returns a hard-coded answer so the UI works before you replace it.
  return {
    todo: true,
    note: "AI Triage stub. Wire it up in Stage 4 to call Anthropic's Messages API.",
    ticket_id: ticket.id,
    category: ticket.category || "unknown",
    severity: ticket.severity || "medium",
    target_systems: [],
    summary: ticket.subject,
    assumptions: [],
    unverified: ["everything — this is a stub"],
  };
}

// Expected JSON shape after you wire it up:
//
// {
//   ticket_id: "EDI-2147",
//   category: "edi-mapping",                       // one of: edi-mapping | xcarrier-change |
//                                                  //   sap-request | escalation | legacy-deployment |
//                                                  //   idx-extraction | infra-cloud | unknown
//   severity: "medium",                            // low | medium | high | urgent
//   target_systems: ["Elemica Network", "IDoc → 947 X12 reusable map"],
//   summary: "Negative-qty inventory adjustments drop the IT1*ADJ segment...",
//   assumptions: ["BA's reproduction steps are accurate"],
//   unverified: ["Customer's downstream WMS behaviour"]
// }
