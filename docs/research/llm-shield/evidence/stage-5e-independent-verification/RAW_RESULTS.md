# Stage 5E VDA conformance — raw results

## Run 1: local (macOS)

Command:

```
cd /Users/raoof.r12/Desktop/Raouf/test/simurgh-vda-conformance
bash run.sh
```

Environment:

```
$ node -v
v26.5.1
$ python3 -V
Python 3.14.6
$ uname -a
Darwin Raoufs-MacBook-Air.local 25.6.0 Darwin Kernel Version 25.6.0: Sat Jul 11 15:27:02 PDT 2026; root:xnu-12377.161.13~4/RELEASE_ARM64_T8112 arm64
```

Output:

```
==================================================================
 Simurgh — Stage 5E VDA independent conformance run
 Verifiable Deployed-detector Attestation over Meta Prompt Guard 2
==================================================================
node:   v26.5.1
python: Python 3.14.6

== Stage 5E VDA reproduce (verify-only) ==
v26.5.1
-- 1/6 verify committed attestation (audit + public → raw 0)
audit: {"raw":0,"tier":"audit"} public: {"raw":0,"tier":"public"}
-- 2/6 byte-stability: rebuild the attestation in place and diff
   byte-stable (no diff)
-- 3/6 stage5e unit suite
   unit OK
-- 4/6 JS<->Python parity over the committed evidence
PARITY OK — 40 deterministic facts reproduced in Python; 4 slip(s) at reference θ=0.5000
-- 5/6 K7 all-functions net
   K7 OK
-- 6/6 Lean proofs (if lean present; else the CI lean workflow gates them)
   lean OK (zero sorry)
== Stage 5E VDA reproduce: ALL PASS ==

==================================================================
 INDEPENDENTLY CONFIRMED ON THIS MACHINE:
  - committed public and audit attestations verify to raw 0
  - rebuilding the evidence is byte-identical
  - the stdlib-Python parity implementation reproduces the facts
  - the unit, tamper-matrix, K7, and available Lean checks pass

 THIS RUN DOES NOT RE-RUN PROMPT GUARD. It verifies arithmetic over
 committed model scores. See README.md for optional score recapture.
==================================================================
EXIT_CODE=0
```

## Run 2: DigitalOcean droplet (Linux x86_64)

Commands:

```
scp -i ~/.ssh/eoi_droplet_ed25519 simurgh-vda-conformance.zip eoiadmin@170.64.167.95:~/
ssh -i ~/.ssh/eoi_droplet_ed25519 eoiadmin@170.64.167.95 "unzip -oq ~/simurgh-vda-conformance.zip -d ~/"
ssh -i ~/.ssh/eoi_droplet_ed25519 eoiadmin@170.64.167.95 "cd ~/simurgh-vda-conformance && sudo env PATH=/root/.nvm/versions/node/v26.5.0/bin:\$PATH bash run.sh 2>&1 | tee vda-conformance-\$(hostname)-\$(date +%Y%m%d).log"
```

Environment:

```
$ hostname
Nexus
$ uname -a
Linux Nexus 6.8.0-134-generic #134-Ubuntu SMP PREEMPT_DYNAMIC Fri Jun 26 18:43:11 UTC 2026 x86_64 x86_64 x86_64 GNU/Linux
$ whoami
eoiadmin
node -v (via /root/.nvm/versions/node/v26.5.0/bin): v26.5.0
python3 -V: Python 3.12.3
```

Output:

```
==================================================================
 Simurgh — Stage 5E VDA independent conformance run
 Verifiable Deployed-detector Attestation over Meta Prompt Guard 2
==================================================================
node:   v26.5.0
python: Python 3.12.3

== Stage 5E VDA reproduce (verify-only) ==
v26.5.0
-- 1/6 verify committed attestation (audit + public → raw 0)
audit: {"raw":0,"tier":"audit"} public: {"raw":0,"tier":"public"}
-- 2/6 byte-stability: rebuild the attestation in place and diff
   byte-stable (no diff)
-- 3/6 stage5e unit suite
   unit OK
-- 4/6 JS<->Python parity over the committed evidence
PARITY OK — 40 deterministic facts reproduced in Python; 4 slip(s) at reference θ=0.5000
-- 5/6 K7 all-functions net
   K7 OK
-- 6/6 Lean proofs (if lean present; else the CI lean workflow gates them)
   lean not installed locally — gated by stage-4-lean-proofs.yml
== Stage 5E VDA reproduce: ALL PASS ==

==================================================================
 INDEPENDENTLY CONFIRMED ON THIS MACHINE:
  - committed public and audit attestations verify to raw 0
  - rebuilding the evidence is byte-identical
  - the stdlib-Python parity implementation reproduces the facts
  - the unit, tamper-matrix, K7, and available Lean checks pass

 THIS RUN DOES NOT RE-RUN PROMPT GUARD. It verifies arithmetic over
 committed model scores. See README.md for optional score recapture.
==================================================================
EXIT_CODE=0
```

