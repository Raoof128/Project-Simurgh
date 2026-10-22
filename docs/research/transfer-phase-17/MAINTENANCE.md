# Exact formatting exception for captured baseline bytes

P17-FORMAT01, 17 October 2026 (Australia/Sydney): permit modification of
`.prettierignore` only to append `docs/research/provider-role-phase-17b/baseline.json`.
This compact JSON file was committed into the corrective protocol before capture. Formatting
it now would change the frozen input hash. Preserve its bytes and use the protocol verifier.
Human-readable external report copies may be formatted; archive members remain untouched.
This authority commit must precede the exact ignore-list addition.

The formatter gate remains active for all other paths. Successors inherit this one archive
exception; any new exception requires its own exact declaration. Migration replaces the
formatter check with the existing source/evidence verifier for this file only. Anti-vacuity:
the file must exist and match its committed protocol hash; a wildcard exemption is forbidden.
