// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — 404/414 role-specific subject mapping (P0-3), 405 start token crypto, 406/415 child anchor
// (5M quorum-EXTENSION + real OTS/Bitcoin; P0-4/P0-11). Pure over injected endpoint facts (adapter fills).
import crypto from "node:crypto";
import { R } from "./result.mjs";
import { startAuthorisationDigest } from "./derive.mjs";

const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");

// Role-specific mapping: TSA imprint = OTS leaf = role_subject_hex; Rekor artifact = sha256(utf8(role_subject_hex)).
function subjectCheck(code, roleSubjectHex, ef) {
  if (!ef || ef.subject_extractable === false)
    return R(
      code,
      code === 404 ? "start_endpoint_subject_mismatch" : "end_endpoint_subject_mismatch",
      { detail: "subject_unextractable" }
    );
  const reason = code === 404 ? "start_endpoint_subject_mismatch" : "end_endpoint_subject_mismatch";
  if (ef.tsa_imprint !== roleSubjectHex) return R(code, reason, { detail: "tsa_imprint_mismatch" });
  if (ef.ots_leaf !== roleSubjectHex) return R(code, reason, { detail: "ots_leaf_mismatch" });
  if (ef.rekor_artifact_hash !== sha(Buffer.from(roleSubjectHex, "utf8")))
    return R(code, reason, { detail: "rekor_artifact_mismatch" });
  return null;
}

export function checkStartSubject(env, facts) {
  return subjectCheck(404, startAuthorisationDigest(env.start_authorisation), facts?.start);
}

export function checkStartToken(facts) {
  if (facts?.start?.token_valid !== true)
    return R(405, "start_token_invalid", { detail: "tsa_invalid" });
  return null;
}

export function checkStartAnchor(facts) {
  const c = facts?.startChild;
  if (!c || c.green !== true)
    return R(406, "start_endpoint_anchor_incomplete", {
      detail: {
        endpoint_role: "start",
        child_component: "stage5m_quorum_extension",
        child_raw_code: c?.raw ?? null,
        ots_unconfirmed: c?.detail === "ots_unconfirmed" || undefined,
      },
    });
  return null;
}

export function checkEndSubject(env, facts) {
  return subjectCheck(414, env.D_out, facts?.end);
}

export function checkEndAnchor(facts) {
  const c = facts?.endChild;
  if (!c || c.green !== true)
    return R(415, "end_endpoint_anchor_incomplete", {
      detail: {
        endpoint_role: "end",
        child_component: "stage5m_quorum_extension",
        child_raw_code: c?.raw ?? null,
        ots_unconfirmed: c?.detail === "ots_unconfirmed" || undefined,
      },
    });
  return null;
}
