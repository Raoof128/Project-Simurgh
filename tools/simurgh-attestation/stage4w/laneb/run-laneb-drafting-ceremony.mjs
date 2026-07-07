// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4W Lane B parent (spec §3). Motto: AnthropicSafe First, then ReviewerSafe.
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { canonicalJson, recordDigest } from "../../stage4m/core/canonical.mjs";
import { buildGreenBundle } from "../../stage4t/node/greenCapsule.mjs";
import { buildNarrativeBinding } from "../core/narrativeBinding.mjs";
import { evaluateNarrativeSafe } from "../core/narrativeCore.mjs";
import { VSN_LANEB_CAPTURE_SCHEMA } from "../constants.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const KEYDIR = join(HERE, "../../../../tests/fixtures/llmShield/stage4w/test-keys");
const EVDIR = join(HERE, "../../../../docs/research/llm-shield/evidence/stage-4w/laneb");
const CHILD = join(HERE, "drafter-child.mjs");
const key = (n) => readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${n}.pem`), "utf8");
const pub = (n) => readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${n}.pub.pem`), "utf8");

const green = buildGreenBundle();
const projection = green.bundle.content.projected_sections.map(
  ({ regime, section_id, class: cls, value, recompute_kind, evidence_digest }) => ({
    regime,
    section_id,
    class: cls,
    value,
    recompute_kind,
    evidence_digest,
  })
);

const scrubbed = { PATH: process.env.PATH };
const run = (env, args, payload) =>
  spawnSync(process.execPath, [CHILD, ...args], { env, input: payload, encoding: "utf8" });

// Blindness negatives FIRST (sealed): operator env + pem argv must be refused.
const negatives = [
  {
    name: "operator_env_refused",
    exit_code: run({ ...scrubbed, OPERATOR_SECRET: "x" }, [], "{}").status,
  },
  { name: "pem_argv_refused", exit_code: run(scrubbed, ["fake.pem"], "{}").status },
];

// The real ceremony: two-phase (deterministic child) so the parent can compute the
// binding over the child's own body without ever rewriting the child's narrative.
const feed = (binding) =>
  JSON.parse(
    run(
      scrubbed,
      [],
      canonicalJson({
        capsule_projection: projection,
        binding,
        laneb_priv_key_pem: key("vsn-laneb-author"),
        laneb_pub_key_pem: pub("vsn-laneb-author"),
      })
    ).stdout
  );

const draft1 = feed({});
const binding = buildNarrativeBinding(
  green.bundle,
  green.pubKeyPem,
  draft1.content.narrative_body,
  draft1.content.span_map
);
const narrative = feed(binding);

const result = evaluateNarrativeSafe(green.bundle, narrative, {
  capsulePubKeyPem: green.pubKeyPem,
  ctx: {},
});
if (result.raw !== 0) {
  console.error("lane B verify failed:", JSON.stringify(result));
  process.exit(1);
}

mkdirSync(EVDIR, { recursive: true });
writeFileSync(
  join(EVDIR, "capture.json"),
  canonicalJson({
    schema: VSN_LANEB_CAPTURE_SCHEMA,
    narrative,
    verify_raw: result.raw,
    density: result.density,
    laneb_author_pub_key_pem: pub("vsn-laneb-author"),
    child_input_profile: {
      evidence_input: "capsule_public_projection_only",
      signing_key_delivery: "stdin_child_author_key",
      operator_private_state_visible: false,
    },
    component_hashes: {
      capsule_projection: recordDigest(projection),
      narrative: recordDigest(narrative),
      density: recordDigest(result.density),
    },
    blindness: { env_keys_scrubbed: true, negatives },
  }) + "\n"
);
console.log("lane B capture sealed, raw 0");
