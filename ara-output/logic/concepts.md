# Concepts

## CON01 — Display Fidelity Property

**Notation:** $\text{DisplayFidelity}(C) \iff \forall r \in \text{VisibleRegions}: F_r = D_r$

**Definition:** A capture system $C$ satisfies display fidelity if and only if the captured
frame $F$ is pixel-identical to the physical display output $D$ for all visible screen regions.
Formalised in Abedini 2026 (companion paper).

**Boundary conditions:** Fails on any OS platform where a top-level window holds a
capture-exclusion flag (Windows `WDA_EXCLUDEFROMCAPTURE` or macOS `SharingType.none`). The
property is Boolean — partial fidelity is not defined.

**Related concepts:** CON02 (capture-invisible overlay), CON03 (display-affinity metadata)

---

## CON02 — Capture-Invisible Overlay

**Notation:** $w \in \text{CaptureInvisible} \iff \text{pixels}(w, F) = \emptyset \wedge \text{visible}(w, D) = \text{true}$

**Definition:** A window $w$ is capture-invisible if it produces no pixels in any frame $F$
returned by the OS capture pipeline while remaining fully visible on the physical display $D$.
Achieved via `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` on Windows or
`NSWindow.SharingType.none` on macOS. Three subclasses: (1) capture-invisible overlays;
(2) click-through overlays; (3) GPU-layer overlays bypassing the OS compositor.

**Boundary conditions:** GPU-layer overlays (DirectX/Metal hooks) are NOT detectable by any
OS window-management API, including Simurgh's scanners. This is an explicit non-claim.

**Related concepts:** CON01 (display fidelity), CON03 (display-affinity metadata)

---

## CON03 — Display-Affinity Metadata

**Notation:** $\text{AffinityMeta}(w) = \{\text{sharingState}(w), \text{affinityFlag}(w)\}$

**Definition:** Platform-specific metadata describing a window's capture-exclusion state,
obtainable through OS metadata APIs without reading window content, title, or process name.
On macOS: `kCGWindowSharingState` from `CGWindowListCopyWindowInfo`. On Windows:
`GetWindowDisplayAffinity`. On Linux X11: `_NET_WM_STATE` property (overlay-relevant states;
not equivalent to Windows/macOS capture-exclusion). Simurgh daemons aggregate per-window
affinity metadata into a proof-level count (`capture_excluded_window_count`).

**Boundary conditions:** Linux X11 does not expose an equivalent of `WDA_EXCLUDEFROMCAPTURE`.
The Linux path reports window-manager metadata counts (managed, override-redirect, above,
fullscreen, skip-taskbar), which are related to but not identical to capture-exclusion states.

**Related concepts:** CON02 (capture-invisible overlay), CON04 (signed integrity proof)

---

## CON04 — Signed Integrity Proof Envelope

**Notation:** $\Pi = (\text{fields}, \sigma)$ where $\sigma = \text{Sign}(sk, \text{Canonicalise}(\text{fields} \setminus \{\sigma\}))$

**Definition:** A signed JSON envelope produced by a Simurgh daemon or node signer, containing
session-binding fields and an ECDSA P-256 (device-shield daemon) or Ed25519 (browser-paired
path) signature over the canonical serialisation of all non-signature fields. Two distinct
envelope types exist:

1. **Browser-paired integrity-proof envelope** (`simurgh-integrity-proof-v1`): 11 fields,
   Ed25519 signature, recursive key-sorted canonical JSON (`proofCanonicalise.js`).
2. **Device-shield daemon proof envelope**: 12 fields, ECDSA P-256 signature, top-level
   key-sorted canonical JSON (`canonicaliseDaemonPayload` / `canonical_json.rs`).

**Boundary conditions:** Proofs attest identity ("this key signed this data") but not
truthfulness ("this data faithfully reflects OS state"). A compromised OS can submit
a dishonest but validly signed proof.

**Related concepts:** CON05 (E1 triple check), CON06 (HMAC audit chain)

---

## CON05 — E1 Triple Check

**Notation:** $E1(\Pi, s) \iff h(\Pi) = \text{node\_id\_hash} \wedge k(\Pi) = k_s \wedge \text{Verify}(\Pi)$

**Definition:** The server's three-part proof acceptance condition: (a) the claimed
`node_id_hash` equals `SHA-256(decoded_pubkey)`; (b) the raw public key matches the session's
registered key $k_s$; (c) the signature verifies against the canonical payload. All three
checks must pass; any failure produces a uniform `invalid_signature` reason code to prevent
oracle attacks. Implemented at `src/device/daemonProof.js:170-188`.

**Boundary conditions:** Oracle attack prevention requires that the error code be uniform
across all three failure modes. The check order is: (a) hash, (b) key match, (c) signature.

**Related concepts:** CON04 (signed integrity proof), CON06 (HMAC audit chain)

---

## CON06 — HMAC-SHA256 Tamper-Evident Audit Chain

**Notation:** $\text{prev}_i = \text{HMAC}_{k}(\text{JSON}(e_{i-1}))$ where $e_0.\text{prev} = \text{"GENESIS"}$

**Definition:** A linked list of audit entries where each entry's `prev` field contains the
HMAC-SHA256 of the full JSON serialisation of the previous entry (excluding the previous
entry's own `sig` field, which is appended after HMAC computation). The HMAC key is
server-held and not shared with any daemon, browser, or AI layer. Chain integrity is verified
by `src/audit/verifyAudit.js`. Maximum chain length is 5000 entries (CHAIN_CAP).

**Boundary conditions:** Protects against post-hoc modification detectable by any verifier
holding the HMAC key. Does NOT prevent a fully malicious server from rewriting history —
the HMAC key is server-held. Serves as an evidence-integrity layer for human reviewers,
not as a Byzantine-fault-tolerant log.

**Related concepts:** CON04 (signed integrity proof), CON05 (E1 triple check)
