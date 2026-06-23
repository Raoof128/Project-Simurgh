# Stage 3X Evidence — Public VCA Timeline & External Reproduction Packet

> **Crown:** Stage 3X does not claim new containment capability or uniform full reproduction across
> all historical rungs. It demonstrates that the public VCA release chain is tag-and-commit pinned,
> tier-classified by actual replay surface, partially evidence-hash re-verifiable offline, and
> externally reproducible through a single reviewer command.
>
> **Headline:** 3X turns the VCA chain into a public replay map — all 12 rungs are tag-and-commit
> pinned, 10/12 have evidence-root manifests pinned and chain-checked, 3/12 have full reproduce
> paths, current-format manifests are deep re-walked under strict containment rules, and 2/12 are
> index-only with signed reasons.
>
> **Sacred non-claim:** 3X does NOT reduce `live_capture_origin_self_reported`.

## Chain summary (signed)

| Property                                         | Count |
| ------------------------------------------------ | ----- |
| rungs total                                      | 12    |
| tag + commit pinned                              | 12    |
| evidence-root pinned & chain-checked             | 10    |
| deep per-file re-walk available (current-format) | 5     |
| full reproduce available                         | 3     |
| index-only (signed reasons)                      | 2     |

Three honest layers: **evidence_root_digest** (the committed manifest file is unchanged since 3X
signed it — all 10), **strict deep re-walk** (every listed file digest matches under hardened
containment rules — current-format manifests only, 5), **stage-native reproduce** (the stage's own
script passes — 3V/3V-B/3W). Legacy/cross-stage manifests (3N/3O/3P/3Q/3S) are root-pinned, not
deep-walked, because their historical path conventions would require relaxing the containment guard.

## File inventory

| File                                                   | What it is                                                                                    |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `timeline.index.json`                                  | The signed `simurgh.vca.public_timeline.v1` index (12 rungs + chain_summary + claim_summary). |
| `timeline.signature.json`                              | Ed25519 signature over `canonicalJson(index)` (3X key).                                       |
| `vca-chain-reproduction-results.json`                  | Output of the reviewer command (tier + evidence-root + deep summaries, all separated).        |
| `provenance.json`                                      | Stage provenance summary.                                                                     |
| `self-proof-results.json`                              | Tamper self-proof output (all rejected).                                                      |
| `evidence-hashes.json`                                 | SHA-256 of every other evidence file (excludes itself).                                       |
| `keys/stage3x-public-key.json`, `keys/fingerprint.txt` | Public key + fingerprint (private key never committed).                                       |

## Reproduce offline (one command, no network)

Use a **full clone** (or run `git fetch --tags` first if you used a shallow/tag-only clone): Stage
3X verifies 12 historical release tags, so those tags must be present locally. The command performs
no network access itself; if tags are missing it stops with a clear instruction rather than failing
cryptically.

```bash
git clone https://github.com/Raoof128/Project-Simurgh.git
cd Project-Simurgh
npm ci
scripts/reproduce-vca-chain.sh
```

Verifies the signed timeline, then for each rung: re-resolves tag→commit, recomputes the
evidence-root digest vs the signed value, deep-walks current-format manifests under strict
containment, and runs the reproduce-tier stage scripts. No Sigstore, no `gh`, no network.
