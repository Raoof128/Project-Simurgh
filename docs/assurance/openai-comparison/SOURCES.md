# OpenAI API sources checked on 15 October 2026

- [Luna 6 model](https://developers.openai.com/api/docs/models/gpt-6-luna):
  exact API model `gpt-6-luna`; reasoning effort supports `none`; Responses API supported.
  Text prices per million tokens: input $0.10, cached input $0.01, cache writes $0.125,
  output $0.50. Longer contexts and some service tiers have different rates.
- [Pricing](https://developers.openai.com/api/docs/pricing): standard short-context rates used
  for estimates; no billing or hard account spend-limit claim.
- [Create response](https://developers.openai.com/api/reference/resources/responses/methods/create):
  maximum output tokens includes reasoning tokens; response status and usage are retained.
- [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs):
  available as a separate interface intervention. This study retains the prior
  plain-text JSON prompting and strict local parser without repair.

All four pages returned HTTP 200. The accompanying `evidence/sources.json` records fetched URLs,
page byte lengths and SHA-256 digests. HTML snapshots remain local research scratch files; hashes
identify the observed pages but do not provide archived third-party attestation of their content.
An authenticated, read-only model listing returned HTTP 200 and included `gpt-6-luna` before
inference. Its sanitized availability record contains no key or account identifiers.

`store:false` is a request setting, not a promise of zero provider retention. This study sends
only existing synthetic tasks, reference text and local synthetic read observations.
