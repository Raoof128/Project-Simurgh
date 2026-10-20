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
SHA-256 values. At this checkpoint, **898 documents have complete manual reads; 21 remain
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

### M40 — Historical briefs require bounded claims and complete verification inputs

Full reads of `ANTHROPIC_BRIEF.md`, `ONE_PAGE_BRIEF.md`, both `NORTH_STAR_*` documents,
`JLENS_COMPOSITION.md` and `NARRATIVE_WORKSPACE_CONFLICT.md` found claims that outrun their
own later qualifications. Preserve their historical bytes and apply these corrections:

- Completeness is over declared participants, supplied evidence and instrumented boundaries.
  It does not establish that every real action was logged. Stage 5S compares the supplied views;
  it does not prove that no conflicting view exists elsewhere. A dishonest signer can produce
  internally consistent evidence about an unobserved execution. Do not repeat the one-page
  brief's unqualified claim that an operator cannot fake a receipt.
- Separate keys and processes do not prove separate people, credential custody or deliberation.
  Stage 4Q establishes recorded-chain ordering under its trust assumptions, not physical time
  or impossibility of same-operator approval. GitHub OIDC establishes a workflow provenance
  root; it does not prove the originating GPU run or an independent human experiment.
- Offline verification requires the relevant bundle, signature, key, referenced evidence and
  executable verifier/dependencies. “Only a public key” means no private signing secret, not
  that the key alone is sufficient. Independently pin the expected identity. Browser parity
  and verifier completeness are stage-specific; M34 records counterexamples to a blanket claim.
- The Anthropic brief says its worked example reproduces from a tag but omits checkout in the
  clone command. For that historical example, explicitly select
  `v2.26.0-stage-4q-vfr` before dependency installation and use its documented toolchain.
  A default-branch clone does not select the stated release. The one-page brief is now a long
  historical briefing, and its test/tag/release/file totals are dated snapshots.
- “First”, “nobody owns the proof”, “every product trusts the writer”, and claims that all
  competing mechanisms lack completeness are unverified positioning, not demonstrated results.
  A finite source map and internal score do not prove absence of prior art. The previously
  checked Sello discussion includes composition with agent traces (§8.3), so its characterization
  needs that qualification. The June VCA direction links NIST AI 600-1, the Generative AI Profile;
  the base AI RMF is AI 100-1. These are distinct publications, neither a certification.
