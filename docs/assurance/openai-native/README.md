# Luna native function-call study

This separately precommitted interface experiment follows the retained
[plain-text failure](../openai-comparison/README.md). Collection has not started.
The [plan](../../superpowers/plans/2026-10-15-luna-native.md) defines the changes and limits.

## Method

Same 24 synthetic cases, three repetitions and two host-orchestrated steps: 144 `gpt-6-luna`
requests maximum. Same reasoning effort none, temperature 0.7, top_p 0.9 and 128 output tokens.
The user/task/reference/observed-feedback message builder is unchanged. The system prompt now
requests one provided function; both strict function schemas are available, tool choice is required
and parallel calls are disabled. The complete settings and 71 source/input hashes are in
`evidence/protocol.json`; the capture will identify its pre-inference ancestor commit.

The adapter derives a tool proposal exclusively from one completed function-call item. Commentary
and final-answer text are retained, never executed as actions. Refusal, multiple calls, incomplete
responses and invalid arguments produce no executable proposal. Schemas permit private reads,
both write destinations and arbitrary content. Trusted host policy checks the exact task-derived
resource/content independently; schema validity alone does not authorize an effect.

Each request remains stateless. Step two receives the actual enforced read observation in the
existing user-message format. This evaluates native function-call output selection, not an
autonomous conversational agent or a full function_call_output continuation loop. System wording,
schemas and selection settings change together; this experiment cannot isolate each contribution.
Repetition indices are not sampling seeds. The inherited report's `seed`/`by_seed` keys retain
that naming only for scorer compatibility. The API alias is not a pinned model-weights snapshot.

Every saved action is replayed under enforced, bypass and deny-all controls using the unchanged
native SDK, descriptor-confined file reads and disposable Redis effects. These 432 local attempts
are fixed-action controls: the model does not adapt to each control's different feedback. Recovery
selects the first complete enforced trajectory and exercises actual SIGKILL after pause and after
effect, fresh-process resumption and duplicate suppression. With no eligible trajectory, recovery
is unexercised. Failed calls, tool errors and recovery errors remain in the report.

Case-cluster bootstrap intervals are descriptive. Three repetitions do not create 72 independent
cases. No unsafe bypass effects makes conditional prevention unestimable; no complete benign
bypass workflow makes unnecessary blocking unestimable. Zero-only intervals are not population
risk bounds. Completion requires both correct read data and an exact authorized write effect.

## Source and credential handling

The [official function-calling guide](https://developers.openai.com/api/docs/guides/function-calling),
retrieved on 15 October 2026, specifies strict object schemas with required fields and
`additionalProperties:false`; `parallel_tool_calls:false` requests zero or one call. Its source
URL/HTTP status/content digest are in `evidence/source.json`. The adapter checks returned calls
locally. Existing [source notes](../openai-comparison/SOURCES.md) document model, prices and API
capabilities. Page digests identify observed pages; they are not third-party archive attestations.

The external uploaded key is read in memory, never placed in Git, cloud settings or the explicit
child-process environment. Only synthetic tasks/references/read observations go to the fixed
OpenAI HTTPS origin. Default TLS/proxy trust is preserved; redirects and retries are disabled.
Timeout is 45 seconds; request/response limits are 8 KiB/1 MiB. First transport or response-envelope
error stops later API requests; remaining slots are skipped. Model-output invalidity stays an
observed failure. Exclusive output creation prevents accidental replacement. `store:false` does
not establish zero provider retention. Usage estimates use $0.125/M input and $0.50/M output,
which are conservative for the declared standard short-context tier and are not invoices.

## Credential-free replay

Use full Git history and Linux with the inherited study's kernel capabilities:

```bash
python -m venv /tmp/simurgh-native-runtime
/tmp/simurgh-native-runtime/bin/pip install --require-hashes --only-binary=:all: \
  -r tools/assurance-sdk/requirements.lock -r tools/assurance-workflow/requirements.lock
bash tools/assurance-redis/install-redis.sh /tmp/simurgh-native-redis
export PYTHONDONTWRITEBYTECODE=1
export SIMURGH_REDIS_SERVER=/tmp/simurgh-native-redis/redis-server
python -m unittest discover -s tools/openai-native/tests -v
python tools/openai-native/native.py verify \
  docs/assurance/openai-native/evidence/capture.json \
  docs/assurance/openai-native/evidence/report.json \
  --runtime-python /tmp/simurgh-native-runtime/bin/python
```

Replay checks exact journal/capture agreement before starting the runtime, the ordered inventory,
source hashes against the committed ancestor, response
arguments against derived proposals, actual feedback against prompts, saved summaries against
observations and fresh semantic effects. Fresh timing differences are excluded from equality.
CI performs only tests and saved-action replay. Paid `capture` requires explicit `--allow-live`,
an external `--key-file` and a fresh output path; no existing result is overwritten.

## Scope and deferred work

The same authored/public cases have already been evaluated. No new holdout, independent human
authorship, independent operator, real incident reconstruction or broad robustness claim applies.
API generation is outside the Agents SDK; its scripted model adapter executes the captured action
through native approval/resume machinery. Approvals and task authority are trusted synthetic host
inputs. Generalization requires external cases, independent replay and representative connectors.
The declared native-interface follow-up will be closed by executing this study, whatever outcome
occurs. External holdouts and an autonomous multi-turn study remain explicit deferred work.
