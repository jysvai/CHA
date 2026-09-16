# 07 — Mutation

**한국어: [07-어긋내기.md](../ko/07-어긋내기.md)**

Break the fixed line **on purpose** and check that the test which claims to guard it goes red.

Every fix gets a mutant. Write it immediately after the fix, while you still know **which character was carrying the meaning**.

---

## Why

`npm test` being green means **"nobody broke anything"**.

It does not mean **"if you break it, something notices"**.

From the outside those two are **identical**, and they are worth opposite amounts. The first is a report about yesterday. Only the second protects tomorrow.

Mutation testing measures the other direction: break a line deliberately and see whether the paired test goes red. If it stays green, that test is **not guarding that line**, whatever its name says.

---

## Three verdicts

| | | |
|---|---|---|
| **잡음** | caught | the paired test went red. Good. |
| **샜음** | leaked | everything stayed green. A hole in the tests, and a finding in its own right. |
| **못 잼** | unmeasurable | the anchor did not match exactly once, the paired test does not exist, or it was already red. |

### 못 잼 is a failure, not a skip

This is the centre of the document.

When an anchor silently stops matching, that mutant becomes **a line of JSON that runs, measures nothing, and keeps the sweep total looking healthy**.

That is class two of the [five defect classes](04-briefing.md) — silent failure — which is precisely what this tool exists to catch. **The defect is living inside the tool.**

So 못 잼 counts as failure. A sweep with any unmeasurable mutant in it has not finished.

---

## Anchor rules

The anchor (`찾을것`) is the exact string in the source that gets replaced. Every rule below is something that actually happened.

### 1. Lift it verbatim from the file. Never retype it

One character of whitespace and **the anchor never matches again**. And a non-matching anchor is silent.

That is why `tools/add-mutant.mjs` exists — a tool instead of a paragraph telling people to be careful. Give it a line number and it reads that line off disk and uses it as the anchor.

```bash
node tools/add-mutant.mjs src/agent/recall.js 88 \
  --test test/recall.test.js \
  --what "only the longest match scores" \
  --then "a 3-variant word outranks a 1-variant word" \
  --replace "const 다맞음 = 맞은낱말 >= 1 ? 12 : 0;"
```

`--replace` may be omitted. The mutant is then written with `바꿀것` unset and the tool says so. **An unfinished mutant is better visible than remembered.**

### 2. It must match exactly once

Zero or many both **fail loudly**.

Many matches and you do not know which site you broke. Zero and you broke nothing. Skipping either one quietly is how a mutant list **rots into decoration** while the sweep keeps printing a healthy number.

`mutate.mjs` reports it as 못 잼 with the reason attached: `찾을것 matched 0 times (must be exactly 1)`.

### 3. `검사` must be a real PATH, not a nickname

A nickname **cost a whole sweep**. Two mutants ran, measured nothing, and the total looked fine.

`검사: "recall tests"` is not a path. `검사: "test/recall.test.js"` is.

It is now caught at the baseline stage: no file at that path and the mutant comes out as 못 잼 with `검사/test is not a real path`.

### 4. No-op mutants are reported

If `찾을것 === 바꿀것`, nothing was changed.

Run that and you get either "caught" or "leaked", and **both are lies**. The "leaked" case is the expensive one: it sends you **hunting for a hole that does not exist**, tearing through a test file looking for a missing assertion. So it comes out as 못 잼 with `no-op mutant: 찾을것 === 바꿀것`.

### 5. Mutate the call site, not the convenient helper

**One mutant leaked because of this.**

The helper was used in many places and was well covered. Breaking the helper turned tests red, so the mutant reported "caught". But the **call site that had just been fixed** was guarded by nothing at all.

A mutant has to break **the line you fixed**. If that line is a call to a helper, break the call, not the helper's insides.

---

## Never mutate in place

`mutate.mjs` **copies the source to a temp directory** and only ever writes there.

