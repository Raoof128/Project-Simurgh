# Fresh hosted phase 4 reproduction

The project-operated GitHub workflow executed the unchanged phase 4 runner at commit
`9d8a58fd` in [run 38827781172](https://github.com/Raoof128/Project-Simurgh/actions/runs/38827781172).
Its fresh hosted Linux machine used kernel `6.17.0-1022-azure`, glibc 2.39 and Python
3.12.15, compared with Python 3.12.14 in the original local run. Hash-pinned SDK and
workflow dependencies installed successfully.

Execution: 16 October 2026 00:09:09–00:10:55 UTC. Replay/snapshot/report time was
105.660 seconds, excluding installation and final pack verification. All 540 branches
and 763 decisions matched the original report. The new pack is 412,027 bytes.
The different root reflects new runtime/timing/database bytes; it is not a mismatch
in the reproduced task outcomes.

The pack and receipt were downloaded from the successful run and verified locally
against the manifest root printed in its authenticated Actions log:

`4a0f5ee48bef4a8faa22c39600a3f7d14dbcb7dd142895ad6bcce11863af7d15`

```sh
PYTHONDONTWRITEBYTECODE=1 python3 tools/assurance-reproduce/reproduce.py verify \
  docs/research/recovery-phase-5/hosted-phase4/evidence.zip \
  --expected-root "$(cat docs/research/recovery-phase-5/hosted-phase4/ROOT.sha256)"
```

This pays the previously pending fresh-host execution check for this frozen replay.
The project controlled the workflow, code and artifact download. It **does not pay
G18 outside-operator independence or G19 independent custody**. No model inference
was repeated. The original author pack, source contract and results are unchanged.
