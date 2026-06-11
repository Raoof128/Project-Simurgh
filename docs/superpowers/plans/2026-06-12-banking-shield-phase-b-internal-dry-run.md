# Banking Shield Phase B Internal Dry Run Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Stage B2 Phase B internal dry-run documentation, evidence scaffolding, and audit coverage without adding Phase B runtime routes or real banking behavior.

**Architecture:** Use the existing Phase A `/api/banking-pilot` runtime unchanged. Add Phase B governance documents, aggregate-only evidence templates, and a dedicated Phase B privacy audit wrapper for the evidence folder. Keep Phase B as a research dry-run layer, not a product feature.

**Tech Stack:** Markdown research docs, JSON evidence templates, Node.js audit script, existing shell check pipeline, Git commits per stage.

**Execution Status:** Completed on branch `banking-shield-phase-b-dry-run`. The trusted internal dry run has not been executed; this plan completed the protocol pack, audit gate, aggregate templates, and continuity logs.

---

## File Structure

- `docs/research/banking-pilot/phase-b/` contains the Phase B protocol pack and closeout scaffold.
- `docs/research/banking-pilot/evidence/phase-b-internal-dry-run/` contains aggregate-only templates and current gate outputs captured before the future dry run.
- `scripts/privacy-audit-banking-pilot-phase-b.mjs` scans Phase B evidence for sensitive values and forbidden payload structures while allowing field names in docs/tests/guard sources.
- `scripts/check.sh` runs the Phase B privacy audit in the Banking Shield section.
- `AGENT.md` and `CHANGELOG.md` record the dated Raouf continuity entry after verification.

## Task 1: Create Phase B Protocol Pack

**Files:**

- Create: `docs/research/banking-pilot/phase-b/BANKING_PILOT_PHASE_B_PROTOCOL.md`
- Create: `docs/research/banking-pilot/phase-b/BANKING_PILOT_PHASE_B_GO_NO_GO_CHECKLIST.md`
- Create: `docs/research/banking-pilot/phase-b/BANKING_PILOT_PHASE_B_PARTICIPANT_NOTICE.md`
- Create: `docs/research/banking-pilot/phase-b/BANKING_PILOT_PHASE_B_FEEDBACK_FORM.md`
- Create: `docs/research/banking-pilot/phase-b/BANKING_PILOT_PHASE_B_DATA_MANAGEMENT_ADDENDUM.md`
- Create: `docs/research/banking-pilot/phase-b/BANKING_PILOT_PHASE_B_TESTER_RUNBOOK.md`
- Create: `docs/research/banking-pilot/phase-b/BANKING_PILOT_PHASE_B_CLOSEOUT.md`
- Create: `docs/research/banking-pilot/phase-b/BANKING_PILOT_PHASE_B_CLAIM_AUDIT.md`

- [x] **Step 1: Write the Phase B protocol**

Create the protocol with these required sections: status, purpose, scope lock, tester flow, success criteria, evidence labels, safety controls, and non-claims.

- [x] **Step 2: Write the go/no-go checklist**

Include pre-run approval, tester readiness, runtime readiness, privacy readiness, evidence readiness, and stop conditions.

- [x] **Step 3: Write the participant notice and feedback form**

Make every prompt fictional-only and include explicit confirmations that testers must not enter real banking data.

- [x] **Step 4: Write the data addendum, runbook, closeout, and claim audit**

Keep closeout uncompleted but structured. Keep the claim audit paper-safe and non-claim focused.

- [x] **Step 5: Run Markdown sanity checks**

Run: `rg -n "UNRESOLVED_MARKER|CLAIM_LANGUAGE_MARKER" docs/research/banking-pilot/phase-b`

Expected: no unresolved draft markers or claim language.

- [x] **Step 6: Commit**

Run:

```bash
git add docs/research/banking-pilot/phase-b
git commit -m "docs(banking): add phase b dry run protocol pack"
```

## Task 2: Create Aggregate-Only Evidence Scaffolding

**Files:**

- Create: `docs/research/banking-pilot/evidence/phase-b-internal-dry-run/README.md`
- Create: `docs/research/banking-pilot/evidence/phase-b-internal-dry-run/aggregate-results-template.json`
- Create: `docs/research/banking-pilot/evidence/phase-b-internal-dry-run/participant-feedback-template.json`
- Create: `docs/research/banking-pilot/evidence/phase-b-internal-dry-run/privacy-audit-phase-b.txt`
- Create: `docs/research/banking-pilot/evidence/phase-b-internal-dry-run/smoke-banking-pilot-phase-b.txt`
- Create: `docs/research/banking-pilot/evidence/phase-b-internal-dry-run/closeout-summary.md`

