# Portable reproduction handoff

Use [handoff.json](handoff.json) for the exact published revision and artifact hashes.
This recipe reexecutes **saved model proposals**, using local synthetic receivers.
It does not generate new model responses or require model weights, GPU, API key or
provider account. Requirements: Linux x86_64, Python 3.12 with `venv`, Git, and network
access for the hash-locked Python wheels. Keep Git history: the verifier checks the
protocol and all bound sources at the recorded freeze commit.

From an existing clone containing this guide, choose a new directory:

```sh
set -eu
export PYTHONDONTWRITEBYTECODE=1
export PYTHONNOUSERSITE=1
unset PYTHONPATH
source_repo="$PWD"
handoff="$source_repo/docs/research/handoff-phase-11/handoff.json"
revision=$(python3.12 -c 'import json,sys; print(json.load(open(sys.argv[1]))["publication_commit"])' "$handoff")
expected_root=$(python3.12 -c 'import json,sys; print(json.load(open(sys.argv[1]))["manifest_sha256"])' "$handoff")
work=$(mktemp -d)
git clone --no-local "$source_repo" "$work/checkout"
git -C "$work/checkout" checkout --detach "$revision"
python3.12 -m venv "$work/venv"
cd "$work/checkout"
"$work/venv/bin/python" -m pip install --require-hashes --only-binary=:all: -r tools/assurance-sdk/requirements.lock -r tools/assurance-workflow/requirements.lock
"$work/venv/bin/python" -m pip check
"$work/venv/bin/python" -m unittest discover -s tools/assurance-model-composed/tests -v
"$work/venv/bin/python" tools/assurance-model-composed/evidence.py verify docs/research/model-composition-phase-10/evidence.zip --expected-root "$expected_root"
git status --porcelain
```

Expected: 16 focused tests pass; verification reports 48 generations, 144 branches,
1,440 raw snapshots and the pinned root. The final tracked checkout must remain clean.
A failure or missing prerequisite is not a successful replay. Preserve the complete
output before diagnosing it; do not edit the expected root, protocol or frozen files.
The initial installation downloads pinned dependencies; subsequent replay uses no
external service. Temporary local receiver ports and native subprocesses are expected.

The manifest pins a publication commit that predates this handoff guide. That is
intentional: verification needs the frozen implementation and published evidence,
not a later presentation or receipt. Compare the published archive/protocol hashes
with the handoff manifest; archive verification checks every archive member against
the supplied manifest root. For external verification, obtain the expected revision
and root through a separate trusted channel rather than trusting a modified clone.

See [RESULTS.md](RESULTS.md) for the actual project-operated clean-clone run and
[OPERATOR_RECORD.md](OPERATOR_RECORD.md) for an unexecuted external-operator template.
Project-controlled local and hosted runs are distinct from independent custody.
