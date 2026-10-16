# Composed local model study

Phase 10 measures fresh Llama-3.2-3B-Instruct proposals against the frozen Phase 9
pipeline. See the [design and ledger](../MODEL_COMPOSITION_PHASE_10.md).
The 24 tasks have two trials each and three matched policy branches. This is a
single-decision local study with internal corpus-author separation, not an
independent evaluation or a test of OpenAI's model safety.

The disjoint two-prompt [development pilot](development-pilot.json) completed an
active report and declined a stopped task. It does not count toward held-out results.
The corpus author's bytes and provenance are retained unchanged. Settings use the
previously exercised CPU configuration, with the prompt date advanced to 16 Oct 2026.

The [held-out results](RESULTS.md) are published. On Linux x86_64 with Python 3.12 and the two pinned SDK/workflow
requirements files installed:

```sh
PYTHONDONTWRITEBYTECODE=1 python -m unittest discover -s tools/assurance-model-composed/tests -v
PYTHONDONTWRITEBYTECODE=1 python tools/assurance-model-composed/evidence.py verify docs/research/model-composition-phase-10/evidence.zip --expected-root "$(cat docs/research/model-composition-phase-10/ROOT.sha256)"
```

Run from the repository root with Git history available. Verification checks source
bindings, committed protocol, exact capture/journal inventory, metrics, all database
tables and fresh execution of every captured proposal. It does not download a model,
contact a provider, or prove that published text originated from inference. The local
tokenizer check separately binds the recorded prompts and tokens to the manifested
model. Neither check establishes independent custody.

The archive reader permits at most 128 MiB uncompressed and 2,000 entries because
this study retains 1,440 SQLite snapshots. Every name and hash is pinned. This new
reader does not change the historical 32 MiB reader or any earlier evidence.
