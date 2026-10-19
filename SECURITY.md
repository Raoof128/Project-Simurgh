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
