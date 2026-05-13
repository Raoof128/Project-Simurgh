import crypto from "node:crypto";

export function hashStudentId(raw) {
  return crypto.createHash("sha256").update(String(raw)).digest("hex");
}
