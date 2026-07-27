// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 27: the release surface, and the closeout checker.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import {
  buildSurface,
  verifyMembers,
  surfaceDigest,
  MEMBERS,
  SURFACE_PATH,
  SURFACE_SCHEMA,
} from "../../../../tools/simurgh-attestation/stage5r/node/buildReleaseSurface.mjs";
import { verifySurface } from "../../../../tools/simurgh-attestation/stage5r/node/verifyReleaseSurface.mjs";
import {
  SIG_PATH,
  SIGNING_PREFIX,
} from "../../../../tools/simurgh-attestation/stage5r/node/signReleaseSurface.mjs";
import {
  checkDocument,
  CLOSEOUT,
} from "../../../../tools/simurgh-attestation/stage5r/node/checkCloseout.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const delta = JSON.parse(
  read("docs/research/llm-shield/evidence/stage-5r/ledgers/delta-ledger.json")
);
const findings = JSON.parse(
  read("docs/research/llm-shield/evidence/stage-5r/ledgers/finding-ledger.json")
);

test("five members, and the last one chains to the campaign attestation", () => {
  const s = buildSurface();
  assert.equal(s.schema, SURFACE_SCHEMA);
  assert.equal(SURFACE_SCHEMA, "simurgh.vpf.release-surface.v1");
  assert.deepEqual(Object.keys(s.members), [...MEMBERS]);
  assert.equal(MEMBERS.length, 5);
  const envelope = JSON.parse(
    read(
      "docs/research/llm-shield/evidence/stage-5r/attestation/campaign-attestation-envelope.json"
    )
  );
  assert.equal(s.members.campaign_attestation_public_digest, envelope.public_digest);
  assert.deepEqual(s.member_order_is_part_of_the_contract, [...MEMBERS]);
});

test("the surface covers exactly what the campaign attestation excluded", () => {
  const bundle = JSON.parse(
    read("docs/research/llm-shield/evidence/stage-5r/attestation/campaign-attestation.json")
  );
  const excluded = bundle.attested_boundary.does_not_cover.join(" ").toLowerCase();
  const members = MEMBERS.join(" ").toLowerCase();
  for (const [word, member] of [
    ["parity", "parity"],
    ["k7", "k7"],
    ["red state", "red_state"],
    ["closeout", "closeout"],
  ]) {
    assert.ok(excluded.includes(word), `${word} is not named as excluded`);
    assert.ok(members.includes(member), `${member} is not a release-surface member`);
  }
});

test("A MUTATED MEMBER IS REFUSED BEFORE THE SIGNATURE IS REACHED", () => {
  const surface = buildSurface();
  const mutated = { ...surface, members: { ...surface.members, closeout_digest: "0".repeat(64) } };
  let signatureReached = false;
  const r = verifySurface({
    surface: mutated,
    sig: { surface_digest: surfaceDigest(mutated) },
    profile: { public_key_digest: "x" },
    verifySignature: () => {
      signatureReached = true;
      return true;
    },
  });
  assert.equal(r.ok, false);
  assert.equal(r.stage, "members");
  assert.equal(signatureReached, false, "the signature was examined despite a bad member");
});

test("an undeclared member is refused rather than ignored", () => {
  const surface = buildSurface();
  const extra = { ...surface, members: { ...surface.members, smuggled_root: "a".repeat(64) } };
  const r = verifyMembers({ surface: extra });
  assert.equal(r.ok, false);
  assert.match(r.differences.join(" "), /a member nobody declared/);
});

test("the committed surface and signature verify, members first", () => {
  if (!existsSync(join(ROOT, SIG_PATH))) return;
  const surface = JSON.parse(read(SURFACE_PATH));
  const sig = JSON.parse(read(SIG_PATH));
  const profile = JSON.parse(
    read("tools/simurgh-attestation/stage5r/signer/stage5r-signer-profile.json")
  );
  assert.equal(sig.signer.profile_id, "stage5r-vpf-genesis", "one stage, one key");
  assert.equal(sig.surface_digest, surfaceDigest(surface));
  assert.equal(SIGNING_PREFIX, "simurgh.vpf.release-surface.v1");
  const r = verifySurface({ surface, sig, profile, verifySignature: () => true });
  assert.equal(r.ok, true, r.reason);
});

// ---- the closeout checker ---------------------------------------------------------------------

test("THE CLOSEOUT SAYS WHAT THE EVIDENCE SAYS", () => {
  const r = checkDocument({ text: read(CLOSEOUT), delta, findings });
  assert.equal(r.ok, true, r.problems.join("; "));
  assert.ok(r.checks >= 40, `only ${r.checks} assertions — the checker is not checking much`);
});

test("the checker CATCHES a closeout that drops a term, a figure or a finding", () => {
  const text = read(CLOSEOUT);
  const drops = [
    ["the universe size", /55/g],
    ["the inherited denominator", /23[  ]?332/g],
    ["a finding id", /5R-F004/g],
    ["the unprobed census", /premise_not_applicable/g],
    ["the open sockets", /I7 and I8 remain OPEN/g],
    ["the unbuilt adapter", /unbuilt/g],
  ];
  for (const [label, pattern] of drops) {
    const damaged = text.replace(pattern, "REMOVED");
    const r = checkDocument({ text: damaged, delta, findings });
    assert.equal(r.ok, false, `dropping ${label} was not caught`);
  }
});

test("the checker CATCHES a coverage figure altered in the prose", () => {
  // The failure mode that matters: the ledger says 6.2% and the document says something friendlier.
  const damaged = read(CLOSEOUT).replace(/6\.2%/g, "12.4%");
  const r = checkDocument({ text: damaged, delta, findings });
  assert.equal(r.ok, false);
  assert.match(r.problems.join(" "), /coverage|cumulative/i);
});

test("the checker accepts spaced thousands, because the spec writes them that way", () => {
  const spaced = read(CLOSEOUT);
  assert.ok(spaced.includes("23 332") || spaced.includes("23332"));
  assert.equal(checkDocument({ text: spaced, delta, findings }).ok, true);
});
