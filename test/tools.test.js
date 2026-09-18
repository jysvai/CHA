#!/usr/bin/env node
// Run me: node test/tools.test.js
// Exit 0 is green, anything else is red. Zero dependencies on purpose.
//
// Every test below is a defect that was confirmed by RUNNING the tool, and
// each one was watched fail here before the tool was touched. The red output
// is quoted above the test that produced it, because "it fails" and "it fails
// for the reason I think" are different sentences and only the second one is
// worth keeping.
//
// They are all the same shape, and it is the shape this repository exists to
// hunt: a tool that did something other than what it said, and said nothing.
// A sweep that scores an unmeasured line as caught, a queue that sends nothing
// and reports success, a cap that stops capping. None of them turn anything
// red on their own — which is exactly why they need a test.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = join(dirname(fileURLToPath(import.meta.url)), '..');
const 임시들 = [];

/** A throwaway repo. Files are given as { 'path/name': 'contents' }. */
function 터(파일들) {
  const 곳 = mkdtempSync(join(tmpdir(), 'cha-test-'));
  임시들.push(곳);
  for (const [이름, 내용] of Object.entries(파일들)) {
    const 길 = join(곳, 이름);
    mkdirSync(dirname(길), { recursive: true });
    writeFileSync(길, 내용, 'utf8');
  }
  return 곳;
}

const 돌리기 = (도구, 인자, 곳) =>
  spawnSync(process.execPath, [join(뿌리, 'tools', 도구), ...인자], { cwd: 곳, encoding: 'utf8' });

const 화면 = (r) => `${r.stdout ?? ''}${r.stderr ?? ''}`;

let 센것 = 0;
let 샌것 = 0;
function 검사(이름, fn) {
  try {
    fn();
    센것 += 1;
    console.log(`  ok  ${이름}`);
  } catch (e) {
    샌것 += 1;
    console.log(`  FAIL  ${이름}`);
    console.log(`        ${String(e.message).split('\n').join('\n        ')}`);
  }
}

// 20 seconds, not 4. At 4 the control below went 못 잼 about one run in four on
// a busy machine — node's own start-up, not the mutation. Before the timeout
// verdict was fixed that same slowness scored as 잡음 and nobody saw it; the
// flake was created by the fix only in the sense that the fix made it visible.
// The hang test passes its own short timeout, because there it is the point.
const 설정 = (제한 = 20000) => JSON.stringify({ mutate: { testCommand: 'node {file}', copy: ['src', 'test'], timeoutMs: 제한 } }, null, 2);
const 어긋목록 = (어긋들) => JSON.stringify({ 왜: 'test fixture', 어긋들 }, null, 2);

/* ───────────────────────── mutate.mjs ───────────────────────── */

// Before the fix this printed:
//   ✓ hang-001 … caught it · 4.0s
//   1 잡음/caught · 0 샜음/leaked        (exit 0)
// The test never asserted anything — it was killed at the timeout. A mutant
// nobody could measure was counted on the healthy side of the table, which is
// the one place this repository cannot afford to be wrong.
검사('a mutation that makes the test hang is 못 잼, not 잡음', () => {
  const 곳 = 터({
    'src/a.js': 'export const n = 1;\nexport const two = 2;\n',
    'test/a.test.js': 'import { n } from "../src/a.js";\nif (n !== 1) process.exit(1);\n',
    '.cha/config.json': 설정(4000),
    '.cha/mutants.json': 어긋목록([{
      id: 'hang-001', 곳: 'src/a.js', 무엇: 'the module finishes evaluating',
      그러면: 'importing it never returns', 찾을것: 'export const two = 2;',
      바꿀것: 'while (true) {}', 검사: 'test/a.test.js',
    }]),
  });

  const r = 돌리기('mutate.mjs', ['--json'], 곳);
  const 결과 = JSON.parse(r.stdout).결과[0];
  assert.equal(결과.판정, '못잼', `verdict was ${결과.판정}`);
  assert.match(결과.까닭 ?? '', /timed out|시간/i);
  assert.notEqual(r.status, 0, 'an unmeasurable mutant must not exit green');
});

