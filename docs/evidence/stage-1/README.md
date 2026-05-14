# Stage 1 Evidence Folder

Use this folder for redacted Stage 1 and Stage 1.5 evidence.

## Suitable Evidence

- Redacted command output.
- CI screenshots or logs.
- Validation screenshots.
- Audit verification output.
- Privacy audit output.
- Demo screenshots.
- Helper telemetry examples.

## Evidence Rules

Do not store:

- secrets,
- API keys,
- bearer tokens,
- raw private data,
- real student data,
- raw screen, webcam, or audio material,
- typed answer content,
- pasted text content,
- unredacted local machine identifiers.

Before committing evidence:

1. Redact tokens and local identifiers.
2. Confirm no real student data is present.
3. Prefer plain text logs over screenshots when possible.
4. Mark incomplete evidence as pending rather than filling gaps with synthetic output.
