# A worked round, start to finish

Twenty-seven lines of source, one real defect, two mutants, nine steps. Every
block of output below was produced by the tool named above it. If you run the
commands you should see the same thing; where you will not, it says so.

```
examples/
  before/size.js       the module as it was before round 1 — kept so the claim can still be run
  src/size.js          the module now
  test/size.test.js    the test
  .cha/config.json     gate, briefing cap, mutation runner
  .cha/mutants.json    two mutants
  .cha/record.md       the round, written as it happened
  .cha/briefings/      what step 2 produced
```

Run everything from `examples/`:

```bash
cd examples
```

The tools are at `../tools/`. Inside a repo where the plugin is installed you
would use the slash commands instead — `/cha-brief`, `/cha-judge`, `/cha-fix`
— and they call the same files.

---

## The defect

`before/size.js` is twelve lines and promises one thing:

```js
// Promise: a model is "small" when it has fewer than 8 billion parameters.
// A 32B model is not small.

const SMALL = /(1b|2b|3b|7b)/;

export function isSmall(name) {
  return SMALL.test(String(name).toLowerCase());
}
```

This is defect class 1: **a rule that never matches real input** — or, as here,
a rule that matches input it was never meant to see. `32b` contains `2b`, so a
32B model is reported as small.

It is not a typo. It reads correctly, it has a comment, the comment is right,
and a linter has nothing to say about it. Somebody has to run it.

---

## ① 사냥 / hunt

Read the file. Write the suspicion down in four lines — what it **promises**,
what it **does**, what that means **for a person**, and **how you would measure
it**:

```
src/size.js:8
  promises: a model is small when it has fewer than 8 billion parameters
  does:     a substring test against /(1b|2b|3b|7b)/
  person:   a 32B model gets routed to whatever the small-model path does
  measure:  call it with "qwen2.5-coder:32b" and print the result
```

No fix, no verdict. A suspicion you cannot say how to measure is not ready to
leave this step.

---

## ② 브리핑 / brief

```bash
node ../tools/brief.mjs src/size.js --out .cha/briefings
```

```
  · size  .cha/briefings/size.md  2.8KB  lines 1–27

  1 briefing(s), cap 20KB

  Before sending: strip keys, tokens, internal hostnames, and customer data.
  Never include the conversation, your own suspicions, or the fix you have in mind.
  next: /cha-review2
```

One chunk, because the file is nowhere near the 20KB cap. The briefing at
[.cha/briefings/size.md](.cha/briefings/size.md) carries the file header (the
promises), the code with its **real line numbers**, the five defect classes,
and the answer format. It does not carry the suspicion from step 1 — a second
eye that inherits the first eye's conclusions is an echo you paid for.

---

## ③ 2차 눈 / second eye

```bash
node ../tools/queue.mjs
```

This step does not run here, and the example is honest about why:

```
  .cha/config.json → secondEye.command is null.
```

A second eye is an account on another platform. It cannot be shipped in a
repository. Point `secondEye.command` at a CLI that talks to a model you do
**not** already have in this session, pin `secondEye.model` to an exact id, and
give it no write tools — [docs/en/05-second-eye.md](../docs/en/05-second-eye.md)
has the wiring.

What comes back from this briefing is two claims:

1. the size rule matches a substring, so `32b` is read as `2b`
2. the `.toLowerCase()` is dead code, because every caller already lower-cases
   the name before it gets here

Both are claims. Neither is a defect yet.

---

## ④ 판정 / adjudicate

> A claim is true when you have run something that would behave differently if
> it were false.

**Claim 1.** The cheapest thing that separates the two behaviours is one call:

```bash
node -e "import('./before/size.js').then(m=>console.log(m.isSmall('qwen2.5-coder:32b')))"
```

```
true
```

32 is not fewer than 8. **참 / true.** Command and output go into the record.

