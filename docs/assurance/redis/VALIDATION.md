# Redis connector validation — 15 October 2026

Validated on Linux, Node 24.19.0, Python 3.12.14 and Redis 8.10.2. SDK packages use the existing
hash-locked environment (OpenAI Agents SDK 0.23.1 and LangGraph 1.2.15). No model calls ran.

## Executed checks

- The committed installer downloaded the official source archive, verified its published SHA-256,
  compiled Redis with two build workers and installed the server successfully. No verification
  bypass was used. Runtime service startup checks the version and a real PING response.
- **14 Python tests passed**, including actual conditional writes, dropped accepted responses,
  pre-send loss, all eight authority-field substitutions, malformed input, conflicting/missing
  effects, Redis SIGKILL/AOF restart, eight start-gated processes, lock timeout, transport bounds,
  Internet socket/DNS blocking, both native SDK flows and complete study replay/tamper refusal.
- Initial connector, process/guard and study tests failed for their missing implementations;
  each suite passed after implementation. Ruff lint and formatting checks pass for the new code.
- **19 named report cases** execute real isolated Redis processes. The saved report binds the
  new Python sources/tests, installer, source lock, prior durability/SDK/lab implementation closure
  and saved prior reports. Every field is compared with a fresh execution by the verifier.
- A fresh independent reviewer reproduced the 14 tests and inspected commit-before-send,
  reconciliation, serialization, proxy acceptance evidence and cleanup. Saved-report replay and
  source provenance checks also passed; no Critical, Important or Minor defect was reported.

## Evidence boundaries

The proxy consumes an actual Redis success reply before disconnecting; it does not synthesize
acceptance. A separate GET and isolated database key count show the effect. The conservative
pre-send case deliberately remains unknown with zero effects and one pending intent. A fresh
process is a new executor, not an independent operator. Source-hash replay shares implementation
and fixtures and cannot establish independently authored validity.

The committed Redis fixture does not SIGKILL an executor between intent and receipt or combine pending
recovery with an eight-worker race. It covers dropped replies, ordinary contention and server
restart separately. Prior file-sink crash-window results do not prove these additional combinations.
A future `redis_pending_crash_race` fixture is an explicit evidence extension, not a current claim.

Hosted CI, hardware/power loss, remote failover, multi-host execution, full SDK workflow restoration,
authenticated human identity, revocation, independent reproduction and performance benchmarks were
not run. No API-key value was read or stored in this repository. The current result is bounded
connector evidence, not production or submission readiness.

## Final repository and environment checks

- Full `PYTHONDONTWRITEBYTECODE=1 npm test`: **5,122 total; 5,119 passed; zero failed;
  three skipped** (Chrome/Lean prerequisites unavailable). Existing SDK suite: **31 passed**;
  existing durability suite: **16 passed**.
- All four earlier saved reports (OpenAI offline, local lab, SDK and durability) verify against
  fresh execution. Their implementation and artifact bytes are unchanged from phase base
  `dcde77651bca739701a5c8727d21a1d6c1c52d58`.
- A new Python virtual environment installed the existing lock with `--require-hashes` and
  `--only-binary=:all:`; `pip check` and complete 19-case saved-report replay passed.
- CLI refuses an existing output path and a report with an omitted case with exit status 1.
  Unit tests also reject changed source hashes, added claims and altered observations.
- The workflow census reported exactly one added identity:
  `openai-readiness.yml::Validate real Redis connector recovery and ambiguous responses`,
  reason `missing_committed_universe_query`. Only the existing mutable `current` set was
  re-derived (27 → 28); the immutable baseline remains 19. The checker now passes. This
  records the classifier's limitation; it does not classify the new step as a complete gate.
- CI includes source installation, tests, fresh report generation and saved/fresh replay.
  These constituent commands ran locally; no hosted CI outcome is claimed.
- Reusable `install_script` and `start_skill` were saved in the cloud configuration draft.
  This confirms persistence, not publication or restoration in a new machine. Tests need no key.
