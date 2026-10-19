// SPDX-License-Identifier: AGPL-3.0-or-later
// Shared, browser-safe interpretation. No I/O, inference, HTML or code execution.
export const SCHEMA = "simurgh.explorer.v1";
export const LIMIT = 12 * 1024 * 1024;
const statuses = ["observed", "blocked", "denied", "declined", "unknown", "error"];
const controls = ["credential_only", "composed", "deny_all"];
const states = [
  "active",
  "ancestor_revoke",
  "credential_revoke",
  "monitor_expired",
  "pending_alert",
  "signal_stop",
  "unknown_prior",
];
const ensure = (ok, message) => {
  if (!ok) throw new Error(message);
};
const string = (v, name) => {
  ensure(typeof v === "string" && v.length <= 1000000, `Invalid ${name}`);
  return v;
};
export function safeUrl(value) {
  try {
    const u = new URL(value);
    return ["https:", "http:"].includes(u.protocol) && !u.username && !u.password ? u.href : null;
  } catch {
    return null;
  }
}
function validateOutcome(r) {
  ensure(r && typeof r === "object", "Invalid outcome");
  ensure(
    controls.includes(r.control) && states.includes(r.state) && statuses.includes(r.status),
    "Unsupported outcome enum"
  );
  ensure(
    r.initial_status === null || statuses.includes(r.initial_status),
    "Invalid initial status"
  );
  ensure(["call", "declined", "error"].includes(r.proposal), "Invalid proposal");
  for (const k of [
    "task_index",
    "generation_index",
    "trial",
    "new_effects",
    "prior_effects",
    "total_effects",
    "authorized_new_effects",
    "unauthorized_new_effects",
  ])
    ensure(Number.isSafeInteger(r[k]) && r[k] >= (k.endsWith("_index") ? 1 : 0), `Invalid ${k}`);
  ensure(
    r.new_effects === r.authorized_new_effects + r.unauthorized_new_effects &&
      r.total_effects === r.prior_effects + r.new_effects,
    "Inconsistent effect counts"
  );
  for (const k of ["acknowledged_completion", "valid_active_proposal"])
    ensure(typeof r[k] === "boolean", `Invalid ${k}`);
  ensure(
    r.leaf_status && Object.keys(r.leaf_status).sort().join(",") === "a,b",
    "Invalid leaf statuses"
  );
  for (const s of Object.values(r.leaf_status))
    ensure(s === null || statuses.includes(s), "Invalid leaf status");
  return r;
}
export function flagsFor(r) {
  validateOutcome(r);
  return [
    r.unauthorized_new_effects > 0 && "unauthorized",
    r.state === "active" && !r.acknowledged_completion && "active_incomplete",
    [r.status, r.initial_status, ...Object.values(r.leaf_status)].includes("unknown") && "unknown",
    [r.status, r.initial_status, ...Object.values(r.leaf_status)].includes("error") && "error",
    r.status === "blocked" && "blocked",
  ].filter(Boolean);
}
export function adaptPublic(pub) {
  ensure(pub?.schema === "simurgh-phase14-outcomes-v1", "Unsupported public schema");
  ensure(Array.isArray(pub.rows) && pub.rows.length === 144, "Phase 14 requires exactly 144 rows");
  ensure(
    Array.isArray(pub.omissions) && pub.capabilities && pub.source,
    "Missing public scope and provenance"
  );
  const records = pub.rows.map((outcome, i) => ({
    id: `p10:g${outcome.generation_index}:${outcome.control}`,
    title: `Task ${String(outcome.task_index).padStart(2, "0")}`,
    outcome,
    source: {
      path: "docs/research/export-phase-14/public.json",
      pointer: `/rows/${i}`,
      sha256: null,
    },
    detail: null,
  }));
  return validateBundle({
    schema: SCHEMA,
    title: "Model composition · Phase 10",
    mode: "public",
    created: null,
    verification: "not_verified_by_explorer",
    provenance: pub.source,
    omissions: pub.omissions,
    capabilities: pub.capabilities,
    records,
    documents: [],
    gaps: [],
  });
}
export function validateBundle(b) {
  ensure(b?.schema === SCHEMA, "Unsupported explorer schema");
  ensure(
    Array.isArray(b.records) && b.records.length > 0 && b.records.length <= 10000,
    "Invalid record inventory"
  );
  const ids = new Set();
  b.records = b.records.map((r) => {
    string(r.id, "record ID");
    ensure(
      /^p10:g[1-9][0-9]*:(credential_only|composed|deny_all)$/.test(r.id),
      "Invalid record ID"
    );
    ensure(!ids.has(r.id), "duplicate record ID");
    ids.add(r.id);
    string(r.title, "record title");
    validateOutcome(r.outcome);
    ensure(
      r.id === `p10:g${r.outcome.generation_index}:${r.outcome.control}`,
      "Record identity mismatch"
    );
    ensure(r.source && typeof r.source === "object", "Missing source");
    string(r.source.path, "source path");
    string(r.source.pointer, "source pointer");
    ensure(
      r.detail === null || (typeof r.detail === "object" && !Array.isArray(r.detail)),
      "Invalid detail"
    );
    if (r.detail !== null) string(r.detail.model_output, "model output");
    return { ...r, flags: flagsFor(r.outcome) };
  });
  for (const key of ["documents", "gaps", "omissions"])
    ensure(Array.isArray(b[key]) && b[key].length <= 10000, `Invalid ${key}`);
  for (const d of b.documents) {
    for (const k of ["id", "title", "text", "path", "reviewed"]) string(d[k], `document ${k}`);
    d.url = safeUrl(d.url);
  }
  for (const g of b.gaps) {
    for (const k of ["id", "title", "status", "evidence", "remaining", "next"])
      string(g[k], `gap ${k}`);
    ensure(
      Array.isArray(g.sources) && g.sources.every((x) => typeof x === "string"),
      "Invalid gap sources"
    );
  }
  for (const o of b.omissions) string(o, "omission");
  string(b.title, "bundle title");
  ensure(["public", "local_detail"].includes(b.mode), "Invalid bundle mode");
  // An imported producer's claim is never promoted to a verifier result.
  return { ...b, verification: "not_verified_by_explorer" };
}
export function parseBundle(text) {
  ensure(
    typeof text === "string" && new TextEncoder().encode(text).length <= LIMIT,
    "Input exceeds 12 MiB limit"
  );
  const b = JSON.parse(text);
  return b.schema === "simurgh-phase14-outcomes-v1" ? adaptPublic(b) : validateBundle(b);
}
const matches = (text, query) =>
  query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .every((t) => text.toLowerCase().includes(t));
