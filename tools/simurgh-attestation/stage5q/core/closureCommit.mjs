// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — the closure commitment. THE L2 BOUNDARY (spec §2.3, Annex A2).
//
// Nothing committed here can be amended afterwards. After this runs, the universe is frozen and
// attacks may begin — which is the whole point of Universe Before Attack: a universe that can still
// grow after results are known is not a universe, it is a scoreboard.
//
// ANNEX A2 SPLITS WHAT IS COMMITTED. The frozen §2.3 entry record contains `attack_pack_ids` and
// `coverage_status`, neither of which exists until Tasks 9-19. Task 8 commits ONLY the immutable
// projection; the discharge overlay arrives in Task 19 and is joined for the §2.3 view.
//
//   COMMITTED HERE (immutable at L2)        COMMITTED BY TASK 19 (overlay)
//     function_id                             function_id  (FK into the commitment)
//     stage_id                                attack_pack_ids
//     module_path                             coverage_status
//     export_name_or_internal_symbol
//     source_digest
//     category
//     reachable_from
//     security_role
//     historical_tags
//
// ------------------------------------------------------------------------------------------------
// THE PLAN'S PINNED MERKLE FINDING WAS WRONG, AND MEASURING IT AGAIN IS WHY THIS FILE SORTS.
//
// The plan recorded, as a measured fact: "`merkleRoot` is SELF-SORTING. Two leaf arrays in different
// orders produce byte-identical roots. So Task 8's 'reordering members does not change the digest'
// property is provided by 5K natively — do NOT add a second sort on top."
//
// Re-measured here against stage5k/core/merkle.mjs:
//
//     merkleRoot([a,b,c]) = 2f0c19ab9348261579dde99bf694bdaddad7e48a5ecb2ea4109ea926027d59a5
//     merkleRoot([c,b,a]) = a10e3027429813aee751934487328904b7574aaa185a6771e349701085dbe190
//
// It is order-SENSITIVE, and it has to be: `nodeHash` concatenates left||right, which is not
// commutative. Following the plan's instruction literally would have produced a commitment whose
// root depended on `readdirSync` order — a byte-stability claim that holds on one machine and fails
// on the next, discovered long after the universe froze.
//
// The plan's own method note warns about this exact class of error (comparing Uint8Arrays with
// `!==` measures identity, not value). The correction it recorded was still the wrong answer. So:
// the sort is EXPLICIT here, and `sortedLeavesAreLoadBearing` exists so a test can prove the sort
// is doing work rather than decorating a property that already held.
// ------------------------------------------------------------------------------------------------

import { createHash } from "node:crypto";
import { leafHash, merkleRoot } from "../../stage5k/core/merkle.mjs";
import { ATTACK_CLASSES, SECURITY_ROLES } from "./constants.mjs";

export const DOMAIN = Object.freeze({
  member: "simurgh.vsr.closure-member.v1",
  commitment: "simurgh.vsr.closure-commitment.v1",
  tagClosure: "simurgh.vsr.release-tag-closure.v1",
  taxonomy: "simurgh.vsr.attack-taxonomy.v1",
});

const domainDigest = (domain, bytes) =>
  createHash("sha256")
    .update(Buffer.from(domain, "utf8"))
    .update(Buffer.from([0x00]))
    .update(bytes)
    .digest("hex");

/** The nine immutable fields, in a fixed order so the canonical bytes are unambiguous. */
export const COMMITMENT_FIELDS = Object.freeze([
  "function_id",
  "stage_id",
  "module_path",
  "export_name_or_internal_symbol",
  "source_digest",
  "category",
  "reachable_from",
  "security_role",
  "historical_tags",
]);

/** The overlay's three, and no more. */
export const OVERLAY_FIELDS = Object.freeze(["function_id", "attack_pack_ids", "coverage_status"]);

function canonicalRow(row) {
  const out = {};
  for (const field of COMMITMENT_FIELDS) out[field] = row[field];
  return JSON.stringify(out);
}

/**
 * Exposed so a test can prove the explicit sort is load-bearing rather than decorative.
 * Returns true iff `merkleRoot` gives different roots for the same leaves in different orders.
 */
