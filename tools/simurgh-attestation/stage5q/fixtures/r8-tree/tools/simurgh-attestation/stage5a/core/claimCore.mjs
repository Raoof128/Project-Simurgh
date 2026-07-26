// fixture: an R1 member with an exported function, an arrow export, and an internal.
export function verifyClaim(c) { return check(c); }
export const buildClaim = (x) => ({ x });
function check(c) { return Boolean(c); }
export const CLAIM_KINDS = Object.freeze(["a", "b"]);
