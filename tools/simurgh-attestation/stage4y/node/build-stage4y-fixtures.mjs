// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Y VDR — fixture + evidence builder (plan Task 9/10). Motto: AnthropicSafe First,
// then ReviewerSafe. Ten shape-only fixtures (fixture_documents_never_name_a_party); the
// tamper fixture is SPLIT (183 masks 186). Deterministic salts + committed key → byte-stable.
// Build twice and `cmp` — the reproduce script re-verifies only.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { buildMap } from "../core/mapCore.mjs";
import { signAttestation } from "../core/vdrCore.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../../../..");
const EVID = join(ROOT, "docs/research/llm-shield/evidence/stage-4y");
const KEYDIR = join(ROOT, "tests/fixtures/llmShield/stage4y/test-keys");
const PUB = readFileSync(join(KEYDIR, "INSECURE_FIXTURE_ONLY_vdr.pub.pem"), "utf8");
const PRIV = readFileSync(join(KEYDIR, "INSECURE_FIXTURE_ONLY_vdr.pem"), "utf8");
const ENC = new TextEncoder();

// Deterministic per-fixture salt (reviewer P0-5) — NEVER random.
const saltFor = (id) =>
  createHash("sha256")
    .update("vdr-fixture-salt:" + id)
    .digest("hex")
    .slice(0, 16);

// Shape-only fixture corpus. `[[R]]` marks a redaction region we compute a manifest for.
const REDACT_OPEN = "[[R]]";
const REDACT_CLOSE = "[[/R]]";

// A body may embed [[R]]...[[/R]] markers; we strip them and emit a byte-offset manifest.
function withManifest(raw) {
  let text = "";
  const manifest = [];
  let i = 0;
  while (i < raw.length) {
    if (raw.startsWith(REDACT_OPEN, i)) {
      const end = raw.indexOf(REDACT_CLOSE, i);
      const inner = raw.slice(i + REDACT_OPEN.length, end);
      const offset = ENC.encode(text).length;
      text += inner;
      manifest.push({ offset, length: ENC.encode(inner).length });
      i = end + REDACT_CLOSE.length;
    } else {
      text += raw[i];
      i++;
    }
  }
  return { bytes: ENC.encode(text), manifest };
}

const FIXTURES = [
  {
    id: "incident_report_shaped",
    set: "clean",
    // Shaped on the EU Commission Art-73 serious-incident template (fields, not a real filing).
    raw: "Serious incident report.\nDate of awareness: 3 March.\nAffected users: 1200 accounts.\nSeverity: most sessions degraded.\nCorrective measures applied within 15 days.\n",
  },
  {
    id: "risk_report_shaped_private",
    set: "clean",
    raw: "Risk report (private).\nEval score reached 42% on the probe.\nWe retained seven of the mitigations.\n",
  },
  {
    id: "risk_report_shaped_public",
    set: "clean",
    raw: "Risk report (public).\nEval score reached [[R]]42%[[/R]] on the probe.\nWe retained seven of the mitigations.\n",
  },
  {
    id: "consulting_report_shaped_v1",
    set: "clean",
    raw: "Findings.\nApproximately 90% of respondents agreed.\nWe reviewed 30 sources in October.\n",
  },
  {
    id: "consulting_report_shaped_v2",
    set: "clean",
    raw: "Findings (revised).\nRoughly a large fraction of respondents agreed.\nWe reviewed 12 sources in October.\n",
  },
  {
    id: "withdrawn_policy_shaped",
    set: "clean",
    raw: "Draft policy.\nNearly all agencies will comply by 2027.\nAbout half of the budget is allocated.\n",
  },
  {
    id: "minimal_edge",
    set: "clean",
    // redaction at offset 0 and at EOF, a multi-byte char, adjacent v1/v2.
    raw: "[[R]]42[[/R]]€ roughly 7 in May[[R]]9[[/R]]",
  },
  {
    id: "botched_marker_shaped",
    set: "tamper",
    target: 183,
    // A █ run OUTSIDE any declared manifest → undeclared_redaction_marker.
    raw: "Name: ████ retained 42 accounts.\n",
  },
  {
    id: "reconciliation_mismatch_shaped",
    set: "tamper",
    target: 186,
    // marker-clean, signed; its counterpart disagrees on the segment class sequence.
    raw: "Public filing.\nWe retained [[R]]seven[[/R]] of 30 mitigations.\n",
    counterpartMismatch: true,
  },
  {
    id: "withheld_document",
    set: "withheld",
    raw: "Withheld report.\nScore was 88% across 40 trials in June.\n",
  },
];

function build() {
  mkdirSync(EVID, { recursive: true });
  const index = [];
  for (const fx of FIXTURES) {
    const { bytes, manifest } = withManifest(fx.raw);
    const { map, audit } = buildMap(bytes, manifest, {
      salt: saltFor(fx.id),
      provenance: "fixture",
    });
    const attestation = signAttestation(map, audit, PUB, PRIV);

    const write = (name, obj) => writeFileSync(join(EVID, name), canonicalJson(obj) + "\n");
    write(`${fx.id}.map.json`, map);
    write(`${fx.id}.attestation.json`, attestation);
    if (fx.set !== "withheld") {
      write(`${fx.id}.audit.json`, audit);
      writeFileSync(join(EVID, `${fx.id}.document.txt`), Buffer.from(bytes));
    }
    // 186 fixtures ship a counterpart segment sequence (matching or deliberately not).
    if (fx.id === "risk_report_shaped_public")
      write(`${fx.id}.counterpart.json`, {
        segment_class_sequence: map.reconciliation.segment_class_sequence,
      });
    if (fx.counterpartMismatch)
      write(`${fx.id}.counterpart.json`, {
        segment_class_sequence: [...map.reconciliation.segment_class_sequence, "unflagged"],
      });

    index.push({ id: fx.id, set: fx.set, target: fx.target ?? 0 });
  }
  writeFileSync(join(EVID, "index.json"), canonicalJson({ fixtures: index }) + "\n");
  return index;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const idx = build();
  console.log(`Stage 4Y fixtures built: ${idx.length} → ${EVID}`);
}

export { build, FIXTURES, EVID, saltFor };
