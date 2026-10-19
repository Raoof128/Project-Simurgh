# Manual review continuation — 19 October 2026

The owner requested full manual review after the initial audit distinguished 842 automated-only
files. This continuation starts at `15105bac03588d601a2961b3d6f61db72c3b37a4`: **919 tracked
document candidates**, including the nine documents added since the original 910-file baseline.
It does not retroactively convert the earlier scan into manual review.

## Review contract

Read the complete content of each candidate, including historical plans, logs, publication text,
fixtures and executable-page documentation. Record the exact reviewed bytes, a file-specific
assessment, supporting implementation/evidence checks and each correction. An automated scan,
heading list or excerpt does not establish completion. Truncated reads require a continuation.
Extracted PDF/Word text does not establish visual-layout review.

Correct mutable guidance directly under the existing [audit authority](DESIGN.md). Preserve
frozen specifications, scientific evidence, exact archives and append-only history; record
specific dated corrections to those records. Do not execute historical instructions merely
because they occur in a document. Documentation corrections do not authorize new inference,
outreach, runtime changes or changes to scientific measurements.

The prior [report](README.md), [inventory](inventory.json) and [validation](VALIDATION.md)
remain records of their own scope. This continuation is **in progress** until every candidate
has a complete manual disposition and all identified documentation corrections are resolved.

## Coverage checkpoint

The [per-file progress ledger](manual-progress.json) retains all 919 baseline identities and
SHA-256 values. At this checkpoint, **400 documents have complete manual reads; 519 remain
unread in this continuation**. A complete read is separate from final claim verification and
correction validation. Each read has a file-specific assessment; pending rows remain pending.
This is a progress checkpoint, not completion of the owner's exhaustive-review request.

## Findings confirmed against implementation

### M01 — Student-identifier transformation

`PRIVACY.md` described plain SHA-256 before any processing. The join route necessarily receives
and processes the raw identifier; `src/privacy/hashIdentity.js` uses **HMAC-SHA256**, with
`SIMURGH_STUDENT_ID_PEPPER`, then `SIMURGH_AUDIT_SECRET`, then a known development fallback.
The stored value is prefixed `v1:`. Correct the policy and security summary to describe keyed
pseudonymization, raw ingress and its limits, without promising anonymity or infrastructure-wide
absence of logs. No identity code is changed.

### M02 — Platform-specific daemon identity storage

`PRIVACY.md` described all daemon keys as stored in macOS Keychain. The macOS daemon uses a
Keychain generic-password item; Windows creates an ephemeral P-256 key; Linux uses an XDG-state
PEM file, setting a new file to mode 0600 and the containing directory to 0700. Correct the table
and link the three implementations. These are software-key mechanisms, not hardware attestation.

### M03 — Audit verification prerequisites and assurance

The security guide's audit-verification command omitted the required `SIMURGH_AUDIT_SECRET`
and used a shell-invalid angle-bracket placeholder. Use an explicit example file path.
`tools/verify-audit.mjs` requires the original key and checks supplied entries and an optional
terminator. That does not establish completeness or protect against an operator who can rewrite
both the chain and its supplied terminator. State the prerequisite and trust boundary; remove
the blanket closing claim that the entire Stage 1 surface is hardened/privacy-preserving.

### M04 — Secret separation is a configuration requirement

`SECURITY.md` said secret reuse was not permitted without distinguishing policy from enforcement.
The bootstrap in `server.js` rejects missing non-demo secrets but does not compare values for
reuse. State the separation requirement and the absence of an equality check accurately.

### M05 — Academic telemetry eviction is periodic

`PRIVACY.md` presented four hours as an exact eviction time. `server.js` uses a four-hour
inactivity threshold checked every five minutes, followed by separate periodic cleanup of
associated registries. State this timing and avoid promising a universal exact deletion deadline.

### M06 — Linux startup command and configuration

`tools/simurgh-daemon-linux/README.md` omitted `--bin simurgh-daemon-linux`. With the
configured toolchain, Cargo exits because it discovers both the daemon and fixture binaries.
The documented `--port` argument is also unsupported: `src/main.rs` uses `DaemonConfig::default`
and reads no CLI arguments. The corrected command selects the daemon and states its fixed
configuration defaults. Links now distinguish the earlier Stage 2.7 rejection matrix from the
implemented Linux Stage 2.8 surface. The selected daemon build passes with the locked manifest.

### M07 — macOS CLI output and example semantics

`tools/simurgh-node-macos/README.md` claimed both that key-info prints only public identifiers
and that normal proof JSON includes `key_path`. `main.swift` includes the path in key-info
diagnostics; `ProofEnvelope.swift` does not include it in normal proofs. Correct both assertions.
Use a shell-valid example session name and distinguish HTTP status 202 from a JSON `status`
field. Existing joined-session/token prerequisites remain necessary.

### M08 — Fixture behavior and local output

`tools/invisible-window-poc/README.md` qualified capture behavior in prose but still promised
capture invisibility in its hotkey table. Its no-logging statement was also false: `main.swift`
prints a native window number and click-through status. Correct both without claiming a new
interactive macOS test. The frozen fixture's on-window claims about capture APIs and two-second
detection are historical text, not newly validated observations.

### M09 — Adapter subcomponent boundaries and working directory

`tools/agentdojo-simurgh-adapter/README.md` generalized the gateway-only behavior of
`defence.py` to the whole package, which also contains Python-side authority decisions in
`live_defence.py` and `capability_kernel.py`. Narrow the claim and link the retained security
findings. The canary smoke starts a local HTTP server, so replace “no network” with no external
provider request. Make the pytest working directory explicit.

### M10 — Consent and legacy capture scope

`docs/ETHICS.md` needs both parts of the legacy-helper exception: raw identifiers and local
pixel sampling. Its consent statement also conflated joined exams with the anonymous demo:
the client dismisses the demo notice locally, while `server.js` enforces a privacy-accepted
lifecycle state for joined-exam start. State this difference without claiming that acknowledgment
establishes a legal basis or voluntary consent.

### M11 — Fresh replay environment

`README.md` used a fixed `/tmp/simurgh-review` environment despite requiring fresh paths in
the documentation policy. Use `mktemp -d`, keep the variable in the same shell and quote all
derived paths. The command still installs the same hash-locked dependencies and replays the
same archives; no new model capture is introduced.

### M12 — Historical Stage 1/2 interpretation corrections

The following documents were read completely. Preserve their historical bytes and apply these
specific corrections when using them today:

| Record                                  | Correction                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/REVIEWER_CHECKLIST.md`            | “Stage 2 not implemented yet” contradicts its own merged Stage 2.1/2.2 banner. Use the dated architecture and subsequent native evidence; the old helper-auth check now meets a retired HTTP 410 route.                                                                                                                                                                                                                                                             |
| `docs/DEMO_SCRIPT.md`                   | Step 10 calls Stage 2 unimplemented despite its updated header. The helper demo is retired; current installation and validation commands are in CONTRIBUTING and the root README.                                                                                                                                                                                                                                                                                   |
| `docs/DECISIONS.md`                     | Metadata/no-screen decisions describe intended collection policy; the legacy helper later documented raw identifier transmission and local pixel sampling. HMAC verification assumes the key and a trusted retained commitment.                                                                                                                                                                                                                                     |
| `docs/LIMITATIONS.md`                   | Historical helper ingestion is no longer an available supported route. No-content statements must not erase the helper's local image-buffer access.                                                                                                                                                                                                                                                                                                                 |
| `docs/RISK_REGISTER.md`                 | Qualitative likelihood/impact ratings are uncalibrated planning judgments. “Controlled” privacy/audit rows do not prove all routes obeyed the policy or protect against a signing-key holder.                                                                                                                                                                                                                                                                       |
| `docs/THREAT_MODEL.md`                  | The no-screen goal differs from legacy helper implementation. HMAC integrity is bounded by the explicitly trusted server and keys; a signed envelope does not defeat a compromised endpoint.                                                                                                                                                                                                                                                                        |
| `docs/RESOURCE_PLAN.md`                 | The Stage 2.5 ScreenCaptureKit proposal was followed by a CoreGraphics metadata scanner. Completed native components do not supply institutional, accessibility or legal validation.                                                                                                                                                                                                                                                                                |
| `docs/VALIDATION.md`                    | Its 32-gate count and helper-401 behavior are historical. `NaN` and `Infinity` are not JSON numeric literals; replay-guard tests alone do not demonstrate telemetry numeric validation. Run broad/fixing scripts only in a disposable checkout.                                                                                                                                                                                                                     |
| `docs/RESEARCH_PROGRAMME.md`            | “Anyone can verify” is incorrect for this HMAC CLI without the original institutional key. The 10/10 internal question list is not a permanent security score or evidence of calibrated rate limits. Software-key signatures authenticate assertions relative to a key, not physical device truth.                                                                                                                                                                  |
| `docs/DEVICE_SHIELD_CONTRACT.md`        | Stage 2.7's Linux exclusion, 29-field inline list and future extraction are superseded: `forbiddenLocalFields.js` exists and Linux Stage 2.8 adds fields. Current scanner-unavailable mapping returns warning risk without a daemon-required argument. Session Critical wording says “required”; device-summary wording says “recommended.” A blanket ban on the phrase “automatic misconduct” must permit the required negation “No automatic misconduct finding.” |
| `docs/DEVICE_SHIELD_PLATFORM_MATRIX.md` | Linux-rejection rows and historical README section references apply to Stage 2.7; they must not be used as the current platform matrix. “Future” means future at that record's baseline.                                                                                                                                                                                                                                                                            |

These notes correct interpretation; they do not silently amend a frozen contract or certify
all of its historical enforcement paths. The current [integration matrix](../INTEGRATIONS.md)
and [historical replay guide](../HISTORICAL_REPLAY.md) supply the appropriate entry points.

### M13 — Audit errata table rendering

The previous audit's `ERRATA.md` row D18 contained an unescaped pipeline character, splitting
the explanation into an unintended fourth table column. Rewrite that sentence without the
inline pipeline and restore the three-column table. The finding and prescribed pipefail
behavior remain unchanged.

### M14 — Observed role correction, not an isolated causal result

`docs/openai/OPENAI_BRIEF.md` attributed the original live workflow declines to where host
updates appeared. The successor changed their role and observed different choices, but this
post-observation comparison does not isolate causation. Use “with host updates supplied” and
retain the original failures, correction identity and unresolved active case.

### M15 — Handoff paths and independent receipt

`docs/research/CONTINUATION_HANDOFF_2026-10-19.md` created its environment inside the checkout.
Use a fresh external `mktemp` directory and the same shell for derived paths. Link directly to
`docs/research/explorer-phase-18/independent-receipt-template.json`. The template prepares an
outside operator's report; it does not establish that the operator has run it.

### M16 — Dated follow-ups in the assurance studies

Preserve the complete historical reports and plans, and interpret their future-work lists with
these successor mappings. A later local experiment does not retrospectively improve an earlier
result or establish outside custody:

| Historical record                                                                           | Current interpretation                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/assurance/meta/README.md`                                                             | The 3B “not downloaded or benchmarked” statement applies to this initial 1B pilot. The later safety study contains a separately frozen 3B arm.                                                                 |
| `docs/assurance/meta-study/README.md`                                                       | The planned OpenAI comparison now has separate plain-text and native-call reports. This study still has zero complete workflows and unexercised model-derived recovery.                                        |
| `docs/assurance/openai-comparison/README.md`                                                | Its proposed native-call successor exists at `docs/assurance/openai-native/README.md`; the original zero-completion result is unchanged.                                                                       |
| `docs/assurance/hf-incident/README.md`                                                      | The composed local chain and file isolation have successor evidence in `hf-containment` and `hf-native`. Production identity integration and an outside operator receipt remain unfulfilled.                   |
| `docs/assurance/hf-containment/README.md`                                                   | Its twelve scripted unsafe baselines and the native successor's one model-selected witness are distinct denominators. Local gateway credentials are not production OAuth/IAM.                                  |
| `docs/assurance/safety-study/README.md`                                                     | Later workflow and provider-transfer studies add declared lifecycle evidence; this report itself does not test autonomous multi-turn behavior or concurrent revocation.                                        |
| `docs/assurance/safety-study/MODEL_SOURCES.md` and `evidence/model-research/feasibility.md` | Resource figures are pre-run estimates, superseded for measured local execution by the safety-study results. The 8B access failure describes that credential and date.                                         |
| `DEVICE_ROADMAP.md`                                                                         | This exact archive's SHA-256, no-content and absent-contributor-guide wording is superseded by current privacy guidance and CONTRIBUTING. Stage 3 “proposed” and the Stage 2.7 Linux exclusion are historical. |

### M17 — Vendor model-card precision

The archived `docs/assurance/safety-study/evidence/model-research/Llama-3.2-3B-Instruct.README.md`
contains a vendor footnote equating prefill throughput in tokens/second with inverse
time-to-first-token in seconds. The latter has units of inverse seconds; a throughput calculation
also needs the processed token count, and TTFT can include other overhead. Do not use that
footnote as a performance definition. Both archived model cards remain exact vendor snapshots;
their benchmark scores and deployment claims are not Simurgh measurements. Their unpinned
installation examples are historical examples, not the maintained replay procedure.

### M18 — Historical paper audit overstates verification

`docs/PAPER_ACCURACY_AUDIT.md` was read in full, including every claim-table row. Its executive
verdict is not a current independent paper certification. Specific corrections:

- Counting Rust annotations, .NET methods or Swift methods establishes source inventory, not
  test execution or passing results. Use dated actual execution receipts and their environments.
- The opening says three wording defects were fixed; the table, required-edits section and
  conclusion still describe them as open. Cite the actual manuscript revision for resolution.
- The path is now `papers/project-simurgh/main.tex`, with a lowercase `papers` directory.
- `/api/pairing/challenge` and `/api/pairing/complete` are not acceptable runnable shorthand for
  the browser-paired routes: their actual prefix is `/api/integrity/pairing/`.
- The browser-paired nonce paragraph incorrectly attributes session binding to ECDSA; that
  envelope uses Ed25519. Device-daemon P-256 proofs use the separate challenge protocol.
- Plain SHA-256 student hashing and “no screenshot API in any source” are incorrect for the
  current implementation and retained legacy helper. Apply M01 and M10 to these claims.
- A finite replay cache prevents reuse while the nonce remains retained; it does not alone
  establish permanent replay rejection. Timestamp/session verification are separate checks.
- Its four-column claim table has an extra delimiter column, and its Rust grep example contains
  an unescaped Markdown pipe. Those are rendering defects in the historical source.
- “Ready for submission,” “all claims verify,” and a 10/10 internal score do not establish peer
  review, ethics approval, institutional endorsement or a completed independent security audit.

Preserve the original audit and publication bytes. These corrections govern current use of
that record and must accompany any future manuscript revision.

### M19 — Native evidence summaries and historical status

`docs/evidence/stage-2-linux/README.md` allows a signed-proof summary with its signature
redacted. Such a summary cannot itself support signature verification; distinguish redacted
sharing from replay of the original cryptographic artifact. Its target validation matrix is a
plan, not proof that those desktops were exercised. The project-wide metadata-only statement
in `docs/evidence/stage-2-windows/README.md` needs the legacy-helper exception in PRIVACY.

### M20 — Banking Phase A/B status and evidence discrepancies

The Phase A protocol, threat model, data-management plan and placeholder participant notice
are historical. Phase B now has separate records under `docs/research/banking-pilot/phase-b/`.
The Phase A threat model's “no rate limiting” and future-hardening statements also conflict
with its closeout's implemented per-IP limits. Refer to the implemented route and dated
closeout rather than treating the earlier limitation as current.

The complete Phase B documents and their small evidence records reveal these unresolved
provenance issues. Preserve the observations; do not invent retroactive participant approvals:

- `BANKING_PILOT_PHASE_B_PROTOCOL.md` specifies two to three testers; the closeout and aggregate
  JSON report five. The deviation needs an identified amendment or an explicit limitation.
- `BANKING_PILOT_PHASE_B_GO_NO_GO_CHECKLIST.md` remains dated `no_go_pending_tester_selection`,
  with participant selection/notice/comprehension confirmations unchecked. A completed-results
  assertion is not a substitute for the missing approval linkage.
