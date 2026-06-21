// SPDX-License-Identifier: AGPL-3.0-or-later
// Calibration floor: contains nothing, leaks every canary.
import { replicaFrom } from "./_helpers.mjs";
export default replicaFrom(() => false);