// A test killed by the timeout and a test that fails are not the same event.
// This is the control for the test above: without it, "everything is 못 잼"
// would pass both.
검사('a mutation the test actually notices is still 잡음', () => {
  const 곳 = 터({
    'src/a.js': 'export const n = 1;\n',
    'test/a.test.js': 'import { n } from "../src/a.js";\nif (n !== 1) process.exit(1);\n',
    '.cha/config.json': 설정(),
    '.cha/mutants.json': 어긋목록([{
      id: 'ok-001', 곳: 'src/a.js', 무엇: 'n is 1', 그러면: 'the test goes red',
      찾을것: 'export const n = 1;', 바꿀것: 'export const n = 2;', 검사: 'test/a.test.js',
    }]),
  });

  const r = 돌리기('mutate.mjs', ['--json'], 곳);
  assert.equal(JSON.parse(r.stdout).결과[0].판정, '잡음');
  assert.equal(r.status, 0);
});

// Before the fix: add-mutant.mjs created a second list under 어긋들 beside the
// existing `mutants`, and the sweep read 어긋들 only. The file still showed
// both entries. One mutant was swept, the other was in the list, named,
// counted by eye, and measuring nothing — docs/en/10-faq.md offers this shape.
검사('a mutant list written as { "mutants": [...] } is swept whole, not silently halved', () => {
  const 곳 = 터({
    'src/a.js': 'export const n = 1;\nexport const two = 2;\n',
    'test/a.test.js': 'import { n, two } from "../src/a.js";\nif (n !== 1 || two !== 2) process.exit(1);\n',
    '.cha/config.json': 설정(),
    '.cha/mutants.json': JSON.stringify({
      mutants: [{
        id: 'old-001', 곳: 'src/a.js', 무엇: 'n is 1', 그러면: 'the test goes red',
        찾을것: 'export const n = 1;', 바꿀것: 'export const n = 9;', 검사: 'test/a.test.js',
      }],
    }, null, 2),
  });

  const 보탬 = 돌리기('add-mutant.mjs', ['src/a.js', '2', '--test', 'test/a.test.js',
    '--what', 'two is 2', '--then', 'the test goes red', '--replace', 'export const two = 9;'], 곳);
  assert.equal(보탬.status, 0, 화면(보탬));

  const r = 돌리기('mutate.mjs', ['--json'], 곳);
  assert.equal(JSON.parse(r.stdout).결과.length, 2, 'both mutants must be swept');
});

/* ───────────────────────── queue.mjs ───────────────────────── */

const 큐터 = (설정더) => 터({
  '.cha/briefings/alpha.md': '# briefing\nalpha\n',
  '.cha/briefings/bravo.md': '# briefing\nbravo\n',
  '.cha/config.json': JSON.stringify({
    secondEye: { command: 'echo reviewed', model: 'pinned-id', maxRetries: 1, backoffMs: 100, timeoutMs: 5000, ...설정더 },
  }, null, 2),
});

// Before the fix: `--only --redo` printed "2 answered" and exit 0. The flag
// was taken as the value of --only, the filter fell back to null, and the
// whole queue went out while the person believed one tag had. A second eye
// costs quota, so this is paid for in money as well as in trust.
검사('a flag where a value belongs stops the queue instead of widening it', () => {
  const r = 돌리기('queue.mjs', ['--only', '--redo'], 큐터());
  assert.equal(r.status, 2, 화면(r));
  assert.match(화면(r), /--only/);
});

// Before the fix: a typo'd directory name was dropped on the floor and the
// default .cha/briefings ran. `--sinse HEAD~3` is the same defect in the repo
// this loop came from; it cost a 40-minute review of the wrong range.
검사('an unknown flag stops the queue', () => {
  const r = 돌리기('queue.mjs', ['--brieffings', 'elsewhere'], 큐터());
  assert.equal(r.status, 2, 화면(r));
  assert.match(화면(r), /--brieffings/);
});

// Before the fix: maxRetries "six" → Number("six") → NaN → `NaN >= 0` is
// false → the send loop never ran once. The report read
//   0 answered · 0 already had answers · 0 lost                (exit 0)
// The step the method is named after did nothing and called it success.
검사('a non-numeric retry count stops the queue instead of skipping every briefing', () => {
  const r = 돌리기('queue.mjs', [], 큐터({ maxRetries: 'six' }));
  assert.equal(r.status, 2, 화면(r));
  assert.match(화면(r), /maxRetries/);
});

// The control: the same queue, one legal scope, one answer.
검사('a correct --only sends exactly that briefing', () => {
  const 곳 = 큐터();
  const r = 돌리기('queue.mjs', ['--only', 'alpha'], 곳);
  assert.match(화면(r), /1 answered/, 화면(r));
});