**Claim 2.** There is no caller. `src/size.js` is the whole module, so the
claim is about a codebase that is not in front of us, and nothing available
separates the two readings.

**못 잼 / unmeasurable** — and specifically **not** 거짓. Calling it false
would produce a clean sheet that is a lie, and would lose the one thing this
row is actually worth: a note about what this harness cannot see.

---

## ⑤ 빨간 검사 / red test

The test is written **before** the source is touched, and you watch it fail.
At this point `sizeOf()` does not exist — the only thing the claim is about is
`isSmall`:

```js
import assert from 'node:assert/strict';
import { isSmall } from '../src/size.js';

assert.equal(isSmall('qwen2.5-coder:32b'), false);
```

```
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

true !== false

  actual: true,
  expected: false,
```

Keep that output. A test written after the fix passes for reasons nobody
checked — because of the fix, because it asserts something always true, or
because it never reaches the assertion — and afterwards nobody can tell which.

---

## ⑥ 고침 / fix

Smallest change that turns the test green. The substring test becomes a
digit-run match with a boundary on each side, and the size is split out so it
can be asserted as a number instead of inferred from a boolean:

```js
export function sizeOf(name) {
  const m = /(?:^|[^0-9.])(\d+(?:\.\d+)?)\s*b\b/i.exec(String(name));
  return m ? Number(m[1]) : null;
}

export function isSmall(name) {
  const n = sizeOf(name);
  return n !== null && n < 8;
}
```

```
  ok  a 32B model is not small
```

One writer. One defect. One commit.

---

## ⑦ 어긋 / mutant

Break the fixed line on purpose and check that a named test notices. The
anchor is **lifted out of the file**, never retyped:

```bash
node ../tools/add-mutant.mjs src/size.js 18 --test test/size.test.js \
  --what "the whole run of digits is the size, not one digit of it" \
  --then "32b reads as unknown; isSmall stays right by accident, sizeOf does not" \
  --replace '  const m = /(?:^|[^0-9.])(\d(?:\.\d+)?)\s*b\b/i.exec(String(name));'
```

```
{
  "id": "size-001",
  "곳": "src/size.js",
  "무엇": "the whole run of digits is the size, not one digit of it",
  "그러면": "32b reads as unknown; isSmall stays right by accident, sizeOf does not",
  "찾을것": "  const m = /(?:^|[^0-9.])(\\d+(?:\\.\\d+)?)\\s*b\\b/i.exec(String(name));",
  "바꿀것": "  const m = /(?:^|[^0-9.])(\\d(?:\\.\\d+)?)\\s*b\\b/i.exec(String(name));",
  "검사": "test/size.test.js"
}

  added size-001 (1 mutants total)
  measure it: node tools/mutate.mjs --id size-001
```

A second one for the boundary, because `< 8` and `<= 8` are otherwise
indistinguishable:

```bash
node ../tools/add-mutant.mjs src/size.js 25 --test test/size.test.js \
  --what "the 8B boundary is exclusive" \
  --then "an 8B model is routed to the small-model path and runs out of context" \
  --replace '  return n !== null && n <= 8;'
```

Then measure them:

```bash
node ../tools/mutate.mjs
```

```
  어긋내기 / mutation  (2 deliberate breakages, checking the tests notice)

  · baseline test/size.test.js → green · 0.1s

  ✓ size-001 the whole run of digits is the size, not one digit of it  src/size.js → test/size.test.js caught it · 0.1s
  ✓ size-002 the 8B boundary is exclusive  src/size.js → test/size.test.js caught it · 0.1s

  2 잡음/caught · 0 샜음/leaked
```

**`size-001` is worth reading twice.** It makes `sizeOf('qwen2.5-coder:32b')`
return `null`, and `isSmall` reads `null` as "not small" — so under the
mutation `isSmall` is still **right, by accident**. It is caught only because
the test asserts `sizeOf` as well. A test that checked `isSmall` alone would
have reported this mutant as 샜음, and the sweep would have been telling the
truth about the test.

