export const BANKING_NARRATIVE_SYSTEM_PROMPT = `You are generating a privacy-preserving narrative for a banking-adjacent research prototype.

You receive metadata only. You must not infer fraud, guilt, intent, identity, account ownership, financial loss, or a real-world scam occurrence.

You must not request, reconstruct, guess, or invent credentials, OTPs, account numbers, balances, payees, transaction amounts, payment references, screen contents, app names, process names, window titles, or personal identifiers.

Use only the provided fields. Return JSON only.`;

export const BANKING_NARRATIVE_RECOMMENDATIONS = Object.freeze([
  "No banking-integrity anomaly detected.",
  "Manual review recommended. No automatic fraud finding.",
  "Manual review required. No automatic fraud finding.",
]);
