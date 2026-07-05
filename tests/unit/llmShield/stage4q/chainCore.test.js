// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildChain,
  verifyChain,
  positionsOf,
} from "../../../../tools/simurgh-attestation/stage4q/core/chainCore.mjs";

const D = (c) => `sha256:${c.repeat(64)}`;
const EVENTS = [
  { entry_kind: "approval", entry_digest: D("a"), raw_code: 0 },
  { entry_kind: "crossing", entry_digest: D("b"), raw_code: 0 },
  { entry_kind: "refusal", entry_digest: D("c"), raw_code: 83 },
];

test("buildChain assigns linked positions and a recomputable root", () => {
  const { entries, root } = buildChain(EVENTS);
  assert.equal(entries.length, 3);
  assert.equal(entries[0].chain_position, 0);
  assert.equal(entries[2].chain_position, 2);
  assert.match(root, /^sha256:[0-9a-f]{64}$/);
  const census = { committed_crossings: 2, laneb_observed: 2 }; // 1 crossing + 1 schema-valid refusal
  assert.deepEqual(verifyChain(entries, { expectedRoot: root, census }), { raw: 0 });
});

test("deleted refusal breaks the chain (invention 6.2 → 89 refusal_entry_removed)", () => {
  const { entries, root } = buildChain(EVENTS);
  const laundered = entries.filter((e) => e.entry_kind !== "refusal");
  const out = verifyChain(laundered, {
    expectedRoot: root,
    census: { committed_crossings: 2, laneb_observed: 2 },
  });
  assert.equal(out.raw, 89);
});

test("reordering is laundering (89 reordered_entry / non_linking_previous_digest)", () => {
  const { entries, root } = buildChain(EVENTS);
  const swapped = [entries[1], entries[0], entries[2]];
  assert.equal(
    verifyChain(swapped, { expectedRoot: root, census: { committed_crossings: 2 } }).raw,
    89
  );
});

test("census mismatch is laundering (invention 6.1 → 89 census_mismatch)", () => {
  const { entries, root } = buildChain(EVENTS);
  const out = verifyChain(entries, {
    expectedRoot: root,
    census: { committed_crossings: 1, laneb_observed: 2 },
  });
  assert.equal(out.raw, 89);
  assert.equal(out.reason, "census_mismatch");
});

test("raw-80 refusals are ledgered but NOT census-counted (plan freeze 4)", () => {
  const withMalformed = [...EVENTS, { entry_kind: "refusal", entry_digest: D("d"), raw_code: 80 }];
  const { entries, root } = buildChain(withMalformed);
  assert.deepEqual(
    verifyChain(entries, {
      expectedRoot: root,
      census: { committed_crossings: 2, laneb_observed: 2 },
    }),
    { raw: 0 }
  );
});

test("content-duplicate entry at a new position is caught (patch 2 → 89 duplicated_entry)", () => {
  const dup = [
    { entry_kind: "approval", entry_digest: D("a"), raw_code: 0 },
    { entry_kind: "crossing", entry_digest: D("b"), raw_code: 0 },
    { entry_kind: "approval", entry_digest: D("a"), raw_code: 0 }, // same content as entry 0
  ];
  const { entries, root } = buildChain(dup);
  const out = verifyChain(entries, {
    expectedRoot: root,
    census: { committed_crossings: 1, laneb_observed: 1 },
  });
  assert.equal(out.raw, 89);
  assert.equal(out.reason, "duplicated_entry");
});

test("positionsOf recomputes, never reads recorded positions", () => {
  const { entries } = buildChain(EVENTS);
  const tampered = entries.map((e) => ({ ...e, chain_position: 99 }));
  assert.equal(positionsOf(tampered, D("a")), 0);
  assert.equal(positionsOf(tampered, D("b")), 1);
  assert.equal(positionsOf(tampered, D("zz")), -1);
});
