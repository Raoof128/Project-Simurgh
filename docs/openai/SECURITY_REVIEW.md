# Scoped security review for OpenAI readiness

Review date: 2026-10-15 (Australia/Sydney). Historical source baseline:
`61883d9e6cbea6c9dc9faccd50ed72bd0ec28ce1`.

**Disposition: suitable for a bounded, offline research demonstration; the historical live
gateway and heuristic authority gate are not cleared for production deployment.** This is
an independent agent's scoped source review with local counterexamples, not an external
audit, a whole-repository review, or a completed Codex Security scan. The requested scan
skill was read, but its required preflight reference and scan tools were unavailable.
No live provider, paid API, external target, or deployment was used for validation.

## Scope and trust assumptions

Reviewed the gateway session and run handlers; live-provider gating, budgets, provider
construction and fallback; mock tool policy; context provenance and provider message
construction; the HMAC audit-chain primitive; and the Python capability kernel and its
live executor shim. Read selected Stage 5S quorum/receiver and verifier sections to
identify trust prerequisites, not to certify the entire Stage 5S implementation.

Relevant source is under `src/llmShield/gateway/`,
`src/llmShield/{toolInvocationGate,toolPolicy,contextProvenanceGuard}.js`,
`src/audit/hmacChain.js`, and
`tools/agentdojo-simurgh-adapter/simurgh_agentdojo_adapter/{capability_kernel,live_defence}.py`.
Read `AGENTS.md`, `SECURITY.md`, the supplied readiness request, and relevant README
claims. This review does not cover native daemons, all historical stages, dependencies,
all server routes, formal-proof soundness, external witness operators, or infrastructure.
The separate dependency check below is an advisory/lockfile review, not a source audit
of dependency implementations.

Untrusted model outputs and tool results must not create authorization. A trusted
operator must supply exact authority outside those inputs. Local researchers control
their own process; an attacker controlling that process or signing key is outside a
same-process fixture's enforceable boundary. A signature authenticates bytes relative
to a trusted key, not truth, completeness, human deliberation, or signer independence.

## Confirmed historical findings

Severity is conditional on the documented deployment or integration preconditions.
These findings remain open in historical source. Frozen source and signed results were
preserved; an additive isolated demonstration does not remediate these paths.

| ID         | Severity / confidence                               | Evidence and consequence                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Required production remediation                                                                                                                                                                                     |
| ---------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OAI-SEC-01 | High if used for real egress; high confidence       | `capability_kernel.py:78` accepts a recipient when its local part occurs anywhere in trusted task text. `alice@attacker.example` is allowed for “Email the report to alice@trusted.example”. `live_defence.py:243` uses this decision before tool execution. An attacker influencing a proposed call can substitute a domain while retaining the authorized-looking name.                                                                                                 | Resolve complete destinations from trusted structured authority; compare exact addresses and bind all arguments. Do not inherit this frozen heuristic in a new integration.                                         |
| OAI-SEC-02 | High if used for destructive tools; high confidence | `capability_kernel.py:109` accepts any destructive target when a destructive keyword occurs in the task, including “Do not delete any files.” Deleting `sensitive-file` is also allowed when only `draft-1` was requested. The live shim uses this path when `gate_mutation` is enabled.                                                                                                                                                                                  | Bind explicit permission to operation and exact resource; reject negation/ambiguity through structured authority or confirmation. A text keyword is not authorization.                                              |
| OAI-SEC-03 | Medium; high confidence                             | `gatewayRouter.js:100` creates session bearer tokens without caller authentication. The server mounts this router directly. If an operator enables the historical live provider and exposes the server without an authenticating proxy, any reachable client can acquire a token and request billable calls or consume session capacity. Session-token possession alone does not establish operator permission.                                                           | Authenticate and authorize session creation and live execution; apply caller and global quotas. Keep the historical live gateway disabled unless these controls are supplied.                                       |
| OAI-SEC-04 | Medium; high confidence                             | `gatewayRouter.js:187` checks budget before an asynchronous provider call, then records usage only after completion at line 250. Two prechecks against a cap of one both succeed. Availability fallback makes another attempt without this budget check. The adapter constructs `new Anthropic({apiKey})`; the installed SDK defaults to two retries despite the adapter's “no auto-retry” comment. Counters therefore do not reliably bound attempted provider requests. | Reserve quota atomically before every attempt, including fallback; define failed/aborted-call accounting; disable SDK retries or explicitly account for them; use shared accounting across processes when deployed. |

