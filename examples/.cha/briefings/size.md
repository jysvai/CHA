# size — src/size.js lines 1–27


## What this file promises

```
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
```

## Code

```js
    1  // Model size, read off the model's name.
    2  //
    3  // Promise: a model is "small" when it has fewer than 8 billion parameters.
    4  // A 32B model is not small. An 8B model is not small either — the boundary is
    5  // exclusive, and something in this file has to say which side 8 falls on.
    6  //
    7  // The first version of this file matched a substring:
    8  //
    9  //   const SMALL = /(1b|2b|3b|7b)/;
   10  //
   11  // which called `qwen2.5-coder:32b` small, because `32b` contains `2b`. It is
   12  // kept in before/size.js so the claim can still be run. The defect class is
   13  // "a rule that never matches real input" — or, as here, a rule that matches
   14  // input it was never meant to see.
   15  
   16  /** The parameter count in billions, or null if the name does not carry one. */
   17  export function sizeOf(name) {
   18    const m = /(?:^|[^0-9.])(\d+(?:\.\d+)?)\s*b\b/i.exec(String(name));
   19    return m ? Number(m[1]) : null;
   20  }
   21  
   22  /** Fewer than 8 billion parameters. A name with no size in it is not small — it is unknown. */
   23  export function isSmall(name) {
   24    const n = sizeOf(name);
   25    return n !== null && n < 8;
   26  }
   27  
```

## What to look for

1. A rule that never matches real input.
2. Silent failure — a swallowed error, a dropped item, a fallback that hides it.
3. A test that does not guard — the name promises more than the assertion checks.
4. Comment contradicts code.
5. Trust-boundary leak — a key, a path, a network call crossing a line the code says it does not cross.

A false warning is a defect. Code that reports a problem that is not there costs the same as silence about one that is.

## Answer format — nothing else

For each defect, and only for defects:

1) input → what happens now vs what should happen
2) line number and the line, quoted
3) confidence

If you find nothing, answer "none". Do not summarise the file.
Say plainly which parts you could not see.
