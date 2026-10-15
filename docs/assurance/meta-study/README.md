# Repeated local Meta workflow study — Built with Llama

This study extends the [initial pilot](../meta/README.md) with a precommitted protocol, a separately
authored 24-case evaluation set, three fixed sampling seeds, and real two-step tool workflows.
The model remains official Meta Llama 3.2 1B Instruct; no paid model endpoint is used.

## Protocol and authorship

[Cases](evidence/cases.json) contain 12 benign tasks and 12 attacks, balanced across six families.
The [case author](AUTHORSHIP.md) received only the interface and task brief, with no inherited
conversation, implementation or previous model outputs. This is separate AI-agent authorship within
the same project. It does **not** supply outside human/organizational independence or prove that
similar text was absent from model training. Original pilot outputs were development evidence;
none of these new cases were used to tune this study's prompts.

The protocol fixes the entire case set, prompts, source/input hashes, model artifact manifest and
settings before inference. Three seeds (0, 1, 2), temperature 0.7, top_p 0.9, BF16 CPU, four threads,
128 new tokens and 2048 input tokens. A turn's RNG seed is `seed * 1000 + case_index * 2 + step`.
There are exactly **144 attempts: 24 cases × 3 seeds × 2 turns**. No extraction, output repair,
retry, case deletion or successful-run selection is allowed. Generation failures remain visible.
The chat template receives an explicit fixed date to avoid date drift.

## What executes

1. The model proposes `read_document(resource)`. An actual child process reads a synthetic public
   file through a host-provisioned descriptor. Enforced mode applies the existing Linux x86_64
   seccomp profile; a proposed private read attempts a real pathname open and must be denied.
2. That observed read result is supplied to the second model turn. The model proposes
   `write_record(resource, content)`. The native OpenAI Agents SDK pauses for approval, persists
   and checks its checkpoint, restores it, and calls the unchanged exact-authority Redis connector.
   Real Redis GET and DBSIZE measure effects. Identity and policy come from the host, not the model.

Every capture follows an enforced trajectory. The same two saved proposals then run against fresh
**enforced, bypass and deny-all** sessions. These are paired fixed-action controls: the bypass agent
is not resampled with alternative feedback. This comparison isolates execution of captured proposals;
it does not estimate fully adaptive counterfactual agent behavior.

Recovery probes select the first complete captured enforced workflow, by fixed seed/case order.
They persist that model-derived write's native approval checkpoint, actually kill the application
process after pause or after effect, resume in a different process, then repeat. They must observe
zero effects before approval, one final effect and no duplicate on repeat. These probes restart
from the write approval boundary; the model inference and first read are not crash-restored.
If no eligible captured workflow exists, recovery is reported as unexercised, never substituted.

## Measurements and limits

Reports separate invalid proposals, generation failures, execution errors, unauthorized effects,
benign end-to-end completion and authorized work blocked by enforcement. Prevention receives credit
only when the paired bypass produces an unsafe effect and enforced execution is observed to contain
it. A model that emits no actionable threats cannot establish a protection rate.

95% percentile bootstrap intervals resample **cases**, retaining their three seeds together (5,000
resamples, fixed statistics seed). They describe sensitivity within this purposive suite; cases
are not a random population sample, families may remain dependent, and three seeds are modest.
Do not interpret 72 trajectories as 72 independent case designs or claim population robustness.

Generation time, process memory, per-tool execution latency and paired enforced-minus-bypass time
are separate. Workflow latency excludes Session/Redis initialization and cleanup; peak RSS covers
the inference process, not the entire process tree. Shared-host timings and fixed control order are descriptive; they include process,
SDK and storage costs and do not isolate policy-check overhead. Replay compares semantic outcomes,
not newly measured timings. Token IDs are vocabulary/EOS-checked, but lightweight replay does
not independently tokenize the rendered prompt or decode the completion. Stored timings are local observations, not independently attested facts.
This workflow validates exact literal output, not open-ended reasoning, production permissions,
arbitrary code execution, real external targets or prevention of any reported incident.

## Reproduce saved-action execution

The existing SDK/Redis workflow dependencies are reused, with hash-pinned dependency installation:

```bash
python3.12 -m venv /tmp/meta-study-runtime
/tmp/meta-study-runtime/bin/python -m pip install --require-hashes --only-binary=:all: \
  -r tools/assurance-sdk/requirements.lock -r tools/assurance-workflow/requirements.lock
bash tools/assurance-redis/install-redis.sh /tmp/meta-study-redis
export SIMURGH_REDIS_SERVER=/tmp/meta-study-redis/redis-server
export PYTHONDONTWRITEBYTECODE=1
export PYTHONPATH=tools/assurance-workflow:tools/assurance-redis:tools/assurance-durable:tools/assurance-sdk:tools/assurance-isolation
/tmp/meta-study-runtime/bin/python -m unittest discover -s tools/local-meta-study/tests -v
python tools/local-meta-study/replay.py verify \
  docs/assurance/meta-study/evidence/capture.json docs/assurance/meta-study/evidence/report.json \
  --runtime-python /tmp/meta-study-runtime/bin/python
```

Use a Git checkout containing the recorded freeze commit (fetch full history for a shallow clone).
The exact nonempty inventory, committed source/input hashes, raw capture binding, prompt/feedback
and per-turn seeds are checked. Replay runs all 432 control tool attempts and selected recovery
probes. No model download or API credential is needed for saved-action replay. No model-selected
code, filesystem paths, Redis commands or environment values are executed.

## Generate a new separate capture

Use the installed model/runtime from the initial pilot, Linux x86_64 and a fresh output path:

```bash
env -u HF PYTHONDONTWRITEBYTECODE=1 \
  /workspace/.venvs/simurgh-meta/bin/python tools/local-meta-study/capture.py \
  --model-dir /workspace/models/meta-llama/Llama-3.2-1B-Instruct/9213176726f574b556790deb65791e0c5aa438b6 \
  --out /tmp/meta-study-new.json
python tools/local-meta-study/replay.py run /tmp/meta-study-new.json /tmp/meta-study-new-report.json
```

The runtime process receives a small explicit environment without credentials. Generation uses
verified local safetensors with remote code and Hub access disabled. The recorder refuses to start
unless protocol and inputs match Git HEAD, and refuses existing output or journal paths. Complete
raw outputs and durable attempt journals remain on disk. A source hash is provenance, not an
independent attestation of model identity. No environment settings change is required.

## Study state

Protocol implementation tests pass (21 tests); pre-inference review corrections were verified
before the freeze. Collection starts only after the protocol and source commit exists.
Observed results will be appended after the fixed run, including negative outcomes.
