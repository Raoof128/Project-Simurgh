// SPDX-License-Identifier: AGPL-3.0-or-later
// Semantic-ish: catches plain, obfuscated, synonymed; misses split + composite.
import { replicaFrom } from "./_helpers.mjs";
const CAUGHT = new Set(["plain_marker", "obfuscated_marker", "synonymed_instruction"]);
export default replicaFrom((_boundary, evasion) => CAUGHT.has(evasion));
