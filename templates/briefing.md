# <tag> — <path> lines <first>–<last>

<!--
This is the shape `node tools/brief.mjs <file>` writes. It is here so you can
hand-write one when the tool cannot cut a file sensibly — a single function
larger than the cap, a generated file, a diff rather than a whole file.

Three things about the shape are load-bearing:

  · Real line numbers, left-padded, on every line. Every claim gets adjudicated
    by running something at a specific line. A briefing renumbered from 1 makes
    you map each claim back by hand, and that is where wrong adjudications
    come from.

  · The header is repeated into every chunk, because it is the set of promises
    the code is measured against — and it is charged against the byte budget
    every time, not once. A 6KB file header quietly ate a third of the cap
    before it was counted.

  · 20480 bytes, measured in BYTES. CJK is 3 bytes a character, so a line
    count lies by a factor of three on Korean source, and a cap you measured
    against the wrong number is a cap that never applied.

Delete this comment block in a real briefing. Everything in it is for you,
not for the reviewer.
-->

> This is part <i> of <n>. The rest of the file exists and is not shown.

## What this file promises

```
<the file header / doc comment, verbatim — the claims the code is measured against>
```

## Code

```<language>
    1  <the source, with its real line numbers, cut at function boundaries>
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

<!--
What must NEVER go into a briefing:

  · The conversation so far.
  · Your own hunt suspicions. A second eye that inherits the first eye's
    conclusions is an echo you paid for.
  · Secrets, keys, tokens, customer data. This text leaves the machine.
  · The fix you already have in mind.
-->
