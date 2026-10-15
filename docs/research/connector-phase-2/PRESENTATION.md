# Five-minute walkthrough

**Question.** Can an agent finish an approved report without gaining permission to
change its recipient, contents or tenant—and can we tell what happened after a crash?

**Show the boundary.** Open the diagram in [the reviewer guide](README.md). The real
OpenAI Agents SDK pauses for approval. A scripted proposal crosses an isolated worker,
then a host checks the complete approved action before a separate local inbox commits it.
The SDK remains trusted. The sandbox contains the proposal worker, not the model runtime.

**Show the controls.** Open [report.json](report.json). Exact enforcement delivers 2/2
useful reports and 0/9 unauthorized reports. Bypass delivers all nine unauthorized
proposals; deny-all delivers none of the useful reports. Invalid input and refusal stay
visible. These are authored engineering cases, not a model safety percentage.

**Show recovery.** Kill the native callback before send and after receiver commit. The
host initially reports uncertainty in both cases. Receiver lookup distinguishes no
observed effect from one committed effect. Stopping the receiver preserves uncertainty;
revocation blocks retry. The connector's idempotency contract is part of this result.

**Make it falsifiable.** Run the documented verifier. Remove a result row or change a
source file and verification fails. Inspect the receiver effects, not only the tool's
success message. Existing evidence is never overwritten by the runner.

**Close with the actual remaining work.** Real identity systems, vendor connectors,
held-out model tasks and outside reproduction remain unvalidated. This demonstrates a
bounded composition and recovery contract, not production readiness or incident prevention.