There is no claim that these counterexamples occurred in historical runs. They establish
reachable implementation behavior and boundaries on reuse; they do not rewrite past
metrics. No public vulnerability issue or external notification was created.

## Dependency advisory remediation

The runtime `npm audit` baseline reported four vulnerable package entries: `proxy-addr`
(critical), and `qs`, `body-parser`, and `express` (moderate, including transitive
exposure). These are registry severity ratings, not four independently demonstrated
exploits against this application. Underlying advisories were:

- `GHSA-jqcg-44mw-7w3h`: IPv4-mapped IPv6 trust-subnet handling in `proxy-addr`.
- `GHSA-x5fp-wj9c-mxmx` and `GHSA-4mjr-xmp4-gh2g`: parsing/denial-of-service issues in `qs`.
- `GHSA-v422-hmwv-36x6`: invalid-limit handling in `body-parser` (also affected by `qs`).

The mutable root lockfile was updated within existing dependency ranges, without
`--force` or application-source edits:

| Package      | Before | After  |
| ------------ | ------ | ------ |
| express      | 4.22.2 | 4.22.3 |
| body-parser  | 1.20.5 | 1.20.8 |
| proxy-addr   | 2.0.7  | 2.0.8  |
| qs           | 6.15.2 | 6.16.1 |
| side-channel | 1.1.0  | 1.1.1  |

The lockfile diff was reviewed; the parent execution verified a frozen `npm ci` install.
The final `npm audit` JSON was independently inspected on the review date and reports
**0 known vulnerabilities** across the installed dependency graph.
Historical signed evidence was not regenerated. Dependency remediation does not close
the four application-level findings above. A clean advisory scan is a dated observation,
not proof of absence of vulnerabilities or production readiness.

## Evidence and assurance limits

- **The Stage 3D tool gate does not execute tools.** `toolInvocationGate.js` and
  `gatewayReceipt.js` explicitly keep `toolCalled`/`tool_called` false. Its allow/block
  outcomes alone cannot demonstrate that an actual external side effect was contained.
- **An intact HMAC prefix can verify.** Removing the last entry from a two-entry chain
  still produces `verifyChain(...).valid === true`; the verifier checks included links,
  not an independently committed final count/root. This is an assurance limitation,
  not a signature forgery. The 5,000-entry append cap also stops recording. Claims of
  complete execution history need an independently trusted final commitment and an
  explicit truncation failure policy. HMAC holders can themselves generate valid chains.
- **Preverified flags are a trust boundary.** Stage 5S `quorum.mjs:101` and
  `receivers.mjs:148` consume `signature_verified === true`. Those pure evaluators must
  receive such assertions from a trusted cryptographic verification layer, not directly
  from an untrusted uploaded JSON bundle. This review did not establish every caller's
  end-to-end enforcement and does not claim a demonstrated Stage 5S exploit.
- **Preserve research bounds.** Stage 5Q's 6.2% coverage remains 6.2%; Stage 5R discharged
  zero additional cells; Stage 5S comparison results are bounded by compared views and
  witness independence remains unproven. New local fixtures neither extend those
  denominators nor constitute external validation.

## Local validation performed

Focused existing tests: **24 passed, 0 failed**, using:

```sh
node --test tests/unit/llmShield/gateway/liveCallLedger.test.js \
  tests/unit/llmShield/gateway/liveProviderGuard.test.js \
  tests/unit/llmShield/gateway/fallbackOrchestrator.test.js \
  tests/unit/audit/verifyAudit.test.js
```

Additional in-memory probes asserted the following observed results. They imported
existing modules, used inert test keys, and made no provider or HTTP request:

```json
{
  "domain_substitution": "allow",
  "negated_delete": "allow",
  "different_delete_target": "allow",
  "concurrent_prechecks_accepted": 2,
  "configured_call_cap": 1,
  "recorded_calls": 2,
  "sdk_default_maxRetries": 2,
  "valid_after_tail_removed": true,
  "unauthenticated_session_handler_issues_token": true
}
```

