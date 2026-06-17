// SPDX-License-Identifier: AGPL-3.0-or-later
const base = process.argv[2] || process.env.SIMURGH_BASE_URL || "http://127.0.0.1:33044";
const api = `${base}/api/llm-shield`;
function ok(c, m, d) {
  if (!c) throw new Error(d ? `${m}: ${JSON.stringify(d)}` : m);
}
const newSession = async () => {
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
    token: s.session_token,
  };
};

// 1. Plain {input} request keeps the existing 3A/3B/3C receipt (no drift).
{
  const s = await newSession();
  const r = await (
    await fetch(`${api}/${s.id}/run`, {
      method: "POST",
      headers: s.auth,
      body: JSON.stringify({ task_type: "summarise", input: "Summarise this." }),
    })
  ).json();
  ok(r.receipt?.schema_version === "3C", "plain input must keep 3C receipt", r);
}

// 2. stage3d:true with no scenario -> 3D receipt, benign scenario.
{
  const s = await newSession();
  const r = await (
    await fetch(`${api}/${s.id}/run`, {
      method: "POST",
      headers: s.auth,
      body: JSON.stringify({ task_type: "general_qa", input: "Hello", stage3d: true }),
    })
  ).json();
  ok(r.receipt?.schema_version === "3D", "stage3d run must emit 3D receipt", r);
  ok(r.receipt?.scenario === "benign", "default scenario must be benign", r);
  ok(r.receipt?.context_verdict === "not_supplied", "no contexts -> not_supplied", r);
}

// 3. Unknown scenario rejected.
{
  const s = await newSession();
  const res = await fetch(`${api}/${s.id}/run`, {
    method: "POST",
    headers: s.auth,
    body: JSON.stringify({ input: "Hello", scenario: "definitely_not_a_scenario" }),
  });
  const r = await res.json();
  ok(r.ok === false && r.error === "scenario_not_allowed", "unknown scenario must be rejected", r);
}

// 4. mock_provider_output rejected on the HTTP route.
{
  const s = await newSession();
  const r = await (
    await fetch(`${api}/${s.id}/run`, {
      method: "POST",
      headers: s.auth,
      body: JSON.stringify({ input: "Hello", stage3d: true, mock_provider_output: "leak" }),
    })
  ).json();
  ok(
    r.ok === false && r.error === "mock_provider_output_http_rejected",
    "mock_provider_output must be rejected over HTTP",
    r
  );
}

// 5. Audit chain verifies after a 3D run.
{
  const s = await newSession();
  await fetch(`${api}/${s.id}/run`, {
    method: "POST",
    headers: s.auth,
    body: JSON.stringify({ input: "Hello", stage3d: true }),
  });
  const v = await (
    await fetch(`${api}/${s.id}/verify`, { headers: { Authorization: `Bearer ${s.token}` } })
  ).json();
  ok(v.valid === true, "chain must verify after 3D run", v);
}

console.log("[PASS] stage3d activation smoke");
