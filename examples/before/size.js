// THE STATE BEFORE ROUND 1. Kept so the adjudication step in WALKTHROUGH.md is
// reproducible — you can run the claim against this file and watch it be true.
// Nothing imports it. Do not fix it.
//
// Promise: a model is "small" when it has fewer than 8 billion parameters.
// A 32B model is not small.

const SMALL = /(1b|2b|3b|7b)/;

export function isSmall(name) {
  return SMALL.test(String(name).toLowerCase());
}