export function queryRecords(b, { q = "", kind = "all", control = "all" } = {}) {
  ensure(
    ["all", "failure", "unauthorized", "active_incomplete", "unknown", "error", "blocked"].includes(
      kind
    ),
    "Unknown filter"
  );
  ensure(control === "all" || controls.includes(control), "Unknown control");
  return b.records.filter(
    (r) =>
      (control === "all" || r.outcome.control === control) &&
      (kind === "all" ||
        (kind === "failure"
          ? r.flags.some((f) => ["unauthorized", "active_incomplete", "error"].includes(f))
          : r.flags.includes(kind))) &&
      matches(JSON.stringify(r), q)
  );
}
export function searchDocuments(b, q = "", year = "") {
  return b.documents
    .filter(
      (d) =>
        (!year || d.reviewed.startsWith(year)) &&
        matches(`${d.title} ${d.text} ${d.path} ${d.url || ""}`, q)
    )
    .map((d) => {
      const term = q.trim().split(/\s+/)[0]?.toLowerCase();
      const i = term ? d.text.toLowerCase().indexOf(term) : 0;
      return { ...d, snippet: d.text.slice(Math.max(0, i - 80), Math.max(0, i - 80) + 350) };
    });
}
export function summary(b) {
  return {
    records: b.records.length,
    controls: [...new Set(b.records.map((r) => r.outcome.control))].length,
    generations: new Set(b.records.map((r) => r.outcome.generation_index)).size,
    unauthorized: queryRecords(b, { kind: "unauthorized" }).length,
    active_incomplete: queryRecords(b, { kind: "active_incomplete" }).length,
    unknown: queryRecords(b, { kind: "unknown" }).length,
    documents: b.documents.length,
    open_gaps: b.gaps.filter((g) => g.status === "open").length,
    verification: b.verification,
  };
}
