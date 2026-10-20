# Security Policy

## Research scope and versions

Project Simurgh is a research prototype. The default repository branch is `main`; the current agent-research
continuation is on `openai-readiness`. Published
research evidence through `v2.54.1` and the historical application package version `0.4.18`
are separate version lines. A frozen tag is a reproducibility reference, not a promise that
its runtime remains production-supported or has received every later fix. The historical
Stage 1/2 architecture below describes those components rather than all VCA research tools.

The additive [OpenAI reviewer workflow](docs/openai/EVALUATION.md) is a local synthetic
experiment. Its [scoped security review](docs/openai/SECURITY_REVIEW.md) records confirmed
historical authorization and live-gateway quota defects. They remain open in the frozen
implementations; the isolated demonstration does not repair or certify those paths.
Do not expose the historical live gateway as a production service based on this package.

The [hardening successor](docs/research/hardening-phase-1/README.md) now rejects mounted
legacy live-provider requests with HTTP 410 before entering that router. It authenticates
gateway session creation outside explicit demo mode and retires all legacy affinity
ingestion/simulator/read routes. These are supported-entry-point restrictions; direct use
of the historical modules, old server revisions and native helper is not remediated.
The separate exact-authority and transactional gateway successor has synthetic local
credentials/effects, not production IAM. Its SQLite revocation ordering does not extend
to arbitrary remote services. Demo-mode mock access remains intentionally public.

## Historical provider fallback limitation

The documentation audit reproduced an adapter/orchestrator mismatch in the preserved Stage 3R
modules using an injected local SDK client. A provider response with `stop_reason: "refusal"`
and empty `content` becomes `gateway_provider_empty_response`; orchestration classifies it as
an availability failure and attempts fallback even when refusal fallback is disabled. The
terminal Simurgh precheck still prevents a swap. The adapter also drops the original stop
metadata and converts client/setup exceptions into generic provider errors, which can enter
that availability path. These observations qualify historical claims that all provider refusals
are opt-in and all setup errors are terminal configuration rejections.

The current mounted legacy live route is already retired with HTTP 410. That restriction does
not repair direct module use or old revisions. The [four-case local probe and correction](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m43--historical-provider-fallback-contract-does-not-match-all-response-shapes)
record the scope; no live API or HTTP route was exercised. These modules need a separately
reviewed implementation change before a successor can claim the historical refusal contract.

## Retained gateway enforcement limits

The preserved gateway can map a standalone blocked cumulative-risk verdict to an accepted
response; its final decision checks other boundary blocks and Warning but omits that risk
case. The retained live adapter also leaves SDK retries enabled, records calls after awaiting
them, and misclassifies the installed SDK's abort exception as a generic provider error.
A local synthetic SDK probe confirmed the retry and abort behavior without network access.
See the [gateway corrections and probe scope](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m70--stage-3e-core-draft-contracts-exceed-the-shown-implementation).
These findings qualify historical risk, quota and timeout claims. The mounted legacy live
route remains retired; direct module use and old revisions retain the defects. No runtime
repair or live-provider validation is claimed by this documentation update.

## Retained AgentDojo helper limits

The original adapter mapping treats missing and unknown gateway verdicts as not blocked.
Its canary metrics helper also reports full receipt/audit coverage independently of result
rows. These helpers must not be used as evidence of fail-closed response validation or
measured coverage by themselves. The [manual correction and synthetic helper probe](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m73--agentdojo-core-harness-claims-need-their-canary-scope)
distinguish these observations from actual benchmark runs and later adapter implementations.
No HTTP exploit, benchmark rerun or runtime repair was performed for this finding.

## Archived browser-verifier limitation

The frozen Stage 4M HTML verifier has duplicate top-level lexical declarations and fails to
parse before its handlers run. Its published file hash matches the affected bytes. Use the
stage's authoritative CLI within its declared scope; the archived page is not an operational
verification surface. The [syntax-check receipt and correction](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m54--the-archived-stage-4m-browser-verifier-cannot-parse)
distinguish this finding from interactive browser testing and from CLI behavior.

## Archived standalone-verifier limitation

The Stage 5P independent-verification bundle can report success with missing manifests, an
invalid checkpoint-signature line or an incomplete comparison corpus. Its root-text comparison
does not authenticate the checkpoint signature. See the [local diagnostic and bounded correction](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m58--stage-5ps-standalone-bundle-checks-less-than-its-guide-promises).
These omissions remain in the frozen standalone implementation; its exit zero is insufficient
for the complete artifact/inclusion-verification claim. This finding does not establish that
the genuine captured log entry is false or that the separate main-stage CLI has the same behavior.

## Banking rejection-record limitation

The banking submit path returns and audits unknown field names supplied by the caller.
Rejecting a property value does not prevent sensitive text in its key from reaching the
response or audit export. The [documented source trace and synthetic helper check](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m68--banking-rejection-keys-remain-caller-controlled)
qualify the historical claim that field-name-only rejection records cannot retain sensitive
input. Use fictional keys and values; this documentation correction does not repair the
preserved runtime. A successor should emit a fixed rejection category instead of arbitrary
unknown keys.

## OpenAI demonstration trust boundaries

- Model output and retrieved context cannot grant permissions. A trusted local registry
  derives the tool class, and separate policy binds the exact resource, destination and
  approval arguments. The existing Stage 3D gate is only one part of the new boundary.
