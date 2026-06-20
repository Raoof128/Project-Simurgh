// SPDX-License-Identifier: AGPL-3.0-or-later
// Returns a malformed response (no schema, no decision) → must trip invalid_or_error.
export default async function run() {
  return { nonsense: true };
}