Log file on droplet: `~/simurgh-vda-conformance/vda-conformance-Nexus-20260801.log` (identical content to above, `eoiadmin` home directory).

---

## PROVENANCE NOTE — added 2026-08-01, please read

This file was **reconstructed from a session transcript** after the original was deleted by mistake:
the conformance folder was re-extracted from a freshly built zip, and `RAW_RESULTS.md` is not part of
the builder's output, so it was destroyed rather than overwritten. The content above is a faithful
copy of what was read minutes earlier, but it is **not guaranteed byte-identical to the original**
and should not be treated as a primary artifact.

The authoritative copy is the log still on the droplet:
`~/simurgh-vda-conformance/vda-conformance-Nexus-20260801.log`. Please re-fetch it and replace this
file.

Two things about the runs above are worth recording before they are re-quoted:

1. **Step 6/6 did not execute on the droplet.** `lean` was absent, the script skipped it, and
   `ALL PASS` printed anyway. The updated kit fixes this: the escape-hatch scan is source-based, runs
   with or without a toolchain, and a `sorry` now fails the run with no `ALL PASS`.
2. **`lean OK (zero sorry)` was unearned even where lean did run.** `lean` exits 0 on a `sorry` — it
   is a warning, not an error. The claim was true for this proof, but the check that printed it could
   not establish it.

**Party independence is not evidenced by this file.** The commands recorded above were issued from
the author's own machine with the author's own key. If a different operator ran the kit, the record
should say so in their words, carry their own `tee` log rather than these ssh invocations, and ideally
be signed with a key the author does not hold — otherwise a reader cannot distinguish this from a
self-run, and this project's own standard treats a self-assertion of independence as an input rather
than as evidence.

---

## Run 3: local (macOS) — new pack (`simurgh-vda-conformance.zip`, 99210 bytes, supersedes the

92557-byte zip now renamed `simurgh-vda-conformance-SUPERSEDED-2026-08-01-prelean.zip`)

This pack changes step 6/6: the escape-hatch scan (`sorry`/`admit`/`native_decide`/`axiom`/`unsafe`/
`implemented_by`/`partial def`) now runs unconditionally via `node scripts/check-lean-proofs.mjs
--root proofs/stage5e --floor 1[--no-typecheck]`, delegated to the repo-wide gate. Addresses the two
issues flagged in the PROVENANCE NOTE above: the scan is source-based (not gated on `lean` presence)
and `lean`'s exit-0-on-`sorry` behavior no longer determines the "zero sorry" claim.

Command:

```
cd /Users/raoof.r12/Desktop/Raouf/test/simurgh-vda-conformance
bash run.sh
```

Environment:

```
$ node -v
v26.5.1
$ python3 -V
Python 3.14.6
$ uname -a
Darwin Raoufs-MacBook-Air.local 25.6.0 Darwin Kernel Version 25.6.0: Sat Jul 11 15:27:02 PDT 2026; root:xnu-12377.161.13~4/RELEASE_ARM64_T8112 arm64
```

Output:

