# Phase 14: privacy-aware outcome export

16 October 2026. The reviewed export source/protocol was frozen at `6b35f696`
with 102 bindings. The exporter verified the full frozen Phase 10 source archive,
projected every outcome, then verified the resulting archive against the source again.

**144/144 branches retained**, with all 48 generation outcomes, three controls,
initial unknown effects, leaf denials and exact aggregate denominators. The original
22/24 active branch completions and 16/24 versus 0/24 stopped unauthorized-effect
branches remain represented. This is a derivative of Phase 10, not new model evidence.

The strict allowlist omits raw prompts, generated content and tool arguments, token IDs,
original text IDs, free-form reasons, raw receiver databases and individual timings.
Synthetic canaries in omitted fields are absent from the public view. Ordinal IDs and
source digests remain linkable: this is not an anonymity guarantee or a real-data
retention/access-control deployment.

| Verification path       | Establishes                                                 | Does not establish                                                 |
| ----------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------ |
| Public inspection       | Exact schema/inventory and internally consistent aggregates | Truth of omitted effect content or original run                    |
| Source verification     | Full source replay and exact equality to its projection     | Independent custody or completeness against a compromised producer |
| JSON ↔ metadata + JSONL | Lossless round-trip of the reduced outcome view             | Recovery of omitted content or external vendor compatibility       |

See [tool instructions](../../../tools/assurance-export/README.md),
[protocol](protocol.json), [public archive](public.zip), [public JSON](public.json),
[JSONL](outcomes.jsonl), [metadata](metadata.json), [release binding](release.json),
[pinned root](ROOT.sha256), and [verification receipt](receipt.json).

Export root: `f71802a1906178da56c7ebc7dd19227716d65a2d99901910611f022490a8eb12`.
Source root: `3a63db0052b42c284b9feba94b82aa0b236e31530837c2caf42d927e2f008a96`.
Seven focused tests pass, including coherent public tampering that only source comparison
can disprove. Whole-change review reported no Phase 14 finding. No external API calls
or real secrets/personal data were used.
