# Stage 5L · VTC-Q — independent verification — raw results

## Run 1 — local

`node --version`: `v22.16.0`
`hostname`: `Raoufs-MacBook-Air.local`
`uname -a`: `Darwin Raoufs-MacBook-Air.local 25.5.0 Darwin Kernel Version 25.5.0: Tue Jun  9 22:27:52 PDT 2026; root:xnu-12377.121.10~1/RELEASE_ARM64_T8112 arm64`

Command: `bash run.sh`

Raw output:
```
== VTC-Q — independent verification ==
v22.16.0
-- verify committed pack: core-positive (public + audit) --
tier=public raw=0 reason=verified
tier=audit raw=0 reason=verified
-- verify committed pack: quorum-confirmed-stub (public + audit) --
tier=public raw=0 reason=verified
tier=audit raw=0 reason=verified
-- commitment_session_id to anchor --
sha256:3ee8a8c9b8d7ea805fdb4bae192d86d11c22192855526d95761f4b87d89828e8

All tiers above must print raw=0. To add a de-identified public witness (stronger, still anonymous):
  pip3 install opentimestamps-client   # provides 'ots'
  ots stamp ./pack/ANCHOR_ME.txt        # writes ANCHOR_ME.txt.ots
  # hours later:  ots upgrade ./pack/ANCHOR_ME.txt.ots   (Bitcoin-confirms)
Send back: your verify log + ANCHOR_ME.txt.ots (if you anchored). NEVER any *.pem.
```
exit=0

## Run 2 — droplet

Pack copied to droplet first (did not previously exist there):
```
$ scp -i ~/.ssh/eoi_droplet_ed25519 -o StrictHostKeyChecking=no -r ./stage5l-vtcq-droplet eoiadmin@170.64.167.95:~/stage5l-vtcq-droplet
```