- Tools update an in-memory read log or mock outbox. They perform no real email, network,
  filesystem or shell action. The separately computed consequence check is within the
  same process and trust domain; it is not an independent external observer.
- Offline mode needs no credentials. Live mode requires explicit `--live --allow-live`,
  a model selection and `OPENAI_API_KEY`; it sends synthetic task/context text to the
  fixed Responses API origin with a bounded response, timeout and no automatic retries.
  `store:false` does not establish zero retention under provider policy.
- Reports contain proposed arguments and response metadata, so keep live reports private
  until reviewed. Credentials, raw provider error bodies and private signing keys are not
  intentionally recorded. Keep any real sensitive data out of the synthetic corpus.
- Signatures establish artifact consistency relative to a key. An embedded generated key
  does not establish producer identity, model provenance, truth or completeness outside
  the declared corpus. Externally pinned keys and independently observed effects are
  separate requirements for stronger claims.
- Approval fixtures are not authenticated human decisions, and replay checks are local
  to a sandbox instance. Production connectors require durable authorization, replay
  protection, identity, secret management, quotas and independent operational review.

## Current integration boundaries

The [integration matrix](docs/INTEGRATIONS.md) identifies each tested surface and its limits.
The current composition trusts the host policy, issuer/admin, storage and owned receiver.
Model proposals and retrieved text are untrusted. Valid function-call JSON does not grant
permission; host checks must still bind the action, resource, lifecycle state and budget.
Only host-generated policy state belongs in the corrected developer-role update. Copying
retrieved/user content into that role would cross the intended trust boundary.

The explorer is a loopback, read-only evidence viewer, not an authorization service or a
multi-user hosted dashboard. Imports remain unverified; opening a source link does not
verify its evidence. Its static index is an older study snapshot. See its
[guide](tools/simurgh-explorer/README.md) for import/export and detailed-data limits.

The [completed local Phase 8 review](docs/research/PHASE_8_REVIEW_2026-10-19.md) is scoped
assistant review, not independent certification. The [full smoke report](docs/research/smoke-validation-2026-10-19/RESULTS.md)
retains the managed-browser failure and distinguishes native CI from interactive platform testing.
Real provider IAM, authenticated provider-alert lifecycle and production deployments remain unvalidated.
The [2026 source map](docs/documentation-audit-2026-10-19/SOURCES.md) informs review; it is not a
claim of MCP, OAuth, NIST, OWASP, SLSA or accessibility conformance.

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Report security issues to: **raoof.r12@gmail.com**

Include:

- Description of the vulnerability
- Steps to reproduce
- Affected component (server, helper, audit chain, dashboard, etc.)
- Potential impact assessment

The maintainer aims to acknowledge reports within **72 hours**; this is a response target, not a
service guarantee. Confirmed issues are prioritized by impact and affected scope. Coordinate
disclosure timing with the maintainer; attribution is optional and can be anonymous.

## Security Architecture (v0.4.12)

> The trust-boundary table below describes the Stage 1 surface. Stage 2.1 added an Ed25519-signed integrity-proof envelope (`/api/integrity/proofs`); Stage 2.2 added per-session node pairing (`/api/integrity/pairing/{challenge,complete}`); v0.4.3 added rate limiting on the proofs route, cryptographically-reconciled audit hints (`safeParsedPairingHints`), and a constant-time challenge compare. Stage 2.3 adds a localhost daemon proof surface (`/api/device/{challenge,pair}` plus telemetry `daemon_proof`) with P-256 signatures. Stage 2.4 moves the browser bridge into a reusable SDK. Stage 2.5 adds a CoreGraphics-backed, metadata-only macOS scanner summary inside signed daemon proofs. Stage 2.6B validates live Windows `GetWindowDisplayAffinity` detection on Windows 10 Pro build 19045 using a controlled local fixture. This still does not constitute hardware attestation, notarised distribution, MDM/Intune readiness, Windows Service readiness, kernel-level visibility, or a production device-trust claim.

### Stage 2.3 localhost daemon controls

- Daemon binds to `127.0.0.1` only.
- Browser-facing daemon endpoints reject unknown origins and require `X-Simurgh-Local-Client: browser` on POST requests.
- Server challenges expire after 30 seconds and are single-use.
- `SIMURGH_REQUIRE_DAEMON=true` enforces signed `daemon_proof` on telemetry; missing proofs are rejected and HMAC-audited as `DAEMON_MISSING`.
- Server stores public key hashes, proof ages, daemon state, signature status, and capture-excluded counts only.
- Raw process names, raw window titles, usernames, serial numbers, MAC addresses, screenshots, pixels, audio, typed content, and pasted content remain forbidden.

### Stage 2.4 browser SDK and lifecycle controls

- `public/sdk/simurgh-browser-sdk.js` owns daemon discovery, pairing, proof fetch, telemetry send, hardened missing-proof handling, and client daemon state.
- SDK state is explicit: `idle`, `discovering`, `available`, `pairing`, `paired`, `proof_ready`, `missing`, `stale`, `untrusted`, and `error`.
- Server-side proof replay or invalid-proof responses move the client state to `untrusted`; hardened missing-proof mode blocks telemetry before spoofing a daemon proof.
- `simurgh-daemon doctor` reports only status labels such as daemon reachability, port availability, Keychain identity presence, allowed-origin configuration, localhost binding, server reachability, and proof round-trip readiness.
- Development LaunchAgent scripts are local-only and user-scoped. They do not install into system LaunchDaemons and do not make production, notarisation, or managed-deployment claims.

