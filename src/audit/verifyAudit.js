import { verifyChain } from "./hmacChain.js";

export function verifyAuditExport(auditExport, hmacKey) {
  const chain = {
    prevHash: "GENESIS",
    entries: auditExport.entries ?? [],
    truncated: auditExport.truncated ?? false,
  };
  const { valid, errors } = verifyChain(chain, hmacKey);
  return {
    valid,
    errors,
    entry_count: chain.entries.length,
    truncated: chain.truncated,
    verified_at: new Date().toISOString(),
  };
}
