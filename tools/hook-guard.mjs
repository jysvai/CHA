#!/usr/bin/env node
// PostToolUse reminder — a fix without a red test and a mutant is not finished.
//
// The whole design of this file is one rule:
//
//   IT NEVER BLOCKS. IT ALWAYS EXITS 0.
//
// A hook that breaks somebody's session is worse than no hook. This one has no
// opinion strong enough to be worth a broken session, so every failure path —
// bad JSON on stdin, no stdin at all, an unreadable directory, a path that is
// not a path — ends the same way: print nothing, exit 0. There is no branch in
// here that can end a different way, and there is no `throw` that is not
// caught.
//
// What it does when everything is fine: if an Edit or Write just touched a
// source file (not a test) inside a repo that has a .cha/ directory, it hands
// one line of context back — that this fix still owes a red test and a mutant.
// That is all. It does not check whether the test exists, because checking
// would mean guessing the test's name, and a hook that is wrong once is a hook
// people turn off.
//
//   echo '{"tool_name":"Edit","tool_input":{"file_path":"src/foo.js"}}' | node tools/hook-guard.mjs
import { existsSync, statSync } from 'node:fs';
import { dirname, resolve, relative, isAbsolute, basename, extname } from 'node:path';

// Nothing below may escape. If anything at all goes wrong we are silent.
function 조용히끝() { process.exit(0); }

process.on('uncaughtException', 조용히끝);
process.on('unhandledRejection', 조용히끝);

let 들어온것 = '';
process.stdin.setEncoding('utf8');
process.stdin.on('error', 조용히끝);
process.stdin.on('data', (조각) => { 들어온것 += 조각; if (들어온것.length > 4_000_000) 조용히끝(); });
process.stdin.on('end', () => { try { 해보기(들어온것); } catch { /* silent by design */ } process.exit(0); });

// No stdin within a few seconds means this was not called as a hook.
const 시한 = setTimeout(조용히끝, 5000);
시한.unref?.();

const 소스확장 = new Set([
  '.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.mts', '.cts',
  '.py', '.rb', '.go', '.rs', '.java', '.kt', '.kts', '.scala', '.swift',
  '.c', '.h', '.cc', '.cpp', '.hpp', '.cs', '.m', '.mm',
  '.php', '.ex', '.exs', '.lua', '.dart', '.sh', '.bash', '.ps1', '.pl',
]);

/** Is this a test file? Cast wide — a false "this is a test" only costs a missing reminder. */
function 검사파일인가(길) {
  const 낮은 = 길.replace(/\\/g, '/').toLowerCase();
  const 이름 = basename(낮은);
  if (/(^|\/)(test|tests|__tests__|spec|__specs__|e2e|fixtures?|testdata)(\/|$)/.test(낮은)) return true;
  if (/\.(test|spec)\.[^.]+$/.test(이름)) return true;
  if (/^test_[^.]+\.py$/.test(이름) || /_test\.[^.]+$/.test(이름)) return true;
  if (/^conftest\.py$/.test(이름)) return true;
  return false;
}

/** Walk up looking for .cha/. Bounded, because an unbounded walk on a broken path is a hang. */
function 차있나(에서) {
  let 여기 = 에서;
  for (let i = 0; i < 40; i++) {
    const 후보 = resolve(여기, '.cha');
    try { if (existsSync(후보) && statSync(후보).isDirectory()) return 후보; } catch { return null; }
    const 위 = dirname(여기);
    if (!위 || 위 === 여기) return null;
    여기 = 위;
  }
  return null;
}

function 해보기(글) {
  clearTimeout(시한);
  if (!글 || !글.trim()) return;

  let 짐;
  try { 짐 = JSON.parse(글); } catch { return; }   // not JSON: not our business
  if (!짐 || typeof 짐 !== 'object') return;

  const 도구 = String(짐.tool_name ?? '');
  if (도구 !== 'Edit' && 도구 !== 'Write' && 도구 !== 'MultiEdit' && 도구 !== 'NotebookEdit') return;

  const 곳 = 짐.tool_input?.file_path ?? 짐.tool_input?.notebook_path ?? 짐.tool_input?.path;
  if (typeof 곳 !== 'string' || !곳.trim()) return;

  // A tool that reported failure did not change anything to remind anybody about.
  if (짐.tool_response && 짐.tool_response.success === false) return;

  const 일터 = typeof 짐.cwd === 'string' && 짐.cwd ? 짐.cwd : process.cwd();
  let 온전한길;
  try { 온전한길 = resolve(일터, 곳); } catch { return; }

  if (!소스확장.has(extname(온전한길).toLowerCase())) return;
  if (검사파일인가(온전한길)) return;

  const 차 = 차있나(dirname(온전한길));
  if (!차) return;   // not a CHA repo: say nothing at all

  // Show it relative to the repo when we can. Windows hands over both slashes
  // and both drive-letter cases, so compare resolved paths, not strings.
  let 보일길 = 곳.replace(/\\/g, '/');
  try {
    const 안쪽 = relative(resolve(일터), 온전한길).replace(/\\/g, '/');
    if (안쪽 && !안쪽.startsWith('..') && !isAbsolute(안쪽)) 보일길 = 안쪽;
  } catch { /* the absolute path is a fine fallback */ }

  const 말 = [
    `CHA: ${보일길} is source, and this repo is under CHA (.cha/ found).`,
    '',
    'A fix is not finished until three things exist:',
    '  1. 빨간 검사 / red test — the test that failed for this reason, run before the edit, output kept.',
    '     If it was written after the fix, nobody can tell whether it passes because of the fix,',
    '     because it asserts something always true, or because it never reaches the assertion.',
    '  2. 어긋 / mutant — break the fixed line on purpose and confirm a named test goes red:',
    `     node tools/add-mutant.mjs ${보일길} <line> --test <testfile> --what "…" --then "…" --replace "…"`,
    '     Then measure it: node tools/mutate.mjs --id <id>.  If it stays green the fix is unguarded',
    '     and the next person will delete it.',
    '  3. 기록 / record — the round section in .cha/record.md, appended, never edited downward.',
    '',
    'If all three are already done, ignore this. This hook does not check; it only reminds.',
  ].join('\n');

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: 말,
    },
  }));
}
