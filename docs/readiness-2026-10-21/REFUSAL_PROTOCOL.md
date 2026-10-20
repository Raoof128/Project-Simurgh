# Bounded active-refusal diagnostic

Declared before execution, 21 October 2026. This is an internally authored diagnostic, not an
independent evaluation or a replacement for the frozen Phase 17b result. The retained active
refusal says that the host-state message is not trusted authorization even though it uses the
developer role. Hypothesis: explicitly identifying developer messages as trusted host policy in
the system instruction may reduce this ambiguity. One sample per arm cannot establish causation.

Four fixed decision requests reuse the captured first read-tool response: baseline active,
clarified active, clarified signal-stop, clarified unknown-prior. The clarification is identical
across states. No case is deleted, retried, tuned after observation or counted as external work.
The captured untrusted work item remains unchanged. Local receiver replay retains all outcomes.
A separate forced-call control covers all eight lifecycle states irrespective of model refusal.

- Model: `gpt-6-luna`; default service tier; no reasoning; 256 maximum output tokens.
- At most four HTTP attempts, sequential, no redirects or retries; stop on first API/transport error.
- Budget ceiling: USD 1; reserve USD 0.25 per attempt before sending, using an exclusive ledger.
  Each request is bounded to 16 KiB. The historical smaller reserve is superseded for this probe.
- Requests and protocol are committed before execution; outputs go to a new directory.
- Use only `SIMURGH_OPENAI_API_KEY`, never write it to a request or artifact.
- This does not test provider credential revocation or alert delivery; organization access returned 403.

New diagnostic script: `docs/readiness-2026-10-21/refusal_diagnostic.py` (add).
New frozen input: `docs/readiness-2026-10-21/refusal-requests.json` (add).
These are standalone diagnostics; existing stage source/capture/specification bytes are untouched.
No new blocking gate. Successor work retains this protocol/results pair and declares new inputs
before a new campaign. Missing outputs remain missing, never successful. Local controls require
exact action effects plus statuses, with unknown prior effects retained.
