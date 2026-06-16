const base = process.argv[2] || process.env.SIMURGH_BASE_URL || "http://127.0.0.1:33041";
const api = `${base}/api/llm-shield`;
function assertSmoke(c, m, d) {
  if (!c) throw new Error(d ? `${m}: ${JSON.stringify(d)}` : m);
}

const s = await (
  await fetch(`${api}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  })
).json();
const auth = { "Content-Type": "application/json", Authorization: `Bearer ${s.session_token}` };

const safe = await (
  await fetch(`${api}/${s.session_id}/run`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ task_type: "summarise", input: "Summarise this paragraph." }),
  })
).json();
assertSmoke(safe.verdict === "safe" && safe.model_called === true, "safe run failed", safe);
assertSmoke(safe.receipt?.type === "simurgh.llm_safety_receipt.v1", "missing receipt", safe);
assertSmoke(safe.receipt?.schema_version === "3C", "wrong schema_version", safe);

const verify = await (
  await fetch(`${api}/${s.session_id}/verify`, {
    headers: { Authorization: `Bearer ${s.session_token}` },
  })
).json();
assertSmoke(verify.valid === true && verify.errors.length === 0, "chain did not verify", verify);
console.log("[PASS] receipt emitted and audit chain verifies");
