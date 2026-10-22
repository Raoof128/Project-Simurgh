# Kernel-enforced ingress-only service experiment

The user authorized proceeding to the next step after the task-scope experiment exposed an approved
service's hidden onward request. This phase measures kernel enforcement around that service, with
an observer outside the filtered process. It preserves every earlier implementation and report.

## Design choice and evidence

Network namespaces plus a destination firewall would support selective egress, but this executor
refuses `unshare --user --map-root-user --net` because `/proc/self/uid_map` is read-only. Do not
change platform restrictions or request privileged access for this experiment. Landlock TCP rules
alone do not cover UDP. Use an unprivileged Linux seccomp syscall allowlist for an **ingress-only**
worker. This is a narrower, executable mechanism: no newly created outbound sockets, no connect,
no descriptor import or io_uring, while ordinary replies on an inherited Unix listening socket work.
It adds restrictions to the platform's existing filter; it never replaces or weakens that filter.

Trusted parent provisioning creates one Unix listener. Worker setup validates it is an AF_UNIX
SOCK_STREAM listening socket, rejects socket standard streams, closes every other inherited FD,
requires one thread, sets no_new_privs, installs the filter, probes socket denial, and only then
announces readiness. A setup error exits without serving. Profile supports Linux x86_64 only;
other audit architectures and x32 syscall numbers are killed rather than interpreted with wrong
numbers. The allowlist permits necessary local Python/runtime/file syscalls, accept and replies;
sendto is permitted only with a null destination pointer. Fork/exec inherit the filter. Socket,
connect, socketpair, sendmsg/recvmsg, descriptor-import, ptrace and io_uring calls are not allowed.

Compare unfiltered fixture, kernel-filtered fixture and no-service/deny-all. Both running controls
use identical descriptor hygiene. A separate local observer acknowledges unique synthetic payloads;
do not equate a worker's claim of failure with an observed absence of delivery. IPv4/IPv6 TCP, UDP
DNS-format packets, local Unix relay, TCP proxy relay, fork and exec test channels use only loopback
or disposable Unix paths. Preserve the prior exact-scope broker and call it against the approved
service route so this phase crosses the actual former gap, not just a standalone socket check.

## Acceptance, limitations and next increment

The baseline must deliver each named egress payload before claiming that the filtered profile
blocked that channel. Useful read/write-response controls must still succeed under the profile;
deny-all makes their loss explicit. Audit exact named case/control identity, source hashes and all
fresh observations on replay. Tests challenge setup failure, inherited connected sockets, socket
standard streams, architecture checks, descriptor import, raw syscalls, fork/exec inheritance,
report tampering and observer failure. A missing prerequisite or observer is a refusal, not a pass.

This is not an OS network namespace, firewall, general sandbox, production launcher, authenticated
identity, secret scanner or proof against kernel vulnerabilities. Local file writes, process signals,
and replies on authorized ingress remain possible; publish a filesystem mailbox negative control.
No hostile host, file-mediated collusion, pre-existing malicious threads, independent operator,
selective outbound access or live model is covered. The trusted worker installs the profile before
executing scripted probes; arbitrary untrusted applications need a separately reviewed native
launcher before interpreter startup. Existing filters must permit the useful baseline operations.

An evaluation infrastructure integrator could run this named failure matrix today. The adoption
blocker is workload-specific compatibility and mandatory deployment, not a missing new security
primitive. Seccomp is established prior art. The contribution is the same approved-service relay
measured with and without kernel enforcement, plus inherited-capability and observation tests.
The stronger next increment is selective per-destination egress in separately provisioned network
namespaces with independent observation and held-out probes.

| Field                         | Declaration                                                                                                                                           |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| active_phase                  | Additive kernel egress v1                                                                                                                             |
| protected_surface             | tools/assurance-egress/**, docs/assurance/egress/**, own CI and entry links                                                                           |
| next_phase_behaviour          | Replay this frozen profile/matrix; later profiles get separate evidence                                                                               |
| maintenance_behaviour         | Reproduce a regression first; refresh only this phase's source-bound evidence                                                                         |
| sunset_or_migration_condition | Versioned replacement preserving old evidence and compatibility tests                                                                                 |
| anti_vacuity_condition        | Baseline deliveries, useful filtered replies, real outside observations, exact nonempty matrix, setup refusal and retained filesystem-channel failure |

Only the standing mutable workflow census current set may change for the added CI step; baseline19
remains immutable. Subjective initial targets: reproducibility 8/10, network-boundary evidence 6/10,
deployment applicability 3/10, novelty 2/10. Outside replay, native mandatory launch, selective egress
and a measured advantage over standard fixtures are the respective artifacts needed to raise them.
