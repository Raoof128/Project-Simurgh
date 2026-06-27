// SPDX-License-Identifier: AGPL-3.0-or-later
const FORBIDDEN_KEYS = new Set([
  "raw_secret",
  "raw_credential",
  "raw_api_key",
  "raw_prompt",
  "raw_system_prompt",
  "raw_email_body",
  "raw_page_text",
  "raw_model_output",
  "raw_user_private_content",
  "private_signing_key",
]);

export function auditPrivacy(value) {
  const stack = [value];
  while (stack.length) {
    const item = stack.pop();
    if (Array.isArray(item)) {
      for (const child of item) stack.push(child);
    } else if (item && typeof item === "object") {
      for (const [key, child] of Object.entries(item)) {
        if (FORBIDDEN_KEYS.has(key)) return { ok: false, reason: "privacy_leak_detected", key };
        stack.push(child);
      }
    } else if (typeof item === "string") {
      if (item.includes("-----BEGIN PRIVATE KEY-----")) {
        return { ok: false, reason: "privacy_leak_detected" };
      }
      if (/sk-[A-Za-z0-9_-]{16,}/.test(item)) return { ok: false, reason: "privacy_leak_detected" };
    }
  }
  return { ok: true };
}