```
==================================================================
 Simurgh — Stage 5E VDA independent conformance run
 Verifiable Deployed-detector Attestation over Meta Prompt Guard 2
==================================================================
node:   v26.5.1
python: Python 3.14.6

== Stage 5E VDA reproduce (verify-only) ==
v26.5.1
-- 1/6 verify committed attestation (audit + public → raw 0)
audit: {"raw":0,"tier":"audit"} public: {"raw":0,"tier":"public"}
-- 2/6 byte-stability: rebuild the attestation in place and diff
   byte-stable (no diff)
-- 3/6 stage5e unit suite
   unit OK
-- 4/6 JS<->Python parity over the committed evidence
PARITY OK — 40 deterministic facts reproduced in Python; 4 slip(s) at reference θ=0.5000
-- 5/6 K7 all-functions net
   K7 OK
-- 6/6 Lean proofs (escape-hatch scan ALWAYS; type-check when lean is present)
OK: 1 Lean proof(s) discovered under proofs/stage5e/ (floor 1), 0 escape hatches, all type-check, self-test red on demand
   lean: type-check + escape-hatch scan OK
== Stage 5E VDA reproduce: ALL PASS ==

==================================================================
 INDEPENDENTLY CONFIRMED ON THIS MACHINE:
  - committed public and audit attestations verify to raw 0
  - rebuilding the evidence is byte-identical
  - the stdlib-Python parity implementation reproduces the facts
  - the unit, tamper-matrix, K7, and available Lean checks pass

 THIS RUN DOES NOT RE-RUN PROMPT GUARD. It verifies arithmetic over
 committed model scores. See README.md for optional score recapture.
==================================================================
EXIT_CODE=0
```

## Run 4: DigitalOcean droplet (Linux x86_64) — new pack

Commands:

```
scp -i ~/.ssh/eoi_droplet_ed25519 simurgh-vda-conformance.zip eoiadmin@170.64.167.95:~/
ssh -i ~/.ssh/eoi_droplet_ed25519 eoiadmin@170.64.167.95 "rm -rf ~/simurgh-vda-conformance && unzip -oq ~/simurgh-vda-conformance.zip -d ~/"
ssh -i ~/.ssh/eoi_droplet_ed25519 eoiadmin@170.64.167.95 "cd ~/simurgh-vda-conformance && sudo env PATH=/root/.nvm/versions/node/v26.5.0/bin:\$PATH bash run.sh 2>&1 | tee vda-conformance-\$(hostname)-\$(date +%Y%m%d)-newpack.log"
```

Environment:

```
$ hostname
Nexus
$ uname -a
Linux Nexus 6.8.0-134-generic #134-Ubuntu SMP PREEMPT_DYNAMIC Fri Jun 26 18:43:11 UTC 2026 x86_64 x86_64 x86_64 GNU/Linux
$ whoami
eoiadmin
node -v (via /root/.nvm/versions/node/v26.5.0/bin): v26.5.0
python3 -V: Python 3.12.3
```

Output:

```
==================================================================
 Simurgh — Stage 5E VDA independent conformance run
 Verifiable Deployed-detector Attestation over Meta Prompt Guard 2
==================================================================
node:   v26.5.0
python: Python 3.12.3

== Stage 5E VDA reproduce (verify-only) ==
v26.5.0
-- 1/6 verify committed attestation (audit + public → raw 0)
audit: {"raw":0,"tier":"audit"} public: {"raw":0,"tier":"public"}
-- 2/6 byte-stability: rebuild the attestation in place and diff
   byte-stable (no diff)
-- 3/6 stage5e unit suite
   unit OK
-- 4/6 JS<->Python parity over the committed evidence
PARITY OK — 40 deterministic facts reproduced in Python; 4 slip(s) at reference θ=0.5000
-- 5/6 K7 all-functions net
   K7 OK
-- 6/6 Lean proofs (escape-hatch scan ALWAYS; type-check when lean is present)
OK: 1 Lean proof(s) discovered under proofs/stage5e/ (floor 1), 0 escape hatches, type-check skipped, self-test red on demand
   lean absent: escape-hatch scan OK, TYPE-CHECK SKIPPED (stage-4-lean-proofs.yml gates it)
== Stage 5E VDA reproduce: ALL PASS ==

==================================================================
 INDEPENDENTLY CONFIRMED ON THIS MACHINE:
  - committed public and audit attestations verify to raw 0
  - rebuilding the evidence is byte-identical
  - the stdlib-Python parity implementation reproduces the facts
  - the unit, tamper-matrix, K7, and available Lean checks pass

 THIS RUN DOES NOT RE-RUN PROMPT GUARD. It verifies arithmetic over
 committed model scores. See README.md for optional score recapture.
==================================================================
EXIT_CODE=0
```

Log file on droplet: `~/simurgh-vda-conformance/vda-conformance-Nexus-20260801-newpack.log` (identical
content to above, `eoiadmin` home directory).

