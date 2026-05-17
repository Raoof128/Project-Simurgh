# Stage 2.8A — Linux Foundation (PR #19) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the Linux Device Shield foundation — server-side schema dispatcher, pairing/events Linux acceptance, display-server session lock, and a Rust daemon skeleton that signs P-256 proofs, handles headless / non-local-DISPLAY cleanly, and gets accepted by the existing Node server contract.

**Architecture:** Extend Stage 2.7's shared seams (`platformScannerSchema.js`, `daemonProof.js`, `daemonPairing.js`, `daemonEvents.js`, `daemonState.js`) with a Linux platform adapter. New Rust crate under `tools/simurgh-daemon-linux/` mirrors the macOS Swift daemon and Windows .NET daemon: axum HTTP on `127.0.0.1:3031`, P-256 identity persisted under `$XDG_STATE_HOME/simurgh/`, canonical-JSON proof signing identical in shape to the existing daemons.

**Tech Stack:** Node 20 (server), Rust stable (daemon: axum, serde, serde_json, p256, sha2, tokio, x11rb-stub for headless tests). Node tests via `node --test`; Rust tests via `cargo test`. Spec: `docs/superpowers/specs/2026-05-17-stage-2-8-linux-display-integrity-design.md`.

**Scope (this PR only):** §9 steps 1–6 from the spec. Out of scope for PR #19: real X11 scanner internals (PR #20), Wayland portal probe (PR #21), Snap/Flatpak detection (PR #21), systemd unit + Ubuntu CI (PR #22), docs/closeout (PR #23).

---

## File Structure

**New files:**

- `tools/simurgh-daemon-linux/Cargo.toml`
- `tools/simurgh-daemon-linux/README.md`
- `tools/simurgh-daemon-linux/src/main.rs`
- `tools/simurgh-daemon-linux/src/config.rs`
- `tools/simurgh-daemon-linux/src/identity.rs`
- `tools/simurgh-daemon-linux/src/http.rs`
- `tools/simurgh-daemon-linux/src/proof.rs`
- `tools/simurgh-daemon-linux/src/canonical_json.rs`
- `tools/simurgh-daemon-linux/src/scanner/mod.rs`
- `tools/simurgh-daemon-linux/src/scanner/session.rs`
- `tools/simurgh-daemon-linux/src/scanner/privacy.rs`
- `tools/simurgh-daemon-linux/tests/proof_tests.rs`
- `tools/simurgh-daemon-linux/tests/session_detector_tests.rs`
- `tools/simurgh-daemon-linux/tests/headless_tests.rs`
- `tools/simurgh-daemon-linux/tests/non_local_display_tests.rs`
- `tests/unit/platformScannerSchemaDispatcher.test.js`
- `tests/unit/daemonProofLinux.test.js`
- `tests/unit/daemonPairingLinux.test.js`
- `tests/unit/daemonEventsLinux.test.js`
- `tests/unit/displayServerLock.test.js`

**Modified files:**

- `src/device/platformScannerSchema.js` — add dispatcher + `validateLinuxScannerSummary` + Linux scanner_reason invariant.
- `src/device/daemonProof.js` — accept `"linux"`, add `display_server` + `scanner_reason` field handling, add `display_server_mismatch` rejection.
- `src/device/daemonPairing.js` — Linux platform acceptance (transitive via `daemonProof.js`).
- `src/device/daemonEvents.js` — emit `DAEMON_PROOF_REJECTED` with `display_server_mismatch` reason.
- `src/device/daemonState.js` — track `display_server_locked` per session.
- `src/device/forbiddenLocalFields.js` — no change (reused as-is); just verify with new tests.

**Out of scope this PR (left as stubs):**

- `src/scanner/x11.rs`, `src/scanner/wayland.rs`, `src/scanner/xwayland.rs` — created in later PRs.

---

## Task 1: Red — Dispatcher export missing

**Files:**

- Test: `tests/unit/platformScannerSchemaDispatcher.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
import assert from "node:assert/strict";
import test from "node:test";

import {
  validateScannerSummaryForPlatform,
  validateLinuxScannerSummary,
} from "../../src/device/platformScannerSchema.js";

test("validateScannerSummaryForPlatform dispatches to platform validator", () => {
  assert.equal(typeof validateScannerSummaryForPlatform, "function");
});

test("validateLinuxScannerSummary is exported", () => {
  assert.equal(typeof validateLinuxScannerSummary, "function");
});

test("validateScannerSummaryForPlatform rejects unknown platform", () => {
  const result = validateScannerSummaryForPlatform("plan9", {});
  assert.equal(result.ok, false);
  assert.equal(result.reason, "unsupported_platform");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/platformScannerSchemaDispatcher.test.js`
Expected: FAIL with `SyntaxError: The requested module '../../src/device/platformScannerSchema.js' does not provide an export named 'validateScannerSummaryForPlatform'`.

- [ ] **Step 3: Commit the red test**

```bash
git add tests/unit/platformScannerSchemaDispatcher.test.js
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "test(stage-2-8a): red — platformScannerSchema dispatcher missing"
```

---

## Task 2: Green — Add dispatcher + Linux validator skeleton

**Files:**

- Modify: `src/device/platformScannerSchema.js`

- [ ] **Step 1: Add `"linux"` to `SUPPORTED_DEVICE_PLATFORMS`**

Edit `src/device/platformScannerSchema.js:5`:

```javascript
export const SUPPORTED_DEVICE_PLATFORMS = Object.freeze(["macos", "windows", "linux"]);
export const PLANNED_DEVICE_PLATFORMS = Object.freeze([]);
```

- [ ] **Step 2: Add Linux scanner version constant**

In `SCANNER_VERSION_BY_PLATFORM`:

```javascript
const SCANNER_VERSION_BY_PLATFORM = Object.freeze({
  macos: "2.5.0",
  windows: "2.6.0",
  linux: "2.8.0",
});
```

- [ ] **Step 3: Add Linux-specific scanner state set + reason set + display server set**

After `SCANNER_STATES`:

```javascript
export const LINUX_SCANNER_STATES = new Set([
  "healthy",
  "risk_detected",
  "restricted_detected",
  "wayland_portal_available",
  "wayland_compositor_restricted",
  "wayland_compositor_unsupported",
  "xwayland_detected",
  "permission_denied",
  "scanner_unavailable",
  "scan_error",
]);

export const LINUX_SCANNER_REASONS = new Set([
  "none",
  "no_display_server",
  "non_local_display",
  "portal_not_active",
  "portal_active_probe_unavailable",
  "sandboxed_browser_loopback_possible",
]);

export const LINUX_DISPLAY_SERVERS = new Set(["x11", "wayland", "xwayland", "headless", "unknown"]);

export const LINUX_COVERAGES = new Set([
  "x11_full",
  "wayland_limited",
  "xwayland_partial",
  "headless_none",
  "unknown",
]);

const CLEAN_LINUX_SCANNER_STATES = new Set(["healthy", "risk_detected"]);
```

- [ ] **Step 4: Add `validateLinuxScannerSummary` and dispatcher**

At the end of the file:

