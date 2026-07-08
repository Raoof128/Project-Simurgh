// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5A VNC — Lane B blind recompute CHILD (plan Task 11). Reads {narrative, vwa,
// claim_table, provenance} from stdin and independently rebuilds the ledger, emitting
// canonicalJson(ledger). It is BLIND to the answer: it exits 2 on any OPERATOR_* env var and
// if its stdin message mentions the committed ledger, its digest, its path, the expected
// outcome, or an evidence-dir path (reviewer N6). "If the ledger binds a field, the child
// receives that field's INPUTS, never the answer." Motto: AnthropicSafe First, then
// ReviewerSafe.
import { pathToFileURL } from "node:url";
import { recordDigest, canonicalJson } from "../../stage4m/core/canonical.mjs";
import { classify } from "../core/verdictCore.mjs";
import { computeUnnarrated, tallies } from "../core/partitionCore.mjs";
import { signArtifact } from "../core/vncCore.mjs";
import { VNC_PRIV, VNC_PUB } from "../node/greenBundle.mjs";
import { VNC_LEDGER_SCHEMA } from "../constants.mjs";

const FORBIDDEN = ["committed_ledger", "ledger_path", "ledger_digest", "expected_raw", "evidence/"];

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.on("data", (c) => (data += c));
    process.stdin.on("end", () => resolve(data));
  });
}

export function rebuildLedger({ narrative, vwa, claim_table, provenance }) {
  const verdicts = classify(claim_table, vwa.map);
  const content = {
    schema: VNC_LEDGER_SCHEMA,
    verdicts,
    unnarrated_flags: computeUnnarrated(verdicts, vwa.map),
    claim_table_digest: recordDigest(claim_table),
    narrative_digest: recordDigest(narrative),
    map_digest: recordDigest(vwa.map),
    map_attestation_digest: recordDigest(vwa.attestation),
    provenance,
    aggregates: {},
  };
  content.aggregates = tallies({ content });
  return signArtifact(content, VNC_PRIV, VNC_PUB);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // Blindness: no operator hints in the environment.
  for (const k of Object.keys(process.env)) if (k.startsWith("OPERATOR_")) process.exit(2);
  const raw = await readStdin();
  if (FORBIDDEN.some((f) => raw.includes(f))) process.exit(2);
  const msg = JSON.parse(raw);
  const ledger = rebuildLedger(msg);
  process.stdout.write(canonicalJson(ledger));
  process.exit(0);
}
