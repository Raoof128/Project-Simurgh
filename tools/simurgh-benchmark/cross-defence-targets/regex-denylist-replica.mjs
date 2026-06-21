// SPDX-License-Identifier: AGPL-3.0-or-later
// Slightly better than keyword: catches plain + obfuscated; fails split/synonym/chain.
import { replicaFrom } from "./_helpers.mjs";
export default replicaFrom(
  (_boundary, evasion) => evasion === "plain_marker" || evasion === "obfuscated_marker"
);
