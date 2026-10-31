// SPDX-License-Identifier: AGPL-3.0-or-later
import { verifyChain } from "./hmacChain.js";

export function verifyAuditExport(auditExport, hmacKey) {
  const chain = {
    prevHash: "GENESIS",
    entries: auditExport.entries ?? [],
    truncated: auditExport.truncated ?? false,
  };
  const { valid: chainValid, errors } = verifyChain(chain, hmacKey);
  // A truncated chain has stopped recording; it cannot be reported as a valid record of the
  // session (pass-3 M3, audit D-5). A declared entry_count that disagrees is a mismatch too.
  if (chain.truncated) errors.push("chain truncated: entries after the cap were not recorded");
  if (
    auditExport.entry_count !== undefined &&
    Number(auditExport.entry_count) !== chain.entries.length
  ) {
    errors.push(
      `entry_count ${auditExport.entry_count} != ${chain.entries.length} entries supplied`
    );
  }
  const valid = chainValid && errors.length === 0;
  return {
    valid,
    errors,
    entry_count: chain.entries.length,
    truncated: chain.truncated,
    verified_at: new Date().toISOString(),
  };
}
