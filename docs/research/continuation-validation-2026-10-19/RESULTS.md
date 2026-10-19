# Continuation validation — 19 October 2026

The current implementation is `7bc4dfb6`. The preserved base run used `6a5d12e7`;
subsequent explorer changes received focused tests/build/privacy verification. Historical
source, archives and signed evidence remain unchanged in the primary checkout.

## Observed results

- Complete end-to-end gate: **32 passing steps, zero failing steps**; its full-chain
  test suite has **580 passed, zero failed, zero skipped**. The historical Stage 5R
  script still accepts two-runtime parity; its enclosing success is not browser evidence.

- New dashboard/CLI: **16 tests pass**, including shared-query equivalence, exact public
  outcomes, detail joins, unknown preservation, input bounds, inert text, safe links,
  read-only HTTP, filtered export and imported-file CLI context. Production build passes;
  HTTP smoke serves the index, both assets and all 144 records. Runtime dependency audit
  reported no known advisories at the time of the run.
- Root Node suite: **5,140 found, 5,137 passed, zero failed, three skipped**. One is managed
  browser navigation; two are Lean availability in that invocation. A separate real Lean
  theorem suite rerun passed all ten tests with no skips, including the repo-wide proof gate.
- Phase 8: 24 tests pass and fresh archive replay verifies 46 rows, 92 snapshots and 50 bindings.
- Phase 10/14: separate public inspection and full-source/export verification pass for all
  144 branches. This is saved-proposal replay/source consistency, not fresh model inference.
- Phase 13: fresh verification passes 60 fixtures, 210 final calls, ten initial calls and
  600 snapshots. Timing/thread ordering need not be byte-identical; no timing attestation.
- Rust fmt/clippy and **34 tests** pass with real Xvfb on the corrected runtime path.
- Portable runtime checks pass, including an actual Node 24 wrong-major wrapper exit.
  Fresh browser receipt has Node/portable/Python agreement and **three-runtime parity false**;
  the new command exits 1 and records `managed_browser_file_navigation_blocked`.

## Base gate failures and follow-ups

The initial complete `scripts/check.sh` run has **138 passing steps and four failing steps**.
Keep that result; do not rewrite it as an all-green aggregate:

1. The legacy privacy field scanner matched a URL API property in the new explorer. The
   link validator now uses serialized origin comparison; credential-bearing and executable
   URLs still refuse. The unchanged privacy scan passes on current source. Generated UI
   bundles now live in the ignored build cache so historical source scans stay meaningful.
2. Mandatory Xvfb was absent from that invocation's PATH. Supplying the installed binary
   and its library path resolves the Rust gate; no test was weakened or skipped.
3. The first Stage 3R fixture could not reach its child server within 40 seconds. A focused
   rerun passes all four checks. The original timeout remains retained; no deterministic
   code defect was established by that observation.
4. The default Docker build fails in `npm ci` with `Exit handler never called`. The existing
   documented override builds current committed source with the lockfile-checked offline
   cache and non-root ownership. Its fresh container smoke passes health, non-root execution,
   mock receipt and HTTP 410 live-route retirement. TLS is not disabled. This does not make
   the original network build successful.

The base script also labels some optional external/platform steps as passed when skipped.
Those shell-step counts do not establish macOS, .NET or paid/external campaign coverage.
The aggregate run's generated banking fixture changed only inside its disposable checkout.

## Viewer and environment limits

The image shown in chat is a design concept. UI interactions were exercised in jsdom,
not rendered in a real browser. Managed Chromium blocks local pages. No browser policy
was changed or bypassed; desktop/mobile layout and browser parity remain unverified.
The viewer never promotes loaded claims to a verified archive result.

Full external custody, an entitled owned provider project, new independently held model
tasks, sustained deployment measurements and real-data privacy rules still require the
conditions listed in the [handoff](../CONTINUATION_HANDOFF_2026-10-19.md). A classmate's
independent replay is useful but does not retroactively establish original custody.
