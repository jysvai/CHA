---
description: Break the code on purpose and check the tests notice. Caught / leaked / unmeasurable — unmeasurable counts as a failure.
---

# /cha-mutate `[add <file:line> | run | run <id>]`

Mutation testing is the only step that measures **the tests** instead of the code. Everything else in CHA asks "is this code right?". This asks "if it were wrong, would anything have told us?"

```bash
node "${CLAUDE_PLUGIN_ROOT}/tools/mutate.mjs"            # full sweep
node "${CLAUDE_PLUGIN_ROOT}/tools/mutate.mjs" --id <id>  # one mutant
node "${CLAUDE_PLUGIN_ROOT}/tools/add-mutant.mjs" <file> <line> --test <testfile>
```

## What a mutant is

One entry in `.cha/mutants.json`:

```json
{
  "id": "recall-042",
  "곳":     "src/agent/recall.js",
  "무엇":   "the longest matching variant is what scores, not every variant",
  "그러면": "a 3-variant word outscores a 1-variant word and recall ranks the wrong turn first",
  "찾을것": "const 다맞음 = 맞은낱말 === 묶음.length ? 12 : 0;",
  "바꿀것": "const 다맞음 = 맞은낱말 >= 1 ? 12 : 0;",
  "검사":   "test/recall.test.js"
}
```

- **곳 / where** — the file.
- **무엇 / what** — the meaning that line carries, in one sentence.
- **그러면 / then** — what a person experiences when it is wrong. If you cannot write this line, the mutant is not worth having.
- **찾을것 / find** — the source line **lifted verbatim**. Not retyped. `add-mutant.mjs` reads it out of the file for exactly this reason.
- **바꿀것 / replace** — the break.
- **검사 / test** — the test file that should catch it. **A path, not a nickname.**

## Three verdicts

- **잡음 / caught** — the mutant went in, the named test went red. The test guards.
- **샜음 / leaked** — the mutant went in and everything stayed green. **This is a hole in the tests, and it is a finding.** Write the test that catches it, then re-run.
- **못 잼 / unmeasurable** — the anchor did not match (the file moved on and `찾을것` no longer appears), or the named test does not exist, or the mutant is a no-op. **Counts as a failure.**

못 잼 counting as failure is the whole discipline. An anchor that silently stops matching turns a mutant into a line of JSON that runs, reports nothing, and makes the sweep look complete. That is the same defect class the loop hunts for — a rule that never matches real input — living inside the tool that is supposed to find it.

## The two mistakes worth naming

**The nickname in `검사`.** Writing `"검사": "recall"` instead of `"검사": "test/recall.test.js"` made two mutants report 못 잼 for a whole sweep. They ran; nothing was measured; the total looked fine.

**The mutant that changes nothing.** Reordering two independent lines, renaming a local, flipping a comparison whose operands are equal — the mutant goes in, nothing breaks, it reports 샜음, and you go hunting for a test hole that does not exist. Before adding, ask: *what input now behaves differently?* If you cannot name one, it is not a mutant.

**And the mutant that only covers the helper.** One leaked because the test exercised the helper function directly while the defect lived at the call site. Mutate what the real path executes, not the convenient entry point.

## Cost

A full sweep is slow and serial by design — each mutant is applied, the suite runs, the file is restored. The last full sweep here was **1,149 mutants in 2h46m: 1,125 caught, 2 leaked, 22 unmeasurable.** Run one mutant after each fix; run the full sweep before a release, in the background, and do not run anything timing-sensitive on the same machine while it goes.

## Output

Per mutant: id, verdict, and for 샜음/못 잼 the reason. At the end: total, caught, leaked, unmeasurable, elapsed. **Leaked and unmeasurable go back into the loop as findings**, not into a footnote.