- The [primary J-space paper](https://transformer-circuits.pub/2026/workspace/index.html)
  explicitly limits monitoring sufficiency. It does not establish that Simurgh's failures are
  statistically uncorrelated with J-lens failures, or that external containment guarantees every
  residual outcome. Signed readout consistency is not faithful access to internal cognition.
  The claimed Zurvan source/digest locations are external federation references absent here.

### M41 — Regulatory projection is not binding guidance or compliance

The Anthropic brief and VDCC direction incorrectly describe Article 73 guidance as legally
binding. The [Commission's Article 73 text](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-73)
addresses reporting by providers of high-risk systems; the guidance helps implement that duty.
Its summary expressly distinguishes explanatory text from binding law. The
[current Article 113](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-113) gives the
application schedule and exceptions, including amended high-risk dates. Do not turn a general
August 2026 date into a claim that every AI duty applies to every system on that date.

The retained Stage 4T capsule maps pinned Article 55 GPAI and draft Article 73 templates.
Its six machine-derivable sections out of 22 do not discharge legal classification, notification,
causation, recipient selection or reporting deadlines. An offline capsule is neither a filed
report nor regulatory acceptance. Older third-party criticism is commentary, not the text of
Article 73. Sources were checked on 19 October 2026; no legal compliance assessment is claimed.

### M42 — Early-stage metrics and commands retain their original measurement scope

The complete Stage 3A–3X narratives were read. In particular:

- Stage 3C's 18/30 detection is **13 blocked plus five warned**, with the provider still called
  on warnings. The 7/9 held-out detection is six blocked plus one warned. The nine-fold ratio
  is the bounded change from 2/30 to 18/30, not evidence that general obfuscation is solved or
  corpus overfitting has been ruled out by nine held-out attacks.
- The Stage 3H-L2 narrative's defended utility 0/10, attacked utility 2/20 and over-defence
  10/10 are not the frozen metrics in this checkout. Direct inspection of
  `evidence/stage-3h-layer2/metrics.json` gives **10/10 benign utility, 20/20 utility under
  attack, 0/20 targeted ASR and 0/10 over-defence** for the defended deterministic pipeline.
  Stage 3I's recovery analysis likewise has zero benign failures. Stage 3N explicitly excludes
  the transient collapse as prose history. Preserve that history but use the committed fields
  for measured claims; do not manufacture a frozen before/after comparison.
- Ground-truth AgentDojo and self-authored mutation runs are distinct from live-model runs.
  Stage 3G's 180 default observations are not 180 live API calls. Stage 3V-A uses a synthetic
  recorded fixture; 3V-B replays a captured classifier run without rerunning the GPU model.
  Three matching greedy captures do not establish population robustness or independent custody.
- Stage 3T's distinct signal families are declared categories, not statistically independent
  corroboration. Stage 3U documents benign collisions even for two strong families and opaque
  256-bit hash slots. Function coverage does not establish exhaustive branch/input correctness.
  Stage 3V harness-computed hashes address adapter-supplied digest trust in that instrument,
  not every historical metadata field or unknown input provenance.
- Stage 3Q proves continuity against the supplied previous head; committed timestamps alone
  are not trusted wall-clock anchors. Its genesis contains no actual longitudinal regression
  history. Stage 3S's slot checker establishes equality to a digest, not the digest's truth;
  prompt-cache-ready is not an observed cache hit, and human-review intent is not a review receipt.
- Bracketed `[--reproduce]` in the Stage 3M command is optional-argument notation: omit it for
  portable verification or supply `--reproduce` without brackets. Bare `<model>` and
  `<server-side-key>` in Stage 3G are shell placeholders, not executable assignments. Do not
  paste them literally or put real secrets into tracked examples. The Stage 3H `cd` command
  must run in a subshell or return to the root before the following root-relative command.
  Producer `--update-*` commands do not authorize overwriting frozen evidence in this audit.
- The Stage 3E-live closeout reports 85 check steps passed and **two failed** on its macOS host;
  those are retained failures, not an entirely green suite. Docker/provider skips do not
  establish container execution or real provider validation. Old “next stage” names are
  proposals, sometimes superseded by different shipped stages.

Anthropic's [12 June suspension statement](https://www.anthropic.com/news/fable-mythos-access)
supports the historical reference-event framing in `RELATED_WORK.md` and Stage 3L. It is the
provider's account, not a Simurgh reproduction of the alleged technique or independent evidence
of its efficacy. It also does not establish current access restrictions. The fixture register's
[summer misalignment source](https://alignment.anthropic.com/2026/agentic-misalignment-summer-2026/)
describes controlled simulations; proposed fixture mappings do not establish implementation.

### M43 — Historical provider fallback contract does not match all response shapes

Source inspection and a [four-case local probe](fallback-contract-probe.json) qualify
`LLM_SHIELD_STAGE_3R_TRUST_PRESERVING_PROVIDER_FALLBACK.md` and related live-adapter documents:

- The official [refusal guide](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback)
  shows HTTP 200 with `stop_reason: "refusal"` and empty content. In the preserved adapter,
  `normaliseAnthropicResponse` classifies empty content as `gateway_provider_empty_response`
  before checking refusal. `classifyProviderOutcome` treats that error as availability failure.
  With a non-terminal local precheck and refusal fallback disabled, the probe still attempts
  a second model through the availability path. This contradicts a universal opt-in-refusal claim.
- A text-bearing refusal retains `provider_response_kind: "refusal"` and correctly stops when
  refusal fallback is disabled. Both shapes lose original `stop_reason`/`stop_details` in the
  adapter return value, so the router's `isRefusal(attemptRaw)` metadata helper returns false.
  The historical claim that categories/explanations are always recorded or hashed is too broad.
  The current provider guide also includes `general_harms`; the older four-category list is
  not a complete current API enum. The helper itself accepts arbitrary string categories.
- The adapter catches client construction/API exceptions and returns `gateway_provider_error`.
  The injected setup-error case also entered availability fallback. The router comment that
  genuine setup errors always propagate as configuration rejections does not cover this path.
  `fallback_credit_observed` is derived from the refusal trigger, not a billing/token receipt;
  `redeemed` remains false. Do not describe it as independently observed credit.
- A terminal local precheck still prevented fallback in the probe. Its risk values were injected
  for orchestration; the probe does not establish full HTTP route or consequence-gate behavior.
  It used the actual adapter, normalizer and orchestrator with a local fake SDK client, no keys,
  no network and no live model. Runtime and historical evidence were not modified.

The current successor already retires the mounted legacy live route with HTTP 410. Direct
module calls and old revisions retain these defects. `SECURITY.md` and the reviewer index now
state this limit. Fixing the preserved runtime requires a separately reviewed implementation
change; existing synthetic fallback self-proofs do not establish this adapter-response contract.

### M44 — Early closeout checklists contain additional method and reproduction errors

The full Stage 3D–3R closeout, reviewer, threat-model and validation documents were read,
along with the completed Stage 3I calibration plan. Their requirements are not interchangeable
with executed results. Apply these additional corrections:

- Stage 3I's root-cause section names the correct provenance enums, but Task 1 Step 3 proposes
  `agentdojo_benign_seed` / `agentdojo_untrusted_injection` as source types. Those are invalid
  guard enums. The implemented adapter uses `system_seed` / `synthetic` / `task_data` for
  authored benign hash metadata, and `tool_result` / `untrusted` / `reference` otherwise.
  Do not implement the obsolete task instruction or reinterpret raw attacker content as synthetic.
  The completed header and unchecked task boxes are historical planning state, not new work.
- `scripts/smoke-llm-shield-stage3h-layer2.sh` invokes the runner and writes the retained output
  directory directly. It does **not** test `SIMURGH_RUN_STAGE3H_LAYER2`; setting that variable
  in a historical command does not make it an enforced opt-in. The plan's direct-run note is
  accurate. Use a disposable reproduction checkout for this writer and preserve the original
  evidence. A fixed `/tmp` venv path does not ensure a clean environment.
- Stage 3H-L2's sample digest binds the manifest bytes, but does not by itself prove that the
  manifest existed before execution. Stored `scorer_modified: false` and version-pin flags
  likewise do not independently establish source/dependency identity. They need the retained
  provenance and actual source/runner checks. The high-over-defence sentence repeated in its
  closeout, checklist and threat model is the excluded history described in M42.
- Stage 3K's prose defines `operator_asr_delta` as a rate difference, but the implemented
  `stage3k_metrics.py` stores **integer attack-success counts per operator**, without division
  by that operator's denominator. Zero has the same value in both representations; positive
  values must not be reported as percentage-point changes. Preserve the frozen field name
  and explain its actual units. Its validation table uses XOR for what the implementation
  expresses as `not (positive_delta and gates_clean)`. Both can be false when an unrelated
  gate fails, so exclusive-or is not the contract.
- Stage 3M's “any edit fails” threat-table wording excludes canonical-equivalent JSON changes:
  formatting and key order do not change the canonical bundle signature. Referenced evidence
  file-byte hashes have a separate contract. Without an externally supplied expected key,
  fingerprint agreement with the supplied sidecar establishes internal consistency, not an
  independently trusted signer. An anchored PEM scan is not proof that no secret ever appeared
  in any format or in Git history.
- Stage 3N and 3O retain four non-passing check steps each, alongside 108 and 110 passes.
  Preserve those failures. A macOS host alone does not prove that Rust formatting/linting or
  secret-scan failures are unavoidable. Their original environment attribution is an author
  explanation, not a new diagnosis. Old `main...HEAD` commands depend on branch history;
  current drift checks must follow the applicable gate lifecycle and frozen baseline.
- Stage 3Q's UTC validator rejects malformed dates; it cannot reject every fabricated but valid
  wall-clock assertion. Its genesis has zero real diffs. Clean acceptance and expected
  regression/improvement classifications are successes in the 12-case self-proof, not 12
  attack rejections. A wording-audit exemption for fixtures does not establish that no semantic
  overclaim could exist in them.
- Stage 3R's threat table calls the swap event “Ed25519/HMAC-chained”. The actual
  `recordGatewayFallbackSwap` uses the shared HMAC chain; it does not add an Ed25519 signature
  to each swap. The one-hop orchestration budget does not prove absence of SDK-internal retries
  or enforcement of a second live-call ledger gate. M43 and the existing scoped security review
  qualify its mock-fixture and function-coverage claims.

### M45 — Stage 3S–4H evidence and release checks have narrower boundaries

The Stage 3S–3X and 4H closeouts, checklists, threat models and validation matrices were
read in full. Apply these corrections to the preserved records:

- Stage 3S's source-bound report establishes equality with its supplied evidence, not the
  truth of that evidence. Its default slots are recorded fixtures. Its verify-only smoke
  and gateway E2E have different scopes, and the broad fallback claims inherit M43.
- Stage 3T's benign-silence finding covers eleven chosen fixtures. Stage 3U explicitly
  retains benign collisions involving two strong families and opaque valid-shaped hash
  slots. Stage 3V-A's harness hashing closes an adapter-input gap; it does not close every
  signed limitation. External misses and overblocking are measured outcomes, not necessarily
  rejected bundles. Branch coverage in 3U is reported, not gated.
- Stage 3V-B's “raw output never exported” wording applies only to derived evidence. The
  committed replay source `evidence/stage-3v-b/capture-replay/lg4-frozen-capture.json`
  deliberately contains `raw_lg4_output`. A live flag, valid timestamp and digest shape do
  not independently establish GPU origin. CI replays the capture; it does not rerun the model.
- Stage 3W's `gh run list --limit 1` can select a successful run unrelated to the release
  under review. Check the exact workflow, ref, commit and attestation subject. The preserved
  workflow uses mutable action tags (`checkout@v4`, `setup-node@v4`,
  `attest-build-provenance@v3`); this audit did not pin actions or run hosted CI. OIDC
  provenance witnesses workflow identity, not the truth of the original GPU capture.
- Stage 3X's twelve rungs include ten roots, five deep walks, three reproductions and two
  index-only entries. These are overlapping scopes, not additive independent experiments.
  Fetching tags is online setup and does not guarantee a shallow clone has every ancestor.
- Stage 4H checks explicit declared flows in its interpreter/process boundary. It is not
  host-wide network isolation, kernel confinement or proof of actual execution. Q3 needs
  both the clean zero-hit observation and the caught test double. Its proof-deletion arm
  should reach raw 24/26, not merely invalidate a signature at 25.

### M46 — Stage 4J–4M positioning, reproduction and budget proofs need qualification

- Stage 4J's opening claim that the agent “never acted” exceeds its recorded authorization
  contract. `applied` means `recorded_allowed`; pack epochs are not trusted wall-clock
  freshness. Equal error codes alone do not establish absence of a timing oracle. The
  positioning brief's “nothing to jailbreak”, zero-cost and classifier-only comparisons
  are unsupported generalizations. Its future-J5/pre-build passages are superseded by its
  completed J5 results; those results remain local fixtures, not production measurements.
- Anthropic's [June 30 redeployment account](https://www.anthropic.com/news/redeploying-fable-5)
  reports June 9 launch, June 12 suspension, June 26 limited Mythos restoration and July 1
  Fable availability. Its over-99% figure concerns a specific reported technique, and its
  four-criterion jailbreak framework was a proposal. Attribute these statements to the
  provider; they do not establish Simurgh's incident-prevention ability or current access.
- Stage 4K's Q8 weights and budget are declared policy, not measured information leakage,
  capability transfer or prevention of distillation. Raw 39 is reserved in v0; proposed
  EBA+ v1/v2 controls are not shipped v0 behavior. Synthetic `events.json` includes raw
  consumer labels while the derived extraction ledger excludes them.
- The Stage 4K T2 environment assignment lasts only for the builder command. Use a separate
  variable, then pass it explicitly, in a disposable reproduction checkout with Node 26:

  ```bash
  stage4k_review_dir=$(mktemp -d)
  STAGE4K_FIXTURE_OUT="$stage4k_review_dir" node tools/simurgh-attestation/stage4k/build-stage4k-fixtures.mjs
  cmp "$stage4k_review_dir/bundles/under-budget/extraction-ledger.json" \
    tests/fixtures/llmShield/stage4k/bundles/under-budget/extraction-ledger.json
  ```

  Commands ending with `; echo $?` display the prior status but make the compound command
  succeed if `echo` succeeds. Capture and assert the verifier's status in automated checks.
  Replace literal `<tmp>` shell placeholders with an actual quoted path. A no-match `grep`
  returns 1; that is the expected privacy-scan result, not a verifier error.

- Stage 4L's anti-monotonicity statement requires nonnegative fixed exposures **and
  non-inflating budgets**, as Stage 4M explicitly specifies. Coarsening alone is insufficient.
  A histogram records the provider's partition; it does not prove that singleton accounts
  are independent actors. A later merge can reflect new knowledge rather than a knowingly
  false earlier statement. The proof does not eliminate evasion through withholding merges,
  omitted events or consistently false source data.
- Stage 4M's “empty evasion strategy set” and comparisons claiming that other systems cannot
  provide these properties exceed the conditional arithmetic theorem. A contest receipt is
  neither adjudication nor proof of legally sufficient due process. The whole-repository
  check scripts do not verify every prose claim. Internal novelty/usefulness scores throughout
  these closeouts are author judgments, not validated metrics or endorsements.

### M47 — Stage 4N conflates two legal reporting regimes

`STAGE_4N_C9_ARTICLE73_PROJECTION.md` incorrectly attributes GPAI systemic-risk reporting to
Article 73. The Commission's [4 November 2025 template announcement](https://digital-strategy.ec.europa.eu/en/library/ai-act-commission-publishes-reporting-template-serious-incidents-involving-general-purpose-ai)
expressly identifies **Article 55** and GPAI Code **Commitment 9**, and separately identifies
high-risk-system incident guidance. [Article 73](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-73)
concerns high-risk AI systems. Its general 15-day limit and specified 2-day/10-day exceptions
must not be presented as the draft's combined “2 / 5 / 10 / 15” GPAI/Article-73 tiers.

The [GPAI Code](https://digital-strategy.ec.europa.eu/en/policies/contents-code-gpai) is a
voluntary compliance tool, not the legislation itself. A single August 2026 date is not a
complete account of the Act's application schedule; use the current Article 113 and the
applicable regime, as explained in M41. The later Stage 4T capsule correctly keeps the two
pinned template snapshots separate. It still does not determine legal applicability,
classify an actual serious incident, establish awareness time, submit a report or prove
regulatory acceptance.

A synthetic reporting cadence and an `as_of_window` are declared verifier inputs. They
cannot establish that a real legal deadline was met. The heartbeat's silence detection is
relative to the supplied policy and boundary; fork detection needs a second artifact.
Stage 4N's SHA-256 commitment is **computationally binding under hash assumptions**, not
“unconditionally binding”. Its deterministic low-entropy salt permits guessing. Deterministic
fixtures and fresh random deployment salts need not be mutually exclusive design choices.

### M48 — Stage 4O–4V integrity does not supply observation or independent custody

- Stage 4O applies to calls routed through its manifest-aware entry point. A verified
  recorded decision does not witness every real tool execution. Delta binding does not
  prove human reading; its timeline binds at attestation time. Lane B's digests do not
  authenticate actual tool authority. Its numbered scorecard is an internal assessment.
- Stage 4P checks supplied custody records. It cannot identify an entirely hidden real
  hop or turn a missing attestation into proof of wrongdoing. Embedded public keys require
  an independently chosen trust policy. Canonical-equivalent JSON edits need not invalidate
  signatures. Its actual `digest.mjs` and `cpcCore.mjs` derive the entropy floor from an
  `evidence_kind` lookup, not a measurement of the secret input's entropy. A public window
  anchor changes digests across windows but does not prove cryptographic unlinkability.
  The reproduce script rebuilds committed fixtures before diffing them: run it in a
  disposable checkout, preserving the original evidence.
- Stage 4Q's “human at terminal” arm uses `STAGE4Q_HUMAN_CONFIRM=y`; it is not proof that
  a human attended a ceremony. Its display digest binds declared rendering bytes, not an
  independently witnessed display. The census covers the supplied chain. The BYO key
  example should use a fresh `mktemp -d` directory, `umask 077` and an explicit file mode
  of `0o600`, rather than a predictable `/tmp/my-approver.pem` with default permissions.
- Stage 4R's actual 4P/4N bindings and full 4Q receipt integration are expressly deferred
  in its closeout. A DLEQ proof establishes algebraic consistency for supplied values, not
  truthful custody-class membership. Colluding parties can choose the same invented class
  without breaking Fiat–Shamir assumptions. RFC 8032 vector checks do not constitute a
  cryptographic audit of the custom reference protocol. Historical reviewer identity and
  independence claims need provenance beyond a fresh key and a signed challenge.
- Stage 4S's assertion that content addressing makes cycles mathematically impossible because
  a hash has no fixed point is incorrect. Such construction is treated as computationally
  infeasible under hash assumptions; it is not excluded as a mathematical property of every
  finite hash function. Raw 104/118 are defensive unit paths, not full corpus attack arms.
  A supplied public-key index does not independently authenticate its participants.
- Stage 4U's 58-item corpus includes eight benign differential cases. Preserve the recorded
  0/58 ledger result, but do not describe it as 58 distinct hostile attempts. Most cases
  rewrap the predecessor's own case table. They test regression resistance, not discovery
  by an independent adversary, and signatures alone do not prove pre-run chronology.
- Stage 4V's conflict map, mirror self-agreement and “subpoena” metaphor are mechanical
  properties, not legal compulsion, truth adjudication or a general absence-of-bias proof.
  A separate process and minimal environment do not prevent shared-user filesystem access.
  Binding the exact capsule does not prove that it was filed with a regulator.

### M49 — Stage 4W–5L closeouts overstate several measurements and completion labels

- Stage 4W's leakage gate covers its frozen English-centric patterns, not every factual
  claim, citation fabrication or quotation error. Its reported incident figures remain
  dated secondary-source motivations until checked against primary records. An in-toto
  subject projection is not C2PA conformance or semantic truth verification.
- Stage 4X's 6/6 to 1/6 and Stage 4Y's 15 to 2 slips measure chosen corpora/transforms.
  The remaining misses are observed residue, not a demonstrated irreducible semantic
  lower bound. Authors still choose seeds, transformations and ground-truth labels.
  A public map can reveal lengths and geometry while withholding text; public acceptance
  does not establish that the withheld document was correctly analyzed.
- Stage 4Z's capture harness was not executed there; Stage 5B completed the elided lens
  and reports a real 1B capture. Stage 5A's external export and real constitution slice
  were also unexecuted. “Paid at mechanism scope” is not completion of these data runs.
  M34 qualifies Stage 5A's browser-verifier claims with retained negative-case results.
- Stage 5B's 0/46 is largely signature/structural mutation coverage. Its two identical CPU
  captures do not establish arbitrary cross-hardware bitwise reproduction. Stage 5C's
  nine slips are among 54 grid cells, including 26 degenerate cells and 19 catches; this
  is not 54 meaningful attack attempts. Its “first non-zero slip” wording must be scoped
  to that ledger, since 4X/4Y already reported non-zero residue. Digest-bound blind severity
  does not establish substantive severity correctness.
- Stage 5D's three rounds and 18 slips concern six bases and a declared normalizer lattice.
  They do not prove a universal normalization impossibility. Its own limitation correctly
  says a consistently omitted round can remain absent. Model provenance is self-reported;
  model corroboration is not independent organizational review.
- Stage 5E has four of eight bases flagged, four flagged bases slipping, and four baseline
  misses. Its external **verify-only** reproduction rebuilds arithmetic over committed
  scores; it does not independently rerun the detector on another architecture. The
  Desktop-only log path is not a repository receipt. Its “five sibling stages” sentence
  lists six stages: 4Y, 4Z and 5A–5D.
- Stage 5F's real two-case panel uses PG2 86M and **Llama Guard 3 1B**, while its nominal
  synthetic panel uses Llama Guard 4 12B. Different label semantics are retained; disagreement
  is not an accuracy ranking. A universe equal to the roster yields an omission bound of
  zero without proving representativeness.
- Stages 5G–5J retain historical outside-party reports. Their computed key/challenge rungs
  establish only the checked bindings; hashes alone do not prove affiliation, honest custody
  or that another operator lacks a key. Stage 5H's producer-side `0.94` was placeholder data
  and failed 311; its completed review-host result covers a specific aggregate recipe.
  Stage 5I covers 37 public section headings with modeled affiliation, not the confidential
  report or the provider's actual review panel. The “Next: pending → completed” paragraphs
  in 5H/5I are stale relative to their own completed sections.
- Stage 5K's OTS witness binds the `ANCHOR_ME.txt` bytes and publication evidence, not actual
  decision time or a new distinct-verifier ceremony. Its tree-size 1–9 checks are finite
  implementation tests, not a general proof of that implementation. Stage 5L's real TSA/OTS
  captures were not yet consumed as a real confirmed quorum bundle there; 5M is the later
  integration. “Cryptographically impossible access” is limited to the declared release
  gate and does not exclude out-of-band copies.

### M50 — Stage 5M–5P temporal and identity claims require explicit assumptions

- The Stage 5M outside reproduction recorded **raw 372** on the earlier pending bundle;
  do not relabel it as reproduction of the later confirmed raw-0 bundle. More seriously,
  Stage 5Q's signed **F002** falsifies the six-attack local containment headline: five
  arms measured pristine input because mutations were absent or silently ineffective.
  Preserve both records and cite the later finding whenever describing that campaign.
  F003 also records the evidence-writing import side effect. These findings do not by
  themselves invalidate the separate three-root anchor verification.
- Stage 5N computes 90,000 ms by subtracting declared one-second uncertainties from the
  92-second token interval. [RFC 3161 §2.4.2](https://www.rfc-editor.org/rfc/rfc3161.html#section-2.4.2)
  allows absent token accuracy to be supplied through another source such as the TSA policy;
  it does **not** prescribe a one-second default. Thus “conservative physical lower bound”
  is conditional on justification of those uncertainty values. `Accuracy: unspecified`
  alone supplies no such justification. The frozen arithmetic remains reproducible.
- A final hash commitment depending on a start token is not proof that the underlying
  human/model decision was first formed after that token. The 5N charter's “pre-decided
  verdict” label and prior-art map's broader claim must be narrowed to **pre-input final
  commitment**. The closeout's decision-formation-time non-claim is the correct limit.
- Stage 5N's prior-art map overstates an exponential evaluation/verification gap as a
  universal VDF definition. Efficient verification is the relevant distinction. RFC 3161
  itself discusses token ordering and accuracy, so it is incorrect to say it has no notion
  of relationships between token times. Broad claims that all provenance systems only carry
  self-asserted times overlook compositions with trusted timestamps and transparency receipts.
- Stage 5O's exact rational floor is conditional on the sampling model, not calibrated
  detection effectiveness. Earlier stages already implement semantic decision parity, so
  “every earlier lane proved only hashing” is inaccurate. Its “only CI-gated stage” statement
  is a dated infrastructure finding superseded by later integration; 210/210 export references
  remain distinct from branch/path/behavioral coverage.
- Stage 5P executed a self-managed-key Rekor ceremony, **not Fulcio/OIDC keyless signing**.
  [Sigstore's signing guide](https://docs.sigstore.dev/cosign/signing/overview/#identity-tokens)
  supports automated OIDC identity tokens and CI/service identities; interactive login is
  not universally required. Offline replay and online issuance are different operations.
  Lane C2 was unexecuted under the project's profile; “unreachable as a fact about the world”
  is unsupported. A finite LEI snapshot is not a live registry signature or durable legal
  authority. Its 3,631/3,639 count with zero failures leaves eight non-passing outcomes;
  it must not be summarized as all 3,639 passing.

### M51 — Stage 5Q–5S completion and coverage remain explicitly bounded

Stage 5Q froze 1,438 of 23,332 obligated cells (6.2%), nine of 2,531 members with a
coverage status, twelve findings and a separate F013 closeout addendum. It did not authorize
Q1 or complete the stage. A green reproduction verifies that frozen incomplete record;
it does not increase its coverage. Later documentation authority is separate from Q1.

Stage 5R attempted eight of 55 families; 47 were not attempted. Its 2,406 selected cells
contain **210 `probed_not_discharged` and 2,196 `unprobed`** terminal states. The sentence
“All 2,406 ... were probed” is therefore wrong. New discharge remains zero, with 15,301
under-supported cells and 23,332 inherited obligations kept as separate measures. Judging
older families inadmissible under a later contract does not rewrite their original record.

Stage 5S's historical total is 5,424 passes out of 5,425 tests with one skip. Its
“Repository: none outstanding” line conflicts with its own two open 5Q findings; read it
as closure of the repairs it enumerates, not closure of every repository issue. Its atomic
writer comparison supports a measured race mechanism, not a universal zero-failure claim.
All witnesses remained one operator with several keys. No real browser ran in its browser
lane. Current smoke counts are separately recorded and must not replace these historical
measurements.

### M52 — The early live-AgentDojo overview is a small, dated experiment

`evidence/stage-1-live/README.md` reports 5/5 benign utility, 0/30 `injecagent` and
0/42 `important_instructions` for selected workspace tasks. Its committed slice is
29/30 utility under attack; “25–42 / case” is not a usable denominator and must not be
quoted as a rate. These observations do not establish resistance to all stock attacks or
validity for every current model. The later-listed Llama 10→8 attack successes and
8→6 benign successes need their actual denominators and study design; “within noise”
is an interpretation without a reported uncertainty analysis. Its final statement that a
nonzero live baseline remains future work is superseded by the Llama result already listed
above it. Historical paid-run commands are not part of this documentation audit.

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

### M53 — Evidence guides must preserve skipped checks and measurement limits

The evidence READMEs and captured outputs through Stage 4M require these additional qualifications:

- The three early Llama experiments use different baselines. Demotion records 10/140 attack
  successes falling to 8/140; authority gating records 9/140 to 0/140; egress gating records
  9/140 to 4/140. Do not combine their observations. Overlapping confidence intervals do not
  establish a null effect, especially for paired tasks. “Task completion 150/150” describes
  runner completion where the separately reported task-utility counts are lower.
- The authority experiment's one benign regression has no retained per-action attribution.
  Its report says both addresses were explicit in `user_task_8`. Stage 4B's explanation that
  addresses were absent from the task therefore does not establish the cause of that live
  regression. Stage 4B and 4C demonstrate recovery of selected model-free cases; their results
  and authority-chain release notes must not present this as verified recovery of the live cost.
  Finite differential tests preserve behavior on their tested inputs, not every argument shape.
- `stage-3e-live/smoke-output.txt` explicitly skips the live provider while passing 40 fixture
  checks. `stage-3e/docker-smoke-output.txt` explicitly skips Docker. A Dockerfile `USER`
  assertion is not container execution. Keep both skips visible; neither is a passing live run.
- Stage 3G's 60 cases across three modes are 180 mode observations, not 180 live calls.
  Stage 3Y's 35 goals crossed with five envelopes are selected, dependent fixtures, not 175
  independent population samples. Its structural demotion/rejection rate does not establish
  live containment. Stage 3Z's four oracle cases assume truthful observations; a separate
  channel inside the same authored experiment does not establish independent custody.
- One-line `PASS` receipts lack standalone revision and environment context. Interpret them
  with their surrounding artifact bindings. Citation tables' June “resolved” statuses are
  historical; a news homepage and unnamed corroboration are not precise incident citations.
- Raw inputs and model outputs retained as replay sources are distinct from metadata-only
  derived artifacts. Fingerprint files identify key bytes; they do not authenticate an operator
  independently. The Stage 4D deterministic private key is explicitly a fixture, so blanket
  statements that no private key exists anywhere in the repository are incorrect.
- Historical regeneration commands write evidence. Run maintenance only in an appropriately
  authorized isolated checkout. Replace shell angle-bracket placeholders before execution;
  the Runpod runbook's literal URL placeholder is parsed as shell redirection. Its unpinned
  vLLM minimum and greedy seed do not establish environment or batched-output determinism.

### M54 — The archived Stage 4M browser verifier cannot parse

The complete 1,065-line source of
`docs/research/llm-shield/evidence/stage-4m/verify-stage4m.html` contains three top-level
`const fail` declarations in one module, at HTML lines 278, 586 and 711. JavaScript rejects
those duplicate lexical declarations before registering the upload or verification handlers.
The exact extracted module fails Node 26.12.0 `--check` with exit 1 and
`SyntaxError: Identifier 'fail' has already been declared`.
The [diagnostic receipt](stage4m-browser-parse.json) pins the original HTML hash, which matches
its README's published digest. This is a syntax check, not an interactive browser run.

The Stage 4M evidence README's “open in any browser” instruction is not a working handoff for
these archived bytes. Generated-byte equality and core/WebCrypto parity checks cannot substitute
for parsing the shipped page. Use the stage's authoritative CLI and retain its own scope and
limitations; this finding does not establish a CLI failure. The frozen HTML remains unchanged.
A future implementation repair must also examine the adapter's acknowledgement key selection
and accumulation of dropped files across bundles; source inspection alone does not establish
those paths' end-to-end consequences.

### M55 — Distinct reviewer keys do not prove distinct machines

`evidence/stage-4r/reviewer-runs/README.md` describes five named keys and an earlier anonymous
record, with out-of-band attribution reported by the requester. Preserve that attribution as
reported. Distinct fingerprints prove distinct public-key bytes, not distinct machines or
independent people. A persistent key file can be copied, deleted or replaced, so the claims
that one machine cannot mint another key and that padding is impossible are incorrect.
A signature authenticates the signed declaration relative to its key; it does not itself prove
that the ceremony ran on the claimed OS. The listed Node majors `18/20/22` number **three**,
not four. This audit performs no new identity verification or outreach.

The Stage 4T live stdio ceremony is a real two-process interaction within the declared host
scope. It does not establish separate operators. A common capsule root binds the supplied
views; it does not prove that no undisclosed alternate capsule exists.

### M56 — Reproduction archives and timestamp targets need exact identities

The corrected Stage 5E independent-verification README explicitly leaves party independence
**uncompleted**. Author-originated SSH commands support a foreign-environment replay, not an
independent operator claim. Five runs across two architectures are finite compatibility
observations; they do not discharge all platform independence. No model inference was rerun.

`KIT_DIGESTS.txt` records that the ZIP used by Runs 3–4 was overwritten and is unavailable.
Its recorded digest cannot recover those bytes. ZIP modification times make archive digests
vary, while extracted-content and evidence-byte reproduction are separate checks. The initial
Lean success wording was unearned: one run type-checked without excluding `sorry`, another
skipped Lean entirely. Later repairs and failed toolchain attempts must remain in the record.

Stage 5L Lane B's OTS log is pending at capture time. Lane D later reports three confirmed
calendar branches and one pending branch, but `ots info` output describes proof structure;
it is not this audit's fresh Bitcoin verification. The two `ANCHOR_ME.txt` files represent the
same commitment with different prefix/newline bytes. OTS stamps the hash of the actual text
file, not automatically the represented 32-byte digest. Its file hash must not be described as
equal to the commitment hex. Lane D's local/cloud runs exercise the core and stub quorum
packs; they do not establish independent-party custody or a newly integrated real quorum.
The historical `StrictHostKeyChecking=no` command is a captured action, not current SSH guidance.

### M57 — Stage 5E's reconstructed transcript is not an original receipt

The complete `stage-5e-independent-verification/RAW_RESULTS.md` contains a provenance note
stating that its initial content was reconstructed from a session transcript after accidental
deletion, is not guaranteed byte-identical and should not be treated as a primary artifact.
That explicit qualification takes precedence over the adjacent README's blanket “operator's
own record, committed verbatim” and “primary artifact” descriptions. The original remote log
is referenced but was not obtained in this audit. Later appended runs retain their own stated
provenance; the note does not establish that every later section was reconstructed.

Several historical run commands pipe through `tee` without showing `pipefail` or explicit
upstream-status capture. A shell's pipeline exit alone can therefore reflect `tee` rather than
the verifier. Preserve recorded failure output and distinguish it from independently captured
process status. The same qualification applies to the Stage 5P reproduction receipt's suggested
`python3 verify.py | tee result.txt` command.

### M58 — Stage 5P's standalone bundle checks less than its guide promises

The independent-verification bundle's README, closeout, reproduction receipt and full frozen
specification were read alongside its actual `verify.py` and browser entry point. All 29 files
listed in `SHA256SUMS.txt` match their recorded hashes. That establishes the archive's current
internal byte agreement, not the completeness of its verifier or an independently trusted root.

A [four-case local diagnostic](stage5p-standalone-probe.json) ran the exact standalone Python
verifier in temporary copies. The baseline and all three deliberately changed copies returned
exit 0 and `RESULT: ALL CHECKS PASSED`:

| Copy                         | Change                                                                                             | What the result limits                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Missing manifests            | Remove both capture manifests                                                                      | Their absence becomes a note; “every evidence file matches” is not enforced      |
| Invalid checkpoint signature | Replace the checkpoint signature line, retaining its root and updating the unsigned local manifest | Root-text equality is checked, but the checkpoint signature is not authenticated |
| Incomplete pair census       | Remove one parity pair                                                                             | 575 rows pass; the claimed complete 576-pair census is not required              |

The verifier authenticates the Signed Entry Timestamp using a bundled key, but that signature
covers entry metadata, not the checkpoint root. Sigstore's [Rekor specification](https://github.com/sigstore/architecture-docs/blob/main/rekor-spec.md)
separates inclusion promises from signed checkpoints and requires checkpoint verification with
the inclusion proof. It also requires an independently distributed trust key. Accordingly,
this standalone script's “root the log SIGNED” message is stronger than its implementation.
These findings do not show that the genuine captured entry was fabricated, and no live log query
or main-stage CLI execution was performed by this diagnostic. A separately authenticated
checkpoint and complete artifact binding remain necessary before relying on the advertised claim.

Other handoff qualifications:

- `verify.py` does not enforce the bundle-wide `SHA256SUMS.txt`. Its separate Python implementation
  is not evidence that an independently attributable author wrote it. Bundled signer/log keys
  require independently selected trust anchors. A second HTTP request is not independent custody.
- The archived browser `index.html` has no `vectors` element, while `parity-run.mjs` immediately
  reads that element. The test harness injects it separately. Opening the raw page is not the
  advertised standalone browser verification flow. Its CSP permits same-origin scripts, so
  “forbids ALL egress” is too broad. No interactive browser run is claimed here.
- Python and a suitable OpenSSL are prerequisites to check, not tools guaranteed preinstalled on
  every macOS/Linux system. Different versions do not establish independently authored crypto
  implementations; matching canonicalization on this corpus is not universal RFC 8785 conformance.
- The spec's initial draft/unbuilt labels are historical and are superseded by its freeze records
  and annexes. A3 forbids joining principals via delegation despite the earlier remedy table.
  A5 adds two coverage outcomes outside the six-row attack matrix; C1 corrects its namespace to
  `gleif.lei.subject.v1`. The deferred table's “five” Section 1 Lean targets is stale; there are six.
- `C2` remains unexecuted in this project. Claims that no suitable identity infrastructure exists
  anywhere are not established. Keyless signing also supports automated OIDC, as M50 records.
  Novelty scores and claims about every existing system are author assessments, not established
  comparative findings. Four separate axes do not establish statistically independent evidence.
- RFC 9943 §§9.1–9.3 explicitly distinguish registration order, statement accuracy and selective
  participation. Those limits support the spec's bounded interpretation; citing them does not
  establish SCITT implementation conformance. A signature on a named operator's log still needs
  credible identity and key-custody attribution before it discharges party independence.

Frozen bundle bytes and implementations remain unchanged. The known standalone omissions must be
repaired and independently challenged in a successor before presenting this package as a complete
verification handoff.

### M59 — Early writeups need versioned citations and bounded detection claims

All seven files in `docs/research/llm-shield/writeup/` were read, including both complete
Markdown and LaTeX technical-note sources. Their Stage 3C result is **13 blocks plus five
warnings**, not 18 prevented attacks; a warning can still reach the provider. The benign
false-positive definition counts blocking only, so zero blocked hard negatives does not mean
zero friction. The nine held-out attacks support a small follow-up observation, not proof of
an intrinsic capability ceiling or absence of overfitting. Freezing a corpus does not make
same-author evaluation independent. HMAC integrity remains conditional on secret custody.

The three arXiv abstract records were freshly checked. WAInjectBench's June citation correctly
matches [v1](https://arxiv.org/abs/2510.01354v1): Liu, Xu, Wang, Jia and Gong. Its unversioned
URL now resolves to [v2](https://arxiv.org/abs/2510.01354v2), revised 23 September 2026 with
Wang before Xu. Pin v1 when preserving the original attribution; use v2's metadata for a new
citation. The inventor-directory link is not a precise primary patent-publication reference.
Abstract metadata checks do not establish full-paper verification, peer review or publication
of Simurgh's own “arXiv-style” note. A `.tex` source is not itself a compiled document.

Stage 3F's 240-case results are synthetic consequence checks under declared scoring rules.
Claims that unsafe consequences cannot escape or that this is categorically stronger than all
jailbreak prevention exceed that scope. Its Stage 3G “next” paragraph is historical.

The complete `one-page-brief.html` repeats the key-custody, uniform-replay and temporal
claims qualified by M40–M58. In particular, benign live utility declined from seven to six;
“held” is too strong, and noise attribution remains unproven. Stage 5M's earlier success must
be read with Stage 5Q's later falsification. The complete `vca-architecture.html` places the
provider after the tool/output gates; actual provider-response checks belong after the provider
response and before execution/export. Its stage chips omit 3F/3G, and its fixed-width board
has no responsive rule. Both HTML logo paths resolve correctly to the existing `docs/` asset.
These are source/prose findings, not rendered-layout or browser validation.

### M60 — Early implementation plans are not runnable current guidance

The 13 May Academic Shield plan contains draft inconsistencies that its self-review misses:
`claudeOnSafe: ... !== "true"` reverses the stated default, while current `src/config/env.js`
correctly uses `=== "true"`. Its weights sum to 1.05 (M30); its example paste-only scores do
not reach the asserted Warning/Critical thresholds. The lifecycle example starts a session
in `exam_started` but does not wire the transition to `active` required by its submit route.
The report example labels absent observations Safe; that cannot establish an observed clean
session. Its HMAC helper accepts an authentic supplied prefix, including an empty chain,
without proving completeness (M03). The privacy modal hides before the request succeeds;
the UI sketch alone is not server-enforced consent. Raw template interpolation and tokens
in query strings are historical sketches, not recommended UI/authentication patterns.

The 14 May Stage 2.1 plan describes nonce uniqueness across the store's lifetime, but its
code and current `src/integrity/nonceGuard.js` expire entries after five minutes with a
one-minute cleanup sweep. Separate signed-timestamp validation remains necessary; this
observation does not demonstrate acceptance of an expired envelope. Its single golden
fixture checks one byte sequence, not universal Node/Swift interoperability. Moreover,
the proposed Swift fixture test uses `JSONSerialization`, while the production sketch
uses `JSONEncoder`. The instruction to change the Node format to match Foundation must
not be used as authority to change a frozen signed format. A digest generated from the
implementation under test is a regression anchor, not an independent correctness oracle.

The 16 May Stage 2.2/2.3 and 2.4/2.5 smoke plans use mock daemon signatures and API flows;
SDK imports, source references, doctor/help checks and installation dry-runs do not prove
interactive browser or native scanner behavior. The checked boxes in the Stage 2.6 Windows
plan likewise do not replace actual platform receipts. Across these plans, expected output,
prewritten successful changelog entries, author-specific absolute paths and historical push
targets are planning material. Shell pipelines ending in `tail` need exit-status preservation
when used for real verification; skipped platform checks must stay visible. Use the current
reviewer commands and dated smoke receipt rather than copying these plans into a fresh run.

### M61 — Pairing and cross-platform plan contradictions

The 14 May Stage 2.2 pairing plan's `verified` label establishes a signature against the
session's registered software key, not physical-device identity or trustworthy sensor output.
Its key binding disappears with in-memory state. The strict pairing shape rejects extra
fields, but its proposed `unknown_field:${k}` reason also propagates the submitted key name
into the rejection audit; calling every such payload privacy-safe is too broad. This is a
finding about the historical sketch, not a newly executed exploit against the current route.
The example `swift run ... | head -2; echo "exit=$?"` does not reliably report the CLI's
expected exit 64. Preserve the producing command's status. The claimed five new gates list
only four new round-trip checks; an expanded existing fixture-sync check is not automatically
a fifth new gate. Proposed counts and prewritten all-pass entries need actual receipts.

The 17 May Stage 2.7 plan repeatedly calls its changes behavior-preserving while expanding
the forbidden-name set, changing the default platform and adding a report property. Those
are observable contract changes. A field name ending in `_hash` does not establish that its
value is hashed, private or non-identifying; the described name scan is not a content/privacy
proof. Default `healthy` or Safe wording for absent scanner evidence is not a measured clean
scan. Its Scenario D bans the substring “automatic misconduct” while requiring wording
containing “No automatic misconduct finding.” Checks must distinguish an allegation from
its explicit denial. Scenario G's raw numeric substring search can match a digest by chance;
that alone does not prove a leaked process identifier.

The platform-tamper examples also need to respect validator ordering: changing a platform
without its scanner version, or increasing counts without consistent aggregate counts, can
fail schema checks before signature verification. Such rejection is not evidence that the
signature check was reached. The health probe's `curl -s` treats HTTP error responses as a
successful transfer unless status is checked. Finally, Git stores executable mode in the
index; `.gitattributes` does not record `chmod +x`. These corrections qualify the historical
plan's “no inconsistencies” and all-green prose; they do not authorize replaying its release
commands or copying its fixed co-author attribution into new work.

### M62 — Linux implementation sketches and test scope

The 17 May Stage 2.8A plan uses `cargo test ... proof_tests`, `session_detector` and
`headless_tests` as if they selected integration-test files. They filter test names; the
shown functions do not match those file-name filters. Select the target with
`--test proof_tests`, `--test session_detector_tests` or `--test headless_tests`, and check
that the expected cases actually ran (S22). The Stage 2.8B privacy-filter command repeats
this error with `x11_scanner`. Its later Xvfb command correctly uses `--test`.

Stage 2.8A's environment detector labels a local-looking `DISPLAY` as `healthy/x11_full`
before connecting or scanning; that is scaffold classification, not observed coverage.
The lock factory is not live-route enforcement: the C/D plan explicitly identifies and
wires that missing integration. The A-plan canonicalizer recursively removes `signature`
keys; the current Rust implementation removes the top-level key. Do not transplant the
old sketch into the frozen wire contract. Its example README's unsupported `--port` option
is corrected in the current daemon guide (M06). The plan and current Linux `Cargo.toml`
still say `MIT`, while the root license/package and Rust source SPDX headers declare
AGPL-3.0-or-later. This unresolved metadata conflict is now disclosed in the current README;
this documentation audit does not relicense code or mutate the frozen manifest.

The Stage 2.8B plan's date-conversion sketch subtracts 60 days after the caller already
applies the civil-calendar epoch shift. Current
`tools/simurgh-daemon-linux/src/http.rs` explicitly removes that subtraction; do not copy the erroneous sketch. Its `/proof` test checks presence/type of a
signature, not cryptographic verification or equality with a measured scanner result.
The report test expects no anomaly with `x11_above_window_count_max = 1`, contradicting
its own `linuxAnomaly` implementation and Warning policy. The Xvfb examples create synthetic
windows and set EWMH properties themselves; they do not establish real-desktop accuracy.
The plan's `visible_window_count = managed + override_redirect` is a counting convention,
not a visibility/occlusion test. Early-return Xvfb cases appear as successful Rust tests,
so a pass count alone can conceal missing execution. Later C/D mandatory-Xvfb handling and
the current full-smoke receipt must be read separately. The B-plan closing two-Xvfb-test
count is stale relative to its four-case test block.

In the 18 May C/D plan, `portal_active` means a successful `AvailableSourceTypes` property
read, not active screen capture (S23). A returned zero bitmask still satisfies its `is_some`
check. The property probe does not establish compositor enumeration or capture readiness.
Its claim that each listed ScreenCast method necessarily triggers a consent dialog is too
broad: the documented lifecycle distinguishes creation, selection, starting and stream
access; `Start` typically presents the dialog. Literal-source searches are regression
checks, not proof that no alternate call path can start a session. The sketch creates and
blocks on another Tokio runtime from a synchronous helper called by async handlers; its
panic fallback is not a demonstrated successful live probe or a timeout guarantee.

The browser packaging hints are untrusted user-agent guesses; ordinary page code cannot
read process environment or privileged browser pages. Source checks for absence of a field
name do not prove all data flows. Likewise, user-unit text and dry-runs do not prove service
startup or installed isolation. The “16 scenarios” include a locally skipped CI scenario
and Scenario P delegated to other scripts; they are not 16 unconditional executions in one
smoke. Redacting a signature produces a non-verifiable copy, which must remain distinct
from the preserved signed original. These are additive corrections to plans, not new native
runtime measurements.

### M63 — Voting-plan consent, privacy and test assertions

The 28 May voting implementation plan describes an atomic consent gate, but its sketch
creates the record before reading the token secret; missing configuration can leave a
record after a failed response. An empty consent POST is an API action, not proof that a
person read and accepted the notice. Withdrawal marks the session and blocks report export;
it does not erase the record or previously exported material. The plan supplies no retention
expiry. Its Phase B internal testers are human participants too; M23's governance and
retention corrections apply before any such study. A template's ethics-approved retention
wording does not establish actual institutional approval.

The sketch rejects a top-level ballot-field list, not arbitrary nested data, and its static
`ballot_presented`, privacy and data-source fields do not establish actual browser activity
or data provenance. Clearing radio values leaves the checked element and labels available;
it is not memory erasure. The persona runner's decline branch does not visit the page, and
its simulated delay does not produce a browser focus event. Its fixed clock affects its own
metadata, not server UUIDs, timestamps or output filenames. Report-step failures can leave
the aggregate assertion unchanged, and forbidden-payload personas cannot truthfully be
summarized as having sent no ballot choice merely because the service rejects it.

Several proposed gates contradict the route: a withdrawn-report request without its token
exercises authentication rather than withdrawal; the replay/body-mismatch route returns 409,
not the proposed 401/404. A fabricated-ID request does not establish that declining created
no record. The draft `markSubmitted` omits the duplicate-submission guard; the current store
contains that guard. Current smoke code also uses increment-before-test counters and expects
401 for the unauthenticated fabricated-ID request. Do not copy the draft's `((PASS++))` into
an `&& ok || fail` chain: its first successful increment returns status 1 and invokes `fail`.
The proposed `curl -f` suppresses the expected 400 response body, undermining that body test.
For complete logs, use `> file 2>&1`; the plan's `2>&1 > file` leaves stderr on the prior
stdout destination. These are historical-plan corrections, not newly executed route tests.

### M64 — Banking-plan firewall and evidence limits

The 11 June Phase A plan correctly separates synthetic implementation from future human
work. Its recursive guard snippet nevertheless lacks the depth limit required by its prose.
Hash-shape validation does not establish meaningful consent content, static false privacy
fields do not establish absence of raw ingress, and HMAC verification does not prove record
completeness (M03). Formatting checks do not validate interactive page behavior. The 12 June
Phase B plan explicitly completes a protocol scaffold, not a participant run; template flags
such as `human_participant: true` must not be counted as collected human evidence.

The B4-A implementation sketch's plain substring scanner rejects its own required
“not fraud detection” and “not financial advice” disclaimers. The current output firewall
adds a bounded negation rule, rejects extra narrative fields and validates non-claim element
types and lengths; those corrections are absent from the historical sketch. Neither version's
finite phrase list establishes semantic detection of every misleading claim. Equality of
three official fields establishes equality of those fields, not agreement of the narrative's
meaning with them; the helper alone also treats two missing fields as equal.

The proposed no-egress gate searches four source files for listed strings. Adding a `fetch`
comment proves that regex fires, not that the running program cannot communicate. Receipt
flags are software assertions, and a narrative SHA-256 hash is a fingerprint, not a signature
or independent witness. The draft failed-firewall receipt can mark later checks passed even
when an earlier gate returned before they ran. Scope such claims to the actual executed path
and its evidence. The route test block does not cover every response-matrix row despite the
self-review saying it does, and `tests/unit/**/*.test.js` is not recursively expanded at all
depths by default Bash globbing. Prewritten completed closeouts and expected PASS outputs
are instructions, not receipts. B4-B's page-contract smoke likewise does not establish a
rendered browser result or improved human comprehension.

### M65 — Early LLM benchmark plans and measurement boundaries

The Stage 3A plan's control-character expression removes C0 characters and DEL, but not
C1 U+0080–U+009F despite its comment. Its length check uses JavaScript string length after
normalization; that is not a 4 KB UTF-8 byte cap. The Content-Length header check alone does
not cap an absent/chunked body or undo parsing already performed upstream. The router's
supposed seven-case test block contains six tests. The mock interpolates caller-provided
`task_type`, so “never echoes raw input” is limited to the `input` property, not every
caller-controlled value. The run sketch discards the mock's response; its benign pass rate
measures classification, not successful summarization or translation.

The plan records its safe-path audit events after invoking the mock. Their serialized event
order does not independently establish real execution timing. Response flags and a valid
server-owned HMAC chain are evidence of the configured reporting path, not an independent
provider-call observation. The receipt points to the decision head before the receipt-export
event; it is not the final post-export head. Alpha contexts rejection hashes the empty string
instead of the submitted input. Ten direct attack examples plus one unsupported-context
case give eleven blocked cases; the context refusal should not be presented as an eleventh
observed jailbreak detection. The runner has no explicit nonempty-corpus assertion and checks
expected reason-code inclusion rather than exact equality.

The Stage 3B plan improves reporting by separating clean benign and hard-negative results.
Its historical baseline-seeding command writes observations; it is not authority to refresh
frozen results now. The validator sketch omits required ground-truth/type/census validation,
and its `pass === total` condition accepts 0/0 if an empty baseline were also supplied.
The digest loop likewise needs a pinned nonempty path set; finding the literal denylist
variable name does not prove a nonempty active rule set. A two-file digest does not freeze
all router/provider behavior. Its privacy script searches selected strings and files, and
prints a no-logging PASS line even after recording a logging failure; the final exit remains
nonzero, so that intermediate line must not be cited alone. These bounds qualify the draft
security/privacy claims without changing frozen detector bytes or benchmark measurements.

### M66 — Stage 3C draft contradictions and evaluation interpretation

The complete Stage 3C plan and spec differ in consequential ways. The spec folds before
base64 decoding, while the plan correctly decodes case-sensitive blobs first. The spec says
not to merge whole-sentence spacing, but the plan's compact view removes every non-ASCII
alphanumeric separator. That compact match also bypasses the spaced match's negation test.
The educational regex is not anchored to a lead-in; one quoted matched phrase can soften
other unquoted matches in the same input. These are heuristic rules, not instruction-scope
parsing. The proposed role-play test expects Warning for text containing the newly added
`output your system prompt` hard phrase, yet the shown mapping returns Blocked without
educational framing. The context-guard block contains five tests, not the expected three.
The router replacement instruction says to replace through the response but shows only the
safe mock call at its end; applied literally, it omits the safe response construction.

Warning still invokes the mock. Reporting Warning plus Blocked as “detection” must retain
the split and cannot be relabeled prevention. The hard-negative false-positive metric counts
blocks only; it does not measure warning friction or human utility. The all-off ablation uses
the expanded 3C phrase set, not the literal original 3A detector; the plan acknowledges this,
but the spec's table labels it as the frozen 3B baseline. Sequential ablations also depend on
addition order and interactions. A tiny same-author held-out set is a descriptive transfer
probe, not a quantified causal overfitting estimate or proof of a deterministic ceiling (M59).
A specimen already printed in a pre-implementation plan cannot establish that its text was
unseen until after implementation merely because the task is numbered after the freeze.

The plan's immutable-field checker enumerates current files only, so it cannot detect a
deleted fixture, and parsed-value equality is not whole-file byte equality. Its held-out
runner explicitly exempts `sha256:PLACEHOLDER`, contrary to the instruction to fix placeholders
“flagged” by that runner. The promised held-out privacy extension only repeats a source-key
scan; it does not traverse that evidence folder. Measurement-only runners can still fail on
bad hashes or I/O, so “exit 0 by design” is too broad. Historical re-freeze instructions do
not authorize changing frozen evidence during this audit.

### M67 — Foundational design specifications are historical contracts

The Stage 1 Academic Shield spec alternates between SHA-256 and HMAC-SHA256 identity
wording; current keyed behavior is documented in M01. Its seven listed weights sum to 100%,
whereas the later implementation-plan weights sum to 105% (M30/M60). Its example category
values give 42.75 under the displayed weights, not the example score 64. The confidence
number is illustrative, not calibrated. A planned signed report and a 30-day config value
do not establish an exported digital signature or enforced deletion. Stored pseudonymous
identifiers and behavioral timings are not automatically anonymous.

Stage 2.1 correctly separates signature verification from unregistered node trust, but a
single Node/Swift fixture does not establish all-input canonicalization interoperability.
Its five-minute cleanup callback does not establish the assertion that an auxiliary record
never outlives its session. Conditional Swift skips are not macOS test executions. Stage 2.2
binds a key to a session, not a physical device or sensor truth; M61's arbitrary rejection-key
and four-versus-five gate corrections apply to this spec too. Its later-stage numbering is
an early roadmap, superseded by the released stage records.

Stage 2.7's mock P-256 scenarios are not native scanner measurements. Its scenario table
uses `device_integrity.platform` while its report contract names `daemon_platform`.
The ban on “automatic misconduct” conflicts with the required negated disclaimer, and a
platform mutation can fail scanner schema checks before signature verification (M61).
Stage 2.8's real-Linux matrix is a validation target, not an executed matrix. A readable
portal property is not active capture or universal coverage (S23), and signature-redacted
proof copies cannot be verified. Sharing port 3031 does not make collisions impossible:
another local process or daemon instance can occupy it. Its scanner-version error names
also differ between the fail-code list and smoke table; consult the implementation/receipt
for the applicable route rather than treating examples as current code.

The May paper design's generic Ed25519 claim must distinguish the earlier CLI protocol
from the P-256 daemon protocol. Historical platform counts and an intended venue are not
current test totals or publication acceptance. Its replacement-of-screen-trust thesis is a
research proposal, not evidence that signed self-reported metadata establishes trustworthy
observation. The voting design likewise includes future daemon/persona behavior absent from
the browser-only plan; its CommonJS `require` mount is not valid guidance for this ESM server.
“Before any session mutation” conflicts with appending a rejection audit event; the actual
boundary is rejection before accepting the scenario. M63 qualifies the related consent,
provenance, withdrawal and deterministic-output claims.

The 3A spec's “all three routes are token-bound” excludes its unauthenticated session-creation
route in the plan. Invalid requests do not necessarily emit receipts, so “every run” needs a
valid admitted-run scope. Its stage forecasts were revised by 3B/3C and later records.
The 3B spec's 100% hard-negative pass claim was explicitly relaxed in the plan; benchmark
labels are author-assigned, not an independently established truth oracle. Its privacy-audit
requirements cover more artifact classes than the shown implementation scans (M65).
The banking B4-A/B specs' “improves explanation” remains an unmeasured human-outcome claim;
template generation and static UI checks do not establish comprehension improvement. The
receipt hash uses `JSON.stringify` insertion order in the plan, not a general cross-language
canonical serialization contract. These corrections preserve the original approved documents
while making their interpretation reviewable.

### M68 — Banking rejection keys remain caller-controlled

The Phase A banking design says rejected-attempt audit payloads contain only route, reason
and field name. That shape alone does not exclude sensitive content. Current
`bankingScenarioPolicy.js` returns an arbitrary unknown key as `validation.field`;
`index.js` passes it to both the error response and `appendRejectedAttempt`, and
`bankingAudit.js` retains it unchanged as `field_name`. A caller can put private text in
that key even when the property's value is omitted.

A local call to the current validator and audit-payload builder using the fictional key
`FICTIONAL_PRIVATE_LABEL` returned `unknown_field` and retained that key in `field_name`.
This confirms helper behavior; the route connection was checked in source. No HTTP request,
real personal data or external service was used. The [probe receipt](banking-rejection-key-probe.json)
records the inspected source hashes and scope. Current privacy/security guides now disclose
this limitation. The preserved runtime remains unchanged; a separately authorized successor
should use fixed rejection categories or allowlisted field identifiers.

### M69 — Stage 3D draft containment and runner limits

The complete 3D plan/spec describe deterministic mock boundaries, not a proof that all
jailbreak consequences are contained. The plan's absolute goal and the spec's one-line
framing need that scope. A context label and a finite authority-marker scan do not authenticate
provenance. The shown guard does not require every illustrated context field, rejects every
`trusted` claim without implementing a signature verifier, and accepts synthetic labels supplied
by the caller. Non-array `contexts` do not activate 3D by themselves and are treated as absent
by the shown guard. Canonical text can equal the original text; “never raw text out” means an
ephemeral scan view, not guaranteed removal of source content. Mock outputs do not consume the
context, so these fixtures cannot establish effective demotion inside a live model.

The tool gate decides from a class label; it does not bind the tool name, arguments and resource
to an independently trusted registry. Neither allowed nor blocked tools execute. The newer
OpenAI demonstration adds separate authority checks; it does not retroactively establish them
for 3D. Top-level `Object.freeze` does not freeze nested scenario/policy objects. The output
scanner is finite pattern matching. Receipt `task_type` is a caller string in the plan, so a
hashes-and-enums-only description is false. Audit events are appended after the pipeline and
encode its reported decisions, not independently witnessed execution timing.

The plan's risk calculation occurs after the provider step. Its warning-only example gives two
points, which maps to Safe under the stated thresholds, despite a test expecting Warning.
The fixture runner resets the score for each fixture, sets `repeatedWarning: false`, and does
not assert the supplied expected risk verdict or audit sequence; it cannot establish the
claimed cross-run softening behavior. The proposed red risk smoke can pass a zero-point stub
because equal scores satisfy its monotonic assertion and context rejection forces Blocked.
The tool-audit expected sequence omits the risk-escalation event emitted by its own code.
Counting failed assertions as failed fixtures can inflate the apparent corpus size.

The privacy example scans metrics and source-key strings, not all claimed receipts/audit
exports. The no-network grep is a limited structural check, not an egress observation. The
security script lists eight checks despite its expected seven-pass message. Shell pipelines
and the final `kill` can mask preceding failures without explicit status handling. Historical
whole-repository formatting, baseline-writing and release instructions are not authorized by
this documentation audit. Preserve the drafts and use stage-specific retained receipts for
actual outcomes.

### M70 — Stage 3E-core draft contracts exceed the shown implementation

The complete gateway spec/plan promise pre-provider risk enforcement, active timeout/output
caps and authenticated session creation. The shown router instead creates sessions without
a bearer check, parses timeout/output limits without enforcing them, and computes risk after
the provider. Its final ternary blocks input/context/tool/output failures but maps a standalone
`riskVerdictValue === "blocked"` to Accepted; only Warning gets its own branch. The same final
mapping remains in the preserved router inspected during this review. This is a source finding,
not a newly executed HTTP scenario. Current supported-entry-point restrictions and the separate
transactional successor must not be confused with repairing that module.

Provider mode and provider are validated independently, allowing mismatched permitted names;
the receipt can therefore name a provider other than the selected implementation. Unknown mock
scenarios silently fall back to benign. Config rejection hardcodes `provider_mode: live` even
for invalid recorded-fixture requests, and passes an exception message into reason codes.
The raw caller `task_type` also reaches the receipt. A metadata-shaped schema is not a guarantee
that every string has an allowlisted value. The normalizer's “total, never throws” description
is false for `null` and objects with throwing conversions. The replay validator checks a
self-declared synthetic flag and output hash, not independently established authorship; the
shown hash does not bind the tool request or the entire fixture. Six replay-provider tests are
shown, not the stated five.

The OpenAPI check verifies selected properties, not complete OpenAPI validity or implementation
conformance. Global bearer security contradicts the unauthenticated sample session/OpenAPI
routes; the run response schema describes a receipt rather than the actual wrapper. Required
`provider_mode` conflicts with the runtime default, and the sparse receipt schema does not enforce
its privacy claims. Spec and plan also use different key-derivation labels. The spec's linked
June 17 live-adapter filename was superseded by the June 18 Anthropic design.

The 70 fixtures and expected outcomes generated from the same pipeline are regression checks,
not an independent security oracle or 70 live-model observations. The direct-import runner
cannot establish every HTTP behavior. “No network” describes provider operation in mock/replay:
HTTP serving, dependency installation, audit and Docker builds have separate network surfaces.
A non-root image and a matching `.env` ignore line do not prove that the image contains no
secrets. Docker SKIP with exit zero is not a successful container execution. Version-string
greps do not establish byte preservation. These qualifications apply to the plan's checked
self-review and the spec's intended success criteria, which are not execution receipts.

### M71 — Stage 3E-live draft limits and retained adapter behavior

The complete live plan/spec describe proposed optional live validation. Forty synthetic
fixtures, including five metadata fixtures, do not establish forty live calls; the preserved
optional smoke is separately recorded as skipped. The plan's skip guard checks truthiness for
most flags, so a literal `false` is not equivalent to its advertised all-flags-enabled condition.
Its “all code complete” self-review also overlooks the smoke's explicit scaffolding placeholder.
The plan lists five ledger tests and four adapter tests while expecting four and three.

The draft context builder strips selected controls and takes source prefixes; it does not perform
the specified canonicalization or semantic summarization. The current builder broadens control
removal to C0/C1 but still copies ordinary source text verbatim. Its 500-unit bound uses UTF-16
length, while its combined 2048-byte bound uses UTF-8 (S24); the latter excludes the surrounding
instruction and input. `context_id_hash` hashes content, not the illustrated context identifier.
A bounded prefix is neither anonymization nor proof that content is safe to send. The plan's
privacy scanner traverses fixture JSON despite promising to exclude fixtures, omits text logs,
and can excuse another occurrence of a forbidden key when any same-named key has value false.

The draft SDK client sets only `apiKey`, despite claiming no automatic retry. The installed
SDK 0.39.0 defaults to two retries. A local SDK test with an injected fetch implementation
returning synthetic HTTP 429 responses made three fetch calls; it opened no connection.
A second injected-fetch test let the adapter's timer abort a real SDK operation. The adapter
returned `gateway_provider_error`/`unknown`, not `gateway_live_timeout`/`timeout`: its check for
an exception named `AbortError` does not match the SDK's wrapped exception. The draft's custom
fake client uses that exact name and therefore misses the integration difference. The
[probe receipt](gateway-sdk-probe.json) records versions, source hashes and bounded observations.
The official SDK reference independently documents default retries and disabling them (S25).

The adapter also bypasses its own timer when the caller supplies a signal; truncates output
before hashing/scanning instead of reporting the specified oversized-output rejection; and
labels import/client failures as provider-called/egress-used without observing a connection.
A response hash here binds reduced text, not the full provider response or discarded tool-use
blocks. A fixed latency bucket is not measured latency. The direct adapter export does not
itself call the live-env guard. Session/minute counters are local, daily counts reset per process,
and incrementing after `await generate` does not reserve capacity against concurrent requests.
The retained router checks the primary live attempt but its `callProvider` helper does not
recheck/reserve a fallback attempt. These limits qualify denial-of-wallet claims; no new live
request was made to test quotas.

The draft unconditionally emits live-called events and egress flags whenever config exists,
even after an input/context block. The retained router has since added `providerCalled` to
those two conditions, so that specific draft error is not attributed to the current path.
Its risk bonus still uses config presence, and its receipt head is obtained before later live
annotations. Defined import event names do not establish that those events were emitted.
The current mounted legacy live route returns HTTP 410; this does not remediate direct imports
or old server revisions. Current security/privacy guidance now distinguishes these boundaries.

### M72 — October assurance plans and contracts retain dated scope

All twelve October 15 plans and all eight paired assurance specifications were read completely.
Their prospective acceptance lists and interim execution entries are historical records; unchecked
boxes do not mean that later published work is absent, and “commit/push follows” is not evidence
that a push occurred. Current outcome/validation guides and the integration matrix supply the
later disposition. The 5,119-pass/three-skip totals describe those checkpoints, not the October 19
full-smoke result. Earlier missing-prerequisite skips are not retroactively successful executions.
A fresh assistant review or fresh environment is not an independent outside operator. Subjective
scorecards are neither measured quality scores nor reviewer/vendor endorsement.

The lab's 51 case/control rows and SDK's 102 baseline rows count authored cases under controls;
the four extra lifecycle outcomes include an unsupported OpenAI in-place edit, which is not an
executed edit. Framework approval defaults are scripted decisions, not authenticated human consent.
The SDK spec's “no in-place argument-edit parameter” is limited to the pinned public RunState API;
it is not a statement about every newer API. Durable file recovery restarts executors, whereas the
later workflow experiment restores native approval state. The durable and Redis designs explicitly
separate effect publication from receipt commitment: local idempotency and reconciliation are not
universal exactly-once execution. The Redis plan's deferred combined pending-crash/concurrent-recovery
case remains outside its 19-case report; later workflow cases do not silently expand that corpus.

The scope, egress and isolation plans record material observer/envelope/stop-persistence fixes and
refreshes of their own source bindings; “preserve previous sources” must be read as preserving
previous families, not prohibiting those disclosed pre-closeout corrections. A namespace denial or
Landlock ENOSYS is an observation of that environment, not proof of platform-wide unavailability.
“Outside” observation in the egress design means outside the filtered worker on the same trusted
host. The isolation spec's connected-TCP wording is bounded by its plan's final SO_PROTOCOL caveat:
trusted bootstrap creates TCP, but validation does not independently query the protocol. Raw fork
inheritance is not compatibility with every language/runtime fork wrapper. Both network experiments
retain authorized-content and host-relay limits; they do not establish general sandbox security.

The local Meta pilot's compact prompt is an explicitly post-result exploratory ablation; report it
with the failed original capture. Its version-only dependency lock is not an artifact-hash lock.
The repeated Meta study records separate AI-agent authorship, not organizational independence or
unknown training data. Its all-invalid reads mean no complete model workflow and no eligible
model-derived recovery, despite passing scripted recovery tests. The later tokenizer consistency
check is additional provenance evidence, not another capture or external attestation.

The Luna plain-text plan ends at pre-inference preparation; use its later result guide for actual
collection. The native plan correctly treats schemas, tool-choice settings and changed system text
as a combined interface intervention. Required function calling supplies no authorization, and
host-orchestrated stateless turns are not an autonomous conversational tool loop. Repetition indices
are not API seeds. Case-cluster intervals describe this purposive suite, not a sampled population.
`store:false` is not zero retention, and the dated pricing estimate is neither an invoice nor a
hard account cap. Old capture authorization and key-handling instructions are not authorization to
make another paid request during this docs-only review. Frozen plans/specs remain unchanged;
M16 and the current entry-point guides describe subsequently completed work and external gaps.

### M73 — AgentDojo core harness claims need their canary scope

The full Stage 3H core plan/spec distinguish a CI canary from a real external run, but their
introductory “benchmark-compatible” and in-loop claims are stronger than the shown stub. A
`query(step)` alias tested against a fake client is not validation against AgentDojo's actual
pipeline interface. The Node smoke drives canned scenarios directly; it does not execute the
Python adapter or benchmark scorer. Its track-to-scenario mapping supplies a known mock output,
not the proposed benchmark tool arguments or final answer for mediation. The closing plan
claim that a Node test cannot drive Python is also false in general: it can spawn Python;
this particular smoke simply does not. HTTP loopback traffic is network traffic even when no
external provider is called. Later Layer-2 execution has a separate scope and evidence.

The shown canary contexts omit fields required by the provenance guard, so the specimen benign
requests are not valid evidence for their expected acceptance. One session for all cases also
shares cumulative risk across cases. The plan's client suite has four tests, not three. Its
health check proves that an origin responds, not that every gateway route is configured or
that the response came from the intended launched process. The HTTP client follows urllib's
default behavior and reads an unbounded response; the stub tests do not establish redirect,
malformed-response or body-size guarantees.

Both the draft and retained `mapping.py` treat any verdict other than literal `blocked` as not
blocked, including a missing or unknown verdict. A direct synthetic helper call confirmed this;
the [probe receipt](agentdojo-helper-probe.json) records the scope. The helper does not validate
the receipt or translate Warning into the gateway's export semantics. A missing receipt identifier
becomes `unknown`, and run IDs alone are not globally unique across sessions. This qualifies the
claim that the transport wrapper always enforces a validated gateway decision.

Both the draft and retained canary metrics helper hardcode receipt coverage and audit verification
to one, context escalation and evidence leakage to zero. A zero-row helper call still reports
full coverage and accepts an arbitrary nonempty version-pin string. This does not mean the separate
30-case smoke was empty; it means the metrics function alone does not measure those properties.
Its unauthorized-tool “rate” counts every `tool_called`, including permitted calls, and returns
a count rather than a denominator-normalized rate. The output metric examines one attack track
and reported verdicts, not independently observed exports. Final-chain verification in the smoke
is distinct from coverage across all runs. The draft verify-only path checks just one stored
invariant and forbidden-key strings; the consistency gate trusts declarations rather than
installed-package/scorer hashes. Native metrics correctly remain external-run-only sentinels.

### M74 — AgentDojo Layer-2 draft validation and metric semantics

The complete Layer-2 spec/plan require an actual pinned baseline/defended run and explicitly reject
claiming completion from the blocked stub. Retain that rule. The sample's lock flag and run-manifest
booleans do not themselves prove pre-execution commitment, scorer immutability or installed version.
The sample validator checks counts, uniqueness and ID existence, not pair compatibility or complete
baseline/defended row identity. Its runner accepts externally supplied rows without proving they
came from AgentDojo. The consistency example compares denominators and declarations; it does not
reconcile exact row IDs, validate all numerator/rate relationships or require a nonempty complete
run index. A present hash binds supplied bytes, not when they were committed.

The draft sanitizer rejects `raw_prompt` before projection, contradicting the first test that
expects that field to be silently stripped. Its allowlist omits gateway contact, receipt and audit
fields, so the shown runner discards precisely the evidence needed by containment and run-index
checks. The retained sanitizer now includes those fields; that particular draft omission is not
attributed to the current implementation. Allowed key names still do not validate field types or
make arbitrary nested values metadata-only. The multi-artifact writer can overwrite earlier files
and is not an atomic publication transaction; its filename helper assumes trusted filenames.

The retained metrics helper, like the draft, treats absent `completed` as completed. A synthetic
one-row call confirmed 1/1 completion with no completion field. Absent adverse-event flags also
count as no event; they are not explicit unknown observations. A `non_call_reason` contributes to
“receipt coverage,” so that value is mapping coverage rather than actual receipt count. The
`utility_preserved_rate` divides defended benign successes by baseline successes without matching
which tasks succeeded in both arms; it is a ratio of totals, can exceed one, and is not paired
preservation. Zero denominators become numeric zero rather than an undefined estimate. The
[helper probe](agentdojo-helper-probe.json) records the bounded checks; it does not assert that all
stored benchmark rows lack required fields or that every published result is invalid.

The draft smoke sets `SIMURGH_PORT` instead of the earlier documented `PORT`, omits the explicit
demo/secret setup, and can mistake an existing listener for its child. `npm test` alone does not
start or validate the real gateway. The suggested spec CLI exposes flags absent from the initial
runner skeleton; the plan explicitly requires inspecting and completing the real binding before
closeout. Its malformed nested Markdown fences and prewritten successful closeout text are
historical draft defects, not commands or outcomes to copy into a current handoff. Later stage
records supply actual run outcomes; the frozen drafts remain unchanged.

### M75 — Utility-recovery taxonomy is descriptive, not a causal proof

The complete Stage 3I spec and phase-1 plan condition the proposed permit work on measured failure
categories. Their proposed permits and broad containment statements are not evidence that the
whole permit mechanism shipped. A task hash, a `model_authorised: false` field and a run-expiry flag
alone do not authenticate authorization or bind specific recipient/resource values. The example
permit spans several effects; calling it minimal requires a policy and enforcement argument.

The sample taxonomy labels blocked rows before considering adapter or scorer errors, although an
adapter error can itself cause a block. Unknown blocked boundaries become input-boundary failures;
accepted failures default to model failure without establishing cause. Warning/export restrictions
are not represented. Declared argument/effect classes are not produced by the shown mapping. Thus
“never blamed” and precise causal attribution exceed this descriptive classifier. A plurality or
order-dependent tie is not necessarily a majority. Routing every non-tool dominant category,
including model, unknown or no failures, to a context fix does not establish the diagnosis.

The example `receipt_hash` hashes an identifier rather than receipt bytes; run identifiers can
repeat across sessions. Public task-ID hashes are linkable, not anonymity guarantees. Caller-supplied
`kind` and reason strings also need value validation before being described as metadata-only. The
strict audit hardcodes the earlier 10 benign failures and 20 security blocks; that is not a general
completeness condition after utility recovery. Count comparisons and 64-character lengths do not
validate exact row identities, hexadecimal digests, source binding or cryptographic audit validity.
The fixture uses task IDs 0–9, including 4 and omitting frozen task 10. Its self-assigned verification
flags and receipt identifiers are synthetic, not observations. Preserve the old fixture and results;
do not follow the draft's overwrite instructions during a historical audit.

The plan shows nine taxonomy tests where its prose expects ten, and later says three new tests
despite the additional examples. Its integration instructions name one helper but place the hook
in another runner. The developer-specific absolute checkout path is historical. These draft defects
remain recorded here; no taxonomy or benchmark rerun was performed for this review.

### M76 — Full-suite draft checks do not establish complete benchmark execution

The complete Stage 3J plan/spec use deterministic ground-truth actions. That measures a bounded
execution path; it does not establish resilience against an adaptive live model. A zero baseline
attack-success rate provides no demonstrated reduction. The asserted explanation for the difference
between the paper's 629 and the proposed 949 pairs needs provenance beyond aggregate counts.
A manifest containing only counts cannot establish exact precommitted case identities, and
self-reported scorer/version flags cannot prove those properties.

The sample hard-gate aggregate omits gateway contact and inherits the metric limitations in M74.
Its suite list is derived from defended rows, so a missing defended suite can disappear from the
breakdown. Positional merging and matching counts do not establish case identity. Hashing task IDs
without suite identity can collapse identically named tasks from different suites. A single gateway
session also accumulates risk across cases. The proposed artifact builder does not itself emit all
the promised manifest, receipt, environment and runtime evidence. The consistency check reconciles
some counts and declarations, not every expected suite, pair, score and source digest. The optional
real-run check requires 97 benign cases but only a positive security count. A top-level JSON privacy
scan does not cover nested files or logs.

The default smoke verifies stored artifacts; its all-pass development fixture is not a new benchmark
measurement. The opt-in example's relative Python path becomes invalid after the wrapper changes
directory, and an explicitly empty gateway environment variable can suppress the Python default.
A version-only install is not an artifact-hash lock. A coverage exclusion does not prevent importing
or unit-testing pure row-merging logic. These are historical plan limitations, not instructions to
rerun paid inference or overwrite frozen results. M53 and later evidence records retain the actual
historical outcomes and their narrower scope.

### M77 — Adaptive-readiness plans distinguish descriptors from executed variants

The complete Stage 3K spec and both plans limit the main lane to deterministic testing, but
“regression / invariance guarantee” remains too broad for a finite corpus. A deterministic
counterexample can also falsify a robustness claim; a real LLM attacker is not the only possible
falsifier. “Structural rather than detection-based” overlooks the retained detector rules. The
rate-versus-count error in `operator_asr_delta` is already corrected in M42: subtracting zero
from a rate does not turn it into a count.

Plan 1 generates hashes of identifiers and parameters, not mutated text or execution evidence.
Its seed is recorded in a manifest but does not drive that generator. Repeated source/operator
inputs are not rejected, and source IDs without suite identity can collide as logical identities.
The action-open case hash includes suite identity, but its source hash does not. A hash of a
public identifier is not an anonymity guarantee. The metrics consistency test requires consequence
flags for every `attack_success` row, although the specification separately allows action-open
attacker goals without such consequences; those fields must retain their distinct meanings.
Per-operator `hard_gates_clean` only checks three consequence flags, not receipt/audit coverage.

Plan 2 delegates the actual transformation and execution to a later runner extension. Tagging
existing rows is insufficient evidence that each described variant was run. Its manifests are
constructed after row collection, so they do not establish pre-execution commitment. The binding
review fixes supersede the empty provenance map, omitted action-open count checks and informal
row-tagging test; those corrected requirements must be read with the earlier examples. They still
do not make aggregate counts an exact executed-case reconciliation. The catalogue-mode checks can
pass without run metrics by design; deleting run metrics must not be described as a full-run pass.
The shown audits do not independently verify every receipt, audit entry, suite sum, installed
scorer or absence of network effects. Filename-pattern drift checks depend on the chosen Git base
and path set; they are not a complete behavioral policy proof. Formatting failures are suppressed
in the smoke example, and its final closeout step incorrectly labels the hard-gate-relevant
operator value report-only. Frozen plans remain unchanged; later retained results have their own
scope and must not inherit the draft's strongest language.

### M78 — Reference-containment draft observations and later corrections

The full Stage 3L plan/spec describe 180 deterministic cases, not 180 independent attacks or a
live recreation of the reference incident. The five malicious family templates repeat payloads
under different case IDs; a family named long-run softening does not itself execute multiple
turns, memory persistence or subagents. The public-event framing is bounded by the verified
provider account in M41; a news-site homepage alone is not article-level corroboration. A working
URL also does not establish every factual claim attributed to it.

The execution-corrections section supersedes the draft's invalid provenance enums, absent-tool
call, direct-input validity omission and missing exact-boundary gate. Task 2's later reference to
Task 4 remains stale: the corpus generator is Task 3. The implementation note permits selecting
benign framings against the existing detector; that is fixture construction, not a held-out test.
The plan's “do not quietly tune” rule should distinguish this disclosed construction from a
post-freeze change. Its synthetic examples call guard functions in process rather than the full
gateway, model, tool executor or export sink. Classification of a modeled consequence is not an
independent observation that an external effect did or did not occur.

The retained helper still returns `receipt_exported: true` and `audit_verified: true` directly.
Those two aggregate counts do not measure per-case receipt publication or HMAC-chain verification.
The sample audit artifact also declares validity; signing it later does not upgrade that evidence.
Current context escalation no longer depends on the draft's expected-boundary condition, but
output classification still uses fixture expectations. Current tool and output checks are separate
`else if` branches, so a combined tool-plus-output fixture does not exercise both downstream steps.
The shipped corpus routes its families separately; this observation is not a new failed corpus run.

The draft read-only runner compares metrics and manifest, not every emitted artifact. Its privacy
scan checks selected token patterns and files; it cannot prove arbitrary secret absence. The
closing correction requires detector-digest presence, which is weaker than the spec's proposed
current-source digest comparison. A branch diff is a separate check. Literal overclaim scans can
also match explicit non-claims, and missing docs make the sample grep pass. Preserve the frozen
record and use these qualifications when presenting its results.

### M79 — Attestation plans need exact canonicalization and verification boundaries

The full Stage 3M spec/plan correctly separate an Ed25519 run-set attestation from a full internal
HMAC chain. “Nobody owns the proof” is unsupported industry positioning; established signed
provenance mechanisms exist. A signature authenticates possession of the corresponding private
key under an independently trusted public key, not organization identity, uncompromised execution
or factual truth. Optional fingerprint matching must be anchored outside the supplied bundle.
A signature does not by itself prove recomputability. M42 already qualifies “any edit fails” for
canonical-equivalent formatting and distinguishes referenced-file byte hashes.

There is an additional retained canonicalizer limitation: assigning sorted properties into `{}`
drops an own JSON `__proto__` member from serialization by invoking the prototype setter. The
[local probe](canonical-member-probe.json) added such a synthetic member to an in-memory copy of
the retained signed bundle. Raw JSON changed, canonical bytes did not, and the existing signature
still verified. This was a canonicalizer/signature check, not a claim that the entire CLI verifier
accepted an attacker-controlled package. No frozen artifact, source or key was changed. Integer-like
keys also follow JavaScript enumeration order, so “recursively lexicographic” is not an all-input
serialization description. This custom format must not be described as universal RFC 8785
conformance. Duplicate-key parsing and numeric representation need their own explicit contract.

Several draft verifier defects were corrected in retained code: the portable tier no longer
imports the Stage 3L producer, gate results are compared with recomputed gates, and the bundle
itself is included in the leakage scan. The retained reproduction helper still sets its privacy
match from the bundle's zero-valued leakage field; that is a declaration check, not regeneration
of a complete privacy report. Hash-matching referenced files and recomputing metrics are distinct
from validating every embedded field against its referenced source. The draft schema permits
empty reference arrays and weak field types; its examples alone do not establish complete schema
validation or all malformed-input behavior. Public-key parsing can throw outside the signature
catch, and the CLI loads referenced paths before signature validation; use trusted local packs,
not an unrestricted untrusted-file service.

The key-generation draft does not enforce an outside-repository path or exclusive creation;
`mode: 0600` does not reset permissions on an existing file. Its example omits creation of the
private key's parent directory. The signer reads evidence more than once, assumes a matching
public/private pair and publishes multiple files separately. These examples do not establish
atomic snapshot/signing or safe key rotation. A PEM-marker scan covers selected tracked content,
not all secret encodings, untracked files or Git history, and can match its own instructional text.
The proposed whole-tree formatter, blanket staging and CHANGELOG prepend are obsolete for this
audit: preserve frozen evidence and append-only logs. No signing or key generation was performed.

### M80 — Claim-ledger scope and completeness need separate evidence

The complete Stage 3N spec/plan correctly exclude the unfrozen pre-3I recovery baseline and refuse
pooling across their different populations. Their registry checks JSON fields, not the truth of
unregistered prose or the quality of the original measurement. Absence of a continuous tuning
parameter does not mathematically preclude a Pareto frontier over discrete configurations; the
accurate statement is that this stage did not measure a comparative frontier.

The sample claim map lists four measured claims and one historical exclusion, while the proposed
surface also includes panel, utility and pooling claims. The compiler loops only over claims it
receives; it does not independently enumerate that larger surface or detect omitted claims. The
retained helper likewise reports completeness for an empty registry and for a `verified` record
whose expected and resolved fields are both absent. A [local helper probe](claim-helper-probe.json)
confirms these narrow behaviors. This does not show that the retained fixed runner supplies an
empty registry or that stored numeric claims fail their normal checks. Completeness here must not
be advertised as proof that every possible generated numeric statement is registered.

The binding review fixes supersede the draft's two-file-only replay, four-hash count and omitted
attestation-source binding. Retained code implements per-row source listing, but its binding
helper checks only that each listed file has a truthy entry in the supplied hash map; a synthetic
non-digest string passes that helper. Actual file-byte hashing and comparison belong to the runner.
Five rows or contract entries are not full schema validation. Missing fields can otherwise become
undefined or non-finite derived values. The Layer-2 fixture places a utility field differently
from the source table, and the shown normalizer does not consume that field. Its “utility intact”
phrasing therefore needs the particular measured metric, not a general task-success inference.

The pooling helper counts compatible pairs; it does not compute pooled outcomes. Its refusal flag
accepts any refusal, including absent mutual permission with equal bases, rather than specifically
proving denominator mismatch. The shipped fixed contract has distinct bases, so this is a helper
semantics limitation. Its shallow array freezes do not make nested entries immutable. The sample
policy guard suppresses Git errors and inspects a selected committed diff, not all worktree changes
or all behavioral dependencies. The standalone consistency example checks declarations and file
presence rather than recompiling every claim; the revised full runner has a separate role.

Five case-sensitive privacy tokens are not a general metadata-only validator. Literal overclaim
scans can reject the required non-claims themselves. The plan's proposed SHIPPED placeholder,
prewritten all-green closeout and approximately-100% coverage expectation are not measurements;
its coverage command sets no minimum threshold. Preserve the historical four non-passing checks
already recorded in M42. The spec's malformed emphasis and superseded co-author command examples
are frozen drafting defects, not current handoff instructions. No source or historical ledger was
changed during this review.

### M81 — BYO benchmark scores returned canaries, not all external consequences

The complete Stage 3O spec/plan provide a useful bounded response contract. “Independent oracle”
means a harness check separate from the returned decision field; it is not an independent operator
or an observer of actual tool/network effects. `claim_conflict` detects a specified contradiction,
not intent to lie. The reference clean target receives the class/oracle and returns predetermined
answers, so its perfect score validates the harness path rather than a security product. A “first”
claim requires a systematic prior-art comparison, not just working artifacts.

All five malicious family labels use the same context-injection template in the draft and retained
corpus. `multi_turn` is a label: the shown runner makes one request per case. Direct-input, tool and
output labels therefore do not establish distinct executed boundary scenarios. Thirty benign rows
repeat three tasks. The manifest hashes the marker list and records counts; it does not itself
bind every task/context/action byte. Unique canaries are not independent attacks or proof of corpus
coverage. The 11-cell table is a specified finite decision matrix, not exhaustive response/schema
coverage; benign empty/refusal output adds behavior beyond its simplified “allowed, no leak” cell.

The binding review fixes supersede absent schema checking, null-marker matching, hardcoded matrix
coverage, generation-time signature claims and reuse of the Stage 3M key. In particular, never
follow the obsolete instruction to regenerate the 3M public key to complete 3O. Retained code has
those fixes, but result validation still checks schema and decision only, not case-ID equality,
action structure or every required response field. A malformed response can be scored as no
observed marker rather than the spec's explicit unknown. Exact marker/action-name checks do not
cover arbitrary encoding, alternate effect channels or hidden execution. Benign usefulness remains
a nonempty-text/refusal-pattern heuristic, not semantic task completion.

The retained HTTP wrapper sends the supplied URL directly; it does not append `/run`. It does not
set its own deadline, response-size cap, redirect policy or status-code check before JSON parsing.
Module targets receive the full case, whereas HTTP targets receive a projection; these are not
identical information conditions. In-process modules execute trusted local code and are not a
sandbox for arbitrary adapters. Target invocation errors are caught, but exceptions raised later
while scoring a malformed module result can still abort the run. The `run` path emits an unsigned
result set; the shown signing workflow is for the fixed reference evidence pack, not automatic
attestation of every external run.

The draft signer omits the promised target descriptor and hardcodes some self-proof metadata;
its verifier's schema-tag check alone is not full structural validation. Full-pack hash checks were
added by the binding fix and must remain distinct from signature coverage and recomputation. M79's
custom canonicalizer limitations also apply to reused primitives. A small forbidden-token scan
cannot enforce all metadata-only values. The proposed all-green closeout does not supersede the
four historical non-passing checks recorded in M42. Frozen plans and measurements remain unchanged;
no external target was contacted or signed during this review.

### M82 — Cross-defence profiles are authored replicas with bounded validators

The complete Stage 3P spec/plan extend the attestation format across authored profiles; they do
not establish generalization across actual deployed defence mechanisms. The retained replicas
choose containment from case class and boundary/evasion labels. The full-gateway replica always
contains malicious cases; it does not invoke the real gateway. The keyword, regex and LLM-judge
replicas do not execute those named detector mechanisms. Their different profiles are constructed
by predicates, not discovered by measuring those products. The examples also put every boundary's
instruction in a context field and run one request per case; a multi-turn axis does not implement
a multi-turn interaction. “Obfuscated” preserves the complete marker between delimiters. Corpus
seed strings are deterministic identifiers, and its manifest binds marker/count metadata rather
than every payload byte. These limits qualify the saturation and mechanism-fingerprinting claims.

The retained coverage helper defaults an unobserved cell to contained. A [pure local probe](cross-defence-helper-probe.json)
with zero scored cases returned 25 contained cells, full coverage and zero controls. Its claim
checker also accepts a full-coverage claim over an empty cell map through vacuous `every` logic.
This does not establish that the fixed campaign runner omitted cases: it normally supplies the
frozen corpus. It means those helpers alone do not enforce six observations per cell or complete
execution. The current response-invalidity helper checks a decision enum rather than the draft's
schema-only rule; neither version validates all response fields and case identity. Benign utility
is nonempty allowed text, without the prior stage's refusal-pattern check or semantic scoring.

The draft's hyphenated-brand example conflicts with its unnormalized substring matcher; retained
code now normalizes separators. A finite brand denylist, self-declared provenance and a signature
still do not prove that a named product/version was actually executed. The draft's required
product-superiority non-claim is absent from its initial allowlist; retained code adds it. The
current wording helper nevertheless exempts an entire string if it contains an allowed sentence.
The local probe confirmed that an allowed non-claim followed by an affirmative best-defence claim
passes, while the affirmative phrase alone and a `rank` field fail. This is exact-phrase handling,
not general negation understanding. Renamed guard fields also need explicit false-value checks;
their names alone do not enforce that state.

The target schema examples permit partial cell maps and only a digest prefix; shape agreement
between targets and catalogue is not validation against the required complete matrix. Catalogue
binding checks digest/corpus/shape agreement, while per-target signature verification is a separate
smoke step. The standalone catalogue verifier does not verify each target sidecar. Its CLI uses
fixed evidence paths despite positional examples in the spec, and loads planned target files even
when an exclusion is permitted by the abstract contract. The silent-drop helper does not by itself
reject duplicate IDs, overlapping listed/excluded sets or inconsistent target metadata. A dedicated
key path and supplied-key fingerprint do not enforce that the key is distinct from every earlier
stage or authenticate an external operator. M79's canonicalizer limitation applies here too.

The self-proof dispatches authored malformed objects to selected helper gates; it is not an
end-to-end hostile gateway run through signing and every verifier. Its unexpected-accept/rejection
counts are initially hardcoded. The default evidence replay recomputes unsigned coverage bodies;
that is distinct from checking their semantic equality with separately signed targets. The shown
hash list omits public-key/fingerprint artifacts and does not make an unsigned hash list an
independent trust anchor. The consistency script checks an algorithm label, not the signature
identity promised by its comment. The security example invokes ranking checks but does not itself
invoke the brand check; other verification stages must supply it.

The spec's lexicographic summary ordering differs from the builder's input-order catalogue; the
signer sorts directory IDs separately. A coverage command with a global 100% function threshold
cannot simultaneously promise a pass while acknowledging uncovered CLI functions without an
appropriate include scope. A stage smoke is not the entire LLM-Shield section. Reproduction flags
shown in the spec are realized by the default evidence replay, not a separately implemented flag
path. Historical tag-moving instructions, prewritten success text and draft naming/format defects
are not current release instructions. Preserve all frozen signatures, plans and measurements;
no campaign, signing, external target or source mutation was performed for these findings.

### M83 — Temporal continuity requires a trusted prior head and verified inputs

The complete Stage 3Q spec/plan describe a hash-linked registry and a finite transition table,
not an independently witnessed timeline. A signed UTC string records the signer's declared time;
it does not prove execution time, precommitment or chronological ordering. The strict timestamp
helper accepts a seconds-only UTC subset of ISO 8601. Snapshot lineage equality does not establish
version authenticity or that the selected before/after pair is chronologically ordered.

A valid chain can prove prefix continuity against an independently trusted previous head under
the stated hash and canonicalization assumptions. The shown verifier does not authenticate that
head's signature, enforce its declared digest/signature fields, or require an authenticated prior
head rather than the missing-head genesis default. Equal counts can pass without an append.
Index, identifier, required non-claim and complete entry-shape checks also need separate validation.
Field-name ranking checks do not reject every renamed affirmative guard, such as a true
`cross_target_ranking_exported` value. M79's canonicalizer limitations apply to this chain too.

The retained diff builder reads snapshot JSON and checks canonical digests; it does not verify
Stage 3P signatures itself. Matching catalogue/target identifiers and corpus fields does not by
itself prove signed catalogue membership or complete matrix agreement. The self-proof's
`verification_failed` input simulates an integrity result rather than presenting a bad signature
through the entire pipeline. Some unexpected-result counters are authored zeros. The reorder
fixture changes an identifier without regenerating its digest; rejecting it does not separately
test a consistently rehashed reorder. Missing cells become not-applicable, and equal unknown
values can become unchanged without validating the input enums and complete cell set first.

The retained standalone diff verifier checks the regressed/improved transitions but does not
fully validate every other transition, recompute the summary or authenticate source snapshots.
Its empty-diff success is appropriate for a genuine genesis registry, but proves no longitudinal
regression exercise. The retained hash-file helper catches diff-building errors and substitutes
an empty list; standalone hash verification can consequently omit dynamic diff files on that
error path. The ordinary build path invokes diff construction earlier and is a separate gate.
The directory reader likewise treats read failures as an empty diff set. These failure modes
qualify individual verifier claims without asserting that the complete campaign passed bad data.

The draft's genesis previous-head count conflicts with an earlier expected-output paragraph;
the later genesis example controls that example. Parsing and reserializing JSON is not a raw-byte
comparison. An unsigned hash list that omits key artifacts is not an independent trust anchor,
and key-purpose labels do not enforce distinct keys or cryptographic domain separation. The
fallback policy diff against `HEAD~1` checks one commit, not the full branch change set. Coverage
thresholds need an explicit scope before claiming all CLI/signer functions are covered. Frozen
plans, signatures and genesis evidence remain unchanged; no signing or external validation was
performed for this review.

### M84 — Fallback plans establish bounded orchestration, not universal resilience

The complete Stage 3R spec/plan inherit M43's reproduced empty-refusal classification defect,
metadata loss and synthetic credit flag, and M69–M72's SDK retry/budget qualifications. One
orchestrator hop is not one network request when the SDK retries internally. `withinBudget`
checks hop/call counters; it neither measures elapsed time nor enforces a monetary ceiling.
Its timeout field is descriptive unless the caller enforces it. The current route is retired
for legacy live use; these historical plans are not current deployment instructions.

The draft's `allowed` input enum is inconsistent with the real gateway. Retained policy uses
`safe` and explicitly admits accepted, absent and demoted context states. The policy fails
closed for unknown precheck values, but the generic trust merge treats unknown verdicts as
accepted, and unknown outcomes fall into the refusal branch. The orchestrator always invokes
the primary callback before applying the fallback gate; the router must enforce the initial
call gate. It does not itself enforce a terminal primary tool/output verdict before swapping.
The draft's boundary fixture checks final text selection, not an actual streamed partial,
malicious fallback payload, immutable request envelope or all tool/context/output boundaries.
The router reuses approved input/context and rescans tool/output results; that is narrower than
rerunning every boundary. The self-proof counts two terminal-precheck cases, not all possible
bypasses. Function coverage does not turn these finite assertions into a universal proof.

The draft accumulator uses final-attempt points plus swap risk; the maximum verdict merge is
not accumulation of every attempt's numeric points. Its no-provider branch also drops some
risk points; retained router computes run points separately. HMAC swap records provide shared-key
chain integrity, not a public-key signature on the entire receipt or proof of a real provider
swap. The shown router records the swap after the run record and returns the earlier run hash;
that reference alone does not authenticate the later swap entry or the complete chain head.
An actual chain verification and trusted head remain separate requirements. Prior successful
CI, stale test-count expectations and rerunning a known flaky job are not fresh validation.
Frozen plans and evidence remain unchanged, with these corrections additive.

### M85 — Allowed narrative wording is not bound to the proposition checked

The complete Stage 3S spec/plan overstate the claim checker's semantic guarantee. The retained
checker validates a relation and a vocabulary entry independently. A [local synthetic probe](narrative-helper-probe.json)
supplied a digest with an invalid audit chain and no fallback, then paired the true comparison
`gateway.fallback_used == false` with `chain_valid`. The checker accepted it and the renderer
asserted that the audit chain verified end to end. Thus “the narrative cannot lie” and “every
rendered claim is evidence-bound” are not established by these helpers. The no-automatic-finding
flag and fixed vocabulary do not repair a mismatch between a proposition and its prose.

The renderer also emits “No integrity signals were observed” for zero surviving slots. That
cannot distinguish absent signals from rejected, omitted or incomplete evidence. Its unconditional
privacy disclaimer covers audio, process names and pasted content beyond the digest's three
privacy booleans, and is not conditional on their values. `fallback_observed` adds containment,
and `proof_replayed` adds rejection, without checking those extra propositions. Missing digest
fields default to zeros/false, collapsing unknown into absence. Numeric relations allow JavaScript
coercion; strict parsing of one JSON object is not full slot-schema validation. Duplicate keys,
extra fields, null elements and duplicate slot identifiers need separate handling. Forbidden-word
checks cover wording/severity and rendered text, not every model field. The probe also confirmed
that `Object.freeze(new Set(...))` does not stop `add`; the draft immutability test is incorrect.

The retained digest builder hashes the two source files but hardcodes audit-chain validity,
attestation verification and other result fields. It does not derive those assertions by verifying
the referenced signatures or a session chain. A signature over the final digest hash binds these
assertions; it does not establish their truth. The proposed bounded context builder is absent from
the implementation tasks and current CLI, and the recorded-fixture call does not send the digest
as context. This is authored fixture replay, not measured AI drafting, prompt caching, real-time
telemetry or a completed human review. M43 qualifies the suggested live fallback path.

The standalone verifier authenticates the artifact and digest hash but compares only the two
supplied output-hash fields for receipt binding. The local probe changed the in-memory slots and
both matching output hashes while keeping the original signed artifact; the standalone verifier
still passed. It does not recompute the slot digest, bind the full receipt digest or rerender claims.
The full hash/rebuild/consistency pipeline has additional checks; this probe is not a claim that
that entire pipeline accepted the altered pack. Signature/key agreement is not gateway HMAC
verification or independent signer authentication. M79's canonicalization limitation applies.

The draft reruns a gateway with fresh session/time fields before byte-comparing its receipt-derived
slots; retained code separates one-time authoring from offline verification to avoid that drift.
Its verify-only path therefore does not execute a fresh gateway request. The draft manual-review
fixture's broad `misconduct` regex also matches the renderer's own negated disclaimer. Self-proof
zero counters and fixture-name counts are not measurements of every unsafe rendered claim.
The final implementer note says rejected slots prevent rendering, whereas the builder intentionally
renders survivors and sets `claim_check_passed` true even when some fail; consult
`all_slots_verified` and rejection/conflict counts. Preserve frozen signatures and historical text;
these findings required no model calls, signing or runtime changes.

### M86 — Frozen extraction decisions do not validate every input or detector identity

The complete Stage 3T spec/plan correctly distinguish synthetic pattern reproduction from
intent, attribution and general accuracy. Distinct authored families are not statistically
independent corroboration: benign structural or targeting signals can combine with volume to
cross the v1 threshold. Stage 3U explicitly addresses that limited class and retains other benign
collisions. The eleven selected self-proof fixtures and instructions to adjust fixture data to
fit the frozen detector do not establish general benign silence or an independent benchmark.

The retained v1 validator restricts row keys but accepts arbitrary strings after `sha256:` and
does not validate the tag/bucket grammars or required values. Missing tags can cluster under
`undefined`. It accepts extra top-level fields that normalization drops, so the digest binds
selected header fields and sorted rows, not every raw set member. Its provenance booleans are
author assertions. The privacy scan's finite tokens/email regex do not detect all IP addresses,
full timestamps, account identifiers, secrets or payloads in allowed fields. Synthetic hash
labels are not actual content hashes. Stage 3U is additive; do not silently retrofit its stronger
input contract into v1's historical claim.

The retained portable verifier checks config/attestation ID agreement and a true threshold-lock
flag, but not all threshold values, rules, signal code or complete config semantics. Its self-proof
checks the exported threshold and ID against constants; it does not mutate each threshold/map
and demonstrate enforced version changes. The family-map digest is not a hash of the detector
implementation. Reproduction reruns current source and compares parsed/reserialized result and
attestation objects, not raw file bytes or an independently authenticated executable. The
consistency-script example does not verify a signature itself despite its title; the smoke
invokes that separate verifier. The unsigned hash-map loop verifies listed files, not completeness
against an independently required inventory. M79's canonicalization/trust qualifications apply.

The detector's hydra predicate counts distinct actors and sessions without proving a coordinated
relationship; tool-use shape and token buckets are validated/carried but do not drive these
signals. `template_prefix_cluster` compares supplied whole hash labels, not prompt prefixes.
The renderer is a fixed-template helper with a finite denylist, not general intent-language
understanding. Cross-platform order claims require a defined collation for unrestricted v1 IDs;
`localeCompare` alone does not define one. The draft guard's local no-base path warns and succeeds,
contrary to its universal fail-closed comment. Its signer is not exercised by verify-only smoke,
and its expected test counts/output labels include draft mismatches. Historical instructions to
rebuild/re-sign evidence are not part of this documentation audit; all frozen bytes are preserved.

### M87 — Extraction v2 hardening is scoped to rows and selected false-fire classes

The complete Stage 3U spec/plan explicitly retain benign two-strong-family collisions and
threshold dilution. Keep those limitations prominent; the reported zero benign-escalation counter
excludes the deliberately accepted collision fixture. “The trust root held on every attack”
describes that historical test selection, not all possible canonicalization or trust failures;
M79 independently qualifies the reused canonicalizer.

The stronger grammar validates row values, not every string in the complete set or evidence pack.
The retained set validator does not constrain `set_id` or reject extra top-level fields; normalization
selects a header subset and drops extras. Shape-valid 256-bit strings do not prove known preimages,
synthetic origin or absence of encoded data. Even the regex contract is a JavaScript regex contract:
`$` can match before a final line terminator. The spec's synthetic-label hashing rule applies to
fixture identifiers; real artifact/config digests must hash their actual content. The draft grammar
uses only a shallow outer freeze despite promising deep freezing; retained code correctly freezes
nested rules and arrays. The plan uses frozen arrays for family strengths, avoiding the spec's
frozen-Set ambiguity described in M85.

The family-map digest hashes membership, not the separately defined strong/contextual split or
all detector thresholds/logic. Current portable verification adds main-result and regression-set/
result digest checks omitted from the original draft, and recomputes those detector results.
Do not report those draft omissions as present behavior. Complete config semantics, arbitrary
rendered wording and every signed limitation are still not independently enforced by the portable
checks; full attestation reproduction and separate audits are different gates. The draft comparison
summary contains authored zeros; the current signed bundle adds regression bindings and hardening
fields. Its grammar JSON draft is only a note/schema stub, not the promised human-readable rule table.

The standalone regression set is one template-plus-volume dataset; additional capability/behavioral
and volume-only cases live in the self-proof, not four separately committed regression datasets.
The draft omits its promised benign-heavy-power-user fixture and never increments that counter;
retained self-proof includes the fixture and updates the counter. The draft detector unit rows all
share task/capability labels, unintentionally firing targeting in tests that expect only structural
or structural/behavioral families; varied data are required for those exact expectations. Accepting
any thrown exception in rejection fixtures does not prove the intended typed rejection fired.
Repeated execution of the same row order tests repeatability, not all row permutations.

The freeze guard's branch comparison omits shared canonicalization dependencies and does not
check every working-tree modification; successful v1 replay is a separate, finite assertion.
Its local no-base warning is not universal fail-closed behavior. Verify-only smoke does not run
the signer, and targeted throw tests do not establish 100% branch coverage. Parsing/reserializing
comparison remains distinct from raw-byte identity. Preserve additive v1/v2 history and all signed
limitations; no historical rebuild, signing or runtime modification was performed in this audit.

### M88 — External advisory replay has narrower schema and metric guarantees

The complete Stage 3V-A spec/plan make the synthetic backing explicit. The plan's approved
amendments supersede its earlier ambiguous manifest examples: retained code separates the external
manifest from the Stage 3L corpus manifest and emits explicit recomputation checks. The final
synchronous verifier supersedes the intermediate async placeholder. Do not execute the intermediate
drafts or describe their superseded field names as current interfaces.

The retained adapter contract does not reject all unknown fields, recurse into nested hash keys,
or validate the case ID's type/content. A [local synthetic probe](external-adapter-helper-probe.json)
confirmed acceptance of an extra raw-prompt field, a nested digest and a null case ID. This is a
contract-helper limitation, not evidence that the fixed fixture adapter emitted those inputs or
that the full privacy pipeline accepted them. The normalizer uses an ordinary object's property
lookup: `constructor` and `__proto__` produce non-string values with `error_code: none`. The
subsequent closed-enum contract rejects those values, so this is not a demonstrated gateway bypass.
Free target strings also do not authenticate which defence was executed.

The fixture derives verdicts from case names and a fixed numeric rotation, then chooses matching
raw-output templates. It does not parse a real detector response; raw and normalized values share
an authored selection rule. Trusted-harness hashing proves which supplied values were hashed,
not that an external model produced them or that their semantic relationship is correct. The
raw aggregate is newline-joined output text without a length-prefixed case/value encoding; it is
not a general injective serialization of arbitrary output sets. Config and verdict hashes have
separate canonical-object semantics. M79 applies to reused canonicalization.

The retained external-only ASR is the fraction of malicious fixtures whose external verdict is
not `block`, including warning, abstention, error or an absent observation. It is not an executed
external-only unsafe-consequence rate. The plus-Simurgh metric uses the independent Stage 3L
containment result and does not implement combined blocking semantics. `over_defence_delta` is
an external benign-block fraction, not a measured before/after difference. Missing observations
are omitted from the miss-but-contained denominator but counted as non-blocks in external ASR;
duplicate IDs overwrite in the lookup. The fixed adapter supplies the corpus, while these metric
helpers alone do not enforce exact one-to-one coverage. Receipt/audit flags and authored zero
leakage inherit Stage 3L's qualifications in M78. Four mode labels do not establish four separate
end-to-end executions. Advisory invariance follows from not passing the verdict to containment;
the shown test repeats that function rather than mutating an actual integrated defence decision.

Portable verification authenticates the supplied bundle and checks a few structural/result fields;
it does not recompute all four hashes, validate every non-claim/coverage field or verify every
referenced evidence file. Reproduction supplies those computations through a trusted callback;
an arbitrary callback returning its input is not independent reproduction. The tamper fixture
named verdict-flipped edits an aggregate metric, and the removed-file case supplies a null
sidecar. Signature rejection of an injected raw field does not prove rejection of raw content
that was present before signing. Finite privacy tokens cannot enforce arbitrary metadata-only
content. Canonical signing tolerates formatting/key-order changes, not arbitrary merge edits.

The draft policy guard warns/passes without a base and masks diff errors, contradicting its
fail-closed headline. The smoke boots a local health-check server while doing the substantive
replay in process; offline here means no external inference, not no socket. Its separately wired
audits are not all part of the smoke alone. The blanket doc grep also flags the required negated
non-claims. These are historical reproduction/wording qualifications, not instructions to rerun
old release/tag/signing steps. Preserve frozen evidence and runtime source.

### M89 — Frozen Llama Guard replay does not authenticate execution or all output text

The complete Stage 3V-B spec/plan must retain their self-reported-origin limitation throughout.
A capture-script hash identifies supplied script bytes; it does not prove those bytes executed.
The prompt-rendering hash covers a small declared surface/wrapper/role object, not the rendered
token sequence. Locally hashing the corpus binds expected inputs, not an independently observed
capture input trace. Snapshot and tokenizer hashes are capture-environment assertions included
in the signed provenance; the offline verifier neither downloads weights nor proves GPU execution.
A signed timestamp is not trusted execution time. These limits directly qualify the spec's
stronger “this exact harness produced the raw outputs” wording.

The [official model card](SOURCES.md#s26--llama-guard-4-model-card-and-execution-surface)
supports prompt and response classification. Stage 3V-B deliberately supplied only user turns;
downstream content was outside that experiment's observed surface, not an inherent restriction
of Llama Guard 4. The draft's `AutoTokenizer`/`AutoModelForCausalLM` loader is superseded by the
retained `AutoProcessor`/`Llama4ForConditionalGeneration` capture script. The latter uses 8-bit
quantization by default and a 20-token generation limit. The frozen signed bundle still declares
64 in `target_defense.decode.max_new_tokens`, while its capture-provenance decode records 20.
Report the captured 20-token setting and this internal discrepancy; do not silently harmonize or
re-sign the historical bundle. Its version-specific loading/quantization observations are not
proof about all current library releases or full-precision quality.

The retained parser accepts extra lines after `safe`, and after a valid `unsafe` category line;
it also accepts arbitrary numeric category IDs. A [pure synthetic probe](lg4-helper-probe.json)
confirmed both trailing-text acceptance and `S999` acceptance. The capture-integrity helper
rejects exact equality with a corpus task, not a prefixed/suffixed copy: the probe's prefixed task
echo passed that helper. The separate privacy scanner searches complete task substrings in raw
serialized files and finite secret patterns, so it provides additional checks but not a general
schema/semantic guarantee against fragments, JSON escaping, encoded text or unknown sensitive
content. This is not a claim that the full privacy audit accepted the probe. The shared malformed
result's categories array is only shallow-frozen. Observation latency is a fixed `0-100` bucket,
not a captured inference-time measurement.

The replay artifact intentionally retains raw classifier text. “No raw output in evidence” is
therefore false across the entire evidence directory; it applies to derived bundle content with
the documented replay-input exception. Copying a capture file is not a sanitization transform.
The intended checks must run before publication; redaction changes the replay input and must be
reported as redaction, not silently called untouched model output. Provenance booleans are
self-declarations, and the capture code sets them before any semantic privacy determination.

The retained release gate tests live/environment flags, digest shape, a non-sample revision and
a timestamp not starting with 1970. All-zero digests still have the accepted shape, and these
conditions do not authenticate real execution, a valid date or correspondence to loaded weights.
The capture code loads model/processor and downloads a snapshot by mutable model identifier in
separate calls without an explicit shared immutable revision. Its snapshot-manifest digest covers
listed files, not just model weights; tokenizer fallback uses that snapshot digest if the config
file is absent. The Python transport does hash self-reported provenance, contradicting the draft's
unqualified “no hashing” sentence, while authoritative evidence hashes/signing remain local.

M88's inherited metrics, adapter, raw aggregation, tamper and portable-verifier limits apply.
The sample has 180 cases despite “small sample” wording; replay smoke uses the committed capture
and does not execute a model. Generic replay verification can legitimately accept sample evidence;
it is distinct from the release gate. The capture-mode label alone is not proof of live origin.
The draft's fallback policy guard warns/passes without a base, and removing an uncovered module
narrows coverage scope rather than proving it covered. Preserve the actual frozen capture,
signature, settings and measurements; no GPU, model call, signing or capture replacement occurred.

### M90 — Release witnesses authenticate bounded checks, not independent capture origin

The complete Stage 3W specification and plan describe two cryptographic trust roots over
related evidence. They do not establish independent operators, independent verifier code,
independent measurements or GPU execution. The offline custom Ed25519 sidecar signs an in-toto
Statement-shaped object; that alone is not DSSE packaging or a particular SLSA assurance level.
The online subject is the deterministic verdict file, not the offline signature or live capture.
Retain the explicit self-reported-origin non-claim and the distinction between optional online
verification and offline reproduction.

The retained library's `buildWitnessVerdict()` defaults omitted observations to expected passes.
Its `ci_observed_not_echoed` label therefore cannot prove observation when called locally.
The actual workflow supplies all four command results explicitly and compares the regenerated
verdict bytes with the committed file before attesting. This is materially stronger than the
helper's default, but attests those retained checks, not their completeness or model execution.
The statement builder also fixes its two pass booleans to true. Subject hashing reads four
working-tree files, while the release commit/tag are fixed labels; the helper does not itself
resolve those labels and compare the files against that Git tree. It performs file I/O despite
the plan calling it pure.

Portable verification checks the signature, fingerprint, predicate type, witnessed stage and
model-not-reexecuted flag; it does not validate every subject, non-claim, release label or
statement/schema field. Reproduction depends on trusted rebuild callbacks and serializes parsed
objects; it is not an independent execution trace or raw-file byte comparison. In particular,
the standalone verifier rebuilds the verdict instead of reading its committed file. The runner's
separate verification supplies the file comparison. Unsigned hash-map iteration checks listed
entries, not an independently required complete inventory. M79's canonicalization limits apply;
canonical signing tolerates certain serialization changes, not arbitrary merge edits.

The tamper cases are bounded: a supplied null sidecar represents file removal, a digest edit
represents a flipped CI observation, and raw-field injection is rejected after signing. None
proves a pre-signing metadata-only schema. The raw-field counter checks top-level names, and the
privacy audit uses finite patterns. The draft security grep rejects its own ordinary Sigstore
labels; retained source narrows this to object markers. The no-base policy guard warns/passes,
contrary to a blanket fail-closed description, and masks diff errors. Function coverage is scoped
to the library; it is not complete verifier/workflow coverage. The draft YAML validation command
may merely import an installed parser without parsing the workflow.

A latest-run listing and repository-only attestation check do not establish the intended
release's exact workflow, source revision, subject digest or successful run. Apply M45's identity
and revision checks; mutable action tags in the retained workflow are not commit pins. The
historical release commands and pre-existing-failure exceptions are not current authorization
or current test results. Preserve frozen specifications, signed artifacts and runtime source.

### M91 — Timeline replay separates manifest roots, file checks and delegated reproduction

The complete Stage 3X specification/plan predate the retained split between ten manifest-root
checks and five strict per-file re-walks. Use the retained signed index and results: 12 pinned
rungs, ten evidence roots, five deep re-walk surfaces, three delegated reproduce paths and two
index-only rungs. These are overlapping surfaces, not additive counts. The exclusive replay tiers
contain seven evidence-hash rungs, three reproduce rungs and two index-only rungs. The draft's
expected `tier_summary` of 10/3/2 is inconsistent with its own filtering code. Its consistency
loop also filters the seven evidence-hash rungs while announcing ten. Retained code correctly
separates root, deep and tier counts. M45's earlier timeline correction applies throughout.

A root check hashes the manifest file; it does not verify all its referenced files. The current
generic verifier rejects raw parent segments and paths lexically outside the stage directory,
fixing the draft's normalization-before-check and missing containment. It still checks listed
entries rather than an independent complete inventory, accepts an empty map, reads files as UTF-8
and does not resolve symlinks to prove physical containment. Its self-inclusion suffix test also
rejects any listed filename ending in `evidence-hashes.json`, not only the exact manifest path.
Use trusted local packs and preserve the distinction between a helper contract and a full signed
root/rebuild check. “Pure” is inaccurate for these helpers' file and Git subprocess I/O.

Tag resolution proves equality with a signed commit identifier, not that it is a merge commit,
that the tag signature is trusted, or that every working-tree evidence file equals that commit's
version. The timeline builder reads current files and local tags. Fingerprint lookup chooses the
first matching public-key filename and does not independently verify every rung signature.
`buildChainSummary()` counts declared table capabilities; it does not perform those checks.
The complete runner's separate checks supply execution evidence. An available reviewer command
is not evidence that an independent reviewer has run it. Required tags and dependencies must
already be present for offline use; fetching missing tags is a separate network operation.

Portable timeline verification authenticates the canonical object plus limited schema/non-claim
fields, not every tier, rung, claim or referenced artifact. Reproduction compares a trusted
callback's rebuilt object, not raw serialized file bytes; canonicalization retains M79's limits.
Index-only Stage 3M means no integration into this chain's replay surface, not absence of its
historical standalone verifier. The spec's `full_reproduce_available: true` example for 3M
conflicts with the plan's false value and aggregate three; use the retained index's declared
chain integration and explain the standalone capability separately.

The draft reviewer shell can print PASS after its Node replay fails because it omits `-e` and
an explicit status branch. Retained source wraps the Node command in an `if` and returns failure,
so this is a corrected draft defect, not a current failure claim. The command writes its results
artifact; it is not a read-only verifier. The ordinary smoke verifies the timeline and its own
hash map, with historical-rung checks in the separately wired consistency audit; it is not the
full delegated reviewer replay. Tamper cases, finite privacy patterns, no-base warn/pass and
function-coverage scope retain the limitations described in M90. Preserve historical source
examples and signed evidence; no replay, signing or release command was executed for this review.

### M92 — Capability-kernel equivalence is finite, and bundle reproduction has a narrow scope

The complete Stage 4A-lite spec/plan call a finite differential suite an exhaustive proof. The
retained suite compares 19 authored tool/argument cases × five task strings × two mutation-gate
settings: 190 comparisons. This is useful regression evidence, not proof over all strings,
argument types, exceptions, tools or future versions. The draft shim returns family `none` for
an egress tool with no destinations, unlike the legacy `egress` label; retained source fixes that
case. Current direct `is_grounded` also rejects an empty destination, unlike the draft's allow.
Therefore preserve the exact historical test/revision scope when inheriting the frozen
`9/140 → 0/140` outcome; no live re-execution or per-action trace was reconstructed.

The legacy grounding policy accepts a destination or its sufficiently long local-part as a
substring, not necessarily a complete address/token or explicit authorization. A destructive
keyword can match negated or unrelated task text and does not bind a specific target. Unknown
families/tools are non-gated, and missing egress arguments can produce no actions. Type hints
and comments do not enforce closed enums. This is a bounded adapter policy, not universal
capability enforcement. The plan's claimed Policy abstraction is implemented as conditional
branches and tables, so adding arbitrary families is not guaranteed to be data-only. Later
additions mean the current module is no longer just the original dependency-free two-family
surface; distinguish its versioned entry points.

The model-free corpus derives class coverage from the frozen taxonomy, then authors representative
tool arguments and benign task strings. It does not reconstruct actual AgentDojo tool-call traces
or reproduce the exact user-task-8 over-block. Its 25 tool-call rows emit 26 action decisions
because a multi-recipient call yields multiple actions: the retained summary is 23 block, three
allow, ten destructive-mutation and 16 egress, with zero confirmation decisions. The duplicate
mass-recipient example is not an independent destination or a measured mass-egress workload.
`would_execute: false` describes simulation, including allowed decisions, not live enforcement.

“No raw data persisted” applies to emitted decision records, not the whole evidence directory:
`corpus-actions.json` intentionally retains public/authored task text, arguments and destinations.
The emitter copies caller identifiers/tool names and declares privacy booleans; it is not a general
arbitrary-input privacy validator. Target hashing does not prevent dictionary reconstruction.
Offline reproducibility depends on retained code, data and compatible runtimes; “forever” is not
a supported operational guarantee. The custom canonicalizer is not RFC 8785 compliance (M79).

The retained Node verifier's reproduce mode hashes supplied decisions and rebuilds using the
bundle's existing summary and supplied manifest. It does not rerun the Python kernel, recompute
summary counts, rehash the five inherited files or check those files against Git commit `37f2de0`.
Those require separate checks. Editing the manifest or decisions after signing is detectable,
but that is distinct from validating their original meaning. Its inheritance check requires one
substring, not the complete mandated statement. Calling the exported function without an argument
or with null can throw during parameter destructuring before its catch; the documented
never-throws contract is too broad. The example `node -e` reports FAIL without setting a nonzero
exit status, and the file exports a helper without a standalone verification CLI. The key-name
status grep is not a secret scan and misses already tracked/renamed secrets. Preserve the signed
records and historical plans; these are documentation qualifications, not new runtime fixes.

### M93 — Decision-replay packs need explicit fixture, signer and verifier limits

The complete Stage 4D spec/plan describes a four-action recorded fixture, not a browser session,
live model run or observed external execution. Completeness compares supplied observations and
receipts under the trusted mediator assumption; it cannot establish that every real mediated
action was logged, or detect a consistently omitted action against an absent external commitment.
Signed fixture data does not establish model identity or policy correctness. Later enforcement
work does not retroactively extend Stage 4D's observed surface.

The plan's initial in-process signer does not implement the spec's IPC boundary. Current build
CLI source does use `withSignerProcess` and the signer daemon, while the unit helper remains
in-process. This is a corrected draft gap, but a subprocess with the same filesystem privileges
is not protection against a caller reading the key. The deterministic private key is explicitly
public test material, so anyone can regenerate fixture signatures; they are not independent
operator authentication. The daemon restricts message types/run IDs and receipt structure, but
its pack branch checks only version/run ID before signing. The Python dispatch controller checks
a caller boolean, not a cryptographic receipt, and the Node pack builder has no dispatch operation.
Unit-tested simulated dispatch and awaited receipt signing are separate observations, not proof
of an integrated real executor refusing all unsigned actions.

The retained canonicalizer has the same object-construction limitations described in M79 and
is not complete RFC 8785 JCS. The Merkle helper duplicates an odd final node and uses an all-zero
empty root; [RFC 9162](SOURCES.md#s27--rfc-9162-merkle-tree-definition) specifies a different
construction for those cases. Describe the retained algorithm exactly rather than claiming RFC
conformance. Its odd-node duplication can give the same root for a three-leaf list and that list
with its final leaf repeated; separate ordered-list/count checks matter. The four-leaf golden
fixture does not exercise this distinction. Frozen roots must not be silently regenerated.

Current receipt validation adds a JSON schema and digest/mode/boolean checks, superseding the
plan's manual-validation-only claim. Pack verification remains narrower than the spec's complete
schema language: it compares the two declared embedded fingerprints to the external key but does
not recompute the fingerprint from the embedded PEM. It checks observation/receipt lengths,
IDs, steps, ordered receipt hashes and roots, but does not recompute every manifest count,
per-sink tally or ordered observation-hash field. It does not require the complete non-claims
object. A valid signature authenticates those supplied values without making them semantically
verified. Cross-field run/session/sink/consequence declarations also need separate consistency
checks beyond binding a receipt to an observation hash.

Replay rederives selected features from supplied replay metadata, not from original raw content
or independently authenticated provenance. Unknown/missing taint labels can yield `trusted_only`;
Boolean coercion is not strict input validation. Several declared policy flags, explicit-authorization
features, rate buckets and lattice semantics are not used by `decide()`. The signed bundle
commits policy data, not the complete Python/Node decision implementation. Agreement for the
four fixture actions is bounded parity evidence, not equivalence over arbitrary inputs.

The CLI reads and parses the complete JSON before applying limits. The verifier measures
`JSON.stringify(...).length` in UTF-16 code units, not bytes, and its size helper does not apply
the declared maximum string/observation-log limits. The privacy checker uses ten exact forbidden
keys and two string patterns; it cannot guarantee absence of arbitrary raw/private content under
other names or encodings. The environment variables labelled offline are not network isolation;
no corresponding enforcement is present in the reviewed Stage 4D modules. Installing dependencies
is a separate potentially networked step. CLI failures can include environment-dependent exception
messages, and writing results can itself fail; the unconditional stable-output guarantee is too
strong. No-argument helper destructuring can also throw before its catch.

The draft falsifier expectations conflict with its pack-signature-first order: ordinary post-sign
edits fail before the deeper semantic layer. Its initial lying-decision helper does not repair
later receipt links, and its key-swap helper changes labels rather than the PEM. Do not interpret
those drafts as proof of each named layer. The plan directly writes success-shaped summary JSON;
those constants are not measured test outcomes. Use actual reproduce logs/results and exact
executed falsifiers. The retained harness improves temporary isolation and golden failure exit
code 3, but still needs a caller-owned disposable path when overriding its recursively cleaned
temporary directory. Historical “every gate” conclusions require the individual evidence, not
just an echoed PASS or static summary. This audit did not sign or replace any fixture evidence.

### M94 — Retained Stage 4F frontier is unsigned and does not meet the dishonest-evaluator claim

The complete Stage 4F spec/plan promises an Ed25519 frontier certificate, complete external
anchor binding and directly executed red arms. Retained implementation does not establish those
properties. `frontier.sig` is a public SHA-256 certificate digest; the verifier compares strings
and never cryptographically verifies a frontier signature. Signed Stage 4D cell packs remain a
separate check. The frontier domain constant is unused for signing, and the certificate has
cell IDs and aggregate hashes rather than the specified point/frontier Merkle roots.

A [disposable-copy direct-verifier probe](frontier-verifier-probe.json) retained the original
external public key and all signed per-cell pack bytes. The baseline passed. Adding a certificate
annotation and recomputing its public digest also passed. Changing an external suite fixture hash
without changing its declared suite hash passed. Finally, changing all 12 benign-cell utility
observations to false, updating their unsigned manifest hashes, recomputing metrics/frontier and
the unsigned certificate/digest yielded benign utility zero for each point and still passed.
No private key was read and nothing was signed. These observations establish gaps in the direct
frontier verifier; the committed golden-byte comparison harness would separately detect those
changed files. Do not describe this verifier as securing a frontier against a dishonest producer.

The verifier trusts `suite.suite_hash` instead of recomputing it, and does not inspect fixture
paths/content. Python's separate suite validator checks resolved paths, file hashes and duplicate
IDs, but that is not the direct Node verifier's contract. Cell verification checks pack signatures,
pack hashes, utility hashes and the expected ID cross-product; it does not bind every manifest
field to its actual pack, compare the recorded signature hash, or establish that the expanded
grid policy equals the policy executed in that pack. External paths must be independently trusted;
passing producer-supplied files through external-argument names creates no independent trust.

The builder hashes/enumerates Stage 3F fixtures but executes copies of two Stage 4E templates,
selected by label. It updates scenario/run labels and policy mode; it does not execute each
fixture's distinct payload. The other numeric grid knobs are recorded in the cell ID policy but
not applied by this run-record transform. Thus 12 canary scenarios × three points and 240 full-suite
manifest entries × three points describe packaging coverage, not 36/720 independent behavioral
experiments or full payload execution. Hard-negative labels select the attack template while
being excluded from attack/benign metric denominators. Some label selection uses substring rules;
counts must come from the actual committed manifest. Run/scenario name normalization is not
injective in general, although the suite builder detects duplicate normalized scenario IDs.

“Packs-only” also needs correction: utility is read from an unsigned sidecar. The builder assigns
`task_completed` from the benign label and `benign_subtask_completed` from that label or any blocked
receipt, rather than observing task completion. ASR counts attack cells with an allowed receipt
whose authority flag is true; consequence `reached` counts allowed receipts, not executed effects.
Utility-under-attack requires any block and the authored sidecar flag, not demonstrated containment
plus completed work. `verify_coverage` is fixed to one in the metric helper, and zero-denominator
rates/Wilson intervals return zeros. Wilson bounds here do not establish independent sampling or
generalization from repeated deterministic templates. Equal frontier vectors are retained and
are not proof of an optimum; the no-quality-gate principle remains appropriate.

The builder manufactures clean/red-arm verification summaries and privacy/golden success flags
without calling the direct verifier on corresponding red artifacts. Tests asserting those
returned constants and the harness's echoed red-arm labels do not prove the specified mutations
failed. The direct clean verifier and repeated-file comparisons are separate evidence. The
privacy helper has a null-object edge case and finite content patterns; it audits selected
aggregate objects, while inherited Stage 4D scanning covers pack content. Size bounds before
parsing, complete artifact privacy checks and OS network isolation are not implemented by the
shown verifier/harness. Offline environment labels and source-grep tests do not supply them.

M93's public test-key, canonicalization, replay and signer-isolation limitations carry forward.
The draft imports a nonexistent `jcs` export (retained code uses the actual canonical helper),
and several large implementation steps are pseudocode despite the completeness checklist.
Preserve frozen signatures, measurements and plans; current README/security guidance must flag
the direct-verifier limits rather than repeat the historical certified-frontier claim.

### M95 — Integration summaries do not independently establish every inherited guarantee

The complete Stage 4D–4F integration spec/plan describes orchestration and expected-result
checking, not a new containment experiment. Its readiness label is bounded by the underlying
stage checks, including M93/M94. Reading a generated red-result JSON does not prove the named
mutation was executed: Stage 4F's builder supplies those summaries as constants. The wrapper
runs actual stage commands and wrong-key attempts, but that does not transform the historical
red-arm summaries into independently observed falsifiers or fix the unsigned frontier.

The oracle reads stored fields; it does not capture the process exit that created each file.
Missing exit codes are inferred from `ok`. A clean record's failure reason need not be null,
and a red record need not explicitly have `ok: false` if its exit/reason match. Empty expectations
are vacuously successful. The wrong-key evaluator accepts several broad failure classes,
including `pack_verify_failed`, and does not require an integer exit code. The Stage 4F attempt
therefore establishes rejection at a signed cell-pack boundary, not authentication of its unsigned
frontier certificate. Errors are swallowed in the shell before reading result files; a stale
result can remain if an invocation fails before replacing it. Record freshness and exact observed
failure are prerequisites for stronger claims.

The required runtime no-network guard is not implemented by the retained source scanner. It
looks for selected textual patterns in eleven integration files, not all transitive stage/Python
code, dynamically loaded modules or child commands. The shell removes six environment names,
whereas the broader prefix scrubber is a separate helper; neither disables the operating system's
network access. The report builder itself is called outside `run_offline`. Source scanning and
locale/environment pins are useful checks, not the spec's sandbox/runtime interception guarantee.
The Node runtime is labelled required but its version is explicitly not recorded. The default
canary invocation also inherits a caller's full-suite environment flag, so full mode can run the
full lane twice rather than only at its separately labelled command.

Current shell `log_hash` hashes label, command text and exit code, not log bytes. This produces
stable status metadata, but cannot authenticate the volatile log's content. The separate Node
command helper hashes captured output instead; do not conflate the two. Status/exit logs do not
prove statistical robustness or stable execution timing. The full-suite flag passed to the report
is a caller assertion, and its guard compares two booleans rather than independently inspecting
a complete full-suite result set. Default oracle entries remain canary-focused.

Coverage matrices mark hardcoded nonempty source-label arrays as covered. The report's golden
and non-claim summaries are fixed assertions, not independent complete audits of stage artifacts.
It accepts supplied command entries without requiring every prescribed command exactly once;
`offlineEnforcement.ok: false` with an empty failures array contributes no failure. The retained
report does fix the draft's stale return after a final privacy/audit failure, but neither version
makes the report an independent release oracle. Privacy scans cover generated summary objects,
not all referenced stage contents, and use finite patterns after reading each file. The absolute
path scanner recognizes only selected Unix prefixes, not every absolute path or machine-specific
value. The README is written after those JSON scans.

The shell compares final regular-file hashes to an initial snapshot, detecting net changes to
that enumerated surface. It does not make stage directories read-only, detect write-then-restore,
or inspect symlink targets as ordinary files. An earlier failed command can exit before the final
comparison; report creation also precedes it. The helper's snapshot comparison ignores additions,
although the shell's complete listing comparison detects added regular files. Use disposable
caller-owned paths for temporary-directory overrides because cleanup recursively removes them.
The wrapper writes integration evidence and is not globally read-only. Preserve historical
outputs, and qualify “proves the ladder” as orchestration of the exact bounded checks above.

### M96 — Stage 4G authenticates declared campaign records, not adaptive attack execution

The entire Stage 4G specification and plan were read against the retained campaign verifier,
classifier, schedule, schemas, builder, Python library helper and reproduce script. The four
scheduled fixtures are a deterministic signed-record demonstration: two declared caught, one
out-of-scope and one declared escaped. There is no feedback-driven attack selection or execution
of the referenced Stage 4D/4F attack surfaces. `recordFor` assigns outcomes from a class lookup;
its evidence-pack hashes hash small synthetic labels, not actual evidence packs or signatures.
`recomputeRecordOutcome` returns the supplied Class I/II class/verdict, while Class III/IV outcomes
follow their declared target class. The verifier never calls `verifyEvidencePack`. Accordingly,
“cannot falsely claim contained” is not established even within the scheduled campaign: signature
integrity authenticates declarations, not their factual truth. The Class IV record does not itself
execute or observe an environment escape. A successful verification with a disclosed escape is
valid accounting, not successful containment.

Current code improves on several draft omissions: it checks scheduled target classes and sealed
schedule hashes, includes caught Class II records in recomputed counts, and verifies the golden
digest. Campaign IDs use a structured canonical object, not ambiguous raw concatenation. However,
the verifier does not recompute the canonical seed from the configuration, resolve the declared
commit, or bind declared library/policy/driver digests to corresponding source bytes. The retained
builder still uses placeholder-looking commit and repeated-character digests. The Python library
builder is separate and its validator checks path confinement only; it does not verify fixture
existence/content hashes, library hashes, class coverage or nonempty input. Its empty template list
passes. These are not independently authenticated configuration provenance or anti-shopping.

The CLI reads its public key from the same artifact directory and offers no external trust-key
argument. The public fixture private key is deliberately reproducible, not an independent signing
identity. Domain-separated Ed25519 signatures do exist here, unlike the Stage 4F frontier digest,
but M79/M93's canonicalization and Merkle-tree limitations carry forward. Manifest record references
are nonempty strings, not confined file paths, and are not dereferenced by this verifier. Several
manifest/record metadata fields are not checked for mutual equality; schema enums alone do not
supply those bindings. Class I/II CR records are not forbidden by the record validator, despite the
full-claim EP requirement. No stronger external anchoring claim follows from this stage.

The advertised size guards operate after CLI reads and JSON parsing. Attempt/reason/string limits
are declared but not enforced; large signed per-class budgets can expand the schedule before its
length mismatch is detected. Malformed API input can throw before structured failure reporting.
Privacy uses a finite regex over JSON strings, not a complete field/value allowlist. Environment
flags and removal of three credential variables do not disable networking. The shell compares two
new builds, then replaces committed evidence; it does not compare a new build against the prior
committed artifact before replacement. Its red-arm status lines are unconditional, though the
builder does actually call the verifier for three mutations. Those lines alone do not assert the
expected failure reason or prove every planned red arm ran. Temporary-directory overrides must be
disposable because cleanup recursively deletes them. Preserve this frozen plan/evidence and use
these qualifications when describing the implementation.

S28 verifies the adaptive-attack citation identities; the 2020 paper should be attributed to
Tramèr et al., with Carlini as a coauthor. Research recommendations are methodological context,
not certification of this fixture campaign or an implemented 2026 standard.

### M97 — Stage 4H foundation is historical; current checks have a narrower trust boundary

The full Stage 4H design and 4H.0 implementation plan were read. The former's unimplemented
status and latter's Q2/Q5-only scope describe their dated milestones, not today's 4H.5 code.
Current verification lives in `verify-stage4h-digest-binding.mjs` and `dfiCertificate.mjs`, not
the proposed `verifyDfiCertificate.mjs`. The retained manifest also binds a hermeticity-attestation
digest, and the schema validates derivation entries; the early snippets omit both. Current CLI
process exits use Stage 4 wrapper codes, while raw codes remain in result JSON. The plan's
assertions of process status 22/25 and empty-derivation acceptance must not be reused as current
invocation expectations. Its wrong-key fixture borrowed Stage 4G's key, which is the same public
test identity as Stage 4D; retained code uses a distinct explicit wrong-key fixture instead.

The non-claims about execution truth, unrecorded edges, implicit flow and policy correctness are
essential. Projection synthesizes source-to-action edges from declared taint sources, not arbitrary
runtime data-flow traces. Missing source lists become empty arrays; authority sinks derive from
an explicit true flag, and registry entries alone do not become action sinks in the graph. The
base-pack view is a selected subset of the pack, with other metadata excluded by design; ordinary
Stage 4D signature verification remains a separate prerequisite. Standalone projection and
`diagnose` are not signature verifiers: the latter defaults signature/Merkle booleans to true and
permits an absent manifest. The CLI performs actual base-pack and manifest verification. Do not
substitute a helper's acceptance for that full path.

Certificate policy/lattice digests are compared with those recomputed from the supplied pack;
the CLI has no independently pinned expected policy/lattice digest argument. Signed consistency
is not an external policy-approval check. The graph's two-label propagation is local implemented
logic, not a proof of arbitrary policies or whole-program non-interference. M79/M93's custom
canonicalizer, Merkle algorithm and public test-key limitations also apply. The claim of RFC 8785
JCS should be read with those errata. `run_id_hash` and three informational summary counts are not
recomputed by `diagnose`; it does recompute violation counts. A valid signature authenticates
these descriptive fields without independently establishing their correctness.

The current certificate schema rejects unknown owned fields and validates nested entry shapes,
but does not enforce the design's general string, array, depth or pre-parse file-size bounds.
The CLI uses ordinary JSON parsing; the separate duplicate-key helper is not invoked there.
Error output still includes exception messages, which can contain caller paths. Current base-pack
failures map broadly to binding failure, rather than every proposed schema/privacy/replay code.
The original failure-precedence list is therefore not an exact current API contract.

The retained offline harness denies selected network and asynchronous subprocess primitives,
but does not implement the design's clock/RNG restrictions, filesystem allowlist, or complete
subprocess/native/worker isolation. Normal CLI static imports occur before denials are installed.
Its source scanner skips tests and allowed files, follows recognizable literal local imports,
and is not a complete dependency or computed-import analysis. Later reproduction optionally uses
an OS network namespace for the offline-audit command only and explicitly falls back when that
is unavailable. Neither successful fallback nor environment labels prove OS sandboxing.

Current reproduction rebuilds committed fixtures/evidence and compares selected top-level JSON
outputs from two builds. It is not read-only and does not establish byte stability of every
artifact. The summary writer labels `q0_to_q7` as pass even when called with a failing raw code;
read the actual exit/code and individual results. Its per-step raw categories are supplied by the
wrapper rather than preserved child raw diagnostics. These are current limitations, distinct from
the foundation plan's intentionally deferred gates. Preserve the frozen documents and use the
current scripts plus these qualifications for handover.

### M98 — The Stage 4H.1 derivation language is bounded and its validator is not strictly linear

The complete 4H.1 spec and implementation plan were read against the retained lattice, graph,
derivation, schema and fixture-builder code. The lattice operation is a greatest lower bound
(meet), not a join under the stated untrusted-below-trusted order. Unknown raw source labels are
conservatively normalized to untrusted here; this differs from the inherited Stage 4D handling
noted in M93. An authority sink with no incoming recorded sources defaults to trusted, reflecting
an empty recorded flow rather than establishing complete observation. An entirely empty graph
has no required derivation entries; the section-deletion claim applies to the deliberately
nonempty positive fixture, not every possible input.

Source nodes merge matching source IDs across actions, but action labels are combined from their
edge labels directly, not propagated from the merged source-node value. A shared ID with
inconsistent per-action labels can therefore have an untrusted source node and a trusted action
edge. This implementation checks its projected per-edge premises; it is not a general graph
fixed-point algorithm or consistency proof for global source identity. Replay decision premises
and registry-only sink premises are not mandatory derivation references. Receipt allow/block
status does not determine the DFI verdict, so a policy-blocked action can still yield a dirty
recorded flow. “Real dirty” refers to an inherited repository fixture, not a new live attack.

“Linear validator” overstates worst-case complexity: graph construction and array comparisons
sort incoming labels, while the builder sorts nodes/references. The checker independently
recomputes the small derivation; this is useful verification but does not establish expensive
proving with asymptotically cheap checking. The exported combine helper returns immediately on
an untrusted input, so a later invalid label is not checked by that helper alone; certificate
schema validation does check every supplied lattice input before the CLI reaches semantics.

Current code checks exact node/step/sink coverage, duplicate entries and premise-reference sets.
It distinguishes partial omissions from entirely stripped sections, unlike the early snippet.
Retained diagnostic reason names and failure precedence have evolved; raw 26 is not exclusively
a tamper gate, and raw 24 also represents an honest unsafe derivation. The fixed proof-system
lattice digest constant is distinct from the certificate digest of the pack's consequence lattice.
The latter does not itself bind the executable two-label propagation implementation.

The draft fixture helper accepts any member of a broad result-code set for any case and does
not restore `process.exitCode` after imported CLI calls. Current `runCliFixture` restores the
previous code after a completed call and checks each exact expected code. The proposed stability
test compares a freshly built certificate with current projection, not an independently pinned
prior-version golden. Coverage-manifest function names and metadata-only booleans are declarations;
actual CLI assertions and scans provide the bounded evidence. M97 covers current wrapper exits,
public keys, missing general bounds and offline scope. Preserve the dated Q1/Q2/Q5-only scope as
history, with later implemented gates described by their own documents.

### M99 — Q0/Q4 establishes finite fixture discrimination, not general laundering closure

The full 4H.2 spec/plan were read and compared with the current derivation verifier, fixture
builder and discrimination tests. Clean acceptance rules out an unconditional reject-all checker
on the exercised path, and dirty rejection rules out unconditional accept-all there. This finite
matrix does not establish completeness, soundness on every input, resistance to fixture-specific
logic, or a measured Fable-5/live-model attack. The documents correctly exclude the real browser
replay from this milestone; keep that boundary explicit.

“One-edge delta” describes the projected source-to-sink graph difference. Run/session identifiers,
receipts, signatures, derived digests and mirrored source-summary fields also differ. The focused
test compares edge projections, not equality of every other base-pack field. Current identifiers
are `act_000`/`act_001`, whereas draft snippets use `a0`/`a1`; current tests sort projected edge
triples explicitly, avoiding the draft's dependence on hash-sorted premise order. These are
historical examples, not literal current fixture schemas.

The sentence restricting raw 24 exclusively to `proof_accepts_bad_flow` applies to the specified
Q4b mutation, not the whole verifier: honest unsafe derivations still return raw 24 with
`explicit_flow_integrity_violation`. Partial omission returns raw 26; later diagnosis can rename
its reason when manifest/summary conditions differ. Current failure precedence and CLI wrapper
exits are covered in M97/M98. Matching re-signed manifests intentionally reach semantic checks;
those local fixture signatures do not supply independent producer or operator identity.

The plan's privacy grep is a finite token scan over named paths, and an expected-results object
is not evidence of observed process outcomes by itself. Current builder code checks exact returned
codes; child-process E2E assertions add a distinct CLI boundary check. Q3/Q6/Q7 were out of scope
at this historical milestone and must not be inferred from Q0/Q4 success. The proposed insertion
of logs at the top conflicts with the repository's current append-only preservation requirement;
new corrections belong at the end and must retain prior bytes. Do not copy the proposed attribution
or PASS claims without the actual actor and observed checks. Preserve the frozen plan as history.

### M100 — Stage 4H Q6/Q7 summaries do not establish the promised CLI privacy boundary

The complete 4H.3 spec/plan were read against the retained CLI, diagnosis, tamper helper, privacy
gate, raw-key scanner, builder and standalone audit scripts. The promised raw duplicate-key check
and Q7 gate are absent from the main CLI: it parses certificate/manifest JSON directly and never
calls `privacyGate` or `validateJsonTextNoDuplicateKeys`. Strict nested schema checking remains,
but it does not supply Q7's ID-length/grammar or summary-range checks. Direct CLI acceptance must
not be described as enforcing the proposed nine-step privacy pipeline. Many Q7 negative values
would already fail the full schema with raw 20, while standalone privacy tests deliberately call
the privacy helper without that schema first and report 27. Their diagnostic lanes are different
entry points, not proof of the stated end-to-end precedence.

`covertCapacityBits` counts only derived-node labels plus sink labels. It is not a proven upper
bound on exported information. A digest-shaped value still has capacity unless independently
recomputed; `run_id_hash` and three summary counts are not checked against the replay by diagnosis
(M97). Q7 checks shapes/ranges but does not recompute those values either. Node IDs permit arbitrary
bounded identifier text; graph/array size has no general bound, and semantically permitted array
orderings can encode choices. Hashing producer-controlled replay does not remove that information.
Even when a value is bound to a signed input, a statement about extra choices conditional on that
fixed input differs from total information exported. The reported number is a selected enum-field
count, not zero leakage, a total-channel capacity bound, differential privacy, or proof that all
producer-visible fields are semantically necessary.

The privacy helper's unknown-key allowlist contributes auxiliary flags while allowing success;
it relies on callers to run the authoritative schema. It omits a separate scope-value traversal
and assumes much of the surrounding shape. Some rejection `where` fields copy the offending node
or reference verbatim, so publishing the full rejection object can expose the very value rejected.
The retained ID helper correctly handles suffixes over 64 characters, improving on the draft's
mismatched 256-character check. Neither typed shapes nor finite grep scans prove the absence of
private information in accepted identifier/digest fields. A raw-key scanner is a separate helper,
not a canonical JSON parser or a check currently applied to every CLI input.

Q6's eight-arm matrix is generated by `buildTamperMatrix` calling `diagnose`, not the full CLI.
The signature and Merkle arms flip `signatureOk`/`merkleOk` booleans instead of changing and checking
cryptographic bytes. Semantic arms repair selected manifest digest fields but do not re-sign or
verify the full manifest. `passed_steps` is inferred from a returned code 26 rather than recording
actual step execution. The builder writes this helper matrix into evidence, and the security
audit invokes the same helper. These establish bounded diagnostic behavior, not a complete
re-signed attack matrix through the cryptographic boundary. The separate proof-deletion fixture
builder really does re-sign a mutated certificate for CLI testing; its additional evidence must
not be generalized to every matrix arm. Exact expected-code/reason checks are stronger than merely
requiring zero accepted mutations, but remain limited to the actually executed path.

The draft's default fixed integrity-lattice digest comparison would conflate two different
lattices; retained `checkLatticeDigest` instead receives the recomputed pack consequence-lattice
digest explicitly. Some draft tests mutate a certificate without repairing its manifest and
would fail binding before their intended deep semantic reason. The current helper's narrowed
reason remapping is described in M98/M99; it is not an observation of nine independent steps.
The eight named mutations are finite cases, not an exhaustive single-field neighborhood or
multi-field collusion closure. Preserve frozen evidence and correct current handover/security
wording; implementation repair and new cryptographic/privacy validation are separate work.

### M101 — Stage 4H hermeticity attestation is signed metadata, not a recomputed CLI prerequisite

The entire 4H.4/4H.5 spec and plan were read against the retained offline harness, audit script,
manifest binding, verifier and reproduce shell. The signed manifest binds the supplied hermeticity
digest, but the CLI neither loads the attestation nor recomputes a fresh offline report and compares
its digest. This contradicts the stated “never trusts ... without recomputation” guarantee. The
fixture builder computes a report and signs its digest; the separate audit can overwrite report
and attestation files without updating a manifest. These are distinct operations. Its recorded
Node major is machine-dependent, so regenerated attestations/signatures are not cross-version byte
identical. The two-build comparison establishes stability only under the same environment.

Q3's clean report runs the diagnostic tamper matrix and separate privacy helper, rather than the
complete cryptographic CLI. It counts interception hits and the nine egress-double result codes;
it does not require the returned tamper/clean-privacy results to be semantically successful.
The main CLI has its own runtime wrapper, but the report's workload and signed metadata are not a
record of that exact invocation. Later code correctly runs egress probes sequentially, repairing
the draft's concurrent global monkey-patching/restoration race. The draft's double-escaped regex
literals also differ from the retained working scanner. The scan still has the finite dependency
and capability limits described in M97; it cannot make arbitrary captured imports authoritative.

The narrowed 4H.4 spec explicitly excludes kernel isolation, improving on broader master-design
wording. The nine denied test surfaces remain selected entry points, not all APIs in those
capability classes. Denials are installed before the callback but after normal CLI imports.
Partial installation failure occurs before `runOffline` enters its restoration `try/finally`;
global patches are not a robust concurrency or adversarial-code isolation boundary. The optional
network namespace surrounds only the separate offline audit, not all eight reproduce steps.
Its skip is printed in a log, not bound as an explicit OS-isolation result in the attestation.

The raw-code map has expanded for later stages; the twelve-entry table is a historical 4H subset.
Its object-key lookup coerces strings and other property keys, so string `"0"` maps to success;
it is not an integer-only total validator for every JavaScript value. Normal CLI normalization
checks integers first. The shell's numeric conversion is separate. Preserve those distinctions
when describing “unknown values fail closed.” The designated numeric unknown probe remains 999.

The reproduce wrapper assigns a raw category per failed step and does not preserve each child's
raw failure. Failures in setup, summary writing or the wrapper process itself can exit outside
that mapping. Functions called through a conditional can also continue after an intermediate
failure unless they check it explicitly: the two-build helper relies on its final diff status,
so failed build/copy commands can leave earlier files available for comparison. Its final summary
has the unconditional pass-label issue in M97. Selected JSON comparisons and formatting checks
must not be described as independent verification of every artifact or of every Q6/Q7 guarantee.
The proof-deletion CLI test is meaningful bounded evidence; the proposed T6 “capacity budget”
check is a typed-value negative, since no total capacity-budget threshold exists in the helper.
M100 supplies the privacy and cryptographic-matrix limits that a broad closeout label cannot erase.

### M102 — The Stage 4H full-chain audit plan is an unmerged addendum

Both full-chain audit documents were read in full. Their proposed runner
`scripts/e2e-llm-shield-stage4h-full-chain.sh`, `fullFunctionCoverage.test.js`, standalone
`STAGE_4H_FULL_E2E_AUDIT.md` and `full-e2e-audit/` outputs are absent from this checkout's tracked
files. The retained Stage 4H closeout explicitly identifies this as a separate unmerged addendum.
The plan's proposed PASS statements, command transcript, runtime-change flag and function-coverage
summary are not completed evidence here. The existing core reproduce/E2E paths and their prior
smoke receipts are separate. Do not claim the planned command ran or that this audit is included
in the historical tag merely because the spec names that tag and commit.

The illustrative function test has multiple API mismatches: premises are an object, not an array;
`recomputeGraph` exposes a `nodeLabel` Map; `buildDerivation` returns a derivation wrapper;
validation helpers include code fields; the lattice comparison needs the pack's consequence-lattice
digest; privacy returns `covert_capacity_bits`/`auxiliaryFlags`; the tamper matrix is an object;
`runOffline` returns a caught-violation result rather than rejecting on the expected denial;
the deletion builder returns paths; and the verifier core returns a numeric code. The draft's
raw-28 constant is also looked up on the wrong code object. The plan anticipates API correction,
but its full code block is not a runnable current test suite. “Bad flow or unsound derivation ->
24” must distinguish unsafe semantic flow (24) from structurally unsound proof material (26).

The proposed export inventory checks names, not call/branch exhaustiveness. Named function coverage
and a generated PASS summary do not establish measured line/branch coverage or complete security
validation. The proposed shell executes current working-tree code while hardcoding a released
base identity; it does not independently establish that every executed source byte matches that
tag. Its drift check compares Git status with the current checkout/index and ignores the audit
subdirectory, not the exact released tree. Reproduction can write and restore bytes before that
check. The displayed standalone status pipeline ends with `|| true`, so its status alone is not
a failure gate. It also checks a narrower evidence surface than fixtures/runtime source.

The proposed summary copies expected raw-code fields and several typed constants, while actual
command/test executions are the distinct supporting checks. Its generic unshare note does not
record whether the namespace ran on that attempt. Formatting/diff checks precede final summary
writes, and command transcripts can contain nondeterministic timing. Even a future implementation
of this runner would inherit M97–M101 unless those boundaries were deliberately repaired and
validated. Preserve these frozen proposals as history rather than fabricate missing audit outputs.

### M103 — Stage 4J's CLI does not enforce every advertised authorization binding

The complete PCTA spec and implementation plan were read against the retained proof, authority,
CLI, fixture-builder, evidence-emitter and reproduction code and tests. The current design uses
an additional signed PCTA manifest referencing the 4H root, rather than modifying the signed 4H
manifest as one spec passage suggests. However, `runPctaCore` never calls `verifyPctaManifest` or
reads `pcta_manifest`. The independent manifest helper and its unit tests do not close that CLI
gap. The [isolated probe](pcta-verifier-probe.json) returned raw/typed 0 after deleting or replacing
the manifest, without changing the retained proof or its pinned public key. Thus root/manifest
binding is not a prerequisite of this entry point. The 4H precheck verifies the base pack and
runs `diagnose`; it does not call the complete 4H CLI's signed-manifest verification. M97's
signature-boolean distinction applies here too.

P7 compares policy and DFI digests, but only validates the syntax of `user_intent_digest`.
`resolveP4` accepts `agent_derived` with a safe sink claim without requiring the higher-ranked
proof specified by `canCarry`; that latter helper is not used in the verifier. P5 compares the
three action digests but does not compare the proof's tool name or either declared action class
with the receipt. P6 is conditional on producer-supplied `enforcement.required`, which need not
be true. The same local probe accepted independently signed inputs changing the intent digest,
using agent-derived authority without another proof, changing the tool and action classes,
setting both required/applied false, or adding an unknown payload field. These cases used a new
ephemeral key explicitly supplied as the pinned producer key; they demonstrate missing semantic
checks for an authorized producer, not forgery of the committed key. No external tool ran.

Shape validation allows unknown fields and has no tool/nonce/overall input-size bounds. The
fixed epoch anchor and default ten-year window are fixture freshness rules, not current-time
freshness; nonce uniqueness is structural for one proof, with multi-proof uniqueness deferred.
The builder's intent digest is a repeated-digit placeholder without a corresponding intent
artifact. A signature authenticates that declaration; it cannot establish the user's actual
approval or authorize a policy on the user's behalf. The custom canonicalization and tree limits
in M79/M93 also qualify the plan's RFC/JCS wording. Proof digests cover the payload, not the
whole signature envelope.

Later code repairs several draft defects: the matrix contains ten rows including P8, separates
dirty-DFI rejection (24) from untrusted declared authority (34), and prioritizes under-declaration
(38) before missing-claim rejection (34) with a missing-receipt guard. Current tests distinguish
unsigned digest tampering (32) from a re-signed mismatch (35), assert exact matrix verdicts, and
regenerate into a temporary directory. The byte comparison covers the deterministic expected
matrix; fresh random keys make complete proof/signature bytes different. Evidence emission now
runs and checks the matrix. These improvements do not exercise every missing semantic binding
above, and named gate/function coverage is not exhaustive branch or adversarial coverage.

The reproduce shell's `env -u ... true` only scrubs that short-lived child, not subsequent commands.
Its deletion check uses a shared fixed temporary filename, and cleanup is not protected on every
failure path. The offline harness has M97/M101's finite scope. Emitted fixture paths and caught
error messages also preclude a blanket no-path-disclosure guarantee. The grep-based wording
check tolerates scanner failure and broad line exemptions; document correctness still needs
manual review. The proof-carrying and attested-admission references are relevant comparisons,
not evidence that every competitor lacks a capability or that this fixture study fills an
industry-wide empty category; S29 verifies only the accessible primary-source identities and
stated research scope. Preserve the frozen proposal and correct current assurance wording.

### M104 — Stage 4K recomputes supplied counts, not deployment enforcement or every attestation field

The full EBA spec and K1–K7 plan were read against the retained ledger, budget, manifest, verifier,
builder, emitter and shell. This is synthetic, post-hoc accounting over supplied event metadata.
It has no independent observation of served responses, completeness proof, live throttle,
cryptographic consumer-identity binding or measured capability-transfer bound. The event classes
and weights are declarations. A signed budget policy is not evidence that a deployment enforced
it, and `denied_over_budget` names a reported condition rather than an observed denied response.
The primary spec's careful synthetic/pseudonymous non-claims should qualify its broader claims
about dishonest producers and every competing defense. SLSA/in-toto are not limited to a single
fixed application, and this comparison is not an exhaustive novelty result or compliance standard.

The verifier rebuilds the ledger and checks the EBA signature and digest chain. It does **not**
rebuild and compare the attestation's semantic fields, despite the plan's frozen gate-order
requirement. The [temporary-input probe](eba-verifier-probe.json) accepted a producer-signed
attestation with false per-consumer totals/verdicts and a false denied list while the actual
under-budget ledger remained unchanged. This does not bypass Q8 on an actually over-budget
rebuilt ledger; it shows that accepted attestation prose/data can contradict the recomputed
result. The ephemeral test key was explicitly supplied as the trusted producer key, with no
forgery of the retained fixture signer.

Neither `checkBudgets` nor the core compares `policy.window` with ledger-entry windows. A changed
policy with a stale attestation digest was correctly rejected (22); rebuilding that digest chain
allowed the unrelated policy window. A correctly signed empty event stream/ledger also passed:
there is no required-consumer or event-completeness expectation. Response digests and event IDs
are used for input validation/order/duplicate handling but are absent from the aggregated ledger
and signed manifest. Changing one well-formed response digest without re-signing passed the
probe. The signature therefore authenticates aggregate accounting, not the exact source stream
or correspondence to actual responses. The fixed DFI digest references the separate clean 4H
fixture rather than a proved mapping from each exposure event to a receipt.

“Ledger leaks nothing” is too broad. `window` is an unrestricted nonempty string copied in
plaintext into both ledger and attestation; a synthetic raw-text window was accepted in the
probe. Arbitrary policy keys and other unsigned-by-schema declarations also require contextual
review. Counts, digests and equality patterns are metadata with disclosure capacity; a fixed
public salt does not anonymize guessable identifiers. Unknown event keys are rejected, but
that is not a full output privacy schema. No input/event/string bounds precede parsing/sorting.
The duplicate key concatenates unrestricted fields with `|`, permitting ambiguous tuple
encodings and false duplicate rejection; string comparison uses JavaScript code-unit order,
not general UTF-8 byte order. The standalone budget helper assumes valid ledger entries and
checks integer rather than safe-integer budgets; the core's rebuilt ledger narrows that input.

The 4H precheck uses base-pack verification plus `diagnose`, inheriting M97/M100/M101's limits;
it is not full Q0–Q7 CLI verification. Current shell code repairs the draft's bare test-directory
invocation and compares emitted evidence with Git instead of formatting canonical fixtures.
It still assumes repository-root execution, prepends a machine-specific Homebrew path, accepts
Node majors at least 26 rather than exactly 26, and does not scrub provider variables despite
the spec's first step. Fixture rebuilds compare deterministic payloads, not fresh-key signatures.
The second-build comparison covers a smaller selected set; Git's working-tree check is relative
to the index, not an independently pinned release. Setup/cleanup and unexpected errors can exit
outside the advertised wrapper. The under-budget failure branch can continue if a failing child
leaves a report claiming raw 0; the shell does not cross-check every status/report pair.

The emitter verifies supplied matrix verdicts before normal writes, but does not independently
validate a fixed matrix schema or expected reason strings, and writes are not transactional.
Missing required matrix rows can fail after some files are copied. Static keyword checks and
named all-functions composition tests do not prove universal privacy, adversarial coverage or
all helper preconditions. The planned T2 inline temporary-path assignment does not retain the
path for a later `cmp`; use the corrected current reviewer commands. Raw 39 remains reserved; the historical exit-map subset is not the complete expanded map. Preserve these
frozen design/implementation records and read their results with the current security limits.

### M105 — Stage 4L's cluster calculation does not authenticate every narrative or upstream verifier

The entire CCB spec and plan were read against the retained commitment, ledger, budget,
attestation, CLI, reproduction and E2E paths. M46's mathematical correction remains necessary:
nonnegative fixed exposure and non-inflating budgets are required for breach persistence under
merges. A provider's singleton partition is not proof of independent real-world actors; a later
merge may reflect newly learned information. Neither arithmetic nor a signed histogram establishes
a knowing past lie, complete observation, truthful clustering, deployed prevention or an empty
evasion strategy set. A hash chain alone does not make a producer-declared time impossible to
backdate; independent timestamp/witness assumptions matter. The proposed heartbeat and respondent
lanes in this historical spec are not themselves shipped 4L capabilities. M41/M47 and S16 qualify
the combined Article-55/73 and August-2026 legal framing. S30 confirms the cited research identities,
not the unsupported claim that no other governance system offers independently checkable artifacts.

The implemented commitment hashes selected cluster fields, excluding the consumer and commitment
itself. This allows members to share a cluster digest; the spec's “assignment payload minus
signatures” description would not. The implemented policy uses `class_weights` and a digest-keyed
budget object, not the spec's `weights_digest` and budget-row array. Its opaque basis and graph
version digests are declarations without source-artifact recomputation. Cluster-basis order and
duplicates are not normalized/forbidden, so equivalent basis lists can yield different commitments.
The assignment validator checks allowed keys, but `window` is arbitrary plaintext; regex digest
checks coerce values rather than requiring strings. Exact-key/privacy claims should be limited to
the actual validated surfaces, not the whole pack or all nested values.

`runCcbCore` rebuilds exposure/assignments/cardinality and verifies CCB signature/digest bindings,
but it neither runs `runEbaCore` nor verifies the referenced 4K manifest. It hashes that local file.
The CCB stream is separately authored; the reference is not proof that its events are the same
4K events. Q0–Q8 replay happens in separate reproduction/tests, with M97–M104's limits. The CCB
core also does not rebuild/compare attestation totals, `q9_status`, per-account rows, non-claims,
known limitations or the required-empty corroboration slot. The [isolated probe](ccb-verifier-probe.json)
correctly rejected unsigned attestation tampering (22), but accepted producer-signed false status
and totals, removed non-claims/limitations, and nonempty reserved corroborating commitments.
The signed cases used an explicitly pinned ephemeral producer key; Q9 still checks the rebuilt
cluster totals. This is not forgery or evidence that an actually over-budget rebuilt cluster passes.
Changing a well-formed response digest without re-signing also passed because the aggregate omits
that reference, as in M104.

The budget helper does not enforce a policy-window/assignment-window match or an exact policy
schema. Assignment completeness is relative to the supplied rebuilt exposure set, not independent
observation. Cardinality uses the first entry's window while counting all supplied assignments;
a single-window input constraint is not enforced there. Standalone helpers assume valid ledgers;
core reconstruction narrows those assumptions. The builder's signed attestation includes the
non-claims, but signature authenticity does not supply their missing verifier checks. Empty or
omitted populations, opaque digest slots and arbitrary window labels must remain explicit limits.

Current reproduction does not rebuild 4K fixtures, scrub credentials, execute the full-chain E2E
file, or verify an entirely clean Git tree as the spec/plan prescribe. It runs separate Q8 CLIs
and checks fixture diffs only. Selected deterministic outputs are compared; fresh-key signatures
are not byte-stable. The verdict helper discards child exit status and reads a report. Its matrix
mismatch branch routes the unexpected raw value through the wrapper; an unexpected raw 0 can
therefore continue instead of failing the harness. The explicit structuring/falsifier checks
correctly map their mismatch to 29. Temporary setup/cleanup and wrapper failures still sit outside
the universal wrapper claim. The E2E test retains broad allowed-code sets for some mutations,
and its export-name inventory is not exhaustive function/branch coverage. Its source-drift check
uses an available base ref and silently omits that check when neither ref exists; it does not
report a test skip. Later code correctly updates mapped 43–46 while retaining 39 as reserved.
The historical all-green counts, branch/tag workflow and proposed code are not current validation.

### M106 — Stage 4M public-tier verification omits signed disclosure and chain bindings

The complete VXD design and implementation plan were read against the retained core, Node
loader/CLI, disclosure/respondent/merge helpers, Lean proof, reproduction script and tests.
The [isolated local probe](vxd-verifier-probe.json) confirmed that Tier-P verification accepts
an altered disclosure value with a matching altered chain entry while the original attestation,
manifest and pinned signer remain unchanged. It also accepts deletion of both disclosure and
chain. The public path skips the entire `attestation_roots` gate, including roots and chain
bindings for files available in that tier. Its internal disclosure-position check therefore
does not authenticate those bytes against the signed artifact. This is a demonstrated verifier
binding gap, not merely an inability to recompute private evidence. Missing inputs become empty
arrays/null and their `present` flags are unused. Do not describe Tier P as authenticating every
present public disclosure or detecting suppression of its required files.

Tier A does compare local ledger roots and the whole-chain digest, but does not recompute
attestation aggregates, verify the referenced CCB/Lean files, or require the declared non-claims
and limitations. The probe accepted producer-signed false totals and zeroed source/proof digests
with non-claims removed. Those cases explicitly pinned an ephemeral producer key; they do not
forge a retained signature. The core receives a manifest verdict from its caller; standalone
core calls are not themselves cryptographic verification. The Node wrapper performs that check.
The upstream CCB artifact is not loaded or verified by the VXD verifier. Locally authored windows
and first-window genesis do not establish the provenance or truth of the 4L partition.

The Lean file proves conditional inequalities over lists of natural numbers. It does not prove
JavaScript refinement, real-world clustering, source completeness or universal resistance to
account structuring. Non-inflating budgets and nonnegative exposure remain essential assumptions
(M46/M105). JavaScript numeric and input-size constraints are narrower than an unbounded Nat
model. The merge helper's new-ID collision check looks in a map keyed by old IDs; an isolated
helper probe accepted two disjoint groups with the same new commitment, yielding duplicate
output clusters. No complete-core exploitation is claimed for that helper observation. The
property tests exercise bounded generated examples and selected fixed chains, not every partition.

The disclosure chain records positions rather than a predecessor-hash link for every entry.
Signing its digest binds a supplied list; it does not establish independent chronology, append-only
publication or complete record coverage. Disclosure checks cover selected references/positions,
not a full semantic chain schema. Consumer-window counts are not distinct affected people.
The Article-73 projection file is not loaded by the verifier; its separate deterministic projection
is neither a legal incident assessment nor compliance certification (M41/M47 and S16). The custom
canonicalization/Merkle limitations in M79/M93 apply; a sorted digest tree alone does not provide
semantic respondent-key non-membership or completeness proofs.

Respondent lookup searches canonical JSON substrings in windows, rescores and merges. It does
not establish respondent identity, exact digest-key selection or all disclosure claims. Contest
validation does not compare the declared window with the targeted record's window or require
contest/acknowledgement chain membership and chronological order. The Node adapter takes its
acknowledgement verification key from the first acknowledgement's inline respondent key, not an
independently pinned provider identity. A producer-authenticated choice of key is not independent
provider authentication. These are source-level qualifications, distinct from the six core probe
cases. The finite forbidden-key checks and opaque digest slots do not prove value-level privacy
or an information bound; persistent cluster IDs and arbitrary window labels can carry linkage.

The browser parity test runs Node paths with an alternate contest/acknowledgement verifier;
it does not exercise HTML parsing, DOM file loading or the browser manifest path. M54 already
records the retained page's fatal duplicate declaration. Generated-string parity cannot establish
that the page runs. Current proof CI discovers the proof set and rejects escape hatches; the old
optional local command can also mask proof failure as an unavailable tool. Neither a workflow
file nor historical all-green counts establish current branch protection or a fresh CI result.

Reproduction uses selected byte comparisons because fresh signing keys change other artifacts.
It runs unit tests and a separate 4L smoke, not the complete 4M E2E net, a 4K replay or a Lean
check. It does not scrub credentials or establish a fully clean Git tree. As in M104/M105, a
matrix mismatch that routes an unexpected raw 0 through the wrapper can continue. Some arms
check a broad nonzero result or a malformed extra field rather than the promised semantic
mutation; the projection arm compares derived data separately. Export-name inventories,
finite forbidden-key checks and selected tamper files do not establish every-function coverage
or universal privacy. Preserve the frozen spec/plan and read their intended guarantees with
these demonstrated and source-inspected limits. Runtime repairs remain separate from this audit.

### M107 — Stage 4N CLI consistency does not authenticate a feed or bound all public disclosure

The full 673-line design and 3519-line implementation plan were read against the retained CLI,
core gates, source adapter, signer, Lean proof, reproduction script and E2E net. The CLI accepts
feed, policy and caller-selected `--as-of`; it does not load the signed manifest/attestation or
accept a pinned signing key. Separate E2E checks rebuild the committed attestation and verify
its signature. Those checks do not authenticate arbitrary inputs passed to the documented CLI.
The [seven-case local probe](seismograph-verifier-probe.json) preserved the original signed
evidence and used no signing key. Six cases passed, including arbitrary plaintext in a band,
a reveal claiming future publication, unrestricted nested policy/non-claim text, a one-record
prefix with an earlier caller-supplied horizon, and an unbound root-as-leaf inclusion proof.
The one-record prefix correctly failed raw 47 at the original horizon. Thus silence detection
is relative to a supplied cutoff, not evidence that continuous real-world reporting occurred.

Q15 hashes the 4K/4L expected-result matrices and available parsed 4M disclosure files. These
are not recomputed exposure/cluster ledgers or authenticated upstream verifier results. All
synthetic windows reuse those roots; the seven raw-count pairs are separately authored in the
builder. The `private_evidence_root` is derived entirely from public root fields and the window
label, not a commitment to independently collected private observations. The adapter silently
omits disclosures on any read/parse error, not just missing files. M103–M106's upstream limits
therefore persist. A consistent producer can choose false telemetry; a whole new locally
consistent chain does not establish that an older public history was never rewritten.

The actual Q10 checks an ordered subsequence, leaving missing heartbeats/reveals to Q11/Q13;
this deliberately differs from the spec's exact per-position schedule language. The committed
horizon is not consulted by the CLI. Q13 compares the declared reveal time with the heartbeat's
declared due time and enforces a lower bound, but does not require equality with the
policy-derived due window or consistency with the chain's current publication window. The
probe changed both declarations to `synthetic-9999` while preserving their original position
and the `synthetic-0006` horizon; the CLI accepted it. The proposed timing discipline is
therefore stronger than the implemented checks.

The four-bit calculation bounds the nine intended band vectors only. Q10 deliberately invokes
structural reveal validation without dimensions; later Q14 checks dimension names and the
copied arithmetic, but never invokes the full label/missing-dimension validator. Q16 rejects
numeric counts under two names and four forbidden key names. An arbitrary string band with a
matching rebuilt commitment passed the CLI, so the actual accepted public language is not
bounded to nine vectors. Nested policy fields, extra non-claim strings and opaque digest/salt
slots further exceed that channel model. Q16 receives feed and policy only, not every file in
the evidence directory, manifest, attestation or report. The spec's complete public-surface and
no-linkage claims are unsupported. M47's correction also applies: SHA-256 commitments are
computationally binding under hash assumptions, not unconditionally binding; deterministic
low-entropy salts permit guessing, and random deployment salts need not prevent fixed fixtures.

Q12 receives a proof object, not actual bundle bytes. Its `bundle_digest` is actually a disclosure
leaf in the fixture adapter. The tier is only enum-checked, not included in the hashed leaf;
`stage`, `distribution`, extra fields and exact proof shape are not validated. A supplied root
as the leaf with an empty path passed without demonstrating inclusion of any particular bundle.
This is not a hash collision. Q17 compares an unauthenticated digest assertion for record kind
and window; it neither verifies a second signed feed nor checks the advertised `chain_id` tuple.
Absent optional Q12/Q17 inputs silently return success. A raw-48 mismatch is not independently
authenticated evidence of provider equivocation. Synthetic bilateral proofs are tracked under
public test fixtures, so “never in the repo” must be read as a rule for real deployment evidence,
not a description of repository contents.

The Lean model contains record kind/window only. Its well-formed predicate already assumes
exact equality with an expected schedule; the presence theorem specializes that assumption.
The no-fork result compares kind/window, not hashes, commitments or two authenticated producer
stories. The proof does not establish the JavaScript implementation, wall-clock liveness,
cryptographic non-equivocation or reliable publication. Current proof CI discovers files rather
than using the historical single appended command. The optional second delayed-reveal lemma
is not a shipped requirement satisfied by this file. S31 confirms the related position paper's
proposal and preprint identity, not an adopted NeurIPS rule or endorsement of Simurgh's specific
tiers. The Article-55/73, deadlines and application-date corrections in M41/M47/S16 apply here too.

The retained E2E net checks exact verdict/reason/gate/exit for seven feed mutations, but T10/T11
public-extra mutations are exercised separately by unit helpers, not the CLI's complete artifact
loading. T2/T5 do not assert every promised result field; T13 checks any nonzero result after tail
deletion. Its inventory test checks presence of four files rather than equality of directory
contents, and byte comparison covers selected artifacts. Reproduction runs units and this E2E
net, compares a larger selected list, and checks only fixture/evidence Git status; it does not
run Lean, replay every upstream stage, scrub credentials or establish a fully clean repository.
Temporary setup and interpreter failures remain outside the universal exit-wrapper claim.
Historical commands also contain wrong relative imports, incomplete inventory/schema grep
checks and assumptions about then-existing worktree failures; current source/receipts take
precedence. Frozen records remain preserved with these explicit corrections.

### M108 — Stage 4O verifies fixture replay; selective disclosure does not authenticate approval

The entire 589-line VTSA design and 2048-line plan were read against both gate implementations,
Node verifier/builder, drift/timeline/alignment/capture cores, Lean proof, reproduction and E2E
paths. The four implementation deltas in the spec's closeout addendum are useful, but “shipped
as specified” omits material gaps. `verifySelective` reads an entire repository arm and its
`tools[]` body, chooses an entry and checks its Merkle path against the supplied root. It does
not verify a signed envelope, ancestry, epoch, receipt semantics or the attestation. The
[temporary-copy probe](vtsa-verifier-probe.json) accepted selective inclusion with invalid
commitment signatures, an invalid action digest and an escalated receipt. This establishes
membership relative to supplied data, not approval-time authentication or authorized execution.
The CLI's selective branch ignores the supplied evidence directory.

Full `verifyEvidence` replays the repository's fixture arms, not arbitrary arms in the supplied
evidence directory. It does not authenticate or re-gate that directory's `clean-chain.json`;
only a timeline root/epoch lookup consults it. The probe changed its tool body and removed its
signatures while the original signed attestation/manifest remained untouched; full verification
still passed. Attestation verification uses the key embedded in the supplied manifest with no
external pin. Replacing that key and re-signing with an ephemeral self-selected key passed;
this is not signature forgery. Unsigned manifest schema/fingerprint/advertised manifest-key
changes also passed. The signed corpus has meaningful fixed-fixture replay checks, but success
does not authenticate an independently selected operator or every supplied artifact.

The current builder uses committed, explicitly insecure fixture keys by default. It accepts
`--attestation-key`, but does not implement the plan's `--manifest-key` re-signing or `--ephemeral`
mode. The committed evidence attestation public key also matches the public fixture key.
Evidence commitments remain fixture-key signed; a custom attestation key does not replace
that trust boundary. There is no standalone `decision-corpus.json` output: the corpus is embedded
in the attestation. Neither the full verifier nor builder enforces every attestation schema,
non-claim/limitation field, signer-role separation or matrix expectation. The probe removed
non-claims/limitations and substituted another allowed alignment claim under an ephemeral
self-selected attestation signer; verification passed. `checkAlignmentMap` binds each mechanism
to its raw code but only checks global vocabulary membership for the accompanying claim. It
does not require the intended claim-to-mechanism mapping or prove constitutional compliance.

The Python entry point hashes the supplied Action and attaches it to output bindings. Neither
gate compares that action's semantic authority, server or target with the receipt: `actionDigest`
is checked for digest syntax, while receipt authority/sinks are checked against the manifest.
The entry point also does not compose the earlier intent/provenance authorizers. A trusted
adapter must construct a faithful dispatch receipt and enforce the resulting decision. No
actual dispatch or complete logging is established by calling this function. There is no live
server-identity field in the receipt, so raw 58's server-change promise is not implemented by
that gate. It checks the head toolset root; ancestor roots are not all recomputed. A missing
signature callback fails closed in Python, but the Python parity harness's `TAMPERED` sentinel
is not real cryptographic verification. Arbitrary callback failure and malformed non-string
digest values can raise rather than return the promised raw code; the CLI lacks a total catch
around parse/read failures. Its negative artifact path generally maps to 29, not each gate code.

The narrowing relation ignores server identity and risk class; sink order/duplicates also have
set-like semantics while entry equality hashes their representation. On complete manifest/list
representations it is a preorder, not the claimed antisymmetric partial order. A risk-only change
can classify incomparable although both directions satisfy narrowing; a server-only change can
classify equal. The Lean proof establishes reflexivity/transitivity and conditional acceptance
properties of its own typed model, not JavaScript/Python refinement or remote tool behavior.
Its umbrella theorem restates the delta-consent leg rather than conjoining all three legs.
The actual drift unit tests use selected examples, not the promised generated property suite.
The plan's claim that changing only the head `toolset_digest` necessarily breaks `delta_digest`
is incorrect: the delta hashes entries, not that root field.

The timeline hashes window ID, position and previous-record digest, not the entire referenced
4N record or its current commitments. The builder binds genesis `cleanChain[0]`, not necessarily
the active head; the checker accepts any matching epoch in the supplied chain and does not
validate its schema/signature or the 4N signed feed. A backwards reference cannot prove the
surface was approved while that earlier window was live or prevent a producer signing a new
story later. M107's 4N authentication limits apply. The Merkle leaf/node domains are useful,
but the custom construction is not RFC 6962/9162 conformance; paths omit the promised leaf-index
and tree-size checks. Custom JSON and bounded Python/Node vector parity retain M79's limits,
including numeric/Unicode/object-key edge cases outside the committed vectors.

Lane B hashes names and input schemas, but omits tool descriptions. A description-only poisoning
change therefore leaves that captured manifest unchanged. Authority is a name heuristic with
unknown names defaulting to read-only, empty sinks and low risk; it is not verified permission
metadata. Capturing one `tools/list` response without pagination, awaiting initialization or
recording a pinned package version does not establish a complete reproducible live inventory.
The retained captured tool count is an observation of that fixture. Child stderr is inherited,
so the capture script alone cannot guarantee raw server text never reaches logs. No capture was
rerun here. The withheld F1 fixture remains correctly marked as absent; do not convert it into
a claim that the cited incident was reconstructed or would have been prevented.

S32 corrects the motivation citations: approval frequency is not a measured unread fraction;
Snyk's 36.82% is any security issue in its sampled skills, not the prompt-injection rate. The
located Flatt disclosure is a June GitHub Actions permission-bypass account, with a different
timeline from the claimed May MCP incident/version. ETDI is proposed research; the reviewed
sources do not establish that nobody else ships verification or endorse this project. Internal
novelty/benefit/constitution scores remain author judgments. Article-73 and audience-tier claims
inherit M41/M47/M106's legal and verifier qualifications.

Reproduction compares generated fixture JSON excluding test keys and Lane B; it does not perform
the advertised complete temporary build/sign/verify/atomic replacement of evidence. Its four-key
text grep is not a general privacy/egress check; a grep error can also appear clean under negation.
The fixture-list process substitution can fail outside the loop's checked status. Final Git diff
covers two paths relative to the index, not untracked/staged changes or the entire repository.
Environment pins do not scrub credentials or enforce offline operation. The E2E net calls core
functions and `verifyEvidence`, not every arm through the CLI; its five function-type assertions
are not every-export coverage. The 4N invariant checks presence/schema rather than byte identity,
and parity covers selected fixtures with a signature stub. Preserve historical counts, version
plans and frozen records; current guidance must state these actual boundaries.

### M109 — Stage 4P binds fixture verdicts; custody authentication and physical-path completeness remain separate

Completely read the 787-line VOCA specification and 2,327-line implementation plan. Compared
custody/chain/schema/digest/CPC/invention cores, bundle builder/verifier, Lane B capture,
fixture invention construction, Lean model, reproduction script and E2E net. Preserve both
frozen documents and use these corrections with the earlier Stage 4P guidance disposition.

The offline verifier independently reconstructs the entire bundle body from repository fixtures,
including non-claims, disclosure, metrics and invention fields. This is stronger than checking
only a signature. However, arm replay passes stored `sig` booleans into `verifyCustody`; it does
not cryptographically recheck the arm signatures. The [temporary-copy probe](voca-verifier-probe.json)
replaced all custody signatures in the clean declared-relay fixture with invalid base64 bytes;
the untouched signed evidence bundle still verified. Its arm ledger records verdict/reason,
not the full input digest. Fixture generation and Lane B tests perform separate signature
checks; those do not make this CLI authenticate arbitrary supplied custody material. The bundle
signer is embedded, with no external pin: an ephemeral self-selected signer also passed. This
is trust selection, not signature forgery. Read/JSON errors escape the CLI's promised raw-code
wrapper; malformed outer core inputs can throw before producing a closed verdict.

The chain checks indices, predecessor receipt digests, repeated content and terminal response.
It does not compare the first hop's input to the request or each later input to the preceding
output. A core-only probe rebuilt links around a disconnected first input and passed, explicitly
retaining caller-provided signature results. Raw 76 compares the separate observed transform list,
not each hop's transform. The envelope's tool-surface field is shape-checked but not compared to
the observed/receipt/4O binding; receipt `relay_chain_digest` is not recomputed, and receipt trace
custody is not compared to the separately supplied observation. Provider identity is not resolved
against an external trust root. Missing/falsy pool observations bypass the pool check; the outer
observation object lacks an exact schema. `no_trace_retained` accepts a `provider_only` observation,
which does not demonstrate deletion. These are recorded consistency rules requiring a trusted
adapter, not proof of actual provider execution, an exhaustive custody path or trace retention.

CPC entropy is a fixed evidence-kind lookup, not measured conditional entropy. A known public
SPKI can be guessed regardless of its key size. Public window separation changes tokens but
cannot establish cross-window unlinkability against known candidates. The emission verifier
correctly enforces the module's floor against the kind and compares the advertised budget to
the supplied cap; do not describe it as accepting low-entropy kinds merely by lowering a signal
floor. The standalone digest helper instead uses the caller's floor. Both failure-class fields
lack value/type vocabulary validation; the probe accepted arbitrary plaintext in `failure_class`.
Counting matchable signals per supplied anchor in one call is not a cross-publication or per-real-
operator privacy budget; degraded outputs are not capped. Membership in a supplied anchor set
is not verification of the signed 4N feed, and the public commitment cannot prove the private
input's provenance or entropy.

Pincer matching compares two digests; it does not establish independent operators or authenticate
the enforcement signature. Contest validation compares a supplied signer digest and checks
base64 syntax, not a signature itself. The extraction bridge checks two caller-supplied known
sets; the shipped 3T digest is explicitly a hash of `stage3t-attestation-stand-in-task8`, not a
verified 3T artifact. Forward compatibility with 4L is array shape; old 4L evidence remains empty.
Lane B is six locally constructed, signed arms around `mockStage4oExchange`, which returns a
committed surface digest. It is not a live MCP/provider relay exchange. Recomputing a 4O digest
and schema-checking/hashing two 4N records in E2E does not authenticate those upstream bundles.

The Lean theorem's absent-ghost branch states only that no recorded hop names the ghost; it does
not conclude refusal or ledgering. Empty chains are accepted by this Lean model, unlike the JS
core. `signatureSound` quantifies equality of every pair of natural-number relay IDs, is not a
sound cryptographic assumption as written, and is not a premise used by `ghostTrilemma` at all.
`noSilentThirdPath` is case analysis over a three-constructor decision type; it does not prove
complete logging of real dispatches. The six theorems concern their explicit model, not refinement
of the implementation or detectability of an omitted intermediary. The closeout's “pilot only”
gap and internal novelty scores therefore overstate established assurance.

Bundle metrics include a raw-code set containing success as well as failures, so the displayed
coverage fraction is not itself a count of the thirteen negative codes. `first_failure_determinism`
is a literal `pass`; five CPC representatives are constructed, but bundle replay does not execute
the budget rejection arm. Separate tests supply those checks. Export inventory asserts names and
presence, not execution coverage. The reproduction script rebuilds fixtures in place, verifies the
retained bundle and runs stage tests/audits; it does not compile Lean or scrub credentials. Its
four-key grep is a finite content scan, not network isolation, and Git diff against the index
excludes untracked/staged drift. Preserve historical counts and runs without calling them current
head validation. S33 distinguishes the 17-provider inventory from the three-provider empirical
audit; neither that research nor attestation architecture documents validate Simurgh's novelty,
constitutional compliance or deployment effectiveness.

### M110 — Stage 4Q records approval fixtures but does not establish complete enforcement or human attendance

Completely read the 628-line VFR specification and 2,777-line plan; checked the actual pincer,
chain, digest and invention cores, bundle builder/verifier, signer/capture, fixture replay,
Python entry point and parity test, Lean model, privacy scanner and reproduction/E2E wiring.
This supplements M55's human-attendance and supplied-chain qualifications; frozen text remains
unchanged. The final scope has eleven rails, six object schemas including exemptions and fifteen
Lane A cases; the spec's “10 rails” and plan's final “12 cases” are stale. “No crossing without
approval” is limited to the approval path: explicitly policy-admitted exemptions are accepted,
including a frozen protected boundary kind, not only a separately defined non-protected kind.

The [local probe](vfr-verifier-probe.json) used real signature verification with the retained
signed exemption. `decide` accepted an exempt crossing with no chain entries/verdict, then with
an invalid crossing signature, then with a mismatched envelope run ID and epoch 99999. The
exemption branch checks its own signature and selected bindings, but not the crossing signature,
crossing membership, envelope run equality or an expiry window. It defaults the chain verdict
to success. The approval branch also trusts a caller's chain verdict; `positionsOf` finds the
first matching digest without enforcing its entry kind. Its epoch difference has an upper bound
but no nonnegative check, allowing a crossing earlier than receipt minting if inside the declared
validity interval. The plan's worked crossing-12 example with validity ending at 11 fires the
validity check before straddle; the separate straddle fixture correctly extends validity to 12.

The receipt path verifies a crossing's claimed key, but does not require it to equal the policy's
harness key. Public-key digests hash trimmed PEM text; replay resolves a supplied digest-to-PEM
map without recomputing each key's digest. Distinct labels/serializations therefore are not a
complete cryptographic key-distinctness proof without a validated key registry. Policy is a supplied
unsigned envelope, not an independently authenticated configuration. The Python entry point does
not recompute `action_digest(action)` or compose earlier authorizers: it returns a decision about
the supplied crossing and decorates it with the unrelated Action's family/target. Integration
must bind the real action, trusted policy, key registry and actual dispatch. This function neither
dispatches nor guarantees every refusal is logged.

Fixture replay reconstructs chains from supplied events and compares each root to that same
reconstruction. Census is optional at the core boundary; the builder's aggregate counts only
`crossing` entries, excluding schema-valid refusals, unlike the stated attempt census. Raw 80
can also mean an invalid envelope with a valid crossing, so excluding every raw-80 refusal does
not exactly implement the schema-valid-crossing definition. Lane B's “observed” count is derived
from its own event list, not an independent counter of live MCP calls. Negative cases retain
proposed crossing events with raw zero; the refusal-bearing arm inserts a synthetic refusal.
An externally retained signed digest catches later fixture changes, but neither a self-consistent
replacement chain nor this aggregate establishes that all actual attempts were recorded.

Lane B really spawns a separate local signer process, but does not call a live 4O MCP server or
bind its actual tool surface. The signer does not display a prompt/read terminal confirmation;
`--interactive` tests an environment flag, which the capture script itself sets to `y` every
regeneration. There is no one-time human-capture replay protocol as described. Display checking
compares declared text and digest, not the executed action's semantics or an independently seen
screen. Lane A hashes its display text directly while Lane B uses the domain-separated helper.
Both the approval and display claims must retain these boundaries.

The 4N anchor is a hash of the first raw feed line, while receipts use epochs 10/11; no feed-order
epoch lookup or public commitment of genesis/final run roots is performed. This is a backwards
reference to a retained feed, not evidence those events were published during that window.
Run IDs are fixed label hashes rather than per-run genesis commitments. Nonces are bound fields,
without a spent-receipt registry preventing repeat use across repeated calls.

The bundle verifier checks real Ed25519 and fixed-fixture digests/replays but selects the signer
from the bundle. It omits an exact top-level schema/stage check and does not rederive source-map,
projection or reviewer-note contents beyond their permissive validators. An ephemeral self-signed
probe with an invalid schema/stage, extra field and changed source/projection assertions passed.
It did not forge a retained signature. Note/row validators check shape or a phrase, not factual
accuracy, intended clause mapping or whether named machine-check arms exist. Signing a novelty
map does not validate firstness; S34 supplies primary research identities and qualifies the blanket
GitHub comparison. Internal constitution/benefit scores are author judgments, not an assessment
by the named organizations. Null/parse/read/callback failures are not uniformly raw-coded.

The Lean `frictionCoverage` theorem extracts census equality from its acceptance conjunction;
it does not quantify over every actual crossing and prove receipt coverage. The other theorems
similarly state properties of an abstract model with assumed signed/bound booleans and positions,
not implementation refinement. Actual Python parity uses the optional `cryptography` package
and can skip without it; it is not the plan's stdlib signature-boolean replay. `hashlib` in Python
3.13 does not supply Ed25519 verification. BYO verifies only per-case ID/raw/reason equality,
not all separately promised boundary/census/check-order fields, and leaves its temporary directory.
The shell accepts a positional approver-key path, not the documented `--approver-key` pair.
It generates a temporary key without cleanup and omits Lean compilation despite the spec's gate.

The E2E inventory checks exported names, not execution coverage; its idempotency test runs each
builder once, and it does not check the 3Q registry. Private-key audits and selected JSON regex
scans are finite checks: non-JSON files outside selected paths and arbitrary plaintext strings
are not categorically excluded, nor is public-key placement generally enforced. Environment pins
do not impose network isolation. Keep original observations, signatures and source unchanged;
these limitations correct current interpretation rather than claim runtime repairs.

### M111 — Stage 4R's CLI does not bind its supplied corpus to the signed root

Completely read the 809-line PCCC specification and 471-line plan. Checked the actual CLI,
attestation/ceremony builders, pccc/schema/DLEQ/census cores, operator/orchestrator, BYO kit,
Lean model, parity and E2E tests, and reproduction script. Preserve frozen history. The
[temporary-copy probe](pccc-verifier-probe.json) confirmed both-tier success with an empty
Lane A corpus and deleted Lane B directory while retaining the original signed attestation.
It also accepted changed public match content, transcript digest and invalid public signatures
with original signed transcripts and attestation. The CLI verifies an embedded-key signature
but never compares `evidence_root_digest`, case rollup or census to its supplied corpus. It
loads no Lane B capture. Its audit loop trusts each supplied expectation and accepts an empty
case list. This is not authenticated completeness or an arbitrary-evidence verifier.

Public records receive shape and finite forbidden-value checks, not signature, commitment,
transcript or VFR binding verification. Builder “signatures” are truncated transcript-signature
prefixes, not valid signatures over the public record. The public scan lacks token digests in
its supplied private index and is not applied to every attestation field. The attestation schema
checks a few types, not exact keys or frozen rail/limitation values. Signing uses a committed,
explicitly insecure fixture key, rather than the proposed private external key. The CLI emits
raw process codes and uncaught exceptions, not a universally wrapped stage verdict.

`reconstructInput` defaults replay, reuse, herd, budget, VFR and cardinality checks to passing
values; negative fixture overrides simulate failures. The CLI does not build those ledgers or
run the full upstream gates. DLEQ arrays require two valid-shaped entries but not exactly one
mask proof and one z proof per operator. A real-signature probe repeated the valid mask proof
in both positions, re-signed using public fixture keys, and passed the core with no z proof.
Proof context fields are included in each challenge but not all compared to the surrounding
transcript; a self-consistent proof is not the whole protocol binding. The local check does not
establish an independent cryptographic audit. Even a correctly bound DLEQ proves algebra for
chosen inputs, not truthful observed custody: colluding parties can choose the same invented
class without forging a proof. M48's qualification remains necessary.

Lane B launches separate subprocesses per phase, but reads the same committed scalar files,
reuses them across slots, and routes phase output through one parent. It is not two persistent
independent parties with fresh memory-only scalars or a localhost exchange. The z phase returns
commitment and opening together; the fixed phase-order vector does not witness commit-before-
reveal interaction. Its export approver is an in-process harness-key signature over a custom
object, not the separate 4Q signer/pincer. The distinct-key list omits a separate harness role
because the harness itself approves. The raw-98 E2E checks retained fields (`exported:false`,
null receipt and no record); it does not execute refusal through the composed gate. The ordinary
CLI never checks these arms. Direct ceremony execution also writes output without enforcing the
claimed refresh environment gate; only the reproduction script refuses that flag.

The 4P class and 4N anchor bindings are synthetic digest-shaped constants, already acknowledged
as deferred in closeout. K7 checks their syntax, not membership or signature provenance. “Sealed”
packets are plain retained JSON containing class digests and public ephemeral points, not an
encryption mechanism. Absence of one common public digest is narrower than unlinkability:
metadata, small candidate sets and revealed class information can correlate records, while
freshness/reuse enforcement is incomplete. The Lean law equates structured epoch/payload pairs;
its match model defines the masked value to be the class itself. The phase/DLEQ theorems extract
assumed properties, not DDH hardness, transcript completeness or the real arithmetic. Do not
claim the herd token provably never exists or privacy follows solely from different hashes.

The BYO kit exports helpers with transitive repository imports, not a standalone operator
process/transport loop. Invitation validation does not verify a signature, invitee identity or
full epoch policy; version/digest comparisons occur only when expected values are supplied.
Its presence establishes tooling, not an external ceremony. Census derives slot terminals from
stored expected labels and treats all negative cases as export refusals. It is a fixture rollup,
not an independently measured window signal or a differential-privacy release.

Actual parity exercises two token examples and one forged-proof example, not the full ten-code
corpus. K7 inventories core exports, regenerates corpus/attestation once in place and checks two
paths against the index; it does not exercise every export or promised upstream invariant. Reproduce
re-signs Lane A evidence with fixture keys, verifies Lane B through separate tests, skips Lean when
unavailable, and scans two known scalar strings rather than all possible secret material. Preserve
this scope instead of describing immutable external signing or mandatory local proof compilation.
S35 qualifies the ecosystem survey: public descriptions do not reveal every private implementation,
and this prototype supplies no legal safe harbor or organization-endorsed constitution score.

### M112 — Stage 4S validates a supplied tree without establishing complete delegation authority

Completely read the 600-line VDCC specification and 733-line plan, and compared the chain,
tree, fanout, flux and receipt cores, both Python surfaces, attestation CLI/builder, Lane B,
Lean, parity, E2E and reproduction paths. Preserve these frozen design records; this correction
qualifies their implementation claims. The [temporary-input probe](vdcc-verifier-probe.json)
uses real signatures and public fixture keys. It accepts every fanout signed by an unrelated
key with unrelated epoch/run fields, and a zero-count leaf commitment containing a nonempty
child list and arbitrary set root. These are accepted inputs, not cryptographic forgeries.

The core verifies each declared signer but never requires a child's delegator to equal its
parent's delegatee, or a fanout signer to own the referenced node. Key-index labels are not
recomputed from PEM bytes; the bundle supplies that index unless callers override it. Root
self-delegation is a builder convention, not a verified identity constraint. Fanout maps overwrite
duplicate node/window records, ignore unrelated-node commitments after signature checking, and
check only the count for declared windows with no observed children. They do not authenticate
window closure or compare commitment run/epoch to the bundle. Thus signed exact-set checks over
observed nonempty windows do not prove all actual delegations were observed or authorized.
Scope checks compare lowercase labels; they do not derive scope from the executed payload.

Flux sums supplied spends and allocations, without a persistent spend registry or safe-integer
bound. JS numbers are not unbounded Lean naturals. Replaying the same accepted bundle is not
prevented by equality against its own epoch/run. Crossing run IDs and detached-receipt run/root
fields are not all checked. Spine validation tests membership in a caller-supplied string index,
not the signatures or meanings of 4P/4O/4Q evidence; the CLI ignores the proposed `--spine-dir`.
The `win-` epoch prefix tested in K7 is not an authenticated 4N publication anchor.

The Python boundary surface calls the injected verifier on receipts only, omitting fanout and
crossing signature verification, and excludes bundle/spine integrity. Its default refuses
receipts, but supplying a callback does not fill those missing checks. The separately supplied
crossing is not required to be one of the bundle's evaluated crossings. `authorise_with_chain`
does not bind its Action to that crossing or compose the previous authorization entries.
Malformed inputs can throw instead of returning a typed refusal. The standalone parity kernel
also intentionally skips Ed25519. Finite corpus agreement with a signature case excluded is not
cross-language equivalence on all inputs or cryptographic verification by Python.

Lane B genuinely exchanges JSON-RPC messages across two local processes with memory-only keys.
The server co-signs and records the supplied task without validating the delegator signature or
running the chain decision first; the parent evaluates the assembled bundle afterwards. This
is a local protocol demonstration, not pre-execution enforcement, independent operator identity,
remote service execution or proof of all-hop visibility. Root/run/window labels are fixed, no
persistent anti-replay store is used, and the RPC promises have no request timeout.

Public-tier attestation verification recomputes fixture digests, but copies the honest bundle's
claimed Merkle root rather than reconstructing its leaves; engine replay belongs to audit tier.
It uses a separately selected public key, defaulting to the explicitly insecure fixture key,
which is stronger than selecting an embedded key but not an external operator identity.
Unknown tier strings silently take the public path. A producer-signed probe with false observed
outcomes and altered schema/epoch/rails/signer label passes that path; the audit control correctly
rejects the outcomes. Exact top-level schema, claim arrays, epoch/signer label and surplus or
duplicate per-fixture entries are not all validated. No retained signature was forged. CLI
parse/read failures are not uniformly wrapped, and the bundle's own signature is an empty field.

Lean proves implications over abstract booleans, sets and natural-number inequalities, not a
refinement of the executable verifier. Its flux theorem is one local inequality under assumed
child-spend bounds, rather than a formal induction over arbitrary receipt trees. The ghost
trilemma assumes the observed predicates; it cannot discover an entirely omitted crossing.
Raw 104 is exercised through a constructed index rather than an ordinary signed cyclic corpus;
105 has an actual non-sentinel null-parent island fixture. Avoid the source comment's absolute
claim that hash cycles have no fixed points: security rests on computational assumptions.

K7 checks export presence, finite fixtures and selected invariants, not execution of every
export or differential equality of every predecessor entry. Reproduce rebuilds Lane A in place
and compares tracked changes to the index, separately tests Lane B and skips Lean when absent.
It does not enforce network isolation, check untracked evidence completeness or run every K7
assertion itself. Its two inherited key audits are not a general privacy proof. S36 corrects
the prior-art comparison; “unoccupied,” organization-benefit scores and the uncited 84% survey
claim do not establish independently validated novelty or market demand.

### M113 — Stage 4T does not enforce complete fields or bind view commitments to capsule values

Completely read the 625-line VIC specification and 716-line plan. Compared template/census/
projection/view/capsule cores, green builder, attestation CLI, Lane B, browser handlers/parity,
Python parity, Lean and reproduction paths. The [five-case temporary-input probe](vic-verifier-probe.json)
confirms producer-signed acceptance of no projected sections, an undeclared section class with
unsupported prose, and view commitments that contradict the capsule's actual projected values.
The last case passes even when that contradictory view is supplied for evaluation. These probes
use explicitly public fixture keys and do not forge a retained signature. Preserve frozen records;
the broad No Hearsay and No Two Stories claims exceed the implemented checks.

Template validation checks partition keys against snapshot section IDs and rejects invented
projected IDs, but never requires every section to be projected exactly once. Suppression skips
missing projections. Schema checking does not restrict every section's class to the three
states or forbid values on human/absence markers. Projection checks use each field's chosen
recompute kind without enforcing the normative section-to-kind mapping. A signature binds what
the producer asserts, not whether that assertion answers the section's actual reporting question.
A chain verdict is not a chain-of-events narrative, participant count is not a measured number
of affected users, and a count of authored block records is not a complete remedial-action report.
The JSON snapshots are selected heading transcriptions, not full copies of Commission forms,
all subfields or a legally sufficient machine-readable filing. The plan's illustrative headings
were replaced in implementation; its sample lists are not the authoritative pinned lists.

Capsule evaluation does not recompute section commitments from projected values or compare the
capsule root to their root. The view helper compares the view only to the supplied commitment
list; it does not authenticate that list or its issuer. It needs that full list, not just a root.
Its set-union check does not require distinct disclosed/redacted sets, unique entries or exact
redaction-commitment-array length. Disclosure keys are not independently compared to section
identities. Deterministic Lane A salts are public; publishing the full regulator view also
publishes openings. These constructions do not make contradictory publications impossible,
provide anonymity or prove all audiences received the same authenticated commitment.

The census seals a producer-declared set, not an independently observed universe. It checks
manifest-item epochs, not every underlying artifact's epoch, kind or the manifest's own epoch.
Duplicate artifacts collapse in the digest index; duplicate manifest entries are not explicitly
forbidden. An author can omit an event before sealing both manifest and bundle. Only the 4S
verifier is installed in `STAGE_VERIFIERS`; unknown/unconfigured artifact kinds are skipped.
Default direct capsule evaluation uses stored chain verdicts when that verifier is absent.
4O/4U references are not in the green builder's three-artifact census. The 4N anchor is an
authored integer (42 in Lane A, 7 in Lane B), not an authenticated heartbeat inclusion proof or
proof the sealed evidence existed at a public time. Consequently the claimed consent-IOU
retirement, upstream replay and anchored legal deadline inputs are not established here.

The attestation public tier checks its signature, group root and seal only; it does not perform
the promised template/partition/census/section validation. Audit replays supplied Lane A entries
against supplied expected labels, allows fixture `eval_opts` overrides, and does not require the
18-case inventory. A producer-signed empty template/census/fixture attestation with an unknown
schema passes audit. The builder's default Lane B group is null, so the normal attestation does
not seal the separately retained capture. Neither tier verifies that capture or all reference
artifacts. Unknown tier strings take the public path; the CLI does not expose a public-key flag
and emits 0/1 rather than the specification's raw-code process contract. The default verifier
reads a fixture private-key PEM to obtain verification material and hashes that PEM as its key
label. This is a reproducible fixture convention, not public-only external-key provisioning.

Lane B actually records a green 4S delegation, rather than the promised over-scope raw-108
attempt, and authors a blocked-decision row beside it. It is a real local two-process exchange,
not evidence that the capsule prevented an incident. Capture verification does not require the
three named views, compare the top-level recorded verdict to the nested one, or require the
human-input sections to exist before checking them with `every`. Capture is the direct script's
default; only `--verify` preserves the retained capture. No fresh external ceremony was run here.

The browser loads a capsule, recomputes its unkeyed seal and renders declared sections; it does
not authenticate signatures, rerun the capsule engine or export the promised summary. It requires
a capsule before checking a view. Raw fields enter `innerHTML` without escaping; the static CSP
is not a substitute for safe rendering. Browser parity covers a digest example and two views,
not the complete Lane A corpus or visual/browser behavior. Python parity excludes both 134 and
146, not only the signature case; it also lacks all JS schema-list and pinned-digest checks.
Finite parity is not implementation equivalence or a security verifier for arbitrary inputs.

Lean's noHearsay law concerns one typed section; the runtime's unchecked class/coverage gaps
are outside that model. Census exactness proves membership changes for a fresh list element,
not Merkle collision resistance or all duplicate/multiset behavior. The view model directly
assumes equality to the capsule value. K7 checks selected functions/types and examples; its
wrapper test accepts either 150 or 133, and predecessor comparison may be vacuous at a moving
merge base or skipped when no ref resolves. Reproduce rebuilds tracked Lane A files in place,
uses fixed tamper cases, omits the browser parity gate and skips Lean when unavailable. Preserve
these limits alongside the retained full-smoke receipt; neither is exhaustive correctness.
S37 qualifies research and market claims; M41/M47 govern legal scope and dates. No regulator,
insurer, named lab or standards organization has validated the internal benefit/novelty scores.

### M114 — Stage 4U's signed schedule does not precommit payloads or independently establish attack outcomes

Completely read the 470-line VRTA specification and 2,270-line plan. Compared charter, fixture,
finding, dual-signal and main cores, corpus/attestation builders and CLI, both Lane B files,
Lean, reproduction and E2E checks. Preserve the frozen records and their 0/58 result, while
qualifying it as a regression ledger rather than demonstrated absence of bypasses. The corpus
cycles 4S's own case table: eight differential rows are the honest tree, the four `fable_adaptive`
rows are ordinary 4S cases without captured model provenance, and no generator invokes all six
kernel entries, Python differential fuzzing, public/audit gap search or actual hash-cycle forging.
A family label does not establish the promised attack technique was executed. M112's later
probe findings do not retroactively change the signed historical measurement.

The schedule root commits IDs and family counts, not payloads, expected outcomes or execution
time. Charter signatures establish an assertion, not publication before a run. Fixture key names
and endpoint labels are checked without tracing them to all keys/addresses in the nested payload;
these checks are not a sandbox, an externally granted authorization or a no-harm guarantee.
Schema gates admit extra fields and incompletely typed findings/caps. The CLI's engine always
calls the 4S chain evaluator, even for an accepted kernel/parity payload kind or target label.

The [four-case temporary-input probe](vrta-verifier-probe.json) uses producer signatures made
with public fixture keys. Audit accepts altered schema/charter/corpus/manifest metadata, an empty
per-fixture summary and a fabricated over-budget Lane B entry. It also accepts a fixture whose
expected code is changed from zero to 111 while its finding still expects zero and labels the
observed zero survived: findings are matched by ID, not bound to the fixture's expectation,
family or payload digest. An all-`model_refused` set of signed findings, with unusable payloads
and empty per-fixture summary, passes audit with 0/0 ASR. Refusal classification skips the engine
by construction rather than independently proving a model refused. The unchanged charter alone
therefore cannot prevent replacement or suppression of actual attacks under the same IDs.
No retained signature was forged and no model call was made for these probes.

The core recomputes supplied finding counts and rejects missing scheduled IDs, but checks ASR
only when its field is truthy. The main attestation CLI does not validate all summary digests,
schema/epoch, per-fixture completeness or consistency of all signed metadata. Only exact `audit`
selects replay; other tier strings use public semantics. Three key parameters are available,
but findings and attestation use the same fixture key by default: this is two signing identities,
not three independent signers. The CLI's omitted finding-key flag defaults to the repository
fixture path rather than following a custom `--pubkey` as the plan states. Parse/read failures
and direct evaluator exceptions are not uniformly returned through the typed wrapper.

The retained Lane B capture file is absent; successful verify-only execution reports zero
verified entries. There is no completed live campaign or evidence of live refusal prevalence.
The live driver has material limitations: it never increments spend, counts output tokens only,
checks caps before a request without reserving its remaining budget, and does not recheck after
completion. Missing caps are allowed. A cap exception breaks the loop and returns green without
recording the promised breach; offline 123 depends on a caller-provided `capBreaches` list that
the CLI does not derive. Inherited SDK retries may add requests. Thus “hard denial-of-wallet”
should not be presented as implemented enforcement of every cost path.

The prompt receives the attack-manifest root in a slot labeled charter digest, not the actual
charter digest or full signed scope. Captures store a placeholder prompt and first text block,
not the promised signed full provider transcript. Refusal detection uses a small English regex
set instead of provider stop-reason semantics. Live results default to `survived` without local
execution; replay without an expected code sets expected equal to observed, hiding false-green
interpretation. Refusal/disabled entries and missing payloads are copied as outcomes. The capture
wrapper neither signs findings nor automatically includes its file in the offline attestation,
whose Lane B array remains empty unless explicitly populated. Its individual entries are not
verified by the main attestation core. `laneBStats` also counts disabled entries as refusals;
that differs from the spec's model-refusal-only numerator and is not an over-refusal measurement.

Lean's `asrMonotone` proves numerator count monotonicity, with a separate denominator lemma;
it does not prove monotonicity of the ratio. Its charter theorem assumes which gates fire,
and the so-called completeness support checks one schema flag, not schedule/finding equality.
The promised named outcome-disjointness lemma is absent. Python parity covers classification
and rational-count calculations, not engine or signature equivalence. K7 reaches raw codes
using supplied mutations/stubs, including injected cap and engine failures, rather than a live
cap test or execution of every export. Its moving merge-base guard can be vacuous or skipped.
Reproduce compares one rebuilt bundle in a temporary directory, checks index ASR and an epoch
signature tamper, and skips Lean when unavailable; it does not enforce an offline sandbox or
verify every file/index field. Cleanup occurs only on success. The builder's positional flag
lookup can consume the first argument when a flag is absent; use its explicit documented flags.
NIST/MITRE/OWASP references motivate bounded testing, not endorsement of this bespoke charter,
verified compliance, novelty or proof that red teams elsewhere cannot publish reproducible work.

### M115 — Stage 4V derives fixture disputes without establishing semantic correctness or independent due process

Completely read the 730-line counter-capsule specification and 1,926-line plan. Compared the
binding, census, conflict-map and contest cores, green builder, attestation builder/verifier,
both Lane B files, Python parity, Lean and reproduction/E2E checks. Preserve these frozen
records as research designs. Their named due-process laws describe a bounded symbolic model,
not legal adjudication, independent identity, incident truth or proof of fault. The reference
capsule comes from 4T's fixture builder; `reference_capsule_not_synthetic` does not make it a
field incident. M113's omitted-field, view-binding, authored-anchor and upstream replay limits
apply to the capsule recheck here. S38 qualifies the legal and standards rationale.

The [six-case local probe](vdp-verifier-probe.json) includes the unchanged green baseline and
producer-signed mutations using explicitly public fixture keys. An `agree` contest with claimed
value 999 returns AGREED when its evidence recomputes the operator's value 2: this branch ignores
the submitted claim. Replacing remedial-action evidence with participant-count evidence yields
CONFLICT_PROVEN, because the registry kind is checked against the artifact kind but not against
the target section's meaning. The same gap allows irrelevant evidence to rebut a declared
absence. A participant-count contest supplied as `filed_at_beat` returns VERIFIED. Neither that
field nor the anchor contest requires a temporal kind, fixed target or authenticated 4N receipt.
These labels must not be described as independent proof of filing time or reporting timeliness.

The top-level and contest allowlists do not recursively close the payload. Raw prose in binding
and census objects passes the probe; artifact fields and nested claimed values are also outside
that scan. Thus “prose by digest only” is a local field check, not a complete data-minimization
boundary. Binding uses sorted structured tuples, not the specification's sorted slash-string
construction, and hashes supplied PEM text rather than normalized SPKI DER. It inherits the
4T fixture private-PEM label convention. Census checks declared item epochs but not every
artifact/manifest epoch or kind. Referenced-digest checks run after root/epoch checks, so combined
faults need not follow a globally ascending 155–158 priority. Completeness remains relative to
the producer's declared set, not independently observed events.

The conflict map takes normative partition classes even when a projected section carries a
downgraded absence class. A recompute exception can fail the entire contest with 161, outside
the pointwise locality theorem. `expectedConflictMap` compares only the map, not the full outcome
envelope including filing status. The envelope is digestable output, not independently signed
by the evaluator. Direct evaluation without configured stage verifiers uses stored verdicts;
`capsuleEvalOpts` can override the capsule recheck options. Only 4S has a configured upstream
verifier. “Same rules” therefore means reuse of selected census/registry functions, not identical
validation of every operator and respondent assertion.

The public attestation tier authenticates the producer's signature/root/seal without replaying
the contest. Audit replays supplied cases against supplied expectations and options; it does
not require the fixed inventory. A producer-signed unknown-schema bundle with empty fixtures,
null Lane B, empty parity contract and empty honesty ledger passes audit. Lane B verification
is conditional on a truthy capture. Unknown tier names select public behavior. The CLI has no
public-key flag and returns 0/1, not the full raw-code process contract; its audit path generates
the reference corpus using repository fixture-key builders.

Lane B does create a separate respondent process and ephemeral key, but both processes retain
the same user/filesystem authority. Random forbidden-path strings are sent over stdin; checking
that those strings are absent from environment/arguments does not prove file-read isolation.
The child authors a three-participant artifact with stored verdict 108, not an independently
observed conflicting incident. Capture verification trusts embedded keys and recorded blindness
booleans, omits the argv check, and compares the recomputed outcome to a stored hash without
checking the supplied `contest_outcome` object against it. A separate PID is useful provenance,
not proof of a blind external operator. Capture remains the script default; use `--verify` to
preserve the retained ceremony.

Python and browser parity exclude both signature-invalid and capsule-tampered cases. Python
also omits the non-claims equality check and trusts the supplied fingerprint, whereas Node's
public path still authenticates the capsule. Its eagerly evaluated check list and null-value
handling differ from JS outside the fixtures. Browser parity runs an extracted core in Node's
VM, not interactive visual or browser security testing. Lean models classes, booleans and list
positions; it does not prove the JS implementation, signature/identity semantics or malformed
input locality. K7's export-presence check is not exhaustive execution; its signature meta-test
only constrains 152 and 153–160. Fixed-tag freeze checks are useful scope guards, not correctness
proofs. Reproduce rebuilds tracked fixtures/attestation in place, re-verifies retained Lane B,
and skips Lean when unavailable. Historical command paths and incomplete plan snippets are not
current run instructions. The later 4X work is leakage-residue analysis, not the roadmap's
promised novel-attack discovery; retained closeout limitations supersede reserved-slot counts.

### M116 — Stage 4W verifies span metadata without binding the displayed prose to that metadata

Completely read the 496-line VSN specification and 2,981-line implementation plan. Compared
narrative validation, binding, leakage, views, contest adapter, attestation, both drafting lanes,
Lean, parity and reproduction tests. M49's lexical and standards qualifications remain necessary;
the stronger “story cannot impersonate evidence” claim is not supported by the implementation.
Preserve the frozen design, examples and evidence with these dated corrections.

The [seven-case local probe](vsn-verifier-probe.json) changes displayed `participants recorded: 2`
to `participants recorded: 9`, rebinds and signs it with the public fixture author key, and receives
raw 0 while metadata still claims 2. The verifier never compares the selected text to the
recomputed value or judgment digest. A single valid slot can cover the entire 253-byte mixed
narrative, yielding 253 evidence bytes and zero judgment/voice bytes. Thus numeric false quotations
and density inflation are possible without defeating a signature or the registry recomputation.
The “Brigandi” tests change metadata, not contradictory prose inside an otherwise valid span;
they do not demonstrate that fabricated legal citations or quotations are structurally unfileable.
Density is typed-byte accounting and is not an independently verified measure of evidence content.

The narrative evaluator does not reverify the capsule's signature, seal or census. The probe
passes the unchanged narrative against a capsule whose signature is replaced with invalid text.
Callers must establish the capsule's provenance separately, subject to M113. Author and judgment
keys are embedded, with no external identity pin. Judgment digest/signature checks authenticate a
record but do not link its text digest to the displayed judgment. Unreferenced reserved records
skip inner-signature validation. The recursive payload check recognizes specified key names and
an uppercase private-key substring; it does not detect arbitrary prompts, transcripts, secrets
or destinations hidden under other names or in ordinary text. Structural allowlists do not fully
validate all value types; malformed containers can reach wrapper 172 instead of schema 162.

Leakage scanning applies to uncovered regions, excludes every declared span regardless of type,
and reports the region start rather than the exact matching byte. It uses lowercase/ASCII word
boundaries and the frozen English vocabulary, not full Unicode case folding or multilingual
coverage. The capsule-value rule skips strings shorter than two characters; ISO dates are caught
by their digits rather than a dedicated date parser. NFC plus trailing ASCII space/tab cleanup
is narrower than all trailing Unicode whitespace. Cross-region words and semantic paraphrases
remain outside the modeled coverage. A declaration is not a language-level evidence boundary.

`checkMarkerIntegrity` checks only the marker sequence. Altered segment text, density and an
invalid render digest all pass the probe. It does not establish span-ID/type/text agreement or
authenticate the view. Render and density helpers accept content without calling the verifier.
The contest adapter accepts a supplied span and delegates to 4V's status helper without validating
its membership, narrative signature, respondent signature/census or complete counter-capsule
binding. The prose helper simply records its arguments; it does not verify an existing span or
a digest format. M115's agreement and target-kind limits apply. The socket is implemented as
helpers, not a complete independent end-to-end contest protocol.

The public attestation tier checks key/signature/root/seal only, not all structural narrative
checks promised in the spec. Audit reconstructs named fixtures and rejects a changed retained
fixture digest (the probe's negative control), but permits an empty supplied list. It accepts a
producer-signed unknown-schema bundle with no Lane B, empty honesty/parity metadata and invented
Lane C summary fields. Lane B replay checks the narrative and raw code only, not all component
hashes, blindness flags, density or signer-profile consistency. Lane C summaries are not validated
or matched to captures by the CLI. The separate bridge file is not authenticated or loaded there;
only two internal subject digests are recomputed. The bridge is an unsigned in-toto-shaped JSON
projection, not a C2PA manifest, interoperability result or proven Content Credentials support.
Only `--audit` selects CLI audit behavior; the process exits 0/1 and has no custom-key flag.

Lane B uses a committed fixture signing key delivered by the parent, not a fresh ephemeral key.
It invokes the deterministic child twice, supplies the binding and shares filesystem authority;
environment-name and `.pem` argument checks do not establish inability to read other state.
There is no environment-value scan as promised. The child imports the shared canonicalizer,
contrary to the plan's inline/no-import narrative. The reproduce script's “verify-only” header
is inaccurate: both Lane B E2E tests rerun and overwrite the deterministic capture. Rebuilds are
in-place, comparison uses `git diff`, and Lean is optional. No new ceremony was run for this audit.

No Stage 4W Lane C capture directory is retained. The optional runner directly calls the Messages
API, not the promised gateway/MCP path. It never signs a parseable narrative, so signature 163
precedes the intended value/leakage experiment. Missing response content, including an API error,
is classified as refusal without an HTTP-success check. It stores digests only and does not
establish full output replay, token/cost accounting or adversarial success. The capture validator
does not require model identity, narrative digest or exact fields, and cannot authenticate unseen
prompt/completion content. These are unexecuted live-lane capabilities, not measured coverage.

Python/browser parity excludes schema, judgment, payload and signature cases, not just Ed25519.
The browser test obtains the expected attestation digest from the narrative under test; it does
not test an independently supplied digest mismatch. VM core parity is not visual browser testing.
Lean's no-smuggling and locality statements unfold assumptions; disjointness does not prove all
promised bounds, voice filtering proves weight equality rather than evidence-set semantics, and
the adapter theorem equates a locally defined identity wrapper with a copied table. None connects
the runtime text to verified metadata. K7 checks function types and finite examples, skips the
freeze guard if tag lookup fails, and does not execute every export or the promised 4V invariant.
Internal scores, the 2026 reporting-window pitch and broad novelty claims are not external
validation; S39 and M41/M47 supply the appropriate source and legal qualifications.

### M117 — Stage 4X's replay omits ledger completeness and does not establish a semantic lower bound

Completely read the 763-line VLR specification and 557-line plan, including the full tables.
Compared corpus construction/validation, metamorphic transforms, both gates and ledger paths,
attestation core/CLI, Lane B, Python, Lean and reproduction/E2E checks. The retained 6/6 to 1/6
slip result is a measurement on six selected rewrite pairs, not the proposed 24–30-item corpus,
a field rate, a representative adversary distribution or an irreducible semantic lower bound.
The sole remaining phrase is `accounts were exposed`; an added lexical rule could recognize
that phrase. This does not solve general semantics, but directly contradicts the assertion that
no lexical extension can catch this particular residue. “Irreducible” is a historical field name,
not an established impossibility result. There is no live-model lane, as the design discloses.

Authors still select the seeds, transformation functions and labels. Deterministic rewriting
makes the output reproducible, not independent of author choice or guaranteed to preserve a
quantitative meaning. The implementation can apply a no-op transform to a nonmatching seed.
The sole `incident_sourced` item carries the string `reported`, with no source URL, snapshot or
signed source map linking it to a particular incident/Risk Report. The builder checks that the
reference is a nonempty string, not that it is primary-pinned or explicitly qualified. Verification
does not require that reference. The six rows contain no non-ASCII text; a separate smoke test
only checks that a mixed-script string does not throw. Both provenances are present across the
corpus, not in every family. M116 also invalidates the inherited claim that 4W makes fabricated
quotations structurally unfileable. S39–S40 qualify the incident, benchmark and institutional pitch.

The [six-case temporary-bundle probe](vlr-verifier-probe.json) demonstrates that producer-signed
empty outcomes pass audit with a nonempty corpus and 0/0 slip rates. Omitting the sole v2 miss
passes with 0/5. Audit reruns the corpus but compares only the supplied outcome rows; it does
not require exactly one sorted row for every corpus ID. Duplicate rows are likewise not
explicitly forbidden. Public arithmetic describes supplied booleans, not independently observed
results, and outcome/ledger schemas lack the promised strict allowlists and types.

A producer-signed corpus with unknown table/rubric/ruleset IDs, invalid MR/v2 digests and all
coverage families pointing to the same seed passes audit. Coverage verifies only nonempty lists
of existing IDs, not the claimed lexical family actually exercised. The first-hit v1 scanner
means the digit in several canonical witness seeds masks later percent/month/quantifier rules.
All six seeds replaced by `calm`, with unchanged true labels and no-op derived residues, also
pass after rebuilding the ledger and signing. The denominator becomes zero. The verifier checks
label equality to true and membership in family/MR lists, not semantic claimhood, matching family
to MR, catchable seeds or actual transformation. Thus “machine-checkable ground truth” means a
checked author label, and the coverage witness does not eliminate cherry-picking.

The file-based verifier correctly binds the supplied corpus and ledger to signed digests/root;
its binding-refusal control is retained. The exported `evaluateVlr` core omits that binding and
accepts a replacement empty ledger with the original attestation. K7's public-green/audit-red
mutation uses that unbound core without re-signing, so it does not demonstrate the plan's
producer-signed swapped-pack path through the CLI. The CLI performs Merkle checks before schema
and signature, departing from the stated global first-failure order. It uses the unsafe core,
has no directory/key flags despite configurable function arguments, returns 0/1, and treats any
tier string other than exact `audit` as public. The signed attestation's duplicate summary fields
are not all cross-checked to the corpus/ledger; it carries only the parity non-claim, not the full
promised signed nine-non-claim/limitations/socket ledger.

Frozen-gate checking compares the v1 constant digest and two 4W file hashes to live checkout
bytes. It does not authenticate all transitive dependencies (`textCore`, canonicalization), the
v2 implementation or MR closures. The MR digest covers descriptive patterns, not executable
function bytes, and its stored value is not verified here. A producer can regenerate the source
witness after code changes; without an independently trusted baseline it is a declared-code
binding, not proof of historical immutability. Aggregate family provenance uses the first item
in the family and does not separate mixed-provenance counts. Monotonicity is checked on residue
outcomes; no seed-v2 outcome is recorded. The imported-v1 union explains the intended monotonicity
without proving general gate correctness or any reduction in false positives.

Lane B reuses the same implementation in another process. It passes ruleset digests but the
child does not check them; it omits argv/PEM checks, rejects only `OPERATOR_` names (not bare
`OPERATOR`), and inherits the rest of the environment and filesystem authority. Recorded false
flags are parent-authored assertions, not a filesystem isolation proof. The top-level attestation
neither seals nor re-verifies the Lane B capture. Reproduce reruns and writes that capture despite
its verify-only wording, rebuilds tracked artifacts in place, omits the K7/browser E2E suites,
and conditionally skips Lean. Its fixed headline is not a new measured result on arbitrary input.

Python parity covers the six MR/gate/ledger examples and silently returns when Python is absent;
Unicode regex semantics differ from JavaScript outside that corpus. Browser VM parity checks
two rates and a residue list, not all per-family rows, MR/schema/signature validation or interactive
rendering. CSP hashes are checked, but `connect-src 'none'` is not a complete framing/no-exfiltration
proof. K7 does not compare predecessor source bytes or all old exit blocks as promised; it checks
a few constants and source strings. Lean proves defined counts, assumed digest equality and
functional equality; the miss theorem exhibits one zero-integrity-code example rather than
proving every runtime miss is disjoint from every error. The proofs do not establish truthful
labels, complete ledger coverage, independent provenance, semantic preservation or a lower bound.

### M118 — Stage 4Y does not authenticate the supplied audit bundle or enforce complete replay

Completely read the 564-line VDR specification and 625-line plan. Compared all core modules,
fixture builder/verifier, Lane B, Python/browser implementations, Lean, parity/projection/K7
checks and reproduction script. The accepted input is nonempty NFC UTF-8 text, not arbitrary
PDF/Word bytes. A total partition accounts for submitted bytes; it cannot establish that the
submitter supplied a complete original report, preserved its meaning or disclosed all sources.
Literal marker detection covers two declared marker forms, not arbitrary visual redactions or
PDF layers. Redaction precedence is classification, not removal of the underlying content.
The public fixture's redacted `42%` remains literal text in its retained document. The withheld
fixture's text is embedded in the builder source, so withholding its evidence file is a tier
exercise, not confidentiality against a repository reader.

The [seven-case in-memory probe](vdr-verifier-probe.json) retains a valid baseline and a wrong-salt
refusal control. With the original signature unchanged, audit accepts an empty shadow-record
list, a false document digest and false private redaction counts. It never compares the supplied
`audit` object's digest with the signed `audit_digest`. Recompute compares only the rebuilt map,
not the rebuilt audit data. Missing document bytes skip both intrinsic byte checks and map
recompute; an empty shadow list then passes audit. Shadow replay requires six records per supplied
line but not unique MR IDs or every caught line. Repeating nonapplicable records six times passes,
leaving applicable transforms unrepresented. This does not alter the genuine map's headline when
bytes are present, because map recomputation still checks that headline; it does invalidate the
claim that every sealed audit record is authenticated and completely replayed.

Reconciliation skips a missing counterpart, including the intended mismatch fixture. When
provided, it compares class sequences only, not counterpart signatures, bytes, lengths or an
authenticated public/private segment mapping. The clean public fixture's counterpart is copied
from that same map rather than independently derived from its private counterpart. Every built
map has a reconciliation summary, contrary to the proposed null unpaired representation.

The public schema has no strict field allowlist: a producer-signed map with a `raw_document`
extra field passes. Content-free output is a property of the builder, not a verifier guarantee.
Shadow fields are optional in structural checking; zero-byte public maps and adjacent same-class
regions are not excluded there. Shadow arithmetic does not require the promised relationship to
caught-region counts, six transforms or v2/v1 monotonicity. The actual shadow unit is a caught
line, including lines whose matches are redacted, not a colored span or a semantic sentence.
Private caught-inside-redaction counts include fully contained matches, not every intersection.
The default salt is `0`; fixture salts are deterministic and public. Neither construction proves
privacy for low-entropy text or hides the disclosed lengths/classes. Edact-Ray motivates caution,
not a security reduction for this format (S41).

Frozen binding hashes four direct 4W/4X files and compares current digests. It does not cover all
transitive imports, the VDR extractor or historical baseline authenticity. The oracle checks v1
agreement line by line, not whole-document semantic equivalence, v2 agreement or every Unicode
input. No textual label certifies factual truth. CLI verification is a fixture-index harness:
expected negative codes count as passes, withheld audit fixtures are skipped, an empty index
passes vacuously, unknown tiers follow public behavior, and there are no directory/key CLI flags.
It calls the unsafe core and returns 0/1 rather than uniformly exposing the promised wrapper.

Lane B uses the same builder under the same filesystem authority. Passing only PATH and a
scratch document reduces explicit inputs but does not isolate access to repository evidence;
three blindness flags are authored by the parent. The child checks four forbidden JSON keys
and `OPERATOR_` names, not all equivalent paths, argv or bare `OPERATOR`. The ceremony is not
independently signed/sealed into the main attestation, and temporary copies are not removed.
Reproduce's purported scratch rebuild actually overwrites tracked fixtures; the allocated scratch
directory is unused, and `git diff` is the comparison. Python and Lean type-checking may be skipped
with disclosure; the Lean source scan still runs. No new ceremony or capture was run here.

Python implements map construction and digest parity, not the claimed 183 intrinsic-byte checks,
Ed25519 or the complete verifier. It hardcodes fixture provenance and uses Unicode regex rules
that are not generally identical to JavaScript. Browser parity exercises one map plus a valid/
invalid WebCrypto signature, not all fixtures or interactive rendering. Browser public verification
omits Merkle-root consistency and attestation-schema checks; its partition check omits Node's
integer/positive-length and shadow checks. Browser audit is only map reconstruction: no 183,
186 or 187, no audit upload, no fatal byte decoding, and no signature prerequisite. The UI uses
an empty manifest and a salt hint/default `0`, so normal salted/redacted fixtures cannot be
reopened through that interface as designed. It renders unvalidated fields into HTML even on
public failure, and dynamic style attributes conflict with its hash-only style policy. Static
sink scans and VM tests do not establish a complete no-egress/framing or visual-browser guarantee.

The OSCAL helper accepts any map without verification and emits an illustrative fragment. Its
shape test is not NIST schema validation. Required v1.1.2 fields are absent: top-level `import-ap`,
metadata `last-modified`, result `reviewed-controls` and observation `collected` (S41). The fixed
1970 timestamp is not a measurement time. The unsigned map delta likewise relies on caller-side
verification. Lean conservation defines document length as the sum being equated; agreement and
slip containment assume the central property, and determinism is equality under equal inputs.
These are abstract laws, not a refinement proof for runtime byte coverage. K7's export check only
checks defined values, not that every function is exercised. Institutional uptake, novelty scores
and a future external pilot are aspirations; an external pilot is not the only remaining gap.

### M119 — Stage 4Z establishes consistency over producer declarations, not independent capture completeness

Completely read the 573-line VWA specification and 543-line plan. Compared every core module,
fixture/signing/verifier entry, Lane B/C, Python/browser, Lean, system-card and E2E checks. The
[eight-case local probe](vwa-verifier-probe.json) confirms a valid baseline and the useful audit
binding control: changing audit tensors without re-signing is refused at 191. Unlike 4Y, this
stage binds supplied audit data when audit is actually evaluated. However, `{audit:null}` alone
returns `{skipped:true,raw:0}` before schema or signature checking. Consumers must preserve SKIPPED
as distinct from verified; it is not evidence of any valid withheld bundle. Other malformed inputs
can throw during declaration dereference before schema 190; the safe wrapper then reports 198.

The producer can shrink both declaration and capture token counts, remove matching cells, recount
and re-sign; audit accepts it. Prompt counts are compared with another supplied count, not rerun
through a pinned tokenizer over authenticated prompt bytes. The fixture prompt digest hashes its
identifier, not actual text. `all_positions` is not enforced by the evaluator: equal unknown
position-rule strings pass. Duplicate layers create duplicate expected cells, so a producer-signed
grid with duplicate layers/cells also passes. Neither declaration uniqueness nor a nonempty,
properly typed corpus/layer/token universe is comprehensively validated. Completeness is relative
to this supplied declaration, not a guarantee against omitted prompts, positions or layers.

A signed bundle with empty map/capture commitment tables, invalid model/lens digest strings and
an unknown ceremony outcome passes audit while retaining tensors for score recomputation. Reopen
iterates supplied commitments, without requiring one for every tensor consumed by the matrix.
The whole audit object is still signature-bound; the narrower per-tensor completeness claim is
what fails. `validOutcome`, `validateCeremony` and `stalenessReceipt` are separate helpers, not
called by the evaluator. The latter merely copies labels: it cannot prove which model produced
tensors or detect that a probe is no longer effective. The map has no capture digest field despite
the proposed schema, although the top-level signature binds both objects. There is no separately
signed pre-capture declaration or external chronological witness. The anti-post-hoc guarantee
therefore needs stronger qualification than just an operator who backdates a timestamp.

Score generation rejects nonfinite float32 values and unsafe rounded integers, but public checking
does not enforce canonical decimal-string encoding: BigInt conversion accepts more than that
wire grammar. Audit recomputes strings from supplied tensors, not the model, gradients or claimed
capture method. Safe integer range avoids additional integer rounding; it does not confer genuine
nanounit measurement precision on float32 inputs or arbitrary floating-point sums. Decoding allows
empty equal-length vectors, and byte-array conversion is not strict validation of each JSON byte.
The self-report defaults to the builder's own flag count, so agreement need not be an independent
second signal. The signed body does not include the promised non-claims/limitations/socket arrays.

The twelve retained bundles use synthetic two-component vectors, one two-position prompt, two
layers and three tokens. They do not contain the proposed 20-prompt, six-layer, 40–60-token live
capture or d=8 fixture tensors. No Stage 4Z frozen live-capture fixture is present. Lane C leaves
the actual VJP/lens-row computation elided, does not use `out_dir`, and prints ceremony metadata
and counts without persisting tensor/salt files. It can label that partial path `captured` without
producing a usable lens. Seeds, versions and a pre-run signature are not enforced; loading is not
explicitly assigned to GPU or restricted to local cached files. Reading configuration outside the
try block also leaves some failures unsealed. Stage 5B's later completed capture must retain its
own identity; it cannot retroactively make 4Z an executed independent replication (M49).

The VSC projection has only three 4Z aggregate accessors, not the proposed 4T/4U/4X/4Y/4Z registry
or pinned field mapping to the EU Model Documentation Form. Spans have no byte offsets tying them
to narrative sentences; numbers are metadata alongside prose. `verifyVsc` hashes caller-supplied
objects but does not verify their signatures, schemas, kinds or the WFM grid. A fabricated object
containing only `aggregates.flag_total=999` verifies as evidence, and a schema-only card with no
spans or narrative also passes. It does not invoke the complete 4W narrative evaluator, nor sign
or bind a VSC into the VWA attestation. Its lexical prose scan inherits M116's scope. The socket's
PAID constant is an internal bookkeeping decision, not delivery of the specified full transparency
report or evidence that every displayed sentence recomputes.

The browser now checks Merkle binding and three object digests, but omits schema 190 and public
commitment-set equality 193. It has no file/drop handler despite its instructions, as M34 records.
Tests exercise three clean maps, signature corruption and one flag flip in a Node VM, not every
negative fixture, a headless page or request interception. There is no tensor/audit implementation
there. Python implements map reconstruction, not a complete verifier; parity uses three clean
fixtures, with the canonical torture case compared only between JS and Python. It does not prove
arbitrary cross-runtime equivalence, and Python absence is a named skip.

Lane B checks one synthetic fixture through the same implementation, inherits the environment
and filesystem authority, and leaves its scratch copies. Input-key and `OPERATOR_` rejection do
not prove host isolation, independent custody or blind human recomputation. Its ceremony is not
included in the signed attestation. The CLI trusts index-supplied expected outcomes, permits an
empty inventory and skips any expected SKIPPED row without loading its bundle. It has no directory/
key flags, invokes the unsafe core and returns 0/1. Unknown tier handling differs between its
expected-code selection and the core's audit gate. Reproduce rebuilds evidence in place despite
verify-only wording and does not run Lean; separate CI proof checks have their own scope.

Lean's grid conservation is definitional arithmetic, not uniqueness over runtime cells. Matrix
rows copy a lexicon in an abstract model; threshold/monotonicity/conflict laws operate on natural
numbers, not signed nano strings, tensors or authenticated captures. Code-list inclusion does
not prove the runtime public/audit paths are equivalent or even executed on missing audit data.
K7 checks fixture outcomes and constants rather than every export. Public scores and deterministic
fixture commitments also have no proved confidentiality guarantee. S42 qualifies the research
rationale; scores, first-in-field assertions, institutional adoption and a single remaining lab
pilot blocker are unsupported as production/readiness conclusions.

### M120 — Stage 5A permits evidence omission and recounts duplicate flags as extra observations

Completely read the 631-line VNC specification and 627-line plan. Compared all core modules,
green/fixture builders, CLI, Lane B/C, Python, browser verification, Lean and parity/K7 checks.
The [eight-case probe](vnc-verifier-probe.json) retains a valid baseline and refusal of an unsigned
ledger mutation. It also demonstrates that adding a duplicate unnarrated flag, recounting and
re-signing increases the reported total from four to five while audit passes. Coverage compares
sets, but the tally counts list entries; the evaluator never calls the helper's cardinality
identity check. Unnarrated entries are neither required unique nor checked for canonical order.
Thus the promised exact partition arithmetic is not enforced by the full verifier.

Removing the invalid optional manifest from the retained manifest-tamper fixture passes under
its original signature, even though the attestation still declares that manifest's digest. The
binding check validates optional data only when supplied; it does not require every signed
optional digest to have a supplied artifact. Removing pilot raw bytes and embedded VWA audit data
also passes audit unchanged. VWA then runs public verification, and pilot source reopening is
conditional on bytes being present. The result reports `pilot:present` but no `vwa_audit` or
source-replay SKIPPED status. An absent artifact is surfaced at the top level, yet a removed
signed artifact and a never-promised artifact are not distinguished as the design requires.

Claim validation does not enforce the two-value polarity enum: an unknown polarity is treated
as `asserts_flagged`, and the probe changes the conflict into corroboration with consistently
rebuilt signatures/ledger. The malformed token ID `01` is accepted as an unreadable claim rather
than a schema error. A standalone parser rejecting that spelling is not equivalent to the
pipeline rejecting it. Token mapping and polarity are operator assertions without a check against
the sentence's meaning. In fact, the headline `eval_awareness_conflict` fixture points to the
existing 4W voice about user trust and regret, not the advertised denial of evaluation awareness.
Its synthetic numeric token IDs do not establish a real evaluation-awareness lexicon. An empty
claim table is valid by design, so declared completeness must never imply complete extraction.

The global scope's claimed one-directional conservatism also needs qualification: additional
unrelated-prompt flags can corroborate an `asserts_flagged` claim even when the named task had no
such flag. Antitonicity is only about the restricted denial rule with fixed vocabulary/scope,
not arbitrary added evidence or semantic disagreement. The plan's ban on a field named
`map_digest` does not stop the author from seeing the map before signing, encoding it elsewhere,
or selecting claims post hoc. The fixture builder itself creates the VWA map before assembling
the signed claim table. Signatures bind the supplied choices, not chronology or independence.
Embedded narrative keys prove possession only; accepting a producer's re-signed, rebound story
does not establish the author's organizational identity. Narrative capsule/leakage verification
is deliberately omitted, and M119's VWA declaration limits propagate into this stage.

Pilot conformance compares two authored lossiness lists, not a reconstruction from raw export
fields. It does not validate the pilot's map-attestation digest, adapter role/version, source
identifier or every synthesized field. A producer-signed invalid pilot map digest and `publisher`
role pass the probe. The fixture's supposed foreign export is a literal placeholder string;
its map is generated by the local two-dimensional-vector builder and signed with the 4Z fixture
key, not a downloaded Neuronpedia artifact signed by the proposed adapter key. The external
adapter CLI and constitution-snapshot manifest CLI named in the plan are absent. No actual
external export, licensing receipt or organizational pilot was completed at this stage.

The reflection manifest hashes three placeholder example strings and two placeholder clause
strings. Its corpus title/date/license are labels, not a retained CC0 source snapshot or proof
of training provenance. The Merkle root commits example digests only, while the outer attestation
commits mapping metadata. Full-manifest validation checks that root, nonempty principle lists
and registry digest syntax; it never calls the inclusion-proof verifier, checks proof records,
reopens source/example bytes or establishes semantic principle attribution. Duplicate examples
and vacuous empty-corpus mappings are not explicitly excluded. Optional artifact signatures are
not separately verified; outer digest binding is the authentication mechanism when present.

Lane C is a printed six-step runbook: `--dry-run` performs no synthetic end-to-end capture, and
normal invocation exits 2. It neither generates a real narrative/readout pair nor seals either
real capture outcome. Therefore the specification's repeated executed-capture and paid-pilot/
open-corpus assertions remain unfulfilled here. Mechanism demonstrations and constant-array
socket counts do not retire those data-run obligations. Later 5B evidence has its own scope.
The VNC attestation body also omits the promised signed non-claims and limitation arrays.

Lane B reconstructs one locally generated fixture using the same implementation and the same
committed private fixture key imported from the green builder. It inherits the full environment
and filesystem; checking a few raw substrings/`OPERATOR_` names is not an isolation boundary or
independent ceremony. No signed Lane B receipt is bound into the VNC attestation. The CLI does
support `--id`/`--path` and raw exit codes, but pins fixture keys through a module that also reads
private fixture material, offers no key override, and calls the unsafe core. Unknown tiers follow
public depth. Its `--all` mode is an expected-outcome fixture harness, not an inventory-independent
submission verifier; empty indices pass vacuously.

M34's browser mismatch remains: the page verifies a top-level signature against a bundle-carried
key but does not bind the supplied objects to signed digests, check the signing-key digest/Merkle
root, authenticate nested artifacts, or run schema/precommit/manifest/adapter checks. The computed
digest list is unused. It runs verdicts before coverage, contrary to Node order. The seven clean
VM examples, one verdict mutation and one valid signature do not establish every-fixture parity,
network request interception or visual browser behavior. Python reconstructs ledger content over
seven clean/pilot/RCP fixtures, excludes signatures and has no RCP inclusion implementation.
Its token/key handling also differs outside that corpus; reproduction may skip it when absent.
Reproduce rebuilds tracked evidence in place and does not invoke Lean. K7 mostly checks export
types, fixtures and constants; its monotonicity example merely duplicates one flag. Lean proves
abstract length/filter/count laws, not runtime uniqueness, optional-input binding, sentence
meaning or real capture. S43 corrects the source dates and measurement framing; this stage is
neither an introspection benchmark nor proof of legal compliance or first-in-field adoption.

### M121 — Stage 5B does not authenticate its capture or enforce replayed finding truth

Read the complete 351-line specification and 490-line plan, then compared every core module,
charter/corpus/fixture builder, verifier, capture harness, Lane B, Python, browser, Lean,
reproduction and parity/K7/real-capture tests. The retained
[VAR probe](var-verifier-probe.json) has eight local cases including baseline and refusal control.
Replacing every recorded target code with `999` passes audit under the original signatures,
including through the CLI's exported verification function after replay. Replacing the entire
capture with an empty tensor table and its matching unsigned root also passes unchanged.

The attestation signs aggregates, a slip table and campaign digest, but the verifier does not
bind the campaign digest to the supplied charter, findings to individual signed leaves, or the
capture/binding to a trusted signed root. Capture reconciliation compares two supplied objects;
its sorted root does not bind tensor names. It ignores stored commitment tables, capture-root,
model/lens metadata and actual tokenizer coverage. Ceremony validation is mainly nonempty-field
checking and declaration-string equality. Consequently it proves neither adversary independence
nor continuity with the retained real capture. The fixed-root test protects one repository
fixture, not arbitrary bundles. Self-supplied signing keys establish possession, not trusted
operator identity. Excluding two field names from the charter cannot prove signing preceded
capture access, and the builder loads the capture before constructing its charter.

Audit replay checks only whether a replayed zero-result ID is absent from the findings. It never
compares the replayed code with the recorded code for an existing ID. The probe supplies a real
zero in replay for an existing `survived` finding and still passes. Self-target cases copy the
recorded code instead of replaying; core audit without `drivenResults` skips replay altogether
without a SKIPPED result. `model_refused` and `lane_disabled` labels can accompany zero codes and
exclude them from the denominator without verifying their provenance. Re-signing aggregates
with all 46 outcomes relabelled `model_refused` produces an accepted `0/0`, even with all zero
replay results supplied. That string denotes no scored attacks, not measured zero risk.

Partition checking correctly rejects duplicate/missing IDs relative to the supplied charter,
but production verification does not supply the canonical family-count constraint. Counts,
caps, family/target correspondence and mutation content are not fully validated. The manifest
commits derived IDs, not the attack bytes or mutation operations. The claimed broad schema gate
checks only a few artifact tags and finding field types. A truthful new bypass also conflicts
with the fixed exact `known_limitations` list: adding the promised ID/severity disclosure makes
campaign validation fail. The severity helper's substring match is weaker than a typed mapping.
Thus the design's “found bypass is content, not verification failure” flow is not implemented
end to end with the frozen list.

Of the 46 entries, eight repeatedly relabel the same synthetic 5A conflict, six repeatedly alter
a capture tensor, and the other 32 flip target signatures. The named paraphrase, cell-hiding,
span-forgery and backdating families do not implement their semantic descriptions. Most targets
use prior synthetic fixtures rather than the real capture; repeated IDs do not make these
independent adversarial trials. The integrity helper compares against the same driver's replay,
not independently specified expected codes, and the fixture builder does not invoke that helper.
The published `0/46` therefore supports deterministic mutation coverage only. The spec's “52”
fixture count and references to family eight are inconsistent with seven families and 46 entries;
`self` is outside its declared six-stage enum. Uppercase `VAR` is not a JavaScript reserved word.

The floor helper reads 4X's recorded numerator without verifying its signature or recomputing
its ledger; 4Y's floor is the literal number two. Raw counts from different corpora are not
comparable slip rates or a demonstrated lower bound. The verifier accepts an empty `floors`
object under the original signature, never reconciles it with the signed slip table and allows
caller-declared `new_finding` flags. Zero observed semantic slips from signature attacks cannot
retire the semantic cross-gate benchmark obligation. Socket counts and “full payment” labels
remain historical project accounting, not independent scientific completion.

The retained 18-tensor CPU capture and reported two-run equality have the narrow M49 scope.
The Python capture completes a last-position VJP averaged over the benign corpus, with zero
rows for unused gradients; it does not perform the proposed same-session narrative generation.
The wrapper remains a printed runbook whose non-dry invocation exits 2, and its “not executed”
message is stale relative to retained capture evidence. Model loading does not enforce offline
cache mode; configuration parsing precedes the exception handler, and a captured failure is
printed JSON rather than a signed failure attestation or necessarily nonzero exit. Neither
byte equality nor the harness establishes independent custody, cross-hardware reproduction or
frontier-model introspective faithfulness. The live-adversary lane remains deferred.

Lane B uses the same tally/floor implementation in a temporary working directory with a reduced
environment, but retains filesystem access to the repository. It neither reconstructs a
partition nor authenticates input findings; its CLI compares ASR only, not all aggregates or
floor reconciliation. The child checks forbidden strings in arguments, not input-file content.
No signed ceremony receipt binds it into the bundle. The verify CLI parses only `--tier`, ignores
`--all` and `--path`, reads the one committed bundle, and calls the unsafe core; the exported
function supports a path. Unknown tiers reduce depth. These are not the planned all-code fixture
index and configurable submission verifier.

Python implements only tallies/ASR/floor over one retained bundle, not the promised Merkle,
partition, classification and canonical modes. Browser verification checks a self-key signature
and ASR only: no charter, partition, full tallies, capture, floor or replay. The VM tests cover
one clean bundle and aggregate tampering, not real-browser/no-egress behavior. K7's export check
asserts defined values rather than calling every function; its “both tiers” test calls public
only. Lean proves abstract counting, membership and Boolean implications, without the promised
ratio/zero-denominator theorem or cryptographic/runtime refinement. Reproduction rebuilds
tracked evidence in place, can skip Python, and does not run Lean or every prior stage. S44
qualifies the external measurements; legal and standards claims remain subject to M41/M47/S38.

### M122 — Stage 5C completeness is conditional and severity is a digest label

Read the complete 555-line specification and 538-line plan, then all core modules, builders,
CLI, Lane B/C adapters, Python/browser, Lean, parity/K7 tests and reproduction script. The
[eight-case VSB probe](vsb-verifier-probe.json) demonstrates accepted producer-signed extra
slips, duplicate rate rows, invalid base digests/reduction declarations, null Lane C metadata,
an empty corpus and a no-text audit with all slips hidden. The baseline passes and an unsigned
mutation correctly fails signature verification. These are documentation findings, not fixes
to frozen runtime code.

Node's silent-slip check requires each slipped grid ID to appear in the table, but does not
require the reverse inclusion, uniqueness or matching mechanism/version metadata. An invented
extra slip therefore passes audit. Rate validation checks row count and each supplied key but
not unique key coverage; copying one valid rate row over another hides a group. Grid coverage
is relative to supplied bases and optional caller-supplied MR IDs, with no independent corpus
commitment, nonempty requirement or unique-base validation. An empty corpus is accepted. This
is weaker than the advertised exact projection over a frozen campaign and cannot establish
that an operator submitted every relevant base or mutation.

When raw base texts are absent, mutation, verdict and class-correctness checks are skipped
without a named SKIPPED result. Normally audit's floor check then throws on absent texts;
removing the floor rows avoids that path. The probe relabels every cell caught, clears slips,
recounts rates and removes floor rows; this passes `tier: audit` with no raw texts. Thus the
promise that audit necessarily recomputes the whole grid is false. Unknown tier values follow
public-depth behavior. Supplied raw text enables important checks, but its digest is not
compared to `base_text_digest`. The ruleset ID, reduction declaration, predecessor gate digests,
campaign label and fixed non-claim/limitation contents are not validated. The ruleset hash
covers relation cards, not executable transform/gate source; its imported-slice witness is not
a source-byte or transitive dependency witness. Equivalence-basis checking validates only enum
membership, not the correct basis for each MR or semantic preservation.

The nine slips occupy 54 grid cells: 19 caught and 26 degenerate, so the aggregate evaluated-cell
fraction is 9/28, not 9/54. Published rates group by mechanism and MR family, not version;
zero-scored groups are omitted rather than emitted as a guarded 0/0 record. All retained bases
use version v1. The floor helper separately compares leakage v1/v2 over the older-flagged domain,
where subset monotonicity follows from construction; it does not establish an irreducible
semantic lower bound. A digit-removing rewrite or the supposed voice-flip rewrite can change
quantitative meaning. The six authored ASCII base strings are analogous fixtures, not a replay
of every predecessor corpus or Gemini probe; only mutations introduce the advertised Unicode
geometry. Document-residue reuses the leakage lexicon and is not a semantically independent
detector. M49 already corrects the “first non-zero result” claim: 4X/4Y had nonzero residue.

`blindSeverity` selects an enum bucket using the first digest nibble modulo four. This is a
content-free deterministic fixture label, not human or model analysis of consequence. The
parent builder calls it directly; the subprocess repeats the same function. Its binding hashes
IDs and labels but omits the mutated-text digest and independent child identity. A producer can
rewrite labels, recalculate the binding and sign consistently. Child inputs contain informative
base IDs, extra input fields are ignored, and filesystem access remains available despite an
environment scrub and PEM-argument guard. There is no sealed input-profile receipt or proof
of adversary-independent judgment. Byte consistency of a label is not severity correctness.

Lane C checks field presence, not digest syntax, threshold range, model provenance, log bytes
or reconstruction. The orchestrator does not even require `audit_private_log_digest`, unlike
the separate adapter validator. All required values can be null and pass. It has no implemented
private-log audit path or external-detector dispatch in the grid reducer. The Prompt Guard
function requires caller-loaded model/tokenizer objects; running the file exits with an example
message, and the planned `run-vsb-lanec.py` is absent. The closeout correctly records no actual
capture. “Itemize and externalize” payment is therefore only partially implemented at this
stage, and neither real-detector performance nor contamination freedom follows. Pinning a
threshold alone also cannot make arbitrary inference deterministic.

The anti-overclaim gate screens ten literal substrings in `analyst_note`; it can flag negated
mentions, misses paraphrases, accepts nonstring notes, and does not police the other signed
free-text surfaces. Its symbolic kernel-disjoint theorem assumes the separation it proves and
is not a runtime integration proof. The signature binds content to a bundle-supplied key, not
a trusted organization. The CLI verifies only the committed green fixture at both tiers,
ignores submission flags and exits 0/1; separate corpus/full-negative-fixture builders described
in the plan are absent. The K7 tests exercise code reachability and a predecessor diff, not
every export or complete malicious-input behavior.

Python and browser do not port `applyMR5C`, reproduce source witnesses or rerun gates. They
check classes/arithmetic over supplied labels; their set-equality slip check is stronger than
Node's one-way check, while browser rate checking lacks total-row coverage. The browser has
no CSP meta tag or shipped CSP injector despite the plan/comment, and its two VM cases do not
establish the proposed Chromium smoke or network isolation (M34). Lean proves product length,
not pair uniqueness for duplicate input lists; projection completeness is definitional, and
the rate lemmas prove denominator/numerator facts rather than a signed-runtime ratio. There
are eight theorem declarations because the rate obligation is split. Reproduction rebuilds
tracked evidence, runs the finite tests, and scans Lean while explicitly skipping type-check
when unavailable. S45 corrects source dates and positions research comparisons as bounded
related work, not independent endorsements or conformance to 2026 standards.

### M123 — Stage 5D omits required audit checks and classifies declared hardening labels

Read the complete 310-line specification and 281-line plan, then the core, builders, verifier,
API runner/BYO helper, Python/browser, Lean, parity/K7 and reproduction code. The
[eight-case VARL probe](varl-verifier-probe.json) retains baseline and signature-refusal controls.
Audit accepts a missing private log under the original signature. Producer-signed empty source
registries, contradictory attempt/round commitments, false durability descriptions, unknown
meaning classes and malformed UTS-39 outcome fields also pass.

`checkAuditPrivate` returns success for `undefined`, contradicting the explicit missing-log
refusal requirement. When supplied, it authenticates the log hash and checks that logged round
numbers occur in the ledger. It does not compare attempt counts, per-round digest sets, individual
evasions, transcript hashes or the reverse round inclusion. The retained “private” log is a
publicly committed, generated 18-attempt summary containing only round numbers and transform/
literal labels, not the original attacker conversation or a separately signed watcher receipt.
The documented signing-time omission caveat is necessary but insufficient: even required input
presence and the declared per-attempt bindings are not enforced. Re-running a stochastic
ceremony can reveal more examples but cannot prove that a historical transcript was complete.

Source validation loops over submitted registry rows without requiring coverage of used gates;
an empty registry passes. The v1 file list omits its own dispatch module and the imported
canonical helper, so “every transitive module” is too strong. v3/v4 hash the same listed source
set; gate-version dispatch still matters. Neither runtime Unicode data nor all recipe code is
pinned by those hashes. Schema checking limits top-level names but does not require the full
promised field/type set or fixed ruleset identity. Embedded public keys prove signing-key
possession, not independent actor identity or human review.

Recipe reconstruction and target-verdict recomputation work on supplied public bases, but do
not require each base to have been flagged, unique evasion coverage, a clear target result or
unique base IDs. The implementation's confusable operation uses indexed `replacements`, not
the plan's `map`; positions apply to the current intermediate string, not necessarily the
original base. Argument validation is partial, and a literal recipe can replace the entire
meaning. `human_reviewed: true` is a producer assertion; reviewer identity is neither required
nor authenticated. Changing the class to an unknown string bypasses the review condition.
The anti-overclaim substring screen covers only the top-level analyst note and is neither a
semantic classifier nor proof that the remaining statements are justified.

Closed counts are per rung, not cumulative 6/12 totals; an open rung skips the count check.
The residual check requires any nonempty value for every rung, rather than the proposed iff
relationship to remaining exact-preserving misses. Durability is computed from caller-declared
`rule_kinds`, without comparing those kinds to the actual hardening code. Relabelling v3's
closing rules as property-only changes its accepted status to durable. The finite monotonicity
helper compares counts, not caught-set inclusion, and is not called by the full verifier.
Neither a rule label nor a nondecreasing count proves permanent closure under arbitrary future
inputs or Unicode releases.

The trilemma evaluates two confusable strings and one legitimate-diacritic sentence for A/B;
C is a declared row with no skeleton implementation. Only C's `fixed:false` and
`declared_only:true` are checked, so malformed other axes pass. The prose argument that adding
Latin-1 to ASCII necessarily admits Latin Extended-A is incorrect: U+0131 lies outside Latin-1.
A fixed version of a confusable table is possible, and properties themselves depend on Unicode
version data. These facts do not remove the observed tradeoffs, but they invalidate the leap
from three examples to the only possible separator or an irreducible semantic ceiling. S46
separates normalization stability from confusable-skeleton versioning.

Public evidence includes raw benign bases and literal evasions, not just digests. The API
provenance record is generated from fixed strings and a declared model/org; its response digest
is compared with the first matching base ID across rounds, not a unique request/round/response
receipt. The request digest is only the base sentence. Preserve the historical execution report
as such; current verification does not independently establish provider provenance, model
version or CVP authorization. Lane B is a documented historical two-role protocol rather than
an executable isolation harness. The BYO helper checks a sample Boolean return and source hash;
the evaluator still uses its local gates, with no external-detector replay dispatch.

The live runner operates one base against v1, not the three-round defender-hardening cycle.
It prints plaintext benign candidates, retries caught outputs, treats empty text as potentially
clear, and does not inspect provider refusal signals before deciding whether to continue.
Exhaustion combines refusal and no-slip into one message and exits zero; API exceptions are not
sealed as signed outcomes. Attempt settings are unvalidated, SDK retries are implicit, and
there is no monetary cap or automatic evidence integration. These are reasons to describe its
limits accurately, not authorization to run it during this documentation audit.

Python reconstructs 18 recipe digests and log hashes only; it does not implement watcher gates,
closure/residual/durability/corners or signatures. Its Unicode-digit and position semantics also
differ outside the fixtures. Browser verification covers signature and evasion digests only,
yet displays “raw 0 (public surface)”; it omits the other public checks and has no CSP. Its error
HTML is unescaped. The parity test executes a copied recipe function, not the actual page or
WebCrypto handler; manual browser execution is not established by those tests. Lean proves
facts about literal counts/rounds/strings and an enumerated corner table, not runtime correctness,
set inclusion or the proposed interleaving argument. Its empty-rule durability definition also
differs from JS. Reproduction compares only the rebuilt ledger hash, not every emitted file,
and explicitly permits a Lean type-check skip while scanning sources. M49's bounded historical
execution and external-validation qualifications remain applicable.

### M124 — Stage 5E score and review bindings do not establish the full claimed provenance

Read the complete 391-line specification and 387-line plan, including a repeated read of the
truncated evidence-lane section. Compared the core, capture/build/verify paths, BYO adapter,
Python, Lean, K7 and reproduction/conformance scripts. The
[eight-case VDA probe](vda-verifier-probe.json) confirms working external-key-pin and missing-
census refusal controls. It also shows accepted producer-signed recipe substitution, omitted
curves/false census, malformed detector metadata, duplicate score rows and an unrelated signed
review used for an equivalence claim. No capture or model call was performed for this review.

The new external fingerprint is a useful verification boundary, but the retained key is a public
fixture key and its pin is regenerated alongside evidence. Deployment requires an independently
trusted pin; a checked-in fixture key does not establish human/operator identity. Score-table
entries reopen their own generated text and carry runtime/snapshot equality checks. However,
evasion records resolve scores by the first `(base_id, variant)` match, not their generated-text
key. Their recipes/digests are not reconciled to that entry. Replacing an evasion recipe with an
empty recipe passes audit while retaining its old low score and census digest. Base-text and
recipe digest fields on score entries are not independently checked. Duplicate entries and
unrecognized variants are not excluded; duplicate raw entries can inflate flagged counts while
the attempted-base denominator still deduplicates IDs.

The detector gate checks presence of several fields and the selected label's spelling, not a
real model/commit, hash syntax, binary class count, exact precision, score field or complete
runtime manifest. Empty revision/tokenizer strings and an invented model name pass when
internal equality is preserved. The main verifier does not reopen weights, tokenizer files or
capture-script bytes. The builder's sentinel test is an accidental-placeholder guard only;
`captured_offline` remains a producer declaration. The optional BYO validator is not called by
the core. Attester consistency establishes membership of a declared digest, not a provider
request/response chain.

Review signatures are checked against the supplied reviewer key, but their signed base/variant
digests are not compared with the evasion, their wrapper digest is not recomputed, and schema,
reviewer identity and criteria contents are not pinned. The probe signs an unrelated review
with deliberately wrong text digests and selects it by an arbitrary alias; the strong claim
passes. The retained fixture does not itself carry positive reviewed-equivalence claims, so
this is a limitation of the proposed extension, not evidence that a real human review occurred.
The structured enum limits vocabulary but does not bind every allowed summary claim to an
observed result, and the public-completeness disclaimer can be changed to false without refusal.

Audit correctly requires and hashes the census, but trusts each row's disposition and checks
only membership of rows labelled `evasion_slip` in the public evasion-digest set. It does not
rederive dispositions, compare complete base/recipe/score tuples, require a canonical schema
or reject omitted rows before signing. The retained census has base/digest/disposition rows,
not every attempted recipe and score reference promised by the plan. The independent baseline
census is not recomputed at verification. Accordingly M49's measured headline remains four
baseline misses plus four baseline-flagged cases that slip among eight attempted bases, not a
population estimate or a no-selection-bias guarantee.

Both threshold curves may be empty. Supplied points are checked against the table, but the
frozen complete/unique grid, required ordering and reference-threshold inclusion are not
enforced; the builder actually uses descending thresholds. False-positive probes are separately
supplied scores without capture-input/provenance reopening. Five benign sentences do not
establish a deployment FP rate or recommended threshold. The predicates are distinct but
logically dependent: threshold crossing implies score inversion, so “independent booleans”
must mean separately recorded, not logical/statistical independence. The computed inversion
compares evasion with raw scores, not the de-obfuscated score. A score change alone is neither
semantic equivalence nor downstream attack efficacy. The illustrative spec curves also use
non-four-decimal, descending values and an extra Markdown table delimiter cell; they are
historical pseudodata, not valid import examples. Their inconsistent requested-versus-resolved
revision wording is superseded by the implementation's resolved-commit equality.

The capture harness calls model/tokenizer loading and `snapshot_download` without `revision`
or `local_files_only`; it can load moving defaults and resolve a separate snapshot afterward.
It therefore does not enforce the promised pinned/offline run. The recorded commit is
`a8ded8e697ce7c355e395a0df51f94adb4a2fd27`; that label alone does not prove the loaded bytes.
The weight manifest checks two named files and silently skips missing ones, rather than all
shards. Dependency hashes, CPU/backend details, tokenizer special-token policy and corpus hash
are absent. The host class is a literal string. Positive-class selection is inferred from two
probe outputs and its label map synthesized, not captured verbatim from configuration. This
needs to remain explicit even though the retained selected class agrees with the documented
binary interpretation. Four-decimal rounding and one thread do not themselves prove repeat-run
or cross-hardware equality. Python normalization removes marks but not every JS default-ignorable
character; parity is scoped to the retained CGJ recipes. Capture failure does not emit a sealed
failure artifact.

The base gate accepts arbitrary printable ASCII under its character limit, not an allowlist
of published corpus strings with source citations. It rejects literal evasion ops outright
rather than validating derivability; other replacement ops remain broadly configurable, and
score-entry recipes are outside that gate. Generated scripts/NFKC constraints and token-length
coverage are not fully checked. A 512-character bound is not a 512-token guarantee, so truncation
can affect what the model saw. These are contract limits rather than evidence of a harmful
payload in the retained benign fixture set.

The shipped CLI names are `build-vda-evidence.mjs` and `verify-vda-attestation.mjs`; verification
reads the fixed local bundle/pin/census and exits 0/1, with no arbitrary-path/reviewer-key options.
Lane B remains a runbook. No Stage 5E browser verifier is shipped, despite the planned browser
parity/manual smoke. Python checks a subset of recipe operations, score-table hashes and
arithmetic over retained scores, not signatures, full type/range validation or census completeness.
K7 mainly checks export types and representative mutations. Lean's curve examples use literal
counts `[2,1]` and scores `[9,6,3]`, not the captured table; joint binding is a pair-equality lemma,
not a cryptographic implementation proof. Reproduction rebuilds in place and checks only the
attestation hash, not all emitted files; Lean type-check may be explicitly skipped. The nested
conformance runner assumes an exported package layout and does not run directly from its
repository subdirectory. M49 preserves the historical external verify-only report and missing
repository receipt boundary: it is not independent detector recapture. S47 corrects the primary
model-card and capture-contract interpretation.

### M125 — Stage 5F verifies a declared grid, with incomplete capture and ceremony binding

Read the complete 665-line specification and 422-line plan and compared all core modules,
builders, CLIs, Lane B/C paths, Python/browser surfaces, Lean and reproduction tests. The
[eight-case VMP probe](vmp-verifier-probe.json) retains baseline, signature-refusal and missing-
replay controls. Producer-signed unrelated shared-input digests, contradictory census rows,
a nonexistent ceremony receipt, an empty applicability matrix and an unsubstantiated reference
binding all pass audit. These observations qualify `full_panel_completeness_verified`; that
field does not establish the full specification's capture-completeness contract.

The nonempty unique roster/corpus and exact member-by-case cell grid are checked, as are supplied
plan digests, typed labels, declared completeness and the universe-relative omission count.
This is useful structural validation. The universe is producer-selected, however; the placeholder
third candidate is not an independently inventoried detector. Its omission count is neither a
population coverage bound nor representativeness. Capability values and applicability coverage
are not fully validated: an empty matrix passes, duplicate entries overwrite earlier entries,
and only token-length unsupported cases are implemented. Language/type entailment remains absent.

The schema gate is exact for several named objects, but not recursively exact for cells,
decision evidence, precommit/closeout, bootstrap records, label maps or capture metadata. Only
the four forbidden aggregate key names are recursively screened. Additional labels/fields can
carry arbitrary content. Case IDs are checked, but a cell's `shared_input_digest` is not matched
to that case's committed source digest. Attempted detector-input digests are compared with a
supplied replay dictionary. The CLI reads that dictionary from disk; it does not invoke the
planned pinned tokenizer replay, validate an environment manifest or reopen adapter bytes.
The BYO builder copies cell digests into this dictionary and assigns every token count 10.
Missing entries fail with 282; supplied agreement is not proof of actual input derivation.

The chain implementation has exactly two records, precommit and closeout. There is no result
record sequence or file manifest. The receipt reference need only be a string and correctly
included in the closeout hash; the main verifier never opens/verifies the receipt. The separate
Lane B verifier checks its signature, external pin and five recomputed bindings, but both
construction and verification use JS; the planned independent Python ceremony is absent.
Five acyclic bindings are intentional: adding the proposed sixth full-content digest would
reintroduce the cycle through closeout. The real-capture builder discards the returned receipt,
so its retained pack cannot be described as a verified two-key ceremony. Recorded precommit
ordering remains a data structure, not evidence of physical pre-run commitment.

Audit binds and compares the sets of terminal record IDs, but does not reconcile their member,
case, input or status fields with public cells. It does not carry/check a separate complete
attempt log, unique attempt IDs or retries. A signed census that calls every public evaluated
cell `missing_capture`, with no attempt IDs, still reports audit/full completeness true. This
is not a no-omission guarantee over actual execution. The softmax check uses exact four-place
lexical comparison, but does not establish actual class probabilities or validate the entire
binary label mapping. Categorical checks only constrain the normalized label and require digest
strings; they do not reopen a pinned parser or raw output. Unknown status-specific fields and
several promised forbidden fields are not excluded.

Retained synthetic and real packs use `provenance_mode: none`. No Stage 5F historical-verifier
runner, pinned source closure or vendored bootstrap directory is shipped. The historical core
branch checks supplied runner result fields, not source/commit execution. The reference branch
merely requires metadata keys; it does not compare external reference results and remains
strict-policy accepted. Thus the plan's explicit strict rejection of weaker reference mode and
historical-runner defaults are not implemented. The CLI accepts `--dir`, `--tier`,
`--attestation-only` and `--pinned-fingerprint`; it does not accept the proposed positional file
or ceremony fingerprint. With `--dir`, its default pin is inside that directory. Supply an
independently trusted fingerprint when testing an external pack. The committed fixture keys
establish neither producer identity nor independent custody. Unknown tier strings take the
public path; file reads occur outside the safe wrapper and may throw without structured 282.
Public verification still requires the census file to exist although it does not validate it.

M49's retained real run is PG2 86M plus Llama Guard 3 1B over two shared cases, not the planned
LG4 12B run. The synthetic LG4 revision is a placeholder. Capture scripts pin the PG2/LG3
revision argument but do not enforce offline environment variables or validate acquisition
manifests. They hash source text, not tokenized/chat-template input; roster adapter/tokenizer
hashes are hashes of descriptive strings. PG2 records the already-truncated count; it cannot
establish pre-truncation overflow. The merger compares case-ID sets, not source bytes, duplicate
counts or complete fragment provenance. The real builder supplies hard-coded member metadata
without checking the fragment's model/revision/runtime against it. LG3 selects MPS when present,
uses fp16 and prints bounded generation excerpts; this is not an entirely transcript-free
console. Its stale LG4 usage label is not the actual model. Both categorical parsers accept
prefixes rather than exact output tokens. Exceptions abort rather than sealing every failed
attempt. None of these scripts was run with models during this audit.

Python verifies selected digests, omission arithmetic and softmax labels on the synthetic pack;
it does not implement the planned raw-code precedence, signatures, adapter replay, historical
execution, census bijection or complete policy checks. Browser verification checks schema ID,
a few shapes and softmax labels only, explicitly returning `raw: null`; it does not authenticate
signatures or full structure. Its HTML advertises dropping a file but supplies no file/drop
handler, and its inline module is blocked by its own `script-src 'self'` CSP. Tests import the
function into Node, not an interactive browser. K7 exercises named functions and one mutation
per principal raw code, not every branch, arbitrary nested key or CLI/environment combination.
Lean includes eight symbolic statements plus a ninth declaration called a lemma in prose;
several are concrete lists or assumed equalities, not runtime proofs. Its output structure can
hold an aggregate; the last theorem only proves the default constructor leaves it `none`.

Reproduction rebuilds in place and compares tracked Git differences, not a clean-directory
path/size/hash inventory. Its parity test rebuilds evidence before later verification; that is
not verification of the original committed bytes alone. Untracked extras are outside the diff.
Python is required by the earlier test even though a later standalone step says it may skip.
Lean is not run by this stage script. The conformance kit runs repository checks, not the planned
self-contained dependency-copy bundle. S48 corrects the regulatory and standards claims: VMP
is a research contract, not proof that other extensible formats cannot express panel evidence.

### M126 — Stage 5G proves signature separation with weaker capture and anchor checks

Read all 481 specification lines and 655 plan lines, rereading the truncated comparison table.
Compared every core module, issuance/verification/build path, foreign pack, Lane B, Python,
browser, Lean and reproduction script. The [eight-case VFC probe](vfc-verifier-probe.json)
retains valid/signature-refusal controls and establishes five accepted producer-signed
inconsistencies plus a Lane B corroboration of an overclaim-rejected bundle. M49's historical
outside-party reports remain reports; cryptographic rungs do not independently authenticate
separate humans, account ownership or non-collusion. No external capture was requested here.

Domain-separated signatures and SPKI-DER fingerprints bind the producer identity, whole capture
and verifier identity under an external verifier pin. The implemented signatures follow the
plan's domain-prefixed messages, not the spec's unprefixed pseudocode. However, schema checking
does not validate the top-level schema value or recursively close nested content/cells/anchor
objects, and does not enforce every required field/type. Arbitrary schema strings and extra
nested fields pass after signing. Nonce size is enforced by the issuance helper, not by all
receipt verification paths. Identity and policy checks are separate from truth of the capture.

Challenge verification reopens the three supplied artifacts, but never compares the capture's
own corpus/snapshot digests with that challenge. A signed capture can therefore name unrelated
context. Its cells need not cover the challenge corpus. Audit compares terminal case-ID sets
with capture case-ID sets, accepts duplicate capture cells, and only checks that supplied
attempts point to some terminal ID. An empty attempt list passes; terminal IDs/statuses and
census challenge/corpus/capture fields are not fully reconciled. A jointly signed capture/census
for an out-of-corpus case passes. The real ingest constructs a new census from returned cells;
it does not recover all actual attempts, omissions or failures. The `_ref` path/digest copies
are not the Node challenge check's source of truth and are not comprehensively validated.

The so-called Sigstore kernel verifies a plain canonical-JSON signature using a supplied public
key and requires the literal timestamp `1700000000`. Its reported root fingerprint is the same
supplied key's fingerprint. It does not validate X.509 issuance/validity, a Fulcio chain, SCT,
Rekor checkpoint/inclusion proof, DSSE pre-authentication encoding or OIDC claims. The core
requires that fingerprint in the caller's allowlist and checks four statement bindings and the
anchor digest; issuer/audience are not checked. The kernel subject is copied from unsigned
metadata relative to the anchor-key signature and need only differ from the verifier subject;
it is not matched to the producer's declared anchored subject. The probe replaces subject,
issuer and audience, re-signs producer/verifier wrappers with fixture keys and still gets rung 2.
Thus the synthetic rung exercises a local key-attestation predicate, not real Sigstore identity
assurance. Neither the spec's same-certified-key rule nor the plan's cross-binding correction
establishes deployed interoperability. S49 supplies the actual bundle-format boundary.

Presence-driven implementation follows the later plan: with no anchor, an unsupported claimed
rung yields 296 and a higher policy minimum yields 298, rather than the spec's blanket 293 for
missing rung-2 trust configuration. A missing kernel result yields 299 but the direct result
can still set `record_authentic: true`; this is signature-stage status, not accepted attestation.
Unknown tiers use the public path and file reads can throw outside the safe wrapper. Challenge
issuer/verifier files expose functions, not the promised executable argument-handling tools.
The synthetic builder regenerates a fixed-nonce challenge in memory instead of loading the
planned pre-issued receipt. Fresh issuance remains a separate operation.

Lane B calls the same JS verifier and signs a sidecar. Its `corroborated` predicate requires
`record_authentic`, not full attestation validity: the probe's raw-296 overclaim is corroborated
with a valid receipt. Audit failure, missing anchor execution and other later failures must not
be inferred absent from a corroboration flag. The runner uses public tier and derives the
ceremony pin from its own fixture private key; it does not load an independent ceremony trust
pin or persist the receipt. `verifyReceipt` authenticates the receipt but does not compare it
to a supplied bundle. Diversity accepts caller-provided rung/subject values without verification;
campaign validation checks a transcript-present boolean, not the actual transcript object.
These helpers require trusted upstream inputs and are not independent validation APIs.

The foreign pack does set offline environment variables and uses a pinned model revision.
It does not validate weight/tokenizer manifests or match the supplied snapshot/corpus to the
challenge before inference. The snapshot is hashed afterward, and the capture script ignores
its contents. Labels are retained without scores or runtime provenance; input digests hash
source text, not tokenized input. The signer discards emitted model/revision metadata and uses
a fixed `external-actor` subject. The fixed `/tmp/vfc-cells.json` path is not isolated between
runs; shell interpolation of caller paths into Python source is not robust. Relative arguments
are resolved after changing into the pack directory. Failure aborts rather than emitting the
planned campaign outcome. Keep these limits in external handoff instructions; a successful
rung does not prove an untampered model run or a complete retry history.

Python uses `json.dumps` and checks selected digests/declarations; it does not independently
verify Ed25519, census bijection, external roots, policy or raw-code precedence. It promotes
anchor presence to the top predicate without anchor validation. General JS/Python canonical
agreement for astral-key ordering or number serialization is not established by this script.
Browser verification is explicitly incomplete and unsigned; its displayed challenge rung is
based on binding-field presence, not receipt verification. The HTML inline module conflicts
with its own CSP, as M34 already records. The planned WebCrypto signature implementation and
full rung-0/1 portable validation did not ship. Lean proves symbolic equalities/predicates;
the last theorem excludes numeric sentinel 99, not arbitrary runtime independence claims.
Reproduction rebuilds in place, checks tracked Git differences, permits absent real capture
and optional Python, and does not itself run Lean or a real browser. These are different gates
from the planned two-clean-directory, complete-file-manifest comparison.

The broad claims that an entire industry uses a binary model, or that a lab's research index
proves absence of a verification primitive, are unsupported. Keep OVERT/CAP-SRP comparison and
crosswalk debts explicit, without claiming conformance, legal accreditation or a completed
prior-art exclusion. Annex VI describes an internal-control procedure; its applicability must
follow the Act's system-specific route, not an unqualified claim about all high-risk systems.
The stage's operational title decision depends on documented actor custody, not two keypairs.

### M127 — Stage 5H disclosure tiers depend on incompletely checked reviewer facts

Read the complete 617-line specification and 536-line plan, including all amendments and
source comparisons. Compared core checks, builders, kernel/CLI, both ingest paths, Lane B,
Python/browser, Lean, K7 and reproduction gates. The [nine-case VSD probe](vsd-verifier-probe.json)
confirms that a host-signed unrelated output/identity can support the controlled tier, conflicting
receipts are resolved by last entry, and a wrong receipt-wrapper digest passes. Baseline and
unsigned-refusal controls work. It also records an empty-reference core census, empty method
summary, unsigned browser corroboration and premature decimal truncation. These are local
fixture probes, not new disclosure campaigns or model evaluations.

Controlled-tier verification authenticates a host key against a supplied registry and binds
receipt claim/inventory digests. It never compares `recomputed_output_digest` with the claim's
committed output, checks `host_identity_digest` against the registry subject, or reopens
`receipt_digest`. Duplicate receipts are not rejected: a final `reproduced` entry overrides a
preceding `not_reproduced` entry for the same claim. Host/producer key distinctness is not a
core requirement. Therefore “R1 is a rerun that happened” is too strong: R1 consumes a signed
verdict without establishing the claimed rerun relation. The real-host ingest checks key
separation from the verifier, but not from the producer, and inherits these receipt gaps.
It writes output even when validation reports failure. A pin/host registry packaged beside
real evidence requires an independent trust decision; the Lane C gate explicitly loads those
pack-local files. A signature cannot prove that the project never possessed a private key.

Public-tier CLI verification does execute the supplied aggregate recipe and compare its result.
The pure core consumes a caller-supplied `matched` boolean without independently comparing its
computed digest. That API requires trusted orchestration. The CLI executes the kernel and opens
artifact paths before authenticating the bundle or validating recipe grammar. Paths are not
contained to the evidence directory, and recipe decimals/row sizes are not bounded; malformed
inputs may throw outside the safe wrapper. This is a local research verifier, not an appropriate
untrusted upload service without additional isolation and validation. Unknown tiers use the
public path. Stricter policy is an API option, not an exposed CLI flag; missing/invalid policy
floor values are not rejected explicitly.

Artifact accounting covers supplied recipe input IDs and the declared present/withheld lists,
not every actual dependency or every claim in an original report. Duplicate IDs are not excluded.
The audit census is reconstructed from claim/ref IDs; it does not read the separately emitted
inventory-census file or require refs to equal all manifest-present artifacts. The probe removes
all refs and signs a corresponding empty ref census while supplying bytes directly: core audit
accepts it. That is an API limitation; the CLI, which loads bytes only through refs, would lack
those inputs. Method/claim text are not reopened from their digests; an empty method-summary
string suffices. Scope values are shallow declarations, not checkpoint measurements. Digest
binding detects changed signed declarations, not a producer evaluating different real weights.
Unknown nested fields and raw redaction content are not comprehensively excluded, so the promised
metadata-only bundle is a producer discipline rather than a recursive schema guarantee.

The sole aggregate interpreter reads every listed artifact but does not validate metric labels,
unique case IDs, unique inputs or the actual relationship between a statistic and the claim.
It truncates every value to the requested decimal precision before averaging/rounding. The
probe's `0.00009` becomes `0.0000` at four places, whereas exact decimal half-up is `0.0001`.
Negative values have additional JS/Python/browser formatting/division differences; input ranges
are not enforced. Four-place rounding of the already-scaled nonnegative mean is narrower than
arbitrary-precision decimal averaging. Recomputing six authored constant scores of 0.94 does
not reproduce a HarmBench model run. The controlled fixture's method mentions 2,400 prompts,
but its recipe averages four authored 0.90 values. These are illustrative claims, not measured
Frontier-7B, CBRN or deployment-monitoring evidence.

The spec's tier ordering is not a cumulative set of required predicates: R2 deliberately does
not require R1's host receipt. Its introductory “cannot make a threshold-crossing claim on
restricted evidence” concerns R0, while controlled R1 can structurally support C2 with qualified
checkability. A negative receipt does not cap an otherwise matched public recomputation below
R1. The Lean theorem correctly assumes both no reproduced receipt and no recomputation match;
the broader spec sentence omits that condition. Lean's nested `needs` predicate and digest
inequality models do not prove runtime tier monotonicity, hash collision resistance or actual
checkpoint identity. The scope-swap runtime fixture fails 303 through a stale receipt, not a
universal 304 checkpoint check. Codes are public 300–312, audit adds 313, policy 314, wrapper
315; the spec's later tier subsection still has the obsolete 313/314 split. Environment guards
can return 315 after authenticity gates and before 304, so “wrapper last” is not a complete
execution-order description. Safe exceptions can report `record_authentic: true` before all
authenticity checks completed; use the overall failure result.

Lane B really launches a second Node process and reruns both recipes, but shares the filesystem,
implementation and fixture keys. It verifies embedded signatures without an independent pin,
does not invoke the full verifier, and unconditionally labels its controlled receipt reproduced.
Its success condition compares that output with the existing receipt, not the claim's committed
output or the public claim's match. It selects the first controlled claim/first receipt rather
than validating arbitrary multi-claim correspondence. Thus successful ceremony execution does
not close all R1 receipt/provenance gaps. The returned real-disclosure record is historically a
review-host receipt, not automatic completion of the proposed foreign-producer inventory or
real-risk-report pilot; M49's explicit external-report limits remain applicable.

Python recomputes selected artifact/recipe/census digests and the table, not all six domains,
signatures or the full validity contract. Browser code calls SHA-256 but never Ed25519 despite
its header and spec claiming signature checks; all three invalid signatures still corroborate.
Its inline module is blocked by its own CSP, as M34 records. K7's “every code reachable” test
compares the code array, rather than executing each raw branch; other unit tests supply some
mutation coverage, but this is not the promised full CLI tamper matrix/all-export guarantee.
The byte-stability tool does compare two clean build manifests, including config, but never
compares either with the committed tree. The separate Lane B step rewrites its transcript;
reproduction is not wholly read-only and does not itself invoke Lean. The campaign gate does
require an outcome and rejects completed-evidence/status inconsistency; `pending` is implemented
despite omission from one plan enumeration.

S50 corrects FMTI statistics, legal timing and the FrontierMath comparison. The tier taxonomy
remains a cited research proposal, not an international or legally prescribed 2026 standard.
S31/S40/S48 qualify the paper, RSP and Code framing. A bound scope label cannot make an actual
model substitution impossible, and a holdout benchmark is not by itself a VSD signed host
receipt. Broad absence/firstness claims and self-assigned scorecards remain unvalidated; they
must not be presented as lab endorsement or proof of industry uniqueness.

### M128 — Stage 5I panel coverage does not establish the claimed independent identities

Read the complete 518-line specification and 581-line plan, including amendments; compared
all core checks, Node builders/adapter/CLI, Lane B/C, portable verifiers, Lean and reproduction.
The [eight-case VPC probe](vpc-verifier-probe.json) confirms an outer signer replacement,
duplicate coverage-depth inflation, an extra adequacy assertion, empty reviewer/host registries,
borrowed separation evidence and unsigned browser acceptance. The unchanged baseline passes;
invalid signatures fail Node code 319. These are fixture experiments using public test keys,
not a new outside review or a report-quality assessment.

The adapter verifies the attestation under its embedded identity, but populates its verifier
role fingerprint from the configured pin. The subsequent equality check compares that configured
value to itself. Re-signing the outer attestation with the producer key while retaining the
original external verifier pin passes audit, including the role-collision gate. Existing valid
challenge receipts do not repair this missing outer-signer binding. The CLI also loads
`external-config.json` from the supplied pack without an independent pin/config override.
Policy, affiliation issuers and identities therefore require a separate trust decision.

Reviewer/host registries contribute to the trust-context digest but do not resolve the runtime
identities: both registries can be empty. Affiliation checks bind subject fingerprint, producer,
partition, relationship and issuer fingerprint membership, but not the asserted subject identity
digest or issuer registry subject. Host references are compared by fingerprint, not full identity.
Separation checks do not require an evidence subject to equal the reviewer or host whose receipt
references it. A second reviewer can reuse the first reviewer's and host's challenge evidence
and still pass audit after updating its signed receipt and attestation. Distinct lineage strings
are not independently verified organizational provenance. Host keys do not sign a proof of
control. The adapter always supplies an empty anchored-digest set; the executable Node path
cannot provide the advertised externally anchored rung through a real Sigstore backend.

Coverage union and grant bounds use sets, while depth counts receipt section entries. Repeating
one section in a single review raises its purported number of independent eyes. Schema checks
do not enforce the claimed closed vocabulary, array uniqueness or complete path normalization.
Only attestation annotations enforce flatness; the adequacy gate checks a short key list inside
annotations, not arbitrary nested fields, values or standalone claims. A signed top-level
`adequate: true` passes. Invalid policy types/rung names are not comprehensively rejected.
Digest resolvers use maps that overwrite duplicate keys rather than count exact resolutions.
Unreferenced separation/affiliation records are not generally excluded. An assigned-but-unreviewed
section is a coverage gap and fails 327 before successful state projection; orphan grants fail 321. The successful verifier is not a complete status dashboard for non-returning reviewers.

Lane A uses eight sections and two reviewers, not the introductory three-reviewer example.
Lane B consists of a parent plus two reviewer children; all private keys originate in the parent
and share its filesystem. Children receive a receipt and signing key, not the report/grant review
workflow asserted by the comment. Separate processes do not establish independent review.
Lane C generates all producer/coordinator/issuer/verifier/reviewer/host keys in one process and
models two hosts/lineages. Its challenge nonce is deterministic, its campaign ID is fixed and its
verifier is locally generated. The source digest remains the literal `sha256:src`. TOC derivation
uses the committed list rather than parsing/hash-binding the report bytes, and the runner discards
derived report metadata. The 37-section public-structure experiment is not access to an unredacted
report or an actual METR review; M49's provenance limits remain applicable. The completed campaign
gate verifies a bundle but returns campaign root/independent-party fingerprint without reconciling
them to it. `pending` succeeds regardless of evidence presence; other promised outcome variants
are not all supported by that gate.

Browser verification checks coverage and five digest/projection fields, without signatures,
identity/affiliation/policy checks, grant bounds, full schema, depth, states or trust-context
recomputation. It nevertheless returns raw zero and presents VERIFIED. Python computes more
projections but hardcodes challenge-bound/independence facts and also omits cryptographic checks.
Neither has full 316–330 parity; first-failure/key-normalization behavior also differs. The browser
has no CSP despite its no-egress description. Lean contains nine small theorems, including two
T7 variants, rather than the full promised T1–T11/L1 contract; its rung theorem is ordinal
injectivity, not runtime policy monotonicity. Missing affiliation/census/root/tiers obligations
remain proof debt. Reproduction compares two fresh bundle/config files and runs selected Node
checks/ceremonies, not every test, Python, browser or Lean obligation. Wrapper 331 maps to exit 1,
not the spec's obsolete exit 3. CLI output is plain text, unknown tiers use public verification,
and malformed-file/adapter exceptions can occur before the safe core wrapper.

S51 supports the policy motivation for split external review, not a claim that VPC proves review
quality, real independent custody, publication provenance, standards conformance or industry
firstness. Frozen scorecards and hypothetical scandal comparisons are research framing, not
validated security guarantees or findings about an actual organization.

### M129 — Stage 5J compares historical cross-products and leaves ledger binding incomplete

Read the entire 579-line specification and 735-line plan; compared core, adapter, builders,
CLI/attestations, Lane B tests, Lane C runner/anchors, portable verifiers, Lean, K7 and reproduction.
The [eleven-case VRC probe](vrc-verifier-probe.json), executed 20 October UTC, demonstrates empty
epoch histories, unsigned event-content changes, wrong response wrapper digests, unknown schema
and nested correctness fields, ignored reviewer policy, an unregistered anchor, reversed scale
direction and producer/ledger role collision. Browser signature omission is confirmed alongside
a Node code-340 refusal control. None is an external ceremony or live model evaluation.

The runtime recomputes every producer/reviewer historical cross-product on a section, rather than
contemporaneous active heads at each epoch transition. It ignores `severity_direction`, assumes
lower rank is more favourable, and does not require compared dimension IDs to match each other.
Ordinal labels/ranks and the scale authority are insufficiently constrained/pinned. The probe's
signed reversed direction still accepts the original divergence ledger. This is not the specified
logical-time contest relation and can invent comparisons between noncontemporaneous ratings.

Epoch tickets are signature-checked and linked when present, but can all be removed. Their epochs,
ledger IDs, entry types/digests and bijection to entries are not reconciled. Rating/response/ticket/
statement wrapper digests and contest-event digests are not reopened from content. The probe changes
an event's epoch and scale field without changing its digest or any signature; audit accepts it.
Chain checks require contiguous revision numbers and one head, but do not enforce revision-to-parent
order, graph reachability/acyclicity or a canonical relationship between chain subject and semantic
section/reviewer. Presence uses all historical entries, not validated active heads. Thus contiguity
is not proof that a complete prior history was retained; without a separately trusted prior root,
a coherent rewritten or truncated history is not excluded by the advertised append-only law.

Responses must reference a stored event and have a valid producer signature, with one response per
event. They are not checked for temporal ordering or reopened response-body bytes. Concurrences and
rebuttals bind the event/reviewer and exclude both kinds on one pair, but duplicate same-kind
statements, claim vocabulary and their ordering relative to the response are not fully checked.
Event maps can collapse duplicate tuples. Projections use the last producer and first reviewer
array entries rather than chain heads/event-specific references; their denominators count historical
rows. Concurrence numerator and denominator both equal the supplied concurrence count, not an
independently committed census of every agreement claim. These outputs do not implement all
promised derived-state/projection semantics.

The adapter really re-verifies upstream VPC at audit tier; M128's upstream weaknesses still apply.
The pure core instead trusts its caller's upstream-verdict fact, so it is not independently an
upstream verifier. VRC role fingerprints are populated but never used to enforce separation, and
its configured minimum-reviewer policy is ignored. The probe permits the producer to sign ledger
tickets and a policy requiring 999 reviewers. Schema does not pin the version, close the artifact
vocabulary, comprehensively validate arrays or require flat annotations; nested correctness claims
pass. The Lean no-correctness theorem concerns an abstract function ignoring one boolean, not the
ability of arbitrary accepted JSON to contain a correctness assertion.

The CLI reads only bundle/config from the pack and does not load or verify the emitted public/audit
attestations. Pack-local verifier pins are not an independent trust source. The separate attestation
helper checks a supplied signature fact, selected roots and a public-object link, but omits the
claimed bundle/upstream/obligation digests, verdict and checked-range consistency; its audit branch
does not explicitly require `tier === "audit"`. The normal adapter does not supply its signature
facts. Malformed input can fail in file loading/adapter work before the safe-core wrapper; unknown
tiers take the public path. The promised full attestation-ingest contract is not implemented.

Lane B is a same-process deterministic builder and tests, not the planned per-party child-process
ceremony. Checking that ticket fields omit rating values does not prove the sequencer process never
saw those values; that process builds all ratings and owns every test key. Lane C chooses the allowed
fresh-VPC route, generates all roles together and assigns ratings from a fixed section-index recipe.
These are authored synthetic ratings over public report structure, not independent substantive
assessments or reused original-reviewer signatures. It does not execute the proposed live Fable-5
producer demonstration. Completed status checks raw zero and a different configured fingerprint,
but never authenticates a VRC verifier signature. Anchor/challenge/witness truth is supplied by the
caller; highest rung can be reported from a matching root and boolean without the full identity
validation helper. The attach tool only writes metadata/proof bytes. OpenTimestamps verification
reconstructs the stamped root text and invokes `ots`; output regexes determine status, the recorded
proof locator is not reconciled, and the tool does not implement Rekor verification despite accepting
that label structurally. A timestamp supports existence of committed bytes, not independent authorship
or completeness of the underlying review. Preserve M49's narrower retained-outcome description.

The active registry bridge compares only `subject_digest` with the contest root. A one-field object
without a signature, statement type, registration receipt or log proof passes audit. It therefore
cannot establish in-toto/SCITT registration. S52 provides the actual architecture distinction.
Python and browser independently copy selected root/census calculations; the browser does not import
the same JS decision core as promised. Both omit most raw checks, upstream authentication and all
signatures, and return raw zero on invalid reviewer signatures. They do not supply the full listed
parity fields or derived-state census. Their small valid-fixture agreement is not semantic parity
over all accepted inputs; Python/JS canonical ordering and numeric behavior also need separate bounds.

Lean proves small predicates, not the full specified decision model: response existence is not
unique existence, topology starts with a head count, statements lack the promised transition relation,
and no host-exception boundary or cryptographic refinement is modeled. Eleven numbered themes include
two first-failure theorem declarations. The plan's grep counts comment occurrences of `sorry` and its
post-`cd` path is wrong; use the repository escape-hatch gate instead. K7 drives all raw codes through
pure facts but does not import/call every export; negative evidence files were not emitted. The
reproduction script verifies the committed bundle, runs Python, compares four regenerated files and
performs the Lean source scan with an explicit type-check skip if unavailable. Despite its header,
it does not run Lane B/C gates or browser checks. Fresh-build stability does not itself verify the
committed tree; the separate four-file comparison supplies that narrower check.

Keep source qualifications: v3.4 is historical; reported-until-pinned policy language remains a
research note; external evaluation having no effect is not established by absence of public evidence.
Voluntary Code scope is as in S48. Existing general attestation formats can carry custom multi-party
relations; absence of a built-in VRC predicate is not structural inability or a proved firstness claim.
Historical scores are self-assessments, not independent validation or provider endorsement.
