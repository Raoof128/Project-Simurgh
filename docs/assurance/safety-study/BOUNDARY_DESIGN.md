# Scripted boundary and lifecycle study

This additive, local instrument uses a fixed synthetic fixture and the unchanged
`tools/local-meta-study/runtime.py` Session and recovery adapters. It makes no model
calls and shares no cases with the model challenge corpus. Actual descriptor reads,
native SDK approval/resume and disposable Unix-socket Redis effects supply outcomes.

The exact inventory is fourteen named cases, each run once in `enforced`, `bypass`
and `deny_all`: `benign_read`, `benign_write`, `private_read`, `wrong_resource`,
`wrong_content`, `private_content_write`, `malformed`, `forged_approval_input`,
`revocation`, `terminal_stop`, `retry_duplicate`, `audit_unavailable`, `audit_tamper`,
`audit_omission`. Bypass deliberately permits schema-valid unauthorized proposals
inside this disposable sandbox. Invalid input in every control supplies no policy
prevention evidence. The forged approval case adds an untrusted approval field; it
tests strict input rejection, not forged cryptography or an SDK approval bypass.

A small **new trusted-host local mechanism** adds durable revocation, terminal stop
and audit-before-dispatch around Session. SQLite stores a case/mode/fixture binding,
monotone flags and a hash-chained journal. Opening existing state never initializes
missing state or resets flags. Only trusted host methods can revoke or stop; model
inputs have no reset operation. Reopening the wrapper over the same live Session
tests state persistence. The immutable underlying connector grant is never edited.
The bypass control ignores overlay decisions and demonstrates that the grant still
executes. This is not a global Simurgh revocation or shutdown implementation.

Each attempted dispatch first commits an intent. A completion records observed
effect sets and read results. Verification checks contiguous events, chain/head
agreement, intent/completion correspondence, binding and observed Redis effects
against completed writes. An omitted completion remains detectable even when its
hash chain and head are recomputed; actual effects without a completed write are
unaccounted. Missing/unavailable journals and byte-level event tampering deny new
enforced work. Bypass still attempts the real action while retaining audit errors.
The journal and logical snapshots are retained per case/control in report artifacts.
These are same-host evidence, not an external witness or a defense against a host
administrator rewriting both the journal and independent observations.

Revocation and stop survive wrapper reopening; repeated terminal stop cannot reopen
the session. Retry submits the same write twice and compares actual Redis readback,
new-effect flags and native callbacks. It establishes sink idempotence, not absence
of repeated callbacks. Audit omission deliberately removes a completed write entry
after an actual effect and coherently rechains the remaining journal; detection is
reported separately from prevention of the already completed effect.

Two selected recovery probes (`after_pause`, `after_effect`) separately invoke the
existing real SIGKILL/fresh-process adapter with the authorized fixed write. They
are not part of the 42 case/control denominator and do not establish durability of
the new overlay across arbitrary power loss, concurrent revocation or in-flight
callbacks. All subprocess environments omit credentials. Timing is descriptive.

The report contains all 42 identities, results, observations, persisted audit
snapshots, errors, unsupported outcomes, paired unsafe witnesses and benign utility.
Verification checks exact identities, artifact hashes and regenerated semantic
outcomes with timing excluded. Report and artifact paths refuse overwrite. No test
failure, runtime error or unsupported platform is removed from the denominator.

`boundary.py run --commit COMMITTED_PROTOCOL_REVISION --out NEW_REPORT.json` binds
the shared safety-study protocol digest and committed ancestor before starting any
runtime. `boundary.py verify NEW_REPORT.json` rechecks every source hash against
that commit and the current checkout, reads the retained SQLite artifacts and
regenerates outcomes. A changed source cannot silently validate an earlier report.
Pre-freeze unit tests mock only this not-yet-committed provenance binding; native
file reads, Redis writes, journals and process kills execute for real.

This file and the implementation/tests are new surfaces. No earlier frozen source,
evidence, CI or authority is modified. The parent protocol owns source commitment
and any CI lifecycle declaration; this instrument installs no repository gate.
