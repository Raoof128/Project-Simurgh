# Table 1: Privacy Collection Boundary

**Source:** Table I in main.tex, Section VII-A (Privacy Collection Boundary)
**Claims supported:** C02

| Signal                    | Collected                         | Never collected              |
| ------------------------- | --------------------------------- | ---------------------------- |
| Keystrokes                | Count per window                  | Keystroke content            |
| Characters typed          | Count only                        | Typed text                   |
| Paste events              | Count + char length               | Paste content                |
| Focus loss                | Count + duration (ms)             | Window title/target          |
| Idle gaps                 | Maximum gap (ms)                  | Content during idle          |
| WPM                       | Effective WPM                     | Text being typed             |
| Timing intervals          | Up to 200 samples                 | Key content                  |
| Device integrity metadata | Platform-specific counts/booleans | Titles, PIDs, names, handles |
| Student identity          | SHA-256 hash                      | Raw identifier               |

**Code evidence:**

- `src/integrity/proofSchema.js:FORBIDDEN_FIELDS` (21 forbidden top-level field names)
- `src/device/forbiddenLocalFields.js` (daemon-side frozen forbidden-field list)
- `src/privacy/hashIdentity.js` (SHA-256 hash at ingress)
- `tools/privacy-audit.mjs` (CI enforcement)
