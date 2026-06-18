// SPDX-License-Identifier: AGPL-3.0-or-later
import crypto from "node:crypto";

export function hashStudentId(raw) {
  const pepper =
    process.env.SIMURGH_STUDENT_ID_PEPPER ||
    process.env.SIMURGH_AUDIT_SECRET ||
    "simurgh-development-student-id-pepper";
  const digest = crypto.createHmac("sha256", pepper).update(String(raw)).digest("hex");
  return `v1:${digest}`;
}
