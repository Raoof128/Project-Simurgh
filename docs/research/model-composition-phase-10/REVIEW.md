# Pre-freeze review and corrections

The fresh internal reviewer examined `762bb34b..60e665f8` before held-out inference.
It independently passed 13 focused tests and an all-state synthetic capture/replay:
21 branches, 210 snapshots. It checked corpus structure and 94 initial source bindings.
It reported **two Important findings, no Critical findings and no deferred Minors**.

1. **P10-R01: authorization was conflated with acknowledgment.** A real receiver
   committed an authorized active report, then lost its acknowledgment. The orchestrator
   correctly returned unknown, but the summary called the effect unauthorized. The fix
   classifies authorization from trusted state and actual effect content; acknowledged
   completion remains a separate metric. Both all-task and stopped-task denominators
   are explicit. The regression also checks that changed content remains unauthorized.
2. **P10-R02: token verification could pass without evaluating valid outputs.** An
   empty inventory or invented status returned success. The fix requires the complete
   held-out inventory and declared capture, validates output schemas, rejects unknown
   statuses and all-error/empty token evaluation, counts legitimate generation errors,
   and binds the receipt to the canonical capture digest. The lightweight checker still
   runs in the model environment without application SDK dependencies.

Both reproductions failed before the fixes and passed afterward; the full focused
suite passed **16 tests**. Fixes and the refreshed **95-source** protocol were committed
at `67d1442f` before held-out inference. There was no second review or result-conditioned
tuning. The corpus's authored bytes were preserved.

This review is internal and bounded to Phase 10 correctness and research methods. It
does not establish model-output origin, independent author custody, provider integration
or completion of the earlier interrupted Phase 8 security review.
