// SPDX-License-Identifier: AGPL-3.0-or-later
// Phase 19 views: the record of predictions, the lanes, the replication commands, the open work.
import React, { useState } from "react";
import { lanesSummary, queryLanes, tally, trackRecord } from "../core.mjs";
import { CheckButtons, CheckResult } from "./PackCheck.jsx";
import {
  CopyButton,
  Empty,
  Mark,
  Marks,
  Rich,
  State,
  formatDate,
  formatSpend,
  outcomeText,
  saveJson,
  sentence,
} from "./ui.jsx";

// What a results page reports against a prediction: the column that says so by name, or else
// the last column, since a page words its own headings.
const observedOf = (h) =>
  h.columns.find((c) => /^(Observed|What happened|Outcome|Eligible models)/.test(c.label)) ??
  (h.columns.length > 1 ? h.columns.at(-1) : undefined);

function predictionLine(lane) {
  const t = tally(lane),
    once = t.held + t.failed + t.undecided;
  if (!lane.hypotheses.length) return "None declared";
  const parts = [];
  if (once) parts.push(`${t.held} of ${once} held`);
  if (t.by_model) parts.push(`${t.by_model} by model`);
  return parts.join(", ");
}

function outsideOf(lane) {
  const items = [{ item: "verify", state: lane.outside.verify }, ...lane.outside.deeper];
  const owed = items.filter((i) => i.state === "owed").length;
  return { items, owed, state: owed === 0 ? "checked" : owed === items.length ? "owed" : "part" };
}

function OutsideState({ lane }) {
  const o = outsideOf(lane);
  return (
    <State state={o.state}>
      {o.state === "checked" ? "Checked" : o.state === "owed" ? "Owed" : "Part owed"}
    </State>
  );
}

function Legend() {
  const sample = (outcome, extra = {}) => ({ id: "Example", outcome, ...extra });
  return (
    <ul className="legend" aria-label="How to read the marks">
      <li>
        <Mark h={sample("held")} /> Held
      </li>
      <li>
        <Mark h={sample("failed")} /> Did not hold
      </li>
      <li>
        <Mark h={sample("undecided")} /> Not decided
      </li>
      <li>
        <Mark h={sample("by_model", { held_on: 1, of: 2 })} /> Decided model by model; the fill is
        the share of models it held on
      </li>
    </ul>
  );
}

