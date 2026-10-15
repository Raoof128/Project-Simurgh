# Mechanism sources reviewed 15 October 2026

Fresh public fetches used normal certificate validation and the inherited network proxy. The
[register](evidence/sources.json) records requested/effective URLs, retrieval times, HTTP statuses
and SHA-256 hashes of responses. Retrieval date is not a claim about publication date. Raw working
copies are local research material; the register and implementation are committed.

1. [Linux seccomp filter documentation](https://docs.kernel.org/userspace-api/seccomp_filter.html):
   filters inspect numeric syscall arguments, cannot dereference pointers, and are explicitly not
   a complete sandbox. This motivates FD checks instead of attempted path-string filtering.
2. [Linux seccomp manual](https://man7.org/linux/man-pages/man2/seccomp.2.html): architecture checks,
   no_new_privs, filter installation, TSYNC and inheritance underpin the profile. No privileged
   filter replacement or platform bypass is attempted.
3. [Linux Landlock documentation](https://docs.kernel.org/userspace-api/landlock.html): filesystem,
   network and IPC scoping are an alternative on suitable hosts. Local ABI discovery returned
   ENOSYS. That result cannot distinguish kernel absence from an outer platform filter and does
   not establish that current kernels lack these features. Landlock TCP port rules alone also do
   not authenticate a destination. We did not implement or claim a Landlock test result.
4. [Linux open manual](https://man7.org/linux/man-pages/man2/open.2.html): descriptors reference open
   file descriptions and can survive pathname changes. Closing unlisted descriptors and denying
   new acquisition is essential; a pathname change is not revocation of an approved object.

This is established operating-system prior art. The contribution is the runnable paired-control
matrix, explicit utility/negative controls and source-bound replay. It does not demonstrate a new
security primitive or competitive superiority. The [2026 incident review](../scope/INCIDENT_RESEARCH.md)
provides motivation; these synthetic tests are not reconstructions of private incident environments.
