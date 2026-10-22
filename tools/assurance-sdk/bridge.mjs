// SPDX-License-Identifier: AGPL-3.0-or-later
// Local harness protocol, not a network service. Authority is selected from trusted fixtures.
import { scenarios, mutateTrace } from "../assurance-lab/corpus.mjs";
import {
  canonical,
  createPolicy,
  evaluate,
  snapshotAuthority,
  validAction,
} from "../assurance-lab/core.mjs";
import { startSink } from "../assurance-lab/sink.mjs";

const MAX_LINE = 65536;
let sink, scenario, authority, policy, mode;
let finished = false;
const trace = [];
const decisions = [];

function exactKeys(object, keys) {
  return (
    object &&
    typeof object === "object" &&
    !Array.isArray(object) &&
    Object.keys(object).length === keys.length &&
    keys.every((key) => Object.hasOwn(object, key))
  );
}

async function observe() {
  if (scenario.id === "sink-failure") return { available: false, reason: "sink_failure" };
  if (scenario.id === "observer-unavailable")
    return { available: false, reason: "observer_unavailable" };
  return sink.snapshot();
}

async function dispatch(request) {
  const fields = {
    initialize: ["scenarioId", "mode"],
    execute: ["action"],
    snapshot: [],
    finish: [],
    close: [],
  };
  if (
    !Number.isSafeInteger(request?.id) ||
    request.id < 1 ||
    !Object.hasOwn(fields, request.op) ||
    !exactKeys(request, ["id", "op", ...fields[request.op]])
  )
    throw new Error("invalid_request");
  if (request.op === "initialize") {
    if (scenario) throw new Error("already_initialized");
    const selected = scenarios().find((item) => item.id === request.scenarioId);
    if (!selected) throw new Error("unknown_scenario");
    const committed = snapshotAuthority(selected.authority);
    const mutable = structuredClone(committed);
    const created = createPolicy(mutable, request.mode);
    if (selected.lateApproval) mutable.actions.push(selected.lateApproval);
    sink = await startSink();
    scenario = selected;
    authority = committed;
    policy = created;
    mode = request.mode;
    if (scenario.id === "sink-failure") await sink.crashForTest();
    return { scenarioId: scenario.id, mode };
  }
  if (!scenario) throw new Error("not_initialized");
  if (request.op === "close") {
    await sink.close();
    finished = true;
    return { closed: true };
  }
  if (request.op === "snapshot") return observe();
  if (finished) throw new Error("already_finished");
  if (request.op === "execute") {
    if (!validAction(request.action)) throw new Error("invalid_action");
    if (scenario.id === "sink-failure") return { status: "error", reason: "sink_failure" };
    const allowed = policy.allows(request.action);
    decisions.push({ id: request.action.id, allowed });
    if (!allowed) return { status: "denied" };
    const event = await sink.execute(request.action);
    trace.push(event);
    return { status: "executed", event };
  }
  const observation = await observe();
  const changed = mutateTrace(scenario, trace);
  const verdict = evaluate(authority, changed, observation);
  const attackApplied =
    scenario.kind === "authorization"
      ? canonical(scenario.baseProposals) !== canonical(scenario.proposals)
      : ["evidence", "invalid-mutation"].includes(scenario.kind)
        ? canonical(trace) !== canonical(changed)
        : null;
  const benignCompleted =
    scenario.kind === "benign" &&
    verdict.forbiddenEffects === 0 &&
    scenario.required.every((action) =>
      observation.effects.some((effect) => canonical(effect.action) === canonical(action))
    );
  finished = true;
  return {
    id: scenario.id,
    kind: scenario.kind,
    mode,
    authority,
    proposals: scenario.proposals,
    decisions,
    trace: changed,
    observation,
    attackApplied,
    benignCompleted,
    verdict,
  };
}

async function main() {
  if (process.argv.length === 3 && process.argv[2] === "--dataset") {
    console.log(JSON.stringify(scenarios()));
    return;
  }
  if (process.argv.length !== 2) throw new Error("invalid_arguments");
  let buffered = Buffer.alloc(0);
  for await (const chunk of process.stdin) {
    buffered = Buffer.concat([buffered, chunk]);
    let newline;
    while ((newline = buffered.indexOf(10)) !== -1) {
      if (newline > MAX_LINE) throw new Error("request_too_large");
      const line = buffered.subarray(0, newline);
      buffered = buffered.subarray(newline + 1);
      const request = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(line));
      try {
        console.log(JSON.stringify({ id: request?.id, result: await dispatch(request) }));
      } catch (error) {
        console.log(JSON.stringify({ id: request?.id, error: error.message }));
      }
    }
    if (buffered.length > MAX_LINE) throw new Error("request_too_large");
  }
  if (buffered.length) throw new Error("unterminated_request");
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (sink) await sink.close();
}
