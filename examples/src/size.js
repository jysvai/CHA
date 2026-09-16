// Model size, read off the model's name.
//
// Promise: a model is "small" when it has fewer than 8 billion parameters.
// A 32B model is not small. An 8B model is not small either — the boundary is
// exclusive, and something in this file has to say which side 8 falls on.
//
// The first version of this file matched a substring:
//
//   const SMALL = /(1b|2b|3b|7b)/;
//
// which called `qwen2.5-coder:32b` small, because `32b` contains `2b`. It is
// kept in before/size.js so the claim can still be run. The defect class is
// "a rule that never matches real input" — or, as here, a rule that matches
// input it was never meant to see.

/** The parameter count in billions, or null if the name does not carry one. */
export function sizeOf(name) {
  const m = /(?:^|[^0-9.])(\d+(?:\.\d+)?)\s*b\b/i.exec(String(name));
  return m ? Number(m[1]) : null;
}

/** Fewer than 8 billion parameters. A name with no size in it is not small — it is unknown. */
export function isSmall(name) {
  const n = sizeOf(name);
  return n !== null && n < 8;
}
