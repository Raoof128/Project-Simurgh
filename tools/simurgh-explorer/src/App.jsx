// SPDX-License-Identifier: AGPL-3.0-or-later
import React, { useEffect, useRef, useState } from "react";
import { LIMIT, VIEWS, lanesSummary, parseBundle, searchDocuments, safeUrl } from "../core.mjs";
import { Lanes, OpenWork, Record, Replicate } from "./Phase19.jsx";
import { Outcomes } from "./Outcomes.jsx";
import { Empty } from "./ui.jsx";
import { fetchPack, runCheck } from "./PackCheck.jsx";
import mark from "./simurgh-mark.png";
import { readChosen } from "../packcheck.mjs";

const NAMES = {
  record: "Record",
  lanes: "Lanes",
  replicate: "Replicate",
  outcomes: "Outcomes",
  library: "Library",
  open: "Open work",
};
const PAGES = VIEWS.map((id) => [id, NAMES[id]]);
const COLLECTIONS = [
  ["all", "All sources"],
  ["phase19", "Phase 19 pages"],
  ["project", "Earlier project documents"],
  ["primary", "Primary sources"],
];
const collectionOf = (d) => (d.kind === "phase19" ? "phase19" : d.url ? "primary" : "project");

// The command line calls the open work `open-work`; an address that says so opens it too.
const ALIASES = { "open-work": "open" };
function fromHash() {
  const [named, id] = (globalThis.location?.hash || "").replace(/^#/, "").split("/");
  const page = ALIASES[named] ?? named;
  return PAGES.some(([p]) => p === page) ? { page, id: id || null } : { page: "record", id: null };
}

function Library({ bundle, imported, docId, setDocId }) {
  const [q, setQ] = useState(""),
    [collection, setCollection] = useState("all");
  const docs = searchDocuments(bundle, q, "").filter(
      (d) => collection === "all" || collectionOf(d) === collection
    ),
    doc = bundle.documents.find((d) => d.id === docId);
  return (
    <>
      <div className="toolbar">
        <label className="search">
          <span>Search</span>
          <input
            type="search"
            aria-label="Search the library"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setDocId(null);
            }}
            placeholder="Search lane pages, the ledger and cited sources"
          />
        </label>
        <label className="select">
          Collection
          <select
            aria-label="Filter collection"
            value={collection}
            onChange={(e) => setCollection(e.target.value)}
          >
            {COLLECTIONS.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="count-line">
        <span role="status">{docs.length} documents</span>
        <span className="muted">
          Search runs over the text indexed at build time. A date is when the page was ruled on or
          reviewed, not when a source was published.
        </span>
      </p>
      <div className="split library">
        <section className="results" aria-label="Documents">
          {docs.map((d) => (
            <button
              key={d.id}
              className={`result ${doc?.id === d.id ? "selected" : ""}`}
              aria-pressed={doc?.id === d.id}
              onClick={() => setDocId(d.id)}
            >
              <span className="kicker">
                {imported
                  ? "Imported document"
                  : { phase19: "Phase 19", primary: "Primary source", project: "Project document" }[
                      collectionOf(d)
                    ]}
                , {d.reviewed}
              </span>
              <strong>{d.title}</strong>
              <span className="snippet">{d.snippet}</span>
            </button>
          ))}
          {!docs.length && (
            <Empty title="No document matches">
              <p>Try fewer words. An imported file may carry no documents.</p>
            </Empty>
          )}
        </section>
        <aside className="inspector reader" aria-label="Selected document">
          {doc ? (
            <>
              <p className="kicker">
                <code>{doc.path}</code>
              </p>
              <h2>{doc.title}</h2>
              {safeUrl(doc.url) && (
                <a href={safeUrl(doc.url)} target="_blank" rel="noopener noreferrer">
                  Open the primary source in a new tab
                </a>
              )}
              <p className="muted">
                Dated {doc.reviewed}.{" "}
                {doc.published ? `Published ${doc.published}.` : "Publication date not asserted."}
              </p>
              <pre className="document-text" tabIndex="0">
                {doc.text}
              </pre>
            </>
          ) : (
            <Empty title="Select a document">
              <p>Its indexed text, date and path appear here.</p>
            </Empty>
          )}
        </aside>
      </div>
    </>
  );
}

