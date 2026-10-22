import React, { useRef, useState } from "react";
import { LIMIT, parseBundle, queryRecords, searchDocuments, summary, safeUrl } from "../core.mjs";
const labels = {
  invalid: "Malformed proposal",
  unauthorized: "Unauthorized effect",
  active_incomplete: "Active task incomplete",
  unknown: "Unknown acknowledgment",
  error: "Execution error",
  blocked: "Blocked",
};
const explanations = {
  invalid:
    "The captured proposal did not meet the tool-call contract. It remains in the denominator.",
  unauthorized:
    "The source reports a new effect outside the approved scope. This is an observed boundary failure in this fixture.",
  active_incomplete:
    "The active task has no acknowledged completion. This can reflect the control or workflow, including the deny-all baseline; it is not automatically a model error.",
  unknown:
    "An initial, leaf or final acknowledgment is unknown. Do not treat it as proof that no effect occurred.",
  error:
    "The source records an execution error. Inspect the original record before attributing the cause.",
  blocked:
    "The control blocked the action. A block can be the intended outcome for a stopped task.",
};
const nav = [
  ["overview", "◈", "Overview"],
  ["failures", "↳", "Failure explorer"],
  ["research", "⌕", "Research library"],
  ["gaps", "◌", "Open gaps"],
];
function Badge({ children, tone = "" }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function Source({ source }) {
  return (
    <div className="source">
      <span className="eyebrow">SOURCE RECORD</span>
      <code>
        {source.path}
        {source.pointer}
      </code>
      {source.sha256 && <small>SHA-256 · {source.sha256}</small>}
    </div>
  );
}
function saveJson(value) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2) + "\n"], { type: "application/json" })
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "simurgh-evidence-selection.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function App({ initial }) {
  const [bundle, setBundle] = useState(initial),
    [page, setPage] = useState("failures"),
    [q, setQ] = useState(""),
    [kind, setKind] = useState("all"),
    [control, setControl] = useState("all"),
    [model, setModel] = useState("all"),
    [selected, setSelected] = useState(null),
    [docId, setDocId] = useState(null),
    [year, setYear] = useState("2026"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [raw, setRaw] = useState(false);
  const file = useRef(null),
    stats = summary(bundle),
    rows = queryRecords(bundle, { q: page === "failures" ? q : "", kind, control, model });
  const chosen = rows.find((r) => r.id === selected) || rows[0];
  const docs = searchDocuments(bundle, page === "research" ? q : "", year),
    doc = docs.find((d) => d.id === docId);
  function go(next) {
    setPage(next);
    setQ("");
    setRaw(false);
    setNotice("");
  }
  async function load(event) {
    const input = event.target.files?.[0];
    if (!input) return;
    try {
      if (input.size > LIMIT) throw new Error("File exceeds 12 MiB. Use a scoped explorer export.");
      const next = parseBundle(await input.text());
      setBundle(next);
      setSelected(null);
      setKind("all");
      setControl("all");
      setModel("all");
      setQ("");
      setError("");
      setNotice(
        `Loaded ${next.records.length} records from ${input.name}. Source verification has not been run.`
      );
    } catch (e) {
      setError(`Could not load evidence: ${e.message}`);
    }
    event.target.value = "";
  }
  function reset() {
    setBundle(initial);
    setSelected(null);
    setKind("all");
    setControl("all");
    setModel("all");
    setQ("");
    setError("");
    setNotice("Repository evidence restored.");
  }
  async function copyCommand() {
    const fileOption =
      bundle !== initial
        ? " --file '/path/to/loaded-bundle.json'"
        : ` --study ${bundle.study || "phase10"}`;
    const command = `node tools/simurgh-explorer/cli.mjs inspect --id '${chosen.id}'${fileOption}`;
    try {
      await navigator.clipboard.writeText(command);
      setNotice(
        bundle !== initial
          ? "CLI command copied. Replace the file placeholder with the loaded bundle path."
          : "CLI command copied."
      );
    } catch {
      setNotice(`Run: ${command}`);
    }
  }
  const heading = {
    overview: [
      "RESEARCH WORKSPACE",
      "A clear view of the evidence.",
      "One record, shared by humans and agents.",
    ],
    failures: [
      `FAILURE EXPLORER / ${bundle.title}`,
      "Understand where it broke.",
      "Trace an outcome back to its control, effect and source.",
    ],
    research: [
      "RESEARCH LIBRARY / REVIEWED IN 2026",
      "Follow the evidence.",
      "Search scoped project documents and cited primary sources.",
    ],
    gaps: [
      "RESEARCH AGENDA",
      "Know what remains open.",
      "Separate implemented mechanisms from the evidence still needed.",
    ],
  }[page];
  return (
    <div className="workspace">
      <a className="skip" href="#content">
        Skip to content
      </a>
      <aside className="sidebar">
        <div className="brand">
          <span className="feather" aria-hidden="true">
            ❧
          </span>
          <strong>SIMURGH</strong>
          <span>Evidence workspace</span>
        </div>
        <nav aria-label="Workspace">
          {nav.map(([id, icon, name]) => (
            <button key={id} aria-current={page === id ? "page" : undefined} onClick={() => go(id)}>
              <span aria-hidden="true">{icon}</span>
              {name}
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <span className="local-dot" /> LOCAL · READ ONLY
          <small>
            Preserved failures.
            <br />
            Traceable sources.
          </small>
        </div>
      </aside>
      <div className="shell">
        <header className="topbar">
          <div>
            <span>Workspace</span>
            <b>/</b>
            <span>{bundle.mode === "local_detail" ? "Local detail" : "Public evidence"}</span>
          </div>
          <div className="actions">
            <button onClick={() => file.current.click()}>
              ↥ <span>Load evidence</span>
            </button>
            <input
              aria-label="Load evidence JSON"
              ref={file}
              type="file"
              accept=".json,application/json"
              onChange={load}
              hidden
            />
            <button
              className="primary"
              disabled={!rows.length}
              onClick={() =>
                saveJson({
                  ...bundle,
                  records: rows,
                  selection: { total: bundle.records.length, retained: rows.length },
                })
              }
            >
              ↓ <span>Export {rows.length} records</span>
            </button>
          </div>
        </header>
        <main id="content">
          <div className="title">
            <p className="eyebrow">{heading[0]}</p>
            <h1>{heading[1]}</h1>
            <p className="subtitle">{heading[2]}</p>
          </div>
          {error && (
            <div className="message error" role="alert">
              {error}
              <button onClick={() => setError("")} aria-label="Dismiss error">
                ×
              </button>
            </div>
          )}
          {notice && (
            <div className="message" role="status">
              {notice}
            </div>
          )}
          <div className="metrics" aria-label="Evidence inventory">
            <div>
              <strong>{stats.records}</strong>
              <span>RETAINED OUTCOMES</span>
            </div>
            <div>
              <strong>{stats.controls}</strong>
              <span>EVALUATION CONTROLS</span>
            </div>
            <div>
              <strong>{stats.generations}</strong>
              <span>MODEL GENERATIONS</span>
            </div>
            <div>
              <strong>{stats.open_gaps}</strong>
              <span>OPEN RESEARCH GAPS</span>
            </div>
          </div>
          <div className="scope">
            <span aria-hidden="true">ⓘ</span>
            <span>
              Research evidence · Viewing and hash references do not verify the source archive.
            </span>
            <button onClick={reset}>Restore repository data</button>
          </div>
          {page === "failures" && (
            <>
              <div className="toolbar">
                <label className="search">
                  <span aria-hidden="true">⌕</span>
                  <input
                    aria-label="Search outcomes"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search task, control or outcome…"
                  />
                </label>
                <label className="select">
                  Model
                  <select
                    aria-label="Filter model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                  >
                    <option value="all">All models</option>
                    {[...new Set(bundle.records.map((r) => r.model))].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="select">
                  Control
                  <select
                    aria-label="Filter control"
                    value={control}
                    onChange={(e) => setControl(e.target.value)}
                  >
                    <option value="all">All controls</option>
                    <option value="composed">Composed</option>
                    <option value="credential_only">Credential only</option>
                    <option value="deny_all">Deny all</option>
                  </select>
                </label>
              </div>
              <div className="filters" role="group" aria-label="Outcome filters">
                {[
                  ["all", "All"],
                  ["failure", "Failures"],
                  ["unauthorized", "Unauthorized"],
                  ["active_incomplete", "Incomplete"],
                  ["blocked", "Blocked"],
                  ["unknown", "Unknown"],
                  ["invalid", "Malformed"],
                ].map(([id, name]) => (
                  <button key={id} aria-pressed={kind === id} onClick={() => setKind(id)}>
                    {name}
                  </button>
                ))}
                <span>{rows.length} matching records</span>
              </div>
              <div className="explorer">
                <section className="table-panel" aria-label="Outcome records">
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Task / generation</th>
                          <th>Control</th>
                          <th>Recorded status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr key={r.id} className={chosen?.id === r.id ? "selected" : ""}>
                            <td>
                              <button
                                className="row-button"
                                aria-pressed={chosen?.id === r.id}
                                onClick={() => {
                                  setSelected(r.id);
                                  setRaw(false);
                                }}
                              >
                                {r.title}
                                <small>
                                  {r.model} · g{r.outcome.generation_index} · trial{" "}
                                  {r.outcome.trial}
                                </small>
                              </button>
                            </td>
                            <td>{r.outcome.control.replaceAll("_", " ")}</td>
                            <td>
                              <Badge
                                tone={
                                  r.flags.includes("unauthorized") ? "danger" : r.outcome.status
                                }
                              >
                                {r.outcome.status}
                              </Badge>
                              {r.flags.includes("unauthorized") && (
                                <small className="danger-text">Unauthorized effect</small>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!rows.length && (
                      <div className="empty">
                        <h2>No matching records</h2>
                        <p>Try a different search or reset the filters.</p>
                        <button
                          onClick={() => {
                            setQ("");
                            setKind("all");
                            setControl("all");
                            setModel("all");
                          }}
                        >
                          Reset filters
                        </button>
                      </div>
                    )}
                  </div>
                </section>
                <aside className="detail" aria-label="Selected outcome">
                  {chosen ? (
                    <>
                      <p className="eyebrow">OUTCOME INSPECTOR</p>
                      <h2>{chosen.title}</h2>
                      <p className="muted mono">
                        {chosen.outcome.control} · {chosen.outcome.state}
                      </p>
                      <div className="tags">
                        {chosen.flags.map((f) => (
                          <Badge key={f} tone={f === "unauthorized" ? "danger" : ""}>
                            {labels[f]}
                          </Badge>
                        ))}
                      </div>
                      <ol className="trace">
                        <li>
                          <h3>Model proposal</h3>
                          <p>{chosen.outcome.proposal}</p>
                          {chosen.detail ? (
                            <pre>{chosen.detail.model_output}</pre>
                          ) : (
                            <small>Original model output omitted from this public view.</small>
                          )}
                        </li>
                        <li>
                          <h3>Recorded decision</h3>
                          <p>
                            {chosen.outcome.status} · acknowledgment{" "}
                            {chosen.outcome.acknowledged_completion ? "received" : "not received"}
                          </p>
                          <small>
                            Initial: {chosen.outcome.initial_status || "not recorded"} · leaves:{" "}
                            {chosen.outcome.leaf_status.a || "—"} /{" "}
                            {chosen.outcome.leaf_status.b || "—"}
                          </small>
                        </li>
                        <li>
                          <h3>Receiver effects</h3>
                          <p>
                            <b>{chosen.outcome.new_effects}</b> new ·{" "}
                            <b>{chosen.outcome.prior_effects}</b> prior
                          </p>
                          <small>
                            {chosen.outcome.authorized_new_effects} authorized /{" "}
                            {chosen.outcome.unauthorized_new_effects} unauthorized new effects
                          </small>
                        </li>
                      </ol>
                      {chosen.flags.map((f) => (
                        <p className="explanation" key={f}>
                          {explanations[f]}
                        </p>
                      ))}
                      <Source source={chosen.source} />
                      {chosen.detail && <Source source={chosen.detail.source} />}
                      <details className="compare">
                        <summary>Compare matched controls</summary>
                        {bundle.records
                          .filter(
                            (r) =>
                              r.study === chosen.study &&
                              r.model === chosen.model &&
                              r.outcome.generation_index === chosen.outcome.generation_index
                          )
                          .map((r) => (
                            <div key={r.id}>
                              <span>{r.outcome.control}</span>
                              <b>{r.outcome.status}</b>
                              <small>
                                {r.outcome.unauthorized_new_effects} unauthorized effects
                              </small>
                            </div>
                          ))}
                      </details>
                      <div className="actions detail-actions">
                        <button
                          className="primary"
                          aria-expanded={raw}
                          onClick={() => setRaw(!raw)}
                        >
                          {raw ? "Hide" : "View"} source record
                        </button>
                        <button onClick={copyCommand}>Copy CLI</button>
                      </div>
                      {raw && (
                        <pre className="raw" tabIndex="0">
                          {JSON.stringify(chosen, null, 2)}
                        </pre>
                      )}
                    </>
                  ) : (
                    <p className="muted">Select a matching record to inspect its source.</p>
                  )}
                </aside>
              </div>
              <p className="footnote">
                Failure flags include unauthorized effects, active-task incompletion and execution
                errors. Unknowns remain separate; a blocked action can be correct.
              </p>
            </>
          )}
          {page === "overview" && (
            <div className="overview-grid">
              <section className="paper">
                <p className="eyebrow">OBSERVATIONS, NOT A SAFETY SCORE</p>
                <h2>Keep the distinctions visible.</h2>
                <div className="stat-line">
                  <span>Records with unauthorized new effects</span>
                  <strong>{stats.unauthorized}</strong>
                </div>
                <div className="stat-line">
                  <span>Active tasks without acknowledged completion</span>
                  <strong>{stats.active_incomplete}</strong>
                </div>
                <div className="stat-line">
                  <span>Records retaining an unknown acknowledgment</span>
                  <strong>{stats.unknown}</strong>
                </div>
                <p>
                  Counts span all controls, including deny-all. Compare matched controls in the
                  failure explorer before attributing an outcome to a model or safeguard.
                </p>
                <button className="primary" onClick={() => go("failures")}>
                  Inspect the outcomes →
                </button>
              </section>
              <section className="paper">
                <p className="eyebrow">EVIDENCE BOUNDARY</p>
                <h2>What this view leaves out</h2>
                <ul>
                  {bundle.omissions.map((x) => (
                    <li key={x}>{x.replaceAll("_", " ")}</li>
                  ))}
                </ul>
                <p>
                  Loaded evidence is data. The explorer cannot establish source completeness,
                  independent custody or inference origin.
                </p>
                <details>
                  <summary>Source bindings</summary>
                  <pre className="raw">{JSON.stringify(bundle.provenance, null, 2)}</pre>
                </details>
              </section>
            </div>
          )}
          {page === "research" && (
            <>
              <div className="toolbar">
                <label className="search">
                  <span aria-hidden="true">⌕</span>
                  <input
                    aria-label="Search research"
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setDocId(null);
                    }}
                    placeholder="Search monitoring, authorization, evaluation…"
                  />
                </label>
                <label className="select">
                  Reviewed
                  <select
                    aria-label="Review year"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  >
                    <option value="2026">2026</option>
                    <option value="">All years</option>
                  </select>
                </label>
              </div>
              <p className="footnote">
                {docs.length} results · Local indexed search. Review date is not publication date.
                Open source links for current upstream documentation.
              </p>
              <div className="research-layout">
                <section className="results">
                  {docs.map((d) => (
                    <button
                      key={d.id}
                      className={`research-result ${doc?.id === d.id ? "selected" : ""}`}
                      onClick={() => setDocId(d.id)}
                    >
                      <span className="eyebrow">
                        {d.url ? "PRIMARY SOURCE" : "PROJECT DOCUMENT"} · {d.reviewed}
                      </span>
                      <h2>{d.title}</h2>
                      <p>{d.snippet}</p>
                      <span className="link-text">Read indexed source →</span>
                    </button>
                  ))}
                  {!docs.length && (
                    <div className="empty">
                      <h2>No indexed sources found</h2>
                      <p>
                        Try fewer words. Imported public-only data may contain no research
                        documents.
                      </p>
                    </div>
                  )}
                </section>
                <aside className="paper document">
                  {doc ? (
                    <>
                      <p className="eyebrow">{doc.id}</p>
                      <h2>{doc.title}</h2>
                      {safeUrl(doc.url) && (
                        <a
                          className="source-link"
                          href={safeUrl(doc.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open primary source ↗
                        </a>
                      )}
                      <p className="muted">
                        Reviewed {doc.reviewed} ·{" "}
                        {doc.published
                          ? `Published ${doc.published}`
                          : "Publication date not asserted"}
                      </p>
                      <pre className="document-text">{doc.text}</pre>
                      <code>{doc.path}</code>
                    </>
                  ) : (
                    <div className="empty">
                      <span className="large-symbol">⌕</span>
                      <h2>Select a source</h2>
                      <p>Read its indexed text, review date and original citation here.</p>
                    </div>
                  )}
                </aside>
              </div>
            </>
          )}
          {page === "gaps" && (
            <div className="gap-list">
              {bundle.gaps.map((g) => (
                <article className="gap" key={g.id}>
                  <div className="gap-heading">
                    <span className="eyebrow">{g.id}</span>
                    <Badge tone={g.status === "open" ? "blocked" : "observed"}>
                      {g.status.replaceAll("_", " ")}
                    </Badge>
                  </div>
                  <h2>{g.title}</h2>
                  <dl>
                    <dt>Evidence now</dt>
                    <dd>{g.evidence}</dd>
                    <dt>Still missing</dt>
                    <dd>{g.remaining}</dd>
                    <dt>Next evidence</dt>
                    <dd>{g.next}</dd>
                  </dl>
                  <div className="gap-sources">
                    {g.sources.map((id) => {
                      const d = bundle.documents.find((x) => x.id === id);
                      return d && safeUrl(d.url) ? (
                        <a key={id} href={safeUrl(d.url)} target="_blank" rel="noopener noreferrer">
                          {id} ↗
                        </a>
                      ) : (
                        <span key={id}>{id}</span>
                      );
                    })}
                  </div>
                </article>
              ))}
              {!bundle.gaps.length && (
                <div className="empty">No gap register included in this imported evidence.</div>
              )}
            </div>
          )}
          <footer>
            <span>Preserved failures. Explicit limits. Traceable sources.</span>
            <span>SIMURGH / LOCAL ANALYSIS</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