- `BANKING_PILOT_PHASE_B_DOC_AUDIT.md` reviews preparation scaffolds, describing the closeout
  as unexecuted. That earlier verdict does not certify the subsequent human-run record.
- `BANKING_PILOT_PHASE_B_CLAIM_AUDIT.md` says its privacy log scanned eight files; the retained
  `evidence/phase-b-internal-dry-run/privacy-audit-phase-b.txt` explicitly says six. Use six for
  that receipt; a later scan requires its own dated log.
- `aggregate-results.json` records four report/audit/verify openings and five testers. The
  runbook asks each tester to open those exports. The aggregate does not establish complete
  adherence by all five; its counter semantics and the three-session rerun should remain separate.
- Known-value and forbidden-structure scans support bounded fixture checks, not an exhaustive
  claim that arbitrary sensitive information could never arrive at the server. HMAC-linked
  records and random participant codes do not independently establish privacy or anonymity.

### M21 — Banking explanation claims exceed the static check

`phase-b4a/BANKING_PILOT_PHASE_B4A_CLAIM_AUDIT.md` and its closeout cite a four-module lexical
scan as proof of no network egress. `scripts/privacy-audit-banking-pilot-ai-firewall.mjs`
checks named network APIs with a regular expression. This supports absence of those tokens in
the declared files; it is not dependency-wide analysis or runtime network isolation. The
implemented narrator is an offline deterministic mock. Its phrase guard covers a finite set
of claims, and the study does not measure a general improvement in explanation quality.

The B4-B claim audit and closeout call the change presentation-only and say the output firewall
was unchanged, while that same closeout records exact-schema output-firewall hardening.
Describe it as presentation work with that bounded validation repair. The earlier B4-A plan
for a B4-B surface has been followed by a separate B4-B record. Receipt booleans remain
application assertions, not an independent measurement of all host network activity.

### M22 — Model-assisted paper review is not independent validation

All eight governance/synthesis documents and all thirteen prompts in
`docs/research/banking-pilot/stage-b5-model-paper/` were read completely. The prompts and recorded
role scores are historical model-review artifacts, not instructions to execute new model calls.
Apply these corrections to the recorded output:

- `MODEL_RESPONSE_LOG.md` calls the privacy receipt signed. `bankingAiPrivacyReceipt.js` returns
  flags and a SHA-256 narrative digest, without a receipt signature. An associated HMAC audit
  event is a separate object and trust boundary.
- That log's “structurally incapable of exfiltration” and its “proves no-egress” comparisons
  exceed the four-file lexical gate described in M21. Its analogy with memory safety is a
  proposed framing, not a demonstrated formal guarantee.
- `MODEL_REVIEW_INPUT_PACK.md` describes false privacy flags as proof that nothing sensitive
  was recorded. They are application assertions; actual bounded evidence comes from the
  declared schema tests, scans and observations. Retain the Phase B discrepancies in M20.
- `MODEL_REVIEW_PROTOCOL.md` and `MODEL_REVIEW_CLOSEOUT.md` describe every response as logged,
  but the abstract pass retains five style summaries rather than five full requested abstracts.
  The response log is a synthesis record, not a complete raw model transcript or independent
  execution attestation. Its all-PASS rubric is self-assessment, not peer review.
- The allowed-input document permits other public documents while the protocol requires the
  frozen pack as the sole factual input. Current interpretation must use the narrower declared
  pack; actual historical input provenance cannot be established by those statements alone.
- `MODEL_REVIEW_CLOSEOUT.md` retains citation-needed categories and venue/camera-ready work.
  A generated draft and simulated reviewer acceptance do not establish citation completeness,
  submission, acceptance or external review. The later manuscript location is
  `papers/banking-shield/source/`; historical `paper/` references are not current runnable paths.

### M23 — Voting-pilot record consistency and privacy limits

All sixteen Markdown records in `docs/research/mq-voting-pilot/` and `results/`, plus the ten
short gate receipts under `evidence/pre-pilot/` and `evidence/phase-c-closeout/`, were read
completely. The two long npm test transcripts remain pending complete reading. Findings:

- The original protocol specifies three to five Phase B members; Phase A closeout specifies
  one to three. Phase B reports 34 artifacts, not a verified count of distinct people. Keep
  artifacts, sessions and participants separate.
- Phase C's protocol and notice still say pending/draft while its checklist says GO and its
  closeout says complete. The executive request says pending at the top but records an approved
  row below. These are inconsistent historical status fields, not evidence of a new approval.
- The Phase C ceiling is thirty participants; closeout records thirty-one consented sessions,
  thirty submissions and one withdrawal. Session counts alone do not establish whether the
  participant ceiling was exceeded or whether a participant had multiple sessions. Do not
  silently equate thirty submitted sessions with thirty unique participants.
- The Phase C data-management addendum still has a blank retention-end date and unchecked
  prerequisites. Its “local-only” and researcher-only access rules must be reconciled with
  any publicly committed session artifacts before claiming adherence. This audit does not
  invent a retention date, erase evidence or certify consent for publication.
- Random codes, timestamps and stable keyed hashes are pseudonymous data; their absence of
  names does not establish that they are unidentifiable in every context. Replace absolute
  anonymity interpretations with the documented collection and access assumptions.
- The participant notice says it records acceptance or decline, but also says decline creates
  no record. The documented implementation creates a session on acceptance; distinguish that
  from ordinary web-server/infrastructure request logs. Its HMAC validity statement is relative
  to trusted keys/history, not proof that a key-holding operator never changed the record.
- `PHASE_A_CLOSEOUT.md` reports nine evidence files scanned, while its retained pre-pilot
  privacy log says **zero voting evidence files** and one separate Linux fixture. That empty
  voting scan does not establish artifact coverage. The Phase C privacy log separately reports
  fifty-two voting artifacts and one Linux fixture; do not mix those two counters.
- `PHASE_C_RESULTS_TABLES.md` labels Table 3 as thirty submitted sessions but includes all
  thirty-one consented sessions and the withdrawal. Interpret it as the full cohort flow.
- Both npm advisory receipts retain two moderate findings. “Zero high/critical” must not be
  shortened to zero vulnerabilities across all severities.
- The closure smoke proves that an unauthenticated report request remains 401 rather than
  410; it does not by itself demonstrate successful authenticated report export. All write-route
  closure claims remain conditional on the collection-closed configuration.
- False report flags and selected forbidden-field checks are bounded observations. They do
  not independently prove that no ballot data was ever collected by any browser or host.

### M24 — Voting ethics claims need their actual determination

The original voting protocol requires formal ethics approval for Phase C, while later records
state that a researcher rationale made a formal application unnecessary. The checked-in GO table
and executive approval row do not themselves establish an institutional exemption or review.
The exact determination and its scope remain unverified in this audit; do not label the pilot
“HREC-approved” or infer wrongdoing solely from an incomplete public record.

