# 기록 / record — <repo name>

Append only. Nothing is ever deleted from this file: not the claims that turned
out false, not the fixes that were reverted, not the mutants that leaked, not
the things nobody could measure.

The reason is concrete. The same claim comes back. A second eye two rounds
later raises, with high confidence and different wording, the thing that was
disproved earlier. With the counter-evidence on file you close it in thirty
seconds. Without it you pay for the whole investigation twice, and there is a
real chance you reach the opposite conclusion and ship a regression to fix a
bug that never existed.

The status table below is the only part of this file that is ever edited in
place, and only by bumping counts. `node tools/record.mjs` appends rounds and
refuses to write anything that would make this file shorter.

---

## 상태 / status

| | |
|---|---|
| 관문 / gates | 0 |
| 브리핑 / briefings | 0 |
| 주장 / claims | 0 |
| 참 / true | 0 |
| 거짓 / false | 0 |
| 못 잼 / unmeasurable | 0 |
| 고침 / fixes | 0 |
| 어긋 / mutants | 0 |
| 마지막 전수 / last sweep | — |

Every number in this table must be traceable to a section below it. If it is
not, the table is wrong and the sections are right.

---

## 회차 1 / round 1 — <date>

This is the shape of a round. Replace it with your first real one; do not
delete the headings. A round with no `### 사냥` heading and a round where
nothing was hunted look identical a year later, and only one of them is a fact.

### 사냥 / hunt

files read: `src/rank.js` (1–214), `src/probe.js` (1–96)
files skipped: `src/vendor/` — third-party, not ours to fix
suspicions: 3 — all with `file:line` and a way to measure them

### 브리핑 / briefings

`rank` 18.2KB · `probe` 9.4KB

Both under the 20KB cap. Bytes, not lines: CJK comments are 3 bytes a
character, so a line count would have said 6KB and been wrong by a factor of
three.

### 2차 눈 / second eye

model: `<exact pinned id>` · sent 2 · answered 2 · lost 0

Serial, one briefing at a time. `secondEye.mode` is `read-only`; the second eye
holds no write tools.

### 판정 / adjudication

| 주장 / claim | 판정 | 돌린 것 / command | 나온 것 / output |
|---|---|---|---|
| ranking favours multi-variant words | 참 | `node -e "import('./src/rank.js').then(m=>console.log(m.점수('가'),m.점수('가나다')))"` | `28.00 51.00` — the longer word wins on variant count alone |
| the offline flag is read after the first request | 참 | `node bin/cli.js --offline diagnose` with the socket stubbed | `contacted 1` — it knocked before the flag was read |
| the retry loop double-counts attempts | 거짓 | `node -e "…"` | `count 3, expected 3` — counter-evidence, not "no" |
| child processes are not reaped on exit | 못 잼 | — | Unix-only path; this host is Windows. Recorded as 못 잼, **not** false. |

4 claims → 2 참 / 1 거짓 / 1 못 잼.

### 고침 / fixes

`src/rank.js:88` — red `28.00 vs 51.00` → green `40.00 vs 40.00` — mutant `rank-001`
`src/probe.js:31` — red `contacted 1` → green `contacted 0` — mutant `probe-001`

One defect per commit, so a revert can take back exactly one thing.

### 어긋 / mutants

added 2 (`rank-001`, `probe-001`)
sweep: `node tools/mutate.mjs rank` → 1 잡음 / 0 샜음 / 0 못 잼

Anchors lifted out of the file by `tools/add-mutant.mjs`, never retyped. One
character of whitespace off and the anchor stops matching forever, and a
non-matching anchor is a mutant that runs, measures nothing, and keeps the
total looking healthy.

### 관문 / gate 1

```
test    482 pass / 0 fail / 1 skip — 31 of 31 files exited cleanly
check   OK across 44 files
docs    18 pages, 0 broken links
```

Numbers, never the word "pass". A suite where files crash before asserting
reports *more* passes, not fewer — which is why the file count is on the same
line. A skip is not a pass.

### 다음 회차 후보 / next round candidates

`src/probe.js:214` — the header is stripped before the log line; a failure here
may be unattributable
`test/rank.test.js:90` — asserts that the call returned, not what it returned

Named here with `file:line`, not left as a `TODO` in the code. TODOs rot in
place because nobody greps for them.