```javascript
export function validateLinuxScannerSummary(raw) {
  if (typeof raw.scanner_state !== "string" || !LINUX_SCANNER_STATES.has(raw.scanner_state)) {
    return fail("invalid_linux_scanner_state");
  }
  if (raw.scanner_version !== "2.8.0") return fail("invalid_linux_scanner_version");
  if (typeof raw.display_server !== "string" || !LINUX_DISPLAY_SERVERS.has(raw.display_server)) {
    return fail("invalid_linux_display_server");
  }
  if (typeof raw.coverage !== "string" || !LINUX_COVERAGES.has(raw.coverage)) {
    return fail("invalid_linux_coverage");
  }
  if (typeof raw.scanner_reason !== "string" || !LINUX_SCANNER_REASONS.has(raw.scanner_reason)) {
    return fail("invalid_linux_scanner_reason");
  }
  // Mixed-state guard: clean scanner_state must pair with scanner_reason=none.
  if (CLEAN_LINUX_SCANNER_STATES.has(raw.scanner_state) && raw.scanner_reason !== "none") {
    return fail("invalid_linux_scanner_reason");
  }
  if (typeof raw.portal_advertised !== "boolean" && raw.portal_advertised !== null) {
    return fail("invalid_linux_portal_state");
  }
  if (typeof raw.portal_active !== "boolean" && raw.portal_active !== null) {
    return fail("invalid_linux_portal_state");
  }
  if (raw.portal_active === true && raw.portal_advertised !== true) {
    return fail("invalid_linux_portal_state");
  }
  for (const key of [
    "x11_managed_window_count",
    "x11_override_redirect_window_count",
    "x11_above_window_count",
    "x11_fullscreen_window_count",
    "x11_skip_taskbar_window_count",
    "xwayland_window_count",
  ]) {
    const v = raw[key];
    if (!Number.isInteger(v) || v < 0 || v > 10_000) return fail("invalid_linux_x11_count");
  }
  if (raw.privacy_mode !== "metadata_only") return fail("invalid_privacy_mode");
  return {
    ok: true,
    fields: {
      scanner_state: raw.scanner_state,
      scanner_version: raw.scanner_version,
      display_server: raw.display_server,
      coverage: raw.coverage,
      scanner_reason: raw.scanner_reason,
      portal_advertised: raw.portal_advertised,
      portal_active: raw.portal_active,
      x11_managed_window_count: raw.x11_managed_window_count,
      x11_override_redirect_window_count: raw.x11_override_redirect_window_count,
      x11_above_window_count: raw.x11_above_window_count,
      x11_fullscreen_window_count: raw.x11_fullscreen_window_count,
      x11_skip_taskbar_window_count: raw.x11_skip_taskbar_window_count,
      xwayland_window_count: raw.xwayland_window_count,
      privacy_mode: raw.privacy_mode,
    },
  };
}

export function validateScannerSummaryForPlatform(platform, raw) {
  if (platform === "macos" || platform === "windows") return validateScannerSummary(raw);
  if (platform === "linux") return validateLinuxScannerSummary(raw);
  return fail("unsupported_platform");
}
```

- [ ] **Step 5: Run dispatcher tests + existing schema tests to verify pass + no regression**

Run: `node --test tests/unit/platformScannerSchemaDispatcher.test.js tests/unit/platformScannerSchema.test.js`
Expected: dispatcher tests PASS. **Note:** the existing test `SUPPORTED_DEVICE_PLATFORMS contains macos and windows only` will FAIL — this is expected (Linux is now supported). Update it in Task 3.

- [ ] **Step 6: Update the existing schema test to reflect Linux acceptance**

Edit `tests/unit/platformScannerSchema.test.js`:

```javascript
test("SUPPORTED_DEVICE_PLATFORMS contains macos, windows, and linux", () => {
  assert.deepEqual([...SUPPORTED_DEVICE_PLATFORMS].sort(), ["linux", "macos", "windows"]);
});

test("PLANNED_DEVICE_PLATFORMS is empty after Linux acceptance", () => {
  assert.deepEqual([...PLANNED_DEVICE_PLATFORMS], []);
});

test("isSupportedPlatform accepts linux post-Stage-2.8A", () => {
  assert.equal(isSupportedPlatform("linux"), true);
  assert.equal(isSupportedPlatform("freebsd"), false);
});
```

- [ ] **Step 7: Run all schema tests**

Run: `node --test tests/unit/platformScannerSchema.test.js tests/unit/platformScannerSchemaDispatcher.test.js`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/device/platformScannerSchema.js tests/unit/platformScannerSchema.test.js tests/unit/platformScannerSchemaDispatcher.test.js
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "feat(stage-2-8a): platformScannerSchema dispatcher + Linux validator"
```

---

## Task 3: Red — Linux proof rejected by daemonProof.js

**Files:**

- Test: `tests/unit/daemonProofLinux.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import {
  canonicaliseDaemonPayload,
  computeDaemonNodeIdHash,
  validateDaemonProof,
} from "../../src/device/daemonProof.js";

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function createSignedLinuxProof(overrides = {}) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const public_key = b64url(publicKey.export({ format: "der", type: "spki" }));
  const node_id_hash = computeDaemonNodeIdHash(public_key);
  const proof = {
    type: "simurgh.daemon.proof",
    session_id: "sess_linux",
    exam_id: "exam_linux",
    sequence: 1,
    timestamp: new Date("2026-05-17T08:00:00.000Z").toISOString(),
    node_id_hash,
    daemon_version: "2.8.0",
    platform: "linux",
    display_server: "x11",
    scanner_state: "healthy",
    scanner_version: "2.8.0",
    scanner_reason: "none",
    coverage: "x11_full",
    portal_advertised: null,
    portal_active: null,
    x11_managed_window_count: 0,
    x11_override_redirect_window_count: 0,
    x11_above_window_count: 0,
    x11_fullscreen_window_count: 0,
    x11_skip_taskbar_window_count: 0,
    xwayland_window_count: 0,
    suspicious_window_count: 0,
    visible_window_count: 0,
    capture_excluded_window_count: 0,
    helper_state: "healthy",
    privacy_mode: "metadata_only",
    challenge: b64url(crypto.randomBytes(32)),
    ...overrides,
  };
  const signature = crypto.sign("sha256", Buffer.from(canonicaliseDaemonPayload(proof)), {
    key: privateKey,
    dsaEncoding: "der",
  });
  return { proof: { ...proof, signature: b64url(signature) }, public_key };
}

test("valid Linux daemon proof is accepted", () => {
  const { proof, public_key } = createSignedLinuxProof();
  const result = validateDaemonProof(proof, {
    now: Date.parse("2026-05-17T08:00:02.000Z"),
    expectedSessionId: "sess_linux",
    expectedExamId: "exam_linux",
    pairedNode: { node_id_hash: proof.node_id_hash, public_key },
  });
  assert.equal(result.ok, true, JSON.stringify(result));
});

