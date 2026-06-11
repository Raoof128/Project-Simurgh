export function bankingCollectionClosed() {
  return process.env.SIMURGH_BANKING_PILOT_COLLECTION_CLOSED === "true";
}

export function rejectBankingWritesIfClosed(_req, res, next) {
  if (bankingCollectionClosed()) {
    return res.status(410).json({ ok: false, error: "banking_pilot_collection_closed" });
  }
  next();
}
