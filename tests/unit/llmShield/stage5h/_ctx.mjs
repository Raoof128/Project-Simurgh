// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — the verification context builder. Assembles exactly what the check modules + vsdCore
// consume: the bundle plus the EXTERNAL trust material (pin, host registry) and the recompute inputs
// (recipes, artefact bytes, kernel result). All optional keys default to the valid fixture's values.
export function ctxFor(fixture, overrides = {}) {
  const base = {
    bundle: fixture.bundle,
    pin: fixture.pin,
    hostRegistry: fixture.hostRegistry,
    recipes: fixture.recipes,
    artefactBytes: fixture.artefacts,
    recomputeResult: fixture.recomputeResult,
    tier: "public",
    policy: undefined,
  };
  return { ...base, ...overrides };
}