For current handover, [Macquarie's applications and approvals guidance](https://www.mq.edu.au/research/our-research/research-ethics-and-integrity/human-ethics/applications-and-approvals)
uses a risk-assessment pathway even when researchers think a project may be exempt. Refer to the
applicable institutional determination rather than treating internal, voluntary or aggregate-only
work as automatically exempt. [NHMRC's dated version history](https://www.nhmrc.gov.au/about-us/publications/national-statement-ethical-conduct-human-research-2023)
says the 2023 National Statement applied through 22 June 2026 and the 2025 version took effect
on 23 June. The reported pilot closed on 4 June; current guidance must not be misrepresented as
the exact rule in force at that earlier date. These sources were checked on 19 October 2026.

The addendum's blanket instruction not to notify participants unless advised should not be reused
as a universal breach-response rule. Any actual incident must follow the applicable institutional
and legal notification process. No participant contact, new study, institutional submission or
retroactive sign-off is performed by this documentation review.

### M25 — AISec artifact checks are narrower than replay

The AISec package README, artifact README, all seven audit documents, six short section notes
and bibliography were read completely. Its wrapper `artifact/reproduce-paper-claims.sh`
checks committed metric fields and searches the retained Stage 3M verifier transcript for PASS
strings. It does not invoke the cryptographic verifier or re-execute the Stage 3X chain.
The wrapper passes now, but that establishes only these stored-artifact checks. The artifact
README's “what reviewers can reproduce” list must not be read as the wrapper's actual execution
scope. Use the original stage verifiers for their stronger, separately documented checks.

The historical reproducibility audit uses uppercase `Papers/` paths and repeated `cd` commands
that are not a valid sequential recipe from the current tree. Use lowercase `papers/` and the
root-based maintained guidance. Its dated Node prerequisite is not a repository-wide toolchain
promise. The final checklist's upload-ready verdict and five-page/anonymity observations are
specific to 24 June, not a current venue clearance or evidence of submission.

The [official AISec 2026 CFP](https://aisec.cc/), checked on 19 October 2026, confirms that the
July 24 submission deadline and September 16 camera-ready deadline have passed. It allows ten
content pages and twelve overall, with its stated exception for a GenAI-only thirteenth page;
it requires the GenAI statement after references/appendices. The current draft's venue metadata
and identity handling still require revision-specific review before any future submission.
Nothing in this audit authorizes uploading or contacting a venue. Citation audit coverage also
omits the bibliography's CaMeL entry; a verified bibliography label is not evidence that every
entry was independently checked in that historical audit.

### M26 — AISec manuscript consistency and publication limits

Both `papers/llm-shield-aisec2026/main.tex` and the complete eight-page PDF were read.
Page 4 was also rendered and inspected: the long attack-envelope list extends beyond the
right margin. The historical five-page checklist therefore does not describe this PDF.
A future manuscript revision needs a fresh build and page-by-page visual review; the
preserved publication artifact has not been overwritten.

- The October/TBD conference metadata is obsolete. The official CFP places the workshop on
  15 November 2026 in The Hague; this does not establish paper acceptance or publication rights.
- The abstract's blanket synthetic/self-authored description needs to distinguish the Stage 3L
  corpus, AgentDojo-derived component fixtures and the later live-agent runs. The limitations
  section should describe additional live-agent replication as future work, because a live run
  is already reported in the body.
- Rendering published AgentDojo goals and attack templates into 175 combinations is a derived
  evaluation. Attribute the upstream components and the local rendering separately; it is not
  independent execution or third-party validation of Simurgh.
- A finite differential test supports equivalence over its enumerated inputs. It does not prove
  equivalence for every possible argument or transfer all properties of a live experiment.
  The stated cause of the one benign regression remains a hypothesis unless supported by a
  controlled rerun; do not replace the observed 7/10 to 6/10 utility result with that explanation.
- The text says three defenses use the same baseline, but its table reports different
  same-session baseline counts. Compare each defense with its reported paired baseline and
  retain those denominators. The Stage 3Z witness is a local mechanism demonstration, not an
  independently operated external validation. “Pass every check” is too broad when the same
  paper demonstrates that an additional witness detects a dishonest signed receipt.
- The adjacent literature matrix calls RFC 8785 and RFC 8032 Internet standards. The RFC
  Editor classifies both as Informational: see [RFC 8785](https://www.rfc-editor.org/info/rfc8785/)
  and [RFC 8032](https://www.rfc-editor.org/info/rfc8032/), checked 19 October 2026. Established
  cryptographic specifications should not be confused with their formal RFC status.
- The anonymous-archive builder copies a narrow package and checks selected identity strings.
  This is not a comprehensive anonymity review. The retained tarball also contains AppleDouble
  entries and extended metadata; a future anonymous release needs an explicit metadata review.
  Its wrapper depends on repository evidence outside that archive, so the archive alone is not
  a self-contained reproduction environment.

### M27 — Banking manuscript revisions retain substantive defects

All twenty-three baseline documents in `papers/banking-shield/` were read, including
each draft, all three complete PDF text extractions, the bibliography and simulated reviews.
The later prose improves the claim boundaries, but the historical “every factual claim verified
true” verdict is not a complete or current assurance statement.

- Draft v0.1 uses 47 forbidden field names; the later corrected count is 46. Drafts v0.1,
  v1.0 and v1.1 use 28 claim phrases; the corrected count is 29. The v1.2 Markdown and main
  LaTeX use 29, but the retained v1.2 draft PDF still uses 28, the v1.1 disclosure, old citation
  years and the internal “page-one figure candidate” caption. That PDF predates those fixes.
- The package README describes a seven-page main PDF; `pdfinfo` reports six. The draft PDFs
  are separate thirteen- and fourteen-page artifacts. The v1.2 PDF's page 13 was visually
  checked: its EPC URL extends past the page edge. Do not treat a successful text extraction
  or historical export checkbox as proof of professional typesetting.
- Figure 3's success arrow goes directly from the provider to the response, bypassing the
  output guard in the drawing. The implementation checks the output before returning success.
  A corrected diagram must connect the successful output-guard decision to the response.
  This was checked in both LaTeX and the rendered main PDF's page 4.
- “Every response” has a privacy receipt is too broad: at the frozen `92dabb4` revision and
  in current `src/bankingPilot/index.js`, missing-session and not-yet-submitted errors return
  without that receipt. Authentication middleware also precedes the explanation pipeline.
  Receipt coverage concerns the documented explanation outcomes, not every HTTP rejection.
- The later related-work paragraph still says the provider is “statically unable to egress,”
  despite the limitations section's narrower source-scan scope. Apply M21 throughout. Output
  equality checks a structured policy value; it does not prove every narrative sentence agrees
  semantically. A receipt's false flags are application assertions, not independent sensors.
- The outline and early drafts claim structural controls are better than content filtering
  without a comparative experiment. Present that as a design hypothesis. The broad industry
  statements about unpoliced overclaims, default leaks and the costliest failure mode need
  specific evidence and scope; they are not established by this prototype's tests.
- An allowlist validator can log rejected inputs. The paper's claim that allowlisting cannot
  produce refusal evidence is not an inherent limitation of allowlists; it describes a local
  design choice to record particular denied fields separately.
- The five simulated review roles are explicitly model-assisted, not five independent experts.
  “Not a user study” should not be reused as an institutional ethics determination: the records
  still describe human participation and feedback. Preserve the n=5, checklist-only and
  three-session-rerun limits rather than inferring population validity or an exemption.
- The old `docs/research/banking-pilot/paper/` paths in drafts, audits and export commands now
  map to `papers/banking-shield/source/`. Build the canonical paper from its package directory;
  run implementation gates from an isolated repository root. Some privacy gates write fixtures,
  so they are not read-only checks of the retained evidence pack.

The revision-specific corrections above accompany the frozen papers; this review does not
silently replace a deposited PDF, change its license or publish a new version.

### M28 — Banking bibliography author names and verification scope

On 19 October 2026, the twelve academic DOIs returned Crossref metadata and the preprint DOI
returned DataCite metadata matching its title and author. This confirms registry records,
not the accuracy of every cited interpretation. The bibliography contains seventeen entries,
including four institutional URLs and the self-citation. Its blanket statement that every entry
was verified through Crossref is therefore misleading; the historical audit itself lists URL
checks separately and records two HTTP 403 responses. A 403 alone does not verify page content.

The following expanded author names in `papers/banking-shield/references.bib` disagree with
the publisher-supplied Crossref records. Use the registry names below in a corrected edition;
the printed initial-only citations often conceal these errors.

| Reference                         | Retained bibliography                         | Registry correction and source                                                                                             |
| --------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Secure logging                    | T. Rajani Sree; S. Mary Saira Bhanu           | Thankaraja Raja Sree; Somasundaram Mary Saira Bhanu — [Crossref record](https://api.crossref.org/works/10.1002%2Fcpe.5143) |
| BCALS                             | Aitizaz Ali; Abdullah Khan                    | Ahmad Ali; Abid Khan — [Crossref record](https://api.crossref.org/works/10.1002%2Fett.4272)                                |
| Wireless Emergency Alert messages | Gerard Kim; Andrew Martel; Kotagal L. Johnson | Grace Kim; Andrea Martel; Kerri L. Johnson — [Crossref record](https://api.crossref.org/works/10.1111%2F1468-5973.12278)   |
| Across the Pond                   | Rima Manini                                   | Raffaele Manini — [Crossref record](https://api.crossref.org/works/10.1111%2F1911-3846.12735)                              |

The current source already uses the corrected issue years for several papers. An online-first
date returned in a registry's general `published` field does not invalidate that issue-year choice;
compare the specific online and print dates before changing it. The
[DataCite record](https://api.datacite.org/dois/10.5281%2Fzenodo.20675513) establishes the cited
preprint record, not peer review, affiliation verification or a license change authorization.

### M29 — Voting paper privacy guarantees exceed the retained evidence

All five baseline documents in `papers/simurgh-voting-pilot/` were read, including the complete
five-page PDF and generated bibliography. The claim-audit's four-page build describes an older
artifact. Rendering page 3 confirms that the lifecycle figure's consent-event label overlaps the
adjacent text column; future publication needs a corrected layout and fresh visual review.

The source at `v0.5.0-voting-pilot-phase-c-closeout` and the current router agree on the relevant
behavior: submit checks a finite set of **top-level** forbidden keys, then records completion
metadata. It does not recursively reject all possible encodings or reject every unknown field.
The store does not retain arbitrary submitted values, but the server has already received and
parsed the request before those checks. Therefore:

- Replace “ballot data cannot reach the server” with the narrower statement that the intended
  client omits ballot choice and the store records the defined lifecycle metadata. A malicious
  client's request is outside what client-side JSON construction can constrain.
- The hardcoded false privacy flag is an assertion about the intended data flow, not a detector
  or independent proof of what every request, host or intermediary collected. The 52-file scan
  excludes the cleared live sessions and cannot reconstruct their per-session history.
- Zeroing radio values is a limited defense against accidentally serializing those values.
  It cannot secure every future client change or exclude information encoded in field names,
  selected state or other request fields. No formal adversarial-participant study was performed.
- “Anonymous” should be read as pseudonymous under the disclosed small-cohort assumptions.
  Excluding ballot-choice inference from scope does not establish that timestamps cannot be
  correlated with other records. The broader prototype's helper exceptions also prevent the
  voting notice's “never collects” wording from being reused repository-wide; see M06/M08/M19.
- Sharing an HMAC verification key also grants the ability to create valid MACs. The conclusion's
  proposed disclosed symmetric key is not equivalent to public-key, third-party verification.
  Keep issuer authentication, independent observation and participant verification distinct.
- Society approval remains a reported project record, not a verified institutional exemption;
  see M24. A claim of structural separation from the official voting system is narrower than an
  independently observed absence of every possible effect on participants or outcomes.
- Closure is conditional on the environment flag. The retained closure smoke's unauthenticated
  report result does not establish successful authenticated export after closure; see M23.

The [NIST IR 7770 record](https://csrc.nist.gov/pubs/ir/7770/final), checked 19 October 2026,
confirms the cited title, February 2011 date and four authors. The NSW Electoral Commission's
[November 2023 review announcement](https://elections.nsw.gov.au/about-us/media-centre/news-and-media-releases/review-into-technology-assisted-voting-final-report)
confirms a real review, not endorsement of this particular student-society pilot. The paper's
claim that this makes small pilots the appropriate evaluation method is the author's inference.
No voting-system certification or current legal-compliance conclusion follows from these citations.

### M30 — Foundation paper, ARA and reproduction contract

All 28 documents under `papers/project-simurgh/` were read completely, including the
724-line LaTeX source, its bibliography and generated bibliography, all extracted text of the
12-page PDF, the ARA, diagrams, tables and reproduction guides. PDF page 5 was also inspected
visually; this is not a visual review of all 12 pages. Preserve these publication artifacts and
apply the following corrections when citing or reproducing them:

- **Scoring:** the eight weights in the ARA sum to **1.05**, not the stated 1.00.
  `src/academic/riskScoring.js` uses those weights, rounds and clamps the result; it does not
  renormalize them. The formula `0.5 + score / 200` is an uncalibrated heuristic, not an empirical
  probability. Paste volume or typing speed alone does not establish AI use. No runtime weights
  are changed by this erratum.
- **Two protocols:** browser-paired Ed25519 uses `/api/integrity/pairing/challenge`,
  `/api/integrity/pairing/complete` and `/api/integrity/proofs`. The device SDK uses
  `/api/device/challenge`, local `/pair`, `/api/device/pair`, local `/proof` and then a
  `daemon_proof` attached to `/api/telemetry`. The paper's `/api/pairing/*` routes and combined
  sequence diagram are not executable endpoint documentation. Device challenges and browser
  nonces are different fields. The browser nonce paragraph incorrectly says ECDSA; that
  envelope uses Ed25519. Separate canonicalization functions and golden fixtures do not establish
  byte identity across the two envelope types.
- **Pseudocode:** the ARA Python sketch is not a working verifier. Default `json.dumps` spacing
  differs from JavaScript's serialization; even its compact stub needs explicit Unicode,
  number and rounding rules for byte parity, and signature verification is unimplemented.
  A daemon envelope cannot be verified by looking for the browser envelope's `nonce`.
- **Audit and privacy:** `src/audit/hmacChain.js` stops appending at the configured cap (default
  5,000), so “every event” and “full history” require qualification. Verification needs the shared
  HMAC key; a key holder can create replacement history, and an empty supplied chain does not
  establish event coverage. Raw identity reaches ingress and is HMAC-pseudonymized (M01).
  Transient native handles and the legacy helper (M10) contradict “never accessed at any layer.”
  `tools/privacy-audit.mjs` scans JSON keys in configured data/fixture locations. It does not
  perform the seven source/API/key-storage checks claimed by the paper and reproduction guide;
  absent or unparsable files are skipped, so an empty scan can report PASS.
- **Results:** 383 = 331 + 33 + 11 + 8 in the main paper, while the ARA's 379 uses 327 Node
  tests. Historical annotation counts are not proof that each native suite executed successfully
  (M18). The artifact guide's separate 61-pass/2-fail run is partial, not an all-pass receipt.
  Twenty synthetic clean sessions, one affinity false positive and selected threshold variants
  do not establish population false-positive rates or independence from tuning. Preserve the
  measured numbers and their denominators; do not replace them with current suite counts.
- **Reproduction:** after changing into the Windows daemon directory, use a project path relative
  to that directory, not another repository-root prefix. Starting the daemon is different from
  running the affinity fixture. Linux's supported invocation is corrected in its current README
  (M06). The historical Node 22 timing measurements are not fresh performance measurements.
- **Guarantees:** uniform error strings do not prove constant-time handling. Browser proof replay
  resistance combines timestamp checks, session binding and the nonce guard; five-minute nonce
  retention is periodically swept, not an exact erasure deadline. Signed environment values
  establish key attribution, not trustworthy OS state. WebAuthn authenticators do not by
  themselves attest whole-device capture visibility. Hardware-held keys alone would not solve
  dishonest scanner inputs. The academic verdict policy is scoped to that application, not every
  later enforcement integration.
- **Presentation and sources:** the PDF is 12 pages. Its methodology cross-reference VIII-F is
  stale; the rendered methodology subsection is VIII-K. The synthetic-session cross-reference
  VIII-D points to Windows validation, not false-positive calibration (VIII-G). The RFC 2104
  bibliography misspells Mihir Bellare as Belláre. Industry prevalence estimates and asserted
  superiority over alternative architectures are not independently established by these artifacts.
  Historical Stage 3/future-pilot language predates later work and must be dated when quoted.

### M31 — Current OS documentation limits the capture claim

Primary documentation was checked on 19 October 2026. Apple describes
[`NSWindow.SharingType.none`](https://developer.apple.com/documentation/appkit/nswindow/sharingtype-swift.enum/none)
as “A legacy constant that macOS no longer uses.” Its discussion explicitly says not to use
this value to hide or omit content from capture. This is incompatible with treating that flag
as a universal current macOS capture-exclusion guarantee. Historical observations may describe
specific OS/capture combinations; they do not override current API limitations.

Microsoft's [`GetWindowDisplayAffinity`](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getwindowdisplayaffinity)
documentation permits cross-process calls but requires a layered window and Desktop Window
Manager composition for successful retrieval. Its remarks expressly decline a DRM guarantee.
`SetWindowDisplayAffinity` additionally requires a top-level window owned by the calling process.
“Any enumerable window,” “all capture pipelines” and unconditional current-platform exclusion
claims in the foundation paper, ARA and older device-track prose must be narrowed accordingly.
`SECURITY.md` now states these limits. This correction is not a fresh interactive desktop test
and does not rewrite historical results or change scanner behavior.

### M32 — Stage 1–2 reviewer packs and device guides

The remaining 18 documents in `docs/stages/` were read completely, including every checklist,
validation row and the 966-line Stage 1 reference. These stage records remain historical; their
unchecked boxes are review tasks, not evidence that a reviewer executed each item.

- `STAGE_1_5_REVIEWER_PACK.md` contradicts its own May 2026 header by saying Stage 2 is not
  implemented. Its MIT-license claim is historical and must not describe the current AGPL-3.0-or-later
  repository. Its global no-capture/privacy statements inherit the legacy-helper exception (M10).
  `STAGE_1_ACADEMIC_SHIELD.md` describes the retired `/api/affinity` surface; the current route
  returns 410. Historical 65/234/239/273/327/331 test totals remain scoped to their recorded stages.
- `STAGE_2_ARCHITECTURE.md` contains a proposed proof sketch, local-log root, revocation and
  node-status endpoint; those proposals are not a current API contract. Stage 2.5 shipped a
  CoreGraphics scanner, not the proposed ScreenCaptureKit scanner. The macOS brief's illustrative
  Ed25519 JSON has wrong version, timestamp/key/capability shapes and is not a valid proof fixture.
  Use the checked-in schema and golden fixtures with the two separate protocols in M30.
- `STAGE_2_3_MACOS_LOCALHOST_DAEMON.md` changes into the Swift package before invoking the
  repository-root `./scripts/check.sh`. Run the Swift work in a subshell, then run the root gate:
  `(cd tools/simurgh-daemon-macos && swift test && swift build)`. The macOS technical brief's
  `node tools/verify-audit.mjs <chain.json>` is shell-invalid and omits the original HMAC secret;
  use the corrected current `SECURITY.md` example. Warning wording is “recommended”; Critical
  wording is “required,” rather than the brief's one exact string for both.
- `STAGE_2_WINDOWS_TECHNICAL_BRIEF.md` says the scanner never reads HWNDs, despite needing
  those transient handles for Win32 calls. The privacy boundary concerns emitted summaries.
  Its example has excluded = 1 and restricted = 0, while `DisplayAffinityScanner.cs` calculates
  **restricted = excluded + monitor-only**; that example should use restricted = 1. The actual
  scanner summary does not emit the claimed position/size fingerprint hashes. The generic server
  validator's acceptance of a hash field is not evidence that this scanner generates it. Its
  privacy/capture absolutes also require M31's OS-specific limits.
- The Linux brief and checklist omit implemented `POST /pair`. The success body from `/proof`
  is `{ ok: true, daemon_proof: ... }`, not `{ proof_payload, signature }`; the telemetry route
  does not return the claimed `proof_id`. `privacy_mode` is the string `metadata_only`, not a
  boolean. The brief's “exhaustive” field list omits proof identity, session, challenge and signature
  fields. `validateDaemonProof` is defined in `src/device/daemonProof.js`, not `server.js`;
  `src/academic/riskEngine.js` does not exist. Current scoring/report references are
  `riskScoring.js`, `scannerRiskPolicy.js` and `reportBuilder.js`.
- Linux X11 enumeration uses `_NET_CLIENT_LIST` and root children from `query_tree`, not a
  recursive walk of all descendants. It necessarily uses XIDs locally. `is_local_display` allows
  loopback host forms as well as Unix-display forms; “Unix socket only” is inaccurate. Detector
  state `healthy` is not the matrix's `x11_active`; Wayland coverage is `wayland_limited`, not the
  brief's `wayland_portal_only`. Wayland states depend on the property-probe result, rather than
  a universal `portal_probe` state. `portal_active` means the property was readable, not that
  screen recording was active.
- `display_server_mismatch` is enforced by the Node server, not the daemon as the Linux closeout
  says. The route appends a rejection event but does not call `recordRejected` in that branch;
  do not claim that this event directly increments the scorer's rejected-proof counter. Lock
  eviction follows the active-session sweep, not immediate session-end deletion. Environment
  strings identify a claimed display context; a signature does not prove the compositor's truth.
- The Linux brief's “XWayland under a Wayland compositor (Xvfb-backed in CI)” must not be read
  as real-compositor validation. The validation matrix correctly leaves real desktops and live
  systemd lifecycle untested. Shellcheck and script-existence tests do not execute installation.
  `check-user-unit.sh` and `doctor-user-unit.sh` are read-only diagnostics and do not implement
  a distinct `--dry-run` parser, despite the matrix's dry-run column. The unit fixes its writable
  state path at `%h/.local/state/simurgh`; custom XDG state locations require separate validation.
- The Windows closeout records **47/48**, including a Windows formatting failure. Preserve that
  failure alongside the separate Linux CI result; do not call the local run all-pass. Stage 2.7's
  Linux-unsupported checks describe its frozen baseline, not current Linux support. A tag can be
  reachable from `main` without pointing to the current tip. The checklist's forbidden substring
  “automatic misconduct” must exclude the explicitly required negated sentence. New log entries
  must attribute assistance accurately, not imply the owner personally executed assistant work.

These corrections retain the dates, release tags and original measurements. M01–M05, M10,
M18, M30 and M31 also apply to repeated identity, audit, native-test and privacy claims here.

### M33 — Capture runbooks and conformance-kit handoff

Read all 14 remaining lane/conformance Markdown guides under `tools/simurgh-attestation/`.
These are historical recipes, not authorization to launch captures or contact external actors.
The Stage 5A/5C/5F “not executed” statements describe their stated build; subsequent closeouts
must be checked before interpreting them as today's backlog.

- Stage 4Z and 5B recipes use shell-invalid `export REV=<pinned-revision-sha>` and non-installable
  package placeholders. They are templates, not copy-and-run instructions. Resolve the exact
  revision, dependency lock, configuration and working directory first. Stage 4Z's capture contains
  an elided lens step, acknowledged by the Stage 5B successor; the two harnesses are not equivalent.
- Stage 5C's opening “we beat a deployed detector” conflicts with its explicit unexecuted status.
  Use “adapter for a prospective pinned-detector capture.” Recorded threshold misses do not
  establish downstream harm or defeat of the underlying provider model. Stage 5D's claim that a
  local subagent “cannot be refused” is unsupported; local orchestration guarantees neither model
  availability nor a response. A signed ceremony also cannot establish omitted-round completeness.
- Stage 5E's default kit verifies committed scores; it does not rerun Prompt Guard. Lean execution
  is conditional on an installed toolchain and must retain a skip if absent. The droplet guide's
  pipeline `bash run.sh 2>&1 | tee ...` requires **`set -o pipefail` in the invoking shell**;
  otherwise `$?` is normally `tee`'s status, even when the child runner fails closed. Required
  success markers supplement, rather than replace, that exit status. Avoid including hostnames
  in shared log names; redact host paths before external handoff.
- Stage 5F's droplet setup contains a placeholder NodeSource URL ending in `/...`, `git clone
<repo>` and `git checkout <tag-or-branch>`. Use the actual repository URL and a trusted full
  revision in an isolated checkout, with Node 26 provisioned separately. A byte-stability diff
  requires diagnosis; it is not “almost certainly” a Node-version issue. The runner explicitly
  skips Python parity if Python is missing yet can print ALL PASS. A handoff claiming Python
  corroboration must require Python and confirm that the parity step actually ran.
- Stage 5G's kit proves distinct-key/challenge binding under its trust inputs, not organizational
  independence. Verify the external actor's public-key provenance through the agreed channel;
  an embedded key and self-reported identity cannot establish that relationship. Keep private
  actor keys out of the returned package. No outside actor was contacted during this review.

The exact archived recipes are preserved; current reproduction should follow
[the historical replay guide](../HISTORICAL_REPLAY.md) with the corrections above. New inference
and external ceremonies remain separately scoped work.

### M34 — Archived browser pages are not interchangeable verifiers

All 17 HTML candidates under `tools/simurgh-attestation/` were read completely, including their
embedded JavaScript and the 1,616-line Stage 5O vector page. This is source review, not a claim
that every page was exercised in a real browser. Important handoff corrections:

- Stage 5F, 5G and 5H use `script-src 'self'` but put the module entry point inline, without an
  allowed hash or nonce. Their own policy blocks that entry point in a conforming browser.
  Stage 5F additionally exposes a function without implementing its promised drop interaction.
  Stage 4Z says to drop a bundle and public key but has no file input/drop handler. Loading these
  pages is not evidence that verification ran.
- Stage 5C's comment promises a stamped hash CSP, but this checked-in HTML has no CSP meta tag.
  Stage 5D likewise has no document CSP. An unknown server response header cannot be assumed.
  Stage 5B's inline script hash was recomputed and matches its declared CSP hash; that one check
  is not a claim that every page's policy is valid.
- Stage 4T interpolates supplied section values and errors into `innerHTML`; its policy permits
  inline scripts. Stage 5D similarly inserts an error message containing an untrusted recipe
  operation into HTML. Stage 4X inserts family names and identifiers as HTML too, although its
  hashed policy restricts script execution. Treat these as unresolved unsafe-rendering surfaces;
  do not load untrusted bundles into them. Frozen runtime repairs require their own stage authority.
- Stage 4V and 4W are convenience checks without author-signature verification, as their comments
  or banners state. Stage 4X never reads the ledger textarea: it recomputes the supplied corpus
  only. Stage 4Y's upload flow always passes an empty redaction manifest and a salt hint/default
  to audit recomputation; it does not expose the full audit input contract. Its hash-only style
  policy also does not authorize the generated inline width attributes. These distinctions matter
  when interpreting a displayed result or visualization.
- Stage 5A verifies the attestation signature with a supplied key and selected arithmetic, but the
  `digs` array in the purported Merkle-recompute section is unused. It does not bind every supplied
  component back to those signed digest fields. A fresh local execution of the extracted core in
  Node WebCrypto returned `raw: 0` for four existing negative fixtures: adapter loss, borrowed story,
  manifest inclusion and post-hoc claim table. It rejected the signature, silent-claim, silent-flag,
  tally and two-story negatives. The [diagnostic receipt](browser-vnc-node-vm.json) preserves all
  thirteen outcomes and explicitly identifies the VM scope. This is not a browser/CSP test or a
  rerun of the authoritative Node verifier.
- Stage 5B/5C/5D accept public keys from the submitted material; a valid signature under such a
  key is not an external trust pin. Their arithmetic checks also do not establish model truth,
  full audit coverage or independent capture. Stage 5D's “raw 0 (public surface)” is a local
  signature/digest summary, not the authoritative verifier's complete return code.
- Stage 5O executes fixed hashing, sampling, inclusion and rational-arithmetic vectors. Its
  embedded `negatives` object is not consumed by `run()`, and that page's title still says §7
  while its actual driver includes §8/§9. Passing the page does not establish every frozen
  negative or the full protocol. Stage 5Q requires its driver to replace the module/vector markers
  and otherwise fails explicitly; the page on disk is not a ready-to-open report. Stage 5P uses
  an external same-origin module rather than an inline entry point, so it does not have the
  specific 5F–5H CSP conflict. Neither CSP nor local execution establishes all-channel isolation.

The [MDN script-src documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src),
checked 19 October 2026, confirms that inline scripts require an explicit matching authorization;
`'self'` alone does not supply it. Current reviewer guidance now directs authentication/replay
work to the stage's authoritative CLI and distinguishes the maintained evidence explorer from
these historical pages. Existing scientific/browser-parity receipts retain their original scope.

### M35 — Legacy public-page claims and current routes

All seven HTML pages directly under `public/` were read completely, including embedded scripts.
These are the historical academic/banking/voting interfaces, not the maintained evidence explorer.
The following corrections apply to their displayed documentation:

- All seven pages request Google Fonts stylesheets and reference Google's font asset host. A
  metadata-only application payload does not mean the browser makes no third-party request.
  `PRIVACY.md` now discloses this separate traffic boundary, including requests before notice
  dismissal. A banking AI receipt's egress flag cannot measure the whole browser's network use.
- `banking-pilot-scenario.html` says withdrawal “removes” the synthetic session. The store sets
  `withdrawn` and `withdrawn_at`; it retains scenario metadata and the audit chain. The report
  route returns 403 after withdrawal, while token-authorized audit/verify routes remain present.
  The corrected privacy guide distinguishes blocked reports from deletion. The example consent
  hash is the SHA-256 of an empty string, not evidence that actual consent was independently bound.
- The banking consent/report pages describe the synthetic Phase A flow. Their fixed scenarios,
  category flags, session identifiers and receipts are not real-bank data collection or an
  independent network sensor. Receipt presence is route-dependent, as described in M27; early
  errors must not be presented as complete privacy receipts. An exported “safe evidence” report
  has the store's declared provenance and trust limits, not independent authenticity.
- Both voting pages display closed-pilot notices. The submission header still says “Session
  active,” and the landing page retains prospective collection/withdrawal language. The checked-in
  submission script hides the ballot instead of collecting a new vote. Static closure text is
  separate from the server's configuration-controlled write gate. Participant HMACs are
  pseudonymous, not anonymous; clearing an input is not proof of erasure from all browser or
  exported copies. Do not reuse these pages as current participant consent forms.
- `public/index.html` still says pasted content is logged, but its paste handler adds only the
  length to the telemetry bucket. It reads the clipboard text locally to calculate that length.
  Its “never sees your screen” language requires the legacy-helper exception in `PRIVACY.md`.
  “Flagging cheating,” guaranteed one-window detection, universal capture invisibility on macOS
  14–26 and a ~700 ms p50 are not established current results. Apply the Apple/Microsoft limits
  in M31 and the manual-review requirement instead of treating heuristic flags as misconduct.
- The page advertises the retired `/api/affinity` helper/simulator paths, which now return 410.
  Its zero-valued offline fidelity gauge is not a measured clean screen. A local “Submitted”
  label does not establish server-side exam submission: that handler makes the textarea read-only
  and sends telemetry, without calling the session submission route. Its audit-download success
  toast follows an anchor click without checking an authenticated response or download success.
- The page calls a hardcoded historical prompt “the actual system prompt sent to Claude.” The
  server has a separate prompt and returns a locally computed score with optional narrative.
  More seriously, `paintVerdict` calls `source.startsWith`, while current server verdicts supply
  an object `{score, reasoning}`. This is an unresolved interface mismatch, not a passing visual
  smoke result. The browser's local cadence visualization also does not establish that its
  calculated baseline or key intervals were sent: `summarize` omits both.
- `public/instructor.html` promises immediate SSE updates, but with an instructor token it
  explicitly uses five-second polling. Its filter is applied only when clicked; the next full
  render recreates all cards. The timeline stays at its placeholder in this page's script.
  The unused `lvl` allowlist does not sanitize `renderSessionCard`'s interpolated level/category
  fields. HTML escaping a session identifier inside an inline JavaScript handler is not a
  general JavaScript-context escaping guarantee. These are source-review findings, not a new
  exploit demonstration or an assertion that server-generated identifiers are attacker-controlled.

Current privacy guidance also corrects the Windows scanner's restricted count to include both
monitor-only and capture-excluded windows, and identifies fingerprint hashes as an optional schema
field that the current scanner does not emit. Runtime changes are outside this documentation
maintenance authority; the historical UI must not be used as the current reviewer demonstration.

### M36 — Personal résumé is not verified project evidence

The complete extracted text of `docs/Raouf_Portfolio_Resume.docx` was read. Its education,
employment, work-rights and external-project claims are personal assertions, not measurements
established by this repository. The review did not obtain private employment or immigration records
and does not certify those assertions. Preserve the original document; do not invent replacement
dates, qualifications or benchmark results.

For a current handoff, use the maintained project README and study receipts rather than treating
this résumé as an up-to-date Simurgh report. It does not describe the current project. Statements
such as 500K packets/second, 1M operations/second, 1,000 users, zero regressions and percentage
improvements need their own dated benchmark/operational provenance before being reused. The 2024
“Claude Code Human Preference” label needs author verification: Anthropic's
[public introduction of Claude Code](https://www.anthropic.com/news/claude-3-7-sonnet) is dated
24 February 2025. That public date alone cannot establish the timing or name of a private evaluation
engagement, so this audit records the discrepancy without assuming a false employment claim.
Text extraction does not establish a Word layout review.

### M37 — Continuation studies need dated status and reproduction context

The remaining prose guides, plans, result pages and operator forms for local Phases 1–16,
the earlier 19 October continuation validation, and both October needs/gap maps were read
completely. Their recorded counts distinguish model responses, execution branches, scripted
fixtures and retained snapshots; the corresponding small phase receipts were cross-checked.
Those receipts were inspected, not regenerated. Corrections for current use:

- The 15 October G01–G27 map describes its named baseline. Phase 1 adds exact-action and
  transactional successors, protects mounted session creation and retires legacy live/affinity
  routes. It does not repair every frozen implementation. Phase 2 adds the owned connector;
  Phases 3–4 add the 540-branch study and 763 retained snapshots; Phase 5 adds deterministic
  recovery and project-operated fresh-host replay. The Phase 1 presentation's “latest” 4/8 HF
  interface result and proposed next connector are historical, not today's project summary.
- Phase 2's “hosted CI pending push” is superseded by the Phase 3 declaration's receipt for
  `bb9d67dd`, run `38729498488`. Likewise, intermediate pending statuses inside later execution
  ledgers must be read with their subsequent receipts. A later successful run cannot replace
  the original revision's result. Do not turn an internal fresh reviewer into an outside evaluator.
- Phase 3's corpus note ends with re-review pending because it records the author handoff;
  the later design ledger records final review and freeze. The original corpus remains exposed
  and cannot become a newly held-out tuning set. Its adaptive branch result is different from
  Phase 10's shared fixed proposals and the newer transfer study.
- The Phase 8 review was interrupted when those Phase 8–16 records were written. The
  [19 October follow-up](../research/PHASE_8_REVIEW_2026-10-19.md) completes the declared local
  source review and records 24 tests plus 46-row/92-snapshot replay. It is an assistant review,
  not external certification or independent custody. Current presentations should link that
  successor instead of saying the local review is still incomplete.
- Phase 12's “current” gap map precedes the Phase 13 reliability fixtures, Phase 14 projection,
  and [Phase 17 transfer](../research/transfer-phase-17/RESULTS.md). Those are scoped additions,
  not closure of real provider lifecycle, external custody, realistic tasks or deployment load.
  The latest transfer and role-correction results belong in a current presentation; Phase 10's
  144 branches remain the explorer's dataset and must retain their own denominator.
- Phase 15's retired-route assertions and prior-script inventory failures were repaired under
  the [Phase 16 declaration](../research/LOCAL_MAINTENANCE_PHASE_16.md). Preserve the original
  failed runs. Phase 16's real-browser observations likewise do not establish browser operation
  in today's environment: the newer strict browser check records a blocked navigation and exit 1.
  Use the [latest implementation smoke](../research/smoke-validation-2026-10-19/RESULTS.md)
  for its exact revision and limits, rather than the older continuation's base gate result.
- Fixed `/tmp/simurgh-*-venv` paths in several older phase guides are examples, not guaranteed
  fresh environments. Choose unused paths or `mktemp -d`, and activate the selected Python 3.12
  environment before invoking npm aliases that call `python3`. Hash-locked installation checks
  the requested packages; `pip check` does not prove that an existing environment contains no
  unrelated distributions. The Phase 11 guide already uses a new temporary clone/environment.
  Its final `git status --porcelain` prints status; an exit of zero alone does not assert a clean
  checkout. Inspect that output or enforce emptiness separately. The two empty retained status
  files are consistent with the accompanying receipt, not self-authenticating execution evidence.
- The Phase 15 runbook says pytest uses a separate environment but its example installs pytest
  into the SDK environment. For exact reproduction, keep the locked SDK/workflow environment
  separate and use a fresh pytest environment for the adapter's documented test command. Its
  Docker override filename is relative to the recipe directory; from the repository root use
  `-f docs/research/validation-phase-15/Dockerfile.gateway.validation` and supply the verified
  named cache context. Do not reuse the abbreviated command as a complete root-level build.

The freshly checked official [monitoring guide](https://developers.openai.com/api/docs/guides/safety-checks/misalignment-monitoring)
continues to distinguish alert receipt, registered blocking and completed effects. The
[Agents API multi-agent guide](https://developers.openai.com/api/docs/guides/agents-api/multi-agent)
describes shared environment files and inherited tools/credentials. The
[vault guide](https://developers.openai.com/api/docs/guides/agents-api/tools/vaults) distinguishes
stored-secret updates/deletion from provider revocation and running sessions. The
[sandbox security guide](https://developers.openai.com/api/docs/guides/agents-api/environments/security)
keeps application credentials outside the agent environment. These source checks support the
existing integration boundaries; they are not live entitlement tests, normative certification,
or a fresh review of every linked vendor page. The dated maps remain project recommendations,
not OpenAI procurement requirements or an exhaustive 2026 industry survey.

### M38 — Banking alignment approval and hash validation have limited scope

The complete `BANKING_PILOT_SIMURGH_ALIGNMENT_AUDIT.md` was read. Its 12 June B3 internal-demo
approval and 389-test receipt are historical. Later B4 changes and the public-page findings in
M35 must accompany it in a current handoff. “Privacy claims: Pass” based on fields hardcoded to
false does not independently prove absence of collection, and the narrative sanitization tests
cover their declared fields rather than all possible sensitive semantics.

The statement “weak consent_scope_hash is rejected” overstates the implementation. The policy
checks `^sha256:[a-f0-9]{64}$`; it does not verify the hash against an actual consent document,
its entropy or its provenance. Describe this as a format check. Rejection responses and audit
entries retain field names. They avoid echoing the submitted field values on the cited paths,
but an arbitrary unknown key can itself contain sensitive text. Avoid a universal no-sensitive-
value logging claim based solely on that distinction. Frozen audit and runtime bytes remain
unchanged; current privacy guidance documents the additional browser and withdrawal boundaries.

### M39 — Historical fixture descriptions are narrower than behavioral assurance

Both remaining fixture READMEs were read with their implementation:

- Stage 4O Lane B hashes a public MCP tool manifest and assigns authority from tool names.
  Its classifier defaults unmatched names to `read_only`, uses empty declared sinks and sets
  risk to `low`; “conservative” is not a soundness guarantee about actual tool behavior.
  The capture example launches an unversioned npm package and inherits the child's stderr.
  The script's digest-only stdout does not establish that descriptions never reached any disk
  or surrounding process log. Retain the existing capture; any new capture needs its own
  package/protocol identity, provenance and output review. None was executed in this audit.
- Stage 5R's documented altered-family command was executed read-only and returned exit 1,
  naming `F1/vulnerable` as different from the commitment. That verifies the supplied negative.
  The `--against` helper compares only committed families present in the supplied directory;
  absent families are skipped. It is a partial comparison, not a complete-corpus inventory
  check. Use the normal commitment rebuild for the declared full-tree check and retain its
  separate trust assumptions. This audit does not claim that arbitrary empty comparison
  directories are rejected or that a corpus hash proves independent authorship.

## Primary sources rechecked during this continuation

Checked 19 October 2026; retrieval date is distinct from publication date:

- [OpenAI Evals deprecations](https://developers.openai.com/api/docs/deprecations) and
  [Evals guide](https://developers.openai.com/api/docs/guides/evals): June 3 announcement,
  October 31 read-only transition and November 30 shutdown remain documented.
- [OpenAI cybersecurity grant form](https://openai.com/form/cybersecurity-grant-program/):
  the proposal field is plain text with a 3,000-word limit and the problem field has a
  200-word limit. `APPLICATION_CHECKLIST.md` now records this fresh check. Nothing was submitted.
- [Notarized Agents / Sello](https://arxiv.org/html/2606.04193v1): related work explicitly
  discusses combining receiver receipts with agent traces. This limits novelty claims; it
  does not validate Simurgh's implementation.
- [EVC draft 02](https://www.ietf.org/archive/id/draft-kondoju-evc-02.html): its tail-truncation
  discussion distinguishes draft guidance from shipped behavior and new normative obligations.
- [Agent Audit Record draft 02](https://www.ietf.org/archive/id/draft-gilda-wimse-agent-audit-record-02.html):
  an Informational Internet-Draft proposing decision/effect/agreement records, not an adopted RFC
  or a compliance certification.
