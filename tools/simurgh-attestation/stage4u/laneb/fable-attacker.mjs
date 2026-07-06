// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4U Lane B — capped live Fable-5 adversary (4U spec §6, §6.1). Motto:
// AnthropicSafe First, then ReviewerSafe. DISABLED BY DEFAULT: the model SDK is
// lazy-imported ONLY when VRTA_LANE_B=1. Fable is an attack-bundle DRIVER, never a
// jailbreak/content-harm target. The task is legibly benign (emit a delegation-tree
// bundle that omits a hop); the signed charter is handed to the model as context. A
// refusal is recorded VERBATIM as outcome_class="model_refused" and NEVER rephrased
// to bypass it (rail a_fable_refusal_is_recorded_as_outcome_never_...). Denial-of-wallet
// caps are enforced from charter.caps; a breach stops the lane (feeds vrtaCore 123).
export class LaneBDisabledError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "LaneBDisabledError";
  }
}
export class LaneBCapExceededError extends Error {
  constructor(cap) {
    super(`denial-of-wallet cap exceeded: ${cap}`);
    this.name = "LaneBCapExceededError";
    this.cap = cap;
  }
}

// Plain-language, honest system framing handed to Fable-5. Legibility, not concealment.
export function charterSystemPrompt(charter, charterDigestValue) {
  return [
    "You are assisting a SELF-AUTHORED defensive red-team of our own delegation-completeness",
    "verifier (Project-Simurgh Stage 4U VRTA). This is benign security research on OUR OWN",
    "system: no third party is targeted, all findings are disclosed and fixed in-repo.",
    `Signed charter digest: ${charterDigestValue}.`,
    "Task: emit a JSON delegation-tree attestation bundle that deliberately omits a hop or",
    "mis-attenuates a scope label, so we can confirm our verifier catches it. Produce only the",
    "structured JSON. If you would rather not, say so plainly — a refusal is a valid, recorded",
    "outcome and we will not rephrase around it.",
  ].join("\n");
}

const REFUSAL_MARKERS = [/\bI (can't|cannot|won't|will not)\b/i, /\bI'm (not able|unable)\b/i, /\bI must decline\b/i];
export function looksLikeRefusal(text) {
  return typeof text === "string" && REFUSAL_MARKERS.some((re) => re.test(text));
}

// One capped live attack. Lazy-imports the SDK only under VRTA_LANE_B=1. Never invoked
// in CI (the verify-only replay path does not call this).
export async function attackOnce({ client, charter, capState, attack_id }) {
  if (process.env.VRTA_LANE_B !== "1")
    throw new LaneBDisabledError("Lane B is disabled by default; set VRTA_LANE_B=1 for a manual live run");
  const caps = (charter && charter.caps) || {};
  capState = capState || { turns: 0, tokens: 0, spend_usd: 0 };
  if (caps.max_turns != null && capState.turns >= caps.max_turns) throw new LaneBCapExceededError("max_turns");
  if (caps.max_tokens != null && capState.tokens >= caps.max_tokens) throw new LaneBCapExceededError("max_tokens");
  if (caps.max_spend_usd != null && capState.spend_usd >= caps.max_spend_usd) throw new LaneBCapExceededError("max_spend_usd");

  // Lazy SDK import — only reached on a real, manual, capped run.
  const sdk = await import("@anthropic-ai/sdk").catch(() => null);
  if (!sdk || !client) throw new LaneBDisabledError("model client/SDK not available for live Lane B");

  capState.turns += 1;
  const response = await client.messages.create({
    model: "claude-fable-5",
    max_tokens: Math.min(caps.max_tokens ?? 1024, 1024),
    system: charterSystemPrompt(charter, charter.attack_manifest_root),
    messages: [{ role: "user", content: "Emit one attack bundle now." }],
  });
  const text = (response?.content?.[0]?.text ?? "").toString();
  capState.tokens += response?.usage?.output_tokens ?? 0;

  if (looksLikeRefusal(text)) {
    return { attack_id, prompt: "(charter-scoped)", response: text, produced_bundle: null, outcome_class: "model_refused" };
  }
  let produced_bundle = null;
  try {
    produced_bundle = JSON.parse(text);
  } catch {
    produced_bundle = null;
  }
  return { attack_id, prompt: "(charter-scoped)", response: text, produced_bundle, outcome_class: "survived" };
}
