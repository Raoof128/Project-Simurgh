# Descriptor-scoped isolation experiment

User authorization: implement filesystem/IPC isolation and selective network permissions after
the ingress-only experiment. Preserve all eight earlier source/report families. This phase is a
bounded executable experiment, not an arbitrary-application sandbox or deployment.

Landlock's ABI query (`syscall(444, NULL, 0, 1)`) returned -1/ENOSYS here. Namespace provisioning
was already unavailable. Do not change platform policy. A path-allowlist implementation using
seccomp pointer inspection would be unsound. Instead, trusted bootstrap opens exact input/output
files and connects exact loopback TCP peers before worker execution. A new default-deny seccomp
profile permits read/write only on those direction-specific descriptors plus reporting pipes.
No path opens, directory access, file-backed mmap, descriptor import/duplication, new connections,
signals, shared-memory IPC, exec or filter changes are permitted. Fork inherits the same profile.
Anonymous private mmap supports the already-loaded interpreter. This is an object-capability style
experiment using established Linux mechanisms, not a new isolation primitive.

The trusted single-threaded Python bootstrap imports code before enforcement, validates regular
file access modes, validates connected TCP family/type/peer, rejects socket/file standard streams
except reporting pipes (stdin /dev/null), closes every unlisted descriptor, then installs and probes
the profile before running a scripted task. Input/output/socket descriptors are distinct. Parent
provisioning, imported code and the kernel remain trusted; no native mandatory launcher claim.

Use three controls: identical provisioned/sanitized worker without our filter; capability-filtered
worker; deny-all/no worker. Compare real file read-back, collector bytes, target-process signal
observation and worker results. Useful transform/write and IPv4/IPv6 TCP exchanges must succeed.
Every claimed blocked adversarial channel needs a delivering baseline. Reject missing prerequisites,
timeouts, broken observers, mismatched result schemas and incomplete matrices. Test raw syscalls,
unsupported ABI, inherited descriptors, fork inheritance, setup rejection and report tampering.

Approved output and approved socket payloads are explicit negative controls: connection authority
does not authorize or sanitize content. The parent can relay output elsewhere, and an approved peer
can proxy data onward. No endpoint DNS/TLS identity, dynamic reconnect policy, directory permission
model, shared-memory cleanup of hostile bootstrap, resource/side-channel isolation, independent
operator, live model or incident prevention claim. Selectivity means preconnected peer capabilities,
not a general network firewall. Exec is intentionally incompatible after lockdown.

| Field                         | Declaration                                                                                                                        |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| active_phase                  | Additive descriptor isolation v1                                                                                                   |
| protected_surface             | tools/assurance-isolation/**, docs/assurance/isolation/**, own CI/entry links                                                      |
| next_phase_behaviour          | Replay frozen source-bound matrix; use new evidence for later launchers                                                            |
| maintenance_behaviour         | Reproduce regressions before fixes; refresh only this phase's evidence                                                             |
| sunset_or_migration_condition | Versioned successor retaining these observations and compatibility limits                                                          |
| anti_vacuity_condition        | Exact nonempty case/control set, live attack baselines, useful filtered operations, observed negative controls and failure refusal |

Only the mutable workflow census current set may change; baseline19 is frozen. Initial subjective
scores: reproducibility 8/10 (outside replay needed), boundary evidence 6/10 (held-out attacks needed),
integration utility 3/10 (native launcher and real workload needed), novelty 2/10 (measured advantage
over standard sandbox fixtures needed). This increment aims to make those next experiments concrete.
