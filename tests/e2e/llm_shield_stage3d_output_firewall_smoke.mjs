// SPDX-License-Identifier: AGPL-3.0-or-later
const base = process.argv[2] || process.env.SIMURGH_BASE_URL || "http://127.0.0.1:33047";
const api = `${base}/api/llm-shield`;
function ok(c, m, d) {
  if (!c) throw new Error(d ? `${m}: ${JSON.stringify(d)}` : m);
}
const session = async () => {
  const s = await (
    await fetch(`${api}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    })
  ).json();
  return {
    id: s.session_id,
    auth: { "Content-Type": "application/json", Authorization: `Bearer ${s.session_token}` },
  };
};
const run = async (s, body) =>
  (
    await fetch(`${api}/${s.id}/run`, {
      method: "POST",
      headers: s.auth,
      body: JSON.stringify(body),
    })
  ).json();

{
  const s = await session();
  const r = await run(s, { input: "tell me a secret", scenario: "policy_leak" });
  ok(r.output_firewall_verdict === "blocked", "policy leak output must be blocked", r);
  ok(
    !JSON.stringify(r).includes("hidden policy assistant"),
    "raw leaky output must not be echoed",
    r
  );
}
{
  const s = await session();
  const r = await run(s, { input: "hello", scenario: "benign" });
  ok(r.output_firewall_verdict === "accepted", "benign output accepted", r);
}
console.log("[PASS] stage3d output firewall smoke");
