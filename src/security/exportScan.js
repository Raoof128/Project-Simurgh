// SPDX-License-Identifier: AGPL-3.0-or-later
// Maintained export scan applied at the mount to text the frozen LLM Shield routers would export.
//
// The frozen output firewall (src/llmShield/outputLeakageFirewall.js, policy-drift guarded) is a
// fixed-marker regex over raw text: it exported a canary, `sk-ant-…` keys (its pattern forbids a
// hyphen after `sk-`), a JWT, `SIMURGH_AUDIT_SECRET=…`, and "system prompt" written with a double
// space, fullwidth letters, zero-width characters, base64, hex or reversed (audit B-3, 31 October
// 2026). This scan runs after it and can only withhold more, never less. It normalises (NFKC, format
// characters stripped), decodes base64 and hex runs, checks reversed text, looks for secret-shaped
// tokens, and refuses output that echoes a request context. It never returns the matched text.
import { createHash } from "node:crypto";

const FORMAT_CHARS = /[\u200B-\u200F\u2028-\u202E\u2060-\u206F\uFEFF\u00AD]/g;

export function normaliseForScan(text) {
  return String(text ?? "")
    .normalize("NFKC")
    .replace(FORMAT_CHARS, "")
    .replace(/\s+/g, " ")
    .trim();
}

const SECRET_SHAPES = Object.freeze([
  [/\bsk-(?:ant-)?[A-Za-z0-9_-]{16,}/, "export_secret_shape_api_key"],
  [/\bAKIA[0-9A-Z]{16}\b/, "export_secret_shape_aws_key"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "export_secret_shape_private_key"],
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/, "export_secret_shape_jwt"],
  [/\bgh[pousr]_[A-Za-z0-9]{20,}\b/, "export_secret_shape_github_token"],
  [/\bxox[abprs]-[A-Za-z0-9-]{10,}/, "export_secret_shape_slack_token"],
  [
    /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*_(?:SECRET|TOKEN|KEY|PASSWORD|PEPPER)\s*[:=]\s*\S{8,}/,
    "export_secret_shape_env_assignment",
  ],
  [/\bbearer\s+[A-Za-z0-9._-]{20,}/i, "export_secret_shape_bearer"],
]);

// Fixed markers compared on a letters-only collapse, which defeats spacing, separators and case.
const MARKERS = Object.freeze([
  ["systemprompt", "export_system_prompt_marker"],
  ["beginsystemmessage", "export_system_prompt_marker"],
  ["youareahiddenpolicy", "export_hidden_policy_marker"],
  ["hiddenpolicy", "export_hidden_policy_marker"],
  ["hiddeninstructions", "export_hidden_policy_marker"],
  ["developeronly", "export_developer_marker"],
  ["developerinstruction", "export_developer_marker"],
]);

const lettersOnly = (s) => s.toLowerCase().replace(/[^a-z]/g, "");

function scanPlain(text, reasons) {
  for (const [re, code] of SECRET_SHAPES)
    if (re.test(text) && !reasons.includes(code)) reasons.push(code);
  const letters = lettersOnly(text);
  for (const [needle, code] of MARKERS)
    if (letters.includes(needle) && !reasons.includes(code)) reasons.push(code);
}

function decodedSegments(text) {
  const out = [];
  for (const m of text.matchAll(/[A-Za-z0-9+/_-]{24,}={0,2}/g)) {
    try {
      const buf = Buffer.from(m[0].replace(/-/g, "+").replace(/_/g, "/"), "base64");
      if (buf.length >= 12) out.push(buf.toString("utf8"));
    } catch {}
  }
  for (const m of text.matchAll(/\b(?:[0-9a-fA-F]{2}){16,}\b/g)) {
    out.push(Buffer.from(m[0], "hex").toString("utf8"));
  }
  return out.filter((s) => /^[\x09\x0A\x0D\x20-\x7E -￿]*$/.test(s));
}

/**
 * Scan exported text. `contexts` are the request's context strings (untrusted inputs the frozen
 * guard may have demoted and forwarded to the provider); an output that repeats a chunk of one is an
 * echo across the export boundary. `canaries` are operator-configured strings that must never leave.
 *
 * @returns {{ withhold: boolean, reasons: string[], output_sha256: string }}
 */
export function scanExport(text, { contexts = [], canaries = [] } = {}) {
  const raw = String(text ?? "");
  const reasons = [];
  const norm = normaliseForScan(raw);
  scanPlain(norm, reasons);
  scanPlain([...norm].reverse().join(""), reasons.length ? [] : reasons);
  for (const segment of decodedSegments(norm)) {
    const inner = [];
    scanPlain(normaliseForScan(segment), inner);
    for (const code of inner) {
      const tagged = `${code}_encoded`;
      if (!reasons.includes(tagged)) reasons.push(tagged);
    }
  }
  const normLetters = lettersOnly(norm);
  for (const canary of canaries) {
    const c = normaliseForScan(canary);
    if (c.length >= 6 && (norm.includes(c) || normLetters.includes(lettersOnly(c)))) {
      if (!reasons.includes("export_canary")) reasons.push("export_canary");
    }
  }
  // Echo: any 40-character window of a normalised context that reappears in the output. Windows
  // step by 8 characters, so a partial quotation is caught without the prefix having to match.
  for (const context of contexts) {
    const c = normaliseForScan(context);
    if (c.length < 40) continue;
    let echoed = false;
    for (let i = 0; i + 40 <= c.length && !echoed; i += 8)
      echoed = norm.includes(c.slice(i, i + 40));
    if (echoed) {
      if (!reasons.includes("export_context_echo")) reasons.push("export_context_echo");
      break;
    }
  }
  return {
    withhold: reasons.length > 0,
    reasons,
    output_sha256: createHash("sha256").update(raw).digest("hex"),
  };
}
