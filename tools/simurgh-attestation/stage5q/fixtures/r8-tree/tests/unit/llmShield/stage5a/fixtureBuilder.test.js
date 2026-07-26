// fixture: an R8 member that BUILDS fixtures -> evidence_emission, not gate_definition.
import { test } from "node:test";
export function buildFixture(n) { return { n }; }
test("builder smoke", () => {});