// Before the fix: a reviewer that exits without reading its briefing raised
// EPIPE on a stream with no error listener, and the process died mid-queue
// with a Node stack. Measured at 1 run in 8 with a small briefing; with a
// large one it is every run. Answers already earned and not yet written are
// lost — the thing the whole serial design exists to prevent.
검사('a reviewer that never reads its briefing does not kill the queue', () => {
  const 곳 = 터({
    '.cha/briefings/big.md': `# briefing\n${'x'.repeat(400_000)}\n`,
    '.cha/config.json': JSON.stringify({
      secondEye: { command: `"${process.execPath}" -e "process.exit(0)"`, model: 'pinned-id', maxRetries: 0, backoffMs: 50, timeoutMs: 5000 },
    }, null, 2),
  });

  const r = 돌리기('queue.mjs', [], 곳);
  assert.doesNotMatch(화면(r), /Node\.js v/, 'the queue crashed instead of reporting the loss');
  assert.match(화면(r), /lost/);
});

/* ───────────────────────── brief.mjs ───────────────────────── */

const 큰소스 = () => {
  let s = '';
  for (let i = 0; s.length < 30_000; i++) s += `export function f${i}() {\n  return ${i};\n}\n`;
  return s;
};

// Before the fix: `--max 20kb` → Number("20kb") → NaN. Every `> NaN` is false,
// so nothing was ever cut and nothing was ever flagged; the summary printed
// "cap NaNKB" and one 42KB briefing went out, exit 0. The cap is the one
// number in this tool, and a typo in it removed the tool.
검사('a --max that is not a number stops brief instead of removing the cap', () => {
  const 곳 = 터({ 'src/a.js': 'export function a() { return 1; }\n' });
  const r = 돌리기('brief.mjs', ['src/a.js', '--max', '20kb'], 곳);
  assert.equal(r.status, 2, 화면(r));
  // The reason has to be the reason. Asserting only /--max/ let the mutant
  // sweep delete the number check and stay green: the next guard down says
  // "--max must be greater than 0" and the test could not tell the two apart.
  assert.match(화면(r), /not a number/, 화면(r));
  assert.doesNotMatch(화면(r), /NaN/);
});

// A chunk that cannot be split is a real situation and the tool says so on
// screen. It also exited 0, so nothing calling it could tell. The cap is
// advisory the moment a script is the one reading it.
검사('a briefing over the cap exits non-zero', () => {
  const 곳 = 터({ 'src/big.js': `export function one() {\n${'  // a line\n'.repeat(3000)}}\n` });
  const r = 돌리기('brief.mjs', ['src/big.js', '--out', '.cha/briefings'], 곳);
  assert.match(화면(r), /OVER THE CAP/i, 화면(r));
  assert.notEqual(r.status, 0, 'an over-cap briefing must not pass quietly');
});

// Before the fix: a directory argument reached readFileSync and the user got
// an EISDIR stack. /cha-brief and /cha-hunt both describe a path as "a file, a
// directory, or a glob".
검사('a directory argument gets a sentence, not a stack trace', () => {
  const 곳 = 터({ 'src/a.js': 'export function a() { return 1; }\n' });
  const r = 돌리기('brief.mjs', ['src'], 곳);
  assert.equal(r.status, 2, 화면(r));
  assert.doesNotMatch(화면(r), /Node\.js v/);
  assert.match(화면(r), /one file/i);
});

// A file that is there, addressed the way Windows tab-completion addresses it.
// join(cwd, 'C:\\repo\\src\\a.js') is 'C:\\repo\\C:\\repo\\src\\a.js', and the
// tool reports "no such file" for a file it is looking straight at.
검사('an absolute path is read, not joined onto the working directory', () => {
  const 곳 = 터({ 'src/a.js': 'export function a() { return 1; }\n' });
  const r = 돌리기('brief.mjs', [join(곳, 'src', 'a.js'), '--out', '.cha/briefings'], 곳);
  assert.equal(r.status, 0, 화면(r));
});

/* ───────────────────────── report ───────────────────────── */

for (const 곳 of 임시들) {
  try { rmSync(곳, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }); } catch { /* the verdict still goes out */ }
}

const 전부 = 센것 + 샌것;
console.log(`\n  ${센것} pass / ${샌것} fail / 0 skip — ${전부} checks in 1 file`);
process.exitCode = 샌것 ? 1 : 0;