Note: droplet has no `lean` toolchain installed, so step 6 there runs the escape-hatch scan only
(type-check skipped, named as such in the output) — this is the same environment gap as Run 2, now
correctly reported by the script itself rather than silently passed over.

---

## Run 5: DigitalOcean droplet — Lean installed, closing the type-check gap

`DROPLET_SETUP.md` updated to add an elan install step (pinned to `leanprover/lean4:v4.15.0`, matching
`proofs/stage5e/lean-toolchain`), so step 6/6 can genuinely type-check on the droplet instead of
deferring that half to CI.

Commands:

```
ssh -i ~/.ssh/eoi_droplet_ed25519 eoiadmin@170.64.167.95 \
  "curl https://elan.lean-lang.org/elan-init.sh -sSf | sh -s -- -y --default-toolchain leanprover/lean4:v4.15.0"
```

Verification:

```
$ source "$HOME/.elan/env" && lean --version && elan toolchain list
Lean (version 4.15.0, x86_64-unknown-linux-gnu, commit 11651562caae, Release)
leanprover/lean4:v4.15.0
```

First rerun attempt (failed) — `sudo env PATH=/root/.nvm/versions/node/v26.5.0/bin:/home/eoiadmin/.elan/bin:$PATH bash run.sh`:

```
-- 6/6 Lean proofs (escape-hatch scan ALWAYS; type-check when lean is present)
FAIL: lean_gate_typecheck_failed
  file:   proofs/stage5e/DeployedDetector.lean
  detail: warning: could not canonicalize path: '/root/.elan/toolchains'
error: no default toolchain configured. run `elan default stable` to install & configure the latest Lean 4 stable release.
EXIT_CODE=1
```

`sudo` resets `$HOME` to `/root`; elan (installed under `eoiadmin`) resolves its toolchain from
`$HOME/.elan`, so root's `sudo` shell found no toolchain even with `lean` on `PATH`. `DROPLET_SETUP.md`
updated with this finding (§3 note before step 4).

Corrected command:

```
cd ~/simurgh-vda-conformance
sudo env HOME=/home/eoiadmin PATH=/root/.nvm/versions/node/v26.5.0/bin:/home/eoiadmin/.elan/bin:$PATH \
  bash run.sh 2>&1 | tee vda-conformance-$(hostname)-$(date +%Y%m%d)-newpack-withlean.log
```

Output:

```
==================================================================
 Simurgh — Stage 5E VDA independent conformance run
 Verifiable Deployed-detector Attestation over Meta Prompt Guard 2
==================================================================
node:   v26.5.0
python: Python 3.12.3

== Stage 5E VDA reproduce (verify-only) ==
v26.5.0
-- 1/6 verify committed attestation (audit + public → raw 0)
audit: {"raw":0,"tier":"audit"} public: {"raw":0,"tier":"public"}
-- 2/6 byte-stability: rebuild the attestation in place and diff
   byte-stable (no diff)
-- 3/6 stage5e unit suite
   unit OK
-- 4/6 JS<->Python parity over the committed evidence
PARITY OK — 40 deterministic facts reproduced in Python; 4 slip(s) at reference θ=0.5000
-- 5/6 K7 all-functions net
   K7 OK
-- 6/6 Lean proofs (escape-hatch scan ALWAYS; type-check when lean is present)
OK: 1 Lean proof(s) discovered under proofs/stage5e/ (floor 1), 0 escape hatches, all type-check, self-test red on demand
   lean: type-check + escape-hatch scan OK
== Stage 5E VDA reproduce: ALL PASS ==

==================================================================
 INDEPENDENTLY CONFIRMED ON THIS MACHINE:
  - committed public and audit attestations verify to raw 0
  - rebuilding the evidence is byte-identical
  - the stdlib-Python parity implementation reproduces the facts
  - the unit, tamper-matrix, K7, and available Lean checks pass

 THIS RUN DOES NOT RE-RUN PROMPT GUARD. It verifies arithmetic over
 committed model scores. See README.md for optional score recapture.
==================================================================
EXIT_CODE=0
```

Log file on droplet: `~/simurgh-vda-conformance/vda-conformance-Nexus-20260801-newpack-withlean.log`.

All six gates now genuinely execute on both machines — the droplet's step 6/6 previously deferred the
type-check to CI; it no longer does.
