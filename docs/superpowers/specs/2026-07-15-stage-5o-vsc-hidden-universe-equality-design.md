# Stage 5O — VSC: Hidden-Universe Equality (design)

**Status:** Sections **1–6 FROZEN** — Section 1 `a1e2e6d1`, Section 2 `0e26c361`, Section 3 `e8dc0a77`, Section 4 `cb67542f`, Section 5 `b08554ed`, Section 6 this commit. Sections 7–13 pending.
**Release is BLOCKED by design:** `release_required_bindings` carries the unresolved `section_6_anchored_presented_census_closure` (§5.9) and, since **A24**, `section_10_evidence_attack_raw_code_allocation` (§4.10) — the stage's own `evidence_attack_fixtures` raw-code obligation, which had no owner, discharger or status while **zero** codes existed in the reserved band. A green Section 5 freeze does **not** mean anti-equivocation exists, and per **A13** full anti-equivocation is not coming: Stage 4T binds views to a held capsule, never excluding an unseen one, so `not_proof_of_global_census_closure_uniqueness_without_exclusion_witnesses` is a **permanent** ceiling.
**Amendment A28 folded (amends frozen Section 4):** A28 expands the profile bundle (§4.4) **seventeen → twenty-three pairs**, pinning the six Section-7 constructions **ahead of** the Section-7 verifier that will consume them — the same discipline by which A17/A27 pinned Section-6 artifacts before their consumers, never after. One pair is a **schema**: the A26 §6.5.4 verified-closure Bitcoin-checkpoint projection carried a schema block but **no pinned identity or digest**, so `verified_closure_bitcoin_checkpoint_schema` mints it — an unpinned schema inside evidence is the §3.1 authority rule's next costume. The other five are **profiles**: `beacon_contract_profile`, `beacon_suffix_profile`, `ordered_selected_indices_profile`, `challenge_protocol_profile`, `challenge_resource_limits_profile`. Under the **single-hat constitution** each profile literal is **distinct from the already-frozen §7 artifact `schema_id`** it governs (`simurgh.vsc.beacon_contract.v1`, `.beacon_suffix.v1`, `.ordered_selected_indices.v1`, `.challenge_record.v1` in `constants.mjs`): a construction profile and an object schema must never share a literal, so `beacon_contract_profile.v1` is minted, never `beacon_contract.v1`. The `_schema`/`_profile` suffix matches the classifier the bundle already uses (schema pairs own an object schema+digest; profile pairs own a construction), and a repository-wide role scan confirmed each of the six literals has **exactly one role** (zero prior occurrences). **Ownership divides with no construction between chairs:** `beacon_suffix_profile` and `ordered_selected_indices_profile` own each artifact's **local** shape, field constraints, canonical construction and validation; `challenge_protocol_profile` owns **only** the cross-artifact orchestration — the binding equations, which digest commits which artifact, the required equality/consistency checks, and the verifier first-failure ordering; `challenge_resource_limits_profile` owns **one** authoritative §7 resource-limit table of which the generated challenge maxima are **outputs**, never a duplicate hand-maintained authority. **The load-bearing clause: the challenge protocol profile imports the globally authoritative digest-token encoding (`simurgh.vsc.digest_token_codec.v1`, the bare-`[0-9a-f]{64}` grammar) by reference and does not redefine its lexical grammar** — a second normative owner of that grammar would reopen exactly the defect class the 2026-07-21 codec correction closed. The limit-compatibility invariant was **regenerated, not subtracted**: the same generator constructs the maximal 23-pair manifest and measures it through the production `canonicalJson` in two independent views agreeing at **6,810,273 bytes** — the six literals add exactly `Σ (2·len(prefix) + len(literal) + 86) = 1,137` canonical bytes, all in the wrapper (`4,503 → 5,640`); the leaf vector is bundle-independent and stays `6,804,633`. Worst-case manifest **6,809,136 → 6,810,273** (headroom `1,579,472 → 1,578,335`, HOLDS); the one dependent figure, the public canonical core, moves the same **45,191,912 → 45,193,049** (censuses unchanged, carrying their own schema IDs). A **transitive dependency census** separates _bytes changed_ from _maximum changed_: no stored `STAGE5O_V1_PROFILE_BUNDLE_DIGEST` constant exists — the verifier recomputes it from the fields — and every downstream digest field is fixed 32-byte → 64-hex, so the bundle **preimage** and its **recomputed value** change while **no stored artifact and no downstream canonical size** moves; only the manifest maximum and public core do. **No blade, law, evidence predicate, release predicate, ceiling, or socket changed** — A28 pins the Section-7 constructions §4.4 will bind, and names twenty-three pairs where there were seventeen.

**Amendment A27 folded (amends frozen Section 4):** The authority audit found the seven original profile-bundle IDs — `manifest_schema`, `commitment_profile`, `leaf_profile`, `tree_profile`, `case_schema`, `execution_object_schema`, `result_object_schema` — still carrying the `2^16 - 1` producer-length bound while A17/A19 had pinned the other ten to concrete ASCII, and §4.1.1 misstating their count as **five** (a stale pre-A9 figure; the true count is seven). An unpinned ID is producer length-freedom inside the manifest wrapper — ~459 KiB of hypothetical, and a variable a later composition could mistake for authority. A27 pins all seven to frozen literals (`simurgh.vsc.scope_manifest.v1`, `.commitment.v1`, `.hidden_leaf.v1`, `.merkle_tree.v1`, `.case_schema.v1`, `.execution_object_schema.v1`, `.result_object_schema.v1`) under a **naming constitution proven single-hatted**: a hash-domain identifier and a schema/profile identifier must never share a literal even when they describe the same object — so `case_schema.v1` is minted rather than reusing `CASE_DOMAIN`'s `case.v1`, and `execution_object_schema.v1` / `result_object_schema.v1` rather than the `EXECUTION_ENTRY_DOMAIN` / `RESULT_ENTRY_DOMAIN` hash tags, while `hidden_leaf.v1` is kept because it is already the leaf **profile** identifier, not a domain. A repository-wide role scan confirmed each of the seven has exactly one protocol role. With A27 **all seventeen pairs are pinned and no producer length-freedom remains in the manifest.** The limit-compatibility invariant was **regenerated, not recomputed by hand**: `tools/simurgh-attestation/stage5o/node/measureScopeManifestMaximum.mjs` constructs the maximal schema-valid manifest and measures it through the production `canonicalJson` in two independent views that agree at **6,809,136 bytes** — the source carries no historical figure and derives nothing from the quarantined `7,267,676`, and a census test proves its schema against the current working-tree spec (12 fields / 17 pairs / 5-field authority) rather than a plausible reconstruction. The wrapper drops **463,043 → 4,503** and the manifest **7,267,676 → 6,809,136** (headroom `1,120,932 → 1,579,472`, HOLDS); the 4,503-byte wrapper is everything around the 6,804,633-byte leaf vector — the `leaf_entries` field name and colon, the array brackets, and every other field. The freed room is exactly `7 × 65,535 − 205 = 458,540`: seven variable IDs replaced by **205 UTF-8 payload bytes** (the 14-byte `u16be` framing is `profile_bundle_digest`-preimage-only, never `canonicalJson`). **One dependent figure moves with it** — the public canonical core (manifest + both censuses) drops `45,650,452 → 45,191,912`; the censuses are unchanged, carrying their own schema IDs, not the bundle's. **Downstream artifacts are otherwise unaffected**: the profile-bundle digest **preimage** changes (the framed IDs are shorter) but hashes to a fixed 32-byte digest, so no other canonical size moves — a dependency-census test asserts the raw IDs appear in the manifest while downstream fields carry the 64-hex digest rather than re-serialising them. **No blade, law, evidence predicate, release predicate, ceiling, or socket changed** — A27 removes producer freedom and regenerates the number that freedom had made unmeasurable; the frozen `7,267,676` survives only as pre-A27 recompute history.

**Implementation correction (2026-07-21 — NOT a normative amendment; no frozen text changed).** `tools/simurgh-attestation/stage5o/core/digestTokenCodec.mjs` incorrectly inherited Stage 5K's prefixed digest grammar and emitted `sha256:<64hex>`, contrary to Stage 5O's **already-frozen** rule that every `bytes32` is bare lowercase hex, exactly 64 characters (§3.4 for salts, §4 for every digest field, and `leaf_id = leaf_value` in §3.2 inherits it). **The specification was never ambiguous and no Stage 5O normative grammar changed** — this is an implementation defect, corrected forward, never a spec event; A27 is **not** consumed by it and stays available for the pending profile-ID work. The codec now implements the bare-hex grammar and **rejects** any `sha256:`-prefixed field, and the four challenge-artifact byte maxima were regenerated through the production encoder: the recomputed `challenge_package` maximum decreased **842,869 → 842,806 bytes, exactly 63 = 7 × 9 digest fields**, isolating the defect to the digest encoding and confirming nothing else moved. The superseded maxima are retained as corrected evidence. Corrective commits: codec `0c4abd14`, remeasure `7068f507`.

**Amendment A26 folded (amends frozen Section 6):** Section 7's beacon must root in a Bitcoin chain the verifier can identify, and the obvious move — read that context out of the existing Stage 5L `bitcoin_ots` receipt — was preflighted against shipped code **before** it was written down. The receipt does not carry an 80-byte header, `nBits`, or any mainnet identity. **But the preflight found something worse than absence.** `stage5l/core/context.mjs` admits a checkpoint witness by testing `bundle.anchor_policy.accepted_checkpoint_witness_keys.includes(ce.witness_key_fingerprint)` — and `anchor_policy` is **producer-side**. It is precommitted and tamper-evident (`commitment.mjs` binds it via `anchor_policy_digest`; raw 365 rejects a mismatch), but **committed is not authoritative**: precommitment proves _prior declaration_, never independence, honesty, or provenance. A producer may precommit its own key, sign a fabricated checkpoint with it, and every Stage 5L check passes — because the fabricated policy **is** the committed policy. **This is §3.1's authority rule in its tenth costume**, and A26 was about to import it as a foundation. The verifier's whole pinned surface in 5L is four fields, and the one that looks like the missing root, `cfg.tsa_verifier_public_key_fingerprint`, is consumed **only** by `gateIdentityPolicyDigest` (raw 375) — which checks the _gate_ identity. Nothing compares it against `ce.witness_key_fingerprint`. The Lane A builder signs checkpoints with `keys.tsaverifier` **and** lists that fingerprint as accepted, so **one key plays both roles and every test passes whether or not the link exists**: a fixture coincidence standing in for an authority check. A26 therefore mints a **distinct verifier-controlled `stage5l_checkpoint_witness_profile`** rather than requiring `ce.witness_key_fingerprint == cfg.tsa_verifier_public_key_fingerprint`, which would fossilise the coincidence into the protocol and collapse two trust roles — the TSA gate-identity verifier and the Bitcoin checkpoint witness — merely relocating the defect. The admissible signer is the **intersection**: `producer_committed_keys ∩ verifier_pinned_keys`. **A producer may narrow the verifier's authorised witnesses; it may never enlarge them** — which keeps the genuinely useful property of committing beforehand to a witness ecology while denying that declaration the power to create its own authority. Seven fail-closed steps run in order, and step 2 (recompute the fingerprint from the **resolved** public-key bytes) exists because a fingerprint naming an authorised witness while its accompanying key hashes elsewhere is the entire attack in one row. The projection **keeps the authority evidence that created it** — profile id, profile digest, and witness fingerprint all survive verification, because a projection that forgets its own premise is a conclusion. Stage 5L's `observed_tip_height` and `checkpoint_inclusive_confirmations` are projected **separately and are inert here**: measured, `prev_block` appears **nowhere** in the codebase, so the tip is a signed **number** with witness authority as an assertion and **no chain authority whatsoever**; a separate projection is what stops it acquiring powers it never had. Network authority is verifier-owned — measured, `anchor_policy.network = "bitcoin"` is producer-supplied and **does not distinguish mainnet from testnet at all** — so `cfg.bitcoin_network_profile_id` owns mainnet identity, `powLimit`, compact-target rules, encoding, byte order and retarget interval, and the producer's field may be compared but never select the profile. **Two depth conventions are pinned separately and never merged**: Stage 5L's inherited `inclusive_block_count.v1` (`tip - height + 1`; six inclusive confirmations = block + five descendants) and Stage 5O's `descendants_after_beacon.v1` (`final_suffix_height - beacon_height`; `BEACON_REQUIRED_DESCENDANTS_V1 = 6` = beacon + six later blocks, **no `+1`, never "confirmations"**) — one word covering both counts is how an off-by-one becomes a disagreement about prose. **§6.5.3 is untouched and no arrow is inverted:** `H` stays precommitted and anchor-introduced heights stay forbidden; `A` is a _separate derived fact_, and the checkpoint context — post-anchor evidence — never enters the subject it confirms, which would cycle. **The ceiling was minted only after the audit, not before it:** all **34** existing ceilings were read with the A22 gate's own parser and none owns **witness ⊥ producer** — the two near-misses fail for the same reason, since `not_proof_of_organizational_independence_beyond_pinned_ecology_classes` bounds **class ⊥ class** (live even with one ecology) and `not_proof_of_timestamp_authority_clock_key_custody_or_process_correctness` has the right shape but the **TSA** as its subject, so borrowing it would collapse the two roles at the ceiling layer exactly as reusing the TSA fingerprint would at the key layer. `not_proof_of_checkpoint_witness_organizational_independence_or_non_collusion` is therefore added, taking non-claims to **35** — **and a ceiling alone was forbidden here**, because it would have excused an omitted authority check, the move this stage already refused when it took the liveness cost rather than mint a height-selection pardon. Mechanism and ceiling divide exactly: _the signer must be verifier-authorised_ / _authorisation does not prove the witness is honest, independent, or non-colluding_. One requirement is added — `section_7_beacon_chain_roots_in_verified_closure_bitcoin_checkpoint` (owner 6, discharger 7, `PENDING`), taking requirements to **6** — because a verified projection Section 7 has not been written to consume is a decorative object, A8's painted door in the register A8 exists to prevent; **a prose claim that the beacon "uses the same Bitcoin chain" does not discharge it.** Eight fixtures land, S6.47–S6.54, **S6.47 being the measured defect reproduced**. **The blade, the laws, and every evidence and release predicate are unchanged** — A26 adds an authority root the design had assumed it already had, and one ceiling naming what the root still cannot buy.

**Amendment A25 folded (amends frozen Section 1):** Section 7's draft claimed its index sampler was **exactly uniform**. It is not, and could not be: `hash_collision_resistance` does not imply that `SHA256(seed || counter)` behaves as a uniform draw stream, and hashing a Bitcoin block hash — structurally **non-uniform**, since proof-of-work forces it below the target — does not by itself prove uniform extraction. **The stage was spending a pseudorandomness assumption it had never named**, which is precisely the condition A21 existed to end, one register later. A25 replaces the bespoke concatenated-SHA-256 stream with **RFC 5869 HKDF-SHA256**, a construction designed for exactly this shape: extract a pseudorandom key from non-uniform input material, then expand it into context-bound outputs. `challenge_seed = HKDF-Extract-SHA256(salt = challenge_seed_profile_digest, IKM = CHALLENGE_SEED_DOMAIN || challenge_subject_digest || beacon_value)`, and each draw is a **separate one-block `HKDF-Expand-SHA256`** keyed by `u64be(j)` in `info` — never one enormous output, because RFC 5869 caps a single expand at `255 * HashLen` = **8,160 bytes** and a million-draw stream would blow through it; per-counter expansion also gives random access, so `draw_9187` costs one call rather than 9,188. The salt is public, profile-pinned, fixed before the beacon and independent of the IKM, exactly as RFC 5869 permits and for the separation reason it gives. **Two assumptions are minted and no ceiling is:** `hmac_sha256_prf_security` and `beacon_ikm_sufficient_conditional_min_entropy` — the second deliberately **positive**, a premise the stage spends rather than a limitation it concedes. Both ceilings already exist (§1's beacon ceiling; A21's `not_proof_of_cryptographic_primitive_security`), and minting more would be the duplicate ownership that fails closed. **The uniformity claim is now stated in two layers that must never be collapsed:** conditional on independent uniform draws, low-bit extraction plus `candidate >= N` rejection is **exactly** uniform and per-draw duplicate rejection yields an exactly uniform ordered sample without replacement — that layer is combinatorics and owes nothing to cryptography; the **realised** sequence is only **computationally indistinguishable** from it, under A25's assumptions. Rejection sampling removes modulo bias exactly; HKDF supplies the draw model; the beacon supplies assumed entropy; **none of the three proves the others, and the old sentence let one borrow another's credit.** Implementation parity is pinned to RFC 5869's own Appendix A vectors rather than to our arithmetic. **No blade, law, evidence predicate, release predicate, ceiling, or socket changed** — the stage names a premise it was already spending, and narrows a claim that was false.

**Amendment A24 folded (amends frozen Section 4):** §4.9's class table states that `evidence_attack_fixtures` carry a **non-zero Stage 5O raw code**. That is a normative obligation, and it had **no owner, no permitted discharger, no status and no ledger entry** — it lived in a table cell and blocked nothing. **Measured, not assumed: zero codes are allocated in the reserved `420+` band anywhere in the stage**, while the committed sections carry **78** evidence-attack rows and Section 6 adds **25**; every apparent `420+` occurrence in this document is byte arithmetic — `465` from `1,121,465`, `463` from `463,043` — and the audit that surfaced this was A23's, when the check "every evidence-attack row names an existing first-failure code" proved **unsatisfiable because no code exists to name**. **This is A8's painted door standing in the register A8 was built to prevent**: an unfinished obligation recorded as prose promises a discharge the contract never defines and nothing enforces, which is exactly why the second ledger has the opposite lifecycle. A24 **allocates no codes** and mints no mechanism. It records the obligation as `section_10_evidence_attack_raw_code_allocation`, owned by Section 4, dischargeable by **Section 10 alone**, `status: PENDING` — so the release gate **rejects** until Section 10 maps every evidence-attack row to exactly one declared first-failure reason and exactly one non-zero code, **one code per semantic failure class, never one per fixture**: a code that names a fixture rather than a failure is an identifier pretending to be a diagnosis. Section 10 must further prove a closed allocation table, unique reasons and numbers, deterministic first-failure ordering, no unmapped fixture, no code with incompatible meanings, **never `0` for rejection**, exit-ledger parity, mechanically regenerated goldens, and that unrelated prior-stage codes did not move — preflighting every shared golden and consumer **before allocating the first number**, because 4M's additive codes broke five goldens and 4R/4S cost four red rounds to the same class of change. **Section 6 does not own numeric allocation and is not blocked by this**: its rows carry stable symbolic failure reasons, the numbers arrive from Section 10, and the ownership model would break if a section had to supply codes for a table it does not own. **The missing codes were never the defect. The unledgered obligation was.** No blade, law, evidence predicate, ceiling, fixture, or socket changed; **the release predicate gains one fail-closed prerequisite that was already normatively required and silently unenforced.**

**Amendment A23 folded (amends frozen Sections 3, 4 and 5):** The fixture taxonomy froze **four** classes and maintained its membership **by hand**, in two places, which disagreed: §4.9's prose asserted **five** members of `implementation_regression_fixtures` and the §4.11 freeze gate asserted **six** — while the matrices, measured by the rows' own text, held **twelve**. Three answers for one class. **The first correction of that census carried its own methodology in the sentence — "counted from the matrix rows" — and went stale inside the same stage.** The tell is **S4.42**: the fixture A17's erratum added _in this stage_ to catch A17's authority-laundering defect, uncounted by either census. **A census maintained by hand does not track a class; it records the last time someone remembered to look** — the A20 and A22 lesson, arriving a third time in a third register. A23 mints the fifth class, **`assumption_language_fixtures`**, whose **subject is a sentence**: it reads the specification and asks whether a normative claim names the computational assumption it spends. It carries **no raw code and no runtime verdict**, and forbidding both is the point — a verifier using the same hash cannot distinguish two colliding preimages from one, so **no byte mutation can make an injectivity overclaim fail at runtime, and the only artifact that can carry the defect is the prose**. Filing it under `implementation_regression_fixtures` would have made a spec defect masquerade as a build defect. **S6.36 is its first member**, and lands with Section 6. Every one of the **118** fixture rows now declares **exactly one** class from a **closed enum**; the prose censuses are **deleted, not corrected**; and the gate derives total rows, count by class, unique IDs, and the required/forbidden fields per class. **Membership closure** is required — matrix IDs must equal implemented executable IDs ∪ implemented specification-language check IDs — because a parser that misses a whole matrix classifies everything it found and congratulates itself, which is A22's blind spot in the fixture register. A **fixture-shaped ID outside a canonical matrix rejects**, the tripwire's second home. **Classification was derived, then audited, and the audit caught me:** the rewriter read S1.1–S1.9's "reject" and filed the auditor self-tests as `evidence_attack_fixtures` — but their subject is our own gate and they bear no raw codes; they are implementation regressions, and were corrected. **No fixture was added, removed, or reclassified in substance; no blade, law, evidence predicate, release predicate, ceiling, or socket changed** — only the taxonomy's arity and the register's ability to count itself.

**Amendment A22 folded (amends frozen Sections 1, 2, 3 and 5):** The non-claim ledger had **two grammars**, and the audit that polices it could only read one. Section 1 declared its baseline as a bare list under a second machine name, `section_1.baseline_non_claims`; every other section used `section_N.added_non_claims = [ ... ]`; and every non-claim audit this stage ever ran matched the second. **Eleven ceilings sat outside every completeness check while those checks reported green** — including **four with no definition anywhere**: `not_zero_disclosure`, `not_proof_of_beacon_unbiasability_or_finality`, `not_proof_of_salt_entropy`, `not_semantic_junk_detection_beyond_declared_predicate`. This is precisely the defect A16 spent an amendment repairing for one field — _a field the release envelope signs while the spec never records its meaning is a riddle, not a limitation_ — and A16 could not find these four because it could not see the register they lived in. A21 then **spent** `not_proof_of_salt_entropy` as a load-bearing dependency inside its own definition of `not_information_theoretic_hiding`, citing a ceiling with no meaning on record. **This is A20's disease in the second ledger**: two dialects, a parser that reads one, and a green result that means nothing. A22 gives Section 1 the one canonical production — **`added_non_claims`, not a tidier second name, because two machine names is the disease wearing matching shoes** — defines all four ceilings, and pins the **separator** into the grammar, which was not a grammar at all: Section 3 used no commas, Sections 4 and 5 used them throughout, and **Section 2 used both**, seven entries bare and one comma'd on the single line A15 happened to edit. The gate now derives **four registers independently** — declarations, definitions, ownership map, release envelope — and requires **exact ordered membership equality**, never equal counts. **Its first run found two defects review had not:** a **live present-tense definition of `not_proof_of_execution_payload_truthfulness`**, a field the note thirteen lines below it announces as _dropped_ and which no section declares — A16's riddle inverted, a **meaning without a name**, the spec defining a ceiling it does not claim; and **four citation blocks shaped exactly like registers**, bare `not_*` names fenced one per line, indistinguishable to a parser from the very production that hid Section 1. Nine auditor self-tests **S1.1–S1.9** now recreate each blind spot and require rejection; **S1.6 (misspelled register) and S1.7 (register deleted) are the load-bearing pair**, because every other row fails on a name while those two fail on a _register_, and an unread register raises no errors — which is what green looks like. **S1.4's first draft reported `SKIP`; a skipping fixture inside a completeness audit is the disease, not the test**, so the gate now takes the produced envelope as an input. **The envelope was measured, not predicted: it does NOT move.** `sha256(release_non_claims)` is byte-identical across A22 at `2badb6ee…`, membership unchanged at **30**, nothing added or removed — names alone reach the signed bytes, and A22 adds no name. **A22 is therefore the first amendment since A16 that touches frozen text and moves no signed artifact whatsoever.** Every count in this record is generated by the gate; **no count in this specification is normative or hand-maintained — the numbers this stage has carried by hand are the numbers it has gotten wrong.** The historical record is corrected rather than rewritten: A21's "23 ceilings" and A16's completeness posture are marked as **partial-register results**, not retro-fitted into success. **No non-claim was added, removed, weakened or renamed; no blade, law, evidence predicate, release predicate, or socket changed.**

**Amendment A21 folded (amends frozen Sections 1 and 3):** The stage stated **no cryptographic assumption anywhere**. Zero mentions of collision or preimage resistance; none of the ceilings covered it (**the figure originally recorded here was "23", which A22 showed was the count of a partial register — it silently excluded Section 1's entire baseline; the conclusion is unaffected, since no ceiling in _either_ part covered a cryptographic assumption**); and after A18, Ed25519 unforgeability underwrote every authority conclusion while being equally unstated. The preflight found the "existing global home" did not exist: the single `_Assumptions / externally checked premises_` block belongs to the conditional-detection-probability bound and lists **beacon** premises only — the same class of finding as Stage 5M shipping no machine envelope. A21 creates the global register in Section 1 and states six assumptions once, each with an explicit **scope**: `canonical_encoding_unambiguous`, `hash_collision_resistance`, `hash_second_preimage_resistance`, `hash_preimage_resistance` (**hiding only** — it is not what makes a commitment binding), `ed25519_euf_cma`, `signing_key_not_compromised`. **Three** ceilings are minted, not four: `not_information_theoretic_binding`, `not_information_theoretic_hiding`, `not_proof_of_cryptographic_primitive_security`. The proposed fourth, `not_proof_of_signing_key_non_compromise`, is **rejected as duplicate ownership** — A18's Section 4-owned `not_proof_of_exclusive_or_uncompromised_producer_key_control` already states that fact more precisely, and the §1 completeness rule fails closed on duplicate ownership; A16 spent an entire amendment undoing exactly that condition. The injectivity sweep found **one** frozen violation, in §3.2: "two inputs produce the same case digest **only when** their parsed values produce identical bytes" asserts a bijection SHA-256 does not have, under a heading about being careful. It now names the assumption it was already spending. **The commitment frontier was preflighted, not assumed:** none of the nine digest constructions covers non-claims, assumptions or limitations, so `profile_bundle_digest`, `scope_vector_digest`, the precommitment, both censuses, the closure and every anchor are **unmoved**. But `release_non_claims` **is** signed as a `lexicographically_sorted_union`, so A21 **is not docs-only** — it moves the signed release envelope and nothing upstream of it. **No blade, law, evidence predicate, release predicate, or socket changed.** No conclusion was weakened: each named assumption was already being spent silently.

**Amendment A20 folded (amends frozen Sections 4 and 5):** The requirement ledger had **no canonical grammar**. Section 4 emitted a five-field block, Section 5 a six-field block missing `status:`, and Section 6's draft a terse `NAME: PENDING` line — three dialects for one contract, and no single parser could read all four requirements, only their union could. A ledger the Section 10 gate can only read by union is a ledger where **the gate decides the contract**. A20 freezes exactly four fields in fixed order — `requirement`, `owning section`, `permitted discharger`, `status` — and moves every consequence into **ledger semantics stated once**: `status: PENDING => release REJECTS`, exactly one owner, exactly one permitted discharger. Three fields are deleted. `unresolved at release: REJECT` was not wrong but **derivable**, and a field restating a global rule per record is a second home for it that nothing arbitrates when the two drift. `permanent ceiling:` in §5.9 gave `not_proof_of_global_census_closure_uniqueness_without_exclusion_witnesses` a **third** home while it already lived in `section_5.added_non_claims` — an A3 violation inside the ledger A3 polices — and a **ceiling is not a requirement**: requirements are discharged, ceilings are permanent, and one shape for both invites a reader to expect the ceiling to lapse. §5.9 gains the `status:` it never had. **The defect was found by fixture S6.44, the parser-union removal test, on its first execution** — not by review, and not by any of the twenty preceding amendments that read these blocks. The canonical parser alone now finds **4/4** requirements. **No requirement was added, removed, weakened or strengthened; no blade, law, evidence predicate, release predicate, ceiling or socket changed.** Only the machine grammar changed — which is why it needs an amendment number rather than an erratum: frozen normative text changed shape.

**Amendment A19 folded (amends frozen Section 4):** A18 minted three artifacts — the producer-authority schema, the `simurgh.vsc.producer_signature.ed25519.v1` profile, and the detached `closure_authorization` schema — and the profile bundle pinned none of them. The third is the load-bearing one: `closure_authorization_schema_digest` sits **inside the signed message**, so an unpinned schema would be producer-selected after anchoring and signed into apparent legitimacy — the §3.1 authority rule in its eighth costume, one artifact past A9's. The bundle expands **14 → 17 pairs**, and the descriptor's four profile fields are demoted to **declared, non-authoritative copies** whose authoritative home is the bundle: had the descriptor been authoritative while the bundle pinned the same profiles, a disagreement between them would have had no defined winner, which is A3's one-fact-one-home rule broken by a tidy-looking field. A fourth candidate — a separate closure-authorisation _verification_ profile — was **rejected**: verification is wholly owned by the signature profile, and pinning a profile for a construction another profile already governs is the decorative-amendment failure this stage has now refused three times. The limit-compatibility invariant was recomputed a **fifth** time: worst-case manifest **`7,267,676 <= 8,388,608`**, headroom **`1,120,932`** bytes, HOLDS; the three pinned-ASCII pairs cost **533 bytes**. **No blade, law, evidence predicate, release predicate, or socket changed** — A18 already changed the release predicate, and A19 binds the artifacts that change depends on.

**Amendment A18 folded (amends frozen Section 4):** Section 6's closure preflight established that Stage 5O bound **no cryptographic producer authority**: `stage5o_precommitment_digest` covered a scope and five policy slots and named no speaker, and neither census carried a signature or an authority field. A public anchor proves bytes were fixed before a height; it does not prove **who** fixed them. Any third party could therefore construct a well-formed closure over the same slot, anchor it, and manufacture conflict evidence against a producer who never authored it — a denial-of-service that turns the stage's own equivocation detector against honest producers. A18 binds `producer_authority_digest` **directly into the precommitment, immediately after `scope_vector_digest` and before the policy slots** — authority is not a policy. A preflight of every shipped signature-bearing stage found **no reusable profile**: `signature_profile_id`/`_digest` appear nowhere in the repository, only a helper convention that signs `canonicalJson` output with SPKI-PEM keys. Stage 5O therefore mints `simurgh.vsc.producer_signature.ed25519.v1` and **diverges deliberately twice**: 32 raw key bytes rather than PEM (a key has one identity byte string; PEM has many valid encodings of it), and exact domain-separated message bytes rather than an encoder's output (the §3.1 seam Section 3 already closed for `case_digest`). Two permanent ceilings are minted and defined: `not_proof_of_real_world_producer_identity` and `not_proof_of_exclusive_or_uncompromised_producer_key_control` — the stage proves continuity of a key, never who holds it or how well; **I7 remains open**. The limit-compatibility invariant was recomputed a **fourth** time: worst-case manifest **`7,267,143 <= 8,388,608`**, headroom **`1,121,465`** bytes, HOLDS. **The release predicate CHANGED: authorisation is a new release condition** — unlike every prior amendment in this stage. The invalidation frontier is recorded precisely rather than as "everything downstream": `case_digest`, `leaf_value`, `merkle_leaf`, `merkle_root`, `epoch_digest`, `profile_bundle_digest` and `scope_vector_digest` are **unchanged**, because they sit below the precommitment; the precommitment and every census, closure, anchor-subject and challenge-subject digest above it are **invalidated and must be recomputed**. Per-census authorisation was considered and **rejected as overbinding**: the closure digest already binds the exact census pair, so one authorised closure proves the authority endorsed both censuses as one presented story, and two further schemas, envelopes and validation paths would buy no property Stage 5O needs. **No blade, law, evidence predicate, or socket changed.**

**Amendment A17 folded (amends frozen Section 4):** Section 6 introduced seven concrete closure, anchor-handoff, and Stage 4T package-adapter constructions. The profile bundle expands **7 → 14 pairs**, pinning each by exact ID and digest **before anchoring**, so no producer may choose a closure schema, conflict-evidence shape, anchor schedule, or 4T adapter after the scope precommitment exists. A frozen **ownership map** assigns every Section 6 machine object exactly one owner; the **anchor instance** — a serialised evidence object, not merely a digest construction — has its exact-key schema covered by `closure_anchor_schedule_profile`, since its shape is static while only its values vary. The scope-manifest maximum was recomputed against the expanded bundle: **`7,266,642 <= 8,388,608`**, headroom **`1,121,966`** bytes. The seven new pairs cost only 1,263 bytes because their IDs are pinned to concrete ASCII rather than carrying the `2^16 - 1` bound. A17 pins **nothing imaginary**: no closure-only capsule (deleted by A14), no `closure_non_equivocation_profile` (no such mechanism exists — A13), no `package_capsule_salt` profile and no final package schema, section registry, or capsule root (all Section 12, not yet designed). **No blade, law, evidence predicate, release predicate, or socket changed.**
**Amendment A16 folded (amends frozen Sections 1 and 2):** The Section 1 baseline field `not_proof_that_the_private_scope_was_well_chosen` had **no normative definition anywhere** and overlapped `not_scope_adequacy`, which T3.4 cited alongside it as though the two were interchangeable. A field the release envelope signs while the spec never records its meaning is a riddle, not a limitation. A16 freezes an **outcome-versus-selection-process** distinction: adequacy concerns the **resulting universe**; "well chosen" concerns the undisclosed **process, rationale, and provenance** used to select it. T3.4 is narrowed to the adequacy ceiling alone, and new row **T3.7** exercises the selection-process ceiling through an accepted-blindness fixture (opaque selection **not** relying on prior outputs — distinguishing it from A15's T3.6, which does). The field is **not** renamed and **not** deleted: A1 forbids removing or silently renaming a frozen non-claim, and deprecation would demand migration machinery for no gain. Because the field is Section 1-owned, Section 2 references it and does **not** add it to `section_2.added_non_claims`. **No non-claim was removed, weakened, or renamed; no blade, law, or socket changed.** _(Corrected by A22: the definition audit behind A16 read only the `added_non_claims` production and therefore could not see Section 1's baseline, which declared through a second grammar. A16 repaired the one undefined ceiling it could parse; **four more in the same register went unseen**, and its completeness posture was unearned. A22 fixes the grammar, the four definitions, and the auditor.)_
**Amendment A15 folded (amends frozen Sections 1 and 2):** Section 6's anchor analysis established that future-height anchoring proves scope fixation **before the challenge height**, not before producer-controlled evaluation or result observation. Section 1's claim table asserted that Stage 5O catches "Commit the scope after seeing results" **Deterministically** — false: a producer may evaluate a large pool, observe outputs, select a flattering subset, and anchor it well before the challenge block, passing every check. Law 1 is renamed **"No Scope After The Fact" → "No Scope After Challenge Height"**; its body already stated the narrow, true property, so only the title overreached — the third time a name outran its mechanism, after A4 and A10. The claim row is split into A1 (at-or-after the height, deterministic, T4.1) and **A1b** (before the height but after seeing results, **not detected at all**). T4.1 is left alone: it already names the real after-height violation. Section 2 gains threat row **T3.6** and owns the new ceiling `not_proof_of_scope_selection_independence_from_prior_evaluation_outputs` — distinct from `not_scope_adequacy`, which concedes strategic **quality**, where this concedes selection **timing and information**. Another real weakening, for A13's reason: the stronger property was unavailable, not merely inconvenient. **No indexed-universe equality mechanism, evidence predicate, or socket changed.**
**Amendment A14 folded (amends frozen Section 5):** A13 put the Stage 4T capsule inside `section_6_anchored_presented_census_closure`'s discharge list. The Section 6 adapter preflight — reading 4T's `capsuleRoot = merkleRootSorted(sectionCommitment(section, salt) per keyed section)` — showed that condition is wrong twice over. **(1) A closure-only capsule is decorative:** every closure field is public, so nothing is redactable, exactly one substantive view exists, and 4T's "redact but never contradict" is satisfied trivially — a sorted Merkle root recommitting already-committed data, plus a second salt profile, for no added claim. **(2) A package capsule cannot exist before the challenge:** the audience-varying material 4T protects (openings, receipts, ledger, narrative) is produced by Sections 7–8 **after** the beacon, so binding a `closure_capsule_root` into the prechallenge `challenge_subject_digest` is **temporally circular** — anchoring a root over evidence the challenge has not yet generated. A14 drops `closure_capsule_root` from the prechallenge design and splits the deliverables across **two temporal layers**: Section 6 anchors the closure with **no Stage 4T**; **Section 12** discharges the 4T capsule over the assembled package once it exists. **No release requirement was removed** — the view-consistency property changed owner and gained an honest home. **No blade, law, evidence predicate, or socket changed.**
**Amendment A13 folded (amends frozen Section 5):** The Section 6 preflight read Stage 4T's source instead of its nickname. 4T's "No Two Stories" binds **audience views to a capsule root the verifier already holds** — "a view may REDACT, never CONTRADICT" — so it is not a two-closure conflict detector and not an exclusion relation. **"One filing has one story" is not "there is one filing."** No shipped Simurgh component supplies exclusion; offline, inclusion proves presence and cannot prove absence. A13 therefore (1) **narrows** `section_6_unique_census_closure` → `section_6_anchored_presented_census_closure`, handing the residue to the permanent ceiling `not_proof_of_global_census_closure_uniqueness_without_exclusion_witnesses`; (2) **rehomes** `the challenge seed BINDS census_closure_digest` from Section 6 to **Section 7**, which owns beacon-seed derivation — Section 6 must not report completion of another section's work. Stage 4T becomes the **presentation-integrity shell** around the 5O closure via an additive composition profile; its shipped release is **not** rewritten and remains historically true. The narrowing is a real weakening of §5.9's first promise and is recorded as one — permitted only because the preflight showed the property is unavailable to every shipped component, not merely inconvenient. Leaving an unsatisfiable requirement in the ledger would block Stage 5O forever while proving nothing. **No blade, law, evidence predicate, or socket changed.**
**Amendment A12 folded (amends frozen Section 2):** Section 5's `case_link_commitment` is checkable only at an opening, when `case_digest_i` becomes available. PC-1 froze the opening predicate `Q` as a function of `(case_i, salt_i, path_i, verifier-known i)` — a tuple with **no access to `E[i]`** — so `Q` could not see a case-link defect, and any claim that such a defect joins `J` would have been a probability claim with no executable predicate behind it. `Q` now also takes **verifier-known `E[i]`**, a public row of the execution-record census rather than producer-supplied opening data, granting the producer no authority. `Q`'s clauses are stated explicitly: leaf-preimage conformance, path and index conformance, and case-link conformance against `E[i].execution_record_digest`. **Additive**: `Q` gains discrimination and loses none; no non-claim is removed or weakened. **No blade, law, evidence predicate, release predicate, or socket changed.**
**Amendment A11 folded (amends frozen Section 4):** Section 5 introduced the public execution-record and reported-result censuses, establishing that Section 4's manifest-only sizing analysis understated the Stage 5O public evidence footprint by ~6.6x — at `2^18` the public core reaches **173.2 MiB, 90% of the 192 MiB canonical cap this project rejected at `2^20` as an unmeasured capacity hope**. The v1 cardinality ceiling drops `2^18` → **`2^16`**, and the scope-manifest canonical and transport limits drop `32 → 8 MiB` and `64 → 16 MiB` accordingly. The limit-compatibility invariant was recomputed: worst-case manifest 7,265,379 <= 8,388,608, headroom 1.071 MiB, HOLDS. Census-specific limits are defined by Section 5 and bound through the existing `commitment_profile_digest`. Canonical artifact size remains distinct from verifier heap usage — `not_proof_that_every_conforming_verifier_can_process_a_profile_conforming_artifact` stays permanent. A11 adds **no** concrete schema-digest values (none exist yet; `STAGE5O_V1_PROFILE_BUNDLE_DIGEST` is a placeholder the release gate resolves), inserts **no** `census_closure_digest` into any census, claims **no** heap bound, and claims **no** anti-equivocation before Section 6 discharges the closure requirement. **No blade, law, evidence predicate, release predicate, or socket changed.**
**Amendment A10 folded (amends frozen Section 1):** Section 5 measured that indexed identity equality does **not** prove that execution records arose from real invocations of their associated cases — a producer constructs the entry around any opaque payload digest and every check passes, one real execution reported at all `N` positions, `8/8` distinct entry digests, every check green. Section 1's blade and Law 2 said "committed, executed, and reported members", which invited exactly the inference Section 5 disproved. Both are narrowed to **"execution-record identities"**. The equality relation, the law's mechanism, the release predicate, and the sockets are **unchanged**: A10 removes a meaning the stage never possessed, not a guarantee it once had. **No blade mechanism, evidence predicate, or socket changed.**
**Amendment A9 folded:** The Section 5 preflight gate failed. `profile_bundle_digest` pinned five ID-digest pairs and covered **neither** the execution-object schema **nor** the result-object schema — the strings appeared nowhere in the spec, and `commitment_profile` owns only the §4.1.1 operational limits. Section 5's censuses are the objects whole-universe equality is read from, so their schemas were producer-selectable **after** `stage5o_precommitment_digest` was anchored: the §3.1 authority rule in its fourth costume, anchoring the shape of the argument rather than the argument. The bundle now carries **seven** pairs; `STAGE5O_V1_PROFILE_BUNDLE_DIGEST` changes, breaking nothing, because no Stage 5O artifact has been released. The §4.1.1 limit-compatibility invariant was **recomputed, not assumed** — two more IDs at the `2^16 - 1` ceiling cost 131,328 worst-case wrapper bytes, cutting headroom 5.542 → 5.417 MiB; it still holds. Attack S4.35 makes the new coverage falsifiable. **No blade, law, evidence predicate, or socket changed.**
**Amendment A8 folded (also amends frozen Sections 1–3):** Section 4 misclassified a temporary cross-section release dependency as a permanent signed non-claim. Because frozen non-claims can never be removed or weakened, that field could only ever have been signed as a stale limitation, and no contract operation called "discharge" existed for it. The opening-bundle resource-limit item is now a fail-closed `required_later_binding`, owned by Section 4 and dischargeable only by Section 8 through exact limits bound into `disclosure_policy_digest` with boundary fixtures. **Scope note:** the amendment necessarily extends into frozen Section 1, which defines the release envelope — a requirement that no release gate reads would be the same painted door one layer up. Section 1 gains the parallel `release_required_bindings` union and its completeness checks, and Sections 1–3 gain empty declarations — additive under the A1 no-rewrite discipline, changing no claim, law, digest, or byte construction. `not_proof_that_every_conforming_verifier_can_process_a_profile_conforming_artifact` remains a permanent non-claim — artifact conformance does not guarantee resource-capable implementations. No claim ceiling was weakened; release remains impossible until the requirement is discharged. **No blade, law, evidence predicate, or socket changed.**
**Section 4 pinned-limit ruling folded at freeze** _(cardinality and scope caps since SUPERSEDED by A11 — see above; recorded here as freeze history, not as current values)_**:** `MAX_SCOPE_CARDINALITY` `2^20`→`2^18`, canonical `192`→`32 MiB`, transport `256`→`64 MiB`, `MAX_CASE_BYTES` **64 KiB** unchanged. Cardinality is bounded by unmeasured runtime amplification, not by byte fit — both candidates fit their caps. Adds the limit-compatibility invariant, boundary fixtures S4.26–S4.34, and two `added_non_claims` (verifier capacity; global epoch uniqueness).
**Section 1 review edits folded at freeze:** record-fabrication claim ceiling + `not_proof_of_real_execution`; provider-agnostic public wording with the pinned seam deferred to the **Section 13** source map; indexed-universe equality replacing set equality; two-layer position-binding split + `not_proof_of_unopened_leaf_preimage_index_consistency`. (This list predates the amendment log; "record-fabrication" was formerly written "A3", which now collides with **Amendment A3** — attack IDs and amendment IDs are distinct namespaces.)
**Release target:** `v2.50.0-stage-5o-vsc-hidden-universe-equality`
**Motto:** _ClaimSafe first, then ReviewerSafe._
**Pays:** signed IOU **I6 `hiding_scope_commitment`** — in full, **on release acceptance** (not on spec approval).
**Mints:** nothing. `execution_origin_witnessing` is recorded as a successor-work **candidate**, not a socket; no IOU is minted until a future stage is selected and scoped.
**Reuses (frozen, unmodified):** the Stage 5M three-ecology external-anchor quorum, applied to the scope commitment anchor.
**Does NOT reuse:** Stage 5K's `simurgh.vuc.merkle_set.v1` leaf profile. Verified unsalted — `leafHash({leaf_id, leaf_type, subject_digest})` — therefore **binding but not hiding**, and canonicalised by sorting on `leaf_id`, which conflicts with position binding. Stage 5O defines a new domain-separated salted, position-bound profile.

**Amendment A1 folded:** Section 2 threat analysis added four signed claim ceilings and exposed an exact-versus-lower-bound ambiguity in the unopened-preimage statement. Section 1 now defines a monotone canonical non-claim union and delegates probability semantics to PC-0. **No blade, law, release predicate, or socket changed** — A1 is a claim-discipline correction, not a redesign.

**Amendment A2 folded:** Section 2 established that cumulative disclosure is enforceable only over a complete presented ledger for one commitment root. Section 1's unconditional "bounded" wording for A6 was narrowed accordingly. **No blade, law, release predicate, or socket changed.**

**Amendment A3 folded:** Removed the duplicated Section 2 non-claim mirror from Section 1. Each normative section now owns its additions, while Section 1 retains the baseline honest core and the monotone canonical-union invariant. The release gate requires an explicit section-level declaration, including empty declarations, from every normative section. **No blade, law, release predicate, or socket changed.**

**Amendment A4 folded:** Section 3 established that full leaf-preimage conformance is verified only for challenged positions. Law 3 was renamed from "No Unopenable Scope" to **"No Unopenable Challenge"** so its title matches its already-frozen body and signed limitations. The law body, blade, release predicate, and sockets are **unchanged** — only the claim the title was making. A law name is a claim.

**Amendment A5 folded:** Section 3.1 resolved the deferred opening-index representation by making `claimed_index` mandatory and non-authoritative. Section 1's optional-index wording and stale Section 4 forward reference were removed. Its explanatory concatenation formula was replaced with a symbolic reference to Section 3.2's sole normative byte construction. **No blade, law, release predicate, or socket changed.**

**Amendment A6 folded:** Section 4 established that the public scope manifest must materialise all `N` leaf entries, making the `u64` encoding ceiling operationally unacceptable — the accepted `N` exceeded a JavaScript array's maximum length by a factor of 4.29e9. Section 3.2 had already applied the encodable-≠-accepted principle to `MAX_CASE_BYTES` and failed to apply it to `N`. Section 3.2 now separates the binary encoding domain from the accepted Stage 5O v1 operational domain, which is profile-pinned by Section 4. **No blade, law, release predicate, or socket changed.**

**Amendment A7 folded:** Updated stale section-status labels and corrected Section 1's prior-art source-map forward reference from Section 12 to Section 13 after the section roadmap was finalised. **No blade, law, evidence predicate, release predicate, or socket changed.**

---

## Section 1 — identity, laws, honest core

### Blade (one)

A **privately committed evaluation universe** whose **committed scope identities, execution-record identities, and reported-result identities** are proven **exactly equal as indexed universes** under a salted, position-bound identity profile — without disclosing the unchallenged members. The commitment is externally anchored before a **predeclared future block height**; a public beacon derived from that block selects `k` indices the producer could not predict; each selected index must open to a valid case, salt, and authentication path.

Equality is the blade. The beacon challenge is what gives hiding teeth.

### Identity — indexed universes, not ordinary sets

Ordinary set equality discards ordering, collapses duplicates, and cannot express position binding. Stage 5O's equality is **function equality over a shared index domain**:

```text
dom(S) = dom(E) = dom(R) = {0, 1, ..., N-1}

∀ i ∈ dom(S):
  S[i].leaf_id = E[i].scope_leaf_id = R[i].scope_leaf_id
```

Where `S` is the committed scope, `E` the execution records, and `R` the reported results.

> **Equality means exact equality of index domains and position-bound leaf identities — not unordered payload-set equality.**

Each artifact's encoding must be a **bijection onto `{0..N-1}`**: exactly `N` entries, indices forming exactly that set, no repeats. This is a structural check over all `N`, requiring no openings and no payload disclosure.

Deterministically caught by this definition:

- missing indices;
- additional indices;
- duplicate-index laundering;
- reordering;
- substitution of one case for another;
- execution or result rows bound to the wrong scope member.

The private case payloads never appear in the execution and result artifacts. Only their common salted `leaf_i` identity does — so the equality check is itself non-disclosing.

**Coverage and guarantee, stated precisely.** Two distinct meanings of "position binding" are separated: the canonical tree position of the _public_ identifier (deterministic over all `N`), and the index embedded in the _private_ preimage (validated only for openings).

| Property                                         | Coverage   | Guarantee                                   |
| ------------------------------------------------ | ---------- | ------------------------------------------- |
| Canonical tree position → `leaf_id`              | all `N`    | **Deterministic**                           |
| Scope / execution / result identity equality     | all `N`    | **Deterministic**                           |
| Bijection onto `{0..N-1}`                        | all `N`    | **Deterministic**                           |
| Private preimage uses the **expected** index `i` | opened `k` | Probabilistic over the malformed population |
| Case and salt authenticate to `leaf_id`          | opened `k` | Deterministic per opening                   |

**Layer 1 — tree-position and cross-artifact identity equality.** The canonical tree shape places each `leaf_id` at declared tree position `i`, so the commitment itself binds `tree position i → leaf_id` for all `N` leaves. Combined with `S[i].leaf_id = E[i].scope_leaf_id = R[i].scope_leaf_id`, this deterministically proves whole-universe **positional identifier equality** — no openings, no payload disclosure.

**Layer 2 — leaf-preimage index consistency.** For each challenged position `i`, the verifier confirms:

```text
leaf_i =
  Stage5OLeaf(
    expected_epoch_digest,
    expected_index_i,
    salt_i,
    case_i
  )
```

`Stage5OLeaf` is **explanatory notation only**. Section 3.2 exclusively defines the normative domains, field order, byte encodings, length framing, and hash construction.

The critical word is **expected**. Frozen checks, for every challenged `i`:

1. The challenge selects canonical outer position `i`.
2. The authentication path proves `leaf_id` occupies tree position `i`.
3. Recalculation injects the **verifier-known** `i`.
4. The mandatory producer-supplied `claimed_index` must equal the verifier-known challenged index `i`. It is routing and review metadata only; leaf recomputation uses verifier-known `i`, never the producer-declared value.
5. Any preimage internally built with `j ≠ i` fails.

A verifier that recomputes from the opening's _self-declared_ index validates the producer's claim against itself, and the malformed leaf survives. The index field must never be trusted as an input to its own check.

**What an internal-index mismatch buys the producer.** It does _not_ bypass the committed list, cardinality, whole-universe cross-artifact equality, or tree-position binding of the public `leaf_id`. It _does_ buy a population of schema-malformed leaf preimages that remains invisible unless sampled.

If **exactly** `J` unopened leaves violate the declared opening predicate, a uniformly sampled challenge of `k` distinct indices detects at least one with **exact** probability `1 − C(N−J, k) / C(N, k)`. If **at least** `J` leaves violate the predicate, that expression is a **lower bound**. If the predicate cannot recognise the defect, the guarantee does not apply. An internal-index mismatch is counted among the defects `J` under the opening predicate — it needs no separate machinery.

All probability claims are subject to **PC-0**'s validity domain, predicate-precommitment, beacon assumptions, and canonical rational encoding rules.

The consequence is **not cosmetic across compositions.** Within Stage 5O's own verification context the mismatch gains the producer nothing exploitable, because every consumer reads `leaf_id` at its bound tree position. But a future composition that detaches a leaf from its Merkle position and relies on the embedded index would activate the dormant population. Stage 5S composes frozen sub-evidence; a latent defect in a composed input is a defect of the composition. Hence the signed limitation rather than a reassurance.

### The three laws

1. **No Scope After Challenge Height** (A15) — the private universe and its cardinality `N` are committed and externally anchored before the predeclared challenge height. `N` is bound _into_ the commitment, not signed beside it.

> **Why the title changed (A15).** The law was called **"No Scope After The Fact"**, and "the fact" was unqualified — a reader takes it to mean _after seeing results_. Section 6's anchor analysis established that the anchor proves fixation before the **challenge height** and nothing earlier. A producer may evaluate a large candidate pool, observe the outputs, select a flattering subset, commit that subset, and anchor it well before the challenge block; every check passes. The law's **body already said the narrow, true thing**; only the title overreached. This is the third time a name outran its mechanism — after A4 (`No Unopenable Scope` → `No Unopenable Challenge`) and A10 (`executed` → `execution-record`). **A law name is a claim.** 2. **No Hidden Shrinkage** (A10) — the **committed scope, execution-record, and reported-result identity universes** are exactly equal as indexed universes under the Stage 5O salted, position-bound identity profile.

> **Why "execution-record", not "executed" (A10).** Section 5 measured that indexed identity equality does not prove an execution record arose from a real invocation of its associated case: a producer can construct the entry around any opaque digest and every check passes. "Executed" invited that inference; "execution-record identities" names what the bytes carry. The equality relation, the law's mechanism, the release predicate, and the sockets are unchanged — A10 removes a meaning the law never possessed rather than a guarantee it once had. 3. **No Unopenable Challenge** (A4) — every beacon-selected index must produce a valid case, salt, and authentication path. Refusal, absence, duplication, or malformation **fails closed**. The law binds **challenged** positions; it does not assert that all `N` leaves are openable (see `not_proof_of_unopened_leaf_preimage_conformance`).

### Honest core — baseline and accumulation rule

**Accumulation rule (A1, A3).** Section 1 freezes the **baseline** honest core. Later reviewed sections may **add** non-claims when their threat analysis exposes a new claim ceiling. The release envelope signs the canonical **union** of all section-level non-claims. **No later section may remove, weaken, or silently rename a previously frozen non-claim.** The limitations remain normative and signed — "not an appendix" is preserved in substance — while the spec is permitted to learn without pretending Section 1 predicted every future seam.

**Ownership rule (A3).** Each normative section **owns and defines** any non-claims first introduced by that section. Section 1 defines the **baseline honest core and the accumulation rule only** — it does not mirror later sections' additions. The release envelope signs the canonical union of the Section 1 baseline and every later section's owned additions. One fact, one home, one signature path.

**Freeze invariant.**

```text
release_non_claims =
  lexicographically_sorted_union(
    section_1.added_non_claims,
    section_2.added_non_claims,
    ...
    section_13.added_non_claims
  )
```

Ordering is **lexicographic by machine field**, fixed and canonical, so a non-claim's section of origin cannot affect the signed bytes.

**Required later bindings are a SECOND ledger, not non-claims (A8).** A non-claim is **permanent**: once frozen it may never be removed or weakened, so a temporary cross-section dependency recorded as a non-claim can never be discharged — the release would sign a stale limitation forever, and any later section claiming to have "discharged" it would be performing an operation the contract does not define. That is a painted door at the claim-ledger layer. Temporary dependencies therefore live in their own ledger with the opposite lifecycle: **fail-closed until resolved**.

```text
release_required_bindings =
  lexicographically_sorted_union(
    section_1.required_later_bindings,
    ...
    section_13.required_later_bindings
  )
```

```text
- required_later_bindings are NOT non-claims and are NOT a claim ceiling
- they are fail-closed release prerequisites
- each requirement has exactly ONE owning section
- each requirement names exactly ONE permitted discharging section
- an unresolved requirement at release -> REJECT
- a later section CANNOT claim discharge by prose; discharge requires the
  exact artifacts the requirement names, bound into the digest it names
- the release envelope signs BOTH the requirement AND its discharge evidence
- every normative section MUST declare required_later_bindings, even if empty
- a missing section-level declaration fails the release gate
```

The two ledgers differ in direction and must never be conflated. A **non-claim** is honest permanent scope: it is signed and stays. A **required later binding** is an unfinished obligation: it is signed and **blocks release** until the named section discharges it with bytes. Recording an obligation in the permanent ledger understates the spec's honesty by pretending a gap is a boundary; recording a boundary in the obligation ledger would promise a discharge that can never come.

**Sections 1–3 were frozen before this mechanism existed.** A8 adds their empty declarations — `section_1.required_later_bindings = []` here, and `section_2` / `section_3` at their own ledger sites — because a rule requiring every section to declare cannot exempt the sections that predate it without reintroducing the ambiguity it exists to remove: a missing declaration would again be unreadable as either "none" or "forgot". These are additive amendments to frozen text under the A1 no-rewrite discipline, not silent edits: they add an empty ledger, and change no claim, law, digest, or byte construction.

**Completeness checks (A3) — the section index IS the census.**

```text
- every normative section MUST declare added_non_claims, even if empty
- every normative section MUST declare required_later_bindings, even if empty (A8)
- each machine field has exactly one owning section
- later sections may reference an existing field but MUST NOT redefine it
- duplicate ownership fails closed
- removal, weakening, or silent renaming fails closed
- a missing section-level declaration fails the release gate
```

The last rule is load-bearing: without it a producer could "compute the union" while quietly omitting a section, which is selective omission wearing the union's clothes.

**Four-way equality (A22) — the auditor must prove its own coverage.** The rules above police the ledger. A22 adds the rule that polices the police: the gate MUST derive four registers independently and require **exact ordered membership equality** between all four, not merely equal counts.

```text
canonical declarations      // every section_<N>.added_non_claims, one grammar
      ==
definition registry         // every recorded ceiling definition
      ==
ownership map               // name -> exactly one owning section
      ==
release_non_claims          // the signed lexicographically sorted union
```

```text
- comparison is on the ORDERED canonical sequence, never on cardinality
- a declared name with no definition                 -> REJECT
- a defined name that no section declares            -> REJECT
- a name in the release envelope absent from the spec registers -> REJECT
- a name declared by two sections                    -> REJECT   (A3: one owner)
- a name defined twice                               -> REJECT   (A3: one home)
- a declaration outside the canonical production     -> REJECT
- a misspelled register name                         -> REJECT, never skipped
- a missing register                                 -> REJECT, never "zero"
```

**The lexical tripwire.** Any declaration-shaped `not_*` identifier appearing in a normative fenced block **outside** a `section_<N>.added_non_claims` production MUST fail. Without it the parser can go blind again while still reporting perfect internal consistency — which is exactly what happened: for twenty-one amendments the audit compared a register against itself and called the agreement coverage. **An audit that cannot fail on its own blind spot is not evidence, it is a claim.** The counts the gate derives — declarations, definitions, owners, release members — are **generated output**. No count in this specification is normative, and none may be maintained by hand; the numbers this stage has hand-carried are the numbers this stage has gotten wrong.

#### 1.x Auditor self-tests (A22) — `implementation_regression_fixtures`

Each row **mutates the specification (or the produced envelope) and requires the gate to reject.** They exist because the pre-A22 auditor was internally consistent and externally blind: it compared a partial register against itself for twenty-one amendments and reported agreement as coverage. A gate with no test that recreates its own former failure is a gate that has never been shown to fail. **No raw codes** — the subject is the document and its envelope, not a verifier runtime.

| ID   | Mutation                                                                                           | Expected                            | Class                                |
| ---- | -------------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------ |
| S1.1 | Section 1 declares as a **bare list outside the canonical production** (the exact pre-A22 dialect) | **reject**                          | `implementation_regression_fixtures` |
| S1.2 | a **declared** name with no definition                                                             | **reject**                          | `implementation_regression_fixtures` |
| S1.3 | a **defined** name that no section declares                                                        | **reject**                          | `implementation_regression_fixtures` |
| S1.4 | a produced **release envelope** carries a name absent from the spec registers                      | **reject**                          | `implementation_regression_fixtures` |
| S1.5 | one name **declared by two sections** (A3 duplicate ownership)                                     | **reject**                          | `implementation_regression_fixtures` |
| S1.6 | the register name is **misspelled** (`addded_non_claims`)                                          | **reject** — never silently skipped | `implementation_regression_fixtures` |
| S1.7 | Section 1's register is **removed entirely**                                                       | **reject** — never read as "zero"   | `implementation_regression_fixtures` |
| S1.8 | a declaration-shaped `not_*` name in a **normative fenced block outside a register** (tripwire)    | **reject**                          | `implementation_regression_fixtures` |
| S1.9 | a **separator dropped** — the mixed comma dialect Section 2 shipped for twenty-one amendments      | **reject**                          | `implementation_regression_fixtures` |

**S1.6 and S1.7 are the load-bearing pair, and they are the ones that were missing.** Every other row fails on a name; these two fail on a **register**. A parser that cannot see a register reports no errors from it, and no-errors is what green looks like. S1.1 is the specific historical defect; S1.6 and S1.7 are its general form.

**S1.4's subject is an artifact, not a sentence.** The other eight mutate document text; S1.4 mutates a **produced envelope**, because "the release envelope signs a name the spec never declared" is unrepresentable in the document — the document's union is derived. A gate that only ever reads the spec cannot fail this row, so the gate takes the envelope as an input and checks it against the registers. **The first draft of this fixture reported `SKIP`; a skipping fixture in a completeness audit is the disease, not the test.**

**Section 1 baseline** — declared in the one canonical production every section uses (A22):

```text
section_1.added_non_claims = [
  not_scope_adequacy,
  not_zero_disclosure,
  not_proof_of_real_execution,
  not_proof_of_unopened_leaf_preimage_index_consistency,
  not_proof_of_beacon_unbiasability_or_finality,
  not_proof_of_salt_entropy,
  not_semantic_junk_detection_beyond_declared_predicate,
  not_proof_that_the_private_scope_was_well_chosen,
  not_information_theoretic_binding,
  not_information_theoretic_hiding,
  not_proof_of_cryptographic_primitive_security
]
```

**"Baseline" is prose, not a machine name (A22).** Section 1 is the baseline in the sense that it freezes the honest core every later section accumulates onto — but it declares through the **same** field as every other section, `added_non_claims`. Before A22 it used a bare list under a distinct name, `section_1.baseline_non_claims`, and that second name was not a synonym: it was a **second dialect**, and the audit that was supposed to police the ledger parsed only the first. Eleven ceilings — including four with no definition anywhere — sat outside every completeness check this stage ran, while those checks reported green. A ledger with two grammars is a ledger whose parser decides what is normative. There is now exactly one production:

```text
section_<N>.added_non_claims = [
  <name>,           // every entry but the last carries a trailing comma
  <name>,           // an optional // comment may follow the comma
  <name>            // the last entry carries none
]
```

**The separator is part of the production (A22).** Before A22 the comma was arbitrary: Section 3 used none, Sections 4 and 5 used them throughout, and **Section 2 used both** — seven entries bare and one comma'd, on the single line A15 happened to edit. That is not a grammar; it is a record of which amendment last touched which line. A parser permissive enough to read all three is a parser that has stopped being a specification of anything, so the gate is **strict**: a missing or extra separator rejects. The four registers below are compared by a parser with no tolerance to spend.

**This list is declaration-ordered, not sorted** — unlike Sections 2 and 5, which declare lexicographically. It is harmless: `release_non_claims` is a `lexicographically_sorted_union`, so a section's internal order cannot reach the signed bytes. A21 appends rather than re-sorting, and A22 preserves the order it found, because reordering frozen text would buy nothing and obscure the diff.

> Selective openings reveal the challenged cases. All unchallenged case payloads remain undisclosed under the stated commitment assumptions.

> **`not_scope_adequacy`** (defined by A16) — Stage 5O does not prove that the resulting committed universe is sufficiently relevant, representative, balanced, difficult, comprehensive, or otherwise adequate for the declared evaluation purpose. **This is a claim about the resulting universe.**

> **`not_proof_that_the_private_scope_was_well_chosen`** (defined by A16) — Stage 5O does not verify the **process, rationale, or provenance** by which the producer selected the private universe. An apparently adequate universe may have been assembled through undisclosed, non-reproducible, or strategically selective criteria. **This is a claim about the selection process, not merely the resulting universe.**

**A16 — why this field had no definition, and why it is not deleted.** Section 1 listed `not_proof_that_the_private_scope_was_well_chosen` in the baseline and never defined it anywhere; T3.4 cited it alongside `not_scope_adequacy` as though the two were interchangeable. A field the release envelope signs while the spec never records its meaning is a riddle, not a limitation. It is **not** renamed and **not** deleted: the A1 accumulation rule forbids removing or silently renaming a frozen non-claim, and deprecating it would demand migration machinery for no gain. A16 gives it the one precise meaning it always needed, distinct from adequacy:

| Ceiling                                                                                    | The question it refuses to answer                                      |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `not_scope_adequacy`                                                                       | Is the **resulting universe** good enough?                             |
| `not_proof_that_the_private_scope_was_well_chosen`                                         | Was the **selection process** principled and reproducible?             |
| `not_proof_of_scope_selection_independence_from_prior_evaluation_outputs` (A15, Section 2) | Was the selection process **independent of already observed results**? |

The third is a specific failure mode **inside** the second's broader process question. It is retained separately because it has a concrete attack (T3.6) and a concrete fixture; the second covers opaque selection that does **not** rely on prior outputs (T3.7). Without A16 the second was a poetic duplicate of the first, and the ledger carried two names for one fact — the exact condition A3's one-fact-one-home rule exists to prevent.

> **`not_proof_of_real_execution`** — Stage 5O proves equality and consistency among committed scope identities, execution-record identities, and reported-result identities. It does not independently prove that every execution record arose from a real model or system invocation.

> **`not_proof_of_unopened_leaf_preimage_index_consistency`** — The verifier deterministically checks each public leaf identifier's canonical tree position and cross-artifact equality. It validates the private preimage's embedded index only for beacon-selected openings.

> **`not_zero_disclosure`** (defined by A22) — The construction does not prove that its transcript reveals **zero** information beyond the declared statement. Public inputs, sizes, cardinalities, equality outcomes, failure classes and other declared metadata may remain visible. **No general zero-knowledge claim is made.**

> **`not_proof_of_beacon_unbiasability_or_finality`** (defined by A22) — The referenced beacon or anchor state is an **externally checked premise**. The stage does not prove that the beacon was unbiased, immune to grinding or withholding, uniquely canonical, censorship-resistant or irreversible.

> **`not_proof_of_salt_entropy`** (defined by A22) — Salt presence, encoding and length checks do not prove randomness, secrecy, independence, uniqueness or sufficient entropy. Reused or low-entropy salts may weaken the declared hiding property — which is why `not_information_theoretic_hiding` names this ceiling rather than restating it.

> **`not_semantic_junk_detection_beyond_declared_predicate`** (defined by A22) — Acceptance proves only satisfaction of the **explicitly declared predicate and schema**. It does not prove semantic meaning, usefulness, authenticity or the absence of adversarial junk that satisfies that predicate.

**A22 — why four baseline ceilings had no definition, and how they survived twenty-one amendments.** These four were frozen into the Section 1 baseline and never defined anywhere. They are the same defect A16 spent an entire amendment repairing for `not_proof_that_the_private_scope_was_well_chosen` — _a field the release envelope signs while the spec never records its meaning is a riddle, not a limitation_ — and A16 did not find them, nor did the nineteen amendments that followed it, because every non-claim audit this stage ran matched `section_N.added_non_claims = [ ... ]` and Section 1 declared through a different production. The parser could not see the register, so the register could not fail. A21 then **spent** `not_proof_of_salt_entropy` inside its definition of `not_information_theoretic_hiding` — citing, as a load-bearing dependency, a ceiling with no meaning on record. A22 defines all four and removes the dialect that hid them; the auditor self-tests below exist so that this specific blindness fails loudly rather than reporting green.

A hidden universe that is fixed is not a universe that is right. **Hiding makes gerrymandering invisible**; the beacon challenge bounds _stuffing_, never _taste_.

### Cryptographic premises — stated once, for the whole document (A21)

**Preflight finding: there was no global home, and no statement to put in it.** The single `_Assumptions / externally checked premises_` block belongs to the conditional-detection-probability bound below and lists **beacon** premises only. Cryptographic primitives were assumed **everywhere and stated nowhere**: SHA-256 collision resistance underwrites every "declared digest MUST equal verifier recomputation" rule in §4.7.3, Merkle binding in §3.5, slot binding in §6.1 and profile-bundle binding in §4.4; and after A18, Ed25519 unforgeability underwrites every authority conclusion in the stage. A document that spends Section 3 refusing to let `canonicalJson` carry semantics it does not have may not let SHA-256 carry a bijection it does not have either.

**The register is global. It is stated here, once, and never repeated inside a requirement record, a threat row, or a ceiling definition.**

```text
assumption: canonical_encoding_unambiguous
scope:      all hashed and signed preimages
meaning:    distinct accepted semantic objects must not have multiple accepted
            canonical byte encodings

assumption: hash_collision_resistance
scope:      digest equality, Merkle binding, slot binding, profile-bundle binding
meaning:    equal digests are COMPUTATIONAL evidence of equal canonical
            preimages, never logical injectivity

assumption: hash_second_preimage_resistance
scope:      post-commitment substitution resistance
meaning:    a committed object cannot feasibly be replaced by a distinct
            accepted object carrying the same digest

assumption: hash_preimage_resistance
scope:      hiding claims only
meaning:    concealed committed values remain computationally hard to recover
            where sufficient secret entropy exists

assumption: ed25519_euf_cma
scope:      producer-authority and other Ed25519-authenticated objects
meaning:    an attacker without the signing key cannot feasibly produce a fresh
            valid signature for a covered message

assumption: signing_key_not_compromised
scope:      all authority conclusions
meaning:    signature validity does not prove key custody, non-compromise, or
            correct human control

assumption: hmac_sha256_prf_security
scope:      HKDF-Extract-SHA256 and HKDF-Expand-SHA256 (A25)
meaning:    HMAC-SHA256 is assumed to provide the pseudorandom-function
            behaviour the pinned HKDF construction requires

assumption: beacon_ikm_sufficient_conditional_min_entropy
scope:      challenge_seed extraction (A25)
meaning:    after any adversarial mining, withholding or selection influence
            permitted by the stated beacon threat model, the verifier-derived
            beacon value is assumed to retain sufficient conditional
            min-entropy for HKDF-Extract-SHA256 to produce a suitable
            pseudorandom key
```

**The scope column is load-bearing.** `hash_preimage_resistance` is scoped to hiding **only**: it is not what makes a commitment binding, and a spec that cites it for binding has confused the two properties. `hash_collision_resistance` is scoped to every equality conclusion, which is why it appears in four places at once.

**A25's second assumption is positive and load-bearing, and it is the one to read twice.** `beacon_ikm_sufficient_conditional_min_entropy` is not a limitation — it is a **premise the stage spends** every time it calls the challenge unpredictable. Its ceiling already exists: Section 1's `not_proof_of_beacon_unbiasability_or_finality` states that Stage 5O does not prove it, and **no second non-claim may be minted for the same fact** (A3; the §1 completeness rule fails closed on duplicate ownership). The same holds for the primitives: `not_proof_of_cryptographic_primitive_security` (A21) remains the **sole home** for the fact that Stage 5O proves neither HMAC nor HKDF secure. **An assumption and its ceiling are two views of one boundary; minting a ceiling per assumption would double the ledger and halve its meaning.**

**Three ceilings, not four.** `signing_key_not_compromised` gets an assumption but **no new ceiling**: its ceiling already exists as A18's Section 4-owned `not_proof_of_exclusive_or_uncompromised_producer_key_control`, which states the same fact more precisely. Minting `not_proof_of_signing_key_non_compromise` beside it would be duplicate ownership, and the §1 completeness rule says duplicate ownership **fails closed** — the ledger would carry two names for one fact, which is exactly what A3 exists to prevent and what A16 spent an amendment undoing.

> **`not_information_theoretic_binding`** (A21) — every Stage 5O commitment is **computationally** binding, never unconditionally so. An adversary with unbounded computation, or a future break of the pinned hash, could open a commitment to a value other than the one committed. No claim in this stage survives such an adversary.

> **`not_information_theoretic_hiding`** (A21) — hiding is **computational** and depends on salt entropy (`not_proof_of_salt_entropy`), not on the structure of the commitment. An unbounded adversary, or a preimage break, recovers concealed case payloads. The two ceilings are duals and neither implies the other: a scheme may be computationally binding and computationally hiding, and Stage 5O claims exactly that pair and no more.

> **`not_proof_of_cryptographic_primitive_security`** (A21) — Stage 5O does not prove SHA-256 collision resistance, second-preimage resistance, or preimage resistance, nor Ed25519 EUF-CMA security. These are **assumed**, and the register above names each assumption, its scope, and what it buys. If a primitive falls, the conclusions resting on it fall with it, and no fixture in this stage detects that: a verifier using the same hash cannot distinguish two colliding preimages from one. This is why S6.36 is an **assumption-language fixture** whose subject is a sentence rather than an enforcement fixture whose subject is bytes.

### Attack taxonomy — what is deterministic, what is probabilistic, what is neither

| #   | Attack                                                                       | Caught                                                         | By                                                                               |
| --- | ---------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| A1  | Commit or replace the scope **at or after the predeclared challenge height** | **Deterministically**                                          | future-height anchor (Law 1); T4.1                                               |
| A1b | Commit the scope after seeing results, but anchor it **before** the height   | **Not at all** (A15)                                           | none — `not_proof_of_scope_selection_independence_from_prior_evaluation_outputs` |
| A2  | **Structural omission** — census has ≠ `N` entries, or index domains differ  | **Deterministically**                                          | indexed-universe equality (Law 2)                                                |
| A3  | **Record fabrication** — `N` records exist, some invented                    | **Conditionally probabilistic, possibly not at all**           | beacon opening, bounded by predicate power                                       |
| A4  | **Scope stuffing** — `N` real executions, `J` of them junk                   | **Probabilistically** at `P_detect(N,J,k)`                     | beacon opening                                                                   |
| A5  | **Challenge manipulation** — refuse or malform an opening                    | **Deterministically**                                          | fail-closed (Law 3)                                                              |
| A6  | Unzip the corpus via repeated audits                                         | **Locally bounded, conditional on evidence completeness** (A2) | cumulative disclosure budget                                                     |

**Missing execution is not a probabilistic detection event.** Commit `N` and report fewer, or shift the index domain, and the census comparison fails with certainty. The sampling probability never qualifies the equality law.

**A6 — locally bounded, conditional on evidence completeness (A2).** The verifier enforces the unique-index disclosure budget over the **complete, non-forked disclosure history presented for one commitment root and epoch**. It does **not** prove that omitted histories, disconnected reviewers, or re-committed versions of the same hidden corpus do not exist. The budget is not unconditionally bounded — it is bounded relative to the evidence it was handed. See `not_proof_of_global_cross_verifier_disclosure_budget`, `not_proof_of_complete_disclosure_history_without_committed_ledger` and `not_proof_of_cross_commitment_corpus_reuse` — all owned and declared by Section 2 (A22: cited inline, because a fenced list of bare names is a register's shape and citation must never wear it).

**A3 — record fabrication, stated without overclaim:**

```text
Caught: conditionally probabilistic, and potentially undetectable.

If at least J fabricated records violate the declared audit predicate,
sampling detects at least one with P_detect(N, J, k).

If fabricated records satisfy the predicate, Stage 5O proves membership
and cross-artifact consistency, not real execution occurrence.
```

> **The declared audit predicate's discriminating power is the ceiling on what opening can detect.** If the predicate cannot distinguish a fabricated execution record from a real one, an opening proves _membership_, not _execution_.

Deterministic execution-occurrence evidence would require an independent trust root — provider-signed invocation receipts, a producer-independent sink or witness, hardware-backed attestation, or a challenge-response ceremony controlled outside the producer. A producer-signed response digest is **not** sufficient: a producer controlling both the signing key and the execution environment can sign a fabricated digest. That is a separate blade, recorded as the successor-work candidate `execution_origin_witnessing`.

### Conditional detection probability (not a soundness bound)

```text
P_detect(N, J, k) = 1 − C(N−J, k) / C(N, k)
```

Sampling is **without replacement** over `k` distinct indices; the hypergeometric form is exact. The with-replacement approximation `1 − (1−J/N)^k` is not used: it understates detection (at `N=1247, k=30`: `J=1` → 0.023780 vs exact 0.024058; `J=62` → 0.783451 vs exact 0.787431). The error is conservative rather than an overclaim, but exactness is free.

**Encoding:** exact integer numerator and denominator as **decimal strings**. Verified necessary, not stylistic — `canonicalJson` throws on BigInt (`Do not know how to serialize a BigInt`), and IEEE-754 doubles will not survive JS↔Python↔browser parity.

The theorem establishes the combinatorial result **given**:

_Modelled facts_

- `N`, `J`, `k` are valid (`0 ≤ J ≤ N`, `0 ≤ k ≤ N`);
- sampling yields `k` distinct, uniformly distributed indices;
- at least `J` indices violate the declared predicate.

_Assumptions / externally checked premises_

- the beacon-derived seed was unpredictable before commitment;
- the derivation algorithm was faithfully executed.

This mirrors Stage 5N's `elapsedSoundness`, which is conditional on the committed uncertainty bounds holding of the true clocks. A biasable or reorganisable beacon means a predictable challenge, which **voids the bound entirely**. Stage 5O therefore **consumes** `not_proof_of_beacon_unbiasability_or_finality` and makes it load-bearing. It does not discharge it.

### Beacon hygiene (normative)

```text
beacon  → challenge index derivation   (public)
CSPRNG  → per-leaf salts               (private, never beacon-derived)
```

Per the NIST beacon project's explicit warning against using beacon output as secret key material. Salts are ≥256-bit and locally generated; the residual is signed as `not_proof_of_salt_entropy`.

### Motivating seam (prior-art map classification: **motivating seam**, not novelty evidence)

Published frontier-lab policy permits confidential evaluation or review scopes while requiring complete coverage. The cited policy condition is currently expressed in prose rather than as a publicly recomputable evidence relation.

The pinned instance (full citation with retrieval date and digest belongs in **Section 13**'s source map): the cited policy text states a complete-coverage condition over confidentially reviewed sections, but **does not specify a public, machine-verifiable mechanism by which an outsider can recompute that coverage**. This is a statement about the published text only; it is not a claim that no internal mechanism exists.

**What Stage 5O contributes to such a claim:** Stage 5O makes the **hidden-universe completeness and no-omission component** machine-checkable under its declared evidence contract. It does not make the full claim checkable — whether material was genuinely _evaluated_ additionally requires reviewer receipts, independence, and adequacy mechanisms. In Simurgh terms the stronger statement belongs to a composition:

```text
5O hidden-universe equality
  + 5I reviewer coverage equality
  + 5J rating obligations and divergence
```

and even then, each stage's adequacy and human-action non-claims are retained.

**Prior art we do NOT claim.** Publicly verifiable random sampling via randomness beacons is established prior art, including the goals of enabling public verifiability of random sampling and preventing selection bias or advance knowledge of selections. Merkle commitments, salted commitments, and hypergeometric acceptance sampling are all established.

**Novelty claim (composition only):** a pre-anchored, salted, position-bound private evaluation universe whose execution and result sets must equal the commitment as indexed universes, combined with an independently derived public-beacon challenge, exact signed detection bounds, cumulative disclosure accounting, and fail-closed adequacy non-claims.

---

## Section 2 — threat model and attack matrix (FROZEN `0e26c361`)

Six classes. Every concrete attack belongs to **exactly one primary class**. No raw codes are assigned in this section.

### Detection-mode vocabulary (frozen for this spec)

| Mode                          | Meaning                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Deterministic**             | Rejected for every instance, from evidence the verifier already holds. No sampling.                          |
| **Conditional probabilistic** | Detected only when sampled **and** the declared predicate discriminates it. Requires a probability contract. |
| **Assumption-dependent**      | Outside verifier reach; correctness rests on a signed external premise.                                      |
| **Potentially undetectable**  | No verifier action exists within this stage's contract. Names a claim ceiling.                               |

**Discipline:** "probabilistic" never appears alone. Every conditional-probabilistic row cites a probability contract (PC-1…PC-3) stating the defective population, the discriminating predicate, the required beacon assumptions, the exact expression, and the behaviour when the predicate cannot discriminate.

### T1 — structural omission and substitution

Producer capability throughout: full control of the census encoding. Required evidence throughout: the public census (no openings, no payload disclosure).

| ID   | Attack                                         | Targets    | Mode          | Failure outcome                                | Residual | Normative fixture           | Class |
| ---- | ---------------------------------------------- | ---------- | ------------- | ---------------------------------------------- | -------- | --------------------------- | ----- |
| T1.1 | census holds ≠ `N` entries                     | Law 2      | Deterministic | reject: cardinality ≠ committed `N`            | —        | `census_short_by_one`       |
| T1.2 | missing index                                  | Law 2      | Deterministic | reject: index domain ≠ `{0..N-1}`              | —        | `census_missing_index`      |
| T1.3 | duplicate index                                | Law 2      | Deterministic | reject: encoding not a bijection               | —        | `census_duplicate_index`    |
| T1.4 | out-of-range index                             | Law 2      | Deterministic | reject: index ∉ `{0..N-1}`                     | —        | `census_index_out_of_range` |
| T1.5 | scope/execution/result domain mismatch         | Law 2      | Deterministic | reject: `dom(S) ≠ dom(E)` or `dom(E) ≠ dom(R)` | —        | `execution_domain_mismatch` |
| T1.6 | reordered `leaf_id`                            | Laws 1 + 2 | Deterministic | reject: root mismatch at bound tree position   | —        | `leaf_reordered`            |
| T1.7 | substituted `leaf_id`                          | Law 1      | Deterministic | reject: root mismatch                          | —        | `leaf_substituted`          |
| T1.8 | execution/result row bound to another position | Law 2      | Deterministic | reject: `S[i].leaf_id ≠ E[i].scope_leaf_id`    | —        | `result_row_crossbound`     |

**Class guarantee:** deterministically rejected, without openings. No residual — the guarantee is complete over all `N`.

### T2 — record fabrication

Producer capability throughout: controls the execution environment **and** its own signing keys. Required evidence: openings + the declared predicate; no independent execution witness exists in this stage.

| ID   | Attack                                                               | Targets               | Mode                             | Failure outcome                                               | Residual                      | Normative fixture                                         | Class |
| ---- | -------------------------------------------------------------------- | --------------------- | -------------------------------- | ------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------- | ----- |
| T2.1 | execution records invented for calls never made                      | meaning of "executed" | Conditional probabilistic (PC-2) | reject **iff** the predicate discriminates at an opened index | `not_proof_of_real_execution` | `fabricated_record_predicate_visible`                     |
| T2.2 | fabricated model-response digests                                    | meaning of "executed" | Conditional probabilistic (PC-2) | as T2.1                                                       | `not_proof_of_real_execution` | `fabricated_response_digest`                              |
| T2.3 | producer signs synthetic execution evidence with its own trusted key | meaning of "executed" | **Potentially undetectable**     | none — no verifier action exists                              | `not_proof_of_real_execution` | `self_signed_synthetic_execution` (must verify **green**) |

**Class guarantee:** Stage 5O proves identity consistency, not real execution occurrence. T2.3's fixture is a deliberate green: a producer controlling both key and environment produces evidence this stage cannot distinguish from honest evidence, and the stage must say so rather than fail in a way that implies it caught something.

### T3 — scope stuffing and gerrymandering

Producer capability throughout: free choice of the private universe's contents before anchoring.

| ID   | Attack                                                                                                                                                                                                                                                                              | Targets                 | Mode                                                                                                                    | Failure outcome                                                    | Residual                                                                             | Normative fixture                                                                                                                       | Class |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| T3.1 | trivial cases inserted to inflate `N`                                                                                                                                                                                                                                               | hiding vs adequacy      | Conditional probabilistic (PC-1)                                                                                        | reject on an opened trivial case                                   | `not_semantic_junk_detection_beyond_declared_predicate`                              | `stuffed_trivial_cases`                                                                                                                 |
| T3.2 | **real cases duplicated across positions**                                                                                                                                                                                                                                          | probability integrity   | **Pair-conditional probabilistic (PC-3) — effectively undetectable**                                                    | reject only if **both** members are opened                         | **`not_proof_of_case_distinctness`**                                                 | `duplicate_payload_pair`                                                                                                                |
| T3.3 | malformed or semantically empty cases                                                                                                                                                                                                                                               | predicate               | Conditional probabilistic (PC-1)                                                                                        | reject on an opened empty case                                     | `not_semantic_junk_detection_beyond_declared_predicate`                              | `stuffed_empty_case`                                                                                                                    |
| T3.4 | technically valid but strategically weak universe                                                                                                                                                                                                                                   | adequacy                | **Not addressed**                                                                                                       | none — outside the contract                                        | `not_scope_adequacy`                                                                 | `weak_but_valid_universe` (must verify **green**)                                                                                       |
| T3.5 | **cardinality dilution** — valid, unique, genuinely executed filler cases added to grow `N` while the defect count stays fixed                                                                                                                                                      | probability integrity   | **Potentially undetectable as misconduct** — the verifier computes and signs the weakened probability exactly           | reject only if the policy-bound non-vacuity floor is unmet (below) | `not_proof_of_challenge_parameter_adequacy`, `not_proof_of_target_defect_prevalence` | `cardinality_dilution_absolute_basis` (**rejected** at floor), `cardinality_dilution_fraction_basis` (accepted **+ ceilings asserted**) |
| T3.6 | **pre-anchor output-conditioned scope selection** (A15) — the producer evaluates a larger candidate pool, observes outputs, selects a favourable subset, and anchors it **before** the challenge height                                                                             | scope-selection timing  | **Potentially undetectable** — the anchor proves when bytes were fixed, never what the producer knew when it fixed them | none — no verifier action exists                                   | `not_proof_of_scope_selection_independence_from_prior_evaluation_outputs`            | `pre_anchor_output_conditioned_scope_selection` (must verify **green** + ceiling asserted)                                              |
| T3.7 | **opaque or non-reproducible scope-selection process** (A16) — the producer selects a valid and possibly adequate universe through undisclosed criteria, convenience sampling, private heuristics, or a non-reproducible procedure, **without** relying on prior evaluation outputs | scope-selection process | **Potentially undetectable** — no artifact records why these cases and not others                                       | none — no verifier action exists                                   | `not_proof_that_the_private_scope_was_well_chosen`                                   | `opaque_selection_process_valid_universe` (must verify **green** + exact ceiling asserted)                                              |

**Class guarantee:** detectable defects among at least `J` positions are sampled at exact `P_detect(N,J,k)`; semantic quality above the declared predicate is not established; scope adequacy remains unproved. T3.4 verifies green **by design** — a stage that failed a weak-but-honest universe would be claiming adequacy judgement it does not have.

#### T3.5 — cardinality dilution and the policy-bound non-vacuity floor

Dilution is distinct from stuffing: every added case may be genuinely executed, unique, and predicate-passing, and every universe equality may hold. **The verifier is not deceived — it computes and signs the weakened probability correctly.** The attack is that the number becomes microscopic and nobody reads it.

Measured (`k=30`, `J=5` fixed, valid filler added):

```text
N=  1247  J=5  P_detect=0.114814
N= 12470  J=5  P_detect=0.011973
N= 62350  J=5  P_detect=0.002404      <- 48x collapse, every check still green
```

**Non-vacuity floor (normative).** Precommit, before the anchor:

```text
target_defect_basis        absolute_count | fraction
target_defect_threshold    J* or f*
minimum_detection_bound    p_min (exact rational, PC-0 encoding)
k_derivation_version
```

For a fraction basis, `J* = ceil(f* × N)`. The verifier **rejects** unless:

```text
P_detect(N, J*, k) >= p_min
```

This prevents the challenge from silently falling below its own declared policy. It does **not** prove the selected `J*`, `f*`, or `p_min` are wise.

**The two bases behave differently under dilution:**

```text
absolute-count basis:
  J* remains fixed as N grows;
  the declared detection floor may weaken under cardinality expansion.

fraction basis:
  J* = ceil(f* × N);
  the policy target scales with N;
  the bound remains conditional on the actual predicate-visible defect
  population being at least J*.
```

A fraction-based target is **resistant to simple cardinality dilution within the declared policy model**, because its hypothetical defect threshold scales with `N`. It is **not exactly invariant** under finite-population arithmetic and the ceiling operation, and it **does not prove that the committed universe actually contains the target defect fraction**. Measured (`f*=0.004, k=30`): `P` drifts `0.11481395` at `N=1247` to `0.11334823` at `N=124700` — a `1.28%` relative spread converging on the asymptote `1 − (1 − f*)^k = 0.11329297`.

**The prevalence gap — why `not_proof_of_target_defect_prevalence` exists.** The floor is computed against a _hypothetical_ threshold. If reality holds fewer defects than the policy supposes, the premise "at least `J*` positions violate the predicate" is **false**, and the advertised bound **does not apply at all**:

```text
producer: 5 real predicate-visible defects + 10,000 valid filler, policy f* = 0.05
  N=11247   J* (policy hypothetical) = 563   ->  advertised floor  P = 0.786190
            J  (actual reality)      =   5   ->  true detection    P = 0.013268
```

A correctly computed, correctly signed `0.786190` that means nothing, because its premise is false. The floor is a statement about the _policy_, never about the _universe_.

**Three adjacent ceilings that must not be conflated:**

| Ceiling                                     | What it concedes                                                      |
| ------------------------------------------- | --------------------------------------------------------------------- |
| `not_proof_of_target_defect_prevalence`     | the real universe may hold fewer predicate-visible defects than `J*`  |
| `not_proof_of_challenge_parameter_adequacy` | the chosen `J*`, `f*`, or `p_min` may simply be too weak              |
| `not_scope_adequacy`                        | the universe may be strategically poor regardless of any defect count |

### T4 — challenge manipulation

**Verifier-enforced failures and external assumptions are separated.** Beacon unpredictability and finality are signed premises; the verifier does not manufacture them.

| ID   | Attack                                                                           | Targets               | Mode                     | Failure outcome                                                                                           | Residual                                        | Normative fixture                                                                 | Class |
| ---- | -------------------------------------------------------------------------------- | --------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------- | ----- |
| T4.1 | commitment created after the challenge height                                    | Law 1                 | Deterministic            | reject: anchor time ≥ predeclared height                                                                  | —                                               | `commit_after_height`                                                             |
| T4.2 | producer-selectable or retryable block height                                    | Law 1                 | Deterministic            | reject: height not bound in the pre-anchor policy digest                                                  | —                                               | `height_reselected`                                                               |
| T4.3 | beacon unpredictability, selection-neutrality, availability, or finality failure | probability integrity | **Assumption-dependent** | availability failure alone fails closed; unpredictability or neutrality failure has **no verifier check** | `not_proof_of_beacon_unbiasability_or_finality` | `beacon_unavailable` (fails closed); none for neutrality — outside verifier reach |
| T4.4 | modulo-biased index derivation                                                   | probability integrity | Deterministic            | reject: derivation not rejection-sampled                                                                  | —                                               | `modulo_biased_derivation`                                                        |
| T4.5 | duplicate challenge indices                                                      | probability integrity | Deterministic            | reject: fewer than `k` distinct indices                                                                   | —                                               | `duplicate_challenge_index`                                                       |
| T4.6 | producer-controlled `k`                                                          | probability integrity | Deterministic            | reject: `k` not bound pre-anchor                                                                          | —                                               | `producer_chosen_k`                                                               |
| T4.7 | seed omits commitment root, epoch, or policy digest                              | probability integrity | Deterministic            | reject: seed preimage incomplete                                                                          | —                                               | `seed_missing_root`                                                               |
| T4.8 | accept a later favourable beacon after an unfavourable one                       | Law 1                 | Deterministic            | reject: more than one challenge per epoch, or height mismatch                                             | —                                               | `beacon_reroll`                                                                   |

**Class guarantee:** every listed attack except T4.3 is a verifier-enforced deterministic rejection. T4.3 is the load-bearing external premise, and it is broader than grinding alone — it covers **unpredictability, selection neutrality, availability, and finality**, with failure modes including miner or producer collusion, hash grinding, block withholding, selective beacon abandonment, chain reorganisation, and compromised beacon derivation.

**Availability and neutrality fail differently.** A beacon that is _unavailable_ fails closed: no seed, no challenge, no green. A beacon whose _unpredictability or neutrality_ is broken produces a perfectly well-formed challenge that silently voids PC-1, PC-2, and PC-3 — the arithmetic still computes, and it no longer means anything. Only the first is a verifier check.

### T5 — commitment and preimage manipulation

| ID   | Attack                                                             | Targets | Mode                                                   | Failure outcome                                                    | Residual                                                | Normative fixture                                                                    | Class |
| ---- | ------------------------------------------------------------------ | ------- | ------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----- |
| T5.1 | **malformed** salt — short, non-canonical encoding, or empty       | hiding  | Deterministic on opening                               | reject: salt < 256 bits, non-canonical, or absent                  | —                                                       | `short_salt`, `noncanonical_salt`                                                    |
| T5.2 | salt provenance **declared** as beacon-derived                     | hiding  | Deterministic                                          | reject: `salt_source` ∉ permitted private-CSPRNG sources           | —                                                       | `declared_beacon_derived_salt` (must **reject**)                                     |
| T5.3 | domain-separation swap                                             | Law 2   | Deterministic on opening; unopened join `J` under PC-1 | reject: recomputation mismatch                                     | `not_proof_of_unopened_leaf_preimage_index_consistency` | `domain_swap`                                                                        |
| T5.4 | non-canonical case encoding                                        | Law 3   | Deterministic on opening; unopened join `J` under PC-1 | reject: encoding not canonical                                     | `not_proof_of_unopened_leaf_preimage_index_consistency` | `noncanonical_case`                                                                  |
| T5.5 | internal index `j ≠ i`                                             | Law 2   | Deterministic on opening; unopened join `J` under PC-1 | reject: recomputation with **verifier-known** `i` fails            | `not_proof_of_unopened_leaf_preimage_index_consistency` | `internal_index_mismatch`                                                            |
| T5.6 | authentication path valid for another position                     | Law 2   | Deterministic on opening; unopened join `J` under PC-1 | reject: path does not reach the root at position `i`               | `not_proof_of_unopened_leaf_preimage_index_consistency` | `path_wrong_position`                                                                |
| T5.7 | cross-epoch leaf replay                                            | Law 1   | Deterministic                                          | reject: epoch not bound, or epoch mismatch                         | —                                                       | `cross_epoch_replay`                                                                 |
| T5.8 | ambiguous tree padding or odd-leaf rule                            | Law 1   | Deterministic                                          | reject: tree shape ≠ canonical shape for `N`                       | —                                                       | `ambiguous_padding`                                                                  |
| T5.9 | salt secretly beacon-derived, **undeclared**, well-formed 256 bits | hiding  | **Potentially undetectable**                           | none — a valid-looking salt is indistinguishable from CSPRNG bytes | `not_proof_of_salt_entropy`                             | `undeclared_beacon_derived_salt_indistinguishable` (accepted **+ ceiling asserted**) |

**Class guarantee:** tree position and public identity equality are deterministic over all `N`; private preimage correctness is verified only for opened positions; malformed unopened preimages form part of the unknown defective population `J`.

**Malformed salts and unpredictable salts are different animals.** An opened salt _can_ be checked for required byte length, canonical encoding, non-emptiness, and recomputation correctness — all deterministic per opening (T5.1). It _cannot_ be checked for genuine entropy from its bytes alone: a beacon-derived 256-bit value and a CSPRNG 256-bit value are indistinguishable to any verifier (T5.9). **Low entropy is therefore not placed under PC-1** — the declared predicate cannot recognise it, so it never enters `J`. The distinction that matters is disclosure, not derivation: a producer who _declares_ a beacon salt source is deterministically rejected (T5.2); a producer who lies about it is invisible (T5.9).

### T6 — disclosure accumulation

**This class is not challenge manipulation.** Every challenge may be perfectly unbiased and correctly derived. The attack is that legitimate audits compose.

| ID   | Attack                                                                                                                           | Targets                        | Mode                                                    | Failure outcome                                                           | Residual                                                            | Normative fixture                                                                                                                                                           | Class |
| ---- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| T6.1 | repeated valid audits gradually unzip the universe                                                                               | hiding                         | Deterministic (locally)                                 | reject: cumulative disclosure > declared budget                           | `not_proof_of_global_cross_verifier_disclosure_budget`              | `budget_exhausted`                                                                                                                                                          |
| T6.2 | independently operating reviewers collate their openings                                                                         | hiding                         | **Potentially undetectable**                            | none — a local verifier cannot observe other verifiers                    | `not_proof_of_global_cross_verifier_disclosure_budget`              | `collated_reviewers_isolated_views` (accepted **+ ceiling asserted**); `collated_reviewers_merged_receipts_over_budget` (**rejected** when all receipts reach one verifier) |
| T6.3 | epoch reset drops disclosure history                                                                                             | hiding                         | Deterministic                                           | reject: budget not carried across epochs of the same root                 | —                                                                   | `epoch_reset_budget`                                                                                                                                                        |
| T6.4 | fresh audit requested after learning the previous sample                                                                         | hiding + probability integrity | Deterministic                                           | reject: more than one challenge per epoch                                 | —                                                                   | `post_hoc_reaudit`                                                                                                                                                          |
| T6.5 | same commitment reopened under multiple nominal policies                                                                         | hiding                         | Deterministic                                           | reject: budget is keyed on the **commitment root**, not on (root, policy) | —                                                                   | `multipolicy_reopen`                                                                                                                                                        |
| T6.6 | **disclosure-history truncation or fork** — producer supplies only a favourable prefix, or one branch, of prior opening receipts | hiding                         | **Potentially undetectable** without a committed ledger | none — an offline verifier knows only the history it was handed           | `not_proof_of_complete_disclosure_history_without_committed_ledger` | `truncated_disclosure_history`, `forked_disclosure_history` (accepted **+ ceiling asserted**)                                                                               |
| T6.7 | **cross-commitment corpus reuse** — the same private corpus recommitted with fresh salts under a new root, resetting the budget  | hiding                         | **Potentially undetectable**                            | none — fresh salts make the two roots unlinkable                          | `not_proof_of_cross_commitment_corpus_reuse`                        | `resalted_corpus_new_root` (accepted **+ ceiling asserted**)                                                                                                                |

**Class guarantee:** cumulative disclosure is tracked per commitment root and epoch; already-disclosed indices count against the budget; a new challenge cannot silently reset the budget; exceeding the declared budget fails closed or requires a newly committed universe and policy.

**What the budget counts.** The baseline unit is **unique disclosed indices per commitment root** — not opening events and not total disclosures, since re-opening an already-disclosed index reveals nothing new and should not consume budget. Per-recipient exposure is **outside** this number: the budget bounds what has been revealed, not to whom.

**The budget's completeness is only as good as the history the verifier is given.** "Cumulative disclosure budget" sounds deterministic, and it is — over the receipts presented. An offline verifier cannot know that the presented history is complete (T6.6) or that a fresh root does not conceal the same corpus (T6.7). Closing T6.6 requires a **monotonic per-root disclosure ledger**: previous-state digest, unique opened-index census, challenge receipt chained to prior state, and a complete-history requirement for offline verification. Until that is built, the gap is signed. Recorded as the successor-work **candidate** `federated_disclosure_ledger`; no socket minted.

**Three distinct honest ceilings, often confused:**

| Ceiling                                                             | What escapes                                                                                 |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `not_proof_of_global_cross_verifier_disclosure_budget`              | separate verifiers sharing what each legitimately learned                                    |
| `not_proof_of_complete_disclosure_history_without_committed_ledger` | one verifier being handed a truncated or forked local history                                |
| `not_proof_of_cross_commitment_corpus_reuse`                        | the same corpus re-salted under a new root, unlinkable even to a single verifier seeing both |

### Probability contracts

#### PC-0 — shared preconditions for every probability contract

**Domain (frozen).**

```text
0 <= J <= N
0 <= k <= N
C(a, b) = 0 when b > a
```

**Exact versus lower bound (frozen).** The distinction is not decorative — a producer quoting the bound must not be able to choose the reading:

```text
If EXACTLY J positions violate predicate Q:
  P_detect = 1 - C(N-J, k) / C(N, k)

If AT LEAST J positions violate Q:
  P_detect >= 1 - C(N-J, k) / C(N, k)
```

More defects can only raise detection, so an "at least `J`" claim yields a **minimum guarantee**, never an exact probability.

**Predicate precommitment (frozen).** The audit predicate must not be selectable or weakenable after the sample is known. Bound into the pre-challenge commitment:

```text
predicate_id
predicate_version
predicate_digest
predicate_parameters
```

Every contract below applies **only** to defects violating the _precommitted_ predicate.

**Canonical rational encoding (frozen).** Canonical JSON serialises faithfully; it cannot canonicalise a rational's value. `"2"/"4"` and `"1"/"2"` are the same number and must not be two encodings. Therefore:

- positive denominator;
- numerator and denominator reduced to **lowest terms** (gcd-divided);
- decimal strings, no leading zeroes except the literal `"0"`.

#### PC-1 — single-position detectable defect

Cited by: T3.1, T3.3, T5.3, T5.4, T5.5, T5.6, S5.23 (A12).

1. **Defective population** — the `N` committed positions, of which `J` contain a defect detectable at a **single** position.
2. **Discriminating predicate** — the precommitted opening predicate `Q`, a per-position function of `(case_i, salt_i, path_i, verifier-known i, verifier-known E[i])` (A12).

   ```text
   Q(opening_i) includes:
     leaf-preimage conformance
     path and index conformance
     case-link conformance against E[i].execution_record_digest      (A12)
   ```

   **Why `E[i]` is a legitimate `Q` input (A12).** Section 5's `case_link_commitment_i = SHA256(EXECUTION_CASE_LINK_DOMAIN || case_digest_i || execution_record_digest_i)` is checkable **only** when `case_digest_i` becomes available, which happens **only** at an opening. `E[i]` is a **public, verifier-held** row of the execution-record census, not producer-supplied opening data, so admitting it to `Q` grants the producer no authority — it is the same class of input as `verifier-known i`. Without this admission, `Q` cannot see a case-link defect at all, and any statement that such a defect joins `J` would be a probability claim with no executable predicate behind it. The amendment is **additive**: `Q` gains discrimination, loses none, and no non-claim is removed or weakened.

3. **Required beacon assumptions** — the seed was unpredictable before commitment; the derivation algorithm was faithfully executed. (See T4.3: neutrality failure voids this contract silently.)
4. **Expression** — exact for exactly `J`; a **minimum guarantee** (`>=`) for at least `J`. Per PC-0.
5. **When `Q` cannot discriminate** — the defect is not counted in `J`, and the contract says nothing whatsoever about it. `P_detect` is a statement about `Q`-visible defects only.

#### PC-2 — record fabrication

Cited by: T2.1, T2.2, T2.3.

1. **Defective population** — let `V` be the subset of fabricated records **visible to `Q`** at a single opened position. `V` is generally much smaller than the fabricated population, and may be empty.
2. **Discriminating predicate** — the precommitted `Q`, which has no access to an independent execution witness. A producer-signed response digest is signed by the party under audit.
3. **Required beacon assumptions** — as PC-1.
4. **Expression** — `P_detect` over `V` only: exact for exactly `|V|`, a minimum guarantee for at least `|V|`.
5. **When `Q` cannot discriminate** — **If zero fabricated records are predicate-visible, the detection probability is zero regardless of the total fabricated population.** This is the general case for a producer controlling both signing key and execution environment. Stage 5O proves identity consistency, not execution occurrence (`not_proof_of_real_execution`).

#### PC-3 — relational defect: one declared duplicate pair

Cited by: T3.2. **`P_detect(N, J, k)` does not apply to this class.**

**Scope, stated narrowly:** PC-3 defines the exact probability for **one declared defective pair**. Multi-pair or duplicate-group claims require a structure-specific probability contract and **may not be inferred from edge count alone**.

**Active domain (frozen).**

```text
PC-3 active domain:
  N >= 2
  2 <= k <= N
```

Outside that domain PC-3 makes **no claim**:

```text
For k < 2:
  pair_detection_probability = 0
  pair_ratio                 = absent
  PC-3 claim                 = inactive
```

The ratio field is absent rather than zero because `(N−1)/(k−1)` divides by zero at `k=1` and yields a negative value at `k=0`. A field that cannot be computed must not be emitted.

1. **Defective population** — one specified pair of positions holding the same case. Each member is individually well-formed, non-trivial, and predicate-passing, because each **is a real case**.
2. **Discriminating predicate** — **none exists at single-position granularity.** Duplication is a relation between two positions; any per-position `Q` is blind to it by construction. Detection requires both members in the same sample.
3. **Required beacon assumptions** — as PC-1.
4. **Exact expression** — for one specified pair:

   ```text
   P_pair(N, k) = C(N-2, k-2) / C(N, k) = k(k-1) / (N(N-1))
   ```

5. **When `Q` cannot discriminate** — always, at single-position granularity. Signed as `not_proof_of_case_distinctness`.

**Verifier behaviour (normative — PC-3 is a check, not prose).** A probability contract with no executable step behind it detects nothing even when both members are sampled. Required:

- the **relational predicate `R`** is precommitted alongside `Q` (`predicate_id`, `predicate_version`, `predicate_digest`, `predicate_parameters`);
- when `R` is declared, the verifier evaluates **all unordered pairs among the opened cases** — not a fixture-specific duplicate check;
- opening **both** members of a pair forbidden by `R` → **reject**;
- opening **one** member → **accept**, with `not_proof_of_case_distinctness` asserted present.

Minimum paired fixtures:

```text
duplicate_pair_both_opened
  -> reject (via the precommitted relational predicate R)

duplicate_pair_one_opened
  -> accept
  -> not_proof_of_case_distinctness required present
```

**Ratio to single-position detection has a closed form**, and is therefore **not a constant**:

```text
P_detect(N, 1, k) / P_pair(N, k) = (N-1) / (k-1)
```

Measured: `N=1247, k=30` → `42.97`; `N=100, k=10` → `11.00`; `N=5000, k=50` → `102.02`. Any single quoted multiplier is an artifact of one configuration.

**Multi-pair structure is not derivable from a defect count.** For `m` **disjoint** pairs the exact expression is:

```text
P_pair-detect(N, m, k) = 1 - [ Σ_{r=0}^{min(m,k)} C(m,r) · 2^r · C(N-2m, k-r) ] / C(N, k)
```

For an arbitrary relation graph `G`, the exact probability is `1 − I_k(G) / C(N, k)`, where `I_k(G)` counts size-`k` vertex subsets containing no defective relation edge. Stage 5O **does not ship** the general graph computation; a structure-specific contract is required for any multi-pair claim.

Measured (`N=1247, k=30`, disjoint pairs): `m=1` → `0.000560`; `m=50` → `0.027664`; `m=200` → `0.106696`; `m=400` → `0.203338`. The independence approximation `1 − (1 − P_pair)^m` understates these by up to `1.29%` at `m=400` and is **not** used.

**Consequence, stated without superlative.** Duplication is a particularly **sampling-resistant relational stuffing strategy**, because each member may pass an independent single-case predicate and detection may require opening both related positions. It is **not** claimed to be optimal: a semantically weak but unique case that passes the precommitted predicate (T3.4) is undetectable at probability zero, which is strictly stronger for the producer than any relational strategy.

This is signed, not solved. Considered and rejected: a committed per-case tag `PRF(K, H(case_i))` renders duplicates deterministically visible over all `N`, but verifying tag derivation at an opening requires `K`, and revealing `K` makes the entire tag list brute-forceable — hiding dies. Recorded as the successor-work **candidate** `case_distinctness_witnessing`. No socket minted.

#### Single-challenge semantics — no aggregate detection claim

**PC-1, PC-2, and PC-3 apply independently to ONE challenge.** The disclosure ledger does **not** create an aggregate detection claim across challenges. Stage 5O ships no PC-4.

This blocks the laundering move: _"three audits opened `k=30`, therefore we sampled 90 cases."_ That is false whenever challenges overlap.

**Why no PC-4.** An aggregate contract over `q` challenges would be exact only if every challenge is present in the complete ledger and the producer cannot suppress an unfavourable one — which is **precisely T6.6**, the disclosure-history-completeness hole this section signs as unprovable. A probability contract resting on a premise we have already conceded we cannot verify is a bound in name only. If a future stage builds the monotonic committed ledger (`federated_disclosure_ledger`), an aggregate contract becomes available; it is not available now.

Signed as `not_proof_of_aggregate_multi_challenge_detection_probability`.

### Accepted-blindness fixtures — what "green" must mean

Eight fixtures encode attacks this stage genuinely cannot catch. **Green must never mean a silent raw `0`.** It means: valid under the bounded contract, **with the exact non-claim asserted present**. A verifier that accepts the fixture but drops the limitation **fails the test**.

```text
self_signed_synthetic_execution:
  accepted
  not_proof_of_real_execution           = present
  real_execution_verified               = false or absent

weak_but_valid_universe:
  accepted
  not_scope_adequacy                    = present

undeclared_beacon_derived_salt_indistinguishable:
  accepted
  not_proof_of_salt_entropy             = present
  no claim that salt generation was independently verified

collated_reviewers_isolated_views:
  accepted (each isolated view)
  not_proof_of_global_cross_verifier_disclosure_budget = present

truncated_disclosure_history / forked_disclosure_history:
  accepted
  not_proof_of_complete_disclosure_history_without_committed_ledger = present

resalted_corpus_new_root:
  accepted
  not_proof_of_cross_commitment_corpus_reuse = present

cardinality_dilution_fraction_basis:
  accepted (policy floor met)
  not_proof_of_target_defect_prevalence     = present
  not_proof_of_challenge_parameter_adequacy = present

duplicate_pair_one_opened:
  accepted
  not_proof_of_case_distinctness            = present
```

The paired **enforcement** fixtures prove the other side — that the stage does bite where evidence exists:

```text
declared_beacon_derived_salt:                    rejected
collated_reviewers_merged_receipts_over_budget:  rejected (all receipts at one verifier)
cardinality_dilution_absolute_basis:             rejected (non-vacuity floor unmet)
duplicate_pair_both_opened:                      rejected (via precommitted relational predicate R)
```

### `section_2.added_non_claims` — owned by this section (A3)

Per the Section 1 ownership rule, Section 2 **owns and defines** the ceilings first introduced by its threat analysis. Section 1 does not mirror this list; the release envelope computes the canonical union. All seven are **claim ceilings**, not IOUs. No sockets minted; successor-work candidates recorded without scoping a stage.

**Declaration** (lexicographic by machine field):

```text
section_2.added_non_claims = [
  not_proof_of_aggregate_multi_challenge_detection_probability,
  not_proof_of_case_distinctness,
  not_proof_of_challenge_parameter_adequacy,
  not_proof_of_complete_disclosure_history_without_committed_ledger,
  not_proof_of_cross_commitment_corpus_reuse,
  not_proof_of_global_cross_verifier_disclosure_budget,
  not_proof_of_scope_selection_independence_from_prior_evaluation_outputs,   // A15
  not_proof_of_target_defect_prevalence
]

section_2.required_later_bindings = []          // A8
```

> **`not_proof_of_scope_selection_independence_from_prior_evaluation_outputs`** (A15) — Stage 5O proves that the scope was fixed **before the predeclared challenge height**. It does **not** prove that the producer had not already evaluated candidate cases, observed outputs, or selected the committed universe as a favourable subset.

**Distinct from both existing scope ceilings, and the difference is the whole point.** `not_scope_adequacy` concedes that the universe may be **strategically poor** — a quality claim. This one concedes something about **selection timing and information**: the universe may be excellent by every quality measure and still have been chosen _because_ the producer already knew how those cases would score. A well-chosen universe and an outcome-chosen universe are indistinguishable to every Stage 5O check, and only the second is misconduct.

**Why no mechanism reaches it.** The anchor is a statement about _when bytes were fixed_, not about _what the producer knew when it fixed them_. Nothing in a commitment distinguishes a universe assembled blind from one assembled after a dress rehearsal. Closing it would need evidence about the producer's prior computation — an execution-origin witness Stage 5O does not have and does not claim.

> **`not_proof_of_case_distinctness`** — Stage 5O does not establish that the committed private universe contains `N` distinct cases. Duplicated cases are individually valid and are detectable only when both members of a pair fall in the same sample.

> **`not_proof_of_global_cross_verifier_disclosure_budget`** — Stage 5O tracks cumulative disclosure per commitment root within one verifier's ledger. It does not prove that independently operating verifiers have not collated their legitimately disclosed openings.

> **`not_proof_of_complete_disclosure_history_without_committed_ledger`** — Stage 5O's disclosure budget is deterministic over the receipts it is given. Absent a monotonic committed ledger, it does not prove that the presented disclosure history is complete rather than a favourable prefix or a single branch of a fork.

> **`not_proof_of_cross_commitment_corpus_reuse`** — Stage 5O does not prove that two commitment roots conceal different corpora. The same private cases re-salted under a fresh root are unlinkable, including to a single verifier holding both.

> **`not_proof_of_challenge_parameter_adequacy`** — Stage 5O enforces that the challenge meets its own precommitted non-vacuity floor. It does not prove that the selected `J*`, `f*`, or `p_min` are strong enough to matter.

> **`not_proof_of_target_defect_prevalence`** — The signed challenge floor is calculated against a precommitted hypothetical defect threshold. It does not prove that the actual hidden universe contains that many predicate-visible defects.

> **`not_proof_of_aggregate_multi_challenge_detection_probability`** — Each probability contract applies to one challenge. Stage 5O makes no claim about combined detection across repeated challenges, and the disclosure ledger does not create one.

Successor-work candidates: `case_distinctness_witnessing`, `federated_disclosure_ledger`, `execution_origin_witnessing` (from Section 1).

### Section 2 freeze gate

| Gate                                                                          | Status                                                                                                                                                                                        |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PC-1 and PC-2 distinguish exact probability from minimum guarantee            | ✅ PC-0 freezes exact-for-`J` vs `>=`-for-at-least-`J`, plus domain and canonical rational encoding                                                                                           |
| PC-3 narrowed to one specified pair                                           | ✅ multi-pair needs a structure-specific contract; exact disjoint-pair sum and graph form recorded, neither shipped                                                                           |
| PC-3 has a strict active domain and an executable relational check            | ✅ `N>=2`, `2<=k<=N`; `k<2` → probability 0, ratio **absent**, claim inactive; precommitted relational predicate `R` over all unordered opened pairs                                          |
| Cardinality dilution named with a policy-bound non-vacuity floor              | ✅ T3.5; both bases distinguished; fraction basis **resistant, not invariant** (1.28% measured drift); prevalence gap signed                                                                  |
| Repeated audits carry no aggregate detection claim                            | ✅ Option A — PC-1/2/3 are single-challenge; no PC-4, because its premises are the T6.6 hole                                                                                                  |
| "Duplication is optimal" removed                                              | ✅ replaced with "sampling-resistant relational strategy"; T3.4 named as strictly stronger                                                                                                    |
| Green blindness fixtures assert limitations, not merely acceptance            | ✅ eight accepted-blindness fixtures assert non-claim presence; four paired enforcement fixtures reject                                                                                       |
| Beacon salt fixture distinguishes disclosed from indistinguishable provenance | ✅ T5.2 declared → **reject**; T5.9 undeclared → accepted + ceiling                                                                                                                           |
| Disclosure truncation, ledger forking, cross-root corpus reuse named          | ✅ T6.6, T6.7, with two new ceilings                                                                                                                                                          |
| Each attack belongs to exactly one primary class                              | ✅ 40 attacks (T1 8, T2 3, T3 5, T4 8, T5 9, T6 7), one class each                                                                                                                            |
| Deterministic failures not diluted by sampling language                       | ✅ T1 and T4 (except T4.3) carry no probability text                                                                                                                                          |
| Record fabrication never presented as generally detectable                    | ✅ T2.3 `potentially undetectable`; PC-2 states zero-visible → zero probability                                                                                                               |
| Beacon guarantees separated from beacon assumptions                           | ✅ T4.3 is the sole assumption-dependent row; availability fails closed, neutrality does not                                                                                                  |
| **Cryptographic premises stated globally, once, with explicit scope (A21)**   | ✅ §1 register — six assumptions; `hash_preimage_resistance` scoped to hiding ONLY; primitives are assumed, never proven; three ceilings, the fourth rejected as duplicate ownership of A18's |
| **No cryptographic conclusion rests on an unnamed assumption (A21)**          | ✅ §1, §3.2 — the injectivity sweep found one frozen violation and corrected it; S6.36 is an assumption-LANGUAGE fixture, since no verifier using the same hash can detect a collision        |
| Repeated-audit disclosure has its own class                                   | ✅ T6, distinct from T4                                                                                                                                                                       |
| Section 2 declares `added_non_claims` explicitly (A3 ownership rule)          | ✅ seven owned ceilings, lexicographic; Section 1 carries no mirror                                                                                                                           |
| Every residual maps to an existing non-claim or proposes one without an IOU   | ✅ seven proposed, all claim ceilings; three successor candidates, zero sockets                                                                                                               |
| No raw `420+` codes assigned                                                  | ✅ none in this section                                                                                                                                                                       |

---

## Section 3 — salted, position-bound leaf profile (FROZEN `e8dc0a77`)

Profile identifier: **`simurgh.vsc.hidden_leaf.v1`**. This section replaces notation with a construction. `H(domain ‖ epoch ‖ index ‖ salt ‖ H(case))` was explanatory shorthand; raw `‖` is **not frozen** and is not used below.

### 3.1 The authority contract — mandatory, never authoritative

The Section 1 deferral is resolved, and generalised so the same bug cannot reappear in a third field:

> **Producer-declared context may carry information. It never acquires authority merely by arriving in a correctly shaped field.** Every value that positions or scopes a leaf is supplied by the verifier at recomputation. The producer's copy is mandatory, checked for equality, and otherwise powerless.

**Authority table (frozen).** For challenged position `i` in epoch `e`:

| Hashed input            | Supplied by                           | Producer's copy                | Rule                                                  |
| ----------------------- | ------------------------------------- | ------------------------------ | ----------------------------------------------------- |
| `expected_index_i`      | **verifier** (`challenge.indices[j]`) | `opening.claimed_index`        | MUST equal `i`                                        |
| `expected_epoch_digest` | **verifier** (commitment context)     | `opening.claimed_epoch_digest` | MUST equal the expected epoch digest                  |
| `salt_i`                | producer                              | —                              | checked for length/encoding/uniqueness among openings |
| `case_i`                | producer                              | —                              | checked against the frozen schema                     |

```text
opening.claimed_index         MUST equal i
opening.claimed_epoch_digest  MUST equal expected_epoch_digest
leaf recomputation            MUST use verifier-known i AND verifier-known expected_epoch_digest
authentication path           MUST prove the leaf occupies tree position i
authentication context        MUST bind the expected epoch
```

Recomputation is:

```text
recomputeLeaf(
  expected_index        = challenge.indices[j],       // verifier-known
  expected_epoch_digest = commitment.expected_epoch,  // verifier-known
  salt                  = opening.salt,
  case                  = opening.case
)
```

and never:

```text
recomputeLeaf(
  index = opening.claimed_index,                // FORBIDDEN — validates the claim against itself
  epoch = opening.claimed_epoch_digest,         // FORBIDDEN — replays epoch A inside epoch B
  ...
)
```

Both claimed fields are **mandatory**, not optional: one canonical opening shape, no positional-array dependence, no two-shapes ambiguity. Their purpose is routing, duplicate detection, and reviewer readability. **They have no authority.**

**Why the epoch needs this too.** Without the rule, a producer replays a leaf from epoch A while submitting epoch A's digest inside an epoch B opening, and the recomputation succeeds — the hash contains an epoch, just not the right one.

### 3.2 Byte-level construction (frozen)

Every hashed component has an exact encoding. The only variable-length hashed field is length-prefixed; all others are fixed-width, so no delimiter is inferable and no boundary is ambiguous.

```text
CASE_DOMAIN  = ASCII "simurgh.vsc.case.v1"      (fixed constant)
LEAF_DOMAIN  = ASCII "simurgh.vsc.leaf.v1"      (fixed constant, distinct from CASE_DOMAIN)

case_digest_i =
  SHA256(
    CASE_DOMAIN              ||
    u32be(len(case_bytes_i)) ||
    case_bytes_i
  )

leaf_value_i =
  SHA256(
    LEAF_DOMAIN               ||
    expected_epoch_digest     ||   // exactly 32 bytes, VERIFIER-SUPPLIED
    u64be(expected_index_i)   ||   // exactly 8 bytes, unsigned big-endian, VERIFIER-SUPPLIED
    salt_i                    ||   // exactly 32 bytes
    case_digest_i                  // exactly 32 bytes
  )
```

Constraints:

```text
expected_index_i        unsigned 64-bit big-endian — NOT decimal text inside the hash
salt_i                  exactly 32 bytes
expected_epoch_digest   exactly 32 bytes (contract in Section 6)
case_bytes_i            UTF-8 canonical JSON under the frozen case schema
```

No delimiter guessing. No decimal index text inside the hashed bytes. No producer-controlled field deciding the position or the epoch.

**Integer domains (frozen, A6).** Two domains, never conflated:

- the **binary encoding domain** — what `u64be`/`u32be` can represent, which makes the hash construction a total function;
- the **accepted Stage 5O v1 operational domain** — what a verifier will actually accept, which is always narrower.

**Encoding domain:**

```text
1 <= N <= 2^64 - 1
0 <= expected_index_i < N
1 <= length(case_bytes_i) <= 2^32 - 1
```

`N`'s encoding ceiling is `2^64 - 1` rather than `2^64` deliberately — it keeps every index representable in `u64be` without maximum-domain arithmetic.

**Operational domain — profile-pinned, and the one that governs acceptance:**

```text
1 <= N <= min(2^64 - 1, MAX_SCOPE_CARDINALITY)
1 <= length(case_bytes_i) <= MAX_CASE_BYTES

MAX_SCOPE_CARDINALITY   profile-pinned (Section 4)
MAX_CASE_BYTES          precommitted positive integer, <= 2^32 - 1
```

**Encodable is not accepted.** `u32be` _can_ encode four gigabytes and no honest case needs to. Equally, `u64be` _can_ encode `2^64 - 1` positions and no manifest can materialise them — Section 4 requires the ordered public leaf vector, so an unbounded `N` is a memory-exhaustion weapon rather than a generous limit. The encoding bounds make the construction total; the **operational bounds decide acceptance**.

**Overflow and encoding behaviour (fail-closed).**

```text
decimal index outside unsigned 64-bit range        -> reject
leading-zero index strings (except the literal "0") -> reject
negative values                                     -> reject
fractional or exponent-form numbers                 -> reject
length(case_bytes_i) > MAX_CASE_BYTES               -> reject BEFORE hashing
```

Length is validated **before** hashing, never discovered after.

### 3.3 Case digest profile (frozen)

`H(case_i)` needs its own contract, or two runtimes hash different representations of the same logical case.

```text
case_commitment_payload = exact-key schema {
  case_schema_version
  case_type
  case_payload
  declared_predicate_inputs
}

case_bytes  = UTF8(canonicalJson(case_commitment_payload))
case_digest = SHA256(CASE_DOMAIN || u32be(len(case_bytes)) || case_bytes)
```

**`case_id` is not a substitute for the payload.** It may appear inside `case_payload` for identity, but the digest covers the whole canonical payload. A leaf committing only to a guessable case identifier would revive exactly the theatre rejected in the 5K analysis — a commitment that is binding but brute-forceable, and therefore not hiding.

**Digest equality is a statement about bytes, not about meaning (frozen).**

> Under `hash_collision_resistance` (§1), two inputs produce the same case digest **only when their parsed values produce identical bytes under the frozen Stage 5O schema and canonicalisation algorithm** — or when a collision has been found, which this stage assumes infeasible and does not detect.

**A21 corrected this sentence.** As frozen it read "only when their parsed values produce identical bytes", which asserts **injectivity**: same digest therefore same bytes, collisions excluded by fiat. The heading above it says digest equality is a statement about bytes rather than meaning — the sentence was careful about semantics and silent about collisions. The correction weakens nothing anyone relied on; it names the assumption the sentence was already spending.

Canonical JSON normalises _representation_, not _application semantics_. It does not know that two differently ordered arrays denote the same set, that `"01"` and `"1"` name the same identifier, that Unicode-normalised strings are equal, that two predicate-parameter lists are equivalent, or that reordered attack steps mean the same case. **Semantic equivalence is never outsourced to `canonicalJson`.**

Consequently, for every array in the case schema:

```text
- if the array is semantically ORDERED, order is preserved and is part of the digest
- if the array is semantically a SET, the SCHEMA itself must specify sorting,
  duplicate handling, and comparison rules BEFORE canonicalisation
```

An array whose set-or-sequence nature is unstated is a schema defect, not a canonicaliser problem. (Section 4 freezes the case schema against this rule.)

#### 3.3.1 Input domain — numbers, duplicate keys, Unicode (frozen)

`case_bytes` must denote **exactly one byte sequence in every runtime**, not "whatever the local JSON parser thought the author probably meant". Each rule below is justified by a measured divergence, not by caution.

**Numbers — no JSON numeric values at all.**

```text
Case commitment payloads contain NO JSON numeric values.

Schema-defined integers are canonical decimal STRINGS:
  - "0", or a non-zero digit followed by digits
  - no leading zeroes
  - no sign unless the field explicitly permits signed values
  - no exponent notation
  - field-specific bounds checked BEFORE hashing
```

Rejecting floats is **insufficient**. Measured: `JSON.parse('{"a":9007199254740993}')` yields `9007199254740992` in JavaScript — silently altered, since `Number.MAX_SAFE_INTEGER` is `9007199254740991` — while Python parses the same literal exactly. **The same raw JSON would produce two different `case_digest` values in two runtimes**, breaking the stage's JS↔Python↔browser parity requirement. Decimal strings remove the hazard rather than bounding it.

**Duplicate keys — rejected lexically, before parsing.**

> Raw JSON entering the commitment pathway must pass a duplicate-key-rejecting parser or equivalent lexical validation **before** conversion to an in-memory value. Canonicalisation never receives an object produced from duplicate-key input.

Measured: `JSON.parse('{"a":1,"a":2}')` yields `{"a":2}`, and `canonicalJson` then emits `{"a":2}` without complaint. **The evidence of duplication is destroyed before any post-parse check could see it.** A duplicate-key rule that runs after `JSON.parse` is unimplementable, not merely weak.

**Unicode — code points preserved, never normalised.**

```text
- UTF-8 only
- reject malformed UTF-8
- reject lone UTF-16 surrogates / non-scalar values
- NO NFC, NFD, NFKC or NFKD normalisation
- canonically equivalent-looking strings MAY intentionally produce different digests
- JSON escape spelling does not matter after valid parsing; the resulting
  scalar sequence does
```

Measured: `"\ud800"` (a lone surrogate) encodes to UTF-8 bytes `efbfbd` in JavaScript — silently replaced with U+FFFD — whereas Python's `.encode('utf-8')` raises instead. Another parity break, so rejection is the only total rule. Measured for normalisation: NFC `é` is `c3a9`, NFD `é` is `65cc81`, and `canonicalJson` already keeps them distinct — the no-normalisation policy is implementable as written.

**Why no normalisation, for a security corpus specifically.** Normalisation can silently merge attack strings that the corpus author intended to remain distinct. A red-team universe whose members are collapsed by NFKC has had its cardinality quietly edited by a text-processing library — which is exactly the class of unaccountable universe mutation this stage exists to make impossible.

### 3.4 JSON representation (outside the hash)

```text
indices, cardinalities   canonical decimal strings
salts                    lowercase hex, exactly 64 characters — ONE encoding only
non-canonical equivalent encodings    rejected
floats, negative zero, duplicate keys, unknown fields in the case schema    rejected
```

The JSON index is a decimal string; the hashed index is `u64be(i)`. These are different representations of the same value and must never be conflated.

### 3.5 Merkle tree profile (frozen)

Own domain-separated leaf value, established canonical shape:

```text
merkle_leaf_i    = SHA256(0x00 || leaf_value_i)
merkle_node(l,r) = SHA256(0x01 || l || r)
```

**The tree is defined recursively, and this definition is the sole normative one.** It does not depend on Stage 5K, on RFC 6962 commentary, or on any experiment:

```text
MTH([])       = FORBIDDEN — Stage 5O requires N > 0
MTH([x])      = MerkleLeaf(x)
MTH(D[0:n])   = MerkleNode( MTH(D[0:k]), MTH(D[k:n]) )
                where k is the largest power of two STRICTLY less than n
```

Frozen shape rules:

```text
- canonical shape determined solely by N
- no duplicate-last rule
- no implicit zero padding
- left/right order is significant
- N > 0
- authentication paths are position-aware
- path length and orientation MUST match the canonical tree for N and i
- a node with no sibling in the decomposition contributes NO synthetic
  sibling element to the authentication path
```

The last rule matters independently of the root: two implementations can agree on `MTH` and still disagree on **proof encoding** if one emits placeholder siblings. Path length is exactly the number of `MerkleNode` levels on position `i`'s root path.

**Duplicate-last is explicitly forbidden** — it is the rule behind CVE-2012-2459, where distinct leaf sets produce identical roots.

**Implementation evidence (not a mathematical claim, not normative).** Stage 5K's bottom-up promote-odd implementation was tested against the recursive `MTH` above: roots **identical for `n = 1..600`**, and path lengths **identical to the `MTH` recursion depth for `n = 1..400`, every `i`**, with `buildInclusion`/`verifyInclusion` round-tripping throughout. Stage 5K promotes (`merkle.mjs:35`), it does not duplicate. This is evidence that 5K's code is a **candidate implementation** of §3.5 — it is not a claim of general equivalence, and Stage 5O's shape is canonical because this section defines it recursively, full stop. A Lean proof that bottom-up promotion equals `MTH` for all `n` is a Section 11 candidate, not a prerequisite.

**The root alone carries no semantics.** `N`, profile version, and epoch are bound by the commitment contract (Section 4), never inferred from the root.

### 3.6 The salt seam

Per-leaf salts must be independently generated. Opening `k` salts **cannot** prove the unopened `N−k` salts are unique — and reuse matters: once one case opens, its revealed salt assists attacks on other unopened leaves that reused it.

For **opened** positions the verifier requires:

```text
- valid 32-byte salt, canonical lowercase-hex encoding
- no duplicate salt among the disclosed openings for the same commitment root
- salt not derived from the public beacon where provenance explicitly reveals that fact (T5.2)
```

Random-looking bytes prove neither entropy nor independence (T5.9, `not_proof_of_salt_entropy`).

**Scope of duplicate-salt detection (frozen).**

> Opened-salt duplicate detection is complete only over the disclosed openings and disclosure history supplied for **one commitment root**. It is **not** a global uniqueness claim.

**The cross-root escape.** Once a case and salt are revealed under one commitment, salt reuse can assist linkage or candidate recomputation against a _different_ commitment — even when the epoch changes. Section 3 defines salt generation, scopes duplicate checking, and is where this weakness first becomes true. It therefore **owns** the ceiling `not_proof_of_cross_commitment_salt_nonreuse`, declared in §3.7 below (A22: cited inline — the declaration is the register's job, and only the register's).

**Section 8's disclosure ledger does not automatically discharge it.** A same-root ledger detects reuse among evidence it actually links; it cannot determine that two unrelated salted roots conceal the same case, the same corpus, or the same salt. Closing this would require new geometry — a stable private corpus identifier, a cross-root salt-generation commitment, an independently witnessed salt-derivation ceremony, or a privacy-preserving linkage proof — all outside the current blade, and some in direct tension with the unlinkability the stage is built to provide. Section 8 may **reference** this ceiling; it must not claim to discharge it merely by maintaining a ledger.

### 3.7 `section_3.added_non_claims` — owned by this section (A3)

```text
section_3.added_non_claims = [
  not_proof_of_cross_commitment_salt_nonreuse,
  not_proof_of_unopened_leaf_preimage_conformance,
  not_proof_of_unopened_salt_uniqueness
]

section_3.required_later_bindings = []          // A8
```

> **`not_proof_of_unopened_salt_uniqueness`** — Openings verify salt length, encoding, and leaf recomputation for challenged positions. They do not prove that unopened positions use distinct salts.

> **`not_proof_of_cross_commitment_salt_nonreuse`** — Duplicate-salt rejection covers all disclosed openings presented under the same commitment root and complete presented disclosure history. Stage 5O does not prove that salts are never reused across different commitment roots, epochs, or re-committed versions of a hidden corpus.

> **`not_proof_of_unopened_leaf_preimage_conformance`** — The verifier establishes complete tree-position and cross-artifact identity equality for all `N` public leaf identifiers. It verifies full Stage 5O leaf-preimage conformance only for challenged openings. Unopened leaves may contain malformed or unavailable preimages and remain subject to the conditional sampling guarantee.

**Unopened leaves are unverified for more than salt uniqueness.** An unopened leaf may conceal a non-canonical case, an unknown-field case, an invalid schema, a mis-sized salt, a wrong embedded index, a wrong epoch, a foreign profile or domain, or a `leaf_value` that is simply random bytes for which the producer holds **no valid opening at all**. Each such defect enters `J` and is caught only if sampled (PC-1).

**Three unopened-leaf ceilings, all retained — none replaces another:**

| Ceiling                                                 | Scope                                                 | Owner     |
| ------------------------------------------------------- | ----------------------------------------------------- | --------- |
| `not_proof_of_unopened_leaf_preimage_index_consistency` | the specific index-binding ceiling                    | Section 1 |
| `not_proof_of_unopened_salt_uniqueness`                 | the specific cross-leaf salt ceiling                  | Section 3 |
| `not_proof_of_unopened_leaf_preimage_conformance`       | the general schema, encoding, and openability ceiling | Section 3 |

Per the A1 monotonicity rule, the general ceiling **does not silently absorb** the two specific ones. The canonical union carries all three unless a later amendment formally deprecates one. Section 3 **references** Section 1's field without redefining it, as A3 requires.

**Law 3 is spot-checked, not universal.** "No Unopenable Challenge" (renamed by A4, precisely because of this finding) binds every _beacon-selected_ index. It does not assert that all `N` leaves are openable — that is what `not_proof_of_unopened_leaf_preimage_conformance` concedes, and what the S3.15/S3.16 fixture pair demonstrates from both sides. The law's former title, "No Unopenable Scope", claimed the universal property this section proves the stage does not have.

### 3.8 Section 3 attack matrix

| ID    | Attack                                                                               | Expected result                                                                                                                                                                                            | Class                                |
| ----- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| S3.1  | self-declared index differs from challenge                                           | **reject**                                                                                                                                                                                                 | `evidence_attack_fixtures`           |
| S3.2  | verifier recomputes using `claimed_index` not `expected_index`                       | **negative implementation fixture** — a verifier built this way MUST fail the suite                                                                                                                        | `implementation_regression_fixtures` |
| S3.3  | correct leaf at wrong Merkle position                                                | **reject**                                                                                                                                                                                                 | `evidence_attack_fixtures`           |
| S3.4  | cross-epoch leaf replay                                                              | **reject** (`epoch_digest` is inside `leaf_value`)                                                                                                                                                         | `evidence_attack_fixtures`           |
| S3.5  | case canonicalisation variant                                                        | **identical canonical bytes ⇒ identical digest** — semantically equivalent parsed values canonicalise to identical bytes under the frozen schema; **the converse is not claimed** (A21 erratum — see note) | `implementation_regression_fixtures` |
| S3.6  | unknown case field                                                                   | **reject**                                                                                                                                                                                                 | `evidence_attack_fixtures`           |
| S3.7  | salt wrong length or non-canonical encoding                                          | **reject**                                                                                                                                                                                                 | `evidence_attack_fixtures`           |
| S3.8  | leaf/node domain swap                                                                | **reject**                                                                                                                                                                                                 | `evidence_attack_fixtures`           |
| S3.9  | duplicate-last instead of canonical promotion                                        | **reject**                                                                                                                                                                                                 | `evidence_attack_fixtures`           |
| S3.10 | authentication path valid for a different `N`                                        | **reject**                                                                                                                                                                                                 | `evidence_attack_fixtures`           |
| S3.11 | duplicate salts among **opened** positions                                           | **reject**                                                                                                                                                                                                 | `evidence_attack_fixtures`           |
| S3.12 | duplicate salts among **unopened** positions                                         | **accepted + `not_proof_of_unopened_salt_uniqueness` present**                                                                                                                                             | `accepted_blindness_fixtures`        |
| S3.13 | `claimed_epoch_digest` differs from `expected_epoch_digest`                          | **reject**                                                                                                                                                                                                 | `evidence_attack_fixtures`           |
| S3.14 | verifier recomputes using `claimed_epoch_digest` rather than `expected_epoch_digest` | **negative implementation fixture** — a verifier built this way MUST fail the suite                                                                                                                        | `implementation_regression_fixtures` |
| S3.15 | **challenged** leaf whose `leaf_value` has no valid preimage (random bytes)          | **reject**                                                                                                                                                                                                 | `evidence_attack_fixtures`           |
| S3.16 | **unopened** leaf whose `leaf_value` has no valid preimage                           | **accepted + `not_proof_of_unopened_leaf_preimage_conformance` present**                                                                                                                                   | `accepted_blindness_fixtures`        |
| S3.17 | index decimal outside `u64` range, leading-zero, negative, or exponent-form          | **reject**                                                                                                                                                                                                 | `evidence_attack_fixtures`           |
| S3.18 | `length(case_bytes_i) > MAX_CASE_BYTES`                                              | **reject before hashing**                                                                                                                                                                                  | `evidence_attack_fixtures`           |
| S3.19 | JSON numeric literal in a case payload, incl. unsafe integers above `2^53-1`         | **reject** — `unsafe_integer_literal`                                                                                                                                                                      | `evidence_attack_fixtures`           |
| S3.20 | non-canonical decimal string (leading zero, stray sign, exponent form)               | **reject** — `noncanonical_decimal_string`                                                                                                                                                                 | `evidence_attack_fixtures`           |
| S3.21 | duplicate key in **raw** case JSON                                                   | **reject before canonicalisation** — `duplicate_key_raw_case`                                                                                                                                              | `evidence_attack_fixtures`           |
| S3.22 | lone UTF-16 surrogate / non-scalar value                                             | **reject** — `lone_surrogate`                                                                                                                                                                              | `evidence_attack_fixtures`           |
| S3.23 | malformed UTF-8                                                                      | **reject**                                                                                                                                                                                                 | `evidence_attack_fixtures`           |
| S3.24 | composed vs decomposed Unicode (NFC vs NFD)                                          | **distinct digests** under the no-normalisation rule — `composed_vs_decomposed_unicode`                                                                                                                    | `implementation_regression_fixtures` |
| S3.25 | same salt twice among presented **same-root** openings                               | **reject** — `same_salt_twice_in_presented_same_root_openings`                                                                                                                                             | `evidence_attack_fixtures`           |
| S3.26 | same salt across two **unlinked commitment roots**                                   | **both roots may verify independently + `not_proof_of_cross_commitment_salt_nonreuse` present** — `same_salt_across_two_unlinked_roots`                                                                    | `accepted_blindness_fixtures`        |

**S3.2 and S3.14 are guards against our own regression**, not against a producer: each asserts that an implementation trusting a producer-declared field _fails the suite_. Both exist because the authority bug was written once for the index, caught, and then reproduced one field to the left for the epoch.

**S3.21 is an ordering requirement, not merely a rule.** Measured: `JSON.parse('{"a":1,"a":2}')` returns `{"a":2}` and `canonicalJson` emits it without complaint — so a duplicate-key check placed after parsing has nothing left to detect. The rule is only implementable at the lexical layer.

**S3.25 / S3.26 separate what Section 3 enforces from what it refuses to pretend**: identical salt reuse rejects within one presented root, and passes across two unlinked roots with the ceiling asserted.

**S3.12 and S3.16 are accepted-blindness fixtures** — they prove the verifier knows where its eyesight ends. **S3.15/S3.16 is the pair that matters most**: the identical defect rejects when challenged and passes when not. That is the honest shape of a spot-check, and it is exactly what a reader might otherwise mistake Law 3 for guaranteeing universally.

### Section 3 freeze gate

| Gate                                                                                                            | Status                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `claimed_index` mandatory but non-authoritative                                                                 | ✅ 3.1 — one canonical opening shape; recomputation uses verifier-known `i` only                                                                                                                                                                                   |
| Leaf hashing uses verifier-known `expected_index`                                                               | ✅ 3.1, 3.2 — `u64be(expected_index_i)`                                                                                                                                                                                                                            |
| **`expected_epoch_digest` is verifier-known; producer declarations non-authoritative**                          | ✅ 3.1 authority table — `claimed_epoch_digest` mandatory, equality-checked, powerless; S3.13, S3.14                                                                                                                                                               |
| Every hashed component has an exact byte encoding                                                               | ✅ 3.2 — one length-prefixed variable field; all others fixed-width                                                                                                                                                                                                |
| **Encoding domains total; accepted operational domain profile-pinned and narrower; overflow fails closed** (A6) | ✅ 3.2 — encoding `1<=N<=2^64-1`, `0<=i<N`; operational `1<=N<=min(2^64-1, MAX_SCOPE_CARDINALITY)`, `1<=len<=MAX_CASE_BYTES`; length checked **before** hashing; S3.17, S3.18                                                                                      |
| Case canonicalisation: one frozen schema, no floats                                                             | ✅ 3.3, 3.4                                                                                                                                                                                                                                                        |
| **Numbers: no JSON numerics; canonical decimal strings only**                                                   | ✅ 3.3.1 — measured `9007199254740993` → `…992` in JS, exact in Python: a live parity break, not a hypothetical; S3.19, S3.20                                                                                                                                      |
| **Duplicate keys rejected lexically, before parsing**                                                           | ✅ 3.3.1 — measured `JSON.parse` collapses `{"a":1,"a":2}` → `{"a":2}`, so a post-parse rule is unimplementable; S3.21                                                                                                                                             |
| **Unicode: UTF-8 only, no normalisation, lone surrogates rejected**                                             | ✅ 3.3.1 — measured `"\ud800"` → `efbfbd` in JS, raises in Python; NFC/NFD already distinct; S3.22, S3.23, S3.24                                                                                                                                                   |
| **Cross-commitment salt non-reuse owned and signed by Section 3**                                               | ✅ 3.6, 3.7 — `not_proof_of_cross_commitment_salt_nonreuse`; Section 8 may reference, must not discharge; S3.25 reject / S3.26 green                                                                                                                               |
| **Digest equivalence defined by frozen canonical bytes, not logical equivalence**                               | ✅ 3.3 — bytes-only rule; ordered-vs-set arrays must be resolved in the schema, never by `canonicalJson`; S3.5                                                                                                                                                     |
| Salt format: exactly one canonical 32-byte representation                                                       | ✅ 3.4 — lowercase hex, 64 chars                                                                                                                                                                                                                                   |
| Merkle shape and odd-node handling unambiguous                                                                  | ✅ 3.5 — **single normative recursive `MTH`**; duplicate-last forbidden; no synthetic sibling for unpaired nodes; 5K agreement is implementation evidence only                                                                                                     |
| Cross-epoch replay rejected (**narrowed** — not "structurally impossible")                                      | ✅ 3.1, 3.2 — rejected when the verifier supplies the expected epoch digest and distinct epochs have distinct digests, subject to the stated hash assumptions; S3.4, S3.13                                                                                         |
| Opened salt reuse rejects                                                                                       | ✅ 3.6, S3.11                                                                                                                                                                                                                                                      |
| Unopened salt uniqueness is an explicit signed ceiling                                                          | ✅ 3.7 — `not_proof_of_unopened_salt_uniqueness`, S3.12 green fixture                                                                                                                                                                                              |
| **Unopened full-preimage conformance is a signed ceiling with paired fixtures**                                 | ✅ 3.7 — `not_proof_of_unopened_leaf_preimage_conformance`; S3.16 green / S3.15 reject                                                                                                                                                                             |
| No raw `420+` codes allocated                                                                                   | ✅ none in this section — and A24 ledgers the fact: §4.9's `evidence_attack_fixtures` raw-code obligation had **no owner, discharger or status** until now. It is `PENDING` on Section 10 and **blocks release**; it is no longer a promise living in a table cell |

**S3.5 states one direction, not two (A21 erratum).** The row read: _"same digest **only when** the parsed values produce identical bytes under the frozen schema and canonicalisation algorithm."_ That is a biconditional, and SHA-256 has no such property. The two directions are not the same kind of claim and must never share a sentence:

```text
identical canonical bytes   =>   identical digest        // deterministic; the fixture asserts THIS
identical digest            ~>   identical canonical bytes  // computational; assumption-bound, NOT claimed here
```

The forward direction is what S3.5 exercises and it is deterministic: the frozen schema and canonicalisation algorithm map semantically equivalent parsed values to identical canonical bytes, and identical bytes hash identically. **The converse is not claimed.** Digest equality is treated as computational evidence of canonical-byte equality **only under `canonical_encoding_unambiguous` and `hash_collision_resistance` (§1)** — never as logical injectivity.

**Why this survived A21.** A21 swept for exactly this defect and corrected §3.2's prose — then reported the document clean, because the sweep read paragraphs and S3.5's overclaim lived in a **table cell**. _"Search the prose"_ is not _"audit the specification"_. The assumption audit now inspects every normative container: prose, fenced blocks, **all table cells in every column**, fixture descriptions, gate rows, captions, and requirement and non-claim definitions. **The rebuilt sweep then missed S3.5 too, on its first run** — the row reads `only**  when`, and markdown emphasis sat between the two words, so the pattern never matched. A sweep that cannot find its own founding defect is not evidence; it strips emphasis before matching now. **And it carries a self-test**: both original defects — S3.5's cell and §3.2's sentence — are reintroduced into a copy of this document and the sweep MUST flag each. It reports clean on the current text only because it still fails on the text it was built to catch; **a detector tuned until it reports green is not a detector**. _Instantiating this obligation as a normative `assumption_language_fixtures` member for Section 3 is not done here — an erratum may not mint fixtures — and is recorded as an open item._

---

## Section 4 — commitment schema and canonical declared-index ordering (DRAFT, uncommitted)

Section 4 freezes **two** objects, not one overloaded blob:

1. the **scope-vector commitment**, binding the private universe's public identifiers;
2. the **Stage 5O precommitment**, binding that scope to every rule the producer must not choose after seeing the beacon.

The second layer is not decoration. Anchoring only the root would leave the producer free to select the predicate, `k`, beacon contract, or disclosure policy _after_ the challenge is knowable.

### 4.1 Public scope manifest

```text
scope_manifest = {
  schema_version,
  profile_bundle,
  epoch_descriptor,
  epoch_digest,
  cardinality,
  leaf_entries,
  merkle_root,
  scope_vector_digest,
  producer_authority_descriptor,   // A18
  producer_authority_digest,       // A18 — declared, non-authoritative
  policy_bindings,
  stage5o_precommitment_digest
}
```

| Public                                         | Private until challenged |
| ---------------------------------------------- | ------------------------ |
| `N`                                            | case payloads            |
| profile IDs and digests                        | salts                    |
| epoch descriptor and digest                    | opening preimages        |
| all `N` salted `leaf_id` values                |                          |
| Merkle root                                    |                          |
| predicate and policy digests                   |                          |
| producer authority descriptor and digest (A18) |                          |
| final precommitment digest                     |                          |

**A root-only manifest is invalid for Stage 5O.** Whole-universe cross-artifact equality (Section 1, Layer 1) requires the **ordered public leaf vector** — it is the object `S[i].leaf_id` is read from. A root alone cannot support a positional equality check without an opening for every position, which would destroy hiding.

#### 4.1.1 Operational limits — the manifest is an attack surface before it is evidence

Because the manifest materialises all `N` entries, the accepted cardinality is an **operational** question, not an encoding one (§3.2, A6).

**Transport limits and canonical limits are different things.** A limit measured over _raw_ bytes makes semantic acceptance depend on whitespace: the same logical manifest would **pass when minified and fail when pretty-printed**, while committing to byte-identical digests. That contradicts this project's canonical-parsing lineage — evidence semantics must not vary with formatting.

```text
MAX_SCOPE_TRANSPORT_BYTES        preflight resource guard, over RAW transport bytes
                                 enforced BEFORE parsing; protects memory and parser availability

MAX_SCOPE_CANONICAL_BYTES        normative artifact acceptance, over the frozen
                                 canonical manifest projection
MAX_CANONICAL_LEAF_ENTRY_BYTES   over canonical entry bytes
MAX_SCOPE_CARDINALITY            accepted N ceiling
MAX_CASE_BYTES                   (§3.2) canonical case bytes
```

The transport cap is availability. The canonical caps are **reproducible evidence semantics**. Only the latter can change a verdict about an artifact.

Required:

```text
1 <= N <= min(2^64 - 1, MAX_SCOPE_CARDINALITY)
leaf_entries.length = N
raw_transport_bytes      <= MAX_SCOPE_TRANSPORT_BYTES        (before parsing)
canonical_manifest_bytes <= MAX_SCOPE_CANONICAL_BYTES        (after canonical projection)
each canonical leaf entry <= MAX_CANONICAL_LEAF_ENTRY_BYTES
```

> **The transport limit is enforced BEFORE full object materialisation**, via a bounded or streaming input path. A size check performed after parsing runs only once the allocation attack has already succeeded — the **third** instance of this ordering defect in the spec, after duplicate keys (§3.3.1) and case length (§3.2). Each time, the check must precede the operation it guards.

**Pinned v1 values (frozen).** Owned by the **commitment profile** artifact; `commitment_profile_digest` covers these exact values, so two verifiers cannot use different limits for the same artifact. `MAX_CASE_BYTES` is pinned in the same artifact and does not float independently. Values are **exact decimal byte counts**; the parenthetical units are commentary only. Throughout this specification `MiB = 2^20 bytes` and `KiB = 2^10 bytes` — never decimal SI multiples, so that "16 MiB" cannot be implemented as `16000000` by one party and `16777216` by another.

```text
MAX_SCOPE_CARDINALITY          = "65536"        (2^16 entries)      A11
MAX_CANONICAL_LEAF_ENTRY_BYTES = "128"
MAX_SCOPE_CANONICAL_BYTES      = "8388608"      (8 MiB)             A11
MAX_SCOPE_TRANSPORT_BYTES      = "16777216"     (16 MiB)            A11
MAX_CASE_BYTES                 = "65536"        (64 KiB)
```

**Why `2^16` (A11 — the manifest was never the workload).** An earlier freeze pinned `2^18` on runtime-amplification grounds, reasoning about **this manifest alone**. Section 5 then introduced two further large public objects — the execution-record census and the reported-result census — each roughly **2.8x the manifest**. The manifest-only model was not conservative; it was incomplete, and it understated the Stage 5O public evidence footprint by a factor of ~6.6:

```text
N        manifest   exec census  result census   public canonical core
2^16       6.9 MiB      18.3 MiB       18.3 MiB          43.5 MiB     <- v1
2^17      13.0 MiB      36.8 MiB       36.6 MiB          86.4 MiB
2^18      26.1 MiB      73.6 MiB       73.4 MiB         173.2 MiB     <- former pin
2^20     104.9 MiB     294.9 MiB      293.9 MiB         693.8 MiB
```

At `2^18` the public core reaches **173.2 MiB — 90% of the 192 MiB canonical cap this project rejected at `2^20` as an unmeasured capacity hope.** The number was defensible only because two thirds of the workload were not being counted. A cap is itself a safety claim; a safety claim computed against one of three objects is not one.

And 43.5 MiB is the **public core only**, before census-closure evidence, anchor evidence, challenge material, selective openings, disclosure receipts, and final envelope data. Neither figure proves a verifier materialises the objects simultaneously — but v1 must not depend on a streaming architecture that has not been built or measured. `65,536` hidden cases still exceeds any credible Stage 5O evaluation universe by a wide margin.

A larger cardinality becomes a **new profile**, never a configuration adjustment, and only after: (1) bounded streaming verification exists; (2) JS, Python, and browser implementations reproduce verdicts; (3) boundary runs measure peak memory and runtime; (4) the larger profile carries a different `commitment_profile_digest`.

**The public canonical core is an evidence footprint, not a heap bound.** Parser objects, temporary buffers, Merkle state, and runtime overhead are all outside it — which is exactly why `not_proof_that_every_conforming_verifier_can_process_a_profile_conforming_artifact` (§4.10) remains permanent. Artifact bounds are not heap guarantees.

**Census-specific limits are owned by Section 5** (§5.2.2): four exact constants, two per census, carried inside the `commitment_profile` preimage already covered by `commitment_profile_digest`. No new bundle field, no A9 rework.

**Limit-compatibility invariant (checked at profile freeze, not sampled).**

```text
maxCanonicalManifestBytes(N = MAX_SCOPE_CARDINALITY, pinned_manifest_schema)
  <= MAX_SCOPE_CANONICAL_BYTES
MAX_SCOPE_CANONICAL_BYTES <= MAX_SCOPE_TRANSPORT_BYTES
```

Independently chosen limits must be proven unable to contradict each other. `maxCanonicalManifestBytes` is **derived from the frozen canonical schema** — maximum canonical index width, fixed 64-character `leaf_id`, array delimiters and separators, wrapper fields, and the pinned profile and policy fields — never inferred from one generated example.

**This invariant is closed-form, not an estimate.** Because `declared_index` is `canonicalDecimal(array position)` and `leaf_id` is exactly 64 hex characters under an exact-key schema, the canonical leaf vector's byte count is **fully determined by `N`**. Before A27 the only producer freedom in the manifest was the **seven** original profile IDs, each capped at `2^16 - 1` bytes — the count was previously misstated as **five**, a stale pre-A9 figure. **A27 pins all seven to concrete ASCII** (`simurgh.vsc.scope_manifest.v1`, `.commitment.v1`, `.hidden_leaf.v1`, `.merkle_tree.v1`, `.case_schema.v1`, `.execution_object_schema.v1`, `.result_object_schema.v1`), removing that freedom; A27's independently regenerated limit-compatibility invariant supersedes the pre-A27 figures below. Measured against the pinned v1 profile:

```text
canonical leaf vector at N = 65536       :  6,804,633 bytes   ( 6.489 MiB)   — exact
worst-case wrapper (23 PINNED pairs + authority): 5,640 bytes                 — fully determined (A28)
worst-case canonical manifest            :  6,810,273 bytes   ( 6.495 MiB)   — generator-derived
MAX_SCOPE_CANONICAL_BYTES                :  8,388,608 bytes   ( 8.000 MiB)
headroom                                 :  1,578,335 bytes   ( 1.505 MiB)   — invariant HOLDS
MAX_SCOPE_CANONICAL_BYTES <= MAX_SCOPE_TRANSPORT_BYTES : 8,388,608 <= 16,777,216 — HOLDS
```

**Recomputed, then regenerated (A27).** The **pre-A27 recompute history** — superseded worst-case-manifest figures, retained as history and never as a current bound — ran: A9 (five pairs to seven, wrapper 329,418 → 460,746), A11 (`N` from `2^18` to `2^16`), A17 (seven pairs to fourteen, wrapper 460,746 → 462,009), A18 (producer authority descriptor, wrapper 462,009 → 462,510), A19 (fourteen pairs to seventeen, wrapper 462,510 → **463,043**, worst-case manifest **7,267,676**). **A27 pins the seven previously-unpinned bundle IDs** to concrete ASCII, so no manifest field floats: the wrapper drops **463,043 → 4,503** and the worst-case manifest **7,267,676 → 6,809,136**, both **independently derived by the production encoder** (`tools/simurgh-attestation/stage5o/node/measureScopeManifestMaximum.mjs`, whose source carries no historical figure), never by subtracting from the prior number. The seven pinned literals total **205 UTF-8 payload bytes** in the canonical manifest — the `u16be(len)` framing that would add 14 bytes belongs to the separate `profile_bundle_digest` preimage, not to `canonicalJson`. The freed headroom is exactly `7 × 65,535 − 205 = 458,540` bytes: seven producer-variable IDs at the `2^16 - 1` bound, replaced by their literals. The **4,503-byte wrapper** is everything around the **6,804,633-byte leaf vector** — the `leaf_entries` field name and colon, the array brackets, and every other manifest field. A17's ten pinned pairs cost concrete ASCII (29–44 bytes each); with A27 **all seventeen are pinned and no producer length-freedom remains in the manifest**. **Old wrapper arithmetic gets no grandfather clause; the generator is the authority.** **A28 appends the six Section-7 pairs (seventeen → twenty-three), wrapper `4,503 → 5,640` and worst-case manifest `6,809,136 → 6,810,273`** — again generator-derived, never subtracted: the six pinned literals add exactly `Σ (2·len(prefix) + len(literal) + 86) = 1,137` canonical bytes, all in the wrapper (the leaf vector is bundle-independent and stays `6,804,633`). The superseded `6,809,136` now joins `7,267,676` as pre-A28 recompute history.

**`MAX_CANONICAL_LEAF_ENTRY_BYTES` cannot fire on schema-valid input, and is not claimed to.** The widest canonical entry at `N = 2^16` is **103 bytes** and, per the paragraph above, that width is _determined_ by the exact-key schema rather than chosen by the producer. The constant can therefore only trip when schema validation is itself incomplete — that is, on a verifier defect, never on hostile evidence. It is retained as a cheap tripwire and is classified in §4.9 as an **`implementation_regression_fixtures` guard**, not as a constant that bounds producer freedom. Listing it among adversarial limits would have made it the fourth costume of the §3.1 authority bug: a correctly shaped constant reading as a defence it cannot mount.

Measured scale of the gap A6 closed: a JavaScript array cannot exceed `2^32 - 1` entries (`new Array(2**32)` throws `Invalid array length`), while §3.2's **encoding** ceiling is `2^64 - 1` — a factor of `4.29e9`. At the smaller ceiling alone, an ordered leaf vector is roughly **0.4 TB**.

**What `MAX_CASE_BYTES` does not bound.** It bounds **canonical committed case bytes** for a single case (§3.2). It does **not** bound the raw transport size of an opening bundle, and it does not bound an opening bundle in aggregate. A large `k`, an escape-heavy JSON encoding, or many individually conforming 64 KiB cases can still constitute an opening-level allocation attack while every per-case check passes — the same transport-versus-canonical distinction this section draws for the manifest, one artifact downstream.

Stage 5O therefore raises the fail-closed requirement **`section_8_opening_bundle_resource_limits`** (§4.10, A8) — owned by Section 4, dischargeable only by Section 8, and **rejecting at release while unresolved**. Section 8 must pin, in the same profile-owned manner:

```text
MAX_OPENING_TRANSPORT_BYTES            preflight resource guard over raw opening-bundle bytes
MAX_OPENING_BUNDLE_CANONICAL_BYTES     normative acceptance over the canonical opening bundle
```

Section 4 makes no claim about opening-bundle resource bounds. A reader must not infer from a pinned `MAX_CASE_BYTES` that the opening path is bounded; it is bounded only once Section 8 pins those two constants **and binds them into the already-precommitted `disclosure_policy_digest`** (§4.10). This is a fail-closed **requirement**, not a permanent non-claim: it blocks release rather than describing a boundary.

**Manifest transport contract (frozen).** The §3.3.1 lessons apply to the manifest itself, not only to case payloads:

```text
- UTF-8 only; no BOM
- malformed UTF-8 rejects
- duplicate keys rejected LEXICALLY, before ordinary parsing
- exact-key schema; unknown fields reject
- no JSON numeric literals — canonical decimal strings only
- raw transport length checked BEFORE allocation
```

### 4.2 Canonical declared-index ordering

```json
{
  "leaf_entries": [
    { "declared_index": "0", "leaf_id": "..." },
    { "declared_index": "1", "leaf_id": "..." }
  ]
}
```

Frozen:

```text
expected_index = ARRAY POSITION

declared_index MUST equal canonicalDecimal(expected_index)
declared_index is mandatory but NON-AUTHORITATIVE
```

The verifier **rejects, never repairs**:

```text
- out-of-order entries
- missing indices
- repeated indices
- leading-zero indices
- sparse indices
- array length differing from N
```

**The verifier must not sort.** Sorting by `declared_index`, by `leaf_id`, or by anything else would erase the evidence that the producer supplied an invalid universe. A verifier that quietly reorders a malformed vector into a well-formed one has laundered the defect with excellent manners, and is the sharpest regression risk in this section.

This is the Section 3.1 authority rule applied to ordering: producer-supplied context may carry information; correctly shaped information does not thereby acquire authority.

### 4.3 Public leaf identity

Exactly one meaning:

```text
leaf_id_i     = leaf_value_i           // Section 3.2 exclusively defines leaf_value_i
merkle_leaf_i = SHA256(0x00 || leaf_id_i)
```

This keeps `leaf_id` as the position-bound hidden-case identity, keeps the `0x00` wrapper inside the tree profile, and keeps cross-artifact identity independent of proof-path encoding.

**Duplicate `leaf_id` values across positions reject.** Because the index is inside the leaf preimage, two positions cannot legitimately share a `leaf_id`: a duplicate indicates malformed construction or a hash collision, never a legitimate duplicate case.

**This does not detect T3.2.** Two positions holding the _same case_ produce _different_ `leaf_id` values, because their indices and salts differ. Duplicate-`leaf_id` rejection is a construction check; case duplication remains a relational defect governed by PC-3 and `not_proof_of_case_distinctness`. A reader must not mistake one for the other.

#### 4.3.1 Dual membership — one authoritative leaf, no split brain

Section 3 requires an authentication path; Section 4 makes the full ordered vector public. An opening therefore has **two membership channels**, and they must never be checked independently against different leaf values.

```text
expected_leaf_id = manifest.leaf_entries[i].leaf_id

recomputed_leaf_id(case, salt, expected_epoch_digest, i)
  MUST equal expected_leaf_id

authentication_path(
  leaf_id  = expected_leaf_id,
  position = i,
  N        = manifest.N
)
  MUST verify against manifest.merkle_root
```

Both channels use the **same authoritative** index `i`, leaf ID, `N`, root, and tree profile. All five come from the verified manifest and the challenge — never from the opening.

**Stated honestly: for a full verifier the path is redundant.** Recomputing the root from the public vector already establishes membership. The path remains a **required cross-check**, and it is what makes bounded selective-opening verification possible for a verifier that does not hold the whole vector. **It does not replace whole-vector verification.** Saying so prevents the split-brain implementation this rule exists to forbid: one that trusts the vector for equality, trusts the path for openings, and never notices the two disagree.

**Verdict scope (frozen).** The path is redundant for the full verifier and essential for a bounded opening verifier. Those are **different claims**, not different performance modes, so their verdicts differ in kind:

```text
full verifier:
  MAY establish scope-vector validity
  MAY establish indexed-universe equality
  MAY produce the Stage 5O release verdict

selective opening verifier:
  MAY establish one opening's preimage and membership
  MUST NOT claim whole-vector validity
  MUST NOT claim No Hidden Shrinkage
  MUST NOT emit the full Stage 5O acceptance verdict
```

A selective verifier that emitted the full acceptance verdict would be asserting Law 2 from evidence that cannot reach it — the equality law is a statement about all `N` positions, and a bounded verifier has seen `k`.

### 4.4 Profile bundle pinning

Version labels are not trusted. Exact ID-digest pairs:

```text
profile_bundle = {
  manifest_schema_id,          manifest_schema_digest,
  commitment_profile_id,       commitment_profile_digest,
  leaf_profile_id,             leaf_profile_digest,
  tree_profile_id,             tree_profile_digest,
  case_schema_id,              case_schema_digest,
  execution_object_schema_id,  execution_object_schema_digest,          // A9
  result_object_schema_id,     result_object_schema_digest,             // A9
  census_closure_schema_id,                  census_closure_schema_digest,                  // A17
  presented_closure_consistency_profile_id,  presented_closure_consistency_profile_digest,  // A17
  closure_conflict_schema_id,                closure_conflict_schema_digest,                // A17
  closure_anchor_schedule_profile_id,        closure_anchor_schedule_profile_digest,        // A17
  challenge_subject_profile_id,              challenge_subject_profile_digest,              // A17
  stage4t_package_adapter_profile_id,        stage4t_package_adapter_profile_digest,        // A17
  package_closure_core_section_schema_id,    package_closure_core_section_schema_digest,    // A17
  producer_authority_schema_id,              producer_authority_schema_digest,              // A19
  producer_signature_profile_id,             producer_signature_profile_digest,             // A19
  closure_authorization_schema_id,           closure_authorization_schema_digest,           // A19
  verified_closure_bitcoin_checkpoint_schema_id,  verified_closure_bitcoin_checkpoint_schema_digest,  // A28
  beacon_contract_profile_id,                beacon_contract_profile_digest,                // A28
  beacon_suffix_profile_id,                  beacon_suffix_profile_digest,                  // A28
  ordered_selected_indices_profile_id,       ordered_selected_indices_profile_digest,       // A28
  challenge_protocol_profile_id,             challenge_protocol_profile_digest,             // A28
  challenge_resource_limits_profile_id,      challenge_resource_limits_profile_digest       // A28
}
```

**A17 — the ownership map (frozen).** Every Section 6 machine object has exactly one pinned owner. **No construction sits between chairs:**

| Construction                                                                                                          | Pinned owner                            |
| --------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `closure_slot_id`, package-level single-closure rules                                                                 | `presented_closure_consistency_profile` |
| `census_closure` object and `census_closure_digest`                                                                   | `census_closure_schema`                 |
| canonical joint-conflict evidence                                                                                     | `closure_conflict_schema`               |
| anchor roles, `anchor_binding_digest`, timing rules, receipt non-mixing, **and the anchor-instance exact-key schema** | `closure_anchor_schedule_profile`       |
| `challenge_subject_digest`                                                                                            | `challenge_subject_profile`             |
| the real 4T keyed-section adapter (`sectionKey`/`sectionCommitment`/`merkleRootSorted`)                               | `stage4t_package_adapter_profile`       |
| the `stage5o/census_closure` keyed section                                                                            | `package_closure_core_section_schema`   |
| the producer authority descriptor and `producer_authority_digest` (A18)                                               | `producer_authority_schema`             |
| Ed25519 mode, key/signature widths, encodings, strict verification (A18)                                              | `producer_signature_profile`            |
| the detached `closure_authorization` object and its signed message (A18)                                              | `closure_authorization_schema`          |

**The anchor instance is a serialised evidence object, not merely a digest construction**, so its exact-key schema must be pinned. It is covered **by the schedule profile** rather than given its own pair, because the instance's _shape_ is static while only its _values_ vary per ceremony — the type-versus-value line §6.5.1 already draws to keep the graph acyclic.

**Pinned IDs, exact ASCII (`2^16 - 1` bound not used):**

```text
simurgh.vsc.scope_manifest.v1                     29 bytes   // A27 (was 2^16-1)
simurgh.vsc.commitment.v1                         25 bytes   // A27 (was 2^16-1)
simurgh.vsc.hidden_leaf.v1                        26 bytes   // A27 (was 2^16-1)
simurgh.vsc.merkle_tree.v1                        26 bytes   // A27 (was 2^16-1)
simurgh.vsc.case_schema.v1                        26 bytes   // A27 (was 2^16-1)
simurgh.vsc.execution_object_schema.v1            38 bytes   // A27 (was 2^16-1)
simurgh.vsc.result_object_schema.v1               35 bytes   // A27 (was 2^16-1)
simurgh.vsc.census_closure.v1                     29 bytes
simurgh.vsc.presented_closure_consistency.v1      44 bytes
simurgh.vsc.closure_conflict_evidence.v1          40 bytes
simurgh.vsc.anchor_schedule.v1                    30 bytes
simurgh.vsc.challenge_subject.v1                  32 bytes
simurgh.vsc.stage4t_package_adapter.v1            38 bytes
simurgh.vsc.package_closure_core_section.v1       43 bytes
simurgh.vsc.producer_authority.v1                 33 bytes   // A19
simurgh.vsc.producer_signature.ed25519.v1         41 bytes   // A19
simurgh.vsc.census_closure_authorization.v1       43 bytes   // A19
```

**Exact construction (frozen).** `exact_framed_profile_fields` was a promise-shaped variable; it is now bytes. Variable-length text is length-prefixed; every digest is fixed 32-byte:

```text
PROFILE_BUNDLE_DOMAIN = ASCII "simurgh.vsc.profile_bundle.v1"

profile_bundle_digest =
  SHA256(
    PROFILE_BUNDLE_DOMAIN                    ||
    u16be(len(UTF8(manifest_schema_id)))     || UTF8(manifest_schema_id)    ||
    manifest_schema_digest                   ||   // bytes32
    u16be(len(UTF8(commitment_profile_id)))  || UTF8(commitment_profile_id) ||
    commitment_profile_digest                ||   // bytes32
    u16be(len(UTF8(leaf_profile_id)))        || UTF8(leaf_profile_id)       ||
    leaf_profile_digest                      ||   // bytes32
    u16be(len(UTF8(tree_profile_id)))        || UTF8(tree_profile_id)       ||
    tree_profile_digest                      ||   // bytes32
    u16be(len(UTF8(case_schema_id)))         || UTF8(case_schema_id)        ||
    case_schema_digest                       ||   // bytes32
    u16be(len(UTF8(execution_object_schema_id))) ||
      UTF8(execution_object_schema_id)       ||   // A9
    execution_object_schema_digest           ||   // bytes32, A9
    u16be(len(UTF8(result_object_schema_id)))    ||
      UTF8(result_object_schema_id)          ||   // A9
    result_object_schema_digest              ||   // bytes32, A9
    u16be(len(UTF8(census_closure_schema_id)))   ||
      UTF8(census_closure_schema_id)         ||   // A17
    census_closure_schema_digest             ||   // bytes32, A17
    u16be(len(UTF8(presented_closure_consistency_profile_id))) ||
      UTF8(presented_closure_consistency_profile_id) ||   // A17
    presented_closure_consistency_profile_digest  ||   // bytes32, A17
    u16be(len(UTF8(closure_conflict_schema_id))) ||
      UTF8(closure_conflict_schema_id)       ||   // A17
    closure_conflict_schema_digest           ||   // bytes32, A17
    u16be(len(UTF8(closure_anchor_schedule_profile_id))) ||
      UTF8(closure_anchor_schedule_profile_id) ||   // A17
    closure_anchor_schedule_profile_digest   ||   // bytes32, A17
    u16be(len(UTF8(challenge_subject_profile_id))) ||
      UTF8(challenge_subject_profile_id)     ||   // A17
    challenge_subject_profile_digest         ||   // bytes32, A17
    u16be(len(UTF8(stage4t_package_adapter_profile_id))) ||
      UTF8(stage4t_package_adapter_profile_id) ||   // A17
    stage4t_package_adapter_profile_digest   ||   // bytes32, A17
    u16be(len(UTF8(package_closure_core_section_schema_id))) ||
      UTF8(package_closure_core_section_schema_id) ||   // A17
    package_closure_core_section_schema_digest   ||   // bytes32, A17
    u16be(len(UTF8(producer_authority_schema_id))) ||
      UTF8(producer_authority_schema_id)     ||   // A19
    producer_authority_schema_digest         ||   // bytes32, A19
    u16be(len(UTF8(producer_signature_profile_id))) ||
      UTF8(producer_signature_profile_id)    ||   // A19
    producer_signature_profile_digest        ||   // bytes32, A19
    u16be(len(UTF8(closure_authorization_schema_id))) ||
      UTF8(closure_authorization_schema_id)  ||   // A19
    closure_authorization_schema_digest           // bytes32, A19
  )
```

**Why the object schemas are here and not in Section 5 (A9).** Section 5 defines the execution and result censuses — the objects `S[i] = E[i] = R[i]` equality is read from. If their schemas were introduced by Section 5, a producer would choose the parser contract for the reported universes **after** `stage5o_precommitment_digest` was anchored, and could then present rows whose shape suited whatever the beacon selected. That is the §3.1 authority rule in its fourth costume: a schema arriving in a correctly shaped field, acquiring authority it was never granted. Anchoring the equality of three universes whose two reported schemas are producer-selectable would anchor the shape of the argument, not the argument.

The pairs live at **bundle level**, as peers of `case_schema` — not inside `commitment_profile`, which owns the §4.1.1 operational limits and nothing else. One artifact, one concern.

**A17 pins nothing imaginary.** It does **not** pin a closure-only capsule (A14 deleted it), a `closure_non_equivocation_profile` (no such mechanism exists — A13), the `package_capsule_salt` profile (Section 12 owns the construction it governs), or the final evidence-package schema, allowed-section registry, or package capsule root (all Section 12, and not yet designed). Pinning a profile for a construction that does not exist is the decorative-amendment failure the Section 5 preflight already refused once.

**No compatibility break.** `STAGE5O_V1_PROFILE_BUNDLE_DIGEST` changes, since the preimage gained framed pairs. No Stage 5O artifact has been released, so no anchored commitment is invalidated; the domain constant stays `v1` because there is no `v0` in the world to distinguish it from. Field order is frozen as written and **the preimage order equals the object order exactly**: A9's two pairs are appended after `case_schema`, A17's seven after `result_object_schema`, never interleaved. **The object and the preimage are checked against each other, not maintained in parallel by hand** — a pair present in the object but absent from the preimage is declared and unbound, which is the §3.1 authority rule in the costume that survives review most easily, because the object looks complete.

Field order is exactly as written. IDs are UTF-8, `1 <= len <= 2^16 - 1`, canonical per §3.3.1 (no lone surrogates, no normalisation). Every `bytes32` appears in JSON as **lowercase hex, exactly 64 characters** — the same single encoding §3.4 freezes for salts; non-canonical equivalents reject.

**`schema_version` was decorative — fixed.** The manifest declared `schema_version` while no digest covered it, so a producer could alter the declared parser contract **without altering the anchored digest**. That is the §3.1 authority bug in its third costume. Now:

```text
manifest_schema_id + manifest_schema_digest are bound INTO profile_bundle_digest

declared scope_manifest.schema_version is NON-AUTHORITATIVE:
  it MUST equal the verifier's pinned expected value for manifest_schema_id
```

The declared version carries information for readers. The pinned schema digest carries the authority.

**"Approved" must never mean "whatever my binary currently thinks."** A locally mutable allowlist produces verifier drift: verifier v1 rejects a tuple, verifier v2 accepts it, and **the identical signed artifact changes verdict** — a direct contradiction of this project's byte-reproducibility thesis, not merely untidy.

**A digests-only tuple does not close this.** An earlier draft pinned four component digests while the verifier separately asked whether each **ID was supported** — and "supported" can still change with the local binary. A later verifier could recognise a new alias ID for the same digest while an older verifier rejects it: same anchored artifact, different verdict, no digest changed. The ID question must not exist as a separate local judgement.

**Stage 5O v1 pins the whole bundle as one constant. There is no registry and no per-ID support question.**

```text
STAGE5O_V1_PROFILE_BUNDLE_DIGEST = <fixed bytes32, pinned in the verifier>
```

The verifier recomputes `profile_bundle_digest` from **all forty-six fields** (twenty-three ID-digest pairs, §4.4 construction, A9 + A17 + A19 + A28) and compares it to that single pinned constant:

```text
"supported" in v1 == exact equality with STAGE5O_V1_PROFILE_BUNDLE_DIGEST
```

This collapses the three checks into one that cannot drift: IDs, digests, and the combination are all covered, because all forty-six fields are inside the digest. Individually supported components could never have implied an approved combination — now the question does not arise.

Should a future version require multiple bundles, the registry itself must be pinned — `profile_tuple_registry_id` and `profile_tuple_registry_digest` bound **into** `profile_bundle_digest`, with the verifier loading the exact pinned registry artifact. "Supported by my current binary" is not offline reproducibility. That is deferred, not designed: **v1 has one bundle digest.**

Required fixture for any future registry form:

```text
same_tuple_different_local_registry
  -> verdict must remain determined by the PINNED registry, never the local one
```

### 4.5 Epoch descriptor

```text
epoch_descriptor = {
  campaign_digest: bytes32,
  epoch_sequence:  canonical u64 decimal string,
  epoch_nonce:     bytes32
}

EPOCH_DOMAIN = ASCII "simurgh.vsc.epoch.v1"

epoch_digest =
  SHA256(
    EPOCH_DOMAIN          ||
    campaign_digest       ||   // bytes32
    u64be(epoch_sequence) ||   // 8 bytes
    epoch_nonce                // bytes32
  )
```

Every field after the fixed-length domain constant is fixed-width, so no length framing is required and no boundary is inferable. `epoch_sequence` is a canonical decimal **string** in JSON (§3.3.1: no JSON numerics) and `u64be` **bytes** in the hash — the same value, two representations, never conflated.

Checks:

```text
- supplied epoch_digest MUST equal recomputation from the descriptor
- leaf verification uses the RECOMPUTED value (Section 3.1 authority table)
- unknown fields reject
- nonce encoding is canonical
- no wall-clock field is authoritative
```

The opening obtains its authoritative epoch from this **verified manifest**, never from the opening itself. The epoch is derived, not trusted — which is what makes Section 3.1's `expected_epoch_digest` a real value rather than a relabelled producer claim.

**Local epoch guarantee — and nothing beyond it.** Section 4 proves that the current manifest's `epoch_digest` is the canonical digest of its declared epoch descriptor. A standalone scope manifest contains **no campaign-history evidence** and therefore cannot establish that the descriptor or digest has not appeared elsewhere.

This section defines **no** campaign-history object, previous-epoch link, history digest, or epoch census. It follows that Stage 5O ships **no duplicate-epoch check at all** — not even a same-history one. An earlier draft of this section asserted deterministic duplicate rejection "within the presented history"; there is no such object to inspect, so the guarantee was removed rather than furnished with a lock.

Signed as `not_proof_of_global_epoch_uniqueness_without_complete_campaign_history`.

**If a later section defines a complete presented campaign-history object:**

```text
if such an object exists:
  duplicate descriptors WITHIN that object -> reject deterministically
otherwise:
  no duplicate-history check exists
  the Section 4 ceiling remains fully active
```

Section 8 is the natural candidate, since it already owns presented-history and cumulative-accounting semantics — but this section **does not predeclare that Section 8 closes the ceiling**. Even with such an object the global ceiling survives, because omitted, forked, and independently presented histories stay invisible.

### 4.6 Scope-vector digest

```text
SCOPE_VECTOR_DOMAIN = ASCII "simurgh.vsc.scope_vector.v1"

scope_vector_digest =
  SHA256(
    SCOPE_VECTOR_DOMAIN   ||
    profile_bundle_digest ||   // bytes32
    epoch_digest          ||   // bytes32
    u64be(N)              ||   // 8 bytes
    merkle_root                // bytes32
  )
```

All fixed-width after the domain constant.

Verifier order (frozen):

```text
1. validate the manifest schema
2. validate N
3. validate the ordered leaf vector
4. recompute every Merkle leaf
5. recompute the canonical root (Section 3.5 MTH)
6. compare the declared root
7. recompute scope_vector_digest
```

Deliberate redundancy — a mismatch **anywhere** rejects:

```text
declared N  =  leaf_entries.length  =  index domain size  =  N inside scope_vector_digest
```

### 4.7 Bind the rules before the beacon

Section 2 requires the predicate and probability policy to be fixed before challenge selection. The anchored object therefore **cannot** be `scope_vector_digest` alone.

```text
policy_bindings = {
  opening_predicate_digest,
  relational_predicate_digest,
  challenge_policy_digest,
  beacon_contract_digest,
  disclosure_policy_digest
}
```

Every slot is **mandatory**. Where no relational predicate applies, the slot carries a domain-separated constant — never `null`, omission, or all-zero bytes:

```text
NO_RELATIONAL_PREDICATE_DIGEST = SHA256("simurgh.vsc.no_relational_predicate.v1")
```

Omission would make "disable the check" indistinguishable from "the field is absent", and all-zero bytes would collide with an unset buffer. A constant makes _declining_ the relational predicate an explicit, signed act.

Later sections exclusively define each policy preimage. Section 4 defines only the binding slots.

#### 4.7.1 Producer authority — the precommitment names its speaker (A18)

Section 6's closure preflight established that Stage 5O bound **no cryptographic producer authority at all**. A public anchor proves that bytes were fixed before a height; it does not prove **who** fixed them. Any third party could therefore construct a well-formed census closure over the same slot, anchor it, and manufacture conflict evidence against a producer who never authored it — turning the stage's own equivocation detector into a denial-of-service weapon aimed at honest producers. The precommitment bound a scope, a set of rules, and no speaker.

**Authority is not a policy**, so it does not join `policy_bindings`. It is bound directly, immediately after the scope.

```text
producer_authority_descriptor = {
  schema_id,                 // pinned exactly; declared, non-authoritative
  schema_digest,             // bytes32
  signature_profile_id,      // pinned exactly; declared, non-authoritative
  signature_profile_digest,  // bytes32
  public_key                 // lowercase hex, exactly 64 characters
}
```

Pinned v1 identifiers — concrete ASCII, not a `2^16 - 1` bound:

```text
PRODUCER_AUTHORITY_SCHEMA_ID = ASCII "simurgh.vsc.producer_authority.v1"          // 33 bytes
SIGNATURE_PROFILE_ID         = ASCII "simurgh.vsc.producer_signature.ed25519.v1"  // 41 bytes
```

**The descriptor's four profile fields are declared, non-authoritative copies (A19).** Their authoritative home is the profile bundle, which pins `producer_authority_schema` and `producer_signature_profile` as ID-digest pairs like every other profile. The descriptor restates them for readability and they are checked against the bundle, exactly as `schema_version` is checked against `manifest_schema_id` (§4.4). This keeps A3's one-fact-one-home rule intact: had the descriptor been the authoritative home while the bundle pinned the same profiles, a descriptor/bundle disagreement would have had no defined winner — a seam in the shape of a tidy field.

##### The signature profile — `simurgh.vsc.producer_signature.ed25519.v1`

No reusable profile existed to import. The preflight read every shipped signature-bearing stage: `signature_profile`, `signature_profile_id` and `signature_profile_digest` appear **nowhere** in the repository. What exists is a **helper convention** — `crypto.sign(null, canonicalBytes, privPem)` over Ed25519 keys recorded as `{ key_type: "Ed25519", format: "spki-pem" }`. A helper is not a pinned contract: it has no ID, no digest, and no executable acceptance rule. Stage 5O therefore mints its own, and **deliberately diverges from the house convention twice**:

```text
algorithm            Ed25519 (RFC 8032), PURE mode — never ed25519ph, never ed25519ctx
message              the exact domain-separated byte string defined per signed object
                     NEVER canonicalJson output; NEVER a re-encoded projection
public key           exactly 32 raw bytes
signature            exactly 64 raw bytes
external public key  lowercase hex, exactly 64 characters
external signature   lowercase hex, exactly 128 characters
verification         strict — reject non-canonical point encodings, reject
                     small-order public keys, reject non-canonical S scalars
negotiation          none — one algorithm, one profile, one v1
```

**Why diverge from SPKI-PEM.** `producer_authority_digest` hashes the key material directly. PEM is a _presentation_ of a key, not an identity: the same key has many valid PEM encodings differing in line breaks and trailing whitespace, so a PEM-keyed digest would be encoder-dependent and would need length framing. **32 raw bytes has exactly one encoding.** The authority digest needs one identity byte string, not a rendering of one.

**Why not sign `canonicalJson` output.** Signing an encoder's output makes the signature depend on the encoder. This is the §3.1 authority rule at the signature layer, and Section 3 already closed exactly this seam for `case_digest`. The signed message is always an explicit, domain-separated, fixed-width concatenation.

##### The authority digest

```text
PRODUCER_AUTHORITY_DOMAIN = ASCII "simurgh.vsc.producer_authority.v1"

producer_authority_digest =
  SHA256(
    PRODUCER_AUTHORITY_DOMAIN          ||
    producer_authority_schema_digest   ||   // bytes32
    u16be(len(signature_profile_id))   ||   // 2 bytes
    ASCII(signature_profile_id)        ||   // variable — hence framed
    signature_profile_digest           ||   // bytes32
    public_key_bytes                        // exactly 32 bytes
  )
```

`PRODUCER_AUTHORITY_DOMAIN` and `PRODUCER_AUTHORITY_SCHEMA_ID` are deliberately the same ASCII string: they name one fact — _this is the v1 producer authority_ — in one place, per A3. No collision arises, because every preimage in the graph begins with its own domain constant.

Verifier order (frozen):

```text
1. schema_id           == PRODUCER_AUTHORITY_SCHEMA_ID   (exact bytes; no alias, no case folding)
2. signature_profile_id == SIGNATURE_PROFILE_ID          (exact bytes)
3. schema_digest and signature_profile_digest == the pinned v1 values
4. public_key is exactly 64 lowercase hex characters, decoding to exactly 32 bytes
5. the decoded key passes STRICT Ed25519 public-key validation
6. recompute producer_authority_digest; the declared field MUST equal it
7. any mismatch REJECTS — no fallback, no negotiation, no "best effort"
```

Frozen for v1:

```text
- exactly one authority per precommitment
- no key rotation within a precommitment
- no delegation
- no threshold or multi-party authority
- changing the key requires a NEW precommitment, and therefore a new anchor
```

**The authoritative public key comes only from this descriptor**, which the precommitment already binds — never from inside a signed object. This is the §3.1 authority rule in its seventh costume: an untrusted envelope may carry a key-shaped value, but a key does not acquire authority by arriving in a correctly shaped field.

#### 4.7.2 The precommitment root

```text
PRECOMMITMENT_DOMAIN = ASCII "simurgh.vsc.precommitment.v1"

stage5o_precommitment_digest =
  SHA256(
    PRECOMMITMENT_DOMAIN        ||
    scope_vector_digest         ||   // bytes32
    producer_authority_digest   ||   // bytes32 — A18
    opening_predicate_digest    ||   // bytes32
    relational_predicate_digest ||   // bytes32
    challenge_policy_digest     ||   // bytes32
    beacon_contract_digest      ||   // bytes32
    disclosure_policy_digest         // bytes32
  )
```

All fixed-width after the domain constant; field order is exactly as written.

> **This is the digest Section 6 must anchor** (the future-height anchor contract). Anchoring only `merkle_root` or only `scope_vector_digest` **must fail the implementation suite.**

#### 4.7.3 Digest derivation is a DAG, and every declared digest is non-authoritative

```text
profile component digests
        |
        v
profile_bundle_digest ------+
                            |
epoch_descriptor            |
        |                   |
        v                   |
epoch_digest ---------------+
                            |
leaf vector                 |
        |                   |
        v                   v
merkle_root -------> scope_vector_digest ----+
                                             |
producer authority descriptor                |
        |                                    |
        v                                    |
producer_authority_digest ------------------>+
                                             |
policy artifacts                             |
        |                                    |
        v                                    v
policy digests --------------> stage5o_precommitment_digest
```

Frozen:

```text
- every DECLARED digest field is non-authoritative:
    declared digest MUST equal verifier recomputation
- no digest includes an object containing that same digest field
- NO "hash the whole manifest" shortcut, unless a self-field-excluded
  canonical projection is frozen explicitly (v1 freezes none)
```

The manifest **contains** `scope_vector_digest` and `stage5o_precommitment_digest`. Hashing the manifest wholesale would therefore be cyclic — the digest would cover a field whose value depends on the digest. This is the Section 3.1 authority rule generalised from indices and epochs to **every digest in the graph**: a declared digest carries information, never authority.

### 4.8 Array-semantics registry

Every array path in the case schema is classified. **Two modes only in v1:**

| Mode       | Meaning             | Canonical rule                                         |
| ---------- | ------------------- | ------------------------------------------------------ |
| `sequence` | order is meaningful | preserve order exactly                                 |
| `set`      | order is irrelevant | sort by canonical element **bytes**; reject duplicates |

Frozen:

```text
- no implicit "array means set" rule
- no multiset semantics in v1
- every nested array path MUST be declared
- undeclared array paths fail schema validation
- set sorting uses canonical element BYTES, not hashes
- sequence reordering CHANGES the case digest
- set reordering does NOT
- duplicate set members REJECT rather than silently collapse
```

Commitment/evidence array classifications:

```text
leaf_entries        -> sequence
authentication_path -> sequence
added_non_claims    -> canonical lexicographic set
```

**Those three are not the registry.** They classify commitment and evidence arrays; they say nothing about arrays reachable inside `case_payload`, `declared_predicate_inputs`, or nested case objects. Without a machine-readable registry covering **every** reachable path, "every array is declared" is an aspiration, not a checkable property.

**The registry lives in the pinned case-schema artifact and is covered by `case_schema_digest`:**

```text
array_semantics = {
  <canonical path>: sequence | set
}
```

Frozen:

```text
- canonical path grammar = JSON Pointer (RFC 6901)
- the registry is INCLUDED in case_schema_digest
- every reachable array path appears EXACTLY once
- an undeclared reachable path         -> reject
- a duplicate path declaration          -> reject
- set comparison = unsigned lexicographic comparison of canonical UTF-8 element bytes
- NO runtime inference from field names, field values, or current contents
```

The last rule is the one that keeps the property checkable: a schema that guesses "this looks like a set" at runtime has moved the semantics out of the pinned artifact and into the binary — the same drift Blocker 3 closed for profile support. Set-ness is declared and digested, never inferred.

**Set sorting must not use a language's default string comparison.** Measured: JavaScript's `.sort()` orders by UTF-16 code units, the canonical rule orders by UTF-8 bytes, and the two **invert** for any supplementary-plane character —

```text
JS default .sort()  : U+1F600  U+E000  U+FFFD
UTF-8 byte order    : U+E000   U+FFFD  U+1F600
```

— because U+1F600's lead surrogate `D83D` sorts below `E000` while its first UTF-8 byte `F0` sorts above `EE`/`EF`. Python's `sorted()` on `str` is code-point order, which coincides with UTF-8 byte order; so a JS implementation using `.sort()` diverges from the canonical rule **and** from Python simultaneously. Set canonicalisation compares UTF-8 byte sequences explicitly.

**Verified implementable:** `canonicalJson` preserves array order (so `sequence` works) and sorts object keys (so schema determinism holds); a schema-level byte-sort makes `set` reordering digest-identical.

### 4.9 Fixture taxonomy (frozen before raw codes exist)

**Five classes (A23)**, and the distinction is load-bearing for Section 10. The enum is **closed**: a row whose class is absent, misspelled, or outside this table rejects.

| Class                                | Subject          | Evidence-verifier result                        | Non-zero Stage 5O raw code? |
| ------------------------------------ | ---------------- | ----------------------------------------------- | --------------------------- |
| `evidence_attack_fixtures`           | bytes            | **reject**                                      | **yes**                     |
| `accepted_blindness_fixtures`        | bytes            | **accept** + required ceiling asserted          | **no — raw `0`**            |
| `paired_enforcement_fixtures`        | bytes            | **reject** (same defect, where evidence exists) | **yes**                     |
| `implementation_regression_fixtures` | our own verifier | CI / conformance failure                        | **no verifier raw result**  |
| `assumption_language_fixtures` (A23) | **a sentence**   | **no runtime verdict — none is possible**       | **forbidden**               |

**`assumption_language_fixtures` — the class whose subject is a sentence (A23).** Every other class mutates bytes and asks a verifier what it decides. This one reads the **specification** and asks whether a normative sentence states the computational assumption it is spending. It passes when the document names the assumption; it fails when the document treats a hash as logically injective.

```text
class:                     assumption_language_fixtures
subject:                   exact normative sentence, or stable assertion identifier
raw_code:                  FORBIDDEN
expected_runtime_verdict:  FORBIDDEN
check:                     specification-language obligation
```

**It cannot simulate a collision, and must not pretend to.** A verifier using the same hash cannot distinguish two colliding preimages from one — that is what `not_proof_of_cryptographic_primitive_security` concedes. So there is no byte mutation that makes an injectivity overclaim fail at runtime; the only artifact that can carry the defect is the prose, and the only check that can catch it reads the prose. **A fixture class exists for every way this stage can be wrong, and the stage can be wrong in a sentence.** S6.36 is the first member.

**Why this is a fifth class rather than an `implementation_regression_fixtures` member.** That class tests **our verifier** and fails CI when the implementation contradicts the contract. An assumption-language fixture fails CI when the **contract contradicts cryptography**. Filing prose obligations under implementation regressions would mean a spec defect masquerading as a build defect — and a reader of the taxonomy would reasonably expect a runtime subject that does not exist.

An earlier draft of this table gave accepted-blindness fixtures "raw code: **yes** (verdict is green)", which is self-contradictory. A valid blindness fixture **verifies raw `0`** — that is precisely the point of it. If such a fixture accepts but **omits its required non-claim**, _that omission_ may later receive a non-zero raw code. The omission is the defect; the valid fixture is not.

**`implementation_regression_fixtures` carry no Stage 5O raw codes.** They test the implementation, not hostile evidence; they fail CI or the implementation-conformance suite; they may name the runtime failure they prevent; and they **must execute before the raw-code first-failure matrix is trusted**, since a mis-built verifier invalidates every code the matrix asserts.

> A verifier that sorts malformed evidence is not encountering a new evidence condition. It is implementing the contract incorrectly.

Section 10 may reference this class when validating verifier check order, but **must not allocate `420+` codes to it**.

#### Membership closure (A23)

Declaring a class per row is not enough: a parser that misses an entire matrix would classify every row it found and congratulate itself. The gate MUST therefore prove **closure**:

```text
matrix fixture IDs
      ==
implemented executable fixture IDs
      UNION
implemented specification-language check IDs
```

```text
- fixture IDs are unique across EVERY class, not merely within one
- the class enum is CLOSED; an unknown or misspelled class REJECTS
- every row carries EXACTLY ONE class
- executable classes MUST carry expected raw-code behaviour
- assumption_language_fixtures MUST NOT carry a raw code or runtime verdict
- a fixture-shaped ID outside a canonical matrix REJECTS
```

The last rule is A22's lexical tripwire in the fixture register: **an ID that looks like a fixture but lives outside a matrix is either a fixture the gate cannot see, or a citation wearing a fixture's clothes.** Both are the defect that hid Section 1's baseline for twenty-one amendments, and neither is detectable by a gate that only reads what it already found.

**`MAX_CANONICAL_LEAF_ENTRY_BYTES` belongs to this class, not to the adversarial limits.** Per §4.1.1 the canonical entry width is determined by the exact-key schema, so the constant cannot trip on schema-valid input at any `N` in the pinned profile — it can only trip when schema validation is itself defective. It is a tripwire over our own implementation and **receives no `420+` code**. The other four constants of §4.1.1 do bound producer freedom and are exercised adversarially by S4.26–S4.33.

**The member census is deleted (A23), not corrected.** It read: _"Current members: S3.2, S3.14, S4.3, S4.18, S4.25. **Five** — counted from the matrix rows, after I asserted six from memory and was wrong."_ It was wrong when written and wrong in a second place: the §4.11 freeze gate simultaneously asserted **six members** (adding S4.34), and the matrices, measured at A23 by the rows' own text, contained **twelve** — S4.42, S4.44, S4.45, S5.4, S5.18 and S5.19 were never counted by either list. _(That twelve is recorded here as the measurement that condemned the census, not as a value to maintain: once every row declares a class the number is generated, and A23's own classification of canonicalisation-semantics rows raises it further. The current figure lives in generated evidence, never here.)_ One class, two hand-maintained censuses, three different answers, and **the first correction of it carried its own methodology in the sentence — "counted from the matrix rows" — while going stale within the same stage.**

**The tell is S4.42.** It is the fixture A17's own erratum added _in this stage_ to catch A17's authority-laundering defect. The census that exists to track this class did not notice the fixture that exists because a hand-maintained list went stale. **A census maintained by hand does not track a class; it records the last time someone remembered to look.**

**Each row declares its class; the gate derives everything else.** No count of fixtures appears in this specification as normative text. Generated evidence may report:

```text
total rows
count by class
unique fixture IDs
required and forbidden fields, by class
```

### 4.10 `section_4.added_non_claims` and `section_4.required_later_bindings` (A3, A8)

```text
section_4.added_non_claims = [
  not_proof_of_exclusive_or_uncompromised_producer_key_control,          // A18
  not_proof_of_global_epoch_uniqueness_without_complete_campaign_history,
  not_proof_of_real_world_producer_identity,                            // A18
  not_proof_that_every_conforming_verifier_can_process_a_profile_conforming_artifact
]

section_4.required_later_bindings = [
  section_10_evidence_attack_raw_code_allocation,                        // A24
  section_8_opening_bundle_resource_limits
]
```

> **`not_proof_of_global_epoch_uniqueness_without_complete_campaign_history`** — Stage 5O does not prove that the current epoch descriptor or digest is globally unique. Duplicate detection becomes available only over a later, explicitly defined campaign-history object containing the relevant epochs; absent such an object, **no cross-epoch uniqueness verdict is made**.

The name carries its condition, matching `not_proof_of_complete_disclosure_history_without_committed_ledger`. The wording is deliberately phrased so it cannot be read as implying that Stage 5O already ships a same-history check — it does not.

> **`not_proof_that_every_conforming_verifier_can_process_a_profile_conforming_artifact`** — the pinned limits of §4.1.1 bound the **artifact**, not the runtime. `MAX_SCOPE_CARDINALITY = 65536` states which artifacts are in-profile; it does not state that any given verifier host has the memory, time, or parser capacity to complete verification of one. A verifier that cannot process an in-profile artifact is resource-incapable or non-conforming (S4.34); the artifact remains valid and **no raw code may report it otherwise**. This is the honest cost of pinning a cardinality on unmeasured-runtime grounds rather than a benchmarked one.

> **`not_proof_of_exclusive_or_uncompromised_producer_key_control`** (A18) — a valid signature proves **signing capability** under the pinned profile. It does not prove exclusive control, uncompromised custody, absence of key sharing, or that every signature reflects the intended producer's conscious approval. A stolen, shared, or coerced key produces signatures Stage 5O accepts as authorised, because at the byte level they **are** authorised. The stage proves continuity of a key, never diligence of its holder.

> **`not_proof_of_real_world_producer_identity`** (A18) — Stage 5O proves authorisation continuity under one precommitted cryptographic public key. It does **not** prove the legal, organisational, or real-world identity of the party controlling that key. The stage can say "the same speaker authorised both of these"; it cannot say who the speaker is. Keyless submitter identity (I7) remains **open** and is not addressed by A18.

All four names carry their condition, matching the pattern above, and none may be dropped or weakened by a later section. All four are **permanent**: no future section discharges any of them.

#### `section_8_opening_bundle_resource_limits` — the requirement (A8)

An earlier draft of this section recorded the opening-bundle gap as a third non-claim, `not_proof_of_opening_bundle_resource_bounds_without_section_8_limits`, and stated that Section 8 would "discharge" it. **The contract defines no such operation.** Frozen non-claims are permanent by the A1 accumulation rule, so that field could only ever be signed into the release envelope as a stale limitation — describing a gap the same release had actually closed. It was a real dependency wearing a permanent-ceiling coat. A8 reclassifies it.

```text
requirement:            section_8_opening_bundle_resource_limits
owning section:         4
permitted discharger:   8
status:                 PENDING
```

#### `section_10_evidence_attack_raw_code_allocation` — the requirement (A24)

§4.9's class table states that `evidence_attack_fixtures` carry a **non-zero Stage 5O raw code**. That is a normative obligation, and until A24 it had **no owner, no discharger, no status, and no ledger entry** — it lived in a table cell and blocked nothing. Measured at A24: **zero** codes are allocated in the reserved `420+` band anywhere in the stage, while the committed sections carry **78** evidence-attack rows and Section 6 adds **25**. Every apparent `420+` occurrence in this document is byte arithmetic — `465` from `1,121,465`, `463` from `463,043` — not an allocation.

**This is A8's painted door, in the register A8 built to prevent it.** An unfinished obligation recorded as prose promises a discharge the contract never defines and nothing enforces; the second ledger exists precisely so such obligations fail closed instead. A24 **allocates no codes**. It records the obligation honestly and makes the release gate enforce it.

```text
requirement:            section_10_evidence_attack_raw_code_allocation
owning section:         4
permitted discharger:   10
status:                 PENDING
```

**What Section 10 must prove to discharge it.** Section 10 **assigns both the semantic failure reason and its raw code** — they are one taxonomy operation, not two. The chain runs:

```text
fixture contract  ->  Section 10 semantic first-failure class  ->  Section 10 raw code
```

and never:

```text
fixture  ->  locally invented reason  ->  Section 10 deduplicates it later
```

**Sections 3–6 define attacks; Section 10 defines their shared first-failure taxonomy and numeric protocol.** A section that mints a provisional reason for its own rows is naming an equivalence class from inside one of its members: reasons group fixtures **across** sections by first-failure condition, so a locally invented vocabulary yields one reason per fixture — the confetti cannon arriving in a fake moustache, and Section 10 inheriting a taxonomy it must first undo. **No section may declare a provisional reason, a fixture-name-as-reason alias, or a per-row pending status.**

```text
fixture_id
semantic_failure_reason      // assigned by Section 10
raw_code                     // assigned by Section 10
first_failure_precedence
```

```text
every normative evidence-attack fixture  ->  exactly one semantic failure reason
every semantic failure reason            ->  exactly one non-zero raw code
one semantic failure reason              ->  ONE OR MORE fixtures
one fixture                              ->  exactly one reason
```

**A fixture name is not a reason. A field name is not a reason.** A reason names the verifier's first semantic failure condition — `anchor_quorum_incomplete`, `required_replacement_closure_absent`, `producer_authority_binding_mismatch` — and the vocabulary is Section 10's decision. The stage's existing backticked identifiers are **neither**: `duplicate_key_raw_case` names a fixture, `census_closure_digest` names a field, and eleven committed rows carry the former in the position a reader would expect the latter. **Measured at this erratum: of 78 committed evidence-attack rows, 11 carry a trailing symbolic identifier and none of them is a failure reason.** Section 10 classifies the complete stage-wide set in **one pass** — 78 committed plus Section 6's 25, a **derived projection and never a normative constant**.

**The mapping gate must detect:** an unmapped fixture; one fixture mapped twice; one reason assigned two codes; one code assigned incompatible reasons; a fixture identifier masquerading as a reason; a field identifier masquerading as a reason; a code outside the reserved band; first-failure precedence disagreement; and stale mappings when fixtures are added, removed, or retired.

_A24 discharge erratum: A24's folded text required "exactly one **declared** first-failure reason" without saying who declares it — readable as rows declaring reasons that Section 10 merely collects, which is the path this erratum forbids. Naming the equivalence classes the codes represent is inherent in A24's existing obligation, so this is an unfinished tail of that ruling and mints no mechanism. **No new amendment number.**_

**One code per semantic failure class, never one per fixture.** Fixtures exercising the same first-failure condition share a code; the alternative turns a hundred-odd evidence-attack rows into a code-number confetti cannon, and a code that names a fixture rather than a failure is an identifier pretending to be a diagnosis. Section 10 must further establish a closed allocation table, unique symbolic reason names, unique numeric codes, deterministic first-failure ordering, no evidence-attack fixture without a mapping, no code mapped to incompatible meanings, **never `0` for rejection**, shared exit-ledger parity, mechanically regenerated goldens, and explicit proof that unrelated prior-stage codes did not move.

**Preflight every shared golden and consumer before allocating the first number.** Stage 4M's additive codes broke five goldens; 4R and 4S cost four red rounds to the same class of change. The debris field is not hand-editable afterwards.

**Section 6 does not own numeric allocation, and requiring codes from it would break the ownership model.** Its evidence-attack rows carry a stable symbolic failure reason; the number arrives from Section 10 or not at all. **Stage 5O release stays REJECTED until it does** — that is what `status: PENDING` means, and it is now a locked door rather than painted scenery.

##### Ledger semantics — stated once, never per record (A20)

The canonical vocabulary is **exactly four fields**, in exactly this order. Every consequence is a property of the ledger, not a line inside each record:

```text
status: PENDING     =>  release REJECTS
status: DISCHARGED  =>  release may proceed on this requirement alone
permitted discharger is EXACTLY ONE; no other section may discharge it
owning section is EXACTLY ONE                       (A3: one fact, one home)
```

A20 removed `unresolved at release: REJECT` from this block and from §5.9. It was not wrong — it was **derivable** from `status: PENDING` and the rule above, and a field that restates a global rule per record is a second home for it. When the two drift, nothing defines which wins. The same reasoning removed the `(exactly one; no other section may discharge it)` parenthetical: the rule is the ledger's, not the record's.

**The gate rejects** missing fields, extra fields, duplicate fields, duplicate requirement names, unsupported `status` values, multiple owners or dischargers, a requirement discharged by an unpermitted section, and **summaries masquerading as ledger records**. Field order is fixed and checked: two accepted orderings would be two canonical forms, which is what §3.3.1 exists to forbid one artifact upstream.

**What Section 4 actually depends on.** `MAX_CASE_BYTES` bounds one canonical case (§3.2, §4.1.1). It does not bound the raw transport size of an opening bundle, nor an opening bundle in aggregate. A large `k`, an escape-heavy encoding, or many individually conforming 64 KiB cases can constitute an opening-level allocation attack while every per-case check passes — the §4.1.1 transport-versus-canonical distinction, one artifact downstream.

**Discharge conditions — bytes, not prose.** Section 8 discharges this requirement only by defining **and binding**:

```text
MAX_OPENING_TRANSPORT_BYTES            preflight resource guard over raw opening-bundle bytes
MAX_OPENING_BUNDLE_CANONICAL_BYTES     normative acceptance over the canonical opening bundle
```

together with the opening-side limit-compatibility invariant, in the derived-not-sampled form §4.1.1 freezes for the manifest:

```text
maxCanonicalOpeningBundleBytes(
  maximum permitted k,
  MAX_CASE_BYTES,
  MAX_SCOPE_CARDINALITY,
  maximum authentication-path length,
  pinned opening schema
)
  <= MAX_OPENING_BUNDLE_CANONICAL_BYTES

MAX_OPENING_BUNDLE_CANONICAL_BYTES <= MAX_OPENING_TRANSPORT_BYTES
```

**Both limits MUST enter the exact preimage of `disclosure_policy_digest`** — the digest Section 4 has _already_ bound into `stage5o_precommitment_digest` (§4.7). This is the load-bearing half of the requirement. `disclosure_policy_digest` is precommitted **before** the beacon is knowable; a limit printed in Section 8 but absent from that preimage would be a producer-selectable opening bound chosen after the challenge — the §3.1 authority rule violated one artifact downstream, in its fifth costume. **Printing the constants in Section 8 discharges nothing.**

Boundary fixtures on both sides of both limits are required, in the S4.26–S4.33 pattern, including the ordering assertion: rejection must precede the allocation it guards.

### 4.11 Section 4 attack matrix

| ID    | Attack                                                                                                     | Expected result                                                                                                                                      | Class                                |
| ----- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| S4.1  | `N` differs from leaf-vector length                                                                        | **reject**                                                                                                                                           | `evidence_attack_fixtures`           |
| S4.2  | `declared_index` differs from array position                                                               | **reject**                                                                                                                                           | `evidence_attack_fixtures`           |
| S4.3  | verifier sorts malformed entries before checking                                                           | **negative implementation fixture** — MUST fail the suite                                                                                            | `implementation_regression_fixtures` |
| S4.4  | sparse or repeated indices                                                                                 | **reject**                                                                                                                                           | `evidence_attack_fixtures`           |
| S4.5  | duplicate `leaf_id`                                                                                        | **reject**                                                                                                                                           | `evidence_attack_fixtures`           |
| S4.6  | root does not match the ordered vector                                                                     | **reject**                                                                                                                                           | `evidence_attack_fixtures`           |
| S4.7  | correct root under wrong `N`                                                                               | **reject**                                                                                                                                           | `evidence_attack_fixtures`           |
| S4.8  | correct root under wrong epoch                                                                             | **reject**                                                                                                                                           | `evidence_attack_fixtures`           |
| S4.9  | correct root under wrong profile bundle                                                                    | **reject**                                                                                                                                           | `evidence_attack_fixtures`           |
| S4.10 | profile ID-digest mismatch                                                                                 | **reject**                                                                                                                                           | `evidence_attack_fixtures`           |
| S4.11 | unsupported profile combination (each part individually valid)                                             | **reject**                                                                                                                                           | `evidence_attack_fixtures`           |
| S4.12 | downgrade to the unsalted 5K leaf profile                                                                  | **reject**                                                                                                                                           | `evidence_attack_fixtures`           |
| S4.13 | producer invents a new profile but labels it `v1`                                                          | **reject** (digest mismatch)                                                                                                                         | `evidence_attack_fixtures`           |
| S4.14 | root-only commitment without the leaf vector                                                               | **reject**                                                                                                                                           | `evidence_attack_fixtures`           |
| S4.15 | policy binding omitted                                                                                     | **reject**                                                                                                                                           | `evidence_attack_fixtures`           |
| S4.16 | predicate changed after precommitment                                                                      | **reject**                                                                                                                                           | `evidence_attack_fixtures`           |
| S4.17 | beacon contract changed after precommitment                                                                | **reject**                                                                                                                                           | `evidence_attack_fixtures`           |
| S4.18 | verifier anchors `scope_vector_digest` instead of the final precommitment                                  | **negative implementation fixture** — MUST fail the suite                                                                                            | `implementation_regression_fixtures` |
| S4.19 | sequence array reordered                                                                                   | **different digest**                                                                                                                                 | `implementation_regression_fixtures` |
| S4.20 | set array reordered                                                                                        | **same digest**                                                                                                                                      | `implementation_regression_fixtures` |
| S4.21 | duplicate set member                                                                                       | **reject**                                                                                                                                           | `evidence_attack_fixtures`           |
| S4.22 | undeclared array semantics                                                                                 | **reject**                                                                                                                                           | `evidence_attack_fixtures`           |
| S4.23 | unknown commitment field                                                                                   | **reject**                                                                                                                                           | `evidence_attack_fixtures`           |
| S4.24 | empty universe (`N = 0`)                                                                                   | **reject**                                                                                                                                           | `evidence_attack_fixtures`           |
| S4.25 | set canonicalisation uses the language's default string sort                                               | **negative implementation fixture** — UTF-16 vs UTF-8 order inverts above the BMP                                                                    | `implementation_regression_fixtures` |
| S4.35 | execution or result object schema introduced after the precommitment is anchored (A9)                      | **reject** — `profile_bundle_digest` mismatch                                                                                                        | `evidence_attack_fixtures`           |
| S4.36 | producer authority descriptor swapped or introduced after anchoring (A18)                                  | **reject** — `stage5o_precommitment_digest` mismatch                                                                                                 | `evidence_attack_fixtures`           |
| S4.37 | declared `producer_authority_digest` disagrees with recomputation from the descriptor (A18)                | **reject** — declared digests are non-authoritative (§4.7.3)                                                                                         | `evidence_attack_fixtures`           |
| S4.38 | `public_key` presented as uppercase hex, `0x`-prefixed, PEM, or whitespace-padded (A18)                    | **reject** — exactly 64 lowercase hex characters; one canonical representation                                                                       | `evidence_attack_fixtures`           |
| S4.39 | `public_key` decodes to a small-order or non-canonically encoded point (A18)                               | **reject** — strict Ed25519 public-key validation                                                                                                    | `evidence_attack_fixtures`           |
| S4.40 | `signature_profile_id` names a different algorithm or a "v2" the verifier might negotiate (A18)            | **reject** — exact byte equality with the pinned ID; no negotiation                                                                                  | `evidence_attack_fixtures`           |
| S4.41 | two authorities, or a rotated key, inside one precommitment (A18)                                          | **reject** — v1 binds exactly one authority; a new key requires a new precommitment                                                                  | `evidence_attack_fixtures`           |
| S4.42 | a profile pair present in the `profile_bundle` object but absent from the `profile_bundle_digest` preimage | **negative implementation fixture** — the pair is declared and unbound; the object looks complete while the digest covers nothing (A17’s own defect) | `implementation_regression_fixtures` |
| S4.43 | authority or signature profile swapped after anchoring (A19)                                               | **reject** — `profile_bundle_digest` mismatch                                                                                                        | `evidence_attack_fixtures`           |
| S4.44 | `profile_bundle` preimage covers a pair the object omits (the S4.42 mirror)                                | **negative implementation fixture** — object and preimage must cover the same pairs in both directions                                               | `implementation_regression_fixtures` |
| S4.45 | same twenty-three pairs, different order in object versus preimage                                         | **negative implementation fixture** — order is frozen; two orderings would be two canonical forms                                                    | `implementation_regression_fixtures` |
| S4.46 | duplicate profile name in the bundle                                                                       | **reject** — one profile, one pair; a duplicate has no defined winner                                                                                | `evidence_attack_fixtures`           |
| S4.47 | the same semantic profile pinned twice under an alias ID                                                   | **reject** — the §4.4 no-alias rule; two IDs for one digest revive the local-support question                                                        | `evidence_attack_fixtures`           |
| S4.48 | unknown extra profile appended to the bundle                                                               | **reject** — exact-key schema; unknown fields never validate                                                                                         | `evidence_attack_fixtures`           |
| S4.49 | a Section 6 profile omitted from the bundle                                                                | **reject** — twenty-three pairs mandatory; an absent pin is an unbound construction                                                                  | `evidence_attack_fixtures`           |
| S4.50 | profile field present as `null` versus omitted                                                             | **reject both, identically** — §4.7's constant rule: absence and disabled must not be confusable                                                     | `evidence_attack_fixtures`           |
| S4.51 | digest presented as a byte array rather than 64 lowercase hex                                              | **reject** — one encoding (§3.4); a second representation is a second canonical form                                                                 | `evidence_attack_fixtures`           |
| S4.52 | old seven-pair `profile_bundle_digest` presented with the current twenty-three-pair object                 | **reject** — recomputation mismatch; this is A17's defect class presented as evidence                                                                | `evidence_attack_fixtures`           |
| S4.53 | correct new `profile_bundle_digest` with a stale `scope_vector_digest`                                     | **reject** — the bundle is inside the scope vector; a stale vector cannot survive a bundle change                                                    | `evidence_attack_fixtures`           |
| S4.54 | correct new `scope_vector_digest` with a stale authorisation or anchor                                     | **reject** — the scope vector is inside the precommitment, which the message and anchor bind                                                         | `evidence_attack_fixtures`           |
| S4.55 | old `leaf_value`/`merkle_root` retained across a bundle change                                             | **ACCEPT** — the frontier fixture; leaves bind no `profile_bundle_digest`, so their survival is legitimate and must not be reported as staleness     | `implementation_regression_fixtures` |
| S4.56 | `stage4t_package_adapter_profile` altered without moving every profile-bound descendant                    | **reject** — the bundle digest moves, so the scope vector and precommitment must move with it                                                        | `evidence_attack_fixtures`           |
| S4.57 | cross-epoch replay of an old profile bundle                                                                | **reject** — `epoch_digest` and `profile_bundle_digest` are independent inputs to the scope vector; both are checked                                 | `evidence_attack_fixtures`           |

**Fixture IDs are stable identifiers, not positions.** S4.35 is numbered above the §4.11.1 boundary block because S4.26–S4.34 were assigned at the Section 4 freeze; renumbering an assigned fixture to make a table read tidily would break every reference to it. The tables group by kind, and the IDs stay put.

**S4.53 and S4.55 are the propagation-frontier pair, and they are a `paired_enforcement_fixtures` case.** They assert opposite verdicts on the same event — a profile-bundle change — and both must hold: a stale `scope_vector_digest` **rejects** because the bundle is inside it, while an unchanged `leaf_value`/`merkle_root` **accepts** because leaves bind no `profile_bundle_digest` at all (§3.2). A verifier that invalidates the leaf vector on a bundle change is not being careful, it is being wrong, and it would force a full re-salting of every universe for a schema pin that never touched them. The frontier is a measured fact about the digest graph, not a convention: **leaf and root survival is legitimate; scope-vector survival is not.**

**S4.3, S4.18, and S4.25 join S3.2 and S3.14 as guards against our own implementation** — with S4.11.1's S4.34, six fixtures now assert that a verifier built the wrong way fails the suite. S4.3 is the sharpest: a verifier that politely sorts a malformed vector and calls it canonical is laundering with excellent manners.

#### 4.11.1 Boundary fixtures for the pinned limits

A pinned limit that is never exercised at its boundary is an untested claim. Each row names the §4.9 category it belongs to — as **every** fixture row in this specification now does (A23) — because these fixtures deliberately span three classes:

| ID    | Fixture                                             | Expected result                                                                              | §4.9 category                        |
| ----- | --------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------ |
| S4.26 | `scope_cardinality_at_limit` (`N = 65536`)          | **accept**                                                                                   | `accepted_blindness_fixtures`        |
| S4.27 | `scope_cardinality_limit_plus_one` (`N = 65537`)    | **reject before leaf-vector allocation**                                                     | `evidence_attack_fixtures`           |
| S4.28 | `transport_bytes_at_limit`                          | **continue** to lexical and schema validation                                                | `accepted_blindness_fixtures`        |
| S4.29 | `transport_bytes_limit_plus_one`                    | **reject before parsing**                                                                    | `evidence_attack_fixtures`           |
| S4.30 | `canonical_manifest_at_limit`                       | **accept**                                                                                   | `accepted_blindness_fixtures`        |
| S4.31 | `canonical_manifest_limit_plus_one`                 | **reject**                                                                                   | `evidence_attack_fixtures`           |
| S4.32 | `minified_and_pretty_same_manifest`                 | **identical semantic verdict** and **identical canonical digest**                            | `paired_enforcement_fixtures`        |
| S4.33 | `pretty_manifest_over_transport_limit`              | **transport rejection**, with **no claim** that the underlying canonical artifact is invalid | `evidence_attack_fixtures`           |
| S4.34 | `local_verifier_cannot_process_in_profile_artifact` | **implementation non-conformance** — **not** an evidence-invalid raw code                    | `implementation_regression_fixtures` |

**S4.27 and S4.29 assert ordering, not merely outcome.** "Reject" is not enough: a verifier that allocates the vector and _then_ rejects has already lost. These two fixtures fail unless the rejection precedes the allocation they guard — the §4.1.1 ordering rule, made falsifiable.

**S4.33 is the whitespace bug's fixture.** A pretty-printed manifest exceeding the transport cap is rejected as a **resource event**, not as an evidence verdict. The verifier must not report the canonical artifact as invalid, because it is not: minified, the same logical manifest passes, and both forms commit to byte-identical digests. Conflating the two would reintroduce exactly the formatting-dependent semantics §4.1.1 exists to prevent.

**S4.34 draws the line the other four cannot.** A conforming artifact inside the pinned profile does not become hostile because one verifier exhausted memory. That verifier is resource-incapable or non-conforming; the artifact has not failed the cryptographic contract, and no Stage 5O raw code may say it did. This is the direct fixture-level consequence of pinning `2^16` on unmeasured-runtime grounds: the limit is a promise about artifacts, never a promise that every runtime keeps up.

### Section 4 freeze gate

| Gate                                                                                      | Status                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Array position authoritative; producer indices checked, not trusted                       | ✅ 4.2 — `expected_index = array position`; `declared_index` mandatory, non-authoritative; S4.2                                                                                                                                                                                                                                                                                        |
| The verifier never sorts an invalid leaf vector into validity                             | ✅ 4.2 — reject-never-repair; S4.3 negative implementation fixture                                                                                                                                                                                                                                                                                                                     |
| `leaf_id` has one exact meaning                                                           | ✅ 4.3 — `leaf_id_i = leaf_value_i`, defined solely by 3.2                                                                                                                                                                                                                                                                                                                             |
| Duplicate public leaf identities reject                                                   | ✅ 4.3 — and explicitly does **not** detect T3.2; S4.5                                                                                                                                                                                                                                                                                                                                 |
| Profile IDs and digests both covered — no separate local "is this ID supported?" question | ✅ 4.4 — all forty-six fields inside `profile_bundle_digest` (twenty-three pairs, A9 + A17 + A19 + A28); S4.10, S4.13, S4.35                                                                                                                                                                                                                                                           |
| **The bundle OBJECT and the digest PREIMAGE cover the same pairs, in the same order**     | ✅ 4.4 — machine-checked, not maintained by hand; A17 shipped seven pairs in the object and none in the preimage, leaving every Section 6 profile declared-but-unbound; S4.42                                                                                                                                                                                                          |
| **The authority and signature profiles are pinned in the bundle, not beside it (A19)**    | ✅ 4.4, 4.7.1 — `producer_authority_schema`, `producer_signature_profile`, `closure_authorization_schema`; the descriptor’s copies are declared and non-authoritative, so no descriptor/bundle disagreement can arise                                                                                                                                                                  |
| **Execution and result object schemas bound BEFORE anchoring (A9)**                       | ✅ 4.4 — `execution_object_schema` and `result_object_schema` pairs inside `profile_bundle_digest`; Section 5 may not introduce a schema the precommitment never covered; S4.35                                                                                                                                                                                                        |
| Approved combination cannot drift with the local verifier                                 | ✅ 4.4 — v1 "supported" == exact equality with `STAGE5O_V1_PROFILE_BUNDLE_DIGEST`; S4.11, S4.12                                                                                                                                                                                                                                                                                        |
| Epoch digest derived, not trusted                                                         | ✅ 4.5 — recomputed from descriptor, recomputed value used; S4.8                                                                                                                                                                                                                                                                                                                       |
| `N`, epoch, profile bundle, root all inside `scope_vector_digest`                         | ✅ 4.6 — plus fourfold `N` redundancy; S4.1, S4.7, S4.9                                                                                                                                                                                                                                                                                                                                |
| Predicate, challenge, beacon, disclosure policies inside the final precommitment          | ✅ 4.7 — all slots mandatory; `NO_RELATIONAL_PREDICATE_DIGEST` constant, never null; S4.15–S4.17                                                                                                                                                                                                                                                                                       |
| **The precommitment binds a producer AUTHORITY, not only a scope and rules (A18)**        | ✅ 4.7.1, 4.7.2 — `producer_authority_digest` bound immediately after `scope_vector_digest`, before the policy slots; authority is not a policy; S4.36                                                                                                                                                                                                                                 |
| **The signature profile is pinned, not conventional (A18)**                               | ✅ 4.7.1 — `simurgh.vsc.producer_signature.ed25519.v1` minted: no `signature_profile_id`/`_digest` exists anywhere in the repo; Ed25519 pure, 32 raw key bytes, 64 raw signature bytes, strict verification, no negotiation; S4.39, S4.40                                                                                                                                              |
| **Signed messages are exact domain-separated bytes, never `canonicalJson` output (A18)**  | ✅ 4.7.1 — the house helper signs `canonicalBytes`; Stage 5O diverges deliberately, closing the §3.1 seam at the signature layer                                                                                                                                                                                                                                                       |
| **The public key has exactly one canonical representation (A18)**                         | ✅ 4.7.1 — 32 raw bytes, externally 64 lowercase hex; SPKI-PEM rejected as a presentation with many valid encodings; S4.38                                                                                                                                                                                                                                                             |
| **The authoritative key comes from the precommitment, never from a signed object (A18)**  | ✅ 4.7.1 — §3.1 authority rule, seventh costume: a key-shaped field acquires no authority by being correctly shaped                                                                                                                                                                                                                                                                    |
| **Key identity and custody are NOT claimed (A18)**                                        | ✅ 4.10 — `not_proof_of_real_world_producer_identity`, `not_proof_of_exclusive_or_uncompromised_producer_key_control`; both permanent; I7 remains open                                                                                                                                                                                                                                 |
| **Section 6** required to anchor the **final precommitment digest**                       | ✅ 4.7 — anchoring root or scope digest MUST fail; S4.18                                                                                                                                                                                                                                                                                                                               |
| Every schema array has declared sequence-or-set semantics                                 | ✅ 4.8 — undeclared paths fail validation; S4.19–S4.22, S4.25                                                                                                                                                                                                                                                                                                                          |
| **Array-semantics registry is bound into `case_schema_digest`, not inferred at runtime**  | ✅ 4.8 — JSON Pointer paths; every reachable path exactly once; no name/value inference; set compare = unsigned UTF-8 byte order                                                                                                                                                                                                                                                       |
| Public and private fields stated explicitly                                               | ✅ 4.1 — table; root-only manifest invalid; S4.14                                                                                                                                                                                                                                                                                                                                      |
| **Transport limits separated from canonical artifact limits**                             | ✅ 4.1.1 — raw caps are a preflight resource guard; canonical caps decide acceptance, so a verdict cannot depend on whitespace                                                                                                                                                                                                                                                         |
| **Operational limits carry pinned v1 VALUES, owned by the commitment profile**            | ✅ 4.1.1 — five constants FROZEN as exact decimal strings (`MiB = 2^20` stated); covered by `commitment_profile_digest`; `MAX_CASE_BYTES` pinned in the same artifact; bounded/streaming input path before allocation                                                                                                                                                                  |
| **Pinned limits cannot contradict one another — proven, not sampled**                     | ✅ 4.1.1 — limit-compatibility invariant derived from the frozen canonical schema; closed-form (leaf vector exact in `N`); worst case 6,810,273 <= 8,388,608 bytes, 1,578,335 B (1.505 MiB) headroom, recomputed at A9, A11, A17, A18, A19, generator-derived at A27 and regenerated at A28; canonical <= transport                                                                    |
| **The cardinality ceiling is justified by runtime, not byte fit**                         | ✅ 4.1.1 — `2^16` frozen (A11); the former `2^18` counted the manifest only and understated the public core 6.6x (173.2 MiB, 90% of the 192 MiB cap rejected at `2^20`); larger cardinality = new profile after streaming + 3-runtime + measured boundary runs                                                                                                                         |
| **Sizing counts ALL public objects, not the manifest alone (A11)**                        | ✅ 4.1.1 — public canonical core 45,193,049 B (43.099 MiB) = manifest 6,810,273 (A28, generator-derived) + exec census 19,191,389 + result census 19,191,387; stated as an evidence footprint, never a heap bound                                                                                                                                                                      |
| **Census-specific limits owned by Section 5, bound by the existing profile**              | ✅ 4.1.1, 5.2.2 — four exact constants inside the `commitment_profile` preimage already covered by `commitment_profile_digest`; no new bundle field, no A9 rework                                                                                                                                                                                                                      |
| **Every pinned limit is exercised at its boundary, both sides**                           | ✅ 4.11.1 — S4.26–S4.33; at-limit accepts and limit-plus-one rejects; S4.27/S4.29 assert rejection ORDER, not merely outcome                                                                                                                                                                                                                                                           |
| **A resource-incapable verifier is never reported as invalid evidence**                   | ✅ 4.11.1, 4.10 — S4.34 is `implementation_regression_fixtures`; `not_proof_that_every_conforming_verifier_can_process_a_profile_conforming_artifact`                                                                                                                                                                                                                                  |
| **Opening-bundle resource bounds are NOT claimed by this section**                        | ✅ 4.1.1, 4.10 — `MAX_CASE_BYTES` bounds one canonical case only; the gap is the fail-closed requirement `section_8_opening_bundle_resource_limits`, not a permanent ceiling (A8)                                                                                                                                                                                                      |
| **Temporary cross-section dependencies are requirements, never non-claims (A8)**          | ✅ 4.10, §1 — `required_later_bindings` ledger: one owner, one permitted discharger, unresolved → release REJECT; discharge requires named bytes inside `disclosure_policy_digest`, never prose                                                                                                                                                                                        |
| **Manifest transport contract frozen (UTF-8, no BOM, lexical duplicate-key rejection)**   | ✅ 4.1.1 — the §3.3.1 rules apply to the manifest itself, not only to case payloads                                                                                                                                                                                                                                                                                                    |
| **Profile-tuple approval itself pinned; cannot drift with the local verifier**            | ✅ 4.4 — v1 accepts exactly one `STAGE5O_V1_PROFILE_TUPLE`, no registry; registry form deferred with its digest bound into `profile_bundle_digest`                                                                                                                                                                                                                                     |
| **Vector and path membership use the same authoritative leaf, index, `N`, root**          | ✅ 4.3.1 — five shared authoritative values; path stated as redundant-but-required; split-brain forbidden                                                                                                                                                                                                                                                                              |
| **Full vs selective verifier verdict scope frozen**                                       | ✅ 4.3.1 — a selective verifier MUST NOT claim whole-vector validity, No Hidden Shrinkage, or the full acceptance verdict                                                                                                                                                                                                                                                              |
| **Epoch guarantee is LOCAL only; no duplicate-epoch check is claimed**                    | ✅ 4.5, 4.10 — Section 4 defines no campaign-history object, so no same-history check exists; `not_proof_of_global_epoch_uniqueness_without_complete_campaign_history`                                                                                                                                                                                                                 |
| **Every digest is an exact byte construction, not symbolic notation**                     | ✅ 4.4–4.7 — four ASCII domain constants pinned; field order frozen; variable text `u16be`-framed; every `bytes32` = lowercase 64-hex                                                                                                                                                                                                                                                  |
| **`schema_version` is bound and non-authoritative**                                       | ✅ 4.4 — `manifest_schema_id`+`manifest_schema_digest` inside `profile_bundle_digest`; declared version must equal the pinned expected value                                                                                                                                                                                                                                           |
| **Digest derivation acyclic; all declared digests recomputed**                            | ✅ 4.7.3 — DAG stated; no self-containing digest; no whole-manifest shortcut; declared digests non-authoritative                                                                                                                                                                                                                                                                       |
| **Fixture raw-code taxonomy is non-contradictory**                                        | ✅ 4.9 — blindness fixtures verify raw `0`; a non-zero code attaches to an OMITTED ceiling, never to the valid fixture                                                                                                                                                                                                                                                                 |
| **Implementation-regression fixtures are non-raw-code-bearing**                           | ✅ 4.9 — **five**-class taxonomy frozen (A23); membership is **derived from the per-row class declarations, never hand-listed** — the census that stood here asserted six while the prose asserted five and the matrices held neither; `MAX_CANONICAL_LEAF_ENTRY_BYTES` classified here — it cannot fire on schema-valid input; must execute **before** the raw-code matrix is trusted |
| `section_4.added_non_claims` declared                                                     | ✅ 4.10 — four permanent ceilings: global epoch uniqueness, verifier capacity, real-world producer identity (A18), exclusive/uncompromised key control (A18)                                                                                                                                                                                                                           |
| `section_4.required_later_bindings` declared (A8)                                         | ✅ 4.10 — **two** requirements: `section_8_opening_bundle_resource_limits` (discharger 8) and `section_10_evidence_attack_raw_code_allocation` (discharger 10, A24); both `PENDING`, both release-blocking                                                                                                                                                                             |
| **The requirement ledger has ONE canonical grammar (A20)**                                | ✅ 4.10 — exactly four fields, fixed order; release consequence and exactly-one-discharger are ledger SEMANTICS, stated once, never per record; S6.37–S6.44                                                                                                                                                                                                                            |
| **A field that restates a global rule per record is a second home for it (A20)**          | ✅ 4.10 — `unresolved at release:` was derivable from `status: PENDING`; when a restatement drifts from its rule, nothing defines which wins                                                                                                                                                                                                                                           |
| No raw `420+` codes allocated                                                             | ✅ none in this section                                                                                                                                                                                                                                                                                                                                                                |

---

## Section 5 — Indexed-universe equality objects

**Status:** draft, under review. Scope: the exact objects the equality law is read from, and nothing else. Section 5 defines **no anchoring** (Section 6) and **no beacon selection** (Section 7). Where this section says "anchored", it refers to a fact Section 4 already froze, never to a mechanism Section 5 introduces.

**Preflight (A9).** `profile_bundle_digest` covers `execution_object_schema_id`/`_digest` and `result_object_schema_id`/`_digest`. Both schemas are bound **before** `stage5o_precommitment_digest` is anchored, so no object defined here has a producer-selectable shape. Section 5 could not have been written honestly without A9: it would have anchored the shape of the argument rather than the argument.

### 5.1 Scope is not redefined — it is projected

```text
S[i] = scope_manifest.leaf_entries[i]          // §4.2, authoritative
```

Section 5 creates **no second scope object**. The committed universe has exactly one home (§4.1), and a duplicate carrying its own cardinality or its own leaf vector would be a second authority that could disagree with the first. Every equality below reads `S` through this projection.

This is the §4.3.1 no-split-brain rule applied one artifact outward: two objects that both believe they know the scope will eventually disagree, and the verifier that trusts whichever it read last has laundered the disagreement.

### 5.2 The two new public objects

```text
execution_record_census = {
  schema_id,
  schema_digest,
  stage5o_precommitment_digest,
  epoch_digest,
  cardinality,
  entries,                          // sequence, exactly N rows
  execution_record_census_digest
}

execution_entry_i = {
  declared_index,
  scope_leaf_id,
  case_link_commitment,             // A-ruling: names what the bytes prove
  execution_record_digest
}
```

```text
reported_result_census = {
  schema_id,
  schema_digest,
  stage5o_precommitment_digest,
  epoch_digest,
  cardinality,
  entries,                          // sequence, exactly N rows
  reported_reported_result_census_digest
}

result_entry_i = {
  declared_index,
  scope_leaf_id,
  execution_entry_digest,
  result_payload_digest
}
```

Both objects are **public**. Neither reveals a case payload, a salt, or an opening preimage: every field is an identifier or a digest, so the censuses are publishable at commitment scale without touching the hiding property Section 3 exists to provide.

`entries` is declared **`sequence`** in the §4.8 array-semantics registry, bound into `execution_object_schema_digest` and `result_object_schema_digest` respectively. It is not a set: reordering rows is a different universe, not the same universe written differently.

#### 5.2.1 Pinned schema IDs (frozen)

```text
EXECUTION_RECORD_CENSUS_SCHEMA_ID = ASCII "simurgh.vsc.execution_record_census.v1"    // 38 bytes
REPORTED_RESULT_CENSUS_SCHEMA_ID  = ASCII "simurgh.vsc.reported_result_census.v1"     // 37 bytes
```

```text
- ASCII bytes exactly as written; lowercase; case-sensitive
- no aliases, no trailing NUL, no whitespace, no Unicode lookalikes
- declared schema_id is MANDATORY but NON-AUTHORITATIVE
- declared schema_id MUST equal the pinned constant
- schema_id is included in the exact census-digest preimage (§5.5)
- the schema artifact itself records the same pinned ID
```

**"Supported schema ID" is not a local-verifier judgement.** For Stage 5O v1, support means exact equality with the pinned constant **and** a matching pinned schema digest — the §4.4 collapse, applied here so the ID question cannot exist as a separate local decision that drifts between binaries.

**Pinning the IDs is what makes §5.2.2's maxima exact.** Left bounded only by §4.4's `1 <= len <= 2^16 - 1`, each derived maximum would carry **65,497 bytes of hypothetical schema ID** — an "exact" constant that is 64 KiB of a string nobody will ever send.

#### 5.2.2 Operational limits — owned by Section 5, bound by the existing profile

The four constants live inside the exact `commitment_profile` preimage already covered by `commitment_profile_digest` (§4.4), so they are precommitted without any new bundle field and without reworking A9. They are pinned **separately per census**, not as one generic pair: the two schemas may diverge in a future profile, and a shared constant would silently couple them.

```text
MAX_EXECUTION_CENSUS_CANONICAL_BYTES = "<derived>"      // exact, §5.2.3
MAX_EXECUTION_CENSUS_TRANSPORT_BYTES = "33554432"       // 32 MiB
MAX_RESULT_CENSUS_CANONICAL_BYTES    = "<derived>"      // exact, §5.2.3
MAX_RESULT_CENSUS_TRANSPORT_BYTES    = "33554432"       // 32 MiB
```

Transport is checked **before parsing or full allocation**; canonical decides acceptance. A pretty-printed but otherwise valid census may be rejected at the transport layer **without implying its underlying canonical object is cryptographically invalid** — §4.1.1's distinction, and S4.33's lesson, carried to the new objects.

#### 5.2.3 The maxima are derived, and `canonical = derived maximum`

Every width in both schemas is determined: exact-key schemas, no optional fields, no extension fields, fixed-width lowercase-hex digests, canonical decimal indices, an exact `N`-bound entry count, and — post-§5.2.1 — no producer-variable-width string anywhere. **If any producer-variable-width field remained, this equality would be false and the constant would have to be a bound instead.** None remains.

The constants are therefore set **equal to their derived maxima at `N = MAX_SCOPE_CARDINALITY`**. Spare headroom would buy nothing: a schema change requires a new schema digest and a new profile regardless.

```text
maxExecutionCensusBytes(N = 65536, pinned execution schema, pinned IDs, fixed digest encodings)
  <= MAX_EXECUTION_CENSUS_CANONICAL_BYTES

maxResultCensusBytes(N = 65536, pinned result schema, pinned IDs, fixed digest encodings)
  <= MAX_RESULT_CENSUS_CANONICAL_BYTES

MAX_*_CENSUS_CANONICAL_BYTES <= MAX_*_CENSUS_TRANSPORT_BYTES
```

**A canonical overflow is therefore unreachable by a producer.** At a valid `N` under the pinned schema, a larger canonical census is impossible; a verifier that sees one has accepted a field, a width, or a cardinality it was required to reject earlier. That fixture is an **`implementation_regression_fixtures`** case, exactly the character of `MAX_CANONICAL_LEAF_ENTRY_BYTES` (§4.9) — not a producer raw code.

#### 5.2.4 No object contains a digest derived after it is finalised (frozen)

> **Upstream objects must not contain digests that are derived only after those objects are finalised.** The execution-record and reported-result censuses are **inputs** to `census_closure_digest`, not consumers of it.

```text
census_closure_digest present inside execution_record_census   -> REJECT (unknown field)
census_closure_digest present inside reported_result_census    -> REJECT (unknown field)
census_closure_digest present inside scope_manifest            -> REJECT (unknown field)
```

This is an **evidence-schema rejection** under the exact-key rule, not an implementation-regression fixture: the field is simply not in the schema.

A closure field inside a census would provide no independent equality check, no anti-equivocation property, and no additional binding — the verifier already derives the only authoritative closure from the two **recomputed** census digests. It would be a decorative declared field that looks important because it is present. Nor would it deter equivocation: a producer wanting two closures publishes two censuses. Section 6's uniqueness relation is what prevents that (§5.9), and it discharges its requirement by anchoring an **external** closure object — never by adding self-referential ornaments to the closure's own inputs.

**`execution_record_digest` and `result_payload_digest` are opaque.** Section 5 defines exactly 32 bytes and no preimage contract for either. What produced them, whether any invocation occurred, and whether the value is right are all outside this section — see §5.7.

**`case_link_commitment` is not opaque, and its name is load-bearing.** The field this replaced was called `execution_payload_digest`, which quietly borrowed reality it had not earned — a reader infers "payload of the execution" and therefore "an execution happened". `case_link_commitment` names exactly what the bytes prove: the producer committed an association. Whether the association is true is a separate question with its own signed ceiling (§5.8).

```text
EXECUTION_CASE_LINK_DOMAIN = ASCII "simurgh.vsc.execution_case_link.v1"

case_link_commitment_i =
  SHA256(
    EXECUTION_CASE_LINK_DOMAIN ||
    case_digest_i              ||   // 32 bytes, §3.2 — HIDDEN until position i is challenged
    execution_record_digest_i       // 32 bytes
  )
```

At an opening the verifier recomputes `case_digest_i` from the opened case, reads the declared `execution_record_digest_i`, recomputes `case_link_commitment_i`, and compares it with `E[i].case_link_commitment`. This establishes a real but narrow property:

> The producer **committed** this execution-record digest as associated with this opened case digest.

It does **not** establish that the record was generated by an invocation of that case. **Binding a lie makes it stable, not true.** What the commitment buys is that the association was fixed before the challenge could be predicted, so a producer cannot select which case each record "was about" after learning which positions get opened.

### 5.3 Authority — the same rule, a third and fourth time

```text
expected_index = ARRAY POSITION

declared_index MUST equal canonicalDecimal(expected_index)
declared_index is mandatory and NON-AUTHORITATIVE

verifier MUST reject, never sort or repair
```

Reject-never-repair, identically to §4.2: out-of-order, missing, repeated, leading-zero, and sparse indices all reject, and the verifier must not sort by `declared_index`, by `scope_leaf_id`, or by anything else.

The declared object-level fields obey the same rule:

```text
declared schema_id / schema_digest        MUST equal the profile-pinned values (A9)
declared stage5o_precommitment_digest     MUST equal the VERIFIER-RECOMPUTED value (§4.7)
declared epoch_digest                     MUST equal the VERIFIER-RECOMPUTED value (§4.5)
declared cardinality                      MUST equal N from the verified scope manifest
declared execution_record_census_digest          MUST equal the recomputed projection (§5.5)
declared reported_reported_result_census_digest             MUST equal the recomputed projection (§5.5)
```

Every one is producer-declared context: it may carry information for a reader, and it acquires **no** authority by arriving in a correctly shaped field. This is §3.1's authority rule, now in its fifth and sixth costume. The rule has been violated once per section it was not explicitly restated in, which is why it is restated here rather than cross-referenced.

### 5.4 The equality — and the chain link that makes it mean something

```text
N_scope = N_execution = N_result

dom(S) = dom(E) = dom(R) = {0 .. N-1}

for every i in 0 .. N-1:

  S[i].leaf_id = E[i].scope_leaf_id = R[i].scope_leaf_id       // identity equality
  R[i].execution_entry_digest = execution_entry_digest_i        // the chain link
```

**What the chain link catches.** `execution_entry_digest_i` binds `i`, `scope_leaf_id_i`, and `execution_payload_digest_i` under a domain. `R[i]` citing position `j`'s execution entry fails, because `execution_entry_digest_j != execution_entry_digest_i` whenever `i != j` — the index is inside the preimage. That is S5.8, and it is real.

**What the chain link does NOT catch — measured, not reasoned.** The design note that motivated this link said a result payload from position `j` could otherwise be relabelled with position `i`'s leaf identity. The link does not prevent that, and neither does anything else in this section. The reason is that both payload digests are **opaque and producer-chosen**: the verifier recomputes `execution_entry_digest_i` _from whatever `E[i]` contains_, so a producer who writes position `j`'s payload into `E[i]` gets a chain link that matches perfectly.

Executed against the byte constructions above, `N = 8`, one real execution reported at every position:

```text
E[i] = { i, leaf(i), execution_payload_digest = <the single execution I actually ran> }
R[i] = { i, leaf(i), execution_entry_digest = recompute(E[i]), result_payload_digest = <its result> }

identity equality  S[i] = E[i] = R[i]  : holds at every i
chain link         R[i] -> E[i]        : holds at every i
distinct execution_entry_digests       : 8 / 8   (i is inside each preimage)
every Section 5 check as drafted       : PASSES
```

One execution, `N` reported positions, every check green. The link binds `R[i]` to `E[i]`; **nothing binds `E[i]`'s payload to case `i`**. Section 5 has no access to the case — it is hidden until challenged — so the correspondence between a position's execution and that position's _case_ is unconstrained here by construction, not by oversight.

**So what is the chain link for?** It is necessary, not sufficient, and its value is conditional on two things Section 5 does not own:

```text
the link is load-bearing ONLY IF
  (a) the census digests are anchored          -> §5.9 is OPEN; unanchored, a producer
                                                  rewrites E and R together, consistently
  (b) payloads are bound to their cases        -> §5.4.1 OPEN; unbound, content is free
```

Absent both, the link is checkable structure that no adversary needs to break. It is still correct to define it now — later sections cannot retrofit a binding into an anchored preimage — but this section must not claim it defends what it does not.

**Law 2 survives this, exactly as worded.** "The committed, executed, and reported universes are exactly equal **as indexed universes under the Stage 5O salted, position-bound identity profile**" is a claim about _identity_, and identity equality does hold deterministically over all `N`. The law was written narrowly enough to be true. The risk is entirely in the reading: "executed universe" invites a reader to assume it contains executions. §5.7 and §5.8 exist to refuse that reading.

#### 5.4.1 OPEN — the execution payload is not bound to its case

`execution_payload_digest_i` is opaque. Nothing requires it to have anything to do with the case committed at position `i`. A producer may run one case and report it `N` times, or run case `j` and report it at position `i`, and every deterministic check in this section passes.

**A design exists that closes most of it**, and it is the shape Section 3 already uses for unopened leaves:

```text
EXEC_PAYLOAD_DOMAIN = ASCII "simurgh.vsc.execution_payload.v1"

execution_payload_digest_i =
  SHA256( EXEC_PAYLOAD_DOMAIN || case_digest_i || execution_record_digest_i )
```

`case_digest_i` (§3.2) is unknown to the verifier until position `i` is challenged. At opening, the verifier learns `case_bytes_i`, recomputes `case_digest_i`, and — given `execution_record_digest_i` in the opening bundle — can check that the payload committed at position `i` really is an execution _of case `i`_.

That converts case-correspondence from **unprovable** to **sampled under PC-1**, using machinery that already exists: it is exactly the structure of `not_proof_of_unopened_leaf_preimage_conformance`, one artifact outward. Challenged positions are verified deterministically; unopened positions carry a sampled ceiling.

**This changes the object model as specified, so it is your ruling, not mine.** The trade-offs are real in both directions:

- **Adopt it** — case-correspondence becomes sampled rather than absent. Cost: `execution_payload_digest` stops being opaque, the opening bundle grows an `execution_record_digest` field (which Section 8 must size, feeding `section_8_opening_bundle_resource_limits`), and Section 5 acquires a construction whose _check_ lives in Section 8. A new non-claim is still required for unopened positions.
- **Decline it** — Section 5 stays purely structural and Stage 5O owns a permanent ceiling saying the executed universe is nominal: correct in identity, unconstrained in content. Honest, and considerably weaker than a reader will assume from the phrase "executed universe".

I recommend **adopting it**. Without some binding, "executed universe" is a label rather than a claim, and the sampling machinery to make it a claim is already built and already paid for. But the construction must be pinned **now** if at all: `execution_object_schema_digest` is inside `profile_bundle_digest` (A9), so this is not a field that can be added after anchoring.

**The redundancy is deliberate and required.** `result_entry_digest_i` binds `scope_leaf_id_i` even though `execution_entry_digest_i` already binds it. Like §4.3.1's authentication path, the redundant field is **required, not optional**: it is what lets a row be checked without first reconstructing the execution entry, and a verifier that finds the two channels disagreeing has found a defect rather than a preference.

### 5.5 Exact byte constructions — role-separated, never whole-object

```text
EXECUTION_ENTRY_DOMAIN  = ASCII "simurgh.vsc.execution_entry.v1"
RESULT_ENTRY_DOMAIN     = ASCII "simurgh.vsc.result_entry.v1"
EXECUTION_CENSUS_DOMAIN = ASCII "simurgh.vsc.execution_record_census.v1"
RESULT_CENSUS_DOMAIN    = ASCII "simurgh.vsc.reported_result_census.v1"
```

```text
execution_entry_digest_i =
  SHA256(
    EXECUTION_ENTRY_DOMAIN        ||
    stage5o_precommitment_digest  ||   // 32 bytes, VERIFIER-RECOMPUTED
    epoch_digest                  ||   // 32 bytes, VERIFIER-RECOMPUTED
    u64be(i)                      ||   // 8 bytes, ARRAY POSITION
    scope_leaf_id_i               ||   // 32 bytes, from S[i]
    case_link_commitment_i        ||   // 32 bytes
    execution_record_digest_i          // 32 bytes
  )

result_entry_digest_i =
  SHA256(
    RESULT_ENTRY_DOMAIN           ||
    stage5o_precommitment_digest  ||   // 32 bytes, VERIFIER-RECOMPUTED
    epoch_digest                  ||   // 32 bytes, VERIFIER-RECOMPUTED
    u64be(i)                      ||   // 8 bytes, ARRAY POSITION
    scope_leaf_id_i               ||   // 32 bytes, from S[i]
    execution_entry_digest_i      ||   // 32 bytes, RECOMPUTED — never the declared field
    result_payload_digest_i            // 32 bytes
  )
```

Every field after the fixed-length domain constant is fixed-width, so no length framing is required and no boundary is inferable — the §4.5 property, preserved.

**`digest(E[i])` is not `SHA256(canonicalJson(E[i]))`.** It is the field-level construction above. Hashing the serialised row would make the digest depend on the encoder and would silently re-admit every canonicalisation seam Section 3 spent its length closing. The row object is a _transport_ of the fields; the digest is over the _fields_.

**The two census digests are self-field-excluded projections:**

```text
execution_record_census_digest =
  SHA256(
    EXECUTION_CENSUS_DOMAIN       ||
    u16be(len(EXECUTION_RECORD_CENSUS_SCHEMA_ID)) || EXECUTION_RECORD_CENSUS_SCHEMA_ID ||
    stage5o_precommitment_digest  ||
    epoch_digest                  ||
    u64be(N)                      ||
    execution_entry_digest_0 || execution_entry_digest_1 || ... || execution_entry_digest_{N-1}
  )

reported_reported_result_census_digest =
  SHA256(
    RESULT_CENSUS_DOMAIN          ||
    u16be(len(REPORTED_RESULT_CENSUS_SCHEMA_ID)) || REPORTED_RESULT_CENSUS_SCHEMA_ID ||
    stage5o_precommitment_digest  ||
    epoch_digest                  ||
    u64be(N)                      ||
    result_entry_digest_0 || result_entry_digest_1 || ... || result_entry_digest_{N-1}
  )
```

The digest field is **excluded from its own preimage**, and `schema_id`/`schema_digest`/`cardinality`/`declared_index` are excluded because they are non-authoritative declarations whose authoritative sources (the pinned profile, `N`, the array position) are already bound. §4.7.3's DAG rule holds: no self-containing digest, no whole-manifest shortcut, every declared digest recomputed.

**Role separation is what stops object substitution.** An execution census and a result census over the same universe have different domain constants and different pinned schema digests, so a producer cannot present one in the other's slot even when every identity vector matches.

### 5.6 Verdict scope inherits §4.3.1 — the equality is a full-verifier claim

The equality of §5.4 quantifies over **all `N` positions** and reads three whole vectors. A bounded selective verifier does not hold them. Per §4.3.1, frozen:

```text
full verifier (holds scope vector + both censuses):
  MAY establish indexed-universe equality across all N
  MAY establish the chain link at every position

selective verifier (bounded, holds k openings and the challenged rows):
  MAY verify the challenged positions' rows and links
  MUST NOT claim indexed-universe equality
  MUST NOT claim No Hidden Shrinkage
  MUST NOT produce the Stage 5O release verdict
```

**No opening is required for the equality.** This is Section 1's Layer 1: the censuses are entirely public identifiers and digests, so identity equality and the chain link are deterministic over `N` for anyone holding the three objects — no sampling, no probability, no disclosure. The openings (Sections 7–8) establish something else entirely: that leaves are _openable_, which is PC-1's sampled claim. Conflating the two would import a probabilistic ceiling onto a deterministic check.

### 5.7 The honest boundary — "reported" is not "true"

Section 5 proves, deterministically over all `N`:

- every committed scope identity has exactly one execution row, at its own position;
- every execution identity has exactly one result row, at its own position;
- every result row is cryptographically bound to the exact execution row it claims to report;
- no row can move between positions without detection.

Section 5 does **not** prove:

- that the execution occurred in reality — already signed by `not_proof_of_real_execution`;
- that the execution payload is truthful;
- that the result payload is correct, adequate, or honestly derived.

### 5.8 `section_5.added_non_claims` and `section_5.required_later_bindings` (A3, A8)

```text
section_5.added_non_claims = [
  not_proof_of_global_census_closure_uniqueness_without_exclusion_witnesses,   // A13
  not_proof_of_real_case_execution_correspondence,
  not_proof_of_result_payload_semantic_correctness,
  not_proof_of_unopened_case_link_conformance
]

section_5.required_later_bindings = [
  section_6_anchored_presented_census_closure                                  // A13
]
```

> **`not_proof_of_result_payload_semantic_correctness`** — Stage 5O proves that each reported-result payload is positionally and cryptographically bound to the corresponding committed identity and execution entry. It does not independently establish that the reported value is substantively correct, adequate, or honestly derived. Those claims require the relevant rating, reviewer, or execution-origin evidence.

> **`not_proof_of_real_case_execution_correspondence`** — For challenged positions, Stage 5O verifies that the committed case-link digest binds the opened case digest to the declared execution-record digest. It does **not** prove that the record was generated by a real invocation of that case, that separate positions represent **distinct** invocations, or that the execution-record content is truthful.

**This ceiling and `not_proof_of_real_execution` are adjacent, not identical**, and neither replaces the other:

| Ceiling                                           | Concession                                                                                                       |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `not_proof_of_real_execution`                     | the claimed invocation may never have occurred at all                                                            |
| `not_proof_of_real_case_execution_correspondence` | an invocation or record may exist, but not arise from the committed case, or not represent a distinct invocation |

The second is what S5.9b lives under: one real invocation, `N` case-link commitments, every one committed consistently.

> **`not_proof_of_execution_payload_truthfulness` was dropped** — it was absorbed. Its two concessions ("describes work that happened", "describes it accurately") are carried by `not_proof_of_real_execution` and the truthfulness clause of `not_proof_of_real_case_execution_correspondence` respectively. Keeping it would have created a third overlapping name for facts with two homes, violating A3's one-fact-one-home rule. This is a **draft-stage removal of an unfrozen field**, not a weakening of a frozen ceiling: nothing in `section_5.added_non_claims` has ever been signed.

**A22 — the drop was announced but never executed.** This note said the field was dropped while its full definition remained live in the block above, present-tense, indistinguishable from the ceilings that are real. The name appeared in **no** `added_non_claims` in the document, so the release envelope never signed it: the spec was **defining a ceiling it does not claim**. This is A16's riddle inverted — not a name without a meaning, but a meaning without a name — and it is why the A22 gate requires equality in **both** directions rather than checking that every declaration has a definition. A22 deletes the orphaned definition. The absorption reasoning above is history and stays.

> **`not_proof_of_global_census_closure_uniqueness_without_exclusion_witnesses`** (A13) — Stage 5O proves that a **presented** census closure binds one exact execution-record/reported-result census pair, was anchored before the challenge height, and cannot be altered across audience views. It does **not** prove that no **second, unseen** closure exists for the same `closure_slot_id`. A producer may construct `closure_capsule_A` and `closure_capsule_B` for one slot and hand one to each reviewer; each capsule may be internally perfect, and Stage 4T will correctly prove that A's views match A and B's views match B. Excluding an unseen alternative requires **exclusion witnesses** — witness-quorum registration, an append-only transparency log with split-view resistance, threshold witness cosigning, or a Bitcoin single-use seal — none of which Stage 5O contains. **No verifier can infer an unseen capsule from evidence it never receives.**

**The name carries its condition**, matching `not_proof_of_complete_disclosure_history_without_committed_ledger`. It is permanent **for Stage 5O**: no Stage 5O section discharges it, and it must not be read as a promise that some later stage will. The ladder it completes:

| Layer                     | Honest guarantee                                       |
| ------------------------- | ------------------------------------------------------ |
| 5O census closure         | one exact execution/result census pair is bound        |
| 4T closure capsule        | every presented view is consistent with that closure   |
| 5O conflict fixture       | two **jointly presented** closures for one slot reject |
| future witness/seal stage | unseen alternative closures become externally excluded |

**Stage 4T is not rewritten and must not be.** Its shipped release remains historically true — one capsule, many consistent views. Stage 5O adds an **additive composition profile** (`simurgh.vsc.closure_capsule.v1`, `simurgh.vsc.closure_view_consistency.v1`) that makes 4T the **presentation-integrity shell** around the 5O closure. 4T is asked for exactly what it has, and no heading in this spec may imply otherwise.

> **`not_proof_of_unopened_case_link_conformance`** — Stage 5O verifies the execution-record case-link construction only for **challenged** positions, where the opened case supplies the authoritative `case_digest`. For **unopened** positions, it does not prove that the declared `case_link_commitment` has any valid preimage under the frozen Section 5 profile.

**This is Section 3's unopened-leaf finding, one evidence object outward, and it must stay a distinct field.** The leaf preimage at position `i` can be perfectly valid while the case link at the same position is random bytes — `not_proof_of_unopened_leaf_preimage_conformance` does not reach it. An unopened execution entry holding a meaningless `case_link_commitment` still occupies the correct index, carries the correct `scope_leaf_id`, contributes to a valid execution-census digest, is referenced correctly by `R[i]`, and passes **every** public Section 5 equality check.

**It is also distinct from the other two Section 5 ceilings**, and the three form a strict ladder of decreasing pretension:

| Ceiling                                           | The concession                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------------ |
| `not_proof_of_real_execution`                     | the invocation may never have occurred                                   |
| `not_proof_of_real_case_execution_correspondence` | a validly committed association may not reflect reality                  |
| `not_proof_of_unopened_case_link_conformance`     | an unopened association commitment may have **no valid preimage at all** |

The third is the most basic and was the last found. The first two concern whether a well-formed commitment is _true_; the third concerns whether it is a _commitment_. An unopened commitment was quietly borrowing validity from the challenged ones.

**The defect joins `J` only because A12 made it visible.** Per A12, `Q` now takes verifier-known `E[i]` and performs case-link conformance against `E[i].execution_record_digest`. Absent that amendment this ceiling would have been unbounded rather than sampled — PC-1 says nothing whatsoever about defects `Q` cannot discriminate (PC-1 clause 5).

This is what prevents **"result included" from quietly becoming "result true"** — the same failure mode as "boundary held" becoming "model safe", one abstraction layer down.

### 5.9 `section_6_anchored_presented_census_closure` — the requirement (A8, narrowed by A13)

**The gap, stated exactly.** The two census digests bind **to** `stage5o_precommitment_digest` — every row digest cites it — but are **not bound into** it, and cannot be: the scope is committed before execution runs. The direction is correct and unavoidable. The consequence is that Section 5 constrains each census's internal consistency and its binding to the committed scope, and says nothing about **how many censuses exist**. Two reported-result censuses over one precommitment, differing only in `result_payload_digest` values, both internally valid, both passing every check in §5.4 — the flattering one to reviewer A, the other to reviewer B. Two fully green stories.

That is not an auxiliary property left unproved; it undermines the reported-result object itself. **Part of it is a fail-closed requirement. Part of it is permanently outside Stage 5O, and A13 separates them** — because an earlier draft of this section asked for both under one name and could never have got it.

**A13 — what the Section 6 preflight found.** This section's first draft named the requirement `section_6_unique_census_closure` and assigned Section 6 to prove that **exactly one** closure exists per slot, by importing Stage 4T's "No Two Stories". Stage 4T's actual relation, read from its source rather than its nickname:

> "One capsule, N audience views. A view may REDACT, never CONTRADICT, and every redaction is ledgered." — `stage4t/core/viewCore.mjs`
> "No Two Stories defends 'one public story = one filing.'" — `STAGE_4T_CLOSEOUT.md`

Its subject is **a capsule root the verifier already holds**. It proves a _view_ is consistent with _the capsule it is bound to_. It is not a two-closure conflict detector, and it is certainly not an exclusion relation:

```text
asked for:   for subject = closure_slot_id, at most one census_closure_digest
             can obtain an accepted non-equivocation certificate
supplied:    for a HELD capsule root, every presented view is consistent with it
```

**"One filing has one story" is not "there is one filing."** No shipped Simurgh component supplies the exclusion property; offline, an inclusion proof shows presence and cannot show absence. Excluding an unseen conflicting closure needs a witness quorum, an append-only log with split-view resistance, or a single-use seal — none of which Stage 5O contains.

**The honest split (A13):**

```text
requirement:            section_6_anchored_presented_census_closure
owning section:         5
permitted discharger:   6
status:                 PENDING
```

**A20 normalised this block.** It was missing `status:` — the same defect §4.10 carried, found by the S6.44 parser-union removal test rather than by review — and it carried `permanent ceiling:`, a field outside the canonical vocabulary that gave `not_proof_of_global_census_closure_uniqueness_without_exclusion_witnesses` a **second home** while it already lives in `section_5.added_non_claims` above. An A3 violation inside the ledger A3 polices. The ceiling is unchanged and is stated in exactly one place.

A13 narrows the requirement and hands the residue to a **signed permanent ceiling** rather than to a section that could never discharge it. This is a genuine weakening of what §5.9 first promised, and it is recorded as one. It is **not** a limitation invented to let the release pass: the preflight established the property is unavailable to every shipped component, not merely inconvenient. The alternative — leaving an unsatisfiable requirement in the ledger — would block Stage 5O forever while proving nothing, which is not honesty, only paralysis wearing a lock.

**Naming Section 6 is legitimate because the acceptance relation is frozen here, now.** A8 forbids a promise-shaped variable; it does not forbid naming a discharger whose exact discharge contract is already specified. The following is that contract, as narrowed.

#### 5.9.1 The closure object (frozen by this requirement)

```text
CENSUS_CLOSURE_DOMAIN = ASCII "simurgh.vsc.census_closure.v1"

census_closure_digest =
  SHA256(
    CENSUS_CLOSURE_DOMAIN          ||
    stage5o_precommitment_digest   ||   // 32 bytes, VERIFIER-RECOMPUTED
    epoch_digest                   ||   // 32 bytes, VERIFIER-RECOMPUTED
    u64be(N)                       ||   // 8 bytes
    execution_record_census_digest ||   // 32 bytes
    reported_result_census_digest       // 32 bytes
  )
```

Every execution object, result object, challenge object, opening receipt, and final envelope **MUST** reference the **verifier-recomputed** closure digest. A declared copy is checked, never trusted — §3.1's rule, which by this section has been restated at every artifact boundary rather than cross-referenced, because it has been violated once per boundary where it was not.

#### 5.9.2 Discharge conditions — all of them, or the release rejects

```text
- the closure was CONSTRUCTED over fully validated censuses
- the closure was fixed BEFORE the beacon challenge height
- execution and result censuses match that closure exactly
- JOINTLY PRESENTED conflicting closures for one slot FAIL CLOSED
- within the presented package, no accepted replacement closure for a consumed slot
```

**A14 removed `every presented audience view is consistent with the closure capsule (Stage 4T)` from this list.** It is now a **separate** requirement, owned by Section 6 and discharged by **Section 12**. The Section 6 preflight established two independent reasons:

1. **A closure-only capsule is decorative.** Every closure field is public — slot ID, both census digests, precommitment, epoch. There is nothing to redact, so a 4T capsule over the closure alone admits exactly **one** substantive view, and 4T's guarantee ("a view may redact but never contradict") is satisfied trivially. Its sorted Merkle root would recommit already-committed data and add a second salt profile without adding a claim. `census_closure_digest` already does that job.
2. **A package capsule cannot exist before the challenge.** The audience-varying material 4T actually protects — openings, receipts, disclosure ledger, narrative — is produced by Sections 7 and 8, **after** the beacon. A prechallenge `challenge_subject_digest` binding a `closure_capsule_root` would be **temporally circular**: anchoring, before the challenge, a root over evidence the challenge has not yet generated. A13's design contained exactly that circularity; A14 removes it.

The architecture is therefore **two temporal layers**:

```text
BEFORE the challenge   Section 6     closure_slot_id, census_closure_digest,
                                     challenge_subject_digest — anchored, NO Stage 4T
AFTER the challenge    Sections 7-8  challenge, openings, receipts, ledger
AT evidence assembly   Section 12    Stage 4T capsule over the FULL presented package
```

The closure is the story's spine; the 4T capsule is the bookbinding around the complete edition. Binding the spine alone was a painted door with a Merkle root on it.

**A13 removed `the challenge seed BINDS census_closure_digest` from this list.** Section 6 owns closure construction, presentation integrity, and pre-challenge anchoring. **Section 7 owns beacon-seed derivation.** Section 6 cannot discharge a condition about the seed's preimage, and a contract that asked it to would have let Section 6 report completion of work belonging to another section — the same class of error as a law naming a property its mechanism does not reach. Section 6 therefore declares its own fail-closed requirement, `section_7_challenge_seed_binds_presented_census_closure`, and the release stays blocked until Section 7 proves the actual seed preimage contains the verifier-recomputed `challenge_subject_digest`. **No release requirement was removed or weakened by the rehoming; it changed owner.**

**Four properties, four required sources.** Section 6 must identify which component supplies each; **no component supplies more than it can**:

| Property                                                         | Required source                                                                    | Status                                                                      |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| fixed before challenge                                           | temporal anchor (Stage 5M quorum)                                                  | dischargeable by Section 6                                                  |
| every presented view is a redaction of one full evidence package | **Stage 4T** capsule over the ASSEMBLED package, at its real strength              | **Section 12** (A14) — the package does not exist until after the challenge |
| challenge bound to the exact story                               | seed includes `challenge_subject_digest`                                           | **Section 7** (A13 rehoming)                                                |
| **no unseen conflicting closure exists**                         | exclusion witnesses — witness quorum, split-view-resistant log, or single-use seal | **NOT AVAILABLE** → permanent ceiling                                       |

**What does not discharge it.** A producer signature alone does not. A timestamp alone does not. **Two separately valid timestamps over two conflicting closures do not** — that is the equivocation, notarised twice, and a verifier that accepts either has been shown both stories and believed the one it read first.

#### 5.9.3 Why the closure must enter the challenge seed — Section 7's obligation (A13)

Without it, a producer prepares two closures before the same block:

```text
closure_A -> reviewer A
closure_B -> reviewer B
```

Both use the same beacon height. If the closure digest influences seed derivation, each closure derives a _different_ sample — so each story is challenged on positions chosen for it. If it does not influence derivation, both stories face _one_ sample and the producer simply presents whichever census survives it. Either way the producer wins.

Binding the closure into the seed makes the sample belong to **one exact execution-and-result story**. Stage 4T then prevents that story from being altered across audiences. Neither mechanism suffices alone, and **neither makes the story singular** — that is the ceiling below, not a property either component has. The reasoning above is why Section 7 must bind `challenge_subject_digest` into the seed preimage; it is stated here because Section 5's requirement depends on it, and it is **Section 7's to discharge**, not Section 6's.

### 5.10 Section 5 attack matrix

| ID     | Attack                                                                                                  | Expected result                                                                                                                                                                                | Class                                |
| ------ | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| S5.1   | execution census has fewer or more than `N` rows                                                        | **reject** — `N_execution != N_scope`                                                                                                                                                          | `evidence_attack_fixtures`           |
| S5.2   | result census has fewer or more than `N` rows                                                           | **reject** — `N_result != N_scope`                                                                                                                                                             | `evidence_attack_fixtures`           |
| S5.3   | `declared_index` differs from array position                                                            | **reject**                                                                                                                                                                                     | `evidence_attack_fixtures`           |
| S5.4   | verifier sorts malformed rows before checking                                                           | **negative implementation fixture** — MUST fail the suite                                                                                                                                      | `implementation_regression_fixtures` |
| S5.5   | duplicate or sparse `declared_index`                                                                    | **reject**                                                                                                                                                                                     | `evidence_attack_fixtures`           |
| S5.6   | execution row cites another scope leaf                                                                  | **reject** — `E[i].scope_leaf_id != S[i].leaf_id`                                                                                                                                              | `evidence_attack_fixtures`           |
| S5.7   | result row cites another scope leaf                                                                     | **reject** — `R[i].scope_leaf_id != S[i].leaf_id`                                                                                                                                              | `evidence_attack_fixtures`           |
| S5.8   | result row cites another position's execution entry                                                     | **reject** — chain-link mismatch                                                                                                                                                               | `evidence_attack_fixtures`           |
| S5.9   | **execution/result content of case `j` reported at position `i`**                                       | **accept** + both ceilings asserted — `accepted_blindness_fixtures`, raw `0`; MEASURED, not reasoned                                                                                           | `accepted_blindness_fixtures`        |
| S5.9b  | **one real invocation reused across all `N` case-link claims**                                          | **accept** + both ceilings asserted — the case link makes each false association _stable_, not _true_                                                                                          | `accepted_blindness_fixtures`        |
| S5.10  | execution and result censuses cite different epochs                                                     | **reject** — both must equal the recomputed `epoch_digest`                                                                                                                                     | `evidence_attack_fixtures`           |
| S5.11  | census cites another precommitment                                                                      | **reject**                                                                                                                                                                                     | `evidence_attack_fixtures`           |
| S5.12  | unknown object-level or row-level field                                                                 | **reject** — exact-key schema (A9-pinned)                                                                                                                                                      | `evidence_attack_fixtures`           |
| S5.13  | decorative wrong `execution_record_census_digest`                                                       | **reject** — declared digest recomputed                                                                                                                                                        | `evidence_attack_fixtures`           |
| S5.14  | decorative wrong `reported_reported_result_census_digest`                                               | **reject** — declared digest recomputed                                                                                                                                                        | `evidence_attack_fixtures`           |
| S5.15  | execution census presented in the result census slot                                                    | **reject** — domain + pinned schema-digest separation                                                                                                                                          | `evidence_attack_fixtures`           |
| S5.16  | census declares a schema the precommitment never covered                                                | **reject** — `profile_bundle_digest` mismatch (A9; cf. S4.35)                                                                                                                                  | `evidence_attack_fixtures`           |
| S5.17  | `entries` reordered, all rows otherwise valid                                                           | **reject** — `sequence` semantics; positions are the universe                                                                                                                                  | `evidence_attack_fixtures`           |
| S5.18  | census digest computed as `SHA256(canonicalJson(object))`                                               | **negative implementation fixture** — encoder-dependent; MUST fail                                                                                                                             | `implementation_regression_fixtures` |
| S5.19  | verifier checks `R[i].execution_entry_digest` against the DECLARED field rather than the recomputed one | **negative implementation fixture** — MUST fail                                                                                                                                                | `implementation_regression_fixtures` |
| S5.20  | all identities and links match, result content is false                                                 | **accept** + `not_proof_of_result_payload_semantic_correctness` asserted                                                                                                                       | `accepted_blindness_fixtures`        |
| S5.21  | producer-signed synthetic execution rows, never executed                                                | **accept** + `not_proof_of_real_execution` asserted                                                                                                                                            | `accepted_blindness_fixtures`        |
| S5.22  | two valid reported-result censuses over one precommitment, **jointly presented**                        | **reject** once `section_6_anchored_presented_census_closure` is discharged; **release BLOCKED** until then — §5.9                                                                             | `evidence_attack_fixtures`           |
| S5.22b | two closure capsules for one slot, **one shown to each reviewer, never jointly presented**              | **accept both** + `not_proof_of_global_census_closure_uniqueness_without_exclusion_witnesses` asserted — `accepted_blindness_fixtures`, raw `0`; no verifier can infer an unseen capsule (A13) | `accepted_blindness_fixtures`        |
| S5.23  | `challenged_random_case_link` — random bytes in `case_link_commitment` at an **opened** position        | **reject** — recomputed `case_link_commitment` mismatch; joins `J` under PC-1 (A12)                                                                                                            | `paired_enforcement_fixtures`        |
| S5.24  | `unopened_random_case_link` — random bytes in `case_link_commitment` at an **unopened** position        | **accept** + `not_proof_of_unopened_case_link_conformance` asserted — `accepted_blindness_fixtures`, raw `0`                                                                                   | `paired_enforcement_fixtures`        |

**S5.9/S5.9b are `accepted_blindness_fixtures` — raw `0`, ceilings asserted.** The first draft called S5.9 "the section's reason to exist" and claimed the chain link rejected it. Executed, it passes. The case-link commitment does **not** reject it either; it merely ensures each false association was committed consistently, before the challenge was predictable. Both fixtures accept and MUST assert both ceilings:

```text
single_execution_reused_across_case_linked_claims:
  accepted
  not_proof_of_real_execution                       = present
  not_proof_of_real_case_execution_correspondence   = present
```

A fixture that asserts what its author hoped is worse than no fixture: it converts an untested belief into a green tick. Per §4.9, a blindness fixture that accepts but **omits** a required ceiling is where a non-zero code attaches — the omission is the defect, never the acceptance.

**S5.19 is the sharpest implementation trap.** `R[i].execution_entry_digest` is a declared field. A verifier that compares it to itself — reading the declared value and hashing the declared value — proves nothing while looking correct. The comparison must be against `execution_entry_digest_i` **recomputed from `E[i]`'s fields**. This is the §3.1 authority rule as a code path rather than a schema.

**S5.22 accepts, and that is the honest verdict, not a passing one.** It is recorded here rather than omitted because §5.9 is unresolved. It must be reclassified the moment §5.9 is ruled: an `accepted_blindness_fixtures` case asserting a permanent ceiling, or a fixture that a discharging section turns into a rejection.

**S5.23/S5.24 are a reject/green PAIR and must ship together.** They are the same defect at two positions, separated only by whether the beacon selected it. Shipping S5.23 alone would advertise a deterministic guarantee that exists for `k` positions out of `N`; shipping S5.24 alone would advertise a blindness the predicate does not actually have. The pair is what states the sampled boundary honestly — the §4.9 `paired_enforcement_fixtures` shape, whose reject half is real _only because A12 gave `Q` the input it needed to see it_.

**Four negative implementation fixtures** — S5.4, S5.18, S5.19, and (by inheritance) the §4.2 no-sort rule — join the six from Sections 3 and 4. `implementation_regression_fixtures` carry no `420+` codes and must execute before the raw-code first-failure matrix is trusted (§4.9).

### Section 5 freeze gate

| #   | Gate                                                                                         | Status                                                                                                                                                                                      |
| --- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Execution and result schemas bound **before** anchoring                                      | ✅ A9 — both pairs inside `profile_bundle_digest`; S5.16, S4.35                                                                                                                             |
| 2   | Scope is the Section 4 projection, not a duplicated authority                                | ✅ 5.1 — `S[i] = scope_manifest.leaf_entries[i]`; no second scope object                                                                                                                    |
| 3   | Array position authoritative in all three universes                                          | ✅ 5.3 — `expected_index = array position`; S5.3                                                                                                                                            |
| 4   | No verifier sorting or repair                                                                | ✅ 5.3 — reject-never-repair, identical to §4.2; S5.4, S5.5                                                                                                                                 |
| 5   | Equality checked entry-by-entry across all `N`                                               | ✅ 5.4 — `dom(S) = dom(E) = dom(R) = {0..N-1}`; S5.1, S5.2, S5.6, S5.7                                                                                                                      |
| 6   | Every result entry binds the exact corresponding execution-entry digest                      | ✅ 5.4, 5.5 — chain link **recomputed**, never read; S5.8, S5.19                                                                                                                            |
| 7   | Role-specific domains prevent execution/result substitution                                  | ✅ 5.5 — five domain constants; plus pinned schema IDs and digests; S5.15                                                                                                                   |
| 8   | Epoch, precommitment, cardinality match across all objects                                   | ✅ 5.3 — all verifier-recomputed, declared copies checked; S5.10, S5.11                                                                                                                     |
| 9   | Every declared digest recomputed                                                             | ✅ 5.3, 5.5 — §4.7.3 DAG holds; self-field-excluded projections; S5.13, S5.14                                                                                                               |
| 10  | Full-versus-selective verifier claims remain distinct                                        | ✅ 5.6 — equality is a full-verifier claim; selective MUST NOT claim it                                                                                                                     |
| 11  | Payload truth and execution occurrence not inferred from identity equality                   | ✅ 5.7, 5.8 — three owned ceilings + `not_proof_of_real_execution`; S5.9, S5.9b, S5.20, S5.21                                                                                               |
| 12  | **A10 committed** — Section 1 says "execution-record identities", not "executed"             | ✅ `bc742152`, atomic, precedes this freeze                                                                                                                                                 |
| 13  | **`not_proof_of_unopened_case_link_conformance` owned by Section 5**                         | ✅ 5.8 — distinct from both the leaf-preimage ceiling and the two correspondence ceilings                                                                                                   |
| 14  | **Challenged/unopened random-case-link fixtures form a reject/green pair**                   | ✅ 5.10 — S5.23 rejects, S5.24 accepts + ceiling; ship together or not at all                                                                                                               |
| 15  | **PC-1 explicitly includes the case-link check**                                             | ✅ A12 `83c7c57d` — `Q` takes verifier-known `E[i]`; without it the ceiling would be unbounded, not sampled                                                                                 |
| 16  | `case_link_commitment` inside the recomputed execution-entry digest, hence the census digest | ✅ 5.5 — entry digest preimage; census digest is over entry digests                                                                                                                         |
| 17  | Result entries use the **recomputed** execution-entry digest, never a declared copy          | ✅ 5.4, 5.5 — S5.19 fails a verifier that compares the declared field to itself                                                                                                             |
| 18  | Neither census contains `census_closure_digest`                                              | ✅ 5.2.4 — exact-key **evidence-schema rejection**, not an implementation fixture; upstream/downstream law frozen                                                                           |
| 19  | Exact schema IDs and four byte limits match the reproduced constants                         | ✅ 5.2.1, 5.2.2 — IDs 38 B / 37 B; `19191389` / `19191387` / `33554432` / `33554432`, reproduced by two independent methods                                                                 |
| 20  | Canonical-overflow impossibility classified as implementation regression                     | ✅ 5.2.3 — unreachable by a producer under the pinned schema; `MAX_CANONICAL_LEAF_ENTRY_BYTES` character                                                                                    |
| 21  | Both ledgers lexicographically canonical                                                     | ✅ 5.8 — `added_non_claims` 4 entries sorted (A13); `required_later_bindings` 1 entry                                                                                                       |
| 22  | **Stage 4T imported at its REAL strength, not its nickname**                                 | ✅ 5.9 (A13) — 4T binds views to a held capsule root; it is not an exclusion relation. `not_proof_of_global_census_closure_uniqueness_without_exclusion_witnesses` owns the residue; S5.22b |
| 23  | No `420+` raw codes allocated                                                                | ✅ none in this section                                                                                                                                                                     |

**Requirement status — declared is not discharged:**

```text
section_5.required_later_bindings declared    : PASS
section_6_anchored_presented_census_closure   : PENDING   -> release REJECTS
global closure uniqueness                     : NOT CLAIMED (permanent ceiling, A13)
```

**A green Section 5 freeze gate does NOT mean anti-equivocation exists**, and after A13 it does not mean full anti-equivocation is even coming. Section 5 has specified the shape of the lock — the closure object, its preimage, its three required sources, and what does not discharge it. Section 6 still has to manufacture the key. Until it does, `release_required_bindings` is unresolved and Stage 5O cannot release. The two statuses are displayed separately precisely so a green freeze cannot be misread as a green property.

**What this section is honest about, in one place:**

| Property                               | Status                                                         |
| -------------------------------------- | -------------------------------------------------------------- |
| `R[i] -> E[i]`                         | **Deterministic** over all `N`                                 |
| `S[i] = E[i] = R[i]` identity equality | **Deterministic** over all `N`                                 |
| `E[i] -> opened case_i` (case link)    | **Sampled** — checked only at challenged positions (PC-1, A12) |
| Real case execution                    | **Not proved anywhere in Stage 5O**                            |

Binding remains valuable. It does not alchemise records into events.

---

## Section 6 — Anchored presented census closure

**Status:** **FROZEN** — this commit. Scope: the prechallenge closure and its two anchor roles. Section 6 defines **no** beacon selection (Section 7), **no** openings (Section 8), and **no** completed Stage 4T package capsule (Section 12, A14). It **discharges** `section_6_anchored_presented_census_closure` (§5.9) and claims **no** global closure uniqueness (A13).

**Preflights (three, all run before drafting).**

1. **Seed-binding rehomed (A13).** `the challenge seed BINDS census_closure_digest` was removed from this section's discharge list. Section 7 owns beacon-seed derivation; Section 6 freezes the handoff value and declares the requirement.
2. **Capsule rehomed (A14).** `closure_capsule_root` is **absent by design**. A closure-only capsule is decorative (nothing public is redactable), and a package capsule cannot exist before the challenge that generates its contents. Section 12 owns it.
3. **Digest graph verified acyclic.** Machine-checked over the constructions below: no digest contains a value derived from itself, and `anchor_schedule_profile_digest` is a **root** with no upstream — it binds static rules only.

### 6.1 The closure slot — the singular-story key

```text
CLOSURE_SLOT_DOMAIN = ASCII "simurgh.vsc.census_closure_slot.v1"

closure_slot_id =
  SHA256(
    CLOSURE_SLOT_DOMAIN          ||
    stage5o_precommitment_digest ||   // 32 bytes, VERIFIER-RECOMPUTED
    epoch_digest                      // 32 bytes, VERIFIER-RECOMPUTED
  )
```

The slot is derived from `(precommitment, epoch)` and **nothing else**. Forbidden as slot inputs:

```text
producer-selected policy labels     reviewer identity          anchor ecology
census digests                      challenge height alone     nominal profile aliases
```

**Every one of those would let a producer mint a second nominal slot for one actual epoch**, and then equivocate without ever colliding. A slot keyed by census digest is the sharpest of them: two censuses would produce two slots, and "one closure per slot" would become true and worthless simultaneously — the slot must be the thing a story is told _about_, never the story.

### 6.2 The census closure

```text
CENSUS_CLOSURE_DOMAIN = ASCII "simurgh.vsc.census_closure.v1"

census_closure_digest =
  SHA256(
    CENSUS_CLOSURE_DOMAIN          ||
    census_closure_schema_digest   ||   // 32 bytes, profile-pinned (A17)
    stage5o_precommitment_digest   ||   // 32 bytes, VERIFIER-RECOMPUTED
    epoch_digest                   ||   // 32 bytes, VERIFIER-RECOMPUTED
    u64be(N)                       ||   // 8 bytes
    closure_slot_id                ||   // 32 bytes, VERIFIER-RECOMPUTED
    execution_record_census_digest ||   // 32 bytes, VERIFIER-RECOMPUTED
    reported_result_census_digest       // 32 bytes, VERIFIER-RECOMPUTED
  )
```

Exact-key object, every declared field mandatory and non-authoritative:

```text
census_closure = {
  schema_id, schema_digest,
  stage5o_precommitment_digest, epoch_digest, cardinality,
  closure_slot_id,
  execution_record_census_digest, reported_result_census_digest,
  census_closure_digest
}
```

#### 6.2.1 The closure acceptance lattice — three states, never one word

"Valid closure" would otherwise collapse several distinct facts into one adjective. The states are **frozen and separate**, and each names exactly what it has:

```text
closure_candidate_valid =
    exact schema passes                                       (A17-pinned)
  + both census schemas match the pinned profile pairs        (A9)
  + both census digests recompute                             (§5.5)
  + both censuses cite the same precommitment, epoch and N    (§5.3)
  + indexed-universe equality passes for ALL N                (§5.4)
  + every R[i] binds the exact RECOMPUTED E[i] digest         (§5.4, S5.19)
  + closure_slot_id recomputes                                (§6.1)
  + census_closure_digest recomputes                          (§6.2)
  + closure_authorization verifies under the precommitment-
    bound producer authority                                  (§6.2.2, A18)

closure_anchor_valid =
    closure_candidate_valid
  + the complete presented_census_closure anchor quorum validates   (§6.5)

presented_closure_accepted =
    closure_anchor_valid
  + package consistency checks pass                                 (§6.3)
```

**Nothing may be described with a state it has not reached.** A candidate-valid closure is not anchored. An anchor-valid closure is not accepted. The three-word vocabulary exists because a single "valid" would let a structurally sound but **unanchored** alternative be reported as a second accepted anchored story — which is precisely the overclaim §6.3 exists to prevent.

**The DAG stays one-way.** Neither census contains `census_closure_digest` (§5.2.4). The closure consumes the censuses; the censuses never consume the closure.

#### 6.2.2 Closure authorisation — the slot names its speaker (A18)

A18 binds `producer_authority_digest` into `stage5o_precommitment_digest`. Section 6 is where that binding does its work.

**The authorisation is detached.** It is not a field of `census_closure`, and `census_closure_digest` does not cover it. A closure is a statement of fact about two censuses; an authorisation is the claim that one specific key endorsed that statement. Folding the signature into the closure preimage would make the digest depend on the signature and the signature depend on the digest — the §4.7.3 cycle rule, one artifact downstream. Detaching it also leaves §5.2.2's census maxima untouched: **no authorisation field enters either census schema**.

```text
closure_authorization = {
  schema_id, schema_digest,
  producer_authority_digest,      // declared, non-authoritative
  stage5o_precommitment_digest,   // declared, non-authoritative
  epoch_digest,                   // declared, non-authoritative
  cardinality,                    // declared, non-authoritative
  closure_slot_id,                // declared, non-authoritative
  census_closure_digest,          // declared, non-authoritative
  signature                       // lowercase hex, exactly 128 characters
}
```

```text
CLOSURE_AUTHORIZATION_DOMAIN = ASCII "simurgh.vsc.census_closure_authorization.v1"   // 43 bytes

authorization_message =
  CLOSURE_AUTHORIZATION_DOMAIN        ||
  closure_authorization_schema_digest ||   // 32 bytes, profile-pinned
  producer_authority_digest           ||   // 32 bytes
  stage5o_precommitment_digest        ||   // 32 bytes
  epoch_digest                        ||   // 32 bytes
  u64be(N)                            ||   // 8 bytes
  closure_slot_id                     ||   // 32 bytes
  census_closure_digest                    // 32 bytes
```

Every field after the domain constant is fixed-width, so no framing is required and no boundary is inferable. **The signed message is these exact bytes** — never `canonicalJson(closure_authorization)`, never a re-encoded projection (§4.7.1).

Verifier order (frozen):

```text
1. every declared field equals the verifier's recomputed value        (§4.7.3)
2. producer_authority_digest equals the value recomputed from the
   manifest's producer_authority_descriptor  -- the AUTHORITATIVE source
3. rebuild authorization_message from RECOMPUTED values only,
   never from the envelope's declared copies
4. verify the signature under the DESCRIPTOR's public key,
   strict Ed25519, per simurgh.vsc.producer_signature.ed25519.v1
5. any failure -> UNAUTHORISED -> reject
```

**Step 3 is the load-bearing one.** A verifier that rebuilds the message from the envelope's own declared fields checks the signature against the producer's story rather than against the facts — the producer signs its own account and the check passes by construction. This is §3.1's authority rule as a code path, exactly as S5.19 is: the sibling of the trap where `R[i].execution_entry_digest` is compared to itself.

##### The foreign-closure denial of service is closed structurally, not merely detected

```text
closure_slot_id = SHA256(CLOSURE_SLOT_DOMAIN || stage5o_precommitment_digest || epoch_digest)
```

and A18 puts `producer_authority_digest` **inside** `stage5o_precommitment_digest`.

**The precise statement, and it is not an implication:**

> Under the collision-resistance assumption for the slot hash and the canonical precommitment encoding, the same `closure_slot_id` **computationally binds** the same precommitment, and therefore the same committed authority.

An earlier draft of this paragraph wrote `same slot => same precommitment => same authority`. **That is false as written.** `closure_slot_id` is a hash: equal digests do not logically prove equal preimages, and a spec that writes `=>` over a hash has quietly assumed injectivity. Stage 5O spends Section 3 refusing to let `canonicalJson` carry semantics it does not have; it may not then let SHA-256 carry a bijection it does not have either.

The DoS closure rests on **four** premises, and each is named rather than absorbed:

```text
1. collision resistance of the slot hash
2. unambiguous canonical encoding of the precommitment inputs
3. unforgeability of the authority signature (Ed25519, §4.7.1)
4. the signature covering the EXACT instance -- not merely a reusable precommitment
```

Premise 4 is the one a careless design drops. If the signed message bound only the precommitment, one valid victim signature would be transplantable across every epoch, census pair and closure sharing that precommitment — a single harvested signature authorising an unbounded family of stories. The message therefore binds `epoch_digest`, `u64be(N)`, `closure_slot_id` and `census_closure_digest`, and `census_closure_digest` transitively binds both census digests. **The signature and the slot structure work together; neither gets solo billing.**

A third party **cannot reach a victim's slot under its own key**: a different key yields a different precommitment, hence — under premises 1 and 2 — a different `closure_slot_id`, hence no conflict, two unrelated slots rather than two stories. The only route to the slot is to cite the victim's precommitment digest verbatim, which is public and freely copyable, and that leaves the attacker unable to produce a signature verifying under the key that digest commits to (premise 3).

**"Same authority" is therefore a computational consequence of the slot, not an independent premise.** It is still checked, as deliberate redundancy in the §4.6 pattern where a mismatch anywhere rejects.

### 6.3 Presented-package consistency and joint conflict evidence

**For an ordinary evidence package:**

```text
exactly one valid census_closure_digest for closure_slot_id
every package object references that same closure
every declared copy is non-authoritative and recomputed
```

**For jointly presented conflicting closures:**

```text
same closure_slot_id
different census_closure_digest
both independently closure_candidate_valid
  -> REJECT
  -> emit canonical conflict evidence (closure_conflict schema, A17)
```

Because `closure_candidate_valid` now includes authorisation (§6.2.2), **both candidates are necessarily authorised under the same precommitment-bound key** — the slot guarantees it. A closure reaching the slot without a verifying signature never becomes a candidate at all:

```text
closure for the slot whose authorisation does not verify
  -> reject as UNAUTHORISED or FOREIGN evidence
  -> emit NO producer-equivocation evidence
```

**That branch is the point of A18.** Emitting equivocation evidence against a producer on the strength of a closure they never signed would accuse the victim of the attacker's act.

**What the conflict evidence proves, exactly (A18):**

> The same precommitted cryptographic authority authorised two different census closures for one slot, and both were jointly presented.

**What it does NOT automatically prove:**

> Both stories were externally anchored or accepted.

The conflict schema therefore carries an explicit machine field:

```text
both_closures_anchor_valid : bool
  true   only when BOTH candidates independently reach closure_anchor_valid
  false  otherwise — including when one candidate is merely candidate_valid

producer_authority_digest  : bytes32
  the single authority both closures were authorised under; the claim names
  a key, never a person or an organisation (A18 ceilings, §4.10)
```

**Without that field, a structurally valid but unanchored alternative would be described as a second accepted anchored story.** A producer could then manufacture "conflict evidence" against a rival's real closure by scribbling a candidate-valid one — the conflict is real, but its severity is not what an unqualified report would imply. Emitting the conflict is honest; emitting it _as though both were anchored_ is not.

**This is conflict evidence, not exclusion, and the wording is load-bearing.** The following claims are **FORBIDDEN** in this section and anywhere downstream:

```text
"the slot is permanently consumed"      -- consumed within WHAT? no global registry exists
"the first closure globally wins"       -- no verifier observes a global first
"no retry exists anywhere"              -- Stage 5O sees one package, not the world
```

#### 6.3.1 The verifier is set-based — nothing "consumes" anything

An offline verifier holds **no mutable slot state**, so no closure — valid or invalid — can reserve, consume, or claim a slot. The algorithm is a set computation over what was presented:

```text
1. validate every presented closure candidate INDEPENDENTLY,
   INCLUDING its authorisation under the precommitment-bound key (§6.2.2)
2. collect candidate-valid closures by closure_slot_id
3. deduplicate by census_closure_digest
4. zero accepted anchored digests        -> reject: missing valid closure
5. exactly one accepted anchored digest  -> continue
6. more than one distinct candidate-valid digest for a slot -> reject: conflict
```

**An invalid candidate cannot reserve anything, because there is nothing to reserve.** An earlier draft of this section described a producer offering a deliberately invalid closure to "consume" the slot, then presenting a corrected one — and called it an evidence attack. That was wrong on the architecture: a producer may certainly supply that malicious ordering, but the defect under test is **the verifier's state machine**, not the evidence. A verifier that marks a slot consumed before full validation has invented mutable state this design does not have:

```text
verifier_marks_slot_consumed_before_full_validation
  -> implementation_regression_fixture
  -> NO 420+ evidence raw code
```

**If Stage 5O ever introduces a persistent registration service** whose slots can genuinely be consumed, that is new architecture requiring a registry schema, a state-transition proof, and a profile pin. **Nothing in this section supplies that object**, and no wording here may imply one exists.

The honest rule is **local to the presented package and its anchor evidence**: within what a verifier is shown, one slot admits one accepted closure, and a second candidate-valid one presented alongside rejects. A producer who shows closure A to reviewer A and closure B to reviewer B is **not detected** — that is A13's permanent ceiling `not_proof_of_global_census_closure_uniqueness_without_exclusion_witnesses`, and no phrasing in this section may paper over it.

### 6.4 The closure-core Stage 4T section — projection and adapter rule only

Section 6 freezes **one keyed section** and the rule for projecting it. It does **not** build a capsule (A14).

```text
regime     = "stage5o"
section_id = "census_closure"
```

payload:

```text
{
  closure_slot_id,
  census_closure_digest,
  stage5o_precommitment_digest,
  epoch_digest,
  execution_record_census_digest,
  reported_result_census_digest,
  challenge_subject_digest
}
```

**The adapter uses Stage 4T's real construction, read from its source — not a function wearing its name:**

```text
sectionKey(s)                = `${s.regime}/${s.section_id}`
sectionCommitment(s, salt)   = recordDigest({ salt, section: s })
package_capsule_root         = merkleRootSorted(section_commitments)
```

The earlier draft's `Stage4T_CapsuleRoot(flatObject)` **does not exist in Stage 4T and is deleted.** 4T's real signature is `capsuleRoot(capsule, salts)` over keyed sections; a flat-object adapter would have been a new function carrying a shipped stage's name — the same borrowing A13 caught at the claim layer, one layer down in the code.

#### 6.4.1 Why sorting is legal here and forbidden three sections earlier

This distinction must be written, not inferred. A reader who meets `merkleRootSorted` beside §4.2's "the verifier must not sort" will otherwise conclude one of them is a bug:

```text
Stage 5O scope / census entries:
  POSITIONAL SEQUENCE — position i IS the identity
  sorting FORBIDDEN (§4.2, A6)

Stage 4T evidence-package sections:
  UNIQUELY KEYED SET — semantic role is regime/section_id
  canonical sorting PERMITTED
```

Sorting destroys nothing at the package layer because **no positional claim exists there**. A section's meaning comes from its key, not its neighbours; the ordering among sections carries no information, so canonicalising it by sort is exactly the §4.8 `set` case. Inside each section every Stage 5O ordering rule survives untouched — the execution-record census remains a sequence even though the census document is one keyed capsule section.

#### 6.4.2 Salts — Lane B, and the ceiling that goes with them

**The salt profile is Section 12's, not Section 6's, and not A17's.** An earlier draft of this subsection labelled it `(profile, A17)` — an error of exactly the kind A17's ownership map exists to catch: Section 6 would have had Section 4 pin a profile for a construction A14 assigned to Section 12. Section 6 states the **requirement**; Section 12 pins the profile and owns the resulting ceiling.

```text
simurgh.vsc.package_capsule_salt.v1   (profile — pinned by SECTION 12, required here)

- one INDEPENDENTLY generated 32-byte salt per package section
- canonical lowercase-hex external encoding
- salt keyed to the exact section key
- NO deterministicSalt(key)
- NO reuse of Stage 5O leaf salts
- NO reuse across package sections
- NO silent fallback to Lane A
```

**Stage 4T's shipped default is a Lane A test convenience**, flagged in its own source: `deterministicSalt(key) = sha256(canonicalJson({seed:"stage4t-vic-salt-v1", key}))`, with the comment _"Lane B overrides with random bytes."_ It is public and recomputable by anyone. Adopting it would make the section commitments **binding but not hiding** — precisely the defect that disqualified 5K's leaf profile in this spec's opening lines.

The closure-core section is public and needs no hiding. **The reason is the later sections**: openings, receipts, and reviewer material whose redacted contents must stay hidden. A salt profile chosen for the public section and inherited by the private ones is how a hiding failure arrives quietly.

**Random-looking salts do not prove entropy**, exactly as at the leaf layer (T5.9). The section that finally owns the package capsule (Section 12) must own `not_proof_of_package_capsule_salt_entropy`. **`not_proof_of_salt_entropy` must NOT silently expand to cover a second construction** — one fact, one home; a ceiling that quietly grows to cover artifacts its author never saw is how a limitation stops meaning anything.

### 6.5 The dual-anchor schedule — two roles, one height, no mixing

Section 4's contract already requires the **scope precommitment** anchored before the challenge height (Law 1). Section 5's closure requires the **completed census story** fixed before the same height. **One anchor cannot impersonate both.**

```text
role = scope_precommitment          subject = stage5o_precommitment_digest
role = presented_census_closure     subject = challenge_subject_digest
```

Both reuse the **exact frozen Stage 5M quorum construction**, by pinned ID and digest — never by prose reference.

#### 6.5.1 The static/instance split that keeps the graph acyclic

```text
anchor_schedule_profile_digest    binds the STATIC RULE:
  roles, subject-TYPE mappings, quorum profile, timing rules, non-mixing rules

anchor instance                   binds the CONCRETE FACTS:
  one role, one subject digest, the challenge height, the receipts
```

**The `anchor_schedule_profile` also covers the anchor instance's exact-key SCHEMA.** The instance is a serialised evidence object, not merely a digest construction, so its shape must be pinned or it sits between chairs. It is covered by the schedule profile rather than receiving its own pair, because the instance's **shape is static** — only its values vary per ceremony — and that is exactly the type-versus-value line this subsection already draws:

```text
anchor_instance = {              // SHAPE pinned by anchor_schedule_profile_digest
  anchor_role,                   // enum, VALUES vary per instance
  anchor_subject_digest,
  challenge_height,
  anchor_binding_digest,
  receipts                       // sequence; each binds the recomputed anchor_binding_digest
}
```

**The profile MUST NOT include** the actual `challenge_subject_digest` value, the resulting closure-anchor receipts, or any attestation digest derived from that subject. `challenge_subject_digest` contains `anchor_schedule_profile_digest`; if the profile also contained the subject, the graph would be cyclic and neither value would be computable. The profile says _"role `presented_census_closure` uses subject type `challenge_subject_digest`"_ — a **type**, never a value.

Machine-checked: the graph is acyclic, and `anchor_schedule_profile_digest` is a **root** with no upstream.

#### 6.5.2 `anchor_binding_digest` — role separation with teeth

```text
ANCHOR_BINDING_DOMAIN = ASCII "simurgh.vsc.anchor_binding.v1"

anchor_binding_digest =
  SHA256(
    ANCHOR_BINDING_DOMAIN          ||
    anchor_schedule_profile_digest ||   // 32 bytes
    u8(anchor_role)                ||   // 1 byte, enum: 0 = scope_precommitment,
                                        //                1 = presented_census_closure
    anchor_subject_digest          ||   // 32 bytes
    u64be(challenge_height)        ||   // 8 bytes
    stage5m_quorum_profile_digest       // 32 bytes
  )
```

**Every receipt in an anchor instance MUST bind the same recomputed `anchor_binding_digest`.** This is what makes the roles non-interchangeable rather than merely differently labelled. It defeats:

```text
- scope receipts re-presented as closure receipts (different role byte -> different binding)
- receipts for another challenge height substituted in
- one ecology anchoring the scope while another quietly anchors the closure
- the schedule profile swallowing its own output
```

`anchor_role` is a **fixed-width enum byte**, not a string: a variable-width role name would need framing, and an unframed one would let `scope_precommitment` + subject `X` collide with `scope` + subject `_precommitmentX`. The domain constant is fixed-length and every following field is fixed-width, so no framing is required and no boundary is inferable — §4.5's property, preserved.

#### 6.5.3 Challenge-height authority — the crown, refused again

```text
expected_challenge_height = value from the PRECOMMITTED beacon contract

scope anchor claimed height    MUST equal expected_challenge_height
closure anchor claimed height  MUST equal expected_challenge_height
```

**Neither anchor package may introduce its own height.** A height arriving inside an anchor package is producer-declared context in a correctly shaped field — §3.1's authority rule, now in its seventh costume, and the one the beacon contract exists to refuse. Both roles read one verifier-known height that was bound before either ceremony ran.

#### 6.5.3.1 Three different times, never one word

A "before the challenge height" check must name **which** time it means. These are three distinct facts and only the second is the Law 1 property:

```text
anchor SUBMITTED before height          -- a request was sent. Proves nothing about inclusion.
anchor SUBJECT FIXED before height      -- THE LAW 1 PROPERTY. The bytes were committed and
                                           provably included below the height.
anchor PROOF became AVAILABLE after height  -- permitted. An OTS attestation upgraded after the
                                           challenge is fine PROVIDED its Bitcoin attestation
                                           proves inclusion in a block below the height.
```

**Conflating the first with the second is the whole attack.** A calendar submission before the challenge is a promise; a confirmed pre-height Bitcoin anchor is evidence. The third is not a defect at all — proof availability is a property of _when we looked_, not of _when the bytes were fixed_, and forbidding late-upgraded proofs would reject honest evidence for no gain.

#### 6.5.3.2 Which ecology proves the height relation

The Stage 5M quorum is **heterogeneous**. A Bitcoin block height cannot be compared with a TSA or Rekor wall-clock value, and Section 6 does **not** invent such a comparison:

```text
Bitcoin ecology (the ONLY seat that establishes the height relation):
  proves inclusion in block height h_anchor
  requires  h_anchor < expected_challenge_height

other Stage 5M ecologies (TSA, transparency log):
  corroborate the EXACT SAME anchor_binding_digest
  satisfy their OWN frozen validity and timing predicates, imported from 5M
  are NOT directly compared to Bitcoin height
```

**Only the Bitcoin seat is height-native**, so only it can carry a strict-inequality claim about a block height. The other seats prove that the same subject was attested under their own pinned predicates — corroboration by digest equality, which is 3W's construction and this project's established shape. Asking a TSA clock to speak Bitcoin by sheer confidence would manufacture a comparison whose error bars nobody has measured.

Timing checks are therefore role-specific but share one boundary and one height-native seat:

```text
scope_precommitment anchor       Bitcoin seat proves h_anchor < expected_challenge_height
presented_census_closure anchor  Bitcoin seat proves h_anchor < expected_challenge_height
```

**No inter-anchor ordering is invented.** Section 6 does **not** require the scope anchor to precede the closure anchor, and does **not** compare Bitcoin height against TSA or Rekor wall-clock to order the two ceremonies. Their common precommitment and common challenge-height boundary are sufficient. Manufacturing a cross-ecology comparison to establish an ordering no attack needs would import 5M/5N's hardest problem for decoration. If a later attack shows an explicit inter-anchor order buys a real property, it can be added with its own evidence; it is not assumed here.

**For the Bitcoin-native ecology**, the proof must show inclusion in a block **strictly before** the challenge block. Submission to an OpenTimestamps calendar before the challenge is **not sufficient** if the eventual Bitcoin anchor lands at or after the challenge height — a pending attestation is a promise, not an anchor.

#### 6.5.4 The Bitcoin checkpoint projection, and the witness that had authorised itself (A26)

Section 7's beacon must root in a Bitcoin chain the verifier can identify. The obvious move — read the chain context out of the existing Stage 5L `bitcoin_ots` receipt — was preflighted against shipped code **before** it was written down, and the receipt does not carry what A26 needs. Worse, what it does carry is not rooted where the design assumed.

**The measured seam.** `stage5l/core/context.mjs` admits a checkpoint witness like this:

```text
acceptedKeys       = bundle.anchor_policy.accepted_checkpoint_witness_keys
otsWitnessAccepted = acceptedKeys.includes(ce.witness_key_fingerprint)
```

`anchor_policy` is **producer-side**. It is precommitted and tamper-evident — `commitment.mjs` binds it through `anchor_policy_digest` and raw 365 rejects a mismatch — but **committed is not authoritative**. Precommitment proves _prior declaration_; it does not prove independence, honesty, or external provenance. A producer may precommit its own key, sign a fabricated checkpoint with it, and every Stage 5L check passes, because the fabricated policy **is** the committed policy. **This is §3.1's authority rule in its tenth costume**: a producer-chosen value acquiring authority by sitting in a correctly shaped, correctly committed field.

The verifier's entire pinned surface in Stage 5L is four fields — `cfg.policy_digest`, `cfg.profile`, `cfg.schema_version`, `cfg.tsa_verifier_public_key_fingerprint`. The fourth is consumed **only** by `gateIdentityPolicyDigest` (raw 375), which checks the _gate_ identity. Nothing anywhere compares it against `ce.witness_key_fingerprint`. The Lane A builder signs checkpoints with `keys.tsaverifier` and lists that same fingerprint in `accepted_checkpoint_witness_keys`, so **one key plays both roles and every test passes whether or not the link exists**. A fixture coincidence was standing in for an authority check.

**A26 does not repair this by requiring `ce.witness_key_fingerprint == cfg.tsa_verifier_public_key_fingerprint.`** That would fossilise the coincidence into the protocol and collapse two distinct trust roles — the TSA gate-identity verifier and the Stage 5L Bitcoin checkpoint witness — which merely relocates the defect. A26 mints a **distinct verifier-controlled profile**:

```text
stage5l_checkpoint_witness_profile = {
  profile_id,
  profile_digest,
  accepted_witnesses: [ { key_fingerprint, public_key, signature_algorithm } ]
}
```

**The two sets mean different things, and both are required:**

```text
anchor_policy.accepted_checkpoint_witness_keys   = producer-precommitted NARROWING constraint
cfg.stage5l_checkpoint_witness_profile           = verifier-controlled AUTHORITY root

effective_checkpoint_witness_keys =
    producer_committed_keys  ∩  verifier_pinned_keys
```

A producer **may narrow** the verifier-authorised witnesses — that preserves the genuinely useful property of committing beforehand to which witness ecology it will use. It **may never enlarge** the verifier's trusted set.

**Verification order (fail-closed at every step).**

```text
1. resolve ce.witness_key_fingerprint in the verifier-pinned witness profile   -> absent:   REJECT
2. recompute the fingerprint from the resolved public-key bytes               -> mismatch: REJECT
3. require the fingerprint in producer-committed accepted_checkpoint_witness_keys
                                                                              -> absent:   REJECT
4. verify ce.signature over the canonical Stage 5L checkpoint-evidence preimage
   using the RESOLVED VERIFIER-PINNED public key                              -> invalid:  REJECT
5. verify the Stage 5L OTS subject and receipt bindings                       -> mismatch: REJECT
6. verify double_sha256(checkpoint_header) == ce.block_hash                   -> mismatch: REJECT
7. derive checkpoint_nbits from the verified header
```

**Step 4 is load-bearing and is the reason step 2 exists.** The declared fingerprint selects a key from the _verifier's_ profile; it must never select arbitrary producer-supplied key bytes. A fingerprint that names an authorised witness while the accompanying public key hashes to something else is the whole attack in one row.

**The projection carries the authority that created it.**

```text
verified_closure_bitcoin_checkpoint = {
  network_profile_id,

  checkpoint_height,
  checkpoint_block_hash,
  checkpoint_header,
  checkpoint_nbits,

  checkpoint_witness_profile_id,
  checkpoint_witness_profile_digest,
  checkpoint_witness_key_fingerprint,

  stage5l_checkpoint_evidence_digest
}
```

The fingerprint does **not** disappear after verification. Section 7 and the assembled Section 12 package must be able to say _which_ verifier-authorised witness grounded this checkpoint; a projection that forgets its own authority evidence is a conclusion without a premise.

**Inherited Stage 5L metadata is projected separately, and is inert here.**

```text
stage5l_inherited_checkpoint_metadata = {
  observed_tip_height,
  checkpoint_inclusive_confirmations   //  = observed_tip_height - checkpoint_height + 1
}
```

Section 7 **must not** use either field to establish beacon descendant depth or chain authority. `observed_tip_height` is a **signed number with no header linking it to anything** — `prev_block` appears nowhere in Stage 5L — so it carries witness authority as an assertion and no chain authority whatsoever. Keeping it in a separate projection is what stops a header-unlinked tip number from quietly acquiring powers it never had.

**Network authority is verifier-owned.** Measured: `anchor_policy.network = "bitcoin"` — producer-supplied, and it does **not distinguish mainnet from testnet at all**. A26 ignores it for consensus authority and pins:

```text
cfg.bitcoin_network_profile_id = "simurgh.bitcoin.mainnet.header_validation.v1"
```

That verifier profile owns Bitcoin mainnet identity, `powLimit`, compact-target rules, header encoding, hash byte order, the retarget interval, and the **absence** of the testnet minimum-difficulty exception. The producer's `network` field may be compared for consistency; it may not select the profile.

**Two depth conventions, pinned separately and never merged.** Stage 5L counts **inclusive**; Stage 5O's beacon counts **descendants**. The same English word covering both is how an off-by-one becomes a disagreement about prose:

```text
STAGE5L_CHECKPOINT_DEPTH_CONVENTION = "simurgh.bitcoin.depth.inclusive_block_count.v1"
  checkpoint_inclusive_confirmations = observed_tip_height - checkpoint_height + 1
  6 inclusive confirmations = checkpoint block + 5 descendants        // inherited, NOT reinterpreted

STAGE5O_BEACON_DEPTH_CONVENTION     = "simurgh.bitcoin.depth.descendants_after_beacon.v1"
  beacon_descendant_depth = final_suffix_height - precommitted_beacon_height
  BEACON_REQUIRED_DESCENDANTS_V1 = 6 = beacon block + 6 later blocks   // no +1, never "confirmations"
```

Both identifiers are verifier/profile-pinned and are **not producer-negotiable**, so a future accidental swap is machine-visible rather than an English-language disagreement. `beacon_descendant_depth` belongs to Section 7's chain suffix and is **not** placed in the Stage 5L projection.

**The two heights stay semantically separate**, and §6.5.3 is untouched:

```text
H = challenge_height    // precommitted beacon-contract value; never introduced or changed by an anchor
A = checkpoint_height   // verifier-derived publication checkpoint; never substituted for H
```

§6.5.3's rule still reads `anchor_instance.challenge_height == precommitted H`. A26 adds a **separate derived fact**, `verified_closure_bitcoin_checkpoint.checkpoint_height == A`. No arrow is inverted, and no height is derived from an anchor.

**The checkpoint context is post-anchor evidence and never enters the anchored subject.** Binding it into `anchor_subject_digest` would create a cycle — the subject would include a checkpoint context that includes the block containing the subject. It may later bind into the canonical challenge object, `beacon_evidence_digest`, `challenge_digest`, or the Section 12 package. It must not enter the subject it confirms.

**What A26 does not buy.** After the pin, one external fact remains: the authorised witness may still be dishonest, compromised, commonly controlled, or colluding with the producer. The division is exact, and the ceiling is **not** a substitute for the mechanism:

```text
mechanism:  the signer key must be verifier-authorised
ceiling:    verifier authorisation does not prove the witness is honest,
            independent, or non-colluding
```

A ceiling alone would have been forbidden here — it would have excused an omitted authority check, which is the move this stage refused when it took the liveness cost rather than mint a height-selection pardon. The ceiling is `not_proof_of_checkpoint_witness_organizational_independence_or_non_collusion` (§6.8), minted only after all **34** existing ceilings were searched for semantic ownership and none was found to own **witness ⊥ producer**.

### 6.6 The Section 7 handoff

```text
CHALLENGE_SUBJECT_DOMAIN = ASCII "simurgh.vsc.challenge_subject.v1"

challenge_subject_digest =
  SHA256(
    CHALLENGE_SUBJECT_DOMAIN         ||
    challenge_subject_profile_digest ||   // 32 bytes, profile-pinned (A17)
    stage5o_precommitment_digest     ||   // 32 bytes
    epoch_digest                     ||   // 32 bytes
    closure_slot_id                  ||   // 32 bytes
    census_closure_digest            ||   // 32 bytes
    challenge_policy_digest          ||   // 32 bytes
    beacon_contract_digest           ||   // 32 bytes
    anchor_schedule_profile_digest        // 32 bytes
  )
```

**`closure_capsule_root` is absent, and its absence is the design (A14).** A package containing challenge results and openings cannot exist before the challenge; anchoring its root before the challenge would be temporally circular.

Section 6 **freezes** this value and **anchors** it. It does **not** claim the seed consumed it:

```text
section_6.required_later_bindings = [
  section_7_challenge_seed_binds_presented_census_closure,
  section_12_stage4t_presented_evidence_package_capsule,
  section_7_beacon_chain_roots_in_verified_closure_bitcoin_checkpoint   // A26 erratum
]
```

Section 7 discharges the first only when the **actual seed preimage** contains the verifier-recomputed `challenge_subject_digest`. Section 12 discharges the second only when the assembled package capsule exists, over a pinned section registry, with Lane-B salts. Section 7 discharges `section_7_beacon_chain_roots_in_verified_closure_bitcoin_checkpoint` only when the validated header suffix **begins at** A26's verifier-derived checkpoint projection (§6.5.4) rather than at a producer-declared copy of it.

**A26 erratum — this ledger was the register A26 forgot.** A26 emitted the canonical four-field block for its new requirement and did **not** add the name here, so the canonical grammar carried **six** requirements while the second ledger's union carried **five**. The fold's gate parsed only the four-field blocks, reported `6 declared, 6 unique, all PENDING`, and was **green over a register it never read** — A22's blind spot reproduced exactly, in the other ledger, by the amendment whose own record cites A22's lesson. **The requirement gate now derives both representations and requires equality**, because a ledger that cannot be cross-checked against its own canonical grammar is a second dialect, and §4.10 already settled that one dialect wins. The list order here is declaration-ordered, not sorted, exactly as §1's non-claims are: `release_required_bindings` is a `lexicographically_sorted_union`, so a section's internal order cannot reach the signed bytes, and appending rather than re-sorting keeps the ordinal prose above true.

This is the containment analogue at the evidence layer: downstream challenge and opening authority descends from the **unique anchored closure**, never from a producer-supplied "current census" pointer.

### 6.7 Section 6 attack matrix

**Raw-code status — declared once for the class, never per row (A24).** Every `evidence_attack_fixtures` row below expects `REJECT`. **None names a number, because no number exists**: zero raw codes are allocated in the reserved `420+` band anywhere in Stage 5O, and Section 6 does not own the allocation table. The obligation is ledgered, not painted:

```text
class:            evidence_attack_fixtures
expected_result:  REJECT
raw_code_status:  PENDING_SECTION_10
covered_by:       section_10_evidence_attack_raw_code_allocation   // §4.10, A24
```

**This is a matrix-level declaration on purpose.** Repeating `raw_code_status: PENDING_SECTION_10` on twenty-five rows would state one fact twenty-five times — a second home for a value that changes exactly once, when Section 10 discharges the requirement. A20 and A22 both cost an amendment to undo precisely that shape. The gate proves **coverage**, not repetition: every evidence-attack row in this matrix is covered by the pending requirement, and the release gate rejects while its status is `PENDING`.

| ID     | Attack                                                                                                                                                                                                    | Expected result                                                                                                                                                                                                                                                                     | Class                                |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| S6.1   | two closures for one slot, **jointly presented**                                                                                                                                                          | **reject** + canonical conflict evidence                                                                                                                                                                                                                                            | `evidence_attack_fixtures`           |
| S6.2   | same closure under two nominal policy labels                                                                                                                                                              | **same slot** — labels are not slot inputs; no second acceptance                                                                                                                                                                                                                    | `implementation_regression_fixtures` |
| S6.3   | closure cites another epoch                                                                                                                                                                               | **reject** — `closure_slot_id` recomputation fails                                                                                                                                                                                                                                  | `evidence_attack_fixtures`           |
| S6.4   | closure cites another precommitment                                                                                                                                                                       | **reject**                                                                                                                                                                                                                                                                          | `evidence_attack_fixtures`           |
| S6.5   | closure cardinality differs from the censuses                                                                                                                                                             | **reject**                                                                                                                                                                                                                                                                          | `evidence_attack_fixtures`           |
| S6.6   | execution-record census digest substituted                                                                                                                                                                | **reject**                                                                                                                                                                                                                                                                          | `evidence_attack_fixtures`           |
| S6.7   | reported-result census digest substituted                                                                                                                                                                 | **reject**                                                                                                                                                                                                                                                                          | `evidence_attack_fixtures`           |
| S6.8   | declared `census_closure_digest` trusted without recomputation                                                                                                                                            | **negative implementation fixture**                                                                                                                                                                                                                                                 | `implementation_regression_fixtures` |
| S6.9   | declared `closure_slot_id` trusted without recomputation                                                                                                                                                  | **negative implementation fixture**                                                                                                                                                                                                                                                 | `implementation_regression_fixtures` |
| S6.10  | anchor receipts split across closure A and closure B                                                                                                                                                      | **reject** — `anchor_binding_digest` mismatch                                                                                                                                                                                                                                       | `evidence_attack_fixtures`           |
| S6.11  | **scope receipts re-presented as closure receipts**                                                                                                                                                       | **reject** — role byte differs → different binding                                                                                                                                                                                                                                  | `evidence_attack_fixtures`           |
| S6.12  | closure anchored at or after the challenge height                                                                                                                                                         | **reject**                                                                                                                                                                                                                                                                          | `evidence_attack_fixtures`           |
| S6.13  | OTS calendar submission before the challenge, Bitcoin anchor lands after                                                                                                                                  | **reject** — a pending attestation is not an anchor                                                                                                                                                                                                                                 | `evidence_attack_fixtures`           |
| S6.14  | closure valid but anchor quorum incomplete                                                                                                                                                                | **fail closed**                                                                                                                                                                                                                                                                     | `evidence_attack_fixtures`           |
| S6.15  | first accepted closure later proves inconvenient                                                                                                                                                          | **epoch fails** — no replacement closure in the presented package                                                                                                                                                                                                                   | `evidence_attack_fixtures`           |
| S6.16  | **verifier marks a slot consumed before full validation**                                                                                                                                                 | **negative implementation fixture** — the verifier is set-based (§6.3.1); no mutable slot state exists to consume                                                                                                                                                                   | `implementation_regression_fixtures` |
| S6.16b | producer supplies an invalid closure first, then a corrected one, in that order                                                                                                                           | **reject the invalid; the ordering is irrelevant** — candidates validate independently; the malicious ordering is the _producer's_ input, the defect it targets is the _verifier's_                                                                                                 | `evidence_attack_fixtures`           |
| S6.17  | producer signs two closures for one slot, jointly presented                                                                                                                                               | **reject** + conflict evidence naming the shared authority — a signature is now REQUIRED (A18) but still discharges nothing on its own                                                                                                                                              | `evidence_attack_fixtures`           |
| S6.25  | third party builds a closure for the victim's slot, citing the victim's public precommitment verbatim, signed with the attacker's key (A18)                                                               | **reject as UNAUTHORISED** — **no** producer-equivocation evidence emitted; the DoS this closes                                                                                                                                                                                     | `evidence_attack_fixtures`           |
| S6.26  | closure presented with no `closure_authorization` at all (A18)                                                                                                                                            | **reject** — unauthorised; not a candidate                                                                                                                                                                                                                                          | `evidence_attack_fixtures`           |
| S6.27  | valid authorisation for closure A replayed onto closure B, same slot (A18)                                                                                                                                | **reject** — `census_closure_digest` is inside the signed message                                                                                                                                                                                                                   | `evidence_attack_fixtures`           |
| S6.28  | authorisation replayed into another epoch or precommitment (A18)                                                                                                                                          | **reject** — both are inside the signed message                                                                                                                                                                                                                                     | `evidence_attack_fixtures`           |
| S6.29  | verifier rebuilds `authorization_message` from the envelope's declared fields rather than recomputed values (A18)                                                                                         | **negative implementation fixture** — checks the signature against the producer's story, not the facts; the S5.19 trap one artifact downstream                                                                                                                                      | `implementation_regression_fixtures` |
| S6.30  | verifier takes the public key from the authorisation envelope instead of the precommitted descriptor (A18)                                                                                                | **negative implementation fixture** — any key would then verify its own signature                                                                                                                                                                                                   | `implementation_regression_fixtures` |
| S6.31  | signature accepted over `canonicalJson(closure_authorization)` rather than the exact message bytes (A18)                                                                                                  | **negative implementation fixture** — the house-helper convention; §4.7.1 diverges from it deliberately                                                                                                                                                                             | `implementation_regression_fixtures` |
| S6.32  | same authority identifier declared, different public key bytes                                                                                                                                            | **reject** — `producer_authority_digest` recomputes over the key; the identifier is declared, the key is authoritative                                                                                                                                                              | `evidence_attack_fixtures`           |
| S6.33  | victim's valid authorisation replayed against a different conflict record                                                                                                                                 | **reject** — the message binds `census_closure_digest`; there is no reusable precommitment-only signature (premise 4, §6.2.2)                                                                                                                                                       | `evidence_attack_fixtures`           |
| S6.34  | a per-census signature substituted for the required closure authorisation                                                                                                                                 | **reject** — Stage 5O defines no per-census authorisation; a signature over an unrequired object authorises nothing                                                                                                                                                                 | `evidence_attack_fixtures`           |
| S6.35  | empty, absent, or unsupported `signature_profile` in the descriptor                                                                                                                                       | **reject** — exact byte equality with the pinned ID; no negotiation, no default                                                                                                                                                                                                     | `evidence_attack_fixtures`           |
| S6.36  | **assumption-language fixture** — the document must not infer "same slot therefore same precommitment" unconditionally                                                                                    | **passes** when the text states the computational assumption and cites `hash_collision_resistance` (§1, A21); **fails** when it treats the hash as injective. **Not** an enforcement fixture: no verifier using the same hash can distinguish two colliding preimages from a digest | `assumption_language_fixtures`       |
| S6.45  | transitive edge broken: `census_closure_digest` recomputed over a different execution/result census pair than the one presented                                                                           | **reject** — the message binds the closure digest, the closure digest binds both census digests; the edge is proven, not diagrammed                                                                                                                                                 | `evidence_attack_fixtures`           |
| S6.46  | transitive edge broken: `producer_authority_digest` recomputed over a different `signature_profile_digest` than the descriptor declares                                                                   | **reject** — the message binds the authority digest, the authority digest binds the signature profile; the edge is proven, not diagrammed                                                                                                                                           | `evidence_attack_fixtures`           |
| S6.37  | summary line `NAME: PENDING` present with **no** canonical four-field block                                                                                                                               | **FAIL** — the gate parses canonical blocks only; summaries carry no authority                                                                                                                                                                                                      | `implementation_regression_fixtures` |
| S6.38  | canonical block missing `owning section`, `permitted discharger`, or `status`                                                                                                                             | **FAIL** — A8's contract requires all four                                                                                                                                                                                                                                          | `implementation_regression_fixtures` |
| S6.39  | duplicate canonical block for one requirement name                                                                                                                                                        | **FAIL** — no defined winner                                                                                                                                                                                                                                                        | `implementation_regression_fixtures` |
| S6.40  | one requirement claimed by two owning sections                                                                                                                                                            | **FAIL** — A3: one fact, one home                                                                                                                                                                                                                                                   | `implementation_regression_fixtures` |
| S6.41  | unknown `status` value                                                                                                                                                                                    | **FAIL** — closed vocabulary; an unrecognised status must never read as discharged                                                                                                                                                                                                  | `implementation_regression_fixtures` |
| S6.42  | requirement marked discharged by a section other than its permitted discharger                                                                                                                            | **FAIL** — exactly one permitted discharger                                                                                                                                                                                                                                         | `implementation_regression_fixtures` |
| S6.43  | canonical block fields presented in a different order                                                                                                                                                     | **FAIL** — field order fixed and checked; two orderings would be two canonical forms (§3.3.1's rule, one artifact downstream)                                                                                                                                                       | `implementation_regression_fixtures` |
| S6.44  | **parser-union removal test** — delete the summary parser entirely                                                                                                                                        | **the canonical parser alone must still find every requirement** — if it cannot, the ledger has two dialects and the gate decides the contract                                                                                                                                      | `implementation_regression_fixtures` |
| S6.19  | anchor package supplies its own challenge height                                                                                                                                                          | **reject** — height is verifier-known from the beacon contract                                                                                                                                                                                                                      | `evidence_attack_fixtures`           |
| S6.20  | `anchor_schedule_profile` includes the concrete `challenge_subject_digest`                                                                                                                                | **negative implementation fixture** — cyclic graph; profile binds subject **types**                                                                                                                                                                                                 | `implementation_regression_fixtures` |
| S6.22  | **hidden conflicting closure, never jointly presented**                                                                                                                                                   | **accept** + `not_proof_of_global_census_closure_uniqueness_without_exclusion_witnesses` asserted — `accepted_blindness_fixtures`, raw `0`                                                                                                                                          | `accepted_blindness_fixtures`        |
| S6.23  | closure-core section committed with `deterministicSalt(key)`                                                                                                                                              | **negative implementation fixture** — Lane A salt is public; binding, not hiding                                                                                                                                                                                                    | `implementation_regression_fixtures` |
| S6.24  | package capsule built from a flat-object adapter                                                                                                                                                          | **negative implementation fixture** — 4T's real signature is `capsuleRoot(capsule, salts)` over keyed sections                                                                                                                                                                      | `implementation_regression_fixtures` |
| S6.47  | **the measured defect, reproduced** — producer precommits its **own** witness key; checkpoint signature verifies under that key; key absent from the verifier-pinned `stage5l_checkpoint_witness_profile` | **reject** — a producer-controlled allow-list cannot confer witness authority upon itself; committed is not authoritative                                                                                                                                                           | `evidence_attack_fixtures`           |
| S6.48  | `ce.witness_key_fingerprint` names a witness present in the verifier profile, but the supplied public-key bytes hash to a **different** fingerprint                                                       | **reject** — the declared fingerprint selects a key from the verifier's profile; it must never select arbitrary producer-supplied key bytes                                                                                                                                         | `evidence_attack_fixtures`           |
| S6.49  | signer is verifier-authorised but **absent** from producer-precommitted `accepted_checkpoint_witness_keys`                                                                                                | **reject** — the effective set is the **intersection**; a producer may narrow the verifier's trusted set, never bypass its own prior declaration                                                                                                                                    | `evidence_attack_fixtures`           |
| S6.50  | signer is **both** producer-committed and verifier-authorised; canonical Stage 5L checkpoint signature valid under the resolved verifier-pinned key                                                       | **accept (authority step only)** — positive construction invariant; authority established, honesty **not** claimed (§6.8 ceiling)                                                                                                                                                   | `implementation_regression_fixtures` |
| S6.51  | witness profile constructed by reusing `cfg.tsa_verifier_public_key_fingerprint` — **even where the fixture's key bytes coincide**                                                                        | **FAIL** — profile construction rejected; the TSA gate-identity verifier and the Stage 5L Bitcoin checkpoint witness are two trust roles, and a Lane A byte coincidence must never fossilise into the protocol                                                                      | `implementation_regression_fixtures` |
| S6.52  | producer supplies `anchor_policy.network = "bitcoin"`; verifier mainnet profile **absent**                                                                                                                | **FAIL, fail-closed** — never fall back to the producer's field; `"bitcoin"` does not even distinguish mainnet from testnet                                                                                                                                                         | `implementation_regression_fixtures` |
| S6.53  | inherited Stage 5L arithmetic: `checkpoint_height` 100, `observed_tip_height` 105                                                                                                                         | **inclusive confirmations = 6, descendants = 5** — the inclusive convention is inherited verbatim and **not** reinterpreted; the same numbers mean two things under the two pinned conventions                                                                                      | `implementation_regression_fixtures` |
| S6.54  | the two depth-convention identifiers swapped, or either rendered as a bare `confirmation_depth`                                                                                                           | **FAIL** — one word covering both counts is how an off-by-one becomes a disagreement about prose; the identifiers are pinned so a swap is machine-visible                                                                                                                           | `implementation_regression_fixtures` |

**S6.1/S6.22 are the section's honest pair.** Same producer, same two closures; the only difference is whether a verifier is shown both. One rejects deterministically, one accepts with a permanent ceiling. Presenting only S6.1 would advertise anti-equivocation Stage 5O does not have.

**S6.25 is the attack A18 exists for, and it fails structurally rather than by detection.** The attacker cannot reach the slot under their own key — a different key means a different precommitment, hence a different slot. Copying the victim's public precommitment digest reaches the slot but leaves the attacker unable to sign under the key that digest commits to. The closure never becomes a candidate, so no conflict evidence naming the victim can be emitted. **Rejecting the forgery and accusing nobody are the same act.**

**S6.29–S6.31 are three ways to build the check wrong**, and they matter more than the evidence attacks around them: each one leaves a verifier that reports "authorised" for everything. S6.31 is the sharpest, because it is the shipped house convention — the wrong answer is the one the existing helper already implements.

**S6.36 is an assumption-language fixture, and it is the one fixture whose subject is a sentence.** It expects **no runtime rejection**: no verifier using the same hash can distinguish two genuine colliding preimages from a digest, so demanding enforcement would demand the impossible and quietly re-import the injectivity assumption into the test itself. What it checks is a **machine-checked prose obligation**: the document must not infer "same slot therefore same precommitment" unconditionally. It passes when the text cites `hash_collision_resistance` (§1, A21) and fails when it writes `=>` over a hash.

**S6.45 and S6.46 break each transitive edge individually.** The message binds `census_closure_digest` and `producer_authority_digest` directly; the census digests and the signature profile are bound only **through** them. That chain is sound under `hash_collision_resistance` — but "sound under an assumption" is a claim, and a claim needs a fixture. Breaking each edge separately demonstrates the binding instead of relying on a diagram-shaped assumption that the arrows hold.

**S6.44 is the ledger's version of the same idea.** This stage's worst defects have all been things that looked complete: A17's object looked complete while its digest covered nothing. A ledger readable only by the union of two parsers looks complete too. Removing the summary parser is how we find out.

**S6.16 moved classes, and the move is the lesson.** It was drafted as an evidence attack: "an invalid closure consumes the slot, then the corrected one is rejected." That sentence smuggled in mutable state the design does not have. In a set-based offline verifier no candidate consumes anything, so a producer cannot weaponise the ordering — they can only reveal a verifier that invented a state machine. S6.16 is now an `implementation_regression_fixtures` case carrying **no `420+` code**, and S6.16b records that the producer's malicious ordering is legal input with no effect. **The defect under test is ours, not theirs.**

### 6.8 Honest limits

Section 6 proves, once every gate passes:

- one accepted closure value **within the presented package and its anchor evidence**;
- that closure binds one exact execution-record/reported-result census pair, validated in full before acceptance;
- that closure was externally anchored, by the frozen 5M quorum, **strictly before** the challenge height;
- the scope precommitment was anchored under a **distinct, non-interchangeable role**;
- downstream evidence must identify that exact closure.

It does **not** prove:

- census payloads are truthful (§5.8);
- execution happened (`not_proof_of_real_execution`);
- result values are semantically correct (§5.8);
- anchor services are infallible (`not_proof_of_beacon_unbiasability_or_finality`);
- **an unseen conflicting closure is impossible** — A13's ceiling, and per that amendment's ruling it is **not** re-minted here: the field exists, is Section 5-owned, and Section 6 references it.

```text
section_6.added_non_claims = [
  not_proof_of_bitcoin_finality_beyond_pinned_checkpoint_and_confirmation_policy,
  not_proof_of_checkpoint_witness_organizational_independence_or_non_collusion,   // A26
  not_proof_of_organizational_independence_beyond_pinned_ecology_classes,
  not_proof_of_timestamp_authority_clock_key_custody_or_process_correctness,
  not_proof_of_transparency_log_global_consistency_without_witness_cosigning
]

section_6.imported_non_claims = []      // UNAVAILABLE — see §6.8.1
```

#### 6.8.1 Why these are owned here, and not imported

An earlier draft declared `section_6.added_non_claims = []` on the reasoning that anchor limitations were already owned by the Section 1 baseline. **That was wrong twice.** Section 1's `not_proof_of_beacon_unbiasability_or_finality` concerns the **beacon**'s unpredictability and finality — it says nothing about TSA, Rekor, Bitcoin, split views, service compromise, or omitted anchor evidence. And the obvious repair — importing Stage 5M's envelope — is **not available**:

```text
Stage 5M core emits:   externally_anchored (bool), ecology_independence_number (int), raw codes
Stage 5M does NOT emit: known_limitations, or any machine-readable claim envelope
```

`known_limitations` appears **nowhere** in Stage 5M — not in its core, its fixtures, or its shipped evidence. Other stages ship it as a machine field (5B, 5C), so this is not house style; 5M specifically does not. What 5M has is **excellent prose** — §1's honest core and §4's signed limitations — plus one `BROWSER_NON_CLAIM` string constant and two ad-hoc Lane C strings.

**`externally_anchored = true` is a computed state under a pinned profile, not a statement that three systems are infallible.** A consumer inheriting that boolean inherits none of 5M's prose. Under this spec's own classification, a prose-only limitation **cannot count as a machine-preserved envelope**, so Section 6 must own the fields this release actually uses.

**The original insight remains Stage 5M's**; the definitions below are faithful to its frozen text. Section 6 owns the **machine fields** because Section 6 is the first consumer to carry the anchor state into a monotone, machine-owned claim ledger.

> **`not_proof_of_bitcoin_finality_beyond_pinned_checkpoint_and_confirmation_policy`** — A valid Bitcoin or OpenTimestamps seat proves inclusion and confirmation relative to the pinned checkpoint, observed tip, and declared confirmation threshold. It does **not** prove irreversible or absolute chain finality beyond that evidence horizon. _(5M: "confirmation is relative to the frozen checkpoint and declared confirmation policy, not proof of permanent blockchain finality.")_

> **`not_proof_of_checkpoint_witness_organizational_independence_or_non_collusion`** (A26) — A26 requires the Stage 5L checkpoint signer to be resolvable in the **verifier-pinned** `stage5l_checkpoint_witness_profile` and to be **independently** precommitted by the producer, so a producer can no longer authorise its own witness. That is an **authority** check, and it is all it is. It does **not** prove the authorised witness is honest, uncompromised, organisationally separate from the producer, free of common control, or non-colluding — nor that it observed the Bitcoin chain it attests to. A verifier can pin a key; **it cannot derive institutional independence from a signature.** Distinct from `not_proof_of_organizational_independence_beyond_pinned_ecology_classes`, which bounds independence **across pinned anchor classes** (class ⊥ class) rather than between **this witness and the producer** (witness ⊥ producer) — a fact that stays live even with a single ecology. Distinct also from `not_proof_of_timestamp_authority_clock_key_custody_or_process_correctness`, whose subject is the **TSA**: borrowing that ceiling here would collapse the two trust roles at the ceiling layer exactly as reusing `cfg.tsa_verifier_public_key_fingerprint` would collapse them at the key layer, which A26 forbids.

> **`not_proof_of_organizational_independence_beyond_pinned_ecology_classes`** — `ecology_independence_number` counts distinct **verifier-pinned anchor classes**. It does **not** prove distinct organisations, operators, infrastructure, upstream dependencies, or uncorrelated compromise across those classes. _(5M: "counts independent pinned ecologies under a no-collusion assumption; not a probability, dollar cost, or bits-of-security level.")_ **This is the ceiling most likely to grow feathers**: nothing stops "three ecologies" from being read as "three institutions," and Section 6 invokes that number **twice**, once per anchor role.

> **`not_proof_of_timestamp_authority_clock_key_custody_or_process_correctness`** — A valid timestamp token proves signature, certificate-chain, and message-imprint validity under the pinned profile, together with the time **asserted by** the authority. It does **not** independently prove the authority's clock accuracy, key custody, internal process integrity, or freedom from compromise. _(5M: pinned DigiCert trust root; "does not prove that Bitcoin/Rekor/the TSA establish semantic truth.")_

> **`not_proof_of_transparency_log_global_consistency_without_witness_cosigning`** — A valid transparency-log seat proves that the entry verifies against the **presented signed checkpoint** and its inclusion evidence. Without witness cosigning or an equivalent split-view-resistance mechanism, it does **not** prove that all observers received one **globally consistent** log history. _(5M: "does not detect a log equivocating about its own tree state to different monitors — that requires witness cosigning, socket I8.")_

**"Global", not "self".** A valid Rekor inclusion proof against one signed checkpoint _does_ establish local consistency with that checkpoint; what remains unproved is that every observer received one consistent history. The narrower word would have conceded a property the seat actually has.

#### 6.8.2 Successor-work candidate — `anchor_quorum_machine_claim_envelope`

**Candidate, not a socket, and NOT a Stage 5O release prerequisite.** Section 6 states the inherited limitations in full, so blocking 5O on an upstream backfill would add delay without strengthening this release's evidence.

> **`anchor_quorum_machine_claim_envelope`** — backfill the Stage 5M quorum with a versioned, machine-readable claim-envelope schema carrying its Bitcoin-finality, transparency-log consistency, timestamp-authority, and ecology-independence ceilings through the core attestation, browser projection, portable verifier, captured evidence, and final in-toto projection. An **upstream composition-portability remediation candidate**.

Requirements, if taken:

```text
- exact claim-envelope schema ID and digest
- canonical ordered non-claim fields
- preservation through JS, Python and browser tiers
- omission or alteration FAILS CLOSED
- legacy Stage 5M evidence adapter states that no native envelope existed
- no change to externally_anchored semantics
- no claim that making limitations machine-readable CLOSES them
```

**That last line is the point.** The backfill **transports** assumptions; it does not solve Bitcoin reorganisation, Rekor split views, TSA compromise, or correlated operators. Stage 5M's quorum is useful and valid within its pinned predicates — the debt is only that its honest boundaries are **not portable as machine evidence**. Section 6 repairs this composition; the candidate repairs the road for every composition after it.

#### 6.8.3 Ceiling fixture pairs — enforced versus signed

Each ceiling carries one green fixture (what the evidence cannot prove → **signed**) and one enforcement fixture (what it does prove → **enforced**):

| Evidence condition                                    | Result                                                                                        |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Bitcoin proof meets the pinned confirmation policy    | **accept** + `not_proof_of_bitcoin_finality_beyond_pinned_checkpoint_and_confirmation_policy` |
| Bitcoin proof below required confirmations            | **reject**                                                                                    |
| Rekor entry verifies against one signed checkpoint    | **accept** + `not_proof_of_transparency_log_global_consistency_without_witness_cosigning`     |
| Rekor inclusion proof or checkpoint signature invalid | **reject**                                                                                    |
| TSA token signature, chain, and imprint all validate  | **accept** + `not_proof_of_timestamp_authority_clock_key_custody_or_process_correctness`      |
| TSA signature, chain, or imprint invalid              | **reject**                                                                                    |
| Three distinct pinned ecology classes pass            | **accept** + `not_proof_of_organizational_independence_beyond_pinned_ecology_classes`         |
| Duplicate class, or insufficient class count          | **reject**                                                                                    |

```text
what the evidence proves      -> ENFORCED
what the evidence cannot prove -> SIGNED
```

#### 6.8.4 Section 7 open-question register — candidate tests, not fixtures (A23)

**A fixture whose expected truth is unresolved is not a pending fixture. It is a candidate test, and it does not belong in a normative matrix.** Two rows were drafted as Section 6 fixtures whose expected results depend on Section 7 decisions that do not exist yet. They are removed rather than given a speculative class to satisfy census closure — **classifying a row to make the count close is the census defect A23 exists to abolish, performed one row at a time.**

| Candidate | Drafted subject                                       | Blocked on                                                                         |
| --------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `S6.18`   | two conflicting closures, each separately timestamped | whether notarisation of both branches is a Section 7 rejection or a stated ceiling |
| `S6.21`   | a challenge object referencing another closure        | Section 7's challenge-binding rule, which declares the rejection Section 6 cannot  |

Neither is a claim, a ceiling, or an obligation: **no release gate consults this register.** Each is reintroduced only once Section 7 resolves its premise, and only with the full record:

```text
fixture id
class
subject
expected result
owner
discharging section
```

**These IDs are retired, not recycled.** `S6.18` and `S6.21` are never reassigned to different subjects — A23 requires fixture IDs to be unique across every class, and an ID that silently changes meaning between drafts is the one-fact-one-home violation wearing a version number.

### Section 6 freeze gate

| #   | Gate                                                                                                         | Status                                                                                                                                                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Closure schema and all Section 6 profiles precommitted                                                       | ⚠️ **A17 pending** — the bundle pins 7 pairs; Section 6's artifacts are not yet among them                                                                                                                                           |
| 2   | Slot identity derived solely from precommitment and epoch                                                    | ✅ 6.1 — labels, reviewers, ecologies, census digests all forbidden as inputs; S6.2                                                                                                                                                  |
| 3   | Both censuses fully validate **before** closure acceptance                                                   | ✅ 6.2.1 — seven ordered steps; S6.16                                                                                                                                                                                                |
| 4   | Closure digest uses exact framed bytes                                                                       | ✅ 6.2 — domain constant + all fixed-width fields; no framing needed                                                                                                                                                                 |
| 5   | All declared digest and slot fields recomputed                                                               | ✅ 6.2 — S6.8, S6.9                                                                                                                                                                                                                  |
| 6   | Stage 4T imported at its real strength                                                                       | ✅ 6.4 — real `sectionKey`/`sectionCommitment`/`merkleRootSorted`; flat adapter deleted; S6.24                                                                                                                                       |
| 7   | One accepted closure **within the presented package**                                                        | ✅ 6.3 — "permanently consumed"/"globally wins"/"no retry anywhere" explicitly forbidden                                                                                                                                             |
| 8   | No replacement closure after failure or unfavourable results                                                 | ✅ 6.3, 6.15 — local to the package; S6.15, S6.16                                                                                                                                                                                    |
| 9   | Every anchor receipt commits the same closure and slot                                                       | ✅ 6.5.2 — `anchor_binding_digest`; S6.10                                                                                                                                                                                            |
| 10  | Closure anchored strictly before the challenge height                                                        | ✅ 6.5.3 — S6.12, S6.13                                                                                                                                                                                                              |
| 11  | Receipt mixing across roles or subjects rejects                                                              | ✅ 6.5.2 — role enum byte in the preimage; S6.11                                                                                                                                                                                     |
| 12  | Producer signatures and timestamps alone do not establish singularity                                        | ✅ 6.3, 6.8 — a signature is REQUIRED (A18) and still discharges nothing alone; S6.17, S6.18                                                                                                                                         |
| 12a | **The closure is authorised by the precommitment-bound authority (A18)**                                     | ✅ 6.2.2 — detached `closure_authorization`; authorisation is inside `closure_candidate_valid`; S6.26                                                                                                                                |
| 12b | **Authorisation is DETACHED — no census or closure schema gained a field**                                   | ✅ 6.2.2 — §5.2.2 census maxima untouched; no §4.7.3 cycle; A19 for censuses rejected as overbinding                                                                                                                                 |
| 12c | **The signed message is exact bytes, never `canonicalJson`**                                                 | ✅ 6.2.2 — fixed-width after the domain constant; S6.31                                                                                                                                                                              |
| 12d | **The message is rebuilt from RECOMPUTED values, never the envelope**                                        | ✅ 6.2.2 — else the signature checks the producer's story against itself; S6.29                                                                                                                                                      |
| 12e | **The key comes from the precommitted descriptor, never the envelope**                                       | ✅ 6.2.2 — else any key verifies its own signature; S6.30                                                                                                                                                                            |
| 12f | **A closure signed by a foreign key emits NO equivocation evidence**                                         | ✅ 6.2.2, 6.3 — rejected as UNAUTHORISED; accusing the victim of the attacker's act is forbidden; S6.25                                                                                                                              |
| 12g | **Conflict evidence names an AUTHORITY, never a person or organisation**                                     | ✅ 6.3 — `producer_authority_digest` machine field; A18's two §4.10 ceilings; I7 open                                                                                                                                                |
| 12h | Same-slot closures share one authority **computationally**, under named assumptions                          | ✅ 6.2.2 — NOT `same slot => same precommitment`; a hash is not a bijection. Four premises named: slot-hash collision resistance, canonical encoding, signature unforgeability, and the signature covering the exact instance; S6.36 |
| 12i | **The signed message binds the exact instance, not a reusable precommitment**                                | ✅ 6.2.2 — epoch, `N`, slot and `census_closure_digest` are all inside the message; otherwise one harvested victim signature would authorise an unbounded family of stories; S6.33                                                   |
| 13  | `challenge_subject_digest` frozen for Section 7                                                              | ✅ 6.6 — exact preimage; `closure_capsule_root` absent by design (A14)                                                                                                                                                               |
| 14  | Section 7 seed consumption declared **PENDING**, not discharged                                              | ✅ 6.6 — `section_7_challenge_seed_binds_presented_census_closure`                                                                                                                                                                   |
| 15  | Section 5's closure requirement discharged **only** as narrowed                                              | ✅ 6.8 — `section_6_anchored_presented_census_closure`; global uniqueness **not** claimed (A13)                                                                                                                                      |
| 16  | `section_6.added_non_claims` declared, even if empty                                                         | ✅ 6.8 — **four** fields, defined and fixture-backed; lexicographic                                                                                                                                                                  |
| 16a | Closure candidate / anchor / acceptance are **distinct states**                                              | ✅ 6.2.1 — three-state lattice; nothing described with a state it has not reached                                                                                                                                                    |
| 16b | Conflict evidence states whether one or **both** closures possess valid anchors                              | ✅ 6.3 — `both_closures_anchor_valid` machine field; false unless both reach `closure_anchor_valid`                                                                                                                                  |
| 16c | Invalid evidence never consumes a slot                                                                       | ✅ 6.3.1 — the verifier is set-based; no mutable slot state exists                                                                                                                                                                   |
| 16d | Slot-consumption-before-validation is an **implementation-regression** fixture                               | ✅ 6.3.1 — S6.16, no `420+` code; S6.16b records the producer ordering as inert                                                                                                                                                      |
| 16e | **Bitcoin** establishes the strict height relation; other ecologies keep their own predicates                | ✅ 6.5.3.2 — only the height-native seat carries the inequality; others corroborate by digest equality                                                                                                                               |
| 16f | Submission, fixity, and proof-availability times are **not conflated**                                       | ✅ 6.5.3.1 — three named times; only _subject fixed before height_ is the Law 1 property                                                                                                                                             |
| 16g | Stage 5M claim envelope **mapped**; missing anchor ceilings added                                            | ✅ 6.8.1 — 5M ships **no** machine envelope (`known_limitations` absent); four fields owned here; `imported_non_claims = []` recorded explicitly                                                                                     |
| 16h | Stage 5M debt logged as successor-work candidate, **not** a release prerequisite                             | ✅ 6.8.2 — `anchor_quorum_machine_claim_envelope`; no socket minted                                                                                                                                                                  |
| 17  | `section_6.required_later_bindings` declared                                                                 | ✅ 6.6 — two: Section 7 seed, Section 12 package capsule                                                                                                                                                                             |
| 17a | **Requirements emitted in the CANONICAL four-field shape**                                                   | ✅ 6.6 — Section 4's shape is normative; the terse `NAME: PENDING` block is a human summary carrying no authority; S6.37                                                                                                             |
| 17b | **The gate parses canonical blocks only, never summaries**                                                   | ✅ 6.6 — one ledger, one dialect; a union-of-two-parsers ledger lets the gate decide the contract; S6.44                                                                                                                             |
| 17c | **Ledger field order fixed and checked; one representation only**                                            | ✅ 6.6 — two valid orderings would be two canonical forms (§3.3.1 downstream); S6.43                                                                                                                                                 |
| 17d | Missing/duplicate/unknown field, duplicate name, two owners, unknown status, unpermitted discharger all FAIL | ✅ 6.6 — S6.38–S6.42                                                                                                                                                                                                                 |
| 18  | Digest graph acyclic; schedule profile binds types, not values                                               | ✅ 6.5.1 — machine-checked; `anchor_schedule_profile_digest` is a root; S6.20                                                                                                                                                        |
| 19  | No `420+` raw codes allocated                                                                                | ✅ none in this section                                                                                                                                                                                                              |
| 20  | **Authorisation is a NEW release condition, and said so (A18)**                                              | ✅ 6.2.2 — the release predicate CHANGED; not presented as clarification                                                                                                                                                             |

**Requirement status:**

```text
section_6_anchored_presented_census_closure            : PENDING  -> discharged by THIS section once frozen
section_7_beacon_chain_roots_in_verified_closure_bitcoin_checkpoint
                                                      : PENDING  -> release REJECTS   // A26
section_7_challenge_seed_binds_presented_census_closure: PENDING  -> release REJECTS
section_12_stage4t_presented_evidence_package_capsule  : PENDING  -> release REJECTS
```

**The block above is a human summary and carries no authority.** The canonical machine ledger is §4.10's four-field shape (A20), and Section 6 emits it verbatim. The release consequence and the exactly-one-discharger rule are **ledger semantics** and are stated once in §4.10, never repeated inside a record:

```text
requirement:            section_7_beacon_chain_roots_in_verified_closure_bitcoin_checkpoint
owning section:         6
permitted discharger:   7
status:                 PENDING

requirement:            section_7_challenge_seed_binds_presented_census_closure
owning section:         6
permitted discharger:   7
status:                 PENDING

requirement:            section_12_stage4t_presented_evidence_package_capsule
owning section:         6
permitted discharger:   12
status:                 PENDING
```

**Why `section_7_beacon_chain_roots_in_verified_closure_bitcoin_checkpoint` is a requirement and not a note (A26).** §6.5.4 derives a Bitcoin checkpoint projection that Section 7 has not yet been written to consume. Without a ledger entry the projection would be a **decorative object** — verified, exposed, and ignored — which is A8's painted door in the register A8 exists to prevent. Section 7 discharges it **only** when the presented header suffix demonstrably begins at the verifier-derived `checkpoint_height`, `checkpoint_block_hash`, `checkpoint_header`, `checkpoint_nbits` and pinned `network_profile_id`. **A prose claim that the beacon "uses the same Bitcoin chain" does not discharge it.**

**`global closure uniqueness : NOT CLAIMED` was deleted from this block (A20).** It is a **non-claim wearing a requirement-record coat** — the exact thing A20's grammar forbids — and it was a _third_ home for a fact that already lives in `section_5.added_non_claims` and in the `permanent ceiling:` line A20 removed from §5.9. A ceiling is not a requirement: requirements are discharged, ceilings are permanent, and a ledger that lists both in one shape invites a reader to expect the ceiling to go away. It lives in exactly one place: `not_proof_of_global_census_closure_uniqueness_without_exclusion_witnesses` (§5.8, A13).

**One ledger, one dialect (frozen).** Section 6 emitted `NAME: PENDING -> release REJECTS` while Section 4 emitted a four-field block; neither parser read all four requirements, only their union did. Teaching the Section 10 gate two dialects would make the gate the place where the contract is decided. **Section 4's shape wins**, and Section 6 is the clean seam to standardise on it because Section 6 is not yet frozen:

```text
the gate parses CANONICAL BLOCKS ONLY, never summaries
a summary line with no canonical block            -> FAIL
a duplicate requirement name                      -> FAIL
a missing owner, discharger or status             -> FAIL
an unknown or duplicate field                     -> FAIL
an unknown status value                           -> FAIL
a requirement discharged by an unpermitted section -> FAIL
field order is FIXED and checked; two representations of one block are forbidden
```

The last line matters for the same reason §3.3.1 does: if a block has two valid orderings, it has two canonical forms, and "canonical" stops meaning anything.

**Gate 20 is the one that must not be softened.** Every prior amendment in this stage ended "no release predicate changed". A18 does change it: an unauthorised closure now fails a release that would previously have passed. Recording that honestly costs nothing and hiding it would make the ledger a riddle.

**Gate 1 blocks the freeze until A17.** Per the ordering ruling, A17 is derived from the artifacts above now that they exist, not from a planned pair count — and the 8 MiB manifest invariant is recomputed against the resulting structure with **no grandfather clause for old wrapper arithmetic**.

---

## Sections 7–13 — pending

7. Beacon-seed and unique-index derivation (rejection sampling; no modulo bias). **Discharges `section_7_challenge_seed_binds_presented_census_closure`** (A13) — only when the actual seed preimage contains the verifier-recomputed `challenge_subject_digest`.
8. Opening rules and cumulative-disclosure accounting. **Discharges the fail-closed requirement `section_8_opening_bundle_resource_limits`** (§4.10, A8) — must pin `MAX_OPENING_TRANSPORT_BYTES` and `MAX_OPENING_BUNDLE_CANONICAL_BYTES`, prove the opening-side compatibility invariant, and **bind both limits into the exact preimage of the already-precommitted `disclosure_policy_digest`**. Printing the constants discharges nothing; release rejects while the requirement is unresolved.
9. Exact rational probability encoding (decimal-string integers).
10. Raw codes from **420**, first-failure order frozen before implementation. **Discharges `section_10_evidence_attack_raw_code_allocation`** (§4.10, A24) — assigns **both** the semantic first-failure reason and its code, one code per semantic class, over the whole stage in one pass.
11. Conditional Lean model.
12. Evidence lanes: normative Lane A, captured Bitcoin Lane B, dishonest-producer fixtures. **Discharges `section_12_stage4t_presented_evidence_package_capsule`** (A14) — builds the Stage 4T capsule over the **assembled** package once openings, receipts, ledger and narrative exist; that audience-varying material is what 4T actually protects, and it cannot exist before the challenge.
13. Prior-art and novelty source map (pinned: title, version/date, URL, retrieval date, exact quote, digest or archived copy, classification).

### Section 10 open items — A24 gate-hardening acceptance criteria

**These are acceptance criteria on how Section 10 builds its gates. They are NOT requirements**: they mint no ledger entry, take no owner/discharger pair, and block no release on their own. A24's `section_10_evidence_attack_raw_code_allocation` already blocks release; these constrain the gate that discharges it.

#### `retired_identifier_active_use_rejection`

```text
open item:      retired_identifier_active_use_rejection
owner:          section 10
purpose:        distinguish permitted historical or explicit-absence references to a
                retired construction from impermissible normative REUSE of it
required self-test:
                inject a retired identifier into an ACTIVE requirement block and
                confirm the gate REJECTS
```

```text
permitted contexts                          forbidden active contexts
------------------                          -------------------------
amendment history describing deletion       requirement identifiers or subjects
explicit absence declarations               construction definitions
negative fixtures proving rejection         normative formulas
                                            discharge conditions
                                            active gate obligations
                                            release mappings
```

**The invariant:**

```text
retired identifier mentioned HISTORICALLY  !=  retired identifier used NORMATIVELY
```

**A plain grep cannot establish that distinction, and the current dead-language check is a plain grep.** It reports green on `closure_capsule_root` — deleted by A14 — because all five occurrences happen to be declarations of its absence. That is **luck of wording, not construction**: the same check would report green on a live normative reuse, because it counts names and cannot read context. The gate passed its most recent test for the wrong reason, which is the same condition as failing it.

**The failure mode is specific and has a name.** A construction is deleted; its identifier survives; a later section reuses the name for the real object that replaced it, or worse, for the deleted one. Then a reviewer greps, finds the identifier, and cannot tell whether the stage is describing a corpse or standing on one. This stage has already spent a review cycle on exactly that ambiguity — `section_12_stage4t_presented_evidence_package_capsule` is a **live, legitimate** post-challenge package construction and was read as the resurrected prechallenge `closure_capsule_root` **because the identifier alone could not settle the question**. It was a false alarm, and the gap it exposed is real: nothing mechanical distinguishes the two cases.

_Logged against Section 10 rather than folded into §4.10: A24's discharge conditions are frozen Section 4 text, and an acceptance criterion written there would change frozen normative text for a gate that does not yet exist. This is roadmap, not contract._

**Outside the release predicate:** the independent-producer Frontier gate (a second producer completing the Stage 5N ceremony) runs parallel to Stage 5O and does not gate its release. Frontier remains capped at **9.4** until that run lands.
