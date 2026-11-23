// SPDX-License-Identifier: AGPL-3.0-or-later
// Phase 19 packs, read from the committed files of each lane. Nothing here is typed by hand:
// outcomes come from each pack's receipt, wording from its own pages, the lane table and the
// outside-replication status from the handoff tool. No archive is opened and nothing is verified.
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RESEARCH = "docs/research";
const FOLDER = "provenance-phase-19";
const LEDGER = "docs/research/PROVENANCE_PHASE_19.md";
const SERVED = "docs/research/PROVENANCE_PHASE_19_SERVED_MODELS.md";
const MONTHS = Object.fromEntries(
  "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec"
    .split(" ")
    .map((name, i) => [name, String(i + 1).padStart(2, "0")])
);
const requireThat = (ok, message) => {
  if (!ok) throw new Error(`Lane ${message}`);
};

// Markdown to the plain text a table cell or a summary shows: links keep their words.
export const plain = (text) =>
  text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

const paragraphs = (markdown) =>
  markdown
    .replace(/```[\s\S]*?```/g, "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

const isProse = (p) =>
  !/^(#|\||[-*] |\d+\. |Verify|Reproduce|Expected|On a Mac|\*\*Declared as)/.test(p);

export function summaryOf(markdown) {
  const question = markdown.match(/^## The question\s*\n+([\s\S]*?)(?=\n\s*\n)/m);
  const first = question ? question[1] : paragraphs(markdown).find(isProse);
  requireThat(first, "page has no opening paragraph");
  // The pointer to the lane's other pages is navigation, not a description of the lane.
  // A paragraph that introduces a list ends on a colon; the summary stands without the list.
  return plain(first)
    .replace(/\s*See RESULTS\.md(?:[^.]|\.md)*?\.(?=\s|$)/, "")
    .trim()
    .replace(/[:;,]$/, ".");
}

export function titleOf(heading, summary) {
  const colon = heading.indexOf(":");
  const text = colon >= 0 ? heading.slice(colon + 1).trim() : summary.split(/(?<=\.)\s/)[0];
  const clean = text.replace(/\.$/, "");
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

// Every table of a results page, as a header and its rows of plain cells.
export function tables(markdown) {
  const out = [];
  let current = null;
  for (const line of markdown.split("\n")) {
    if (!line.trim().startsWith("|")) {
      current = null;
      continue;
    }
    const cells = line
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .map(plain);
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
    if (!current) out.push((current = { header: cells, rows: [] }));
    else current.rows.push(cells);
  }
  return out;
}

const bare = (cell) => cell.replace(/`/g, "");

// The wording a results page gives a hypothesis: the cells between its id and its verdict.
function wording(resultTables, id) {
  for (const t of resultTables) {
    const row = t.rows.find((r) => bare(r[0]) === id);
    if (!row || row.length < 3) continue;
    return row
      .slice(1, -1)
      .map((text, i) => ({ label: t.header[i + 1] || "", text }))
      .filter((c) => c.text);
  }
  return [];
}

const decided = (value) => (value === true ? "held" : value === false ? "failed" : "undecided");

export function hypothesesOf(receipt, report, protocol, resultsMarkdown) {
  const found = tables(resultsMarkdown);
  const out = [];
  const text = (id, fallback = []) => {
    const cells = wording(found, id);
    return cells.length ? cells : fallback;
  };
  // A hypothesis decided per model is worded once: in a row of its own, in the heading of its
  // column, or in the protocol. The per-model verdicts stay on the lane's results page.
  const declared = (id) => {
    const cells = wording(found, id).filter((c) => /^(Statement|Declared|Rule)$/.test(c.label));
    if (cells.length) return cells;
    for (const t of found) {
      const head = t.header.find((h) => h.startsWith(`${id}: `));
      if (head) return [{ label: "Declared", text: head.slice(id.length + 2) }];
    }
    return typeof protocol.hypotheses?.[id] === "string"
      ? [{ label: "Declared", text: protocol.hypotheses[id] }]
      : [];
  };
  for (const key of ["hypotheses", "hypothesis"])
    for (const [id, value] of Object.entries(receipt[key] ?? {}))
      if (typeof value === "boolean")
        out.push({
          id,
          outcome: decided(value),
          source: "receipt",
          pointer: `/${key}/${id}`,
          columns: text(id),
        });
  for (const [id, value] of Object.entries(receipt.predictions ?? {})) {
    const p = report.predictions?.[id] ?? {};
    out.push({
      id,
      outcome: decided(value),
      source: "receipt",
      pointer: `/predictions/${id}`,
      columns: text(
        id,
        [
          p.statement && { label: "Declared", text: p.statement },
          p.rule && { label: "Rule", text: p.rule },
        ].filter(Boolean)
      ),
    });
  }
  // A hypothesis decided once for each model that qualified is reported as a count of models.
  const rep = receipt.replication;
  if (rep?.held_on)
    for (const [id, held] of Object.entries(rep.held_on)) {
      // A receipt may keep one list of the models that qualified, or one list per block of the
      // study. The count is given a denominator only where every list has the same length;
      // otherwise the receipt does not say which list a hypothesis was decided on.
      const pools = Object.entries(rep)
        .filter(([key, value]) => key.startsWith("eligible") && Array.isArray(value))
        .map(([, value]) => value.length);
      requireThat(pools.length && Number.isSafeInteger(held), "replication shape");
      out.push({
        id,
        outcome: "by_model",
        held_on: held,
        of: pools.every((n) => n === pools[0]) ? pools[0] : null,
        source: "receipt",
        pointer: `/replication/held_on/${id}`,
        columns: declared(id),
      });
    }
  if (receipt.held_on && !rep) {
    const pool = receipt.eligible ?? receipt.usable;
    requireThat(Array.isArray(pool), "eligibility shape");
    for (const [id, models] of Object.entries(receipt.held_on))
      out.push({
        id,
        outcome: "by_model",
        held_on: models.length,
        of: pool.length,
        source: "receipt",
        pointer: `/held_on/${id}`,
        columns: declared(id),
      });
  }
  // Two lanes record what was said beforehand only as a table on their results page.
  if (!out.length)
    for (const t of found) {
      if (!/^Said (in the declaration|before the run)/.test(t.header[0])) continue;
      t.rows.forEach((row, i) => {
        const verdict = row.at(-1);
        const outcome = /^(yes|Held)\b/.test(verdict)
          ? "held"
          : /^(no|Did not hold)\b/.test(verdict)
            ? "failed"
            : "undecided";
        out.push({
          id: `S${i + 1}`,
          outcome,
          source: "results_page",
          pointer: null,
          columns: row
            .map((cell, k) => ({ label: t.header[k] || "", text: cell }))
            .filter((c) => !/^Holds?$|^Held$/.test(c.label)),
        });
      });
    }
  return out;
}

function spendOf(receipt) {
  const values = [];
  const take = (v) => {
    if (typeof v === "number") values.push(v);
    else if (v && typeof v === "object")
      if (typeof v.metered_usd === "number") values.push(v.metered_usd);
      else Object.values(v).forEach((x) => typeof x === "number" && values.push(x));
  };
  for (const key of ["metered_usd", "metered_usd_stage_one", "money_spent", "spend"])
    if (key in receipt) take(receipt[key]);
  return values.length ? Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100 : null;
}

const idsOf = (models) =>
  (Array.isArray(models)
    ? models.map((m) => (typeof m === "string" ? m : m?.id))
    : Object.keys(models ?? {})
  ).filter((x) => typeof x === "string");

// A receipt that keeps one entry per run names a model as "<run>/<model>". Such a key is
// reduced to the model the protocol declares, and each model is listed once.
function modelsOf(receipt, protocol) {
  const declared = idsOf(protocol.models);
  const named = idsOf(receipt.models ?? protocol.models).map(
    (key) => declared.find((id) => key.endsWith(`/${id}`)) ?? key
  );
  return [...new Set(named)];
}

function isoDate(text) {
  const m = text.match(/^(\d{1,2}) (\w{3})\w* (\d{4})$/);
  return m && MONTHS[m[2]] ? `${m[3]}-${MONTHS[m[2]]}-${m[1].padStart(2, "0")}` : null;
}

export function rulingDates(ledger) {
  const dates = new Map();
  // A ruling's parenthesis opens with its date and names the declarations it exercises.
  for (const m of ledger.matchAll(/Ruling \((\d{1,2} \w+ \d{4}),([^)]*)\)/g))
    for (const unit of m[2].match(/P19-[A-Z]+\d+/g) ?? [])
      if (!dates.has(unit)) dates.set(unit, isoDate(m[1]));
  return dates;
}

// The lanes a text names. A range, one lane "to" another, names every lane from the first to the
// last in the order the handoff lists them; where that order does not hold both ends, the
// two ends are all that is known.
function lanesNamed(text, known) {
  const named = [];
  for (const [, from, to] of text.matchAll(/\b(19[a-z]{1,2})\b(?:\s+to\s+(19[a-z]{1,2})\b)?/g)) {
    const [i, j] = [known.indexOf(from), known.indexOf(to)];
    named.push(...(to && i >= 0 && j > i ? known.slice(i, j + 1) : [from, to].filter(Boolean)));
  }
  return [...new Set(named)];
}

export function openWork(readme, known = []) {
  const section = readme.match(/^### Open work\s*\n([\s\S]*?)(?=^#{1,3} )/m);
  requireThat(section, "open work section missing from the README");
  return section[1]
    .split(/\n(?=- \*\*)/)
    .map((item) => item.match(/^- \*\*([^*]+?):?\*\*:?\s*([\s\S]+)$/))
    .filter(Boolean)
    .map((m, i) => ({
      id: `W${String(i + 1).padStart(2, "0")}`,
      title: m[1].trim(),
      text: plain(m[2]),
      lanes: lanesNamed(plain(m[2]), known),
    }));
}

export function readHandoff(root) {
  return JSON.parse(
    execFileSync(
      "python3",
      ["-E", "-s", "-B", fileURLToPath(new URL("./read-handoff.py", import.meta.url)), root],
      { encoding: "utf8", maxBuffer: 4 * 1024 * 1024, timeout: 60000 }
    )
  );
}

// The census of which packs hold a model id the provider returned is a page the repository
// generates and tests for staleness. Its table is read here; no pack is opened for it.
export function servedCensus(page) {
  const table = tables(page).find((t) => t.header[0] === "Pack" && t.header.length >= 3);
  // A cell lists its entries with commas or semicolons between them, or says there are none.
  const count = (cell) => (/^none\b/.test(cell) ? 0 : cell.split(/[,;] /).length);
  return new Map(
    (table?.rows ?? []).map((row) => [row[0], { named: count(row[1]), returned: count(row[2]) }])
  );
}

export function loadLanes(root, readBound, handoff = readHandoff(root)) {
  const ledger = readBound(root, LEDGER);
  const served = servedCensus(readBound(root, SERVED).text);
  const dates = rulingDates(ledger.text);
  const owed = new Set(handoff.status.not_yet_replayed_outside);
  const documents = [];
  const lanes = handoff.phases.map((p) => {
    requireThat(/^19[a-z]{1,2}$/.test(p.id), "identity");
    const file = (name) => readBound(root, `${p.docs}/${name}`);
    const readme = file("README.md"),
      results = file("RESULTS.md"),
      receiptFile = file("receipt.json"),
      reportFile = file("report.json"),
      protocolFile = file("protocol.json");
    const receipt = JSON.parse(receiptFile.text),
      report = JSON.parse(reportFile.text),
      protocol = JSON.parse(protocolFile.text);
    const root256 = file("ROOT.sha256").text.trim();
    // Byte consistency between two committed files, as the transfer loader checks its archive.
    // The pack itself is not opened; its verifier is the command this lane carries.
    requireThat(/^[0-9a-f]{64}$/.test(root256), `${p.id} root is not a SHA-256`);
    requireThat(receipt.manifest_sha256 === root256, `${p.id} root differs from its receipt`);
    const heading = readme.text.match(/^#\s+(.+)/m)?.[1] ?? p.id;
    const summary = summaryOf(readme.text);
    const unit = readme.text.match(/P19-[A-Z]+\d+/)?.[0] ?? null;
    const date = (unit && dates.get(unit)) || null;
    const base = `python -B tools/assurance-provenance/${p.module} verify ${p.docs}/evidence.zip --expected-root "$(cat ${p.docs}/ROOT.sha256)"`;
    for (const [name, doc] of [
      ["README.md", readme],
      ["RESULTS.md", results],
    ])
      documents.push({
        id: `${p.docs}/${name}`,
        path: `${p.docs}/${name}`,
        title: `${p.id} · ${doc.text.match(/^#\s+(.+)/m)?.[1] ?? name}`,
        text: doc.text,
        reviewed: date ?? "2026",
        sha256: doc.sha256,
        url: null,
        kind: "phase19",
      });
    return {
      id: p.id,
      unit,
      date,
      title: titleOf(heading, summary),
      summary,
      root: root256,
      arm: typeof receipt.arm === "string" ? receipt.arm : null,
      receipt_kind: typeof receipt.kind === "string" ? receipt.kind : null,
      model_inference: receipt.model_inference === true,
      independent_custody: receipt.independent_custody === true,
      models: modelsOf(receipt, protocol),
      spend_usd: spendOf(receipt),
      hypotheses: hypothesesOf(receipt, report, protocol, results.text),
      limits: (report.non_claims ?? protocol.non_claims ?? []).filter((x) => typeof x === "string"),
      verify: base,
      host: p.host,
      time: p.time,
      outside: {
        verify: owed.has(p.id) ? "owed" : "checked",
        deeper: p.deeper.map((item) => ({ item, state: owed.has(item) ? "owed" : "checked" })),
      },
      pages: { readme: `${p.docs}/README.md`, results: `${p.docs}/RESULTS.md` },
      pack: `${p.docs}/evidence.zip`,
      served: served.get(p.id) ?? null,
      sources: {
        receipt: { path: `${p.docs}/receipt.json`, sha256: receiptFile.sha256 },
        report: { path: `${p.docs}/report.json`, sha256: reportFile.sha256 },
        protocol: { path: `${p.docs}/protocol.json`, sha256: protocolFile.sha256 },
      },
    };
  });
  for (const [path, title] of [
    [LEDGER, "Phase 19 ledger: declarations, notes and rulings"],
    [SERVED, null],
  ]) {
    const doc = readBound(root, path);
    documents.push({
      id: path,
      path,
      title: title ?? doc.text.match(/^#\s+(.+)/m)?.[1] ?? path,
      text: doc.text,
      reviewed: "2026",
      sha256: doc.sha256,
      url: null,
      kind: "phase19",
    });
  }
  // A Phase 19 folder the handoff does not list holds no pack: the handoff itself, hosted
  // replays, the manuscript. Each is found by listing the folder, so none can be left out.
  const listed = new Set(handoff.phases.map((p) => p.docs));
  const other = readdirSync(resolve(root, RESEARCH), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(FOLDER))
    .map((entry) => `${RESEARCH}/${entry.name}`)
    .filter((path) => !listed.has(path))
    .sort()
    .map((path) => {
      const id = path.slice(`${RESEARCH}/`.length).replace(/^provenance-phase-/, "");
      let doc;
      try {
        doc = readBound(root, `${path}/README.md`);
      } catch (error) {
        // A lane being built has a folder before it has a page. It is listed, not fatal.
        if (error.code !== "ENOENT") throw error;
        return {
          id,
          title: `Folder ${id}`,
          summary: "This folder has no README yet.",
          page: `${path}/README.md`,
        };
      }
      const heading = doc.text.match(/^#\s+(.+)/m)?.[1] ?? path;
      documents.push({
        id: `${path}/README.md`,
        path: `${path}/README.md`,
        title: heading,
        text: doc.text,
        reviewed: "2026",
        sha256: doc.sha256,
        url: null,
        kind: "phase19",
      });
      return {
        id,
        title: plain(heading),
        summary: summaryOf(doc.text),
        page: `${path}/README.md`,
      };
    });
  return {
    lanes,
    other,
    handoff: {
      status: handoff.status.status,
      receipts: handoff.status.operator_receipts.length,
      owed: handoff.status.not_yet_replayed_outside,
      items: handoff.phases.reduce((n, p) => n + 1 + p.deeper.length, 0),
      note: handoff.status.note,
      guide: handoff.guide,
      source: "tools/assurance-provenance/handoff19.py status",
    },
    open_work: openWork(
      readBound(root, "README.md").text,
      lanes.map((l) => l.id)
    ),
    documents,
  };
}