export function sortedLeavesAreLoadBearing(leaves) {
  if (leaves.length < 2) return false;
  const forward = merkleRoot(leaves).toString("hex");
  const backward = merkleRoot([...leaves].reverse()).toString("hex");
  return forward !== backward;
}

/**
 * Commit the closure.
 *
 * `closure_source_commit` is passed IN, never read from HEAD (gauntlet P1-16). Reading HEAD makes
 * the value change the moment the artifact is committed, and naming the commit that CONTAINS the
 * artifact is self-referential. A rerun must supply the recorded value; that is what makes the
 * rebuild deterministic rather than merely repeatable-today.
 */
export function commitClosure({
  members,
  roles,
  edges = [],
  tagClosure,
  taxonomy = ATTACK_CLASSES,
  obligationMatrixRoot,
  historicalFunctionClosureDigest,
  historicalTagsByFunction = new Map(),
  closureSourceCommit,
}) {
  if (!/^[0-9a-f]{40}$/.test(closureSourceCommit ?? "")) {
    throw new Error(
      "closure_source_commit must be supplied as a 40-hex commit sha. It is never read from HEAD: " +
        "that value changes the moment the artifact is committed, and naming the commit that " +
        "contains the artifact is self-referential (gauntlet P1-16)."
    );
  }

  // DUPLICATES FAIL BEFORE MERKLE CONSTRUCTION (gauntlet P1-18). Canonical sorting downstream would
  // otherwise place two records adjacently and a de-dupe would collapse them into one, shrinking the
  // universe invisibly — the exact shape of R7.
  const seen = new Set();
  const duplicates = [];
  for (const m of members) {
    if (seen.has(m.function_id)) duplicates.push(m.function_id);
    seen.add(m.function_id);
  }
  if (duplicates.length > 0) {
    throw new Error(
      `duplicate function_id in the closure: ${duplicates.slice(0, 3).join(", ")} — refusing to ` +
        `commit before Merkle construction, because a collapsed duplicate shrinks the universe ` +
        `without changing anything a reader could see`
    );
  }
  if (members.length === 0) {
    throw new Error(
      "refusing to commit an empty closure: a stage that can commit an empty universe can report " +
        "100% coverage of nothing"
    );
  }

  const roleOf = roles instanceof Map ? (id) => roles.get(id) : (id) => roles[id];

  // Direct call sites, from the resolved edge graph. `reachable_from` names the members that call
  // this one DIRECTLY; the transitive closure is derivable from the committed edges and is not
  // duplicated here. Unresolved edges are excluded by construction and are the reason a member can
  // fail the Task 7 completeness check on its caller list.
  const callers = new Map();
  for (const e of edges) {
    if (e.to_unresolved || !e.to_function_id) continue;
    if (!callers.has(e.to_function_id)) callers.set(e.to_function_id, new Set());
    callers.get(e.to_function_id).add(e.from_function_id);
  }

  const rows = members.map((m) => {
    const role = roleOf(m.function_id);
    if (!SECURITY_ROLES.includes(role)) {
      throw new Error(
        `member ${m.function_id} has no frozen security_role; L2 admits no unassigned member`
      );
    }
    return {
      function_id: m.function_id,
      stage_id: m.stage_id,
      module_path: m.module_path,
      export_name_or_internal_symbol: m.export_name_or_internal_symbol,
      source_digest: m.source_digest,
      category: m.category,
      reachable_from: [...(callers.get(m.function_id) ?? [])].sort(),
      security_role: role,
      historical_tags: [...(historicalTagsByFunction.get(m.function_id) ?? [])].sort(),
    };
  });

  // Canonical order: by function_id. The digest then describes the SET, not the listing, and the
  // leaves below inherit that order rather than the filesystem's.
  rows.sort((a, b) => a.function_id.localeCompare(b.function_id));

  const leaves = rows.map((row) =>
    leafHash({
      leaf_id: row.function_id,
      leaf_type: "closure_member",
      subject_digest: `sha256:${domainDigest(DOMAIN.member, Buffer.from(canonicalRow(row), "utf8"))}`,
    })
  );

  const tags = [...tagClosure].sort((a, b) => a.tag_name.localeCompare(b.tag_name));
  const taxonomyRows = [...taxonomy];

  return {
    rows,
    closure_member_commitment_digest: domainDigest(
      DOMAIN.commitment,
      Buffer.from(JSON.stringify(rows.map(canonicalRow)), "utf8")
    ),
    release_tag_closure_digest: domainDigest(
      DOMAIN.tagClosure,
      Buffer.from(JSON.stringify(tags), "utf8")
    ),
    attack_taxonomy_digest: domainDigest(
      DOMAIN.taxonomy,
      Buffer.from(JSON.stringify(taxonomyRows), "utf8")
    ),
    historical_function_closure_digest: historicalFunctionClosureDigest ?? null,
    obligation_matrix_root: obligationMatrixRoot ?? null,
    merkle_root: merkleRoot(leaves).toString("hex"),
    member_count: rows.length,
    closure_source_commit: closureSourceCommit,
    tag_count: tags.length,
    taxonomy_count: taxonomyRows.length,
  };
}

