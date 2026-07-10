# VFC capture package — output contract

The external actor returns **exactly one file**, `capture-package.json`, and **nothing else** (no keys,
no logs). Simurgh assembles the rung-1 `foreign_capture.v1` attestation from it and verifies.

```
{
  "producer_identity":   { identity_subject, public_key_pem, key_fingerprint, anchor_type:"none", anchor_subject:"" },
  "capture":             { schema, producer_identity_ref, detector_snapshot_digest, corpus_digest, cells[] },
  "producer_transcript": { schema, content:{ capture_digest, producer_identity_digest,
                                             producer_key_fingerprint, challenge_record_digest },
                           producer_signature }
}
```

Guarantees the actor makes (and Simurgh checks): the transcript is signed by an **actor-controlled key**
distinct from the Simurgh verifier key (rung-0 floor), and it binds the **committed challenge receipt**
(rung-1). The actor received the Simurgh **verifier pin** and challenge — never any Simurgh private key.
