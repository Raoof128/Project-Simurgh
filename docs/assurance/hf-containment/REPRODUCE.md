# External operator replay

No external operator has run this study yet. These instructions prepare that step;
the author-operated local run and hosted GitHub Actions do not supply independent custody.

Use a full checkout containing the published evidence and source commit
`fb3b7fe6` (the protocol/report carries its full identity). Required: Linux x86_64,
Python 3.12, `/proc`, permission to install an unprivileged seccomp filter, TCP loopback
and ordinary temporary files. No API key, model weights or third-party Python package
is needed to replay saved actions. Run on a disposable local test machine.

```bash
git clone --branch openai-readiness https://github.com/Raoof128/Project-Simurgh.git
cd Project-Simurgh
export PYTHONDONTWRITEBYTECODE=1
python -m unittest discover -s tools/hf-containment/tests -v
python tools/hf-containment/study.py verify \
  --protocol docs/assurance/hf-containment/evidence/protocol.json \
  docs/assurance/hf-containment/evidence/report.json
python tools/hf-containment/model.py verify \
  --protocol docs/assurance/hf-containment/evidence/protocol.json \
  --capture docs/assurance/hf-containment/evidence/model-capture.json \
  --report docs/assurance/hf-containment/evidence/model-report.json
```

Also replay the separately frozen native-call successor:

```bash
python -m unittest discover -s tools/hf-native/tests -v
python tools/hf-native/native.py verify \
  --protocol docs/assurance/hf-native/evidence/protocol.json \
  --capture docs/assurance/hf-native/evidence/capture.json \
  --report docs/assurance/hf-native/evidence/report.json
```

The model command executes saved action proposals against fresh fixtures. It does
not regenerate model outputs. Optional `--tokenizer-dir PATH` reconstructs their
prompt/input/output token linkage using the manifest-pinned local tokenizer and
Transformers; model weights are unnecessary for that check. The original capture
used the existing official 3B weights, whose eight file hashes were checked before
inference. Re-running inference is a new experiment, with its own capture identity.

For a separate scripted result, choose a new output path and pass the full source
commit recorded in `evidence/report.json`:

```bash
source_commit=$(python -c 'import json; print(json.load(open("docs/assurance/hf-containment/evidence/report.json"))["provenance"]["commit"])')
python tools/hf-containment/study.py run \
  --protocol docs/assurance/hf-containment/evidence/protocol.json \
  --commit "$source_commit" --out /tmp/simurgh-independent-report.json
python tools/hf-containment/study.py verify \
  --protocol docs/assurance/hf-containment/evidence/protocol.json \
  /tmp/simurgh-independent-report.json
```

Reports refuse overwrite. A platform/setup error is a failed or unsupported execution,
not containment success. Save the exit codes, complete logs, tested repository commit,
protocol/capture/report SHA-256 values, Python version and kernel/architecture. Include
all failed controls or deviations and identify which observations you collected yourself.
Do not include credentials or a full environment dump.

A useful receipt states the operator's relationship to the project, who controlled
setup and logs, exact commands, environment limits and whether the semantic replay
matched. Signing such a receipt binds its bytes; it does not independently establish
operator identity or ground truth. The project has not fabricated or requested a
third party's endorsement, and these instructions do not constitute one.
