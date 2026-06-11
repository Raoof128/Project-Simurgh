#!/usr/bin/env node
const VALID_SCOPE_HASH = "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

function assertSmoke(condition, message, detail) {
  if (!condition) {
    throw new Error(detail ? `${message}: ${JSON.stringify(detail)}` : message);
  }
}

async function postJson(url, body, token) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function run() {
  const base = process.argv[2] || process.env.SIMURGH_BASE_URL || "http://127.0.0.1:3030";
  const api = `${base}/api/banking-pilot`;
  const consent = await postJson(`${api}/consent/accept`, {});
  assertSmoke(consent.status === 200, "consent failed", consent);
  const { banking_session_id, token } = consent.body;
  assertSmoke(banking_session_id.startsWith("bp_"), "bad session id", consent.body);

  const submitted = await postJson(
    `${api}/submit`,
    {
      banking_session_id,
      scenario_type: "mock_cdr_consent",
      submit_intent: true,
      consent_scope_hash: VALID_SCOPE_HASH,
      consent_duration_category: "one_time",
      withdrawal_option_shown: true,
    },
    token
  );
  assertSmoke(submitted.status === 200, "submit failed", submitted);

  const verify = await fetch(`${api}/${banking_session_id}/verify`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const verifyBody = await verify.json();
  assertSmoke(verifyBody.audit_chain_valid === true, "verify failed", verifyBody);
  console.log("banking_pilot_smoke: PASS");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