A Ctrl+C, or a test that takes the process down mid-run, must not leave a **deliberately broken file on disk**. Committing one of those is worse than anything this tool prevents.

Even inside the temp directory, the restore is in a `finally`:

```js
try { r = 돌리기(어긋.검사); } finally { writeFileSync(파일, 원본, 'utf8'); }
```

`mutate.copy` must list everything the suite needs to run. Leave something out and everything goes red — which is not a caught mutant, it is **a broken harness**.

---

## Baseline first

Before any mutation, run the paired tests **unmodified**.

**A test that was already red measures nothing.** It is red whether or not you break the line. Those come out as 못 잼 with `<file> was already red before the mutation`.

```
  · baseline test/recall.test.js → green · 1.4s
  ✗ baseline test/proxy.test.js → exit 1 · 0.9s
```

---

## Anchor drift

Source changes and anchors stop matching. That is normal. **Silence about it is not.**

```bash
node tools/repair-anchors.mjs
node tools/repair-anchors.mjs --write
```

Without `--write` it only reports what has drifted. When it does repair, it **lifts the new text from the file** — rule 1 applies here too.

---

## Running it

```bash
node tools/mutate.mjs                  # full sweep
node tools/mutate.mjs src/foo.js       # only mutants whose 곳 or 무엇 contains this
node tools/mutate.mjs --id recall-042  # one mutant
node tools/mutate.mjs --json           # machine-readable summary
```

A full sweep takes hours. If the only way to measure the fence you just moved is to wait for all of it, **you will stop measuring**, and then the tool might as well not exist. So there is a way to run a slice — and when you do, the screen always says **how many were filtered out**.

```
  filtered — 6 of 1,179 (src/foo.js)
```

Seeing green without knowing how many you skipped is the worst outcome available.

### Output shape

```
  ✓ recall-042 only the longest match scores   src/agent/recall.js → test/recall.test.js caught it · 1.4s

  ✗ proxy-011 header stripped before logging   src/backend/proxy.js
      test/proxy.test.js stayed green — nothing stops the next person deleting this line.
      the cause disappears from the log

  ⚠ scan-007 offline seal checked late   src/backend/scan.js — 찾을것 matched 0 times (must be exactly 1)

  1,125 잡음/caught · 2 샜음/leaked · 22 못잼/unmeasurable
```

---

## What the sweep found

**1,179 mutants** are registered, across 138 source files and 119 test files.

The last full sweep ran **1,149 mutants in 2h46m → 1,125 caught, 2 leaked, 22 unmeasurable**.

**Of those twenty-four, the dangerous ones are the 22.** The 2 leaks are honest holes: a test is not guarding a line, and it is reported as such. The 22 unmeasurable ones **were in the list, were named, were counted as present, and were measuring nothing**. They are invisible in a red run and invisible in a green run alike. Until that sweep ran, there was no way to know they existed.

If you want to know what hides behind a green build, that is the number.

---

## Do not sweep on a busy machine

Run a full sweep on a machine doing other timing-sensitive work and **load-induced timeouts turn into verdicts**.

`mutate.mjs` reads the test's exit code and nothing else. A test killed by the timeout exits non-zero, which lands on the "caught" side and is safe. The dangerous direction is the other one: a baseline that only just passes under load, or a timing-sensitive test that wobbles for reasons unrelated to the mutant.

Then you go **hunting a hole that does not exist**. You read the test file, pick apart the assertions, find nothing wrong, and spend the afternoon on scheduling noise.

Sweep on an idle machine. When something leaks, **re-run that one alone** before believing it.

```bash
node tools/mutate.mjs --id proxy-011
```

---

## One per fix

A fix with no mutant is **a fix nobody is guarding**. The next person deletes that line and nothing happens, and eventually somebody does.

Fix, confirm green, write the mutant right there. Not "in a batch later" — after a few days you no longer remember which character was carrying the meaning.

---

| | |
|---|---|
| ← [06 — Adjudication](06-adjudication.md) | [08 — Gate and record](08-gate-and-record.md) → |
