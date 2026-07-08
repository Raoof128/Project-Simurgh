// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5A VNC — Lane A fixture + evidence builder (plan Task 10). 16 fixtures matching the
// spec §3 / plan matrix; deterministic (committed keys + fixed salts) → byte-stable
// canonicalJson. Split-tamper discipline: each tamper keeps every EARLIER check in
// VNC_CHECK_ORDER clean so ONLY the target code fires. Motto: AnthropicSafe First, then
// ReviewerSafe.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { canonicalJson, recordDigest } from "../../stage4m/core/canonical.mjs";
import { buildGreenNarrative } from "../../stage4w/node/greenNarrative.mjs";
import { computeUnnarrated, tallies } from "../core/partitionCore.mjs";
import { signArtifact } from "../core/vncCore.mjs";
import {
  makeVwaBundle,
  assemble,
  introspectiveSpanRef,
  buildReflectionManifest,
  buildPilotAdaptation,
  rebuildAttestation,
  VNC_PRIV,
  VNC_PUB,
} from "./greenBundle.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const EVID = join(HERE, "..", "..", "..", "..", "docs/research/llm-shield/evidence/stage-5a");

const claim = (id, tok, polarity = "asserts_unflagged", spanRef) => ({
  claim_id: id,
  span_ref: spanRef,
  token_ids: [tok],
  polarity,
});

// Re-sign the ledger over its CURRENT content (no re-tally), then rebuild the attestation.
const signLedger = (b) => {
  b.ledger = signArtifact(b.ledger.content, VNC_PRIV, VNC_PUB);
  return rebuildAttestation(b);
};
// Re-tally + re-sign the ledger, then rebuild the attestation.
const resealLedger = (b) => {
  b.ledger.content.aggregates = tallies({ content: b.ledger.content });
  return signLedger(b);
};

