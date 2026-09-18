#!/usr/bin/env node
// 어긋내기 — mutation testing, the CHA way.
//
// `npm test` being green means "nobody broke anything". It does not mean
// "if you break it, something notices". Those two look identical from the
// outside and are worth opposite amounts.
//
// So we measure the other direction: break a line on purpose and check that
// the test paired with it goes red. If it stays green, that test is not
// guarding that line, whatever its name says.
//
// Three verdicts, and the third one is the point:
//   잡음   caught        the paired test went red
//   샜음   leaked        everything stayed green — a hole in the tests
//   못 잼  unmeasurable  the anchor did not match exactly once, the paired
//                        test does not exist, or it was already red
//
// 못 잼 counts as FAILURE. An anchor that silently stops matching turns a
// mutant into a line of JSON that runs, measures nothing, and keeps the total
// looking healthy — which is exactly the defect class this tool exists to find.
//
// The source is never mutated in place. A Ctrl+C or a test that takes the
// process down mid-run would leave a deliberately broken file on disk, and
// committing that is worse than anything this tool prevents. We copy to a temp
// directory and only ever write there.
//
//   node tools/mutate.mjs                  full sweep, human table
//   node tools/mutate.mjs src/foo.js       only mutants whose 곳/무엇 matches
//   node tools/mutate.mjs --id recall-042  one mutant
//   node tools/mutate.mjs --json           machine-readable summary
import { cpSync, mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const 뿌리 = process.cwd();
const 인자 = process.argv.slice(2);
const json = 인자.includes('--json');

const G = '\x1b[32m'; const R = '\x1b[31m'; const Y = '\x1b[33m'; const D = '\x1b[90m'; const X = '\x1b[0m';
const 색없나 = process.env.NO_COLOR || !process.stdout.isTTY;
const 색 = (c, s) => (색없나 ? s : `${c}${s}${X}`);
const 말 = (s = '') => { if (!json) console.log(s); };

// ── config ──────────────────────────────────────────────────────────────
// .cha/config.json drives everything that is repo-specific. Nothing here
// guesses: a runner we invented and never ran is a gate that does not gate.
const 설정길 = join(뿌리, '.cha', 'config.json');
if (!existsSync(설정길)) {
  console.error('  .cha/config.json not found. Run /cha-init first.');
  process.exit(2);
}
const 설정 = JSON.parse(readFileSync(설정길, 'utf8'));
const 어긋설정 = 설정.mutate ?? {};
// How to run ONE test file. {file} is replaced with the path inside the work dir.
//   node:    "node {file}"
//   vitest:  "npx vitest run {file}"
//   jest:    "npx jest {file}"
//   pytest:  "python -m pytest {file}"
const 검사명령 = 어긋설정.testCommand ?? 'node {file}';
// What to copy into the work dir. Must be enough for the suite to run.
const 베낄것 = 어긋설정.copy ?? ['src', 'test', 'bin', 'lib', 'docs', 'tools', 'package.json', 'README.md', 'LICENSE'];
const 제한시간 = 어긋설정.timeoutMs ?? 180000;

const 목록길 = join(뿌리, '.cha', 'mutants.json');
if (!existsSync(목록길)) {
  console.error('  .cha/mutants.json not found. Run /cha-init first.');
  process.exit(2);
}
const 원자료 = JSON.parse(readFileSync(목록길, 'utf8'));
const 모든어긋 = (Array.isArray(원자료) ? 원자료 : 원자료.어긋들 ?? 원자료.mutants ?? []).map(칸맞추기);

// Both spellings work, so a repo can keep the original Korean fields or use
// English ones. Mixing them in one file is allowed; it is one less reason for
// somebody to retype an anchor.
function 칸맞추기(x) {
  return {
    id: x.id ?? null,
    곳: x.곳 ?? x.where ?? x.file,
    무엇: x.무엇 ?? x.what,
    그러면: x.그러면 ?? x.then ?? '',
    찾을것: x.찾을것 ?? x.find,
    바꿀것: x.바꿀것 ?? x.replace,
    검사: x.검사 ?? x.test,
  };
}

// ── which mutants to run ────────────────────────────────────────────────
// A full sweep takes hours. If the only way to measure the fence you just
// moved is to wait for all of it, you will stop measuring — and then this tool
// might as well not exist. So there is a way to run a slice, and the screen
// always says how many were filtered out (seeing green without knowing how
// many you skipped is the worst outcome available).
const id고른것 = 인자.includes('--id') ? 인자[인자.indexOf('--id') + 1] : null;
// Windows tab-completion hands over backslashes; 곳 is always slashes.
const 걸러 = 인자.filter((a) => !a.startsWith('--') && a !== id고른것).map((a) => a.replace(/\\/g, '/'));

let 어긋들 = 모든어긋;
if (id고른것) 어긋들 = 어긋들.filter((x) => x.id === id고른것);
else if (걸러.length) 어긋들 = 어긋들.filter((x) => 걸러.some((말) => String(x.곳).includes(말) || String(x.무엇).includes(말)));

if (어긋들.length === 0) {
  console.error(`  nothing matched: ${id고른것 ?? 걸러.join(' · ')}`);
  process.exit(2);
}

// ── a work dir of its own ───────────────────────────────────────────────
const 일터 = mkdtempSync(join(tmpdir(), 'cha-mutate-'));
for (const 것 of 베낄것) {
  const 밖 = join(뿌리, 것);
  if (!existsSync(밖)) continue;          // missing is fine; unreadable is not
  cpSync(밖, join(일터, 것), { recursive: true });
}

/** Run one test file inside the work dir. Returns the exit code, never its output. */
function 돌리기(검사) {
  const t0 = Date.now();
  const 줄 = 검사명령.replace('{file}', 검사);
  const [cmd, ...args] = 줄.split(/\s+/);
  const 옵션 = {
    cwd: 일터,
    encoding: 'utf8',
    // A test must never wait for a person. If it stands, we cut it here and say so.
    timeout: 제한시간,
    env: { ...process.env, NO_COLOR: '1' },
  };
  // Windows needs the shell, and the shell wants ONE string. Handing it a split
  // argv as well makes Node print a deprecation warning into the middle of every
  // sweep — a false warning, which by this repo's own rules is a defect.
  const r = process.platform === 'win32'
    ? spawnSync(줄, { ...옵션, shell: true })
    : spawnSync(cmd, args, 옵션);
  return { code: r.status, 걸린: Date.now() - t0, 섰나: r.error?.code === 'ETIMEDOUT' };
}

const 결과 = [];
let 못잰것 = 0;

try {
  // ── 1) baseline first. A test that was already red measures nothing ───
  말('');
  말(`  어긋내기 / mutation  ${색(D, `(${어긋들.length} deliberate breakages, checking the tests notice)`)}`);
  if (어긋들.length !== 모든어긋.length) {
    말(`  ${색(Y, `filtered — ${어긋들.length} of ${모든어긋.length} (${id고른것 ?? 걸러.join(' · ')})`)}`);
  }
  말('');

  const 맨것 = new Map();
  for (const 검사 of [...new Set(어긋들.map((x) => x.검사))]) {
    if (!검사 || !existsSync(join(일터, 검사))) { 맨것.set(검사, null); continue; }
    const r = 돌리기(검사);
    맨것.set(검사, r.code === 0);
    말(`  ${r.code === 0 ? 색(G, '·') : 색(R, '✗')} ${색(D, `baseline ${검사} → ${r.code === 0 ? 'green' : `exit ${r.code}${r.섰나 ? ' (timed out)' : ''}`} · ${(r.걸린 / 1000).toFixed(1)}s`)}`);
  }
  말('');

  // ── 2) one at a time ─────────────────────────────────────────────────
  for (const 어긋 of 어긋들) {

    const 파일 = join(일터, 어긋.곳 ?? '');

    if (!어긋.곳 || !existsSync(파일)) {
      결과.push({ id: 어긋.id, 곳: 어긋.곳, 무엇: 어긋.무엇, 판정: '못잼', 까닭: `no such file: ${어긋.곳}` });
      못잰것++; continue;
    }
    if (맨것.get(어긋.검사) === null) {
      // A nickname in 검사 instead of a path. This cost a whole sweep once:
      // two mutants ran and measured nothing, and the total looked fine.
      결과.push({ id: 어긋.id, 곳: 어긋.곳, 무엇: 어긋.무엇, 판정: '못잼', 까닭: `검사/test is not a real path: ${어긋.검사}` });
      못잰것++; continue;
    }

    const 원본 = readFileSync(파일, 'utf8');
    const 몇번 = 원본.split(어긋.찾을것).length - 1;

    if (몇번 !== 1) {
      // Zero or many. Fail LOUDLY. Skipping quietly is how a mutant list rots
      // into decoration while the sweep keeps printing a healthy number.
      결과.push({ id: 어긋.id, 곳: 어긋.곳, 무엇: 어긋.무엇, 판정: '못잼', 까닭: `찾을것 matched ${몇번} times (must be exactly 1)` });
      못잰것++; continue;
    }
    if (어긋.바꿀것 == null) {
      // add-mutant.mjs writes null when --replace was omitted. Reporting this
      // as caught would be worse than useless: a TODO string spliced into
      // source turns the file into a syntax error, and every test goes red for
      // a reason that has nothing to do with the line.
      결과.push({ id: 어긋.id, 곳: 어긋.곳, 무엇: 어긋.무엇, 판정: '못잼', 까닭: '바꿀것 is not written yet' });
      못잰것++; continue;
    }
    if (어긋.찾을것 === 어긋.바꿀것) {
      결과.push({ id: 어긋.id, 곳: 어긋.곳, 무엇: 어긋.무엇, 판정: '못잼', 까닭: 'no-op mutant: 찾을것 === 바꿀것' });
      못잰것++; continue;
    }
    if (!맨것.get(어긋.검사)) {
      결과.push({ id: 어긋.id, 곳: 어긋.곳, 무엇: 어긋.무엇, 판정: '못잼', 까닭: `${어긋.검사} was already red before the mutation` });
      못잰것++; continue;
    }

    writeFileSync(파일, 원본.replace(어긋.찾을것, 어긋.바꿀것), 'utf8');
    let r;
    try { r = 돌리기(어긋.검사); } finally { writeFileSync(파일, 원본, 'utf8'); }

    // A test that was killed did not notice anything — it never got to the
    // assertion. Scoring that as 잡음 puts an unmeasured line on the healthy
    // side of the table, which is this repository's own defect class living
    // inside the tool built to find it: present, named, counted, measuring
    // nothing. spawnSync reports both the kill and a failure to start as a
    // null status, and neither of them is a verdict.
    if (r.섰나 || r.code === null) {
      결과.push({
        id: 어긋.id, 곳: 어긋.곳, 무엇: 어긋.무엇, 판정: '못잼',
        까닭: `${어긋.검사} timed out after ${(제한시간 / 1000).toFixed(0)}s or never started — nothing was measured`,
        걸린: r.걸린,
      });
      못잰것++;
      if (!json && 어긋들.length > 12) process.stdout.write(색(Y, '?'));
      continue;
    }

    결과.push({
      id: 어긋.id, 곳: 어긋.곳, 무엇: 어긋.무엇, 그러면: 어긋.그러면, 검사: 어긋.검사,
      판정: r.code === 0 ? '샜음' : '잡음',
      걸린: r.걸린,
    });
    if (!json && 어긋들.length > 12) process.stdout.write(r.code === 0 ? 색(R, '✗') : 색(G, '.'));
  }
} finally {
  try { rmSync(일터, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 }); } catch { /* results still go out */ }
}

