// SPDX-License-Identifier: AGPL-3.0-or-later
// Shared green-corpus builder for Stage 4X unit tests (re-exports the ONE canonical source).
export { buildCorpus as greenCorpus } from "../../../../tools/simurgh-attestation/stage4x/core/corpusSource.mjs";
export const clone = (o) => JSON.parse(JSON.stringify(o));