The concurrency probe reproduces the check/reserve gap at the ledger interface; it is
not a paid load test. The unauthenticated-session probe invokes the route handler in
memory and checks that a token is returned; the absence of router-level authentication
was separately checked in source. Existing green tests do not cover these counterexamples.

## Readiness gates

The additive demonstration was independently reviewed after implementation:
`tools/openai-readiness/{corpus,boundary,experiment,artifact,run,verify,responsesAdapter}.mjs`
and `tests/unit/openaiReadiness/`. **26 tests passed, 0 failed** using
`node --test tests/unit/openaiReadiness/*.test.js`. No blocking defect was found for its
documented local research scope. This is bounded review evidence, not a guarantee that
the implementation has no defects.

The boundary enforces a server-owned tool registry, exact permitted object fields,
resource/destination matches, and approval binding to run/tool/argument digest. The
legacy gate blocks network-class actions; the only implemented effects are local
synthetic reads and an in-memory mock outbox. The Responses adapter has a fixed HTTPS
origin, rejects redirects, disables automatic retries by using one `fetch` per call,
caps request parameters and response bytes, applies an abort timeout, sanitizes errors,
and makes no tool calls. CLI live mode requires both `--live` and `--allow-live` plus
an explicit model and key. No live API call was made during this review.

Additional independent in-memory probes confirmed that accessor-backed proposals are
rejected without invoking the accessor; a JSON `__proto__` argument is rejected;
re-signing an artifact after inventing private-read effects or changing a source hash
does not pass full recomputation; and an all-timeout live replay counts neither
containment nor benign completion. Live replay explicitly leaves model origin unverified.

The effect oracle reads resulting sandbox state instead of the boundary's verdict;
it shares trusted fixture policy with the boundary and is not independently operated.
Approval records are trusted fixture values, not authenticated human decisions. Replay
protection lasts only for one sandbox instance. Self-attestations use an ephemeral,
embedded signing key and establish no externally trusted identity. File output refuses
existing files and symlinks, but does not promise protection from a hostile same-user
process racing filesystem operations. Keep generated receipts explicitly local research
evidence. Real tool connectors,
production authentication, durable replay protection, trusted key distribution,
external observation, and human-approval identity remain separate deployment work.

During review, a non-regular input could block the verifier at FIFO open before the
file-type check. The evaluator added nonblocking open and a regression test; the final
26-test run confirms FIFO input is rejected without hanging. Artifact input also has a
2 MiB cap, strict signature encoding, and sanitized parser/crypto error reporting.

## Expanded static sweep of the repository

An additional sweep used the **8,131 tracked paths at baseline `19960ce7`**. This is a
file-by-file inventory and automated static check, with deeper reasoning on selected
paths. It is not a claim that every file received a semantic security audit. The unavailable
Codex Security preflight/tooling limitation still applies.

| Coverage class                                   | Actual work                                                                                                                                                                     |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8,090 UTF-8 text files                           | Secret-shaped private-key and provider-token patterns checked; values excluded from findings                                                                                    |
| 41 binary files                                  | Size/hash inventory only; compressed files, documents and cryptographic blobs not decoded for secret scanning                                                                   |
| 1,575 source/configuration/script/workflow files | Additional scans for disabled TLS verification, shell execution, stubs, failure masking, remote installers and machine-specific paths                                           |
| 1,051 JavaScript, 133 Python and 157 shell files | Acorn parsing, Python AST parsing and `bash -n`, respectively; zero syntax failures                                                                                             |
| 26 complete files and sections of 7 others       | Read and reasoned in this expanded pass, including all eight workflows, server authorization/affinity sections, helper serialization, selected replay scripts and configuration |

UTF-8 source containing literal NUL characters was included in the text checks, rather
than silently excluded as binary. The internal per-path review manifest records hashes,
scope, syntax checks, pattern candidates, and the distinction between whole-file and
section review. It describes bytes observed during ongoing branch work; it is not a
single immutable post-fix snapshot. Pattern hits are candidates, not vulnerabilities.
Some failure-masking candidates remain untriaged; no blanket clean result is asserted.

### Additional findings and disposition