// ── report ──────────────────────────────────────────────────────────────
const 샌것 = 결과.filter((x) => x.판정 === '샜음');
const 잡은것 = 결과.filter((x) => x.판정 === '잡음');

말(''); 말('');
for (const x of 결과) {
  const 표 = x.id ? x.id + ' ' : '';
  if (x.판정 === '잡음') {
    말(`  ${색(G, '✓')} ${표}${x.무엇}  ${색(D, `${x.곳} → ${x.검사} caught it · ${(x.걸린 / 1000).toFixed(1)}s`)}`);
  } else if (x.판정 === '샜음') {
    말(`  ${색(R, '✗')} ${표}${x.무엇}  ${색(D, x.곳)}`);
    말(`      ${색(R, `${x.검사} stayed green — nothing stops the next person deleting this line.`)}`);
    if (x.그러면) 말(`      ${색(D, x.그러면)}`);
  } else {
    말(`  ${색(Y, '⚠')} ${표}${x.무엇}  ${색(D, `${x.곳} — ${x.까닭}`)}`);
  }
}

말('');
말(`  ${잡은것.length} 잡음/caught · ${샌것.length} 샜음/leaked${못잰것 ? ` · ${못잰것} 못잼/unmeasurable` : ''}`);
말('');

if (json) {
  console.log(JSON.stringify({ 잡음: 잡은것.length, 샜음: 샌것.length, 못잼: 못잰것, 결과 }, null, 2));
}

// Leaked is a failure. Unmeasurable is also a failure — pass it and the list
// can go stale without anybody seeing green turn into nothing.
process.exitCode = (샌것.length || 못잰것) ? 1 : 0;
