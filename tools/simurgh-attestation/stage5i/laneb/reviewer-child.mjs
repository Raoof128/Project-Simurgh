// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5I Lane B — a reviewer child process. Reads ONLY {content, privatePem} from stdin (its own
// receipt content + its own key; never another reviewer's material), signs the receipt, emits the
// signature. Deterministic: fixed key + fixed content ⇒ fixed Ed25519 signature.
import { signContent } from "../core/signatures.mjs";
import { DOMAINS } from "../constants.mjs";

let data = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (data += c));
process.stdin.on("end", () => {
  const { content, privatePem } = JSON.parse(data);
  process.stdout.write(
    JSON.stringify({ signature: signContent(privatePem, DOMAINS.receipt, content) })
  );
});
