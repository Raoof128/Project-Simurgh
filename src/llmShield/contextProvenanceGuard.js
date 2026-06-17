// SPDX-License-Identifier: AGPL-3.0-or-later
// Deterministic context provenance guard. Decides, per context and in aggregate,
// whether supplied context may be ACCEPTED (benign synthetic seed), DEMOTED to
// data (untrusted reference), or REJECTED (forges authority, malformed, oversize,
// unsigned-trusted, or carries secret/policy markers). The core 3D claim: no
// untrusted context becomes instruction authority. Heuristics, not comprehension.
import { canonicaliseContext } from "./contextCanonicalise.js";

export const MAX_CONTEXT_ITEM_BYTES = 4096;
export const MAX_CONTEXTS_TOTAL_BYTES = 16384;

const SOURCE_TYPES = new Set(["retrieval", "user_upload", "tool_result", "system_seed"]);
const TRUST_LEVELS = new Set(["trusted", "untrusted", "synthetic"]);
const PURPOSES = new Set(["reference", "task_data", "policy_seed"]);
const ALLOWED_FIELDS = new Set(["context_id", "source_type", "trust_level", "purpose", "content"]);

// Authority assertion / role escalation markers (canonical, lowercased view).
const AUTHORITY_ASSERTION =
  /\b(system\s*:|you are (the|now) (the )?system|as the system prompt|developer mode|new system (prompt|instructions)|you must (now )?(ignore|obey)|disregard (your|all) (previous )?(instructions|guidelines))\b/;
// Secret / policy export markers.
const SECRET_MARKER =
  /\b(api[_-]?key|secret key|password|bearer [a-z0-9]|hidden policy|system prompt)\b/;

function byteLength(s) {
  return Buffer.byteLength(typeof s === "string" ? s : "", "utf8");
}

function guardOne(context) {
  const reasonCodes = [];
  const id = context?.context_id ?? "ctx_unknown";

  // Schema / forbidden-field checks.
  if (
    !context ||
    typeof context !== "object" ||
    !SOURCE_TYPES.has(context.source_type) ||
    !TRUST_LEVELS.has(context.trust_level ?? "untrusted") ||
    (context.purpose !== undefined && !PURPOSES.has(context.purpose)) ||
    typeof context.content !== "string"
  ) {
    return {
      contextId: id,
      verdict: "rejected",
      reasonCodes: ["context_schema_invalid"],
      contentHash: canonicaliseContext(context?.content).contentHash,
    };
  }
  for (const k of Object.keys(context)) {
    if (!ALLOWED_FIELDS.has(k)) {
      return {
        contextId: id,
        verdict: "rejected",
        reasonCodes: ["context_forbidden_field"],
        contentHash: canonicaliseContext(context.content).contentHash,
      };
    }
  }

  if (byteLength(context.content) > MAX_CONTEXT_ITEM_BYTES) {
    return {
      contextId: id,
      verdict: "rejected",
      reasonCodes: ["context_payload_too_large"],
      contentHash: canonicaliseContext(context.content).contentHash,
    };
  }

  const { canonical, contentHash } = canonicaliseContext(context.content);

  // Trusted claim needs a signature mechanism, which 3D does not provide.
  if (context.trust_level === "trusted") {
    return {
      contextId: id,
      verdict: "rejected",
      reasonCodes: ["context_signature_missing"],
      contentHash,
    };
  }

  if (AUTHORITY_ASSERTION.test(canonical)) {
    reasonCodes.push("context_role_escalation");
  }
  if (SECRET_MARKER.test(canonical)) {
    reasonCodes.push("context_untrusted_instruction");
  }
  if (reasonCodes.length > 0) {
    return { contextId: id, verdict: "rejected", reasonCodes, contentHash };
  }

  // Benign synthetic seed is accepted; benign untrusted reference is demoted.
  if (context.trust_level === "synthetic") {
    return { contextId: id, verdict: "accepted", reasonCodes: [], contentHash };
  }
  return {
    contextId: id,
    verdict: "demoted",
    reasonCodes: ["context_demoted_to_data"],
    contentHash,
  };
}

export function guardContexts(contexts) {
  if (!Array.isArray(contexts) || contexts.length === 0) {
    return {
      verdict: "not_supplied",
      contextCount: 0,
      contextHashes: [],
      reasonCodes: [],
      perContext: [],
    };
  }

  const totalBytes = contexts.reduce((n, c) => n + byteLength(c?.content), 0);
  if (totalBytes > MAX_CONTEXTS_TOTAL_BYTES) {
    return {
      verdict: "rejected",
      contextCount: contexts.length,
      contextHashes: contexts.map((c) => canonicaliseContext(c?.content).contentHash),
      reasonCodes: ["context_payload_too_large"],
      perContext: [],
    };
  }

  const perContext = contexts.map(guardOne);
  const contextHashes = perContext.map((p) => p.contentHash);
  const reasonCodes = [...new Set(perContext.flatMap((p) => p.reasonCodes))];

  let verdict = "accepted";
  if (perContext.some((p) => p.verdict === "rejected")) verdict = "rejected";
  else if (perContext.some((p) => p.verdict === "demoted")) verdict = "demoted";

  return { verdict, contextCount: contexts.length, contextHashes, reasonCodes, perContext };
}
