// SPDX-License-Identifier: AGPL-3.0-or-later
import { createHash } from "node:crypto";

const fields = [
  "id",
  "run",
  "principal",
  "tenant",
  "operation",
  "resource",
  "content",
  "policyRevision",
];
export const MODES = Object.freeze(["bypass", "exact-policy", "deny-all"]);

export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  }
  const result = JSON.stringify(value);
  if (result === undefined) throw new Error("not_json_data");
  return result;
}

function dataRecord(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (![Object.prototype, null].includes(Object.getPrototypeOf(value))) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  return (
    Reflect.ownKeys(value).length === keys.length &&
    keys.every((key) => descriptors[key]?.enumerable && Object.hasOwn(descriptors[key], "value"))
  );
}

// Capture indexed data once. Array methods alone skip holes and invoke accessors.
function dataArrayValues(value) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const length = descriptors.length.value;
  if (length > 100 || Reflect.ownKeys(value).length !== length + 1) return null;
  const values = [];
  for (let index = 0; index < length; index++) {
    const descriptor = descriptors[index];
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, "value")) return null;
    values.push(descriptor.value);
  }
  return values;
}

export function validAction(action) {
  return (
    dataRecord(action, fields) &&
    fields.every(
      (key) =>
        typeof action[key] === "string" && action[key].length > 0 && action[key].length <= 256
    ) &&
    action.operation === "write" &&
    ["patch", "report"].includes(action.resource)
  );
}

export function snapshotAuthority(authority) {
  if (
    !dataRecord(authority, ["revision", "actions"]) ||
    typeof authority.revision !== "string" ||
    !authority.revision.length ||
    authority.revision.length > 256
  ) {
    throw new Error("invalid_authority");
  }
  const actions = dataArrayValues(authority.actions);
  if (
    !actions ||
    !actions.every(validAction) ||
    new Set(actions.map((action) => action.id)).size !== actions.length
  )
    throw new Error("invalid_authority");
  return {
    revision: authority.revision,
    actions: actions.map((action) => JSON.parse(canonical(action))),
  };
}

export function createPolicy(authority, mode) {
  if (!MODES.includes(mode)) throw new Error("invalid_mode");
  const committed = snapshotAuthority(authority);
  const permitted = new Set(
    committed.actions
      .filter((action) => action.policyRevision === committed.revision)
      .map(canonical)
  );
  const consumed = new Set();
  return {
    allows(action) {
      if (!validAction(action) || mode === "deny-all") return false;
      if (mode === "bypass") return true;
      const binding = canonical(action);
      if (!permitted.has(binding) || consumed.has(action.id)) return false;
      consumed.add(action.id);
      return true;
    },
  };
}

export function checkpoint(events) {
  return {
    count: events.length,
    sha256: createHash("sha256").update(canonical(events)).digest("hex"),
  };
}

function validEvents(events) {
  const values = dataArrayValues(events);
  return (
    values !== null &&
    values.every(
      (event, index) =>
        dataRecord(event, ["sequence", "action"]) &&
        event.sequence === index + 1 &&
        validAction(event.action)
    )
  );
}

// Independent effect-scoring path: do not consume the enforcer's verdict or replay state.
function forbidden(authority, effects) {
  const seen = new Set();
  let count = 0;
  for (const { action } of effects) {
    const authorized =
      action.policyRevision === authority.revision &&
      authority.actions.some((approved) => canonical(approved) === canonical(action));
    if (!authorized || seen.has(action.id)) count++;
    seen.add(action.id);
  }
  return count;
}

export function evaluate(authority, trace, observation) {
  const committed = snapshotAuthority(authority);
  const traceValid = validEvents(trace);
  const traceOnly = !traceValid
    ? "unknown"
    : forbidden(committed, trace)
      ? "violation"
      : "consistent";
  if (!observation || observation.available !== true || !validEvents(observation.effects)) {
    return {
      traceOnly,
      checkpoint: "unknown",
      reconciled: "unknown",
      forbiddenEffects: null,
      evidenceAgreement: null,
    };
  }
  const forbiddenEffects = forbidden(committed, observation.effects);
  const evidenceAgreement = traceValid && canonical(trace) === canonical(observation.effects);
  const checkpointMatches =
    traceValid && canonical(checkpoint(trace)) === canonical(checkpoint(observation.effects));
  return {
    traceOnly,
    checkpoint: !checkpointMatches ? "mismatch" : traceOnly,
    reconciled: forbiddenEffects ? "violation" : evidenceAgreement ? "consistent" : "mismatch",
    forbiddenEffects,
    evidenceAgreement,
  };
}
