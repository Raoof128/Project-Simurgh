# Errata — egress study README

**2026-11-01.** README line 87 states "No namespace/firewall claim" and the executor note records
that namespace setup was unavailable. Both stay as written: they describe that study and that
executor. Phase 19d (`docs/research/provenance-phase-19d/`) later ran a worker inside a Linux user
and network namespace with no route and a parent-owned Unix-socket proxy as its only path, with
per-namespace kernel counters as the canary. That is a scoped namespace claim for Phase 19d's lane
on its host; it does not retroactively change what this study measured or claimed.
