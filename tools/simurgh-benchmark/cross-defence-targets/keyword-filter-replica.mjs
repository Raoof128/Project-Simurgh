// SPDX-License-Identifier: AGPL-3.0-or-later
// Catches plain markers only; blind to obfuscation, splitting, synonyms, chains.
import { replicaFrom } from "./_helpers.mjs";
export default replicaFrom((_boundary, evasion) => evasion === "plain_marker");
