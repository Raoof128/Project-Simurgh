// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5F VMP — shared digest helpers (plan Tasks 5/6). Domain-separated canonical OBJECT digests,
// never raw string concatenation.
import { createHash } from "node:crypto";
import { canonicalJson } from "../../canonicalise.mjs";

export const PLAN_DOMAIN_SEP = "simurgh.vmp.panel_plan.v1\n";

export function sha256Canon(value) {
  return "sha256:" + createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

export function sha256Bytes(str) {
  return "sha256:" + createHash("sha256").update(Buffer.from(str, "utf8")).digest("hex");
}

// panel_plan_digest = sha256(DOMAIN_SEP || canonicalJson({schema, ...five subdigests})).
export function panelPlanDigest(obj) {
  return sha256Bytes(PLAN_DOMAIN_SEP + canonicalJson(obj));
}