- [x] **Step 1: Add README and metadata contract**

Document that this folder is for aggregate-only Phase B dry-run evidence and must not contain raw tester payloads or real banking data.

- [x] **Step 2: Add aggregate results template**

Use `phase_b_internal_dry_run`, `synthetic: false`, `human_participant: true`, `data_source: internal_human_dry_run`, `real_banking_data_collected: false`, `real_financial_decision_affected: false`, and `aggregate_only: true`.

- [x] **Step 3: Add participant feedback template**

Use aggregate counts and allowed feedback categories only. Do not include per-tester free-text fields.

- [x] **Step 4: Add gate-output files**

Add text files with current gate output while making clear that no Phase B participant evidence has been collected.

- [x] **Step 5: Commit**

Run:

```bash
git add docs/research/banking-pilot/evidence/phase-b-internal-dry-run
git commit -m "docs(banking): scaffold phase b aggregate evidence"
```

## Task 3: Add Phase B Privacy Audit Gate

**Files:**

- Create: `scripts/privacy-audit-banking-pilot-phase-b.mjs`
- Modify: `scripts/check.sh`
- Optional test by command: `node scripts/privacy-audit-banking-pilot-phase-b.mjs`

- [x] **Step 1: Write the audit script**

Scan `docs/research/banking-pilot/evidence/phase-b-internal-dry-run/`. Fail on sensitive value regexes, forbidden JSON keys, raw payload fields, or real bank branding. Allow the metadata contract fields required by Phase B.

- [x] **Step 2: Run audit before check wiring**

Run: `node scripts/privacy-audit-banking-pilot-phase-b.mjs`

Expected: PASS.

- [x] **Step 3: Wire the audit into `scripts/check.sh`**

Add a Banking Shield Phase B privacy audit step near the existing Banking Shield Phase A gates.

- [x] **Step 4: Run targeted checks**

Run:

```bash
node scripts/privacy-audit-banking-pilot-phase-b.mjs
bash scripts/smoke-banking-pilot.sh
node scripts/privacy-audit-banking-pilot.mjs
```

Expected: all pass.

- [x] **Step 5: Commit**

Run:

```bash
git add scripts/privacy-audit-banking-pilot-phase-b.mjs scripts/check.sh
git commit -m "security(banking): audit phase b dry run evidence"
```

## Task 4: Update Continuity Logs and Verify

**Files:**

- Modify: `AGENT.md`
- Modify: `CHANGELOG.md`

- [x] **Step 1: Run verification**

Run:

```bash
npm test
bash scripts/smoke-banking-pilot.sh
bash scripts/security-audit-banking-pilot.sh
node scripts/privacy-audit-banking-pilot.mjs
node scripts/privacy-audit-banking-pilot-phase-b.mjs
bash scripts/smoke-banking-pilot-closed.sh
bash scripts/smoke-banking-pilot-full-e2e.sh
npx prettier --check .
bash scripts/check.sh --quick
```

Record exact pass/fail counts and known local prerequisite blockers.

- [x] **Step 2: Update `AGENT.md`**

Add a dated Raouf entry with scope, files changed, verification, and follow-ups.

- [x] **Step 3: Update `CHANGELOG.md`**

Add a matching Phase B dry-run protocol-pack entry with verification.

- [x] **Step 4: Commit**

Run:

```bash
git add AGENT.md CHANGELOG.md
git commit -m "docs(repo): log phase b dry run scaffold"
```

## Task 5: Final Branch Review

**Files:**

- Review: all staged and committed changes.

- [x] **Step 1: Confirm branch status**

Run: `git status --short`

Expected: only known pre-existing Phase A evidence fixture churn remains, or clean if it was intentionally excluded.

- [x] **Step 2: Review commit history**

Run: `git log --oneline -6`

Expected: separate commits for design, plan, docs/evidence, audit, and logs.

- [x] **Step 3: Report outcome**

Summarize commits, verification, known blockers, and explicitly state no Phase B runtime routes or real banking integrations were added.
