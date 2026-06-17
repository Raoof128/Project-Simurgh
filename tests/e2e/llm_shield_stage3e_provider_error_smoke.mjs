// SPDX-License-Identifier: AGPL-3.0-or-later
const base = process.argv[2] || process.env.SIMURGH_BASE_URL || "http://127.0.0.1:33055";
const api = `${base}/api/llm-shield/gateway`;
function ok(c, m, d) {
  if (!c) throw new Error(d ? `${m}: ${JSON.stringify(d)}` : m);
}
const s = await (
  await fetch(`${api}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  })
).json();
const auth = { "Content-Type": "application/json", Authorization: `Bearer ${s.token}` };
const r = await (
  await fetch(`${api}/${s.session_id}/run`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      input: "x",
      provider_mode: "recorded_fixture",
      provider: "recorded_fixture",
      case_id: "3e_error_001",
    }),
  })
).json();
ok(r.receipt?.provider_response_kind === "error", "error kind must be recorded as metadata", r);
ok(r.receipt?.raw_provider_transcript_recorded === false, "no raw transcript recorded", r);
console.log("[PASS] stage3e provider error smoke");
