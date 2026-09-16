---
description: Scaffold CHA in this repository — .cha/ config, cumulative record, mutant list — and detect the gate commands.
---

# /cha-init

Set this repository up for the CHA loop. Run once per repo.

## Steps

1. **Refuse to guess the gate.** Read `package.json` / `Makefile` / `pyproject.toml` / `Cargo.toml` and find the commands that actually exist. Do not invent a `npm run lint` that is not there. If you find none, say so and ask which command counts as the gate — an unverified gate is worse than no gate.

2. **Create `.cha/`** (do not overwrite anything that exists):

   ```
   .cha/
     config.json      # gate commands, second-eye command, briefing size cap
     record.md        # cumulative record — append only, never delete
     mutants.json     # the mutant list
     briefings/       # generated briefings, one per chunk
     answers/         # second-eye answers, one per tag
   ```

   Seed `config.json` from `${CLAUDE_PLUGIN_ROOT}/templates/config.json`, `record.md` from `templates/record.md`, `mutants.json` from `templates/mutants.json`.

3. **Fill `config.json`** with what you actually found:

   ```json
   {
     "gate": {
       "test": "npm test",
       "check": "npm run check",
       "docs": "npm run docs"
     },
     "secondEye": {
       "command": null,
       "model": null,
       "mode": "read-only",
       "maxRetries": 6,
       "backoffMs": 1200000,
       "timeoutMs": 600000
     },
     "briefing": { "maxBytes": 20480 },
     "mutate": {
       "testCommand": "node {file}",
       "copy": ["src", "test", "bin", "lib", "docs", "tools", "package.json", "README.md", "LICENSE"],
       "timeoutMs": 180000
     },
     "writer": "claude-only"
   }
   ```

   Leave `secondEye.command` as `null` if you cannot verify one runs. Tell the user what to put there and point at `docs/en/01-setup.md`.

   `mutate.testCommand` runs **one test file** — `{file}` is the only substitution, and it is replaced with the path inside the work directory. `node {file}`, `npx vitest run {file}`, `npx jest {file}`, `python -m pytest {file}`. `mutate.copy` has to list enough for that command to work in a temp directory; anything missing from it is a mutant that reports 못 잼 forever.

4. **Check the gate is green *before* the loop starts.** Run each gate command once. A loop that starts on a red build cannot tell its own breakage from the pre-existing kind. Report the numbers you actually saw — pass, fail, skip, and how many test files exited cleanly.

5. **Add `.cha/briefings/` and `.cha/answers/` to `.gitignore`**, and leave `record.md` and `mutants.json` tracked. The record and the mutant list are the artifacts; the intermediate briefings are not.

6. **Report**: what the gate is, whether it is green right now, whether a second eye is configured, and the single next command (`/cha-hunt <path>` or `/cha-brief <path>`).

## Rules

- Never overwrite an existing `.cha/record.md`. If one exists, this repo is already under CHA — say so and stop.
- Never write a gate command you have not run.
