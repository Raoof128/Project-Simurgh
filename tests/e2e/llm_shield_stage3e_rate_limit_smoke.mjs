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
const res = await fetch(`${api}/${s.session_id}/run`, {
  method: "POST",
  headers: auth,
  body: JSON.stringify({ input: "a".repeat(5000), provider_mode: "mock", provider: "mock" }),
});
const r = await res.json();
ok(res.status === 413 && r.error === "gateway_input_too_large", "over-cap input must be rejected", {
  status: res.status,
  r,
});
console.log("[PASS] stage3e rate limit smoke");