/**
 * Validate the sixteen (tag, sha) pairs, spec §3.1.
 *
 * Rejecting only ADDITIONS catches the least likely attack (gauntlet P1-19). A closure that silently
 * lost a tag, or whose tag was repointed, is far more plausible than one that grew a seventeenth.
 */
export function validateTagClosure({ tags, expectedNames, expectedShas = null }) {
  const problems = [];
  const names = tags.map((t) => t.tag_name);

  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  for (const n of new Set(dupes)) problems.push({ tag_name: n, kind: "duplicate_tag_name" });

  for (const n of names) {
    if (!expectedNames.includes(n)) problems.push({ tag_name: n, kind: "unexpected_tag" });
  }
  for (const n of expectedNames) {
    if (!names.includes(n)) problems.push({ tag_name: n, kind: "missing_tag" });
  }
  if (expectedShas) {
    for (const t of tags) {
      const want = expectedShas[t.tag_name];
      if (want && want !== t.commit_sha) {
        problems.push({
          tag_name: t.tag_name,
          kind: "tag_sha_changed",
          expected: want,
          observed: t.commit_sha,
        });
      }
    }
  }
  return { ok: problems.length === 0, problems };
}

/**
 * Annex A2: the overlay may describe the committed members and NOTHING else.
 *
 * This is the gerrymandering direction the split creates — an overlay that could add, drop or re-key
 * a member would let Task 19 choose its own denominator after seeing the results.
 */
export function validateOverlay({ commitment, overlay }) {
  const problems = [];
  const committed = new Set(commitment.rows.map((r) => r.function_id));
  const seen = new Set();

  for (const row of overlay) {
    if (!committed.has(row.function_id)) {
      problems.push({
        function_id: row.function_id,
        kind: "overlay_member_not_in_commitment",
        reason:
          "the overlay may only describe members the closure committed at L2; a new member here " +
          "is a universe that grew after the results were known",
      });
      continue;
    }
    if (seen.has(row.function_id)) {
      problems.push({ function_id: row.function_id, kind: "overlay_duplicate_row" });
      continue;
    }
    seen.add(row.function_id);
    for (const key of Object.keys(row)) {
      if (!OVERLAY_FIELDS.includes(key)) {
        problems.push({
          function_id: row.function_id,
          kind: "overlay_field_not_permitted",
          field: key,
        });
      }
    }
  }
  for (const id of committed) {
    if (!seen.has(id)) {
      problems.push({
        function_id: id,
        kind: "overlay_missing_member",
        reason: "cardinality is fixed at L2; every committed member carries a status (L1)",
      });
    }
  }
  return { ok: problems.length === 0, problems };
}

/** The §2.3 view, reproduced field for field by joining the two halves. */
export function joinCommitmentAndOverlay({ commitment, overlay }) {
  const byId = new Map(overlay.map((r) => [r.function_id, r]));
  return commitment.rows.map((row) => ({
    ...row,
    attack_pack_ids: byId.get(row.function_id)?.attack_pack_ids ?? null,
    coverage_status: byId.get(row.function_id)?.coverage_status ?? null,
  }));
}