### Stage 2.5 scanner controls

- `AffinityScanner` uses CoreGraphics window metadata only and filters for meaningful onscreen windows before counting capture-excluded risk.
- Scanner summaries are signed inside daemon proofs; browser code cannot append trusted scanner fields beside the proof.
- Server validation rejects forbidden raw local fields including process/window names, raw process/window fields, PIDs, usernames, home directories, file paths, serial numbers, MAC addresses, screenshots, pixels, audio, typed content, and pasted content.
- `scanner_unavailable` and `permission_denied` are accepted as signed scanner states and treated as warning/manual-review context, not automatic findings.

Apple now describes [`NSWindow.SharingType.none`](https://developer.apple.com/documentation/appkit/nswindow/sharingtype-swift.enum/none)
as a legacy constant and explicitly says not to use it to hide content from capture. A reported
sharing-state count is an observation about the scanner and OS version; it does not establish
that a window is invisible to every capture API. Historical demonstrations require their exact
OS and capture-path context.

### Stage 2.6 Windows scanner controls

- Windows scanner fields are accepted only inside signed daemon proofs with `platform: "windows"` and `scanner_version: "2.6.0"`.
- `WDA_EXCLUDEFROMCAPTURE` maps to Critical/manual review through `capture_excluded_window_count > 0`.
- `WDA_MONITOR` maps to Warning/manual review through `monitor_only_window_count > 0` and `capture_restricted_window_count > 0`.
- Tampered scanner counts invalidate the P-256 daemon proof signature; replayed proof challenges are rejected.
- Raw HWNDs, PIDs, process names, window titles, executable paths, usernames, home directories, screenshots, pixels, webcam frames, microphone audio, typed content, and pasted content are forbidden and rejected recursively with the generic `forbidden_local_field` reason.
- Real-device validation on Windows 10 Pro build 19045 confirmed normal scans, `WDA_MONITOR`, `WDA_EXCLUDEFROMCAPTURE`, signed proof acceptance, tamper/replay rejection, report/dashboard output, audit verification, and privacy audit.

Microsoft documents [`GetWindowDisplayAffinity`](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getwindowdisplayaffinity)
as usable across processes, but successful retrieval requires a layered window and Desktop
Window Manager composition. Display affinity is not a DRM or universal capture-protection
guarantee. A signed count therefore describes successfully observed flags, not complete
visibility into every window or capture mechanism.

### Stage 2 Windows Device Shield Security Posture

The Windows Device Shield path is protected by:

- Signed P-256 daemon proofs with session/exam/challenge binding
- Single-use challenge replay protection (consumed on use)
- Timestamp freshness checks (±30 s past, +5 s future)
- Platform and all scanner-field content is inside the signed canonical payload
- Recursive forbidden local-field rejection (`containsForbiddenLocalFieldDeep`)
- Generic `forbidden_local_field` reason (no raw identifier ever echoed)
- Metadata-only scanner output (counts only, no raw identifiers)
- Pairing-level unsupported-platform rejection (`unsupported_platform` at both pairing and proof layers)
- Report/dashboard/audit privacy minimisation
- Controlled local fixture validation (`SimurghAffinityFixture`)
- Stage 2.6/2.7 closeout cybersecurity audit (24/24 tests across nine dimensions)

**The Windows daemon is not a production Windows Service. It is not MDM/Intune managed. It does not provide hardware attestation, kernel visibility, or endpoint-control guarantees.**

### Stage 1 Trust Boundaries

| Component              | Trust Level         | Mechanism                                                                                      |
| ---------------------- | ------------------- | ---------------------------------------------------------------------------------------------- |
| Student browser        | **Untrusted**       | Strict allowlist + range-reject validation; replay guard (sequence + timestamp); rate limit    |
| Joined student session | **Token-bound**     | HMAC-SHA256 session token issued at `/api/exams/:id/join`, required for lifecycle + telemetry  |
| Native helper          | **Authenticated**   | `x-simurgh-helper-secret` shared-secret header + per-helper rate limit                         |
| Instructor dashboard   | **Authenticated**   | Bearer token (`SIMURGH_INSTRUCTOR_TOKEN`) — query-string token stripped from URL after capture |
| Claude API             | **Trusted service** | Receives sanitised behavioural metadata only, never raw content                                |
| Audit chain            | **Tamper-evident**  | HMAC-SHA256 linked entries; integrity is relative to the key and trusted retained chain state  |

### Secret Separation

The historical server configuration requires four secret settings outside demo mode. Operators
should provision distinct values; the bootstrap checks presence but does not reject reused values.

| Secret                           | Purpose                                             |
| -------------------------------- | --------------------------------------------------- |
| `SIMURGH_INSTRUCTOR_TOKEN`       | Dashboard, sessions list, report, audit verify, SSE |
| `SIMURGH_HELPER_SECRET`          | Native helper authentication                        |
| `SIMURGH_AUDIT_SECRET`           | HMAC key for the audit chain                        |
| `SIMURGH_SESSION_SIGNING_SECRET` | HMAC key for student session tokens                 |

The server refuses to start in non-demo mode if any of these are unset.

### Privacy Guarantees

The historical academic/device telemetry pipeline is designed around data minimisation. Its collection policy excludes the following data (this is not a repository-wide guarantee about every research input or live-model experiment):

- Screen pixels, screenshots, or screen recordings
- Webcam frames or microphone audio
- Typed answer content
- Paste content (only paste length and count are recorded)
- Raw student identifiers in stored session records (HMAC-SHA256 pseudonymized at ingress; raw input reaches the join handler)
- Biometric identifiers
- Raw process names or window titles in modern daemon proofs (rejected as `forbidden_local_field`). The legacy helper collected/transmitted identifiers and sampled capture pixels; its server routes are retired. See [PRIVACY.md](PRIVACY.md) for this historical exception.

Enforcement points:

- `src/privacy/privacyConfig.js` — declarative allowlist of what may be collected
- `src/privacy/normaliseTelemetry.js` — strict allowlist applied before storage
- `src/privacy/hashIdentity.js` — HMAC-SHA256 pseudonymization after receipt of the raw identifier
- `tools/privacy-audit.mjs` — CI-ready scanner that fails if forbidden fields appear in generated data

These controls are implemented in the named validation paths. They do not protect against a
compromised server or a party able to change the code or its signing secrets; application audit
logs are not a complete record of source-code changes.

### No Automatic Misconduct Finding

Simurgh produces **risk scores and event timelines**. It emits review flags, not automatic misconduct findings or penalties. The Critical recommendation is:

> "Manual review required. No automatic misconduct finding."

This is the Critical wording emitted by `src/academic/riskScoring.js`; Warning uses
“Manual review recommended. No automatic misconduct finding.” Institutions deploying Simurgh must apply human judgment and due process before any action is taken on the basis of a risk score.

### Known Limitations (from research paper §VI-C)

The following attack classes are **not** detectable from telemetry alone:

1. **Click-through overlays** — `WS_EX_TRANSPARENT` (Windows) or `ignoresMouseEvents` (macOS) do not fire focus or paste events
2. **Read-don't-paste workflows** — silent transcription at human WPM with no paste events
3. **GPU-layer overlays** (DirectX / Metal hooks, e.g. Cluely-class) — bypass both DOM events and `getDisplayMedia()`

Mitigations:

- The historical macOS `simurgh-helper` attempted native detection, but its `/api/affinity` integration is retired with HTTP 410. Use the modern signed daemon contracts for current device-track research; neither route establishes complete capture visibility.
- The historical device roadmap proposes hardware-rooted attestation and on-device verification
  for GPU-layer overlays. These remain proposals; see [DEVICE_ROADMAP.md](DEVICE_ROADMAP.md).

The named validation paths provide bounded controls under the stated trust assumptions. Their
existence does not establish repository-wide privacy enforcement, complete audit history or
protection against an operator holding the signing keys. Retained historical defects and the
legacy-helper exception remain relevant when evaluating old revisions.

## Dependency Security

```bash
npm audit
```

Dependency findings are time-dependent. Run the command against the installed lockfile and record its date and result; a historical zero count is not a current assurance claim. Report high or critical findings via the vulnerability disclosure process above.

## Stage 2.8 Linux Device Shield Security Posture

- P-256 ECDSA daemon proof signed over canonical JSON; server verifies signature before processing any telemetry.
- Challenge binding: proof includes a server-issued challenge echoed back; session-scoped one-time use prevents replay.
- Wayland portal probe uses property reads only (`AvailableSourceTypes`); never calls `CreateSession`, `SelectSources`, `Start`, or `OpenPipeWireRemote`. Enforced by source-grep tests in both the Wayland scanner test file and the cybersecurity audit.
- `display_server` is locked to the first verified value per session; mid-session changes are rejected with `display_server_mismatch` and emit `DAEMON_PROOF_REJECTED` to the HMAC audit chain.
- XWayland output never claims `x11_full` or `wayland_limited` coverage — always `xwayland_partial`.
- `browser_package_hint` is UX-only. The server (`server.js`), proof validator (`daemonProof.js`), schema (`platformScannerSchema.js`), risk policy (`scannerRiskPolicy.js`), and report builder (`reportBuilder.js`) all source-grep clean of the field.
- systemd `--user` unit is development-only. No system-wide service. No root. No sudo in lifecycle scripts. Hardening directives: `NoNewPrivileges=true`, `ProtectSystem=strict`, `ProtectHome=read-only`, `PrivateTmp=true`.
- Ubuntu CI now enforces Rust `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test`, and `shellcheck` on the lifecycle scripts. Xvfb integration tests are mandatory via `SIMURGH_REQUIRE_XVFB_TESTS=1`.
- Forbidden raw local field rejection: server and proof validator reject any proof payload carrying forbidden local identifiers (window titles, PIDs, process names, usernames, home paths).
- No automatic misconduct finding: all anomalies are flagged for manual review only; the system makes no misconduct determination.

Non-claims preserved: research prototype only. No production Linux endpoint deployment, no distro packaging, no system-wide service, no MDM, no hardware attestation, no kernel-level visibility, no universal Wayland surface enumeration, no GPU overlay detection, no automatic misconduct detection.

See [`docs/STAGE_2_8_LINUX_TECHNICAL_BRIEF.md`](docs/stages/STAGE_2_8_LINUX_TECHNICAL_BRIEF.md) for the full security architecture.

## Verification Tools

```bash
npm test                                       # full unit suite
node tools/privacy-audit.mjs                   # scan generated data for forbidden fields
node tools/verify-audit.mjs ./audit-export.json # requires original SIMURGH_AUDIT_SECRET
```

Replace `./audit-export.json` with the exported chain file. Provide the original audit key
through a protected environment; never include it in a shared
command transcript. The verifier checks the supplied entries and, when present, their supplied
terminator. A successful result does not prove that the export is complete or that a key-holding
operator could not rewrite it. Compare a separately retained trusted commitment for stronger
history claims; do not disclose the key as part of public verification evidence.

### Retained attestation canonicalization limits

The custom attestation canonicalizer omits an own JSON `__proto__` member while serializing.
A local probe confirmed that adding this synthetic member to a copy of a signed bundle leaves
the canonical bytes and signature check unchanged. Do not interpret a signature check as proving
that every raw JSON member is bound. This observation does not establish a complete verifier bypass.
Use the retained tools with trusted local evidence packs; their CLI reads referenced paths before
signature validation. The Stage 3M privacy-reproduction flag checks a declared zero rather than
regenerating a complete privacy report. See [M79](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m79--attestation-plans-need-exact-canonicalization-and-verification-boundaries)
and its bounded probe receipt. Frozen artifacts and runtime code were preserved during this audit.

### Retained claim-ledger helper limits

Stage 3N checks supplied registered claims against supplied source fields. Its helper does not
independently enumerate the complete claim surface: an empty registry, or absent expected and
resolved fields, can report complete. Its per-row hash-binding helper checks for map entries;
actual file hashing belongs to the runner. These helper observations do not establish that the
retained fixed runner or stored ledger supplies those inputs. See [M80](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m80--claim-ledger-scope-and-completeness-need-separate-evidence)
for the exact scope and probe receipt.

### Retained cross-defence coverage helpers

The Stage 3P coverage helper treats unobserved cells as contained, and its full-coverage claim
helper does not reject an empty cell map. The normal campaign supplies a fixed corpus; helper
results alone are not proof of complete execution. Its wording check can also exempt additional
text when an allowed non-claim sentence appears in the same string. See [M82](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m82--cross-defence-profiles-are-authored-replicas-with-bounded-validators)
for the scoped local observations and distinction from the published campaign.

### Retained defensive-narrative helpers

Stage 3S validates field comparisons and allowed wording separately. A true comparison can
therefore accompany an unrelated assertion in the rendered narrative. Empty surviving slots
also produce a no-signal statement, and the privacy disclaimer is unconditional. The standalone
signature verifier does not recompute slots or bind the complete gateway receipt; the full
hash/rebuild pipeline has additional checks. Treat these retained artifacts as fixture evidence,
not verified semantic truth or proof of a completed human review. See [M85](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m85--allowed-narrative-wording-is-not-bound-to-the-proposition-checked)
for reproducible local observations and their scope.

### Retained external-defence and capture adapters

The Stage 3V-A metadata contract accepts additional properties and does not establish that
arbitrary adapter content is metadata-only. Its normalizer also has inherited-property edge
cases; a later enum check rejects those synthetic values. Stage 3V-B's parser accepts trailing
text and unregistered numeric category IDs, while its capture-integrity helper checks exact
prompt equality rather than all embedded copies. Separate privacy scans add bounded checks.
These observations do not establish acceptance by a complete release pipeline. See
[M88](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m88--external-advisory-replay-has-narrower-schema-and-metric-guarantees)
and [M89](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m89--frozen-llama-guard-replay-does-not-authenticate-execution-or-all-output-text)
for probe receipts, metric definitions and the raw-classifier replay exception. Script, input
and snapshot hashes bind supplied values; they do not authenticate live execution. The retained
capture has conflicting 64/20-token declarations, and its recorded origin remains self-reported.

### Retained Stage 4D fixture verification

Stage 4D uses a public deterministic test key and a separate signer process with shared filesystem
access. These demonstrate fixture signing and IPC, not private-key isolation or independent
operator identity. Its verifier checks supplied observations and receipts; it does not prove
that the mediator logged every real action. Privacy rejection uses finite keys/patterns, and
input limits apply after JSON parsing and count JavaScript string units. Use trusted local
fixture packs and the explicitly bounded replay claims. See
[M93](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m93--decision-replay-packs-need-explicit-fixture-signer-and-verifier-limits)
for schema, Merkle, dispatch and offline-enforcement qualifications.

### Retained Stage 4F frontier verification

The Stage 4F `frontier.sig` file is a public digest, not an Ed25519 signature. A local probe
changed utility sidecars and recomputed unsigned aggregate metadata; the direct verifier accepted
the changed frontier while all signed cell packs and the external public key stayed unchanged.
It also accepted a changed fixture hash in the external suite without a recomputed suite hash.
The golden-byte harness provides a separate fixed-file comparison. Do not use the direct verifier
as assurance against a dishonest frontier producer. See
[M94](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m94--retained-stage-4f-frontier-is-unsigned-and-does-not-meet-the-dishonest-evaluator-claim)
for the probe receipt, template/utility limitations and exact scope. Runtime repair remains separate
from this documentation audit.

### Retained Stage 4G campaign outcomes

Stage 4G verifies signed campaign declarations. Its four-fixture builder assigns outcomes from
class labels and uses synthetic evidence-pack hashes; the campaign verifier does not replay the
referenced Stage 4D packs. It therefore does not independently establish that an attack was caught
or that an environment escape occurred. Its local artifact key is a public test identity. See
[M96](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m96--stage-4g-authenticates-declared-campaign-records-not-adaptive-attack-execution)
for the schedule, configuration, input-bound and reproduction limitations.

### Retained Stage 4H privacy and tamper checks

The main Stage 4H CLI does not invoke the documented Q7 privacy helper or raw duplicate-key check.
Its schema checks remain useful, but do not enforce all documented input bounds. The reported
privacy capacity counts selected enum fields; it is not a bound on all information in an export.
The Q6 summary uses diagnostic helpers, including simulated signature/Merkle failures, rather
than exercising every arm through the full cryptographic CLI. Separate CLI fixture tests provide
additional bounded checks. See
[M97](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m97--stage-4h-foundation-is-historical-current-checks-have-a-narrower-trust-boundary)
and [M100](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m100--stage-4h-q6q7-summaries-do-not-establish-the-promised-cli-privacy-boundary).
Use trusted local fixtures; do not treat these reports as a general privacy or dishonest-producer
assurance boundary. Frozen artifacts and runtime source remain unchanged by this documentation audit.

### Retained Stage 4J authorization checks

The Stage 4J CLI does not verify its PCTA manifest, compare the user-intent digest with an
expected intent artifact, or enforce all documented authority-rank, tool/class and enforcement
requirements. Isolated local probes accepted a deleted manifest and selected producer-signed
semantic changes. The latter used an explicitly pinned ephemeral producer key, not a forged
retained signature. Treat the ten-row fixture matrix as bounded evidence. See
[M103 and its probe](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m103--stage-4js-cli-does-not-enforce-every-advertised-authorization-binding)
for the tested entry point and limits; the standalone manifest helper is not invoked by that CLI.

### Retained Stage 4K exposure accounting

Stage 4K verifies aggregate counts from supplied synthetic events and a signed digest chain.
It does not independently observe deployed enforcement or event completeness, compare policy
and event windows, or recompute every semantic attestation field. Temporary checks accepted
producer-signed false attestation totals and unrestricted plaintext window labels; changing a
response digest also preserved acceptance without re-signing because the aggregate omits it.
See [M104 and its probe](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m104--stage-4k-recomputes-supplied-counts-not-deployment-enforcement-or-every-attestation-field).
A passing Q8 result is bounded accounting evidence, not a general privacy or distillation guarantee.

### Retained Stage 4L cluster accounting

The Stage 4L core recomputes cluster totals and cardinality, but hashes its referenced 4K
manifest without running the 4K verifier. It does not recompute every signed attestation field
or enforce required non-claims and an empty corroboration slot. Local producer-signed probes
confirmed these gaps while unsigned attestation tampering was rejected. See
[M105 and its probe](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m105--stage-4ls-cluster-calculation-does-not-authenticate-every-narrative-or-upstream-verifier).
A provider's declared partition does not establish real-world identity, complete observation
or deployed enforcement. A later merge can reflect new knowledge rather than a prior falsehood.

### Retained Stage 4M public-tier disclosure verification

The Tier-P path skips signed root and chain bindings. A local probe accepted a changed
public disclosure and matching chain while the original signed attestation, manifest and pinned
key remained unchanged; it also accepted removal of both public files. Signature success therefore
does not authenticate those public-tier files. Tier A checks local roots but does not recompute
all attestation totals or verify the referenced upstream/proof artifacts. See
[M106 and its probe](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m106--stage-4m-public-tier-verification-omits-signed-disclosure-and-chain-bindings).
The retained browser page also has the parsing failure recorded in M54. Use these artifacts as
bounded research fixtures pending runtime repair.

### Retained Stage 4N heartbeat verification

The documented Stage 4N CLI checks supplied feed/policy consistency at a caller-selected cutoff;
it does not authenticate the signed attestation or manifest. A local probe accepted an unsigned
rewritten band, a future-dated reveal and a shortened feed with an earlier cutoff. Separate E2E
checks authenticate the committed evidence only. The advertised four-bit bound also does not
cover the CLI's accepted arbitrary string bands or other public fields. See
[M107 and its probe](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m107--stage-4n-cli-consistency-does-not-authenticate-a-feed-or-bound-all-public-disclosure).
Do not treat CLI success as authenticated publication, complete telemetry or a general privacy bound.

### Retained Stage 4O tool-surface verification

Stage 4O's selective path verifies a supplied Merkle membership proof without authenticating
the commitment or checking authorization. Its full verifier replays repository fixture arms;
a local probe changed the supplied evidence clean-chain body/signatures without invalidating
the result. The attestation signer is selected from the supplied bundle, not an external pin.
See [M108 and its probe](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m108--stage-4o-verifies-fixture-replay-selective-disclosure-does-not-authenticate-approval).
The manifest gate relies on a trusted adapter to bind real action semantics to the receipt.
Committed fixture keys, optional signer replacement and finite parity checks are research
mechanisms, not independent operator identity or proof of remote execution.

Stage 4P reconstructs its bundle from repository fixtures but uses stored custody-signature
result booleans during arm replay. A temporary-copy probe replaced custody signatures while
the unchanged signed bundle still passed. Its embedded signer has no external identity pin.
The custody chain does not enforce adjacent input/output continuity; the extraction bridge's
3T reference is a synthetic stand-in. See [M109 and its probe](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m109--stage-4p-binds-fixture-verdicts-custody-authentication-and-physical-path-completeness-remain-separate).
The Lean ghost theorem does not establish detection of an unrecorded intermediary. CPC kind
buckets, public window separation and per-call caps do not establish measured entropy or
cross-window privacy; failure-class content is not constrained to a closed vocabulary.

Stage 4Q's exemption path verifies the exemption signature but omits crossing-signature,
epoch and chain-membership checks; the chain verdict defaults to success. Its Python entry
point does not bind the supplied Action to the crossing digest. The retained “human” arm is
automatically environment-confirmed, and its census counts supplied events. See
[M110 and its probe](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m110--stage-4q-records-approval-fixtures-but-does-not-establish-complete-enforcement-or-human-attendance).
The bundle checks signed fixture digests using an embedded signer; it does not establish
external identity or validate every signed source-map, clause or schema assertion.

Stage 4R's both-tier CLI accepts an empty supplied corpus with the original signed attestation
and does not load Lane B or compare the signed evidence root to that corpus. Public-record
signatures and bindings are not authenticated there. Its DLEQ array check also accepts two
mask proofs in place of the required mask-plus-z pair. See
[M111 and its probe](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m111--stage-4rs-cli-does-not-bind-its-supplied-corpus-to-the-signed-root).
Lane B uses committed fixture scalars and a custom harness approval; its 4P/4N/4Q integrations
remain synthetic/deferred. These are reference research mechanisms requiring implementation
repair and independent cryptographic review before deployment claims.

Stage 4S validates supplied receipt trees but omits signer-to-parent/fanout-owner constraints
and several epoch/run and empty-fanout bindings. Its Python boundary does not authenticate
fanout/crossing signatures or bind the separate Action to the evaluated crossing. The local
MCP demonstration evaluates the chain after recording the task. See
[M112 and its probe](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m112--stage-4s-validates-a-supplied-tree-without-establishing-complete-delegation-authority).
Offline fixture success does not establish complete observation, persistent replay prevention
or enforcement before execution. Public-tier verification does not run the chain engine;
unknown tier names currently take that weaker path.

Stage 4T's capsule evaluator accepts producer-signed omissions of all projected sections and
does not bind section commitments back to projected values. A local probe passed a capsule
with a contradictory view even when that view was checked. The public attestation tier checks
signature/root/seal only; audit accepts a producer-signed empty fixture list. See
[M113 and its probe](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m113--stage-4t-does-not-enforce-complete-fields-or-bind-view-commitments-to-capsule-values).
The 4N anchor and block rows are authored fixture fields; 4O/4U replay and complete legal
reporting are not established. The browser renders unescaped supplied fields and does not
verify capsule signatures. Treat it as a research demonstration pending runtime repair.

Stage 4U commits attack IDs and family counts, not pre-run payloads or expected outcomes.
Its audit path does not bind each finding's expectation to its fixture and skips execution for
self-declared refusal findings; a producer-signed probe passed with every finding excluded and
0/0 ASR. Lane B entries are not fully verified by the attestation core, and no live capture is
retained. See [M114 and its probe](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m114--stage-4us-signed-schedule-does-not-precommit-payloads-or-independently-establish-attack-outcomes).
The optional live driver does not account for spend or reserve complete request budgets.
Treat its charter and cap fields as bounded research metadata pending implementation repair.

Stage 4V does not bind recomputation kinds to the meaning of contested sections or require a
temporal receipt for filing status. Its agreement path ignores the submitted claimed value;
its prose filter does not cover nested binding/census fields. A producer-signed empty fixture
bundle with no Lane B capture passes audit. See
[M115 and its probe](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m115--stage-4v-derives-fixture-disputes-without-establishing-semantic-correctness-or-independent-due-process).
The local respondent process is not isolated from the shared filesystem, and its recorded
blindness flags do not establish an independent operator or a legal due-process guarantee.

Stage 4W checks span metadata but does not bind displayed words to the verified value. A local
probe passed contradictory numeric prose and counted the entire mixed narrative as evidence
bytes. Its view check compares markers only, and its narrative evaluator does not authenticate
the capsule. See [M116 and its probe](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m116--stage-4w-verifies-span-metadata-without-binding-the-displayed-prose-to-that-metadata).
Do not interpret evidence badges, density or the bridge JSON as proof of truthful prose, complete
audit coverage or C2PA conformance. No live Stage 4W drafting capture is retained.

Stage 4X's audit compares only supplied outcome rows, so a producer-signed ledger can omit
corpus items and report zero slips. The file verifier binds corpus/ledger digests, but the
exported core omits that binding. Coverage and transform metadata checks are incomplete. See
[M117 and its probe](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m117--stage-4xs-replay-omits-ledger-completeness-and-does-not-establish-a-semantic-lower-bound).
The six-fixture result is reproducible research evidence, not field performance or an
irreducible semantic lower bound; Lane B is not included in the signed attestation.

Stage 4Y does not compare supplied audit data with its signed audit digest. Audit can pass
with removed shadow records, false audit metadata or absent document bytes; missing counterparts
skip reconciliation. Public schemas also accept arbitrary extra fields. See
[M118 and its probe](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m118--stage-4y-does-not-authenticate-the-supplied-audit-bundle-or-enforce-complete-replay).
Its browser implements a narrower verification path, and its OSCAL output is an incomplete
fragment. A pass does not establish authenticated audit contents, confidential redaction,
complete source-document submission or OSCAL conformance.

Stage 4Z binds supplied audit data but accepts jointly reduced declaration/capture counts,
duplicate declared layers/cells and empty per-tensor commitment tables. Missing audit data
returns SKIPPED before signature checks. Its system-card helper trusts caller-supplied aggregates
and does not authenticate those artifacts. See
[M119 and its probe](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m119--stage-4z-establishes-consistency-over-producer-declarations-not-independent-capture-completeness).
Neither its declared total grid nor copied model/lens digests establish actual capture coverage,
pre-run chronology, model provenance or monitor effectiveness.

Stage 5A permits duplicate unnarrated flags to inflate totals after producer re-signing.
Removing an optional signed manifest can bypass its failed check; missing pilot bytes and
VWA audit data silently reduce audit depth. Claim polarity/token validation and adapter binding
are incomplete. See
[M120 and its probe](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m120--stage-5a-permits-evidence-omission-and-recounts-duplicate-flags-as-extra-observations).
The browser's signature check does not authenticate its supplied input objects. The external
export, constitution corpus and live narrative/readout pair proposed for this stage were not
executed as described; synthetic fixtures do not establish those provenance claims.

Stage 5B's audit path does not compare recorded codes with replayed codes for existing findings.
Its signatures do not bind the supplied capture, and an empty substituted capture with a matching
unsigned root passes. Floor obligations can also be omitted. See
[M121 and its probe](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m121--stage-5b-does-not-authenticate-its-capture-or-enforce-replayed-finding-truth).
The retained 0/46 result primarily measures signature mutations; it does not demonstrate semantic
attack resistance, independent capture custody or a complete no-omission guarantee.

Stage 5C accepts extra slip records and duplicate rate rows; its grid coverage is relative to
producer-supplied bases. Audit without raw texts can accept laundered classifications when floor
rows are omitted. See
[M122 and its probe](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m122--stage-5c-completeness-is-conditional-and-severity-is-a-digest-label).
Its severity labels are deterministic digest buckets, and Lane C validates shallow metadata
rather than captured detector provenance. Its browser lacks the documented CSP.

Stage 5D accepts audit verification without its private log and does not reconcile signed attempt
counts or per-round commitments. Its source registry may be empty, and durability is derived from
producer-declared rule labels. See
[M123 and its probe](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m123--stage-5d-omits-required-audit-checks-and-classifies-declared-hardening-labels).
The finite normalization examples and self-reported review/provenance do not establish general
closure, independent human adjudication or complete historical ceremony capture.

Stage 5E enforces an external signer fingerprint and requires an audit census, but its evasion
records can reuse scores without reconciling their recipes to the selected score entry. Signed
reviews are not matched to the reviewed base/variant, and empty curves or duplicate score rows
can pass. See
[M124 and its probe](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m124--stage-5e-score-and-review-bindings-do-not-establish-the-full-claimed-provenance).
The capture harness does not enforce the documented revision/offline loading controls. A valid
fixture signature and internally consistent score table do not authenticate model execution.

Stage 5F checks a declared member-by-case grid but trusts supplied adapter replay data and
accepts census records whose semantic fields contradict public cells. The main verifier does
not verify the ceremony receipt; reference-binding mode can pass strict policy without external
reference checks. See
[M125 and its probe](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m125--stage-5f-verifies-a-declared-grid-with-incomplete-capture-and-ceremony-binding).
For external directories, supply an independently trusted signer fingerprint; the default pin
is read from the pack. Its completeness flags do not establish actual execution coverage.

Stage 5G binds signatures and key separation but does not reconcile capture context/cases with
the challenged corpus. Its audit accepts duplicate capture cells and empty attempt histories.
The fixture anchor checks a key signature and fixed time, not a real Sigstore certificate/log
chain, and its subject metadata is insufficiently bound. Lane B can corroborate a rejected
attestation. See
[M126 and its probe](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m126--stage-5g-proves-signature-separation-with-weaker-capture-and-anchor-checks).
Neither a rung-2 fixture result nor a ceremony flag establishes independently anchored custody.

Stage 5H authenticates reviewer signatures but does not match the review output digest to the
claim's committed output or enforce unique, consistent receipts. Core audit can accept an
incomplete reference census when bytes are supplied separately. Its CLI executes recipes and
loads unconstrained artifact paths before full validation. See
[M127 and its probe](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m127--stage-5h-disclosure-tiers-depend-on-incompletely-checked-reviewer-facts).
The portable browser check does not verify signatures. Tier/ceremony flags are not proof of
independent model reproduction, and the current CLI should not serve untrusted uploads.

Stage 5I verifies the outer attestation against its embedded key without correctly binding that
key to the configured verifier pin. Reviewer/host registries may be empty, separation evidence
can be borrowed across reviewers, and duplicate section entries inflate coverage depth. See
[M128 and its probe](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m128--stage-5i-panel-coverage-does-not-establish-the-claimed-independent-identities).
Its browser verifier accepts invalid signatures. Treat panel coverage as a research fixture;
the current result does not establish an independently authenticated panel or review quality.

Stage 5J accepts a contest ledger with no epoch tickets, does not reopen several claimed digests,
and compares all historical rating pairs while ignoring the signed severity direction. Its CLI
does not verify the separate public/audit attestations, and its registry bridge checks only a
root field. See
[M129 and its probe](docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md#m129--stage-5j-compares-historical-cross-products-and-leaves-ledger-binding-incomplete).
Treat history, independent-role and transparency-log claims as limited by these findings; portable
raw-zero results are not signature verification.
