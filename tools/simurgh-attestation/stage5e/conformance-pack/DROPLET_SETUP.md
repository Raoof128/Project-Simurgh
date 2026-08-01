# Fresh Ubuntu droplet setup

Run this kit as a non-root user where possible. Use SSH keys instead of a reusable root password.

## 1. Copy the ZIP from your machine

```bash
scp simurgh-vda-conformance.zip USER@DROPLET_IP:~/
ssh USER@DROPLET_IP
```

## 2. Install prerequisites on the droplet

```bash
sudo apt-get update -qq
sudo apt-get install -y unzip libatomic1 python3 curl ca-certificates

curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm install 26
nvm use 26

node -v
python3 -V
```

Review downloaded installation scripts before executing them when operating under stricter security
policy. Node 20 or newer is supported; Node 26 is recommended for the byte-stability check.

## 3. Install Lean (optional, closes the type-check gap in step 6/6)

Without `lean` on `PATH`, step 6/6 still runs the escape-hatch source scan (no toolchain required)
but skips the type-check, deferring it to CI. `scripts/check-lean-proofs.mjs` invokes plain `lean
<file>` from the kit root, which has no `lean-toolchain` of its own — so the pinned version has to
come from elan's _default_ toolchain, not directory-based resolution. Installing elan and setting
its default to the version pinned in `proofs/stage5e/lean-toolchain` makes this run type-check for
real:

```bash
curl https://elan.lean-lang.org/elan-init.sh -sSf | sh -s -- -y --default-toolchain leanprover/lean4:v4.15.0
source "$HOME/.elan/env"

lean --version
```

Review the script before piping it to `sh` under stricter security policy. If `proofs/stage5e/lean-toolchain`
ever pins a different version, install and default to that version instead — check the file's
contents rather than assuming `v4.15.0`.

**If `node` only exists under root's `nvm` and you run `run.sh` via `sudo` for that reason,** also
pass `HOME` pointing at the account elan was installed under — `sudo` resets `$HOME` to `/root`, and
elan resolves its toolchain from `$HOME/.elan`, so a bare `sudo env PATH=...` finds no toolchain even
though `lean` is on `PATH`:

```bash
sudo env HOME=/home/USER PATH=/root/.nvm/versions/node/vX.Y.Z/bin:/home/USER/.elan/bin:$PATH bash run.sh
```

## 4. Extract and run

```bash
unzip -o simurgh-vda-conformance.zip
cd simurgh-vda-conformance
bash run.sh 2>&1 | tee "vda-conformance-$(hostname)-$(date +%Y%m%d).log"
```

The command must exit `0`. Confirm the log contains `unit OK`, `K7 OK`, and
`== Stage 5E VDA reproduce: ALL PASS ==`. If any command fails, send the full log rather than only its
last line.
