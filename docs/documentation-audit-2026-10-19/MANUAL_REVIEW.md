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
SHA-256 values. At this checkpoint, **281 documents have complete manual reads; 638 remain
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
