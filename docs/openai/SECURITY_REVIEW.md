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
