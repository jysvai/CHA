---
description: Append this round to the cumulative record. Append only — nothing is ever deleted, including the things that turned out wrong.
---

# /cha-record

Write the round into `.cha/record.md`. This file is the deliverable of the whole method; the code changes are just what it happened to produce.

## Append only

**Nothing is ever deleted from the record.** Not the claims that turned out false, not the fixes that got reverted, not the mutants that leaked, not the four things nobody could measure.

The reason is concrete: the same claim comes back. A second eye on round 27 will raise the thing that was disproved on round 9, in slightly different words, with high confidence. If the counter-evidence is in the record you close it in thirty seconds. If it was deleted because "it was wrong anyway" you pay for the whole investigation twice, and this time you may reach the opposite conclusion and ship a regression to fix a bug that was never there.

A deleted record entry is the most expensive line you can remove from a repository.

The record here is **2,745 lines over 39 rounds** and it has never been edited downward. Sections get appended; the status table at the top is the only thing updated in place, and only by adding rows and bumping counts.

## What one round looks like

```markdown
## 회차 39 / round 39 — <date>

### 사냥 / hunt
<files read, files skipped, suspicions raised>

### 브리핑 / briefings
<tags, byte sizes>

### 2차 눈 / second eye
<model id, answered / lost>

### 판정 / adjudication
| claim | verdict | command run | output |
|---|---|---|---|
| ... | 참 | `node -e "..."` | `28.00 vs 51.00` |
| ... | 거짓 | `node -e "..."` | counter-evidence |
| ... | 못 잼 | — | Unix-only, no way to run here |

### 고침 / fixes
<file:line, red output, diff, green output, mutant id>

### 어긋 / mutants
<added ids; sweep result if run>

### 관문 / gate
<the three blocks with real numbers>

### 다음 회차 후보 / next round candidates
<what was seen but not taken this round>
```

## The status table

Keep one table at the top of the record with the running totals: gates run, briefings sent, claims received, claims true, fixes landed, mutants, last sweep result. Update it in place. It is the only thing anyone reads first, and it is what the portfolio numbers come from.

## 다음 회차 후보 — the row that keeps the loop alive

Anything you saw and did not take this round goes here, with file:line. Not a TODO comment in the code — those rot in place and nobody greps for them. A named candidate list is what makes round 40 start in ten seconds instead of an hour of re-reading.

## Output

The appended section, the updated status table, and the single next command.
