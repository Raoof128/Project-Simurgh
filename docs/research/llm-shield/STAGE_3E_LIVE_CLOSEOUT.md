<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# Stage 3E-live — Closeout

> A live provider call is an observed gateway event, not a proof of model safety.

**Release target:** `v0.7.1-stage-3e-live-anthropic-adapter` (tag after merge to main).

## Deliverables

- New modules: `liveProviderGuard`, `liveCallLedger`, `anthropicMessageBuild`,
  `anthropicResponseNormalise`, `anthropicProviderAdapter` (+ unit suites).
- Additive edits: `providerTypes`, `gatewayEnv`, `providerRegistry`, `gatewayRouter`,
  `gatewayReceipt`, `gatewayAudit`. Sealed 3D/3E-core modules untouched.
- e2e: live disabled / missing-key / context-rejected+client-key / rate-limit (no network) +
  optional Anthropic smoke (skips by default) + 40-case no-network fixture corpus & runner.
- Gates: `smoke-`, `security-audit-`, `privacy-audit-llm-shield-stage3e-live`, wired into `check.sh`.
- Docs: narrative, threat model, validation matrix, reviewer checklist, this closeout;
  OpenAPI + docker-compose live documentation.

## Verification (no-network, key-free)

Run the closeout suite:

```bash
npm test
bash scripts/smoke-llm-shield-stage3e.sh
bash scripts/smoke-llm-shield-stage3e-live.sh
bash scripts/security-audit-llm-shield-stage3e-live.sh
node scripts/privacy-audit-llm-shield-stage3e-live.mjs
bash scripts/check.sh
npx prettier --check .
npm audit --audit-level=high
```

### Results

- `npm test`: 589 pass, 0 fail (554 → 589 with the six new live unit suites).
- 3E-live smoke: disabled / missing-key / context-rejected+client-key / rate-limit PASS;
  optional Anthropic SKIP (no env); fixture runner 40/40.
- 3E-live security audit: PASS (no static SDK import; dynamic import only in adapter; no tools).
- 3E-live privacy audit: PASS (no forbidden raw keys in evidence).
- Mock/recorded paths and the 3B frozen benchmark show no drift.
- The 3E-core security + privacy audits were updated for the §5 live contract change
  (guarded dynamic SDK import allowed in the adapter; `gateway_live_provider_disabled` as the
  default fail-closed reason; `*_recorded` attestation booleans stripped before the raw-key
  scan) and both pass.
- `npx prettier --check .`: clean. `npm audit`: 0 vulnerabilities at the high level.
- `bash scripts/check.sh`: 85 passed, 2 failed. The two failures are **pre-existing,
  environment-only**: the Stage 2.6 Windows daemon (.NET) tests and the Linux Rust daemon
  (`xvfb_integration_tests`, needs a Linux display server) cannot run on the macOS dev host
  and are unrelated to Stage 3E-live (no 3E-live file touches the .NET/Rust daemons).

## Non-claims

Not jailbreak immunity; not a safety verdict on Anthropic; no incident reproduction; no
production-deployment claim. Receipts attest process, not ground truth.
