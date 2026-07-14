// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — anti-theatre gate (A4). Validates that the Lean model's projected claims stay bound to the
// runtime: the check order, the raw-code band, and the domain strings must match the runtime constants.
// checkProjection() returns a list of drift errors ([] = green); the test fails the build on any drift.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  VTCDELAY_CHECK_ORDER,
  VTCDELAY_WRAPPER,
  VTCDELAY_RAW_CODES,
} from "../stage4h/exitCodes.mjs";
import { DS } from "./constants.mjs";

const here = dirname(fileURLToPath(import.meta.url));

export function loadProjection() {
  return JSON.parse(readFileSync(join(here, "theorem-projection.json"), "utf8"));
}

export function checkProjection() {
  const p = loadProjection();
  const errors = [];

  // Check order must match the runtime spine exactly.
  if (JSON.stringify(p.check_order) !== JSON.stringify([...VTCDELAY_CHECK_ORDER]))
    errors.push("check_order drift: projection != VTCDELAY_CHECK_ORDER");
  if (p.wrapper !== VTCDELAY_WRAPPER) errors.push("wrapper drift");

  // Every raw code the projection references must exist in the runtime band.
  const band = new Set(Object.values(VTCDELAY_RAW_CODES));
  for (const t of p.theorems) {
    const codes = Array.isArray(t.raw_codes) ? t.raw_codes : [];
    for (const c of codes)
      if (!band.has(c)) errors.push(`theorem ${t.name} references unknown raw code ${c}`);
  }

  // Every projected domain string must be a real runtime domain (no drift in the hash separation).
  const domains = new Set(Object.values(DS));
  for (const d of p.domain_strings)
    if (!domains.has(d)) errors.push(`domain drift: ${d} not in runtime DS`);

  return errors;
}