test("Linux proof with mixed state (healthy + non-none reason) is rejected", () => {
  const { proof, public_key } = createSignedLinuxProof({
    scanner_state: "healthy",
    scanner_reason: "non_local_display",
  });
  // Re-sign because we mutated fields after createSignedLinuxProof builds the signature.
  // (Engineer note: createSignedLinuxProof signs after overrides are applied, so this
  // already has a fresh signature — no re-sign needed.)
  const result = validateDaemonProof(proof, {
    now: Date.parse("2026-05-17T08:00:02.000Z"),
    expectedSessionId: "sess_linux",
    expectedExamId: "exam_linux",
    pairedNode: { node_id_hash: proof.node_id_hash, public_key },
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "invalid_linux_scanner_reason");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/daemonProofLinux.test.js`
Expected: FAIL. First test fails with `unsupported_daemon_version` (because `2.8.0` is not in `SUPPORTED_DAEMON_VERSIONS`), or `validateScannerSummary` issues (because the current single-shape validator does not know Linux fields).

- [ ] **Step 3: Commit red test**

```bash
git add tests/unit/daemonProofLinux.test.js
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "test(stage-2-8a): red — Linux daemon proof not accepted"
```

---

## Task 4: Green — Accept Linux proofs in daemonProof.js

**Files:**

- Modify: `src/device/daemonProof.js`

- [ ] **Step 1: Add `2.8.0` to supported daemon versions**

Edit `src/device/daemonProof.js:11`:

```javascript
const SUPPORTED_DAEMON_VERSIONS = new Set(["0.4.5", "0.4.7", "0.4.11", "2.8.0"]);
```

- [ ] **Step 2: Replace direct `validateScannerSummary` call with dispatcher**

Find every use of `validateScannerSummary(raw)` in `daemonProof.js` and change to:

```javascript
import {
  SUPPORTED_DEVICE_PLATFORMS,
  validateScannerSummaryForPlatform,
} from "./platformScannerSchema.js";
// ...
const scannerValidation = validateScannerSummaryForPlatform(raw.platform, raw);
```

(Do this in both `validateDaemonProof` and `validateDaemonPairingPayload` if scanner fields apply.)

- [ ] **Step 3: Add Linux-specific required fields when `platform === "linux"`**

Inside `validateDaemonProof`, after the `SUPPORTED_DEVICE_PLATFORMS.includes` check:

```javascript
if (raw.platform === "linux") {
  for (const field of [
    "display_server",
    "scanner_state",
    "scanner_version",
    "scanner_reason",
    "coverage",
  ]) {
    if (!(field in raw)) return fail(`missing_field:${field}`);
  }
}
```

- [ ] **Step 4: Run Linux proof tests**

Run: `node --test tests/unit/daemonProofLinux.test.js`
Expected: PASS (both tests).

- [ ] **Step 5: Run full unit test suite to confirm no regression**

Run: `npm test`
Expected: all tests pass (273 prior + 2 new = 275 minimum).

- [ ] **Step 6: Commit**

```bash
git add src/device/daemonProof.js
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "feat(stage-2-8a): accept Linux daemon proofs via dispatcher"
```

---

## Task 5: Red — display_server_mismatch rejection

**Files:**

- Test: `tests/unit/displayServerLock.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
import assert from "node:assert/strict";
import test from "node:test";

import { createDisplayServerLock } from "../../src/device/daemonState.js";

test("first proof locks display_server for the session", () => {
  const lock = createDisplayServerLock();
  const r1 = lock.observe("sess_a", "x11");
  assert.equal(r1.ok, true);
  assert.equal(r1.locked_display_server, "x11");
});

test("second proof with same display_server is accepted", () => {
  const lock = createDisplayServerLock();
  lock.observe("sess_a", "x11");
  const r2 = lock.observe("sess_a", "x11");
  assert.equal(r2.ok, true);
});

test("second proof with different display_server is rejected", () => {
  const lock = createDisplayServerLock();
  lock.observe("sess_a", "x11");
  const r2 = lock.observe("sess_a", "wayland");
  assert.equal(r2.ok, false);
  assert.equal(r2.reason, "display_server_mismatch");
  assert.equal(r2.locked_display_server, "x11");
});

test("different sessions track display_server independently", () => {
  const lock = createDisplayServerLock();
  lock.observe("sess_a", "x11");
  const r = lock.observe("sess_b", "wayland");
  assert.equal(r.ok, true);
  assert.equal(r.locked_display_server, "wayland");
});

test("evict removes session lock", () => {
  const lock = createDisplayServerLock();
  lock.observe("sess_a", "x11");
  lock.evict("sess_a");
  const r = lock.observe("sess_a", "wayland");
  assert.equal(r.ok, true);
  assert.equal(r.locked_display_server, "wayland");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/displayServerLock.test.js`
Expected: FAIL with `does not provide an export named 'createDisplayServerLock'`.

- [ ] **Step 3: Commit red test**

```bash
git add tests/unit/displayServerLock.test.js
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "test(stage-2-8a): red — display_server session lock missing"
```

---

## Task 6: Green — Implement createDisplayServerLock

**Files:**

- Modify: `src/device/daemonState.js`

- [ ] **Step 1: Add the lock factory**

Append to `src/device/daemonState.js`:

```javascript
export function createDisplayServerLock() {
  const locked = new Map();
  return {
    observe(sessionId, displayServer) {
      const existing = locked.get(sessionId);
      if (existing === undefined) {
        locked.set(sessionId, displayServer);
        return { ok: true, locked_display_server: displayServer };
      }
      if (existing !== displayServer) {
        return {
          ok: false,
          reason: "display_server_mismatch",
          locked_display_server: existing,
          observed_display_server: displayServer,
        };
      }
      return { ok: true, locked_display_server: existing };
    },
    evict(sessionId) {
      locked.delete(sessionId);
    },
    evictMissing(activeIds) {
      for (const sessionId of locked.keys()) {
        if (!activeIds.has(sessionId)) locked.delete(sessionId);
      }
    },
  };
}
```

- [ ] **Step 2: Run test to verify pass**

Run: `node --test tests/unit/displayServerLock.test.js`
Expected: PASS (all 5 tests).

- [ ] **Step 3: Commit**

```bash
git add src/device/daemonState.js
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "feat(stage-2-8a): display_server session lock factory"
```

---

## Task 7: Red — Linux pairing acceptance

**Files:**

- Test: `tests/unit/daemonPairingLinux.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import {
  canonicaliseDaemonPayload,
  computeDaemonNodeIdHash,
  validateDaemonPairingPayload,
} from "../../src/device/daemonProof.js";

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function createLinuxPairing() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const public_key = b64url(publicKey.export({ format: "der", type: "spki" }));
  const node_id_hash = computeDaemonNodeIdHash(public_key);
  const signed_payload = {
    type: "simurgh.daemon.pair",
    session_id: "sess_linux",
    exam_id: "exam_linux",
    challenge: b64url(crypto.randomBytes(32)),
    timestamp: new Date("2026-05-17T08:00:00.000Z").toISOString(),
    node_id_hash,
    daemon_version: "2.8.0",
    platform: "linux",
  };
  const signature = b64url(
    crypto.sign("sha256", Buffer.from(canonicaliseDaemonPayload(signed_payload)), {
      key: privateKey,
      dsaEncoding: "der",
    })
  );
  return { pairing: { node_id_hash, public_key, signature, signed_payload }, public_key };
}

test("Linux pairing is accepted", () => {
  const { pairing } = createLinuxPairing();
  const result = validateDaemonPairingPayload(pairing, {
    now: Date.parse("2026-05-17T08:00:02.000Z"),
    expectedSessionId: "sess_linux",
    expectedExamId: "exam_linux",
  });
  assert.equal(result.ok, true, JSON.stringify(result));
});

test("unknown platform pairing still rejected (regression guard)", () => {
  const { pairing } = createLinuxPairing();
  pairing.signed_payload.platform = "plan9";
  // Re-sign with the mutated payload would require the private key; instead
  // assert the validator rejects on platform even before signature check.
  const result = validateDaemonPairingPayload(pairing, {
    now: Date.parse("2026-05-17T08:00:02.000Z"),
    expectedSessionId: "sess_linux",
    expectedExamId: "exam_linux",
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "unsupported_platform");
});
```

- [ ] **Step 2: Run to verify**

Run: `node --test tests/unit/daemonPairingLinux.test.js`
Expected: First test should PASS (Task 4 already accepted Linux platform); second test PASS. If first fails, the dispatcher wiring missed pairing — fix by ensuring `validateDaemonPairingPayload` uses `SUPPORTED_DEVICE_PLATFORMS` (which it already does, line 219).

- [ ] **Step 3: Commit**

```bash
git add tests/unit/daemonPairingLinux.test.js
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "test(stage-2-8a): Linux pairing acceptance + unknown-platform regression"
```

---

## Task 8: Red — daemonEvents emits display_server_mismatch reason

**Files:**

- Test: `tests/unit/daemonEventsLinux.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
import assert from "node:assert/strict";
import test from "node:test";

import {
  DAEMON_EVENT_TYPES,
  buildDaemonProofRejectedEvent,
} from "../../src/device/daemonEvents.js";

test("DAEMON_PROOF_REJECTED event type exists", () => {
  assert.equal(DAEMON_EVENT_TYPES.DAEMON_PROOF_REJECTED, "DAEMON_PROOF_REJECTED");
});

test("buildDaemonProofRejectedEvent emits display_server_mismatch reason", () => {
  const event = buildDaemonProofRejectedEvent({
    session_id: "sess_linux",
    reason: "display_server_mismatch",
    locked_display_server: "x11",
    observed_display_server: "wayland",
  });
  assert.equal(event.type, "DAEMON_PROOF_REJECTED");
  assert.equal(event.reason, "display_server_mismatch");
  assert.equal(event.locked_display_server, "x11");
  assert.equal(event.observed_display_server, "wayland");
  assert.ok(!("window_title" in event));
  assert.ok(!("pid" in event));
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/daemonEventsLinux.test.js`
Expected: FAIL with `does not provide an export named 'buildDaemonProofRejectedEvent'` (or partial pass on the type constant).

- [ ] **Step 3: Commit red test**

```bash
git add tests/unit/daemonEventsLinux.test.js
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "test(stage-2-8a): red — daemonEvents lacks proof-rejected builder"
```

---

## Task 9: Green — Add buildDaemonProofRejectedEvent

**Files:**

- Modify: `src/device/daemonEvents.js`

- [ ] **Step 1: Add the builder**

Append to `src/device/daemonEvents.js`:

```javascript
import { containsForbiddenLocalFieldDeep } from "./forbiddenLocalFields.js";

export function buildDaemonProofRejectedEvent({
  session_id,
  reason,
  locked_display_server = null,
  observed_display_server = null,
}) {
  const event = {
    type: DAEMON_EVENT_TYPES.DAEMON_PROOF_REJECTED,
    session_id,
    reason,
  };
  if (locked_display_server !== null) event.locked_display_server = locked_display_server;
  if (observed_display_server !== null) event.observed_display_server = observed_display_server;
  if (containsForbiddenLocalFieldDeep(event)) {
    throw new Error("daemon_event_emits_forbidden_local_field");
  }
  return event;
}
```

- [ ] **Step 2: Run test**

Run: `node --test tests/unit/daemonEventsLinux.test.js`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/device/daemonEvents.js
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "feat(stage-2-8a): emit DAEMON_PROOF_REJECTED with display_server_mismatch"
```

---

## Task 10: Green — Privacy audit + full suite pass

**Files:**

- Verify-only.

- [ ] **Step 1: Run privacy audit**

Run: `node tools/privacy-audit.mjs`
Expected: PASS (the new Linux scanner fields are all metadata-only; no raw forbidden names were introduced).

- [ ] **Step 2: Run full Node suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 3: Run `npm audit`**

Run: `npm audit --audit-level=high`
Expected: 0 high vulnerabilities.

- [ ] **Step 4: Commit checkpoint (if any drift)**

```bash
git status
# If clean, skip. If audit produced lockfile drift, commit it.
```

---

## Task 11: Rust daemon crate skeleton

**Files:**

- Create: `tools/simurgh-daemon-linux/Cargo.toml`
- Create: `tools/simurgh-daemon-linux/README.md`
- Create: `tools/simurgh-daemon-linux/src/main.rs`
- Create: `tools/simurgh-daemon-linux/src/config.rs`
- Create: `tools/simurgh-daemon-linux/src/http.rs`

- [ ] **Step 1: Confirm Rust toolchain available**

Run: `rustc --version && cargo --version`
Expected: stable 1.70+. If missing, install via `rustup` before continuing.

- [ ] **Step 2: Create `Cargo.toml`**

Write `tools/simurgh-daemon-linux/Cargo.toml`:

```toml
[package]
name = "simurgh-daemon-linux"
version = "2.8.0"
edition = "2021"
description = "Project Simurgh Linux Device Shield daemon — research prototype."
license = "MIT"

[dependencies]
axum = { version = "0.7", default-features = false, features = ["http1", "json", "tokio"] }
tokio = { version = "1", features = ["macros", "rt-multi-thread", "net", "signal"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
p256 = { version = "0.13", features = ["ecdsa", "pem", "pkcs8"] }
sha2 = "0.10"
base64 = "0.22"
hyper = "1"
tower = "0.5"
tower-http = { version = "0.5", features = ["limit", "cors"] }
anyhow = "1"
thiserror = "1"

[dev-dependencies]
reqwest = { version = "0.12", default-features = false, features = ["json", "rustls-tls"] }
tokio = { version = "1", features = ["macros", "rt-multi-thread", "test-util"] }
```

- [ ] **Step 3: Create `src/config.rs`**

Write `tools/simurgh-daemon-linux/src/config.rs`:

```rust
use std::net::{IpAddr, Ipv4Addr};

pub const DAEMON_VERSION: &str = "2.8.0";
pub const SCANNER_VERSION: &str = "2.8.0";
pub const DAEMON_PLATFORM: &str = "linux";
pub const DEFAULT_PORT: u16 = 3031;
pub const DEFAULT_ALLOWED_ORIGIN: &str = "http://localhost:3030";
pub const MAX_BODY_BYTES: usize = 64 * 1024;

pub struct DaemonConfig {
    pub bind: IpAddr,
    pub port: u16,
    pub allowed_origin: String,
}

impl Default for DaemonConfig {
    fn default() -> Self {
        Self {
            bind: IpAddr::V4(Ipv4Addr::LOCALHOST),
            port: DEFAULT_PORT,
            allowed_origin: DEFAULT_ALLOWED_ORIGIN.to_string(),
        }
    }
}
```

- [ ] **Step 4: Create `src/http.rs`**

Write `tools/simurgh-daemon-linux/src/http.rs`:

```rust
use axum::{routing::get, Json, Router};
use serde::Serialize;

use crate::config::{DAEMON_PLATFORM, DAEMON_VERSION};

#[derive(Serialize)]
pub struct HealthResponse {
    pub ok: bool,
    pub platform: &'static str,
    pub daemon_version: &'static str,
    pub privacy_mode: &'static str,
}

pub fn router() -> Router {
    Router::new().route("/health", get(health))
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        ok: true,
        platform: DAEMON_PLATFORM,
        daemon_version: DAEMON_VERSION,
        privacy_mode: "metadata_only",
    })
}
```

- [ ] **Step 5: Create `src/main.rs`**

Write `tools/simurgh-daemon-linux/src/main.rs`:

```rust
mod config;
mod http;

use anyhow::Result;
use std::net::SocketAddr;

use crate::config::DaemonConfig;

#[tokio::main]
async fn main() -> Result<()> {
    let cfg = DaemonConfig::default();
    let addr = SocketAddr::new(cfg.bind, cfg.port);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    eprintln!("simurgh-daemon-linux listening on {addr}");
    axum::serve(listener, http::router()).await?;
    Ok(())
}
```

- [ ] **Step 6: Create minimal README**

Write `tools/simurgh-daemon-linux/README.md`:

```markdown
# simurgh-daemon-linux

Project Simurgh Linux Device Shield daemon. Research prototype. Listens on
`127.0.0.1:3031`. See `docs/superpowers/specs/2026-05-17-stage-2-8-linux-display-integrity-design.md`.

## Build
```

cargo build --release

```

## Run
```

cargo run -- --port 3031

```

```

- [ ] **Step 7: Build to verify it compiles**

Run: `cargo build --manifest-path tools/simurgh-daemon-linux/Cargo.toml`
Expected: build succeeds (may take several minutes on first build).

- [ ] **Step 8: Commit**

```bash
git add tools/simurgh-daemon-linux/
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "feat(stage-2-8a): Rust daemon crate skeleton with /health endpoint"
```

---

## Task 12: Display session detector + /status

**Files:**

- Create: `tools/simurgh-daemon-linux/src/scanner/mod.rs`
- Create: `tools/simurgh-daemon-linux/src/scanner/session.rs`
- Create: `tools/simurgh-daemon-linux/tests/session_detector_tests.rs`
- Modify: `tools/simurgh-daemon-linux/src/http.rs`
- Modify: `tools/simurgh-daemon-linux/src/main.rs`

- [ ] **Step 1: Write failing test**

Write `tools/simurgh-daemon-linux/tests/session_detector_tests.rs`:

```rust
use simurgh_daemon_linux::scanner::session::{detect, SessionEnv};

#[test]
fn headless_when_no_env_is_set() {
    let env = SessionEnv {
        xdg_session_type: None,
        wayland_display: None,
        x_display: None,
    };
    let s = detect(&env);
    assert_eq!(s.display_server, "headless");
    assert_eq!(s.scanner_reason, "no_display_server");
}

#[test]
fn x11_when_display_set() {
    let env = SessionEnv {
        xdg_session_type: Some("x11".into()),
        wayland_display: None,
        x_display: Some(":0".into()),
    };
    let s = detect(&env);
    assert_eq!(s.display_server, "x11");
    assert_eq!(s.scanner_reason, "none");
}

#[test]
fn wayland_when_wayland_display_set() {
    let env = SessionEnv {
        xdg_session_type: Some("wayland".into()),
        wayland_display: Some("wayland-0".into()),
        x_display: None,
    };
    let s = detect(&env);
    assert_eq!(s.display_server, "wayland");
}

#[test]
fn xwayland_when_wayland_and_display_both_set() {
    let env = SessionEnv {
        xdg_session_type: Some("wayland".into()),
        wayland_display: Some("wayland-0".into()),
        x_display: Some(":0".into()),
    };
    let s = detect(&env);
    assert_eq!(s.display_server, "xwayland");
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `cargo test --manifest-path tools/simurgh-daemon-linux/Cargo.toml session_detector`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Add library exposure to main.rs**

At top of `tools/simurgh-daemon-linux/src/main.rs`, add a `lib.rs` peer. Create `tools/simurgh-daemon-linux/src/lib.rs`:

```rust
pub mod config;
pub mod http;
pub mod scanner;
```

Then update `Cargo.toml` to expose both bin and lib:

```toml
[lib]
name = "simurgh_daemon_linux"
path = "src/lib.rs"

[[bin]]
name = "simurgh-daemon-linux"
path = "src/main.rs"
```

Update `src/main.rs` first line set to:

```rust
use simurgh_daemon_linux::{config::DaemonConfig, http};
```

Remove `mod config;` and `mod http;` from `main.rs`.

- [ ] **Step 4: Implement session detector**

Write `tools/simurgh-daemon-linux/src/scanner/mod.rs`:

```rust
pub mod session;
```

Write `tools/simurgh-daemon-linux/src/scanner/session.rs`:

```rust
#[derive(Debug, Clone)]
pub struct SessionEnv {
    pub xdg_session_type: Option<String>,
    pub wayland_display: Option<String>,
    pub x_display: Option<String>,
}

impl SessionEnv {
    pub fn from_process_env() -> Self {
        Self {
            xdg_session_type: std::env::var("XDG_SESSION_TYPE").ok(),
            wayland_display: std::env::var("WAYLAND_DISPLAY").ok(),
            x_display: std::env::var("DISPLAY").ok(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct SessionDetection {
    pub display_server: &'static str,
    pub scanner_state: &'static str,
    pub scanner_reason: &'static str,
    pub coverage: &'static str,
}

pub fn detect(env: &SessionEnv) -> SessionDetection {
    let has_wl = env.wayland_display.is_some();
    let has_x = env.x_display.is_some();
    match (has_wl, has_x) {
        (false, false) => SessionDetection {
            display_server: "headless",
            scanner_state: "scanner_unavailable",
            scanner_reason: "no_display_server",
            coverage: "headless_none",
        },
        (true, true) => SessionDetection {
            display_server: "xwayland",
            scanner_state: "xwayland_detected",
            scanner_reason: "none",
            coverage: "xwayland_partial",
        },
        (true, false) => SessionDetection {
            display_server: "wayland",
            scanner_state: "wayland_compositor_restricted",
            scanner_reason: "none",
            coverage: "wayland_limited",
        },
        (false, true) => SessionDetection {
            display_server: "x11",
            scanner_state: "healthy",
            scanner_reason: "none",
            coverage: "x11_full",
        },
    }
}
```

- [ ] **Step 5: Run tests to verify pass**

Run: `cargo test --manifest-path tools/simurgh-daemon-linux/Cargo.toml session_detector`
Expected: PASS (all 4 tests).

- [ ] **Step 6: Wire /status endpoint**

Update `tools/simurgh-daemon-linux/src/http.rs`:

```rust
use axum::{routing::get, Json, Router};
use serde::Serialize;

use crate::config::{DAEMON_PLATFORM, DAEMON_VERSION, SCANNER_VERSION};
use crate::scanner::session::{detect, SessionEnv};

#[derive(Serialize)]
pub struct HealthResponse {
    pub ok: bool,
    pub platform: &'static str,
    pub daemon_version: &'static str,
    pub privacy_mode: &'static str,
}

#[derive(Serialize)]
pub struct StatusResponse {
    pub platform: &'static str,
    pub daemon_version: &'static str,
    pub scanner_version: &'static str,
    pub display_server: &'static str,
    pub scanner_state: &'static str,
    pub scanner_reason: &'static str,
    pub coverage: &'static str,
    pub privacy_mode: &'static str,
}

pub fn router() -> Router {
    Router::new().route("/health", get(health)).route("/status", get(status))
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        ok: true,
        platform: DAEMON_PLATFORM,
        daemon_version: DAEMON_VERSION,
        privacy_mode: "metadata_only",
    })
}

async fn status() -> Json<StatusResponse> {
    let det = detect(&SessionEnv::from_process_env());
    Json(StatusResponse {
        platform: DAEMON_PLATFORM,
        daemon_version: DAEMON_VERSION,
        scanner_version: SCANNER_VERSION,
        display_server: det.display_server,
        scanner_state: det.scanner_state,
        scanner_reason: det.scanner_reason,
        coverage: det.coverage,
        privacy_mode: "metadata_only",
    })
}
```

- [ ] **Step 7: Build + test**

Run: `cargo build --manifest-path tools/simurgh-daemon-linux/Cargo.toml && cargo test --manifest-path tools/simurgh-daemon-linux/Cargo.toml`
Expected: build OK, all tests PASS.

- [ ] **Step 8: Commit**

```bash
git add tools/simurgh-daemon-linux/
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "feat(stage-2-8a): display session detector + /status endpoint"
```

---

## Task 13: Identity (P-256 key generation + persistence)

**Files:**

- Create: `tools/simurgh-daemon-linux/src/identity.rs`
- Create: `tools/simurgh-daemon-linux/tests/proof_tests.rs` (partial — identity only here)

- [ ] **Step 1: Write failing test**

Write `tools/simurgh-daemon-linux/tests/proof_tests.rs`:

```rust
use simurgh_daemon_linux::identity::{load_or_create_identity, IdentityPaths};
use std::fs;
use std::os::unix::fs::PermissionsExt;
use tempfile::tempdir;

#[test]
fn identity_file_created_with_0600_permissions() {
    let dir = tempdir().unwrap();
    let paths = IdentityPaths {
        state_dir: dir.path().join("simurgh"),
        identity_file: dir.path().join("simurgh/daemon-identity.pem"),
    };
    let id = load_or_create_identity(&paths).unwrap();
    let meta = fs::metadata(&paths.identity_file).unwrap();
    assert_eq!(meta.permissions().mode() & 0o777, 0o600);
    let dir_meta = fs::metadata(&paths.state_dir).unwrap();
    assert_eq!(dir_meta.permissions().mode() & 0o777, 0o700);
    let node_hash = id.node_id_hash();
    assert!(node_hash.starts_with("sha256:"));
    assert_eq!(node_hash.len(), "sha256:".len() + 64);
}

#[test]
fn identity_is_stable_across_loads() {
    let dir = tempdir().unwrap();
    let paths = IdentityPaths {
        state_dir: dir.path().join("simurgh"),
        identity_file: dir.path().join("simurgh/daemon-identity.pem"),
    };
    let id1 = load_or_create_identity(&paths).unwrap();
    let id2 = load_or_create_identity(&paths).unwrap();
    assert_eq!(id1.node_id_hash(), id2.node_id_hash());
    assert_eq!(id1.public_key_b64url(), id2.public_key_b64url());
}
```

- [ ] **Step 2: Add `tempfile` dev-dep**

Edit `Cargo.toml` dev-dependencies:

```toml
tempfile = "3"
```

- [ ] **Step 3: Run test to verify failure**

Run: `cargo test --manifest-path tools/simurgh-daemon-linux/Cargo.toml proof_tests`
Expected: FAIL — `identity` module missing.

- [ ] **Step 4: Implement identity module**

Write `tools/simurgh-daemon-linux/src/identity.rs`:

```rust
use anyhow::{Context, Result};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use p256::ecdsa::{Signature, SigningKey};
use p256::pkcs8::{DecodePrivateKey, EncodePrivateKey, EncodePublicKey, LineEnding};
use p256::PublicKey;
use sha2::{Digest, Sha256};
use std::fs;
use std::os::unix::fs::PermissionsExt;
use std::path::PathBuf;

pub struct IdentityPaths {
    pub state_dir: PathBuf,
    pub identity_file: PathBuf,
}

impl IdentityPaths {
    pub fn from_xdg() -> Self {
        let state_home = std::env::var("XDG_STATE_HOME")
            .ok()
            .map(PathBuf::from)
            .unwrap_or_else(|| {
                let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".into());
                PathBuf::from(home).join(".local/state")
            });
        let state_dir = state_home.join("simurgh");
        let identity_file = state_dir.join("daemon-identity.pem");
        Self { state_dir, identity_file }
    }
}

pub struct Identity {
    signing_key: SigningKey,
    public_key_spki_der: Vec<u8>,
}

impl Identity {
    pub fn node_id_hash(&self) -> String {
        let mut hasher = Sha256::new();
        hasher.update(&self.public_key_spki_der);
        let digest = hasher.finalize();
        format!("sha256:{}", hex::encode(digest))
    }

    pub fn public_key_b64url(&self) -> String {
        URL_SAFE_NO_PAD.encode(&self.public_key_spki_der)
    }

    pub fn sign(&self, message: &[u8]) -> String {
        use p256::ecdsa::signature::Signer;
        let sig: Signature = self.signing_key.sign(message);
        URL_SAFE_NO_PAD.encode(sig.to_der().as_bytes())
    }
}

pub fn load_or_create_identity(paths: &IdentityPaths) -> Result<Identity> {
    fs::create_dir_all(&paths.state_dir).context("create state dir")?;
    let mut perm = fs::metadata(&paths.state_dir)?.permissions();
    perm.set_mode(0o700);
    fs::set_permissions(&paths.state_dir, perm)?;

    let signing_key = if paths.identity_file.exists() {
        let pem = fs::read_to_string(&paths.identity_file)?;
        SigningKey::from_pkcs8_pem(&pem).context("decode identity PEM")?
    } else {
        let sk = SigningKey::random(&mut rand_core::OsRng);
        let pem = sk.to_pkcs8_pem(LineEnding::LF)?;
        fs::write(&paths.identity_file, pem.as_str())?;
        let mut perm = fs::metadata(&paths.identity_file)?.permissions();
        perm.set_mode(0o600);
        fs::set_permissions(&paths.identity_file, perm)?;
        sk
    };

    let public_key: PublicKey = signing_key.verifying_key().into();
    let public_key_spki_der = public_key.to_public_key_der()?.as_bytes().to_vec();

    Ok(Identity { signing_key, public_key_spki_der })
}
```

Add deps in `Cargo.toml`:

```toml
hex = "0.4"
rand_core = { version = "0.6", features = ["getrandom"] }
```

Also add `pub mod identity;` to `tools/simurgh-daemon-linux/src/lib.rs`.

- [ ] **Step 5: Run identity tests**

Run: `cargo test --manifest-path tools/simurgh-daemon-linux/Cargo.toml proof_tests`
Expected: PASS (both tests).

- [ ] **Step 6: Commit**

```bash
git add tools/simurgh-daemon-linux/
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "feat(stage-2-8a): P-256 identity with XDG state, 0600/0700 perms"
```

---

## Task 14: Canonical JSON + proof signing

**Files:**

- Create: `tools/simurgh-daemon-linux/src/canonical_json.rs`
- Create: `tools/simurgh-daemon-linux/src/proof.rs`
- Append to `tools/simurgh-daemon-linux/tests/proof_tests.rs`

- [ ] **Step 1: Append failing tests**

Append to `tools/simurgh-daemon-linux/tests/proof_tests.rs`:

```rust
use simurgh_daemon_linux::canonical_json::canonicalise;
use simurgh_daemon_linux::proof::{build_proof, ProofInputs};
use serde_json::json;

#[test]
fn canonicalise_sorts_keys_and_excludes_signature() {
    let v = json!({ "z": 1, "a": 2, "signature": "drop_me" });
    let s = canonicalise(&v);
    assert_eq!(s, r#"{"a":2,"z":1}"#);
}

#[test]
fn build_proof_signature_verifies_against_canonical_payload() {
    use p256::ecdsa::{signature::Verifier, Signature, VerifyingKey};
    use p256::pkcs8::DecodePublicKey;
    use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};

    let dir = tempfile::tempdir().unwrap();
    let paths = simurgh_daemon_linux::identity::IdentityPaths {
        state_dir: dir.path().join("simurgh"),
        identity_file: dir.path().join("simurgh/daemon-identity.pem"),
    };
    let id = simurgh_daemon_linux::identity::load_or_create_identity(&paths).unwrap();

    let inputs = ProofInputs {
        session_id: "sess_test".into(),
        exam_id: "exam_test".into(),
        sequence: 1,
        timestamp: "2026-05-17T08:00:00.000Z".into(),
        challenge: "Y2hhbGxlbmdl".into(),
        display_server: "x11",
        scanner_state: "healthy",
        scanner_reason: "none",
        coverage: "x11_full",
        portal_advertised: None,
        portal_active: None,
        x11_counts: [0, 0, 0, 0, 0],
        xwayland_window_count: 0,
        suspicious_window_count: 0,
        visible_window_count: 0,
    };
    let proof = build_proof(&id, &inputs);

    // Verify signature against canonical payload (sans signature key).
    let mut without_sig = proof.clone();
    without_sig.as_object_mut().unwrap().remove("signature");
    let canonical = canonicalise(&without_sig);
    let sig_b64 = proof["signature"].as_str().unwrap();
    let sig_bytes = URL_SAFE_NO_PAD.decode(sig_b64).unwrap();
    let sig = Signature::from_der(&sig_bytes).unwrap();
    let pk_bytes = URL_SAFE_NO_PAD.decode(id.public_key_b64url()).unwrap();
    let pk = p256::PublicKey::from_public_key_der(&pk_bytes).unwrap();
    let vk = VerifyingKey::from(&pk);
    vk.verify(canonical.as_bytes(), &sig).expect("signature verifies");
}
```

- [ ] **Step 2: Run to verify failure**

Run: `cargo test --manifest-path tools/simurgh-daemon-linux/Cargo.toml proof_tests::canonicalise_sorts_keys`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement canonical JSON**

Write `tools/simurgh-daemon-linux/src/canonical_json.rs`:

```rust
use serde_json::{Map, Value};

pub fn canonicalise(value: &Value) -> String {
    let v = strip_signature_and_sort(value);
    serde_json::to_string(&v).expect("serialisable")
}

fn strip_signature_and_sort(value: &Value) -> Value {
    match value {
        Value::Object(map) => {
            let mut sorted: Map<String, Value> = Map::new();
            let mut keys: Vec<&String> = map.keys().filter(|k| k.as_str() != "signature").collect();
            keys.sort();
            for k in keys {
                sorted.insert(k.clone(), strip_signature_and_sort(&map[k]));
            }
            Value::Object(sorted)
        }
        Value::Array(items) => Value::Array(items.iter().map(strip_signature_and_sort).collect()),
        other => other.clone(),
    }
}
```

- [ ] **Step 4: Implement proof builder**

Write `tools/simurgh-daemon-linux/src/proof.rs`:

```rust
use serde_json::{json, Value};

use crate::canonical_json::canonicalise;
use crate::config::{DAEMON_PLATFORM, DAEMON_VERSION, SCANNER_VERSION};
use crate::identity::Identity;

pub struct ProofInputs {
    pub session_id: String,
    pub exam_id: String,
    pub sequence: u64,
    pub timestamp: String,
    pub challenge: String,
    pub display_server: &'static str,
    pub scanner_state: &'static str,
    pub scanner_reason: &'static str,
    pub coverage: &'static str,
    pub portal_advertised: Option<bool>,
    pub portal_active: Option<bool>,
    pub x11_counts: [u32; 5], // managed, override_redirect, above, fullscreen, skip_taskbar
    pub xwayland_window_count: u32,
    pub suspicious_window_count: u32,
    pub visible_window_count: u32,
}

pub fn build_proof(id: &Identity, i: &ProofInputs) -> Value {
    let mut payload = json!({
        "type": "simurgh.daemon.proof",
        "session_id": i.session_id,
        "exam_id": i.exam_id,
        "sequence": i.sequence,
        "timestamp": i.timestamp,
        "node_id_hash": id.node_id_hash(),
        "daemon_version": DAEMON_VERSION,
        "platform": DAEMON_PLATFORM,
        "display_server": i.display_server,
        "scanner_state": i.scanner_state,
        "scanner_version": SCANNER_VERSION,
        "scanner_reason": i.scanner_reason,
        "coverage": i.coverage,
        "portal_advertised": i.portal_advertised,
        "portal_active": i.portal_active,
        "x11_managed_window_count": i.x11_counts[0],
        "x11_override_redirect_window_count": i.x11_counts[1],
        "x11_above_window_count": i.x11_counts[2],
        "x11_fullscreen_window_count": i.x11_counts[3],
        "x11_skip_taskbar_window_count": i.x11_counts[4],
        "xwayland_window_count": i.xwayland_window_count,
        "suspicious_window_count": i.suspicious_window_count,
        "visible_window_count": i.visible_window_count,
        "capture_excluded_window_count": 0,
        "helper_state": "healthy",
        "privacy_mode": "metadata_only",
        "challenge": i.challenge,
    });
    let canonical = canonicalise(&payload);
    let signature = id.sign(canonical.as_bytes());
    payload.as_object_mut().unwrap().insert("signature".into(), Value::String(signature));
    payload
}
```

Add `pub mod canonical_json; pub mod proof;` to `lib.rs`.

- [ ] **Step 5: Run tests**

Run: `cargo test --manifest-path tools/simurgh-daemon-linux/Cargo.toml`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add tools/simurgh-daemon-linux/
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "feat(stage-2-8a): canonical JSON + P-256 proof builder"
```

---

## Task 15: Non-local DISPLAY refusal

**Files:**

- Modify: `tools/simurgh-daemon-linux/src/scanner/session.rs`
- Create: `tools/simurgh-daemon-linux/tests/non_local_display_tests.rs`

- [ ] **Step 1: Write failing test**

Write `tools/simurgh-daemon-linux/tests/non_local_display_tests.rs`:

```rust
use simurgh_daemon_linux::scanner::session::{detect, SessionEnv};

#[test]
fn local_display_colon_zero_allowed() {
    let env = SessionEnv {
        xdg_session_type: Some("x11".into()),
        wayland_display: None,
        x_display: Some(":0".into()),
    };
    let s = detect(&env);
    assert_eq!(s.display_server, "x11");
    assert_eq!(s.scanner_reason, "none");
}

#[test]
fn local_unix_display_allowed() {
    let env = SessionEnv {
        xdg_session_type: Some("x11".into()),
        wayland_display: None,
        x_display: Some("unix/:0".into()),
    };
    let s = detect(&env);
    assert_eq!(s.display_server, "x11");
}

#[test]
fn remote_hostname_display_refused() {
    let env = SessionEnv {
        xdg_session_type: Some("x11".into()),
        wayland_display: None,
        x_display: Some("host.tld:0".into()),
    };
    let s = detect(&env);
    assert_eq!(s.display_server, "x11");
    assert_eq!(s.scanner_state, "scanner_unavailable");
    assert_eq!(s.scanner_reason, "non_local_display");
}

#[test]
fn remote_ip_display_refused() {
    let env = SessionEnv {
        xdg_session_type: Some("x11".into()),
        wayland_display: None,
        x_display: Some("192.168.1.5:0".into()),
    };
    let s = detect(&env);
    assert_eq!(s.scanner_reason, "non_local_display");
}
```

- [ ] **Step 2: Run to verify failure**

Run: `cargo test --manifest-path tools/simurgh-daemon-linux/Cargo.toml non_local_display`
Expected: FAIL on remote-hostname and remote-IP tests (current implementation does not check).

- [ ] **Step 3: Implement non-local refusal in detector**

Edit `tools/simurgh-daemon-linux/src/scanner/session.rs` — replace the X11 arm with:

```rust
        (false, true) => {
            if is_local_display(env.x_display.as_deref().unwrap_or("")) {
                SessionDetection {
                    display_server: "x11",
                    scanner_state: "healthy",
                    scanner_reason: "none",
                    coverage: "x11_full",
                }
            } else {
                SessionDetection {
                    display_server: "x11",
                    scanner_state: "scanner_unavailable",
                    scanner_reason: "non_local_display",
                    coverage: "unknown",
                }
            }
        }
```

Add helper at bottom of file:

```rust
fn is_local_display(d: &str) -> bool {
    // Local forms: ":N", ":N.M", "unix/:N", "/path/.X11-unix/X0".
    if d.is_empty() { return false; }
    if d.starts_with(':') { return true; }
    if d.starts_with("unix/") || d.starts_with("unix:") { return true; }
    if d.starts_with('/') { return true; }
    // Anything before the first ':' is a host. Empty host (":N") handled above.
    let host = d.split(':').next().unwrap_or("");
    matches!(host, "" | "localhost" | "127.0.0.1" | "::1")
}
```

- [ ] **Step 4: Run tests**

Run: `cargo test --manifest-path tools/simurgh-daemon-linux/Cargo.toml`
Expected: PASS (all).

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-daemon-linux/
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "feat(stage-2-8a): refuse non-local DISPLAY (privacy boundary)"
```

---

## Task 16: Headless behaviour test against /status endpoint

**Files:**

- Create: `tools/simurgh-daemon-linux/tests/headless_tests.rs`

- [ ] **Step 1: Write the integration test**

Write `tools/simurgh-daemon-linux/tests/headless_tests.rs`:

```rust
use simurgh_daemon_linux::http::router;
use axum::body::Body;
use http_body_util::BodyExt;
use hyper::{Request, StatusCode};
use tower::ServiceExt;

#[tokio::test]
async fn health_endpoint_returns_ok_without_display_env() {
    // Clear display env for this test process if possible (safe in test harness).
    std::env::remove_var("DISPLAY");
    std::env::remove_var("WAYLAND_DISPLAY");
    let app = router();
    let resp = app
        .oneshot(Request::builder().uri("/health").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body = resp.into_body().collect().await.unwrap().to_bytes();
    let v: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(v["ok"], true);
    assert_eq!(v["platform"], "linux");
    assert_eq!(v["privacy_mode"], "metadata_only");
}

#[tokio::test]
async fn status_endpoint_returns_scanner_unavailable_when_headless() {
    std::env::remove_var("DISPLAY");
    std::env::remove_var("WAYLAND_DISPLAY");
    let app = router();
    let resp = app
        .oneshot(Request::builder().uri("/status").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body = resp.into_body().collect().await.unwrap().to_bytes();
    let v: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(v["display_server"], "headless");
    assert_eq!(v["scanner_state"], "scanner_unavailable");
    assert_eq!(v["scanner_reason"], "no_display_server");
    assert_eq!(v["coverage"], "headless_none");
}
```

Add `http-body-util = "0.1"` to dev-dependencies in `Cargo.toml`.

- [ ] **Step 2: Run tests**

Run: `cargo test --manifest-path tools/simurgh-daemon-linux/Cargo.toml headless_tests`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add tools/simurgh-daemon-linux/
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "test(stage-2-8a): headless /health + /status integration tests"
```

---

## Task 17: HTTP hardening — loopback bind, body limits, method allowlist

**Files:**

- Modify: `tools/simurgh-daemon-linux/src/http.rs`

- [ ] **Step 1: Add body limit and method-allowlist layer**

Edit `tools/simurgh-daemon-linux/src/http.rs` — wrap router:

```rust
use axum::{routing::get, Json, Router};
use tower_http::limit::RequestBodyLimitLayer;

use crate::config::MAX_BODY_BYTES;
// ... existing imports ...

pub fn router() -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/status", get(status))
        .layer(RequestBodyLimitLayer::new(MAX_BODY_BYTES))
}
```

- [ ] **Step 2: Add a method-rejection test**

Append to `tools/simurgh-daemon-linux/tests/headless_tests.rs`:

```rust
#[tokio::test]
async fn post_to_get_only_endpoint_is_rejected() {
    let app = router();
    let resp = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::METHOD_NOT_ALLOWED);
}
```

- [ ] **Step 3: Run tests**

Run: `cargo test --manifest-path tools/simurgh-daemon-linux/Cargo.toml`
Expected: PASS.

- [ ] **Step 4: Verify bind is 127.0.0.1 in main.rs**

Open `tools/simurgh-daemon-linux/src/main.rs`. Confirm `DaemonConfig::default()` uses `Ipv4Addr::LOCALHOST`. If not, fix.

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-daemon-linux/
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "feat(stage-2-8a): HTTP body-limit + method-allowlist enforcement"
```

---

## Task 18: Rust formatting + clippy gates

**Files:**

- Verify-only.

- [ ] **Step 1: Run `cargo fmt --check`**

Run: `cargo fmt --check --manifest-path tools/simurgh-daemon-linux/Cargo.toml`
Expected: PASS. If fail, run `cargo fmt --manifest-path tools/simurgh-daemon-linux/Cargo.toml` and re-check.

- [ ] **Step 2: Run `cargo clippy`**

Run: `cargo clippy --manifest-path tools/simurgh-daemon-linux/Cargo.toml --all-targets -- -D warnings`
Expected: PASS (no warnings). Fix any lints inline.

- [ ] **Step 3: Run all Rust tests**

Run: `cargo test --manifest-path tools/simurgh-daemon-linux/Cargo.toml`
Expected: all PASS.

- [ ] **Step 4: Commit (if fmt/clippy required changes)**

```bash
git status
# If clean, skip. Otherwise commit fmt/clippy adjustments.
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -am "chore(stage-2-8a): cargo fmt + clippy clean"
```

---

## Task 19: End-to-end Linux proof acceptance (Rust signs → Node validates)

**Files:**

- Create: `tests/unit/daemonProofLinuxEndToEnd.test.js`

This test bridges the two halves: it spawns the Rust daemon's proof builder (via a generated fixture file) and asserts the Node server accepts the result. To avoid coupling unit tests to Rust runtime, this task ships a fixture generated locally and verifies the Node validator accepts it byte-for-byte.

- [ ] **Step 1: Generate a Linux proof fixture from the Rust daemon**

Run:

```bash
mkdir -p tests/fixtures/stage-2-8
cargo run --manifest-path tools/simurgh-daemon-linux/Cargo.toml --bin simurgh-daemon-linux-fixture > tests/fixtures/stage-2-8/linux-proof.json
```

If the fixture binary does not yet exist, add it: create `tools/simurgh-daemon-linux/src/bin/simurgh-daemon-linux-fixture.rs`:

```rust
use simurgh_daemon_linux::identity::{load_or_create_identity, IdentityPaths};
use simurgh_daemon_linux::proof::{build_proof, ProofInputs};
use tempfile::tempdir;

fn main() {
    let dir = tempdir().unwrap();
    let paths = IdentityPaths {
        state_dir: dir.path().join("simurgh"),
        identity_file: dir.path().join("simurgh/daemon-identity.pem"),
    };
    let id = load_or_create_identity(&paths).unwrap();
    let inputs = ProofInputs {
        session_id: "sess_fixture".into(),
        exam_id: "exam_fixture".into(),
        sequence: 1,
        timestamp: "2026-05-17T08:00:00.000Z".into(),
        challenge: base64::engine::general_purpose::URL_SAFE_NO_PAD.encode([1u8; 32]),
        display_server: "x11",
        scanner_state: "healthy",
        scanner_reason: "none",
        coverage: "x11_full",
        portal_advertised: None,
        portal_active: None,
        x11_counts: [3, 0, 0, 0, 0],
        xwayland_window_count: 0,
        suspicious_window_count: 0,
        visible_window_count: 3,
    };
    let proof = build_proof(&id, &inputs);
    let wrapper = serde_json::json!({
        "proof": proof,
        "public_key": id.public_key_b64url(),
    });
    println!("{}", wrapper);
}
```

Then re-run the fixture generation command above.

- [ ] **Step 2: Write Node test that consumes the fixture**

Write `tests/unit/daemonProofLinuxEndToEnd.test.js`:

```javascript
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { validateDaemonProof } from "../../src/device/daemonProof.js";

test("Rust-signed Linux proof is accepted by Node validator", () => {
  const raw = fs.readFileSync("tests/fixtures/stage-2-8/linux-proof.json", "utf8");
  const { proof, public_key } = JSON.parse(raw);
  const ts = Date.parse(proof.timestamp);
  const result = validateDaemonProof(proof, {
    now: ts + 1_000,
    expectedSessionId: proof.session_id,
    expectedExamId: proof.exam_id,
    pairedNode: { node_id_hash: proof.node_id_hash, public_key },
  });
  assert.equal(result.ok, true, JSON.stringify(result));
});
```

- [ ] **Step 3: Run test**

Run: `node --test tests/unit/daemonProofLinuxEndToEnd.test.js`
Expected: PASS. If FAIL, the canonical-JSON or signature shape diverged between Rust and Node — debug by comparing `canonicaliseDaemonPayload(proof)` (Node) against the Rust `canonicalise` output.

- [ ] **Step 4: Commit**

```bash
git add tests/fixtures/stage-2-8/ tests/unit/daemonProofLinuxEndToEnd.test.js tools/simurgh-daemon-linux/src/bin/
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "test(stage-2-8a): Rust-signed Linux proof accepted by Node validator"
```

---

## Task 20: Umbrella verification + PR

**Files:**

- Verify-only.

- [ ] **Step 1: Full Node test suite**

Run: `npm test`
Expected: all PASS (273 prior + ~10 new).

- [ ] **Step 2: Privacy audit**

Run: `node tools/privacy-audit.mjs`
Expected: PASS.

- [ ] **Step 3: npm audit**

Run: `npm audit --audit-level=high`
Expected: 0 high vulnerabilities.

- [ ] **Step 4: Existing Stage 2.7 smoke (no regression)**

Run: `bash scripts/smoke-stage-2-7-cross-platform-device-shield.sh`
Expected: PASS (macOS/Windows paths unaffected).

- [ ] **Step 5: Stage 2.7 security audit (no regression)**

Run: `bash scripts/security-audit-stage-2-7-cross-platform-device-shield.sh`
Expected: PASS.

- [ ] **Step 6: Rust gates**

Run:

```bash
cargo fmt --check --manifest-path tools/simurgh-daemon-linux/Cargo.toml
cargo clippy --manifest-path tools/simurgh-daemon-linux/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path tools/simurgh-daemon-linux/Cargo.toml
```

Expected: all PASS.

- [ ] **Step 7: Push branch and open PR**

```bash
git push -u origin stage-2-8-linux-display-integrity-research
gh pr create --title "Stage 2.8A: Linux Device Shield foundation (PR #19)" --body "$(cat <<'EOF'
## Summary
- Linux platform accepted in `SUPPORTED_DEVICE_PLATFORMS` after schema dispatcher + per-platform Linux validator land
- Rust daemon skeleton at `tools/simurgh-daemon-linux/` (axum, P-256 identity, canonical-JSON proof signing, headless + non-local-DISPLAY handling)
- Display-server session lock + `display_server_mismatch` fail code
- `scanner_reason=none` invariant for clean Linux states
- Rust-signed proofs round-trip into Node validator (fixture test)

## Spec
`docs/superpowers/specs/2026-05-17-stage-2-8-linux-display-integrity-design.md`

## Out of scope (later PRs)
- Real X11 scanner (PR #20)
- Wayland portal + Snap/Flatpak hint (PR #21)
- systemd unit + Ubuntu CI (PR #22)
- Docs + reviewer checklist (PR #23)

## Test plan
- [ ] `npm test` green
- [ ] `node tools/privacy-audit.mjs` green
- [ ] `cargo fmt --check && cargo clippy -- -D warnings && cargo test` green
- [ ] Stage 2.7 smoke + audit still green
- [ ] Rust-signed proof accepted by Node fixture test

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR URL returned. Wait for GitHub Actions Quality Gate.

---

## Self-Review (post-write, pre-handoff)

**Spec coverage** (§ references to design spec):

- §9.1 Server schema + pairing/events: Tasks 1, 2, 3, 4, 7, 8, 9.
- §9.2 Daemon skeleton: Tasks 11, 12.
- §9.3 Signed proof acceptance: Tasks 13, 14, 19.
- §9.4 Display-server lock + mismatch: Tasks 5, 6, 8.
- §9.5 Headless fixture: Tasks 12, 16.
- §9.6 Non-local DISPLAY refusal: Task 15.
- §6.10 platform-specific validators: Task 2.
- §15.5 red-test checklist items 1, 2, 3, 4, 5, 9 covered by Tasks 1–9 + 11.
  - Items 6 (reportBuilder Linux fields), 7 (privacy-audit Linux paths), 8 (daemonEvents linux events) — item 8 covered by Tasks 8/9; items 6 and 7 are explicitly **deferred to PR #20** (no Linux report rendering until X11 scanner produces real signals). This is intentional — flagged in spec §9 ordering. Add note to PR description if reviewer asks.

**Placeholder scan:** No TBDs, no "implement later", no "similar to Task N" without code, every code step has runnable code.

**Type consistency:**

- `validateScannerSummaryForPlatform(platform, raw)` — same signature across Tasks 1, 4.
- `createDisplayServerLock()` returns `{observe, evict, evictMissing}` — used consistently Tasks 5, 6.
- `IdentityPaths { state_dir, identity_file }` — same shape Tasks 13, 14, 19.
- `ProofInputs` field set matches Linux proof payload in spec §7.1 and Task 4 required-field list.
- `scanner_reason` enum identical in Node (Task 2) and Rust detector (Tasks 12, 15).
- Linux `coverage` enum identical: `x11_full | wayland_limited | xwayland_partial | headless_none | unknown` in Node validator (Task 2), Rust detector (Task 12), and proof builder (Task 14).

**Found and fixed during review:** none.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-17-stage-2-8a-linux-foundation.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using `executing-plans`, batch execution with checkpoints.

**Which approach?**