export function buildFixtures() {
  const { narrative } = buildGreenNarrative();
  const span = introspectiveSpanRef(narrative);
  const std = () => makeVwaBundle();
  const out = [];
  const add = (id, set, public_raw, audit_raw, bundle) =>
    out.push({ id, set, public_raw, audit_raw, bundle });

  // 1 — corroborated (absent): asserts_unflagged over 2001 (no flag) → corroborated.
  add(
    "clean_corroborated_absent",
    "clean",
    0,
    0,
    assemble({ narrative, vwa: std(), claims: [claim("c1", "2001", "asserts_unflagged", span)] })
  );

  // 2 — the headline: asserts_unflagged over 1001 (flags) → contradicted RECORDED; bundle CLEAN.
  add(
    "eval_awareness_conflict",
    "clean",
    0,
    0,
    assemble({ narrative, vwa: std(), claims: [claim("c1", "1001", "asserts_unflagged", span)] })
  );

  // 3 — flags present, no claim covers them → all unnarrated.
  add(
    "clean_unnarrated_flags",
    "clean",
    0,
    0,
    assemble({
      narrative,
      vwa: std(),
      claims: [
        claim("c1", "2001", "asserts_unflagged", span),
        claim("c2", "2001", "asserts_flagged", span),
      ],
    })
  );

  // 4 — empty claim table is valid; every flag unnarrated.
  add("clean_zero_claims", "clean", 0, 0, assemble({ narrative, vwa: std(), claims: [] }));

  // 5 — a claim token outside the map lexicon → unreadable (honestly).
  add(
    "clean_unreadable_claim",
    "clean",
    0,
    0,
    assemble({ narrative, vwa: std(), claims: [claim("c1", "9999", "asserts_unflagged", span)] })
  );

  // 6 — pilot: a real external export adapted under the 4Z contract, conflict-checked.
  {
    const { vwa, pilot, rawB64 } = buildPilotAdaptation();
    add(
      "pilot_external_export",
      "pilot",
      0,
      0,
      assemble({
        narrative,
        vwa,
        claims: [claim("c1", "2001", "asserts_unflagged", span)],
        pilotAdaptation: pilot,
        pilotRawBytesB64: rawB64,
      })
    );
  }

  // 7 — RCP manifest over the CC0 constitution-shaped corpus.
  add(
    "provenance_manifest_clean",
    "rcp",
    0,
    0,
    assemble({
      narrative,
      vwa: std(),
      claims: [claim("c1", "2001", "asserts_unflagged", span)],
      reflectionManifest: buildReflectionManifest(),
    })
  );

  // 8 — 200: corrupt the attestation signature (do NOT resign).
  {
    const b = assemble({
      narrative,
      vwa: std(),
      claims: [claim("c1", "2001", "asserts_unflagged", span)],
    });
    b.attestation.signature = "00" + b.attestation.signature.slice(2);
    add("tamper_signature", "tamper", 200, 200, b);
  }

  // 9 — 201: swap the ledger's map_digest to a DIFFERENT capture, then resign (200 stays clean).
  {
    const b = assemble({
      narrative,
      vwa: std(),
      claims: [claim("c1", "2001", "asserts_unflagged", span)],
    });
    b.ledger.content.map_digest = recordDigest(makeVwaBundle("other").map);
    signLedger(b);
    add("tamper_borrowed_story", "tamper", 201, 201, b);
  }

  // 10 — 202: mutate the claim table precommit-invalid (scope rule), rebind + resign everything.
  {
    const b = assemble({
      narrative,
      vwa: std(),
      claims: [claim("c1", "2001", "asserts_unflagged", span)],
    });
    b.claim_table.content.scope_rule_id = "some_cells";
    add("tamper_posthoc_claim_table", "tamper", 202, 202, rebindTable(b));
  }

  // 11 — 203: delete one verdict row (a claim without a verdict).
  {
    const b = assemble({
      narrative,
      vwa: std(),
      claims: [
        claim("c1", "2001", "asserts_unflagged", span),
        claim("c2", "1001", "asserts_unflagged", span),
      ],
    });
    b.ledger.content.verdicts = b.ledger.content.verdicts.filter((v) => v.claim_id !== "c2");
    resealLedger(b);
    add("tamper_silent_claim", "tamper", 203, 203, b);
  }

  // 12 — 204: drop one flag from unnarrated (present in neither side → silent flag).
  {
    const b = assemble({
      narrative,
      vwa: std(),
      claims: [claim("c1", "2001", "asserts_unflagged", span)],
    });
    b.ledger.content.unnarrated_flags = b.ledger.content.unnarrated_flags.slice(1);
    resealLedger(b);
    add("tamper_silent_flag", "tamper", 204, 204, b);
  }

  // 13 — 205: flip contradicted→corroborated; keep tallies + partition consistent with the LIE.
  {
    const b = assemble({
      narrative,
      vwa: std(),
      claims: [claim("c1", "1001", "asserts_unflagged", span)],
    });
    const row = b.ledger.content.verdicts[0];
    row.verdict = "corroborated";
    row.evidence = [];
    b.ledger.content.unnarrated_flags = computeUnnarrated(b.ledger.content.verdicts, b.vwa.map);
    resealLedger(b);
    add("tamper_two_stories", "tamper", 205, 205, b);
  }

  // 14 — 206: swap an example digest while leaving the committed Merkle root unchanged.
  {
    const b = assemble({
      narrative,
      vwa: std(),
      claims: [claim("c1", "2001", "asserts_unflagged", span)],
      reflectionManifest: buildReflectionManifest(),
    });
    b.reflection_manifest.content.examples[0].example_digest = "sha256:" + "a".repeat(64);
    rebuildAttestation(b);
    add("tamper_manifest_inclusion", "tamper", 206, 206, b);
  }

  // 15 — 207: a synthesized field the pilot no longer declares (undeclared lossiness).
  {
    const { vwa, pilot, rawB64 } = buildPilotAdaptation();
    const b = assemble({
      narrative,
      vwa,
      claims: [claim("c1", "2001", "asserts_unflagged", span)],
      pilotAdaptation: pilot,
      pilotRawBytesB64: rawB64,
    });
    b.pilot_adaptation.content.lossiness = b.pilot_adaptation.content.lossiness.slice(1);
    rebuildAttestation(b);
    add("tamper_adapter_lossy", "tamper", 207, 207, b);
  }

  // 16 — 208: mutate ONE aggregate, resign the ledger WITHOUT re-tally.
  {
    const b = assemble({
      narrative,
      vwa: std(),
      claims: [claim("c1", "2001", "asserts_unflagged", span)],
    });
    b.ledger.content.aggregates.n_flags += 1;
    signLedger(b);
    add("tamper_tally", "tamper", 208, 208, b);
  }

  return out;
}

// After mutating the claim table content, re-author it, rebind the ledger's claim_table_digest,
// resign the ledger, and rebuild the attestation — so ONLY the intended precommit check fires.
function rebindTable(b) {
  b.claim_table = signArtifact(b.claim_table.content, VNC_PRIV, VNC_PUB);
  b.ledger.content.claim_table_digest = recordDigest(b.claim_table);
  b.ledger = signArtifact(b.ledger.content, VNC_PRIV, VNC_PUB);
  return rebuildAttestation(b);
}

export function build() {
  mkdirSync(EVID, { recursive: true });
  const fixtures = buildFixtures();
  for (const fx of fixtures)
    writeFileSync(join(EVID, `${fx.id}.json`), canonicalJson(fx.bundle) + "\n");
  const index = fixtures.map((f) => ({
    id: f.id,
    set: f.set,
    public_raw: f.public_raw,
    audit_raw: f.audit_raw,
  }));
  writeFileSync(join(EVID, "index.json"), canonicalJson(index) + "\n");
  return fixtures.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const n = build();
  console.log(`stage5a fixtures written: ${n}`);
}
