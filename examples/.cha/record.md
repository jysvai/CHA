# 기록 / record — examples/

Append only. This is the real record for the worked example in
[WALKTHROUGH.md](../WALKTHROUGH.md). Every output quoted below was produced by
the tool named next to it, on Windows, with `NO_COLOR=1`.

The status table is the only part of this file ever edited in place.
`node ../tools/record.mjs` appends rounds and refuses to write anything that
would make this file shorter.

---

## 상태 / status

| | |
|---|---|
| 관문 / gates | 1 |
| 브리핑 / briefings | 1 |
| 주장 / claims | 2 |
| 참 / true | 1 |
| 거짓 / false | 0 |
| 못 잼 / unmeasurable | 1 |
| 고침 / fixes | 1 |
| 어긋 / mutants | 2 |
| 마지막 전수 / last sweep | 2 → 2 잡음 / 0 샜음 / 0 못 잼 |

---

## 회차 1 / round 1 — 2026-09-16

### 사냥 / hunt

files read: `src/size.js` (1–12, the version now kept at `before/size.js`)
files skipped: none — the whole example is twelve lines

suspicion, `src/size.js:8` —
- promises: "a model is small when it has fewer than 8 billion parameters"
- does: `SMALL.test(name)` against `/(1b|2b|3b|7b)/`, which is a substring test
- for a person: a 32B model gets routed to whatever the small-model path does
- how to measure: call it with `qwen2.5-coder:32b` and print the result

### 브리핑 / briefings

```
  · size  .cha/briefings/size.md  2.8KB  lines 1–27

  1 briefing(s), cap 20KB
```

One chunk — the file is nowhere near the 20KB cap. A real file is cut at
function boundaries until each piece fits.

### 2차 눈 / second eye

model: not run. This example ships without a second-eye command configured
(`secondEye.command` is `null` in `.cha/config.json`), because a second eye is
an account on another platform and cannot be shipped in a repository.

The two claims below are the ones this briefing produces. They are written
down as claims, not as facts, which is the only status a claim has before
step 4.

### 판정 / adjudication

| 주장 / claim | 판정 | 돌린 것 / command | 나온 것 / output |
|---|---|---|---|
| the size rule matches a substring, so `32b` is read as `2b` | 참 | `node -e "import('./before/size.js').then(m=>console.log(m.isSmall('qwen2.5-coder:32b')))"` | `true` — and 32 is not fewer than 8 |
| the `.toLowerCase()` is dead code, because every caller already lower-cases the name before it gets here | 못 잼 | — | there is no caller. `src/size.js` is the whole module; the claim is about a codebase that is not in front of us, and nothing available separates the two readings. Recorded as 못 잼, **not** as false. |

2 claims → 1 참 / 0 거짓 / 1 못 잼.

### 빨간 검사 / red test

Written before `src/size.js` was touched, and watched fail:

```
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

true !== false
```

`sizeOf()` did not exist yet — it came out of the fix. The red test only knew
about `isSmall`, because that was the only thing the claim was about.

### 고침 / fixes

`src/size.js:18` — the substring rule replaced by a digit-run match with a
boundary on each side; `sizeOf()` split out so the size can be asserted as a
number rather than inferred from a boolean.

red `true !== false` → green `ok  a 32B model is not small` — mutants
`size-001`, `size-002`

### 어긋 / mutants

added 2, anchors lifted out of the file by `tools/add-mutant.mjs`:

- `size-001` — the whole run of digits is the size, not one digit of it
- `size-002` — the 8B boundary is exclusive

sweep:

```
  어긋내기 / mutation  (2 deliberate breakages, checking the tests notice)

  · baseline test/size.test.js → green · 0.1s

  ✓ size-001 the whole run of digits is the size, not one digit of it  src/size.js → test/size.test.js caught it · 0.1s
  ✓ size-002 the 8B boundary is exclusive  src/size.js → test/size.test.js caught it · 0.1s

  2 잡음/caught · 0 샜음/leaked
```

`size-001` is worth reading twice. It makes `sizeOf('qwen2.5-coder:32b')`
return `null`, and `isSmall` reads `null` as "not small" — so `isSmall` stays
**right by accident** under the mutation. It is caught only because the test
asserts `sizeOf` as well. A test that had checked `isSmall` alone would have
reported this mutant as 샜음, and the sweep would have been telling the truth.

### 관문 / gate 1

```
test    5 pass / 0 fail / 0 skip — 1 of 1 files exited cleanly
```

One gate command, because the example has one test file and nothing to lint.
A real repo's gate is three or more; see
[docs/en/08-gate-and-record.md](../../docs/en/08-gate-and-record.md).

### 다음 회차 후보 / next round candidates

`src/size.js:18` — `\s*b\b` accepts `32 b` with a space. Nothing in the example
produces that spelling, so it is not a defect yet; it is a thing that was seen
and not taken.
`test/size.test.js` — nothing asserts what happens for a name carrying two
sizes, e.g. `mixtral:8x22b`. The test asserts it is not small; it does not
assert which of the two numbers was read.
