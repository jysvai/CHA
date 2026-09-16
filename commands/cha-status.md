---
description: Where the loop stands right now — gate, open claims, mutant health, and the one thing to do next.
---

# /cha-status

Read `.cha/record.md`, `.cha/mutants.json`, `.cha/briefings/`, and `.cha/answers/`, and answer one question: **what is the next single thing to do?**

## Report

```
CHA — <repo>

관문 / gate        39   12,596 / 0 / 1   156 of 156 files   (green, <date>)
사냥 / hunt        <files read> of <files total>
브리핑 / briefings <sent>   answered <n>  waiting <n>  lost <n>
판정 / verdicts    <claims> → <true> true / <false> false / <unmeasurable> unmeasurable
고침 / fixes       <n> landed
어긋 / mutants     1,179   last sweep 1,125 caught / 2 leaked / 22 unmeasurable
기록 / record      2,745 lines

다음 / next: <one command>
```

## Rules

- **Count what is there, do not estimate.** Read the files. A status line that was inferred is worth less than no status line.
- **Waiting and lost are different.** A briefing with no answer yet is waiting. One whose queue run errored out is lost and needs re-asking. Reporting them together hides holes.
- **Leaked and unmeasurable mutants are open findings.** They belong in the "next" decision, not in a summary footer.
- **Exactly one next command.** Not a list of three things you could do. The loop has an order; say where in it you are.

## What "done" means

Zero open claims, zero leaked mutants, zero unmeasurable mutants, green gate, and the record appended. Not "no known bugs" — *no unanswered questions*. Those are different, and the second one is the only one you can check.
