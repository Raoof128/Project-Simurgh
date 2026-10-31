// SPDX-License-Identifier: AGPL-3.0-or-later
// Guard: neither gate script may write Python bytecode into the checkout.
//
// Two tracked .pyc files live under the frozen Stage 4U adapter surface. In CI every step that
// imports the adapter package recompiles them (the checkout mtime never matches the embedded one)
// and, without PYTHONDONTWRITEBYTECODE, rewrites them; the Git status step then fails the gate for a
// dirty tree (PR #144, run 40576071879). The export must sit before the first Python invocation so
// every step and every script a step calls inherits it.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

for (const script of ["scripts/check.sh", "scripts/check-e2e.sh"]) {
  test(`${script} exports PYTHONDONTWRITEBYTECODE=1 before any python runs`, () => {
    const text = readFileSync(script, "utf8");
    const exportAt = text.indexOf("export PYTHONDONTWRITEBYTECODE=1");
    assert.notEqual(exportAt, -1, `${script} does not export PYTHONDONTWRITEBYTECODE=1`);
    const firstPython = text.search(/\bpython3?\b/);
    assert.ok(
      firstPython === -1 || exportAt < firstPython,
      `${script}: the export at offset ${exportAt} comes after the first python invocation at ${firstPython}`
    );
  });
}
