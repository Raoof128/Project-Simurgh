// SPDX-License-Identifier: AGPL-3.0-or-later
import crypto from "node:crypto";

// The join route returns this digest for a caller-chosen identifier, so it is an HMAC oracle
// under whatever key is used. Falling back to SIMURGH_AUDIT_SECRET would make that oracle
// sign audit-chain entries, so the key is derived with domain separation: the base secret is
// never used directly as the HMAC key.
const KEY_DOMAIN = "simurgh/student-id/v2";

export function hashStudentId(raw) {
  const base =
    process.env.SIMURGH_STUDENT_ID_PEPPER ||
    process.env.SIMURGH_AUDIT_SECRET ||
    "simurgh-development-student-id-pepper";
  const key = crypto.createHmac("sha256", base).update(KEY_DOMAIN).digest();
  const digest = crypto.createHmac("sha256", key).update(String(raw)).digest("hex");
  return `v2:${digest}`;
}
