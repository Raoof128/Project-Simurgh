# Browser-lane launch budget and launch serialisation — 26 October 2026

Owner-requested repair of the hosted quality gate's intermittent real-browser failure. This
declaration precedes implementation and supersedes the "no timeout change" limit in Addendum 4 of
`2026-10-26-readme-replay-maintenance.md` for the one bounded change authorised below.

## Measured cause

An eight-job matrix on fresh `ubuntu-latest` runners (throwaway workflow on `diag/browser-cold`,
run 40320690955) ran the full `npm test` once per job with per-step CDP timings recorded by
`scripts/lib/browserExecutable.mjs`:

| Job    | Browser lane | `Target.createTarget` or parity test duration              |
| ------ | ------------ | ---------------------------------------------------------- |
| cold 1 | failed       | no reply in 30 s                                           |
| cold 2 | failed       | 27.1 s and 28.7 s; three browser files starving each other |
| cold 3 | failed       | three launches, none replied in 30 s                       |
| cold 4 | passed       | parity test 26.8 s                                         |
| warm 1 | passed       | 16.7 s                                                     |
| warm 2 | passed       | 10.2 s                                                     |
| warm 3 | failed       | 26.3 s, then the fixture budget was exhausted              |
| warm 4 | passed       | 25.1 s                                                     |

Chrome's process start under the concurrently running suite on a 4-vCPU runner takes 10–29 s;
the helper's single 30 s budget covered both that start and the fixture's work, so the lane failed
whenever startup alone consumed most of it. Three browser test files launching simultaneously made
it worse. Earlier diagnostics (0 failures in 37 runs) all ran the lane either alone or after the
suite had already been running, which is why they never reproduced it. The runner has no
`DBUS_SESSION_BUS_ADDRESS`; the logged D-Bus parse errors are Chromium's own `disabled:` sentinel.

## Authorized operations

| Exact path                                         | Operation | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/lib/browserExecutable.mjs`                | modify    | (1) Serialise Chrome launches across concurrently running test files with a cross-process lock held from spawn until the first CDP reply. (2) Give process launch its own bounded budget (`launchTimeoutMs`, default 120 s) that fails closed and names the launch duration; the existing 30 s `timeoutMs` then measures the fixture's work from the first CDP reply. (3) Keep per-step timings in every timeout message. |
| `tests/unit/maintenance/browserExecutable.test.js` | modify    | Regressions: a browser that never answers fails the launch budget (not the result budget) naming `Target.createTarget`; two overlapping launches serialise; the result budget still starts only after launch.                                                                                                                                                                                                             |
| `AGENT.md`, `CHANGELOG.md`                         | append    | Record the measurement and the change.                                                                                                                                                                                                                                                                                                                                                                                    |

## Gate lifecycle

- **active_phase:** from this maintenance onward, every real-browser test that uses the helper.
- **protected_surface:** the parity assertions (byte-for-byte), the 30 s fixture budget, and
  fail-closed behaviour on a browser that never starts or never answers.
- **next_phase_behaviour:** a successor that changes either budget re-measures on fresh runners
  and records the distribution in its declaration, as this one does.
- **maintenance_behaviour:** the launch budget is a bound on process start under load, not a
  retry; no attempt is repeated and no assertion is weakened.
- **sunset_or_migration_condition:** retire the lock and the separate budget if the browser lane
  moves to its own serial job where the suite no longer competes for the CPU.
- **anti_vacuity_condition:** a stub browser that never replies must still fail, now against the
  launch budget, with the duration and stderr in the message.

## Limits

No retry-to-green, no skip, no assertion change, no change to what the fixture pages do. The
fixture budget stays 30 s. The result is re-measured on eight fresh runners before it is proposed
for `main`, and the measurement is recorded in the log entry.
