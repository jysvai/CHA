---
name: cha-record
description: Keep one append-only record of every review round — claims, verdicts, counter-evidence, fixes, mutants, gate numbers. Use when a review spans many rounds or many weeks and the same findings keep coming back.
---

# 기록 / The record

One file. Append only. It is the actual deliverable of CHA — the code changes are a by-product.

`.cha/record.md` here is **2,745 lines over 39 rounds** and has never been edited downward.

## Append only, and what that actually costs to violate

Nothing is deleted. Not the claims that turned out false. Not the fixes that were reverted. Not the mutants that leaked. Not the four things nobody could measure.

The reason is not sentimentality:

**The same claim comes back.** A reviewer on round 27 raises, with high confidence and different wording, the thing that was disproved on round 9. If the counter-evidence is on file, you close it in thirty seconds. If it was deleted because "it was wrong anyway", you pay for the whole investigation a second time — and there is a real chance you land on the opposite conclusion and ship a regression to fix a bug that never existed.

**A reverted fix is more informative than one that stuck.** It tells the next round which shape of change this code refuses. That is exactly the knowledge that disappears first.

**못 잼 is a map of the harness.** Twenty-two unmeasurable mutants and four unmeasurable claims describe precisely what this machine cannot see. Delete them and the next person re-discovers the boundary by walking into it.

A deleted record entry is the most expensive line you can remove from a repository.

## Shape of a round

```markdown
## 회차 39 / round 39 — 2026-09-16

### 사냥 / hunt
files read: … · files skipped: … (say which, and why)

### 브리핑 / briefings
<tag> 18.2KB · <tag> 19.7KB · …

### 2차 눈 / second eye
model: <pinned id> · sent 12 · answered 12 · lost 0

### 판정 / adjudication
| claim | verdict | command | output |
|---|---|---|---|
| ranking favours multi-variant words | 참 | `node -e "…"` | `28.00 vs 51.00` |
| offline flag ignored on diagnose | 참 | `node -e "…"` | `contacted 1` |
| retry loop double-counts | 거짓 | `node -e "…"` | `count 3, expected 3` |
| zombie reaping on exit | 못 잼 | — | Unix-only path, Windows host |

### 고침 / fixes
src/agent/recall.js:88 — red `28.00 vs 51.00` → green `40.00 vs 40.00` — mutant recall-042

### 어긋 / mutants
added 6 (recall-042 … scanui-017) · sweep: 1,149 → 1,125 잡음 / 2 샜음 / 22 못 잼 · 2h46m

### 관문 / gate 39
test 12,596 / 0 / 1 — 156 of 156 files · check OK 167 files · docs 62 pages 0 broken

### 다음 회차 후보 / next round candidates
src/backend/proxy.js:214 — header stripped before the log line, may hide the cause
test/jobs.test.js:90 — asserts the call returned, not what it returned
```

## The status table

One table at the top, updated in place, add-only in spirit:

| | |
|---|---|
| 관문 / gates | 39 |
| 브리핑 / briefings | 39 |
| 주장 / claims | 57 |
| 참 / true | 22 |
| 고침 / fixes | 19 |
| 어긋 / mutants | 1,179 |
| 마지막 전수 / last sweep | 1,149 → 1,125 / 2 / 22 |

It is the only part anybody reads first, and it is where the portfolio numbers come from. Every number in it must be traceable to a section below it.

## 다음 회차 후보 — the row that keeps the loop alive

Everything you saw and did not take, with `file:line`.

Not a `TODO` in the code — those rot in place and nobody greps for them. A named candidate list is the difference between round 40 starting in ten seconds and starting with an hour of re-reading.

## Writing discipline

- Append **as you go**, not at the end. A verdict you remember but did not write is a verdict you will re-derive.
- Record what you **did not** read. A skipped slice and a clean slice must never look the same later.
- Plain language for consequences: what a **person** saw, not what the diff did. "A lock the comment says is on, that locks nothing" is retrievable a year later. "Fixed flag handling in setup.js" is not.
