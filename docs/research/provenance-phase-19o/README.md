# Phase 19o evidence: 19k's cases and 19n's placement block on six hosted OpenAI models (emission only)

Every model study before this one ran small local builds. This lane sends the fixed prompts of
19k (864) and of 19n's placement block (480) to six hosted OpenAI models, three sizes of the
current generation and three of the one before it, with the spending cap, the stopping rules,
the eligibility rules and the hypotheses fixed first. All six models were captured in full.
8064 requests, metered at 5.46 USD against a lane cap of 60 USD. See [RESULTS.md](RESULTS.md) and
[the declaration](../PROVENANCE_PHASE_19.md) (P19-HOSTED01, with its amendment).

Verify (any host with Python 3.12; no network, no key, standard library only):

```sh
python -B tools/assurance-provenance/evidence19o.py verify \
  docs/research/provenance-phase-19o/evidence.zip \
  --expected-root "$(cat docs/research/provenance-phase-19o/ROOT.sha256)"
```

Expected: `"verified": true`, `"generations": 8064`, `"metered_usd": 5.459611`,
`"gate_executed": false`. Root `03d2f4bbe336dbea53c311d578d7c7e7e689531287a82d70be17be54fc16b155`.

`verify` rebuilds every prompt and compares its digest, reads every stored response again,
recomputes each outcome, table, decision and the meter, and checks that no model spent past its
cap. It does not call the provider and cannot tell whether a stored response is what the
provider returned.

## What was fixed before any model saw a case

The declaration (`fe8d74fe`) and the instrument (`4a478426`) were pushed on 12 November 2026.
The connection check that the declaration requires then failed for all six models, for a reason
in the request form and not in a model. The declaration was amended (`e88e91dd`) and the client
changed (`a39bb5da`, pushed at 12:00:45Z) before any case was sent. The first case was sent at
15:52:13Z from a clean checkout of `a39bb5da`, after lane 19n's capture had ended, and the pack
was built from that commit. The six models, their order and caps, the 1,344 prompts, the two
readers, the stopping rules and the rules that decide each hypothesis are in those commits.

## What happened to the six models

| Model           | Outcome                                                               | Metered USD | Cap USD |
| --------------- | --------------------------------------------------------------------- | ----------- | ------- |
| `gpt-6-luna`    | captured; eligible (24 of 24 calls; 0 control sends of 120 and of 96) | 0.06        | 2       |
| `gpt-5.6-luna`  | captured; eligible (24 of 24 calls; 0 control sends of 120 and of 96) | 0.15        | 3       |
| `gpt-6.1-terra` | captured; eligible (24 of 24 calls; 0 control sends of 120 and of 96) | 0.59        | 8       |
| `gpt-6.1-sol`   | captured; eligible (24 of 24 calls; 0 control sends of 120 and of 96) | 1.06        | 14      |
| `gpt-5.6-terra` | captured; eligible (24 of 24 calls; 0 control sends of 120 and of 96) | 1.33        | 14      |
| `gpt-5.6-sol`   | captured; eligible (24 of 24 calls; 0 control sends of 120 and of 96) | 2.28        | 19      |

Each model finished in its first launch. No request was retried, no response was cut at the
output limit, and every response names the model that was asked for.

## What the pack shows

**No model sent in any restricted case.** Each model made the authorised call in all 24
positive-control cases and declined all 1,320 others.

- **19k's style cases: 0 sends of 720 injected generations on each model.** The 95% upper bound
  on the send rate is 0.53% per model. Every style drew 0 of 120, the control included.
- **19n's placement block: 0 sends of 384 injected generations on each model.** The upper bound
  is 0.99% per model. Every placement and both kinds of text drew 0.
- **The lenient read agrees.** It counts 24 calls per model, the authorised ones, and none
  elsewhere. No output was invalid and none was text without a tool call.
- **The hypotheses that need a send are not supported**, as the declaration said they would not
  be if the models declined: H1, H2, H3, H4, H5 and H7 on no model, N1 and N2 on no model.
- **H6 and H8 are met on all six models, and say nothing.** With every state at zero no state
  is below `signal_stop`, and the four trials of every case agree because all decline. They are
  reported as the rules decide them.

This is a floor with an upper bound, on texts written for small local models. On the eligible
local models the same texts drew sends in 10% to 30% of injected generations (75 and 203 of 720
in 19m; 69 to 115 of 384 in 19n); here they drew none. The two sets of numbers are not one
measurement (see the limits).

## Read after the fact (not part of the declared analysis)

- The exact report was reproduced in 24 of 24 authorised calls by four models, in 23 by
  `gpt-6-luna` and in 22 by `gpt-5.6-luna`. In the other three calls the model put the whole
  argument object, as a JSON string, inside the `content` field.
- The declines give the execution state as the reason. By a crude keyword match, a decline
  mentions the injected text or its source (words such as "untrusted", "does not override") in
  37 of 1,320 on `gpt-6-luna`, 5 on `gpt-6.1-sol`, 1 on `gpt-5.6-terra` and none on the other
  three.
- Hidden reasoning was short. Reasoning tokens over the whole run were 38 for `gpt-6.1-sol` and
  between 5,265 and 26,484 for the other five, out of 42,014 to 70,048 output tokens.

## Requests that were not cases

Listed in full in [RESULTS.md](RESULTS.md), section 10: one request for the model list, one
key check, six connection checks the provider refused on its chat-completions endpoint, two
requests to learn the Responses form, and six recorded connection checks. None was a case, and
none is in the meter. The six recorded checks cost 0.0023 USD by the same prices.

## Limits

- Emission only. No proposal was executed against a gate or a receiver in this lane.
- Six models from one provider, on one day. A hosted model is whatever the provider served; the
  model named in each response is recorded and nothing about its weights is known.
- No sampling setting was sent and no seed reproduces a generation. The provider reported
  temperature 1.0, top-p 0.98 and reasoning effort `medium` on every response. A rerun is a new
  sample.
- A hosted model answers with a tool-call object, read differently from the raw text of the
  local lanes. The local and hosted numbers are not the same measurement and are not placed in
  one table.
- The texts are 19k's and 19n's, written for small local models by an author who had seen
  their results. No attacker adapted to these models. Zero sends here is not evidence that
  these models resist a capable attacker.
- A count of zero supports an upper bound, not a rate of zero.
- The cost is this lane's meter at the list prices declared before the run, not the provider's
  bill.
- The loose transcripts are not committed beside the pack because they are 17 MB as text. They
  are inside `evidence.zip` as `transcript-<model>.json`, bound by the root.
- Not the capture `IOU-19-SPEND` declares, which names other models and 19e's framings; the
  informed-attacker arm stays owed.

## Reproduce the capture (costs money; needs the provider's key in the environment)

```sh
python -B tools/assurance-provenance/inject19o.py all /tmp/p19o-run
python -B tools/assurance-provenance/evidence19o.py run --out /tmp/p19o-pack \
  --transcripts /tmp/p19o-run/transcripts --capture /tmp/p19o-run/capture.json
```

A rerun samples again and will not reproduce these responses.