**OAI-SEC-05 — forwarded-header rate-limit bypass: remediated in the current branch.**
The baseline `src/security/rateLimit.js` accepted the first raw `X-Forwarded-For` value as
the client key, including when no trusted proxy was configured. An in-memory probe
admitted two requests from one socket against a limit of one by changing that header.
The affected IP-keyed server route is exam joining; the other token/secret-keyed limiters
have different key functions. The fix uses Express's trusted-proxy-aware `req.ip`, with
the socket address as fallback. Independent validation of the two focused rate-limit
test files passed **10/10**, including real local HTTP requests, configured trusted
proxies, and rejection of attacker-controlled leftmost forwarding hops. This closes the
demonstrated bypass; it does not provide shared quotas across server processes.

**OAI-SEC-06 — legacy affinity privacy boundary: open at this review.**
`tools/simurgh-helper/main.swift:304` serializes process IDs and process names. The
legacy `server.js` affinity ingest stores these fields and includes them in audit/SSE
data. Its `GET /api/affinity/:sessionId` returns the affinity record without requiring a
session or instructor token. The sender requires the configured helper shared secret;
the simulator requires demo mode. Reading a particular record requires knowledge of its
session ID, but session-ID secrecy is not equivalent to authorization. This is a
source-backed privacy exposure, not a demonstrated native-device capture in this
environment. Modern signed daemon-proof routes enforce a different, count-only boundary.
The legacy collection path contradicts an unqualified repository-wide claim that process
names/PIDs are never transmitted. Qualify that claim and either remove raw legacy data
at the sender/ingress or authorize and minimize the public status projection. Merely
authenticating reads does not eliminate raw collection or audit retention.

**OAI-SEC-07 — Stage 5L reproduce wrapper can report success after a failed gate: open.**
`scripts/reproduce-llm-shield-stage5l.sh:27` uses `diff ... && echo ...`; line 40 uses
`python3 ... && echo ...`, followed by the unconditional `ALL PASS` line. Under Bash
`set -e`, failure of the left side of an `&&` list does not terminate the script. A
minimal offline control-flow reproduction returned exit zero and printed `ALL PASS`
after the failing left-hand command. The historical generators were not executed or
modified. This establishes false-success wrapper behavior, not that the committed
evidence is incorrect. Repair via a declared historical-script maintenance change:
standalone gate commands or explicit nonzero exits, plus injected-failure regression
tests. The superficially similar Stage 5K Lean expression is inside a standalone
subshell whose nonzero status terminates the outer script; it was not classified as the
same defect.

**Saved OpenAI artifact CI coverage: remediated in the current branch.** The workflow
previously ignored `docs/openai/**` changes and verified only a newly generated temporary
report. Its triggers now include that directory, and an additional step verifies the
saved reviewer artifact against the current source. These workflow changes were read
locally; this review does not claim a new hosted Actions run.

### Repository hygiene and bounded negative results

The 91 private-key-shaped file matches were fixture/test/illustrative material, including
explicitly named `INSECURE_FIXTURE_ONLY` keys. The five provider-token-shaped matches were
mock leakage/privacy examples and matching tests/plans. **No live credential was
confirmed by this scan.** This limited pattern check cannot rule out other credential
formats, encoded values, binary-contained secrets, or secret reuse outside the repository.
Public fixture keys must never become production signing identities.

Two tracked CPython `.pyc` files under the AgentDojo adapter's `__pycache__` directory
were identified as generated-file cleanup candidates. The remaining binary inventory
includes deliberate research images, papers, anchor proofs and bundles; those files
were not classified as disposable merely because they are binary.

Placeholder searches mainly found UI hints, named mocks, fixture construction, and
explicit historical modeling assumptions. The Stage 5L adapter expressly sets
`facts.vucVerified = true` for its deterministic Lane-A model; it must not be promoted
as real embedded-commitment verification. No undocumented live OpenAI adapter stub was
found. Historical Lean bootstrap steps and setup instructions use mutable `latest` or
`master` download locations, and workflows use action tags rather than full commit
pins. These remain reproducibility/supply-chain hardening opportunities, not evidence
of a compromised dependency. No disabled-TLS pattern was found in the scanned source
surface; that is a bounded search result, not a complete TLS configuration audit.
