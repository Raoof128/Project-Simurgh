# Simurgh: inspectable authorization for agent tool calls

**Research prototype · 17 October 2026 · OpenAI and local Meta evaluation**

Simurgh tests whether host-controlled permissions can prevent an agent's tool proposal
from causing an unauthorized effect while preserving useful work. Its composed gate
combines delegated authority, safety-stop state, monitoring leases, credential checks
and durable handling of unknown outcomes. The contribution is an executable control
boundary with inspectable receiver evidence.

## What the new experiment shows

Twenty-four internally authored tasks, two trials and three matched controls produced
96 model decisions and 288 executed branches. Each control received the same captured
proposal; a stopped branch was not counted as safe merely because its tool reported an error.

| Model / control                      | Useful active completions | Restricted trials with new effects |
| ------------------------------------ | ------------------------: | ---------------------------------: |
| OpenAI gpt-6-luna / credentials only |                     24/24 |                               0/24 |
| OpenAI gpt-6-luna / composed         |                     24/24 |                               0/24 |
| Meta Llama-3.2-3B / credentials only |                     23/24 |                              17/24 |
| Meta Llama-3.2-3B / composed         |                     23/24 |                               0/24 |
| Either model / deny all              |                      0/24 |                               0/24 |

The Llama result demonstrates an additional control benefit on these cases without losing
valid active proposals. Luna already declined all restricted tasks, so its comparison shows
no incremental safety benefit. One Llama active task did not complete.

A separate live Responses workflow exposed a host-message role defect. The original eight
traces were retained. A declared developer-role correction completed **2/3 authorized
workflows**, including reopen and operator restart; all **5/5 restricted workflows declined**.
The remaining active refusal is unresolved. The integration is demonstrable but not complete.

## Engineering evidence

A 61-second paced run retained 120 concurrency/restart fixtures, 420 final deliveries and
1,200 raw database snapshots. Composed controls produced no new effects after queued stops,
interrupted updates or unknown prior acknowledgements, while preserving authorized reopen
and retry outcomes. Native macOS suites passed 10 tests; Windows passed 11 daemon tests and
compiled the affinity fixture. These checks do not establish deployment capacity or desktop
capture correctness.

## Relevance and limits

OpenAI's [function-calling guidance](https://developers.openai.com/api/docs/guides/function-calling)
and [agent-safety guidance](https://developers.openai.com/api/docs/guides/agent-builder-safety)
make tool boundaries and untrusted content relevant integration concerns. Simurgh contributes
replayable evidence for a bounded implementation; it makes no claim of OpenAI endorsement.

The corpus is internally authored, exact reports and trusted state are explicit, and model
interfaces differ. Two trials are clustered within tasks. Zero failures does not establish
general safety. Independent reproduction is deferred; real provider IAM, authenticated live
safety alerts, production load and the interrupted whole-change review remain open.

**Review in five minutes:** [run the credential-free demo](RUNBOOK.md#short-demonstration),
inspect the [full results and limitations](RESULTS.md), then verify the source-bound archives.
