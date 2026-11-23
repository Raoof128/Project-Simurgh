// SPDX-License-Identifier: AGPL-3.0-or-later
// Shared, browser-safe interpretation. No I/O, inference, HTML or code execution.
export const SCHEMA = "simurgh.explorer.v1";
// The views of the dashboard. The command line has a command for each, and a test says so.
export const VIEWS = ["record", "lanes", "replicate", "outcomes", "library", "open"];
export const LIMIT = 12 * 1024 * 1024;
const statuses = ["observed", "blocked", "denied", "declined", "unknown", "error", "invalid"];
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
    // An origin excludes URL user-info. Require the serialized URL to begin at
    // that origin so credential-bearing links never become clickable.
    return ["https:", "http:"].includes(u.protocol) && u.href.startsWith(`${u.origin}/`)
      ? u.href
      : null;
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
  ensure(["call", "declined", "error", "invalid"].includes(r.proposal), "Invalid proposal");
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
    r.proposal === "invalid" && "invalid",
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
    study: "phase10",
    model: "llama",
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
    study: "phase10",
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
// Phase 19 lanes are optional: a file written before they existed still loads, with none.
const OUTCOMES = ["held", "failed", "undecided", "by_model"];
const STATES = ["owed", "checked"];
const strings = (v, name, max = 500) => {
  ensure(Array.isArray(v) && v.length <= max, `Invalid ${name}`);
  for (const x of v) string(x, name);
};
const count = (v, name) => ensure(Number.isSafeInteger(v) && v >= 0, `Invalid ${name}`);
function validateLanes(b) {
  b.lanes ??= [];
  b.handoff ??= null;
  b.open_work ??= [];
  b.other ??= [];
  ensure(Array.isArray(b.other) && b.other.length <= 500, "Invalid Phase 19 folders");
  for (const o of b.other)
    for (const k of ["id", "title", "summary", "page"]) string(o?.[k], `Phase 19 folder ${k}`);
  ensure(Array.isArray(b.lanes) && b.lanes.length <= 500, "Invalid lane inventory");
  const ids = new Set();
  for (const l of b.lanes) {
    ensure(l && typeof l === "object", "Invalid lane");
    ensure(typeof l.id === "string" && /^19[a-z]{1,2}$/.test(l.id), "Invalid lane ID");
    ensure(!ids.has(l.id), "Invalid lane inventory: duplicate lane ID");
    ids.add(l.id);
    for (const k of ["title", "summary", "verify", "host", "time"]) string(l[k], `lane ${k}`);
    // The page offers this command for copying, so only the repository's own form is accepted.
    ensure(
      ["evidence", `evidence${l.id}`].some(
        (module) =>
          l.verify ===
          `python -B tools/assurance-provenance/${module}.py verify docs/research/provenance-phase-${l.id}/evidence.zip --expected-root "$(cat docs/research/provenance-phase-${l.id}/ROOT.sha256)"`
      ),
      "Invalid lane verify command"
    );
    ensure(typeof l.root === "string" && /^[0-9a-f]{64}$/.test(l.root), "Invalid lane root");
    ensure(l.date === null || /^\d{4}(-\d{2}-\d{2})?$/.test(l.date), "Invalid lane date");
    ensure(l.unit === null || /^P19-[A-Z]+\d+$/.test(l.unit), "Invalid lane declaration");
    for (const k of ["arm", "receipt_kind"])
      ensure(l[k] === null || typeof l[k] === "string", `Invalid lane ${k}`);
    for (const k of ["model_inference", "independent_custody"])
      ensure(typeof l[k] === "boolean", `Invalid lane ${k}`);
    // The page names the file a prediction is recorded in, so that file must be named.
    for (const k of ["receipt", "report", "protocol"])
      ensure(
        typeof l.sources?.[k]?.path === "string" && /^[0-9a-f]{64}$/.test(l.sources[k].sha256),
        "Invalid lane sources"
      );
    ensure(
      l.spend_usd === null || (Number.isFinite(l.spend_usd) && l.spend_usd >= 0),
      "Invalid lane spend"
    );
    strings(l.models, "lane models");
    ensure(new Set(l.models).size === l.models.length, "Invalid lane models: duplicate");
    strings(l.limits, "lane limits");
    ensure(Array.isArray(l.hypotheses) && l.hypotheses.length <= 200, "Invalid lane hypotheses");
    for (const h of l.hypotheses) {
      string(h?.id, "hypothesis ID");
      ensure(OUTCOMES.includes(h.outcome), "Invalid hypothesis outcome");
      ensure(["receipt", "results_page"].includes(h.source), "Invalid hypothesis source");
      h.pointer ??= null;
      ensure(h.pointer === null || typeof h.pointer === "string", "Invalid hypothesis pointer");
      if (h.outcome === "by_model") {
        count(h.held_on, "hypothesis model count");
        if (h.of !== null) {
          count(h.of, "hypothesis model count");
          ensure(h.held_on <= h.of, "Invalid hypothesis model count");
        }
      }
      ensure(Array.isArray(h.columns) && h.columns.length <= 20, "Invalid hypothesis wording");
      for (const c of h.columns) {
        string(c?.label, "hypothesis wording");
        string(c.text, "hypothesis wording");
      }
    }
    ensure(l.outside && STATES.includes(l.outside.verify), "Invalid lane outside state");
    ensure(Array.isArray(l.outside.deeper) && l.outside.deeper.length <= 20, "Invalid lane items");
    for (const d of l.outside.deeper) {
      string(d?.item, "lane item");
      ensure(STATES.includes(d.state), "Invalid lane outside state");
    }
    ensure(l.pages && typeof l.pages === "object", "Invalid lane pages");
    for (const k of ["readme", "results"]) string(l.pages[k], `lane ${k} page`);
    l.served ??= null;
    if (l.served !== null) {
      ensure(typeof l.served === "object", "Invalid lane served-model record");
      count(l.served.named, "lane served-model record");
      count(l.served.returned, "lane served-model record");
    }
    l.pack ??= null;
    ensure(l.pack === null || typeof l.pack === "string", "Invalid lane pack path");
  }
  if (b.handoff !== null) {
    ensure(typeof b.handoff === "object", "Invalid handoff");
    for (const k of ["status", "note", "guide"]) string(b.handoff[k], `handoff ${k}`);
    count(b.handoff.receipts, "handoff receipts");
    count(b.handoff.items, "handoff items");
    strings(b.handoff.owed, "handoff owed items");
  }
  ensure(Array.isArray(b.open_work) && b.open_work.length <= 500, "Invalid open work");
  for (const w of b.open_work) {
    for (const k of ["id", "title", "text"]) string(w?.[k], `open work ${k}`);
    strings(w.lanes, "open work lanes");
  }
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
      /^(p10|p17:(llama|luna)):g[1-9][0-9]*:(credential_only|composed|deny_all)$/.test(r.id),
      "Invalid record ID"
    );
    ensure(!ids.has(r.id), "duplicate record ID");
    ids.add(r.id);
    if (r.id.startsWith("p10:")) {
      r.study ??= "phase10";
      r.model ??= "llama";
    }
    ensure(
      ["phase10", "phase17"].includes(r.study) && ["llama", "luna"].includes(r.model),
      "Invalid study/model"
    );
    string(r.title, "record title");
    validateOutcome(r.outcome);
    ensure(
      r.id ===
        `${r.study === "phase17" ? `p17:${r.model}` : "p10"}:g${r.outcome.generation_index}:${r.outcome.control}`,
      "Record identity mismatch"
    );
    ensure(r.source && typeof r.source === "object", "Missing source");
    string(r.source.path, "source path");
    string(r.source.pointer, "source pointer");
    ensure(
      r.detail === null || (typeof r.detail === "object" && !Array.isArray(r.detail)),
      "Invalid detail"
    );
    if (r.detail !== null) {
      string(r.detail.model_output, "model output");
      ensure(r.detail.source && typeof r.detail.source === "object", "Missing detail source");
      string(r.detail.source.path, "detail source path");
      string(r.detail.source.pointer, "detail source pointer");
    }
    return { ...r, flags: flagsFor(r.outcome) };
  });
  const studies = new Set(b.records.map((r) => r.study));
  ensure(studies.size === 1, "Mixed study inventory");
  b.study ??= b.records[0].study;
  ensure(studies.has(b.study), "Bundle study mismatch");
  if (b.study === "phase17" && b.selection)
    ensure(b.selection.total === 288, "Invalid transfer selection denominator");
  if (b.selection)
    ensure(
      Number.isSafeInteger(b.selection.total) &&
        b.selection.total >= b.records.length &&
        b.selection.retained === b.records.length,
      "Invalid selection"
    );
  if (b.study === "phase17" && !b.selection) {
    const expected = new Set(
      ["llama", "luna"].flatMap((m) =>
        Array.from({ length: 48 }, (_, i) =>
          ["credential_only", "composed", "deny_all"].map((c) => `p17:${m}:g${i + 1}:${c}`)
        ).flat()
      )
    );
    ensure(
      ids.size === expected.size && [...ids].every((id) => expected.has(id)),
      "Incomplete transfer inventory"
    );
  }
  for (const key of ["documents", "gaps", "omissions"])
    ensure(Array.isArray(b[key]) && b[key].length <= 10000, `Invalid ${key}`);
  ensure(
    new Set(b.documents.map((d) => d?.id)).size === b.documents.length,
    "Invalid documents: duplicate ID"
  );
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
  validateLanes(b);
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
export const QUERY_LIMIT = 1024;
const terms = (query) => {
  ensure(typeof query === "string" && query.length <= QUERY_LIMIT, "Query too long");
  return query.toLowerCase().trim().split(/\s+/).filter(Boolean);
};
const matches = (text, query) => {
  const wanted = terms(query);
  if (!wanted.length) return true;
  const haystack = text.toLowerCase();
  return wanted.every((t) => haystack.includes(t));
};
export function queryRecords(b, { q = "", kind = "all", control = "all", model = "all" } = {}) {
  ensure(
    [
      "all",
      "failure",
      "unauthorized",
      "active_incomplete",
      "unknown",
      "error",
      "blocked",
      "invalid",
    ].includes(kind),
    "Unknown filter"
  );
  ensure(control === "all" || controls.includes(control), "Unknown control");
  ensure(["all", "llama", "luna"].includes(model), "Unknown model");
  return b.records.filter(
    (r) =>
      (model === "all" || r.model === model) &&
      (control === "all" || r.outcome.control === control) &&
      (kind === "all" ||
        (kind === "failure"
          ? r.flags.some((f) =>
              ["unauthorized", "active_incomplete", "error", "invalid"].includes(f)
            )
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
export function tally(lane) {
  const t = { held: 0, failed: 0, undecided: 0, by_model: 0 };
  for (const h of lane.hypotheses) t[h.outcome] += 1;
  return t;
}
export function queryLanes(b, { q = "", ran = "all", outcome = "all", outside = "all" } = {}) {
  ensure(["all", "model", "no_model"].includes(ran), "Unknown lane filter");
  ensure(["all", "failed", "all_held", "none"].includes(outcome), "Unknown outcome filter");
  ensure(["all", "owed", "checked"].includes(outside), "Unknown outside filter");
  return b.lanes.filter((l) => {
    const t = tally(l),
      owed = l.outside.verify === "owed" || l.outside.deeper.some((d) => d.state === "owed");
    return (
      (ran === "all" || (ran === "model") === l.model_inference) &&
      (outcome === "all" ||
        (outcome === "failed" && t.failed > 0) ||
        (outcome === "all_held" && t.held > 0 && t.held === l.hypotheses.length) ||
        (outcome === "none" && l.hypotheses.length === 0)) &&
      (outside === "all" || (outside === "owed") === owed) &&
      matches(JSON.stringify(l), q)
    );
  });
}
// How the predictions fared, split by whether a model was what the lane measured (the
// receipt's `model_inference`; an agent used as an attacker is not counted). A prediction decided on
// each model counts once for every model it was decided on, where the receipt says how many.
export function trackRecord(b) {
  const row = () => ({ lanes: 0, held: 0, failed: 0, undecided: 0, model_held: 0, model_of: 0 });
  const out = { model: row(), no_model: row() };
  for (const l of b.lanes) {
    if (!l.hypotheses.length) continue;
    const r = out[l.model_inference ? "model" : "no_model"];
    r.lanes += 1;
    for (const h of l.hypotheses)
      if (h.outcome !== "by_model") r[h.outcome] += 1;
      else if (h.of !== null) {
        r.model_held += h.held_on;
        r.model_of += h.of;
      }
  }
  return out;
}
// Counts only. A tally of predictions is a record of what was said and what happened, not a score.
export function lanesSummary(b) {
  const t = { held: 0, failed: 0, undecided: 0, by_model: 0 };
  for (const l of b.lanes) for (const [k, n] of Object.entries(tally(l))) t[k] += n;
  return {
    packs: b.lanes.length,
    with_model: b.lanes.filter((l) => l.model_inference).length,
    with_hypotheses: b.lanes.filter((l) => l.hypotheses.length).length,
    lanes_with_failed: b.lanes.filter((l) => tally(l).failed > 0).length,
    ...t,
    spend_usd: Math.round(b.lanes.reduce((n, l) => n + (l.spend_usd ?? 0), 0) * 100) / 100,
    independent_custody: b.lanes.filter((l) => l.independent_custody).length,
    outside_items: b.handoff?.items ?? 0,
    owed_items: b.handoff?.owed.length ?? 0,
    receipts: b.handoff?.receipts ?? 0,
    open_work: b.open_work.length,
  };
}
export function summary(b) {
  return {
    phase19: lanesSummary(b),
    records: b.records.length,
    controls: [...new Set(b.records.map((r) => r.outcome.control))].length,
    generations: new Set(
      b.records.map((r) => `${r.study}:${r.model}:${r.outcome.generation_index}`)
    ).size,
    unauthorized: queryRecords(b, { kind: "unauthorized" }).length,
    active_incomplete: queryRecords(b, { kind: "active_incomplete" }).length,
    unknown: queryRecords(b, { kind: "unknown" }).length,
    documents: b.documents.length,
    open_gaps: b.gaps.filter((g) => g.status === "open").length,
    verification: b.verification,
  };
}
