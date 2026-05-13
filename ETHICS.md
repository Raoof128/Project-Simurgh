# Ethics Statement

Project Simurgh is built on the principle that **integrity verification must not become surveillance**.

---

## Core Commitments

### 1. No Automatic Misconduct Findings

Simurgh produces risk scores and event timelines. It **never** automatically accuses, flags, or penalises a student. Every anomaly recommendation requires a human reviewer who applies institutional judgment and due process.

The system output language enforces this:

> "Manual review recommended. No automatic misconduct finding."

This wording is hard-coded into the scoring module and cannot be changed through configuration.

### 2. Metadata Only

Simurgh verifies behavioural integrity without ever seeing content. It does not capture:

- What a student typed
- What a student pasted
- What was on their screen
- Their face, voice, or body

This is not a limitation — it is a deliberate design choice. The research underpinning this project (*The Invisible Window*, Abedini 2026) demonstrates that screen-based surveillance is structurally unreliable on modern operating systems. Behavioural metadata is both more privacy-preserving and more tamper-resistant.

### 3. Transparency to Examinees

The student exam page displays a privacy notice on load that must be acknowledged before the session begins. This notice explains:

- What is monitored (behavioural metadata)
- What is not monitored (screen, camera, audio, content)
- How risk scores are used (human review trigger, not automatic finding)

Students must actively consent before the session starts.

### 4. Explainable Scores

Risk scores are produced by local deterministic heuristics with documented weights and thresholds. Every score can be traced to specific signals (paste length, focus losses, WPM cadence, helper status). There is no black-box model making undisclosed decisions about exam integrity.

When Claude provides narrative reasoning, its source is explicitly labelled in the audit trail.

### 5. Tamper-Evident Audit Chain

The HMAC-SHA256 audit chain ensures that the record of what Simurgh observed cannot be altered after the fact — by the system operator, the institution, or anyone else. Students have the same chain they can request for review.

### 6. Proportionality

Simurgh is designed for high-stakes, time-limited assessment contexts. It is not appropriate for:

- Continuous workplace monitoring
- Passive, ambient surveillance
- Any context where the monitored person has not been informed

Deploying Simurgh in contexts beyond its designed purpose is a misuse.

---

## Known Ethical Tensions

### False Positives

Heuristic scoring will produce false positives. A student who pastes a long block quote from a permitted source, or who has an unstable internet connection causing reconnects, may score Warning or Critical. The human review requirement exists precisely to catch these cases.

Institutions using Simurgh should establish a clear appeals process before deployment.

### Accessibility

Students using assistive technology, dictation software, or non-standard input methods may exhibit telemetry patterns that resemble anomalies. Any deployment should include an accommodation workflow that excludes or adjusts scoring for students with documented accessibility needs.

### Power Asymmetry

Any proctoring system creates a power imbalance. The commitments in this document aim to limit that imbalance, but they do not eliminate it. Institutions should treat Simurgh's output as one input among many in an academic integrity process, not as a final authority.

---

## Research Context

This project implements Countermeasure C from *The Invisible Window: A Taxonomy of Display-Fidelity Violations and Proposed Mitigations* (Abedini, 2026). The paper discloses both the attack surface and its limitations. Publishing the countermeasure alongside the attack is a deliberate choice — security through obscurity does not protect students or institutions.