// Where the author's predictions were right and wrong, by what the lane measured.
const TRACK_COLUMNS = ["Lanes", "Decided once", "Did not hold", "Decided model by model"];
function TrackRecord({ bundle }) {
  const t = trackRecord(bundle);
  const rows = [
    ["Lanes that measured a model", t.model],
    ["Lanes that measured none", t.no_model],
  ].filter(([, r]) => r.lanes > 0);
  if (!rows.length) return null;
  return (
    <section className="panel" aria-labelledby="track-title">
      <div className="panel-head">
        <h2 id="track-title">How the predictions fared, by what was measured</h2>
        <p>
          Each prediction was written down before its lane ran. The split is whether a model was
          what the lane measured: where it was, the prediction is about something the author does
          not control. Agents used as attackers are not counted as measured models.
        </p>
      </div>
      <div className="table-scroll">
        <table className="track-table">
          <thead>
            <tr>
              {TRACK_COLUMNS.map((name) => (
                <th scope="col" key={name}>
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, r]) => {
              const once = r.held + r.failed + r.undecided;
              return (
                <tr key={name}>
                  <th scope="row">
                    {name}
                    <small>{r.lanes} with predictions</small>
                  </th>
                  <td data-label={TRACK_COLUMNS[1]}>
                    {once ? `${r.held} of ${once} held` : "None"}
                    {r.undecided > 0 && <small>{r.undecided} not decided</small>}
                  </td>
                  <td data-label={TRACK_COLUMNS[2]}>{once ? `${r.failed} of ${once}` : "None"}</td>
                  <td data-label={TRACK_COLUMNS[3]}>
                    {r.model_of ? `Held in ${r.model_held} of ${r.model_of} cases` : "None"}
                    {r.model_of > 0 && <small>a case is one prediction on one model</small>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function Record({ bundle, openLane, go }) {
  const s = lanesSummary(bundle),
    lanes = bundle.lanes,
    once = s.held + s.failed + s.undecided,
    failed = lanes.flatMap((l) =>
      l.hypotheses.filter((h) => h.outcome === "failed").map((h) => ({ l, h }))
    ),
    fromPage = lanes
      .filter((l) => l.hypotheses.some((h) => h.source === "results_page"))
      .map((l) => l.id);
  if (!bundle.lanes.length)
    return (
      <Empty title="No Phase 19 lanes in this file">
        <p>
          The loaded file carries outcome records only. Restore the repository data to see the
          lanes.
        </p>
      </Empty>
    );
  return (
    <>
      <section className="panel" aria-labelledby="record-title">
        <div className="panel-head">
          <h2 id="record-title">Every prediction of every lane</h2>
          <p>
            A lane states what it expects before it runs, and a rule decides each prediction
            afterwards. Each lane has its own column or row. Select one to open the lane.
          </p>
        </div>
        <div className="strip-scroll">
          <ol className="strip">
            {lanes.map((l) => (
              <li key={l.id}>
                <button
                  className="strip-lane"
                  onClick={() => openLane(l.id)}
                  aria-label={`Lane ${l.id}: ${l.title}. ${predictionLine(l)}.`}
                >
                  <span className="strip-marks">
                    {l.hypotheses.length ? (
                      l.hypotheses.map((h) => <Mark key={h.id} h={h} size={13} />)
                    ) : (
                      <span className="strip-none" aria-hidden="true" />
                    )}
                  </span>
                  <span className="strip-id">
                    <span className="strip-prefix">{l.id.slice(0, 2)}</span>
                    {l.id.slice(2)}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
        <p className="fine touch-hint">Scroll sideways to see every lane.</p>
        <Legend />
        <p className="fine">
          A lane with a short line declared no prediction that its receipt records: it is a
          recomputation, a drill or an instrument. A count of marks is a record of what was said and
          what happened. It is not a score.
        </p>
      </section>

      <dl className="ledger" aria-label="Phase 19 in numbers">
        <div>
          <dt>Packs</dt>
          <dd>{s.packs}</dd>
          <dd className="note">each bound to a root hash and a verify command</dd>
        </div>
        <div>
          <dt>Predictions decided once</dt>
          <dd>
            {s.held} held, {s.failed} did not
          </dd>
          <dd className="note">
            of {once}
            {s.undecided ? `; ${s.undecided} not decided` : ""}
          </dd>
        </div>
        <div>
          <dt>Decided model by model</dt>
          <dd>{s.by_model}</dd>
          <dd className="note">shown as models held on, of models that qualified</dd>
        </div>
        <div>
          <dt>Packs that measured a model</dt>
          <dd>
            {s.with_model} of {s.packs}
          </dd>
          <dd className="note">metered spend in receipts: {formatSpend(s.spend_usd)}</dd>
        </div>
        <div>
          <dt>Checked by an outside operator</dt>
          <dd>
            {s.outside_items - s.owed_items} of {s.outside_items} items
          </dd>
          <dd className="note">
            {s.receipts} reviewed receipts; {s.owed_items} items owed
          </dd>
        </div>
        <div>
          <dt>Independent custody</dt>
          <dd>
            {s.independent_custody} of {s.packs}
          </dd>
          <dd className="note">
            {s.independent_custody
              ? "the rest were produced and are held by the author"
              : "every pack was produced and is held by the author"}
          </dd>
        </div>
      </dl>

      <TrackRecord bundle={bundle} />

      <div className="two-up">
        <section className="panel" aria-labelledby="failed-title">
          <div className="panel-head">
            <h2 id="failed-title">What did not hold</h2>
            <p>
              {failed.length} predictions failed their rule across {s.lanes_with_failed} lanes. They
              are published as they are.
            </p>
          </div>
          <ul className="failed-list">
            {failed.map(({ l, h }) => (
              <li key={`${l.id}:${h.id}`}>
                <button className="link" onClick={() => openLane(l.id)}>
                  <Mark h={h} /> {l.id} {h.id}
                </button>
                <div>
                  <p className="declared">
                    {h.columns.length ? (
                      <Rich text={sentence(h.columns[0].text)} />
                    ) : (
                      "Worded on the lane's results page."
                    )}
                  </p>
                  {observedOf(h) && observedOf(h) !== h.columns[0] && (
                    <p className="observed">
                      <Rich text={observedOf(h).text} />
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel" aria-labelledby="limits-title">
          <div className="panel-head">
            <h2 id="limits-title">What this page cannot tell you</h2>
          </div>
          <ul className="plain-list">
            <li>
              It reads committed files. It can recompute a pack's root in your browser, under
              Replicate. Replaying a gate or a model is the job of each lane's own command.
            </li>
            <li>
              Outcomes come from each pack's receipt
              {fromPage.length > 0 &&
                `; for ${fromPage.join(" and ")}, whose receipts hold no such field, from the table on the lane's results page`}
              . Wording comes from the lane's own pages. Nothing is typed in here.
            </li>
            <li>
              {s.owed_items} outside checks are still owed, and no pack has independent custody.
            </li>
            <li>
              {bundle.open_work.length} items of open work are listed in the README, including
              faults found and not repaired.
            </li>
          </ul>
          <div className="row-actions">
            <button onClick={() => go("replicate")}>See the verify commands</button>
            <button onClick={() => go("open")}>See the open work</button>
          </div>
        </section>
      </div>
    </>
  );
}

function LaneInspector({ lane, bundle, readPage, notify, checking }) {
  const o = outsideOf(lane);
  return (
    <aside className="inspector" aria-label="Selected lane" id="lane-inspector">
      <button
        className="quiet narrow-only"
        onClick={() => globalThis.document?.querySelector(".table-panel")?.scrollIntoView?.()}
      >
        Back to the list of lanes
      </button>
      <p className="kicker">
        Lane {lane.id}
        {lane.unit ? `, declared as ${lane.unit}` : ""}
      </p>
      <h2>
        <Rich text={lane.title} />
      </h2>
      <p className="reading">
        <Rich text={lane.summary} />
      </p>

      <dl className="facts">
        <div>
          <dt>Ruled on</dt>
          <dd>{formatDate(lane.date)}</dd>
        </div>
        <div>
          <dt>Measured a model</dt>
          <dd>{lane.model_inference ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt>Metered spend</dt>
          <dd>{formatSpend(lane.spend_usd)}</dd>
        </div>
        <div>
          <dt>Independent custody</dt>
          <dd>{lane.independent_custody ? "Yes" : "No"}</dd>
        </div>
        {lane.served && (
          <div>
            <dt>Model id the provider returned</dt>
            <dd>
              {lane.served.returned
                ? `Recorded, ${lane.served.returned} of ${lane.served.named} named`
                : `Not recorded; ${lane.served.named} named`}
            </dd>
          </div>
        )}
      </dl>
      {lane.models.length > 0 && (
        <p className="models">
          <span className="label">{lane.model_inference ? "Models measured" : "Models named"}</span>{" "}
          {lane.models.map((m) => (
            <code key={m}>{m}</code>
          ))}
        </p>
      )}

      <h3>Predictions</h3>
      {lane.hypotheses.length ? (
        <ul className="hypotheses">
          {lane.hypotheses.map((h) => (
            <li key={h.id} className={`hyp hyp-${h.outcome}`}>
              <div className="hyp-head">
                <Mark h={h} size={16} />
                <strong>{h.id}</strong>
                <span>{outcomeText(h)}</span>
              </div>
              {h.columns.map((c, i) => (
                <p key={i}>
                  {c.label && (
                    <span className="label">
                      <Rich text={c.label} />
                    </span>
                  )}{" "}
                  <Rich text={c.text} />
                </p>
              ))}
              {!h.columns.length && <p className="muted">Worded on the lane's results page.</p>}
              {h.pointer && (
                <p className="muted pointer">
                  Recorded at <code>{lane.sources.receipt.path.split("/").at(-1)}</code>{" "}
                  <code>{h.pointer}</code>
                </p>
              )}
              {h.source === "results_page" && (
                <p className="muted">
                  Read from the lane's results page; its receipt holds no field for this.
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">
          This pack's receipt records no prediction decided by rule. The lane is a recomputation, a
          drill or an instrument; its results page says what it measured.
        </p>
      )}

      {lane.limits.length > 0 && (
        <>
          <h3>What it does not show</h3>
          <ul className="plain-list">
            {lane.limits.map((x, i) => (
              <li key={i}>
                <Rich text={`${sentence(x)}.`} />
              </li>
            ))}
          </ul>
        </>
      )}

      <h3>Check it</h3>
      <pre className="command" tabIndex="0">
        {lane.verify}
      </pre>
      <p className="muted">
        {sentence(lane.host)}. Takes {lane.time}.
      </p>
      <ul className="outside-items">
        {o.items.map((i) => (
          <li key={i.item}>
            <State state={i.state}>
              {i.item === "verify" ? "Plain verify" : i.item}:{" "}
              {i.state === "owed" ? "owed" : "checked by a reviewed outside receipt"}
            </State>
          </li>
        ))}
      </ul>
      <p className="hash">
        <span className="label">Committed root</span> <code>{lane.root}</code>
      </p>
      <CheckResult check={checking.checks[lane.id]} members />
      <div className="row-actions">
        <CheckButtons
          lane={lane}
          canFetch={checking.canFetch}
          onCheck={checking.check}
          onFile={checking.file}
        />
        <CopyButton text={lane.verify} label="Copy verify command" onCopied={notify} />
        {bundle.documents.some((d) => d.id === lane.pages.readme) && (
          <button onClick={() => readPage(lane.pages.readme)}>Read the lane's page</button>
        )}
        {bundle.documents.some((d) => d.id === lane.pages.results) && (
          <button onClick={() => readPage(lane.pages.results)}>Read its results</button>
        )}
      </div>
    </aside>
  );
}

export function Lanes({ bundle, selected, openLane, readPage, notify, checking }) {
  const [q, setQ] = useState(""),
    [ran, setRan] = useState("all"),
    [outcome, setOutcome] = useState("all"),
    [outside, setOutside] = useState("all");
  const rows = queryLanes(bundle, { q, ran, outcome, outside });
  const chosen = rows.find((l) => l.id === selected) || rows[0];
  const reset = () => {
    setQ("");
    setRan("all");
    setOutcome("all");
    setOutside("all");
  };
  if (!bundle.lanes.length)
    return (
      <Empty title="No Phase 19 lanes in this file">
        <p>Restore the repository data to see the lanes.</p>
      </Empty>
    );
  return (
    <>
      <div className="toolbar">
        <label className="search">
          <span>Search</span>
          <input
            type="search"
            aria-label="Search lanes"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search lanes, models, predictions or limits"
          />
        </label>
        <label className="select">
          Measured
          <select
            aria-label="Filter by model use"
            value={ran}
            onChange={(e) => setRan(e.target.value)}
          >
            <option value="all">Any</option>
            <option value="model">A model</option>
            <option value="no_model">No model</option>
          </select>
        </label>
        <label className="select">
          Predictions
          <select
            aria-label="Filter by prediction outcome"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
          >
            <option value="all">Any</option>
            <option value="failed">At least one did not hold</option>
            <option value="all_held">All held</option>
            <option value="none">None declared</option>
          </select>
        </label>
        <label className="select">
          Outside check
          <select
            aria-label="Filter by outside check"
            value={outside}
            onChange={(e) => setOutside(e.target.value)}
          >
            <option value="all">Any</option>
            <option value="owed">Something owed</option>
            <option value="checked">Fully checked</option>
          </select>
        </label>
      </div>
      <div className="count-line">
        <span role="status">
          {rows.length} of {bundle.lanes.length} lanes
        </span>
        <button
          className="quiet"
          disabled={!rows.length}
          onClick={() =>
            saveJson(
              {
                schema: "simurgh.explorer.query.v1",
                verification: bundle.verification,
                selection: { total: bundle.lanes.length, retained: rows.length },
                data: rows,
              },
              "simurgh-lanes-selection.json"
            )
          }
        >
          Export {rows.length} lanes as JSON
        </button>
      </div>
      <div className="split">
        <section className="table-panel" aria-label="Lanes">
          <div className="table-scroll">
            <table className="lanes-table">
              <thead>
                <tr>
                  <th scope="col">Lane</th>
                  <th scope="col">Predictions</th>
                  <th scope="col">Outside check</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={l.id} className={chosen?.id === l.id ? "selected" : ""}>
                    <td>
                      <button
                        className="row-button"
                        aria-pressed={chosen?.id === l.id}
                        onClick={() => openLane(l.id, true)}
                      >
                        <span className="lane-id">{l.id}</span>
                        <span className="lane-title">
                          <Rich text={l.title} />
                        </span>
                        <small>
                          {formatDate(l.date)},{" "}
                          {l.model_inference
                            ? `${l.models.length} ${l.models.length === 1 ? "model" : "models"} measured`
                            : "no model measured"}
                        </small>
                      </button>
                    </td>
                    <td>
                      {l.hypotheses.length > 0 && <Marks lane={l} />}
                      <small>{predictionLine(l)}</small>
                    </td>
                    <td>
                      <OutsideState lane={l} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && (
              <Empty title="No lane matches">
                <p>Try fewer words or clear the filters.</p>
                <button onClick={reset}>Clear filters</button>
              </Empty>
            )}
          </div>
        </section>
        {chosen && (
          <LaneInspector
            lane={chosen}
            bundle={bundle}
            readPage={readPage}
            notify={notify}
            checking={checking}
          />
        )}
      </div>
      {bundle.other.length > 0 && (
        <section className="panel" aria-labelledby="other-title">
          <div className="panel-head">
            <h2 id="other-title">Phase 19 folders that hold no pack</h2>
            <p>
              These are in the repository beside the lanes and are not lanes: nothing in them is
              verified by a root.
            </p>
          </div>
          <ul className="other-list">
            {bundle.other.map((o) => (
              <li key={o.id}>
                <span className="lane-id">{o.id}</span>
                <div>
                  <strong>
                    <Rich text={o.title} />
                  </strong>
                  <p className="muted">
                    <Rich text={o.summary} />
                  </p>
                </div>
                {bundle.documents.some((d) => d.id === o.page) && (
                  <button onClick={() => readPage(o.page)}>Read its page</button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

// Every pack of this checkout, hashed in the reader's browser, with the tally as it runs.
function PackSweep({ bundle, checking }) {
  const [running, setRunning] = useState(false);
  const done = bundle.lanes.map((l) => checking.checks[l.id]).filter((c) => c?.state === "done"),
    failed = bundle.lanes.filter((l) => checking.checks[l.id]?.state === "failed").length,
    matching = done.filter((c) => c.match).length,
    checked = done.length + failed,
    bad = checked - matching;
  return (
    <section className="panel" aria-labelledby="sweep-title">
      <div className="panel-head">
        <h2 id="sweep-title">Check every pack in this browser</h2>
        <p>
          The page reads each pack of this checkout, hashes its manifest and every member, and
          compares the result with the committed root. It is the first step of each verifier, done
          here without a command line. It replays no gate and runs no model.
        </p>
      </div>
      <div className="row-actions">
        <button
          disabled={running || !checking.canFetch}
          onClick={async () => {
            setRunning(true);
            await checking.all();
            setRunning(false);
          }}
        >
          {running ? "Checking" : "Check all packs"}
        </button>
      </div>
      {!checking.canFetch && (
        <p className="muted">
          An imported file is loaded. Restore the repository data to check this checkout's packs, or
          check a copy from a file in the lane's own view.
        </p>
      )}
      {checked > 0 && checked < bundle.lanes.length && (
        // One pack checked from its lane is not a verdict on the rest.
        <p className="sweep-result" role="status">
          <State state={bad ? "alert" : "plain"}>
            {checked} checked so far, of {bundle.lanes.length}: {matching}{" "}
            {matching === 1 ? "hashes" : "hash"} to the committed root with every member matching
            {bad ? `; ${bad} ${bad === 1 ? "does" : "do"} not or could not be read` : ""}.
          </State>
        </p>
      )}
      {checked > 0 && checked === bundle.lanes.length && (
        <p className="sweep-result" role="status">
          <State state={bad ? "alert" : "checked"}>
            {matching} of {bundle.lanes.length} packs hash to their committed root with every member
            matching{bad ? `; ${bad} do not or could not be read` : ""}.
          </State>
        </p>
      )}
    </section>
  );
}

export function Replicate({ bundle, openLane, notify, checking }) {
  const [owedOnly, setOwedOnly] = useState(false);
  const h = bundle.handoff,
    rows = bundle.lanes.filter((l) => !owedOnly || outsideOf(l).owed > 0);
  if (!bundle.lanes.length || !h)
    return (
      <Empty title="No replication commands in this file">
        <p>Restore the repository data to see them.</p>
      </Empty>
    );
  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <h2>
            {h.items - h.owed.length} of {h.items} items have been exercised by a reviewed outside
            receipt
          </h2>
          <p>
            {h.receipts} receipts from outside operators are committed with the author's review of
            each. {h.owed.length} items are owed. The note the handoff tool attaches:{" "}
            <q>{h.note}</q>
          </p>
        </div>
        <ul className="plain-list">
          <li>
            Run the commands from the repository root. Host recipes and the expected receipt of
            every lane are in <code>{h.guide}</code>.
          </li>
          <li>
            A lane with a deeper item also replays its gate or recomputes its dataset when the flag
            named in the handoff is added.
          </li>
          <li>
            A command that passes on your machine shows that the pack matches its root there. It
            does not show who produced the pack.
          </li>
        </ul>
        <label className="check">
          <input
            type="checkbox"
            checked={owedOnly}
            onChange={(e) => setOwedOnly(e.target.checked)}
          />{" "}
          Show only lanes with something owed
        </label>
      </section>
      <PackSweep bundle={bundle} checking={checking} />
      <ol className="commands">
        {rows.map((l) => {
          const o = outsideOf(l);
          return (
            <li key={l.id} className="command-row">
              <div className="command-head">
                <button className="link" onClick={() => openLane(l.id)}>
                  <span className="lane-id">{l.id}</span> <Rich text={l.title} />
                </button>
                <span className="command-states">
                  {o.items.map((i) => (
                    <State key={i.item} state={i.state}>
                      {i.item === "verify" ? "verify" : i.item.replace(`${l.id} `, "")}{" "}
                      {i.state === "owed" ? "owed" : "checked"}
                    </State>
                  ))}
                </span>
              </div>
              <pre className="command" tabIndex="0">
                {l.verify}
              </pre>
              <CheckResult check={checking.checks[l.id]} />
              <div className="command-foot">
                <span className="muted">
                  {sentence(l.host)}. Takes {l.time}.
                </span>
                <CopyButton text={l.verify} onCopied={notify} />
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}

export function OpenWork({ bundle, openLane, sourceLink }) {
  const laneIds = new Set(bundle.lanes.map((l) => l.id));
  return (
    <>
      {bundle.open_work.length > 0 && (
        <section aria-labelledby="open-now">
          <div className="section-head">
            <h2 id="open-now">Open now, as the README lists it</h2>
            <p>{bundle.open_work.length} items, read from the repository's README.</p>
          </div>
          <ul className="work-list">
            {bundle.open_work.map((w) => (
              <li key={w.id} className="work">
                <h3>{w.title}</h3>
                <p className="reading">
                  <Rich text={sentence(w.text)} />
                </p>
                {w.lanes.filter((id) => laneIds.has(id)).length > 0 && (
                  <p className="chips work-lanes">
                    <span className="label">Lanes named</span>
                    {w.lanes
                      .filter((id) => laneIds.has(id))
                      .map((id) => (
                        <button key={id} className="chip" onClick={() => openLane(id)}>
                          {id}
                        </button>
                      ))}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {bundle.gaps.length > 0 && (
        <details className="archive" open={!bundle.open_work.length}>
          <summary>
            Register of 19 October 2026, kept as it was written ({bundle.gaps.length} entries)
          </summary>
          <p className="muted">
            A dated snapshot from before Phase 19. An entry marked open here may have moved since;
            the list above is the current one.
          </p>
          <div className="gap-list">
            {bundle.gaps.map((g) => (
              <article className="gap" key={g.id}>
                <div className="gap-heading">
                  <span className="lane-id">{g.id}</span>
                  <State state={g.status === "open" ? "owed" : "checked"}>
                    {g.status.replaceAll("_", " ")}
                  </State>
                </div>
                <h3>{g.title}</h3>
                <dl>
                  <dt>Evidence then</dt>
                  <dd>{g.evidence}</dd>
                  <dt>Still missing</dt>
                  <dd>{g.remaining}</dd>
                  <dt>Next evidence</dt>
                  <dd>{g.next}</dd>
                </dl>
                <div className="gap-sources">{g.sources.map((id) => sourceLink(id))}</div>
              </article>
            ))}
          </div>
        </details>
      )}
      {!bundle.open_work.length && !bundle.gaps.length && (
        <Empty title="No open work in this file">
          <p>The loaded file carries no list of open work.</p>
        </Empty>
      )}
    </>
  );
}