Access note: droplet SSH is now key-only (`eoiadmin@170.64.167.95` via `~/.ssh/eoi_droplet_ed25519`);
the root password no longer works over SSH (DigitalOcean web console only). Node is installed under
`/root/.nvm/versions/node/v26.5.0/bin/node` (root's nvm); `/root` is not traversable by `eoiadmin`
directly, so the run was invoked via passwordless `sudo`:

```
$ cd ~/stage5l-vtcq-droplet && sudo env PATH=/root/.nvm/versions/node/v26.5.0/bin:$PATH bash run.sh
```

`node --version` (as run): `v26.5.0`
`hostname`: `Nexus`
`uname -a`: `Linux Nexus 6.8.0-134-generic #134-Ubuntu SMP PREEMPT_DYNAMIC Fri Jun 26 18:43:11 UTC 2026 x86_64 x86_64 x86_64 GNU/Linux`

Raw output:
```
== VTC-Q — independent verification ==
v26.5.0
-- verify committed pack: core-positive (public + audit) --
tier=public raw=0 reason=verified
tier=audit raw=0 reason=verified
-- verify committed pack: quorum-confirmed-stub (public + audit) --
tier=public raw=0 reason=verified
tier=audit raw=0 reason=verified
-- commitment_session_id to anchor --
sha256:3ee8a8c9b8d7ea805fdb4bae192d86d11c22192855526d95761f4b87d89828e8

All tiers above must print raw=0. To add a de-identified public witness (stronger, still anonymous):
  pip3 install opentimestamps-client   # provides 'ots'
  ots stamp ./pack/ANCHOR_ME.txt        # writes ANCHOR_ME.txt.ots
  # hours later:  ots upgrade ./pack/ANCHOR_ME.txt.ots   (Bitcoin-confirms)
Send back: your verify log + ANCHOR_ME.txt.ots (if you anchored). NEVER any *.pem.
```
exit=0

## Summary — Run 1/2

All four checks (`core-positive` public+audit, `quorum-confirmed-stub` public+audit) reproduce `raw=0`
on two independent machines with two independent Node builds (v22.16.0 local, v26.5.0 droplet). The
`commitment_session_id` digest to anchor
(`sha256:3ee8a8c9b8d7ea805fdb4bae192d86d11c22192855526d95761f4b87d89828e8`, from `pack/ANCHOR_ME.txt`)
is byte-identical on both.

## Run 3 — local, OpenTimestamps stamp

`ots --version`: `v0.7.2` (`/opt/anaconda3/bin/ots`)

Command: `ots stamp ./pack/ANCHOR_ME.txt`

Raw output:
```
Submitting to remote calendar https://a.pool.opentimestamps.org
Submitting to remote calendar https://b.pool.opentimestamps.org
Submitting to remote calendar https://a.pool.eternitywall.com
Submitting to remote calendar https://ots.btc.catallaxy.com
```
exit=0

`./pack/ANCHOR_ME.txt.ots` written (735 bytes).

## Run 4 — droplet, OpenTimestamps stamp

`ots --version`: `v0.7.2` (`/usr/local/bin/ots`)

Command: `ots stamp ./pack/ANCHOR_ME.txt`

Raw output:
```
Submitting to remote calendar https://a.pool.opentimestamps.org
Submitting to remote calendar https://b.pool.opentimestamps.org
Submitting to remote calendar https://a.pool.eternitywall.com
Submitting to remote calendar https://ots.btc.catallaxy.com
```
exit=0

`~/stage5l-vtcq-droplet/pack/ANCHOR_ME.txt.ots` written (735 bytes).

## Summary — Run 3/4

Both proofs are freshly stamped (pending Bitcoin confirmation, typically several hours). Once confirmed,
`ots upgrade ./pack/ANCHOR_ME.txt.ots` will be run on each machine; the send-back set is the `run.sh`
verify log plus `pack/ANCHOR_ME.txt.ots`. A confirmation check will be appended here once `ots upgrade`
reports `Success! Timestamp complete` on both.

## OpenTimestamps confirmation — local

Command: `ots upgrade ./pack/ANCHOR_ME.txt.ots`

Raw output:
```
Got 1 attestation(s) from https://btc.calendar.catallaxy.com
Got 1 attestation(s) from https://bob.btc.calendar.opentimestamps.org
Got 1 attestation(s) from https://alice.btc.calendar.opentimestamps.org
Calendar https://finney.calendar.eternitywall.com: Pending confirmation in Bitcoin blockchain
Success! Timestamp complete
```
exit=0

`ots info ./pack/ANCHOR_ME.txt.ots` (upgraded proof, key lines):
```
File sha256 hash: 6e1dd226b872bb0ff23a36a68dd1203cc1e8e94d20ad6f5133f70a21f4c3ca34
...
verify BitcoinBlockHeaderAttestation(957689)
# Bitcoin block merkle root b0d4a6ce66e071d0de1d917369a64715df79fa1b7a1ed32cfaa2d82acae83c69
# Transaction id 790976cb10cd3ee9fe6adacbd06fda3756dfafe6b4c8f859f5ab33a09b77c2f0
    verify PendingAttestation('https://bob.btc.calendar.opentimestamps.org')
...
verify BitcoinBlockHeaderAttestation(957690)
# Bitcoin block merkle root 9ba9935400c02ba76aa35ba687b9e98d23f520dfb333d796ca9aaa2a8ac5c7f7
# Transaction id 75f3b881b89dbabe85ce9c0858dbd1bbcea9a071970f3a54853d867d0588df40
...
verify BitcoinBlockHeaderAttestation(957688)
# Bitcoin block merkle root d3964d906fb18def9b38140445952b7b2437aff504d459fc56825267c94d7189
# Transaction id 82ae376a40521ad7d399be8b53797dd814685daae231a5c635b5efb47ea96d52
...
verify PendingAttestation('https://finney.calendar.eternitywall.com')
```

## OpenTimestamps confirmation — droplet

Command: `ots upgrade ./pack/ANCHOR_ME.txt.ots`

Raw output:
```
Got 1 attestation(s) from https://btc.calendar.catallaxy.com
Got 1 attestation(s) from https://alice.btc.calendar.opentimestamps.org
Got 1 attestation(s) from https://bob.btc.calendar.opentimestamps.org
Calendar https://finney.calendar.eternitywall.com: Pending confirmation in Bitcoin blockchain
Success! Timestamp complete
```
exit=0

`ots info ./pack/ANCHOR_ME.txt.ots` (upgraded proof, key lines):
```
File sha256 hash: 6e1dd226b872bb0ff23a36a68dd1203cc1e8e94d20ad6f5133f70a21f4c3ca34
...
verify BitcoinBlockHeaderAttestation(957689)
# Bitcoin block merkle root b0d4a6ce66e071d0de1d917369a64715df79fa1b7a1ed32cfaa2d82acae83c69
# Transaction id 790976cb10cd3ee9fe6adacbd06fda3756dfafe6b4c8f859f5ab33a09b77c2f0
    verify PendingAttestation('https://alice.btc.calendar.opentimestamps.org')
...
verify BitcoinBlockHeaderAttestation(957688)
# Bitcoin block merkle root d3964d906fb18def9b38140445952b7b2437aff504d459fc56825267c94d7189
# Transaction id 82ae376a40521ad7d399be8b53797dd814685daae231a5c635b5efb47ea96d52
    verify PendingAttestation('https://bob.btc.calendar.opentimestamps.org')
...
verify BitcoinBlockHeaderAttestation(957690)
# Bitcoin block merkle root 9ba9935400c02ba76aa35ba687b9e98d23f520dfb333d796ca9aaa2a8ac5c7f7
# Transaction id 75f3b881b89dbabe85ce9c0858dbd1bbcea9a071970f3a54853d867d0588df40
...
verify PendingAttestation('https://finney.calendar.eternitywall.com')
```

Three of four calendar branches (`catallaxy` → block 957689/957689, `bob` → block 957690, `alice` →
block 957688) confirmed on both machines with matching block heights, merkle roots, and transaction ids
— same calendar-batching behavior observed for the Stage 5J and 5K proofs. The `finney` branch remains
pending on both — not required, since three confirmed calendar attestations already satisfy
`Success! Timestamp complete`.

Updated `./pack/ANCHOR_ME.txt.ots` files (post-upgrade, Bitcoin-confirmed) are ready to accompany the
`run.sh` verify log in the send-back set on both machines.
