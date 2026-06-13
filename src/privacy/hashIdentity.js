// SPDX-License-Identifier: AGPL-3.0-or-later
import crypto from "node:crypto";

export function hashStudentId(raw) {
  return crypto.createHash("sha256").update(String(raw)).digest("hex");
}