### What a bad sweep looks like

Two mutants added to a scratch copy of this example — one the test does not
guard, one whose `검사` is a nickname rather than a path:

```
  ✓ size-001 the whole run of digits is the size, not one digit of it  src/size.js → test/size.test.js caught it · 0.1s
  ✓ size-002 the 8B boundary is exclusive  src/size.js → test/size.test.js caught it · 0.1s
  ✗ size-003 the size is read case-insensitively  src/size.js
      test/size.test.js stayed green — nothing stops the next person deleting this line.
      a name written 32B in capitals reads as unknown
  ⚠ size-004 nickname instead of a path  src/size.js — 검사/test is not a real path: size

  2 잡음/caught · 1 샜음/leaked · 1 못잼/unmeasurable
```

Exit code 1. **못 잼 counts as a failure.** `size-004` ran, measured nothing,
and would have kept the total looking healthy — which is exactly the defect
class this tool exists to find, living inside the tool. That mistake cost a
whole sweep once on the source project: two mutants ran and measured nothing,
and the number at the bottom looked fine.

---

## ⑧ 관문 / gate

```bash
node test/size.test.js
```

```
  ok  a 32B model is not small, even though "32b" contains "2b"
  ok  8B is on the not-small side of the boundary
  ok  models under 8B are small
  ok  a name with no size in it reads as unknown, not as small
  ok  the size is read as a number, not as a string

  5 pass / 0 fail / 0 skip — 1 of 1 files exited cleanly
```

Numbers, not the word "pass". The file count is on the same line for a
reason: a suite where files crash before asserting reports *more* passes, not
fewer, so the pass count alone moves the wrong way and looks like an
improvement.

One gate command here, because the example has one test file and nothing to
lint. A real repo's `gate` block has three or more —
[docs/en/08-gate-and-record.md](../docs/en/08-gate-and-record.md).

---

## ⑨ 기록 / record

The round is at [.cha/record.md](.cha/record.md), written as it happened.
To start the next one:

```bash
node ../tools/record.mjs --dry
```

```
  --dry — nothing written. 4970 → 5878 bytes (+908)
```

Drop `--dry` and it appends, and bumps the status table in place:

```bash
node ../tools/record.mjs --set gates=2 --set 어긋=2
```

```
  회차 2 / round 2 — 2026-09-17  appended to .cha/record.md
  status table: 2 row(s) updated in place
  4970 → 5878 bytes (+908)
```

It refuses ambiguity rather than guessing:

```
  status table: nope — no row matched
  nothing written. Fix the --set names or edit the table by hand.
```

and it refuses to reuse a round number, because a number that identifies two
sections identifies nothing:

```
  회차 1 / round 1 is already in .cha/record.md.
  Appending a second one would make the number stop identifying a round.
  Use --round 2, or edit that section by hand.
```

**And it refuses to shrink the file.** The byte length is compared before and
after, in memory and again on disk. Forced to produce an empty round body, it
does this and writes nothing:

```
  REFUSING TO WRITE: the record would not grow.
  5878 bytes before, 5878 bytes after.
  The record is append-only. A run that does not make it longer is a bug in this tool.
```

That check exists because the status table has to be edited in place, and an
in-place edit is the one plausible way a whole record disappears. Every version
of that failure exits 0 and prints something reassuring.

---

## What the round cost

Two claims. One was true, one could not be measured, zero were false — a small
sample, and not the ratio you should expect. On the source project the same
step over 39 rounds ran **57 claims → 22 true**.

One fix. One red test watched failing. Two mutants, both caught. One gate with
its real numbers. One round appended to a file that never gets shorter.

The next round starts from the 다음 회차 후보 list at the bottom of
[.cha/record.md](.cha/record.md) — two things that were seen and not taken —
rather than from an hour of re-reading.
