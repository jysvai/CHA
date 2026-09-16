# 00 — Why

**한국어: [00-왜.md](../ko/00-왜.md)**

---

## The failure this exists to stop

A coding agent reviewing its own work is the least reliable reviewer available to you.

Not because it is weak. Because of where it is standing.

- It wrote the code. It *remembers* which inputs it considered, and that memory reads the code on its behalf.
- It read the same comments. When the header says "this never counts an unknown line as a success", that sentence arrives before the code does.
- It has the same blind spots. An edge case that did not occur to it while writing does not occur to it while reading.

And one thing on top of all of that: **it does not go quiet when it is unsure.** It produces a fluent, confident, wrong answer. A human reviewer says "I'm not sure about this one". A model composes a plausible sentence, and that sentence does not come with a marker saying *I did not run this*.

That is failure number one.

---

## Why the usual patches do not hold

### "Review your own diff"

Same model, same context, same blind spot. You are asking the distribution that just produced the code whether the code is wrong. If it had grounds to think so, it would not have written it that way.

### A second pass from the same model

This is the most commonly reached-for patch and the most convincing-looking one. It fails because **the errors are correlated.**

Review is worth something when two reviewers' mistakes are *independent* — the probability that both miss a defect is the product of the two individual probabilities. Run the same model twice and that product does not apply. What the first pass missed, the second pass misses too: the same weights look at the same tokens and reach the same conclusion.

What you actually observe is worse than independence failing. It *agrees with itself*. Once the first answer is in context, the second pass is not a review, it is a ratification.

### A stricter linter

A linter sees **shapes**. It structurally cannot see **lies**.

```js
// A line with no `ok` is not counted as a success.
if (!line.includes('fail')) successes++;
```

To a linter this is clean. The syntax parses, no variable is unused, the types line up. But the comment and the code say different things, and deciding which one is the bug requires knowing the *intent* — which is not information a parser has.

The categories a linter misses, written out:

- comments, docs, and names that contradict the code (a meaning problem)
- a regex that does not match the values people actually pass (a data problem)
- a test whose name promises more than its body checks (a promise problem)
- a guard checked *after* the thing it guards has already happened (an ordering problem)

All four parse fine.

### More tests

More tests are good. But **a green suite is not evidence.**

`npm test` passing means "nobody broke anything". It does not mean "if you break it, something notices". Those two look identical from the outside and are worth opposite amounts.

A test that asserts nothing is also green. A test named `"rejects non-numeric counts"` that only ever asks about `'many'` is also green. It adds one to the pass count. Nobody notices.

So CHA does not count tests, it **measures** them: break the fixed line on purpose and check that the test claiming to guard it goes red. If it stays green, that test guards the line by name only. See [07 — Mutation](07-mutation.md).

---

## Split the roles across platforms

There is exactly one way to break correlated error: get a reviewer **from somewhere else.**

A model on another platform was trained on different material, cut that material differently, and was tuned differently. So its set of things-that-look-normal is a different set. You are not buying a smarter reviewer — it may or may not be smarter — you are buying **a different blind spot.**

Three rules follow from that one fact:

- **Read-only.** A reviewer that can edit is a second writer. Each edit is correct on its own and nobody reads the place where they overlap. The **three half-applied fixes** found in the measured rounds had exactly this shape: a header describing the corrected behaviour, and only one of two call sites actually doing it.
- **Pinned model id.** `latest` changes silently. When it changes, round-to-round numbers stop meaning anything.
- **One at a time.** Three reviews sent in parallel emptied a personal quota **in about four minutes and lost all three answers**, because each one ran its own retry loop.

Detail in [05 — Second eye](05-second-eye.md).

---

## And then: run it

Splitting platforms does not tell you whether a claim is true. A different blind spot brings a different set of wrong answers with it.

There is one filter:

> **A claim is true when you have run something that would have behaved differently if it were false.**

The measured numbers:

| | |
|---|---|
| Claims raised | **57** |
| Confirmed true by execution | **22** |
| Fixes landed | **19** |
| Recorded unmeasurable | **4** |

Roughly six in ten were plausible and wrong. And reading alone **would not have told you which** — the wrong ones came with reasoning, correct file paths, correct line numbers, and clean prose.

Had you skipped execution and fixed everything, you would have edited 57 places, and **35 of them were working code**. Editing working code is not free. Each one is a chance to break something that was fine.

That sentence is the whole argument. The other eight steps exist to make that one step runnable.

See [06 — Adjudication](06-adjudication.md).

---

## The five defect classes

Every briefing carries these five. They are the classes that survived every round. All five share three properties: a linter cannot see them, a same-model review does not name them, and they hide behind a green suite.

### 1. A rule that never matches real input

```
/(1b|2b|3b)/  →  "qwen2.5-coder:32b"
```

A 32B model was counted as "too small", because `32b` contains `2b`. The rule ran. It threw nothing. It just produced the wrong answer, every time.

### 2. Silent failure

```js
try { readSheet(x); } catch { continue; }
```

A sheet that could not be read was skipped, and the summary line said "read everything". The failure looked exactly like the success.

### 3. A test that does not guard

Named `"rejects non-numeric counts"`. The body asks about `'many'` and nothing else. `'3'`, `null`, `true` and `[]` all went straight through. The test exists, it is green, and it guards nothing.

### 4. Comment contradicts code

The header said a line with no `ok` is not counted as a success. The code counted it as one. So the reported failure rate came out lower than reality — the number a person was reading was wrong.

One of the two is the bug, and **you cannot decide which one by reading.** You have to run it.

### 5. Trust-boundary leak

The `--offline` guard was checked *after* the connection had already knocked on the external address three times, with the key attached. The guard existed. It was written down. It was late.

---

## A false warning is a defect

One last rule.

**Code that reports a problem that is not there costs exactly what silence about a real one costs.**

A warning that fired falsely once stops being read. A warning nobody reads is not a warning, and when a real failure arrives in that slot it passes quietly. So "better to over-warn, it's the safe side" is wrong — it is the procedure for switching your own alarm off.

In CHA a false warning counts as a defect. It gets raised as a claim, adjudicated, fixed, and given a mutant. Same as any other.

---

## Next

- [01 — Setup](01-setup.md) — install, configure, wire a second eye
- [02 — The loop](02-loop.md) — nine steps, each with its entry and exit condition
- [09 — Results](09-results.md) — the measured run, with the actual defects
