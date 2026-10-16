# Phase 7: durable context and delegated authority

This synthetic engineering experiment tests local controls across context changes.
It uses native Agents SDK approval/resume, isolated workers, two owned loopback
receivers and trusted host state. No model inference, actual OpenAI compaction or
Agents API subagent is involved. Read the [design and lifecycle](../CONTEXT_PHASE_7.md)
and [source-backed motivation](../OPENAI_NEEDS_2026-10-16.md).
Published outcomes follow the source/protocol freeze and retained execution.

## Reproduce

Linux x86_64, Python 3.12 and full Git history are required. From the repository root:

```bash
python3.12 -m venv /tmp/simurgh-context-venv
/tmp/simurgh-context-venv/bin/python -m pip install --require-hashes --only-binary=:all: \
  -r tools/assurance-sdk/requirements.lock -r tools/assurance-workflow/requirements.lock
/tmp/simurgh-context-venv/bin/python -m pip check
PYTHONDONTWRITEBYTECODE=1 /tmp/simurgh-context-venv/bin/python -m unittest discover \
  -s tools/assurance-context/tests -v
PYTHONDONTWRITEBYTECODE=1 /tmp/simurgh-context-venv/bin/python \
  tools/assurance-context/evidence.py verify docs/research/context-phase-7/evidence.zip \
  --expected-root "$(cat docs/research/context-phase-7/ROOT.sha256)"
```

Obtain the expected root from a trusted checkout or separately retained receipt.
An archive and its own root supplied together by an untrusted party do not authenticate
one another. Verification checks the source/protocol Git commit, exact identities,
all raw controller tables/schema and receiver observations, then replays every row.
It does not authenticate custody or completeness against a malicious trusted host.

For a new retained execution, first commit the declared protocol and source hashes,
then run `evidence.py run --out /absolute/new/directory`. Existing directories are
refused. Keep any `failure.json`, partial rows and raw databases; do not overwrite
failed published runs. Development fixtures and published execution are separate.

## Application boundary

`ContextGate` stores exact action grants, parentage, source, known failures and
admitted attempts. `resume` verifies a host-owned checkpoint; summary fields are
compared with the durable projection and cannot modify it. The `note` field is
never parsed as authority. A dishonest structured summary can be flagged while
legitimate work still proceeds; this is not general natural-language lie detection.

Only the trusted orchestrator selects the session actor and provisions the registry.
Those methods and the underlying hosts must remain unavailable to model code.
`Session.dispatch` is the effect boundary; `Session.delegate` accepts only registered
children and subsets of the existing grant. Source changes permanently revoke the
old grants, even when the source label later returns to its former value. A new task
with fresh authorization is needed to restore work. Ancestor revocation is checked
at admission; already admitted work may still finish afterward.

The shared budget counts distinct admitted actions, including unknown and blocked
remote outcomes. No refund, automatic resend or retry is provided. A process crash
after reservation leaves an unknown attempt even if the receiver never saw it.
This conservatively sacrifices availability; no distributed cancellation or durable
state rollback protection is claimed. Blocking facts cannot be cleared by summaries.

The trusted ledger, host process, actor routing, registry and checkpoint custody are
outside the threat model. Native SDK workers are isolated; this does not establish
isolation for Agents API subagents sharing filesystems or credentials. The local-only
comparison applies exact action authorization but ignores the new context/lineage
admission boundary. Neither policy demonstrates model recognition of broken tasks.
