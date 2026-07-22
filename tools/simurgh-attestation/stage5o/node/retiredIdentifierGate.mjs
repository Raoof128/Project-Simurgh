// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §10.6 — retired_identifier_active_use_rejection.
//
// The invariant:  retired identifier mentioned HISTORICALLY  !=  retired identifier used NORMATIVELY
//
// A construction is deleted; its identifier survives; a later section reuses the name for the object
// that replaced it — or worse, for the deleted one. A reviewer then greps, finds the identifier, and
// cannot tell whether the stage is describing a corpse or standing on one.
//
// A plain grep cannot establish that distinction, and the dead-language check this replaces WAS a
// plain grep: it reported green on `closure_capsule_root` only because every occurrence happened to
// be a declaration of its absence. That is luck of wording, not construction — the same check would
// have reported green on a live normative reuse. This gate classifies each occurrence by the context
// it sits in, and fails CLOSED: an occurrence it cannot place is a violation, not a pass.

/** Identifiers whose constructions were retired. `closure_capsule_root` was deleted by A14. */
export const RETIRED_IDENTIFIERS = Object.freeze(["closure_capsule_root"]);

export const OCCURRENCE_CLASSES = Object.freeze([
  "amendment_history",
  "explicit_absence",
  "negative_fixture",
  "active_normative",
]);

// An amendment paragraph is history by construction: it describes what a change DID.
const AMENDMENT = /\*\*Amendment\s+A\d+/i;

// Words that assert the thing is NOT there. Absence is the permitted register.
const ABSENCE =
  /\b(absent|absence|deleted|delete|removed|remove|retired|retire|never|no longer|not present|cannot|does not|do not|forbidden|rehomed|dead|corpse)\b|\bno\s+`?/i;

// A fixture ROW proving the retired construction is rejected is evidence, not reuse. Anchored to a
// table row so an ordinary sentence containing "reject" cannot borrow the exemption.
const NEGATIVE_FIXTURE = /^\s*\|.*\breject\b/i;

// Active, normative constructs: a requirement's identity or subject, a construction definition, a
// normative formula, a discharge condition, an active gate obligation, or a release mapping.
const ACTIVE = [
  /^\s*(requirement|owner|discharger|subject|purpose|discharge condition|obligation)\s*:/i,
  /release_required_bindings/,
  /^\s*section_\d+\.[a-z_]+\s*=/i,
  /\bMUST\b/,
  /=\s*SHA256|:=/,
];

/**
 * Classify ONE occurrence by the line it sits in. Order matters: history and absence are checked
 * before the active patterns, because an amendment sentence may legitimately quote a formula while
 * describing its deletion.
 */
export function classifyOccurrence(line, identifier) {
  const has = line.includes(identifier);
  if (!has) return { klass: null, violation: false };

  if (AMENDMENT.test(line)) return { klass: "amendment_history", violation: false, line };
  if (NEGATIVE_FIXTURE.test(line)) return { klass: "negative_fixture", violation: false, line };
  if (ABSENCE.test(line)) return { klass: "explicit_absence", violation: false, line };
  if (ACTIVE.some((re) => re.test(line))) {
    return { klass: "active_normative", violation: true, line };
  }
  // Fail closed: an occurrence that cannot be placed is treated as normative reuse. A gate that
  // shrugs at what it does not recognise is the gate this one replaces.
  return { klass: "active_normative", violation: true, line };
}

/**
 * Scan a document for every retired identifier and classify each occurrence.
 * Returns all occurrences (so a caller can prove the gate actually inspected something) and the
 * subset that are violations.
 */
export function retiredIdentifierGate(text, identifiers = RETIRED_IDENTIFIERS) {
  const lines = String(text).split("\n");
  const occurrences = [];
  lines.forEach((line, i) => {
    for (const id of identifiers) {
      if (!line.includes(id)) continue;
      const r = classifyOccurrence(line, id);
      occurrences.push({
        identifier: id,
        line_number: i + 1,
        klass: r.klass,
        violation: r.violation,
        line,
      });
    }
  });
  return { occurrences, violations: occurrences.filter((o) => o.violation) };
}
