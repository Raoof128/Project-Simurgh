// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — Lane B orchestrator. Runs the review ceremony in a SEPARATE process (the host holds
// only the evidence dir + its own key), writes the transcript, and asserts the ceremony receipt's
// recomputed output equals the bundle receipt's (both are reruns of the SAME controlled recipe).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../../../..");
const EVID = join(ROOT, "docs/research/llm-shield/evidence/stage-5h");
const HOSTKEY = join(
  ROOT,
  "tests/fixtures/llmShield/stage5h/test-keys/INSECURE_FIXTURE_ONLY_host.pem"
);
const CHILD = join(fileURLToPath(new URL(".", import.meta.url)), "child-process.mjs");

export function runCeremony({ evidenceDir = EVID, hostKeyPath = HOSTKEY } = {}) {
  const out = execFileSync(process.execPath, [CHILD, evidenceDir, hostKeyPath], {
    encoding: "utf8",
  });
  const transcript = JSON.parse(out);
  const bundle = JSON.parse(readFileSync(join(evidenceDir, "vsd-attestation.json"), "utf8"));
  const bundleReceipt = bundle.review_receipts[0].content.recomputed_output_digest;
  const ceremonyReceipt = transcript.ceremony_receipt.content.recomputed_output_digest;
  const corroborated =
    transcript.producer_signature_ok &&
    transcript.attestation_signature_ok &&
    bundleReceipt === ceremonyReceipt;
  return { corroborated, transcript, bundleReceipt, ceremonyReceipt };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const res = runCeremony();
  mkdirSync(join(EVID, "laneb"), { recursive: true });
  writeFileSync(
    join(EVID, "laneb", "ceremony-transcript.json"),
    JSON.stringify(res.transcript, null, 2) + "\n"
  );
  if (!res.corroborated) {
    console.error("[5h] Lane B ceremony did NOT corroborate");
    process.exitCode = 1;
  } else {
    console.log("[5h] Lane B ceremony corroborated (independent rerun == bundle receipt)");
  }
}
