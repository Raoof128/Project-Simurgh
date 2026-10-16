# Bounded reliability study (Phase 13)

Runs six preregistered schedules, five repetitions and two controls through the
frozen native SDK/receiver fixture: 60 fixtures, 210 final calls, 10 initial calls
and 600 raw database snapshots. See the
[design and limits](../../docs/research/LOCAL_CONTINUATION_PHASES_13_15.md).

Use Python 3.12 with the hash-locked SDK and workflow requirements. From repository root:

```sh
python -B -m unittest discover -s tools/assurance-reliability/tests -v
python -B tools/assurance-reliability/reliability_evidence.py run --out /tmp/new-reliability-run
python -B tools/assurance-reliability/reliability_evidence.py verify docs/research/reliability-phase-13/evidence.zip --expected-root "$(cat docs/research/reliability-phase-13/ROOT.sha256)"
```

A run requires its protocol and bound source to be committed first. Verification
checks every retained raw database against the report and executes a fresh full
schedule matrix. It checks invariants, not identical timing, order or route winner.
Four queued threads and one actually killed update process exercise bounded local
behavior with a fixed fixture clock; they do not establish production reliability,
live monitoring, interruption of already admitted work or independent custody.
