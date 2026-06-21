// SPDX-License-Identifier: AGPL-3.0-or-later
// Strong on the context_injection boundary (all evasions), weak elsewhere.
import { replicaFrom } from "./_helpers.mjs";
export default replicaFrom((boundary) => boundary === "context_injection");
