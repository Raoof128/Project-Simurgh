# Privacy Audit Reproduction

Reproduces Section VIII-C (Privacy Audit) from the paper.

## Steps

```bash
# 1. Run the privacy audit tool
node tools/privacy-audit.mjs

# 2. Run privacy-related test suites
node --test tests/security/stage_26_27_closeout_audit.test.js
node --test tests/unit/forbiddenLocalFields.test.js
node --test tests/unit/normaliseTelemetry.test.js
node --test tests/unit/hashIdentity.test.js

# 3. Verify no forbidden API calls in source
grep -rn "getDisplayMedia" src/ public/ server.js  # should return nothing from src/
grep -rn "getUserMedia" src/ public/sdk/           # should return nothing
grep -rn "clipboard" src/ public/sdk/              # should return nothing
```

## What the privacy audit checks

The tool scans the codebase for:

1. `window.getDisplayMedia()` calls — must be absent from SDK and server
2. Clipboard-read API calls — must be absent
3. `getUserMedia()` with video or audio — must be absent
4. Raw window titles or process names in proof schema fields
5. Raw student identifier written past the ingress hasher
6. Raw private or public keys in audit chain entries
7. Forbidden Wayland portal methods in the Rust scanner

## Expected output

```
PASS — privacy audit complete
```

Exit code 0. Any violation exits with code 1 and identifies the offending line.
