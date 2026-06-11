#!/usr/bin/env node
function assertSmoke(condition, message, detail) {
  if (!condition) {
    throw new Error(detail ? `${message}: ${JSON.stringify(detail)}` : message);
  }
}

async function run() {
  const base = process.argv[2] || process.env.SIMURGH_BASE_URL || "http://127.0.0.1:3030";
  const api = `${base}/api/banking-pilot`;
  for (const route of ["consent/accept", "submit", "withdraw"]) {
    const res = await fetch(`${api}/${route}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const body = await res.json();
    assertSmoke(res.status === 410, `${route} did not close`, body);
    assertSmoke(
      body.error === "banking_pilot_collection_closed",
      `${route} bad closure body`,
      body
    );
  }
  console.log("banking_pilot_closed_smoke: PASS");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