export function App({ initial }) {
  const start = fromHash();
  const [bundle, setBundle] = useState(initial),
    [page, setPage] = useState(start.page),
    [laneId, setLaneId] = useState(start.page === "lanes" ? start.id : null),
    [docId, setDocId] = useState(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [imported, setImported] = useState(null),
    [checks, setChecks] = useState({}),
    [linked, setLinked] = useState(start.page === "lanes" && start.id ? 1 : 0);
  const file = useRef(null),
    s = lanesSummary(bundle);
  // Moving to another view is a step the Back button undoes. Choosing a lane inside the
  // lanes view rewrites the address in place, so Back does not walk through every lane.
  useEffect(() => {
    const next = `#${page}${page === "lanes" && laneId ? `/${laneId}` : ""}`,
      now = globalThis.location?.hash || "";
    if (!globalThis.history?.pushState || now === next) return;
    const sameView = now.replace(/^#/, "").split("/")[0] === page;
    globalThis.history[now && !sameView ? "pushState" : "replaceState"](null, "", next);
  }, [page, laneId]);
  // An address that names a lane, loaded or pasted, lands on that lane's panel. On a narrow
  // screen the panel sits below the whole list; where it is already in view nothing moves.
  // The jump is instant, so it asks nothing of a reader who has turned motion down.
  useEffect(() => {
    if (!linked) return;
    const inspector = globalThis.document?.getElementById("lane-inspector");
    if (inspector?.getBoundingClientRect?.().top > (globalThis.innerHeight ?? Infinity))
      inspector.scrollIntoView?.({ block: "start", behavior: "instant" });
  }, [linked]);
  // A pasted link or the back button changes the hash without loading the page again.
  useEffect(() => {
    const onHash = () => {
      const next = fromHash();
      setPage(next.page);
      if (next.page === "lanes") setLaneId(next.id);
      if (next.page === "lanes" && next.id) setLinked((n) => n + 1);
    };
    const target = globalThis.window ?? globalThis;
    for (const event of ["hashchange", "popstate"]) target.addEventListener?.(event, onHash);
    return () => {
      for (const event of ["hashchange", "popstate"]) target.removeEventListener?.(event, onHash);
    };
  }, []);
  function go(next) {
    setPage(next);
    setNotice("");
  }
  function openLane(id, stay = false) {
    setLaneId(id);
    setPage("lanes");
    setNotice("");
    // On a narrow screen the inspector sits below the list: bring it into view. Where it is
    // already on screen, as beside the table on a wide one, the page stays where it is.
    const inspector = stay && globalThis.document?.getElementById("lane-inspector");
    if (inspector?.getBoundingClientRect?.().top > (globalThis.innerHeight ?? Infinity))
      inspector.scrollIntoView?.({ block: "start" });
  }
  // A pack is checked in this browser, from this build's copy or from a file the reader
  // chooses. The page fetches a pack only for the repository's own lanes.
  const checking = {
    checks,
    canFetch: bundle === initial,
    async one(lane, bytes, source, keep = true) {
      setChecks((c) => ({ ...c, [lane.id]: { state: "running" } }));
      let check;
      try {
        check = await runCheck(lane, bytes ?? (await fetchPack(lane)), source, keep);
      } catch (e) {
        check = { state: "failed", source, message: e.message };
      }
      setChecks((c) => ({ ...c, [lane.id]: check }));
      return check;
    },
    check: (lane) => checking.one(lane, null, "the copy in this checkout's build"),
    file: async (lane, chosen) => {
      const source = `the file ${chosen.name}`;
      let bytes;
      try {
        bytes = await readChosen(chosen);
      } catch (e) {
        const check = { state: "failed", source, message: e.message };
        setChecks((c) => ({ ...c, [lane.id]: check }));
        return check;
      }
      return checking.one(lane, bytes, source);
    },
    async all() {
      // A sweep keeps the verdicts and lets the bytes go; one lane's check keeps its bytes.
      for (const lane of bundle.lanes)
        await checking.one(lane, null, "the copy in this checkout's build", false);
    },
  };
  function readPage(id) {
    setDocId(id);
    setPage("library");
    setNotice("");
  }
  async function load(event) {
    const input = event.target.files?.[0];
    if (!input) return;
    try {
      if (input.size > LIMIT) throw new Error("File exceeds 12 MiB. Use a scoped explorer export.");
      const next = parseBundle(await input.text());
      setBundle(next);
      setChecks({});
      setImported(input.name);
      setLaneId(null);
      setDocId(null);
      setError("");
      setNotice(
        `Loaded ${next.records.length} records and ${next.lanes.length} lanes from ${input.name}. Source verification has not been run.`
      );
    } catch (e) {
      setError(`Could not load evidence: ${e.message}`);
    }
    event.target.value = "";
  }
  function reset() {
    setBundle(initial);
    setChecks({});
    setImported(null);
    setLaneId(null);
    setDocId(null);
    setError("");
    setNotice("Repository evidence restored.");
  }
  const sourceLink = (id) => {
    const d = bundle.documents.find((x) => x.id === id);
    return d && safeUrl(d.url) ? (
      <a key={id} href={safeUrl(d.url)} target="_blank" rel="noopener noreferrer">
        {id}
      </a>
    ) : (
      <span key={id}>{id}</span>
    );
  };
  const heading = {
    record: [
      "The Phase 19 record",
      `${s.packs} evidence packs, what each predicted before it ran, and what happened.`,
    ],
    lanes: ["Lanes", "One lane is one question, one pack and one verify command."],
    replicate: [
      "Replicate",
      "The command that verifies each pack, and which ones an outside operator has run.",
    ],
    outcomes: [
      "Outcomes",
      `${bundle.title}: every recorded outcome, with its control, its effects and its source.`,
    ],
    library: ["Library", "Lane pages, the ledger, earlier project documents and cited sources."],
    open: ["Open work", "What is not done, not repaired or not yet checked by anyone else."],
  }[page];
  return (
    <div className="workspace">
      <a className="skip" href="#content">
        Skip to content
      </a>
      <header className="rail">
        <div className="brand">
          <img src={mark} alt="" width="52" height="52" />
          <p className="wordmark">
            <span>Project</span>
            <strong>Simurgh</strong>
          </p>
          <p className="product">Evidence explorer</p>
        </div>
        <nav aria-label="Views">
          {PAGES.map(([id, name]) => (
            <button key={id} aria-current={page === id ? "page" : undefined} onClick={() => go(id)}>
              {name}
              {id === "lanes" && s.packs > 0 && <span className="nav-count">{s.packs}</span>}
              {id === "replicate" && s.owed_items > 0 && (
                <span className="nav-count">{s.owed_items} owed</span>
              )}
              {id === "open" && s.open_work > 0 && <span className="nav-count">{s.open_work}</span>}
            </button>
          ))}
        </nav>
        <p className="rail-foot">
          Local and read only. It can recompute a pack's root here. Replaying a lane stays with the
          lane's own command.
        </p>
      </header>
      <div className="shell">
        <div className="topbar">
          <span className="data-source" data-testid="data-source">
            {imported
              ? "Imported evidence"
              : bundle.mode === "local_detail"
                ? "Repository evidence, with local detail"
                : "Repository evidence"}
          </span>
          <div className="actions">
            <button onClick={() => file.current.click()}>Load evidence</button>
            <input
              aria-label="Load evidence JSON"
              ref={file}
              type="file"
              accept=".json,application/json"
              onChange={load}
              hidden
            />
            <button onClick={reset} disabled={bundle === initial}>
              Restore repository data
            </button>
          </div>
        </div>
        <main id="content">
          <div className="title">
            <h1>{heading[0]}</h1>
            <p>{heading[1]}</p>
          </div>
          {error && (
            <div className="message error" role="alert">
              {error}
              <button className="quiet" onClick={() => setError("")} aria-label="Dismiss error">
                Dismiss
              </button>
            </div>
          )}
          {notice && (
            <div className="message" role="status">
              {notice}
            </div>
          )}
          {imported && (
            <div className="message imported" role="note" data-testid="imported-banner">
              Imported from {imported}: {String(bundle.verification).replaceAll("_", " ")}. The
              titles, outcomes, provenance and document labels below come from the file, not from
              this repository.
            </div>
          )}
          {page === "record" && <Record bundle={bundle} openLane={openLane} go={go} />}
          {page === "lanes" && (
            <Lanes
              bundle={bundle}
              selected={laneId}
              openLane={openLane}
              readPage={readPage}
              notify={setNotice}
              checking={checking}
            />
          )}
          {page === "replicate" && (
            <Replicate bundle={bundle} openLane={openLane} notify={setNotice} checking={checking} />
          )}
          {page === "outcomes" && (
            <Outcomes
              key={imported || "repository"}
              bundle={bundle}
              isRepository={bundle === initial}
              notify={setNotice}
            />
          )}
          {page === "library" && (
            <Library bundle={bundle} imported={imported} docId={docId} setDocId={setDocId} />
          )}
          {page === "open" && (
            <OpenWork bundle={bundle} openLane={openLane} sourceLink={sourceLink} />
          )}
          <div className="diamond-rule" aria-hidden="true">
            <span />
          </div>
          <footer>
            Hash references identify the bytes this page read. They do not show who produced them.
          </footer>
        </main>
      </div>
    </div>
  );
}
