# Stage 5F VMP — droplet setup (independent reproduction)

Cross-arch, offline, verify-only. No models are downloaded for the conformance kit (it is verify-only);
model downloads are only for the optional Lane C capture (`../lanec/README.md`).

```bash
# x86_64 or arm64 droplet
curl -fsSL https://raw.githubusercontent.com/nodesource/distributions/main/... # install Node 26
git clone <repo> && cd Project-Simurgh
git checkout <tag-or-branch>
bash tools/simurgh-attestation/stage5f/conformance-pack/run.sh "$(pwd)"
```

If `git diff` in the byte-stability step is non-empty, you are almost certainly not on Node 26 — the
canonical JSON is deterministic across arch but the closeout was frozen under Node 26.
