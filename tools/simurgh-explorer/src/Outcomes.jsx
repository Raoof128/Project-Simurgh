// SPDX-License-Identifier: AGPL-3.0-or-later
// The outcome records of the transfer study (Phase 17) and of the earlier Phase 10 export.
import React, { useState } from "react";
import { queryRecords, summary } from "../core.mjs";
import { Empty, State, saveJson, sentence } from "./ui.jsx";

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
const KINDS = [
  ["all", "All"],
  ["failure", "Failures"],
  ["unauthorized", "Unauthorized"],
  ["active_incomplete", "Incomplete"],
  ["blocked", "Blocked"],
  ["unknown", "Unknown"],
  ["invalid", "Malformed"],
];

function Source({ source }) {
  return (
    <p className="hash">
      <span className="label">Source record</span>{" "}
      <code>
        {source.path}
        {source.pointer}
      </code>
      {source.sha256 && <small>SHA-256 {source.sha256}</small>}
    </p>
  );
}

export function Outcomes({ bundle, isRepository, notify }) {
  const [q, setQ] = useState(""),
    [kind, setKind] = useState("all"),
    [control, setControl] = useState("all"),
    [model, setModel] = useState("all"),
    [selected, setSelected] = useState(null),
    [raw, setRaw] = useState(false);
  const stats = summary(bundle),
    rows = queryRecords(bundle, { q, kind, control, model }),
    chosen = rows.find((r) => r.id === selected) || rows[0];
  const reset = () => {
    setQ("");
    setKind("all");
    setControl("all");
    setModel("all");
  };
  async function copyCommand() {
    const fileOption = isRepository
      ? ` --study ${bundle.study || "phase10"}`
      : " --file '/path/to/loaded-bundle.json'";
    const command = `node tools/simurgh-explorer/cli.mjs inspect --id '${chosen.id}'${fileOption}`;
    try {
      await navigator.clipboard.writeText(command);
      notify(
        isRepository
          ? "CLI command copied."
          : "CLI command copied. Replace the file placeholder with the loaded bundle path."
      );
    } catch {
      notify(`Run: ${command}`);
    }
  }
  return (
    <>
      <dl className="ledger compact" aria-label="Outcome inventory">
        <div>
          <dt>Outcomes kept</dt>
          <dd>{stats.records}</dd>
        </div>
        <div>
          <dt>Controls compared</dt>
          <dd>{stats.controls}</dd>
        </div>
        <div>
          <dt>Model generations</dt>
          <dd>{stats.generations}</dd>
        </div>
        <div>
          <dt>With an unauthorized effect</dt>
          <dd>{stats.unauthorized}</dd>
        </div>
        <div>
          <dt>Active tasks left incomplete</dt>
          <dd>{stats.active_incomplete}</dd>
        </div>
        <div>
          <dt>With an unknown acknowledgment</dt>
          <dd>{stats.unknown}</dd>
        </div>
      </dl>
      <p className="fine">
        Counts span every control, including the one that denies everything. Compare the matched
        controls of a record before attributing an outcome to a model or a safeguard. This view
        leaves out: {bundle.omissions.map((x) => x.replaceAll("_", " ")).join(", ")}.
      </p>
      <div className="toolbar">
        <label className="search">
          <span>Search</span>
          <input
            type="search"
            aria-label="Search outcomes"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search task, control or outcome"
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
            {[...new Set(bundle.records.map((r) => r.outcome.control))].map((c) => (
              <option key={c} value={c}>
                {sentence(c.replaceAll("_", " "))}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="count-line">
        <div className="filters" role="group" aria-label="Outcome filters">
          {KINDS.map(([id, name]) => (
            <button key={id} aria-pressed={kind === id} onClick={() => setKind(id)}>
              {name}
            </button>
          ))}
        </div>
        <span role="status">{rows.length} matching records</span>
        <button
          className="quiet"
          disabled={!rows.length}
          onClick={() =>
            saveJson(
              {
                ...bundle,
                records: rows,
                selection: { total: bundle.records.length, retained: rows.length },
              },
              "simurgh-evidence-selection.json"
            )
          }
        >
          Export {rows.length} records
        </button>
      </div>
      <div className="split">
        <section className="table-panel" aria-label="Outcome records">
          <div className="table-scroll tall">
            <table className="outcomes-table">
              <thead>
                <tr>
                  <th scope="col">Task and generation</th>
                  <th scope="col">Control</th>
                  <th scope="col">Recorded status</th>
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
                        <span className="lane-title">{r.title}</span>
                        <small>
                          {r.model}, generation {r.outcome.generation_index}, trial{" "}
                          {r.outcome.trial}
                        </small>
                      </button>
                    </td>
                    <td className="nowrap">{r.outcome.control.replaceAll("_", " ")}</td>
                    <td>
                      <State state={r.flags.includes("unauthorized") ? "alert" : "plain"}>
                        {r.outcome.status}
                      </State>
                      {r.flags.includes("unauthorized") && (
                        <small className="warn-text">Unauthorized effect</small>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && (
              <Empty title="No matching records">
                <p>Try a different search or clear the filters.</p>
                <button onClick={reset}>Clear filters</button>
              </Empty>
            )}
          </div>
        </section>
        <aside className="inspector" aria-label="Selected outcome">
          {chosen ? (
            <>
              <p className="kicker">
                {chosen.outcome.control.replaceAll("_", " ")}, state{" "}
                {chosen.outcome.state.replaceAll("_", " ")}
              </p>
              <h2>{chosen.title}</h2>
              <p className="chips">
                {chosen.flags.map((f) => (
                  <State key={f} state={f === "unauthorized" ? "alert" : "plain"}>
                    {labels[f]}
                  </State>
                ))}
              </p>
              <ol className="trace">
                <li>
                  <h3>Model proposal</h3>
                  <p>{chosen.outcome.proposal}</p>
                  {chosen.detail ? (
                    <pre>{chosen.detail.model_output}</pre>
                  ) : (
                    <p className="muted">Original model output omitted from this public view.</p>
                  )}
                </li>
                <li>
                  <h3>Recorded decision</h3>
                  <p>
                    {chosen.outcome.status}, acknowledgment{" "}
                    {chosen.outcome.acknowledged_completion ? "received" : "not received"}
                  </p>
                  <p className="muted">
                    Initial: {chosen.outcome.initial_status || "not recorded"}. Leaves:{" "}
                    {chosen.outcome.leaf_status.a || "none"} and{" "}
                    {chosen.outcome.leaf_status.b || "none"}.
                  </p>
                </li>
                <li>
                  <h3>Receiver effects</h3>
                  <p>
                    <b>{chosen.outcome.new_effects}</b> new, <b>{chosen.outcome.prior_effects}</b>{" "}
                    prior
                  </p>
                  <p className="muted">
                    {chosen.outcome.authorized_new_effects} authorized and{" "}
                    {chosen.outcome.unauthorized_new_effects} unauthorized new effects
                  </p>
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
                      <span>{r.outcome.control.replaceAll("_", " ")}</span>
                      <b>{r.outcome.status}</b>
                      <small>{r.outcome.unauthorized_new_effects} unauthorized effects</small>
                    </div>
                  ))}
              </details>
              <div className="row-actions">
                <button aria-expanded={raw} onClick={() => setRaw(!raw)}>
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
      <details className="archive">
        <summary>
          {isRepository
            ? "Source bindings"
            : "Source bindings (producer-supplied, not checked by the explorer)"}
        </summary>
        <pre className="raw">{JSON.stringify(bundle.provenance, null, 2)}</pre>
      </details>
    </>
  );
}
