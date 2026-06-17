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
const run = (body) =>
  fetch(`${api}/${s.session_id}/run`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify(body),
  }).then((r) => r.json());

const good = await run({
  input: "Summarise the safety policy.",
  provider_mode: "recorded_fixture",
  provider: "recorded_fixture",
  case_id: "3e_recorded_001",
});
ok(good.receipt?.schema_version === "3E", "recorded fixture must emit 3E receipt", good);

const bad = await run({
  input: "x",
  provider_mode: "recorded_fixture",
  provider: "recorded_fixture",
  case_id: "../secret",
});
ok(
  bad.ok === false && /gateway_fixture_selector_invalid/.test(bad.error),
  "path selector rejected",
  bad
);
console.log("[PASS] stage3e recorded fixture smoke");
