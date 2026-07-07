// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4W Lane A corpus builder (spec §3). Motto: AnthropicSafe First, then ReviewerSafe.
// Every content-side mutation re-binds + re-signs (4T resignBundle lesson);
// signature-tamper cases are left unsigned-invalid on purpose.
import crypto from "node:crypto";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { recordDigest, canonicalJson } from "../../stage4m/core/canonical.mjs";
import { VSN_LANE_A_CORPUS_SCHEMA } from "../constants.mjs";
import { buildNarrativeBinding } from "../core/narrativeBinding.mjs";
import { buildGreenNarrative, resignNarrativeGreen } from "./greenNarrative.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const KEYDIR = join(HERE, "../../../../tests/fixtures/llmShield/stage4w/test-keys");
const EVDIR = join(HERE, "../../../../docs/research/llm-shield/evidence/stage-4w/lane-a");
const readKey = (n) => readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${n}.pem`), "utf8");

const clone = (x) => JSON.parse(JSON.stringify(x));

export function buildLaneAFixtures() {
  const { capsuleBundle, narrative, capsulePubKeyPem } = buildGreenNarrative();
  const G = () => clone(narrative);
  // rebind (content-side mutation) then resign.
  const RR = (n) => {
    n.content.binding = buildNarrativeBinding(
      capsuleBundle,
      capsulePubKeyPem,
      n.content.narrative_body,
      n.content.span_map
    );
    return resignNarrativeGreen(n);
  };
  const fixtures = [];
  const add = (name, expected_raw, make, mutate_note) =>
    fixtures.push({ name, expected_raw, narrative: make(), mutate_note });

  add("green-all-types", 0, () => G(), "unmutated green");

  add(
    "schema-alien-key",
    162,
    () => {
      const n = G();
      n.content.alien = true;
      return resignNarrativeGreen(n); // re-signed so schema (not signature) is the first failure
    },
    "extra top-level content key"
  );

  add(
    "signature-tampered",
    163,
    () => {
      const n = G();
      n.signature = Buffer.from("tampered-sig").toString("base64");
      return n; // NOT re-signed
    },
    "signature corrupted"
  );

  add(
    "normalisation-nfd",
    164,
    () => {
      const n = G();
      // "café." in NFD (e + combining acute) inside the trailing voice text.
      n.content.narrative_body = n.content.narrative_body.replace("calm close.", "calm café.");
      return RR(n);
    },
    "NFD sequence after all spans; binding recomputed so 164 is first"
  );

  add(
    "normalisation-crlf",
    164,
    () => {
      const n = G();
      n.content.narrative_body = n.content.narrative_body.replace("close.\n", "close.\r\n");
      return RR(n);
    },
    "CRLF newline"
  );

  add(
    "normalisation-trailing-ws",
    164,
    () => {
      const n = G();
      n.content.narrative_body = n.content.narrative_body.replace("close.\n", "close. \n");
      return RR(n);
    },
    "trailing space before newline"
  );

  add(
    "geometry-overlap",
    165,
    () => {
      const n = G();
      n.content.span_map[1].start_byte = n.content.span_map[0].end_byte - 1;
      return RR(n);
    },
    "second span starts inside the first"
  );

  add(
    "geometry-out-of-bounds",
    165,
    () => {
      const n = G();
      n.content.span_map.at(-1).end_byte = 100000;
      return RR(n);
    },
    "end beyond body"
  );

  add(
    "geometry-mid-code-point",
    165,
    () => {
      const n = G();
      const simurghAt = Buffer.byteLength("the simurgh (");
      n.content.span_map = [
        {
          span_id: "mid",
          start_byte: simurghAt + 1,
          end_byte: simurghAt + 3,
          type: "unverified_prose",
        },
      ];
      return RR(n);
    },
    "span starts inside a multi-byte code point of سیمرغ"
  );

  add(
    "geometry-duplicate-id",
    165,
    () => {
      const n = G();
      n.content.span_map[1].span_id = n.content.span_map[0].span_id;
      return RR(n);
    },
    "two spans share span_id"
  );

  add(
    "geometry-unsorted",
    165,
    () => {
      const n = G();
      n.content.span_map.reverse();
      return RR(n);
    },
    "span_map not sorted by start_byte"
  );

  add(
    "geometry-zero-length",
    165,
    () => {
      const n = G();
      n.content.span_map[0].end_byte = n.content.span_map[0].start_byte;
      return RR(n);
    },
    "empty span"
  );

  add(
    "binding-capsule-root",
    166,
    () => {
      const n = G();
      n.content.binding.capsule_root = "sha256:" + "0".repeat(64);
      return resignNarrativeGreen(n); // re-signed, NOT re-bound
    },
    "binding names a foreign capsule"
  );

  add(
    "brigandi-fabricated-citation",
    167,
    () => {
      const n = G();
      n.content.span_map[0].evidence_digest = recordDigest({ fabricated: "citation" });
      return RR(n);
    },
    "the fabricated citation: cites evidence that exists nowhere"
  );

  add(
    "judgment-digest-mismatch",
    168,
    () => {
      const n = G();
      n.content.span_map.find((s) => s.type === "judgment").judgment_digest =
        "sha256:" + "1".repeat(64);
      return RR(n);
    },
    "judgment span digest does not match the record"
  );

  add(
    "judgment-unreferenced",
    168,
    () => {
      const n = G();
      n.content.judgments.push({
        judgment_id: "ghost",
        signed_judgment: n.content.judgments[0].signed_judgment,
      });
      return RR(n);
    },
    "packed extra judgment record with no referencing span"
  );

  add(
    "brigandi-false-quotation",
    169,
    () => {
      const n = G();
      n.content.span_map[0].claimed_value = 99;
      return RR(n);
    },
    "the false quotation: claimed value diverges from sealed evidence"
  );

  add(
    "blend-wrong-section",
    169,
    () => {
      const n = G();
      const [a, b] = n.content.span_map; // a = slotA span, b = slotB span
      a.section_id = b.section_id;
      a.regime = b.regime; // sealed evidence of A attached to section B
      return RR(n);
    },
    "derivation blend: right evidence, wrong section"
  );

  add(
    "leakage-undeclared-digit",
    170,
    () => {
      const n = G();
      n.content.narrative_body = n.content.narrative_body.replace(
        "calm close.\n",
        "calm close with 9 asides.\n"
      );
      return RR(n);
    },
    "undeclared digit in connective text"
  );

  add(
    "leakage-capsule-collision",
    170,
    () => {
      const n = G();
      // Echo a capsule projected value (the participant count) undeclared.
      const v = String(n.content.span_map[0].claimed_value);
      n.content.narrative_body = n.content.narrative_body.replace(
        "calm close.\n",
        `calm close echoing ${v}.\n`
      );
      return RR(n);
    },
    "capsule value echoed undeclared (digit rule fires; collision family)"
  );

  add(
    "payload-smuggled-prompt",
    171,
    () => {
      const n = G();
      n.content.judgments.push({
        judgment_id: "cargo",
        reserved: true,
        signed_judgment: {
          content: { prompt: "hidden completion cargo" },
          signature: "",
          judgment_pub_key_pem: "",
        },
      });
      return RR(n);
    },
    "forbidden 'prompt' key nested in a reserved judgment record"
  );

  add("density-recount", 0, () => G(), "green again; harness recounts density independently");

  return fixtures;
}

export function corpusDocument() {
  const cases = buildLaneAFixtures().map((f) => ({
    name: f.name,
    expected_raw: f.expected_raw,
    mutate_note: f.mutate_note,
    narrative_digest: recordDigest(f.narrative),
  }));
  const content = { schema: VSN_LANE_A_CORPUS_SCHEMA, cases };
  const signature = crypto
    .sign(null, Buffer.from(canonicalJson(content)), crypto.createPrivateKey(readKey("vsn")))
    .toString("base64");
  return { content, signature };
}

export function writeCorpus() {
  mkdirSync(EVDIR, { recursive: true });
  const doc = { corpus: corpusDocument(), fixtures: buildLaneAFixtures() };
  writeFileSync(join(EVDIR, "corpus.json"), canonicalJson(doc) + "\n");
}

// CLI main: `node build-stage4w-fixtures.mjs` regenerates the byte-stable corpus
// (reviewer P0 #3 — the corpus MUST be a committed file for Task 16's cmp).
// Guard argv[1] (undefined under `node -e`/dynamic import) so importing never crashes.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) writeCorpus();
