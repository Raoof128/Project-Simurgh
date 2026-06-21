// SPDX-License-Identifier: AGPL-3.0-or-later
// Strong on the tool_request boundary (all evasions), weak elsewhere.
import { replicaFrom } from "./_helpers.mjs";
export default replicaFrom((boundary) => boundary === "tool_request");
