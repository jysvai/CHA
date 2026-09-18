#!/usr/bin/env node
// The second-eye queue — one briefing at a time, quota-aware, resumable.
//
// ── why serial ──────────────────────────────────────────────────────────
//
// Three reviews were once started in parallel. Each had its own retry logic,
// each hit the rate limit, each retried, and between them they emptied a
// personal quota in about four minutes. All three answers were lost, and the
// quota did not come back for a day.
//
// Serial is slower per wall-clock hour and strictly faster per *answer that
// survives*. This queue never runs two at once, on purpose.
//
// ── why it skips ────────────────────────────────────────────────────────
//
// Re-running the queue must never throw away an answer you already paid for.
// An answer file that exists, is non-empty, and carries no error marker is
// done. Empty ones and error ones are asked again.
//
// ── why it waits instead of moving on ───────────────────────────────────
//
// On a quota error it reads the reset window out of the error text, sleeps
// past it, and retries THE SAME briefing. Moving on would leave a hole, and a
// queue that finishes with holes it did not report is the same defect as a
// test that asserts nothing.
//
//   node tools/queue.mjs
//   node tools/queue.mjs --briefings .cha/briefings --answers .cha/answers
//   node tools/queue.mjs --only recall-a          one tag
//   node tools/queue.mjs --redo                   re-ask even what is answered
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, basename } from 'node:path';
import { 읽기, 숫자, 멈춤 } from './argv.mjs';

const 쓰는법 = 'queue.mjs [--briefings .cha/briefings] [--answers .cha/answers] [--only <tag>] [--redo]';
const 뿌리 = process.cwd();
const 읽은것 = 읽기(process.argv.slice(2), { 값받는것: ['briefings', 'answers', 'only'], 깃발들: ['redo'] });
if (읽은것.문제.length) 멈춤(읽은것.문제, 쓰는법);
if (읽은것.위치들.length) 멈춤([`queue.mjs takes no file arguments. Got: ${읽은것.위치들.join(', ')}`], 쓰는법);

const 설정길 = join(뿌리, '.cha', 'config.json');
if (!existsSync(설정길)) { console.error('  .cha/config.json not found. Run /cha-init first.'); process.exit(2); }
const 설정 = JSON.parse(readFileSync(설정길, 'utf8'));

// The command that asks the second eye. {file} becomes the briefing path; if
// the template has no {file}, the briefing is piped on stdin instead.
//
// It must run a model on ANOTHER PLATFORM, pinned to an exact id, with no
// write tools. Two instances of the same model share the same blind spots —
// you are not buying more compute, you are buying a different set of things
// that look normal.
const 명령 = 설정.secondEye?.command ?? null;
if (!명령) {
  console.error('  .cha/config.json → secondEye.command is null.');
  console.error('  Set it to a command that runs a read-only reviewer on another platform,');
  console.error('  with an exact model id. See docs/en/05-second-eye.md.');
  console.error('  Reviewing with yourself and calling it a second eye is not a fallback.');
  process.exit(2);
}
if (설정.secondEye?.model == null) {
  console.error('  warning: secondEye.model is not pinned. "latest" changes what you measured');
  console.error('  between rounds, and round-to-round numbers then mean nothing.');
}

const 브리핑칸 = 읽은것.값들.briefings ?? '.cha/briefings';
const 답칸 = 읽은것.값들.answers ?? '.cha/answers';
const 하나만 = 읽은것.값들.only ?? null;
const 다시 = !!읽은것.깃발.redo;

// These three used to be bare Number(). `maxRetries: "six"` became NaN, the
// send loop's `NaN >= 0` was false, and the queue finished having asked
// nothing while printing "0 answered · 0 already · 0 lost" and exiting 0 —
// the step this whole method is named after, doing nothing, calling it done.
const 칸들 = [
  ['secondEye.maxRetries', 설정.secondEye?.maxRetries, 6],
  ['secondEye.backoffMs', 설정.secondEye?.backoffMs, 20 * 60 * 1000],
  ['secondEye.timeoutMs', 설정.secondEye?.timeoutMs, 10 * 60 * 1000],
].map(([이름, 날것, 기본]) => 숫자(이름, 날것, 기본));
const 설정문제 = 칸들.filter((x) => x.문제).map((x) => x.문제);
if (설정문제.length) 멈춤([...설정문제, 'in .cha/config.json'], 쓰는법);
const [최대재시도, 기본대기, 한번제한] = 칸들.map((x) => x.값);

mkdirSync(join(뿌리, 답칸), { recursive: true });

const 브리핑들 = existsSync(join(뿌리, 브리핑칸))
  ? readdirSync(join(뿌리, 브리핑칸)).filter((f) => f.endsWith('.md') && !f.startsWith('hunt-')).sort()
  : [];
if (!브리핑들.length) { console.error(`  no briefings in ${브리핑칸}. Run /cha-brief first.`); process.exit(2); }

const 잘못표 = /^\s*(error|ERROR|quota|RESOURCE_EXHAUSTED|429|\[cha:error\])/;

/** An answer already paid for. Non-empty, and not an error dump. */
function 이미있나(길) {
  if (다시) return false;
  if (!existsSync(길)) return false;
  if (statSync(길).size === 0) return false;
  const s = readFileSync(길, 'utf8');
  if (!s.trim()) return false;
  return !잘못표.test(s);
}

const 쿼터표 = /RESOURCE_EXHAUSTED|quota|rate limit|429|too many requests/i;

/**
 * Pull the reset window out of an error. Providers word it several ways and
 * none of them is a contract, so anything unparsed falls back to the default
 * backoff — never to zero, and never to "skip it".
 */
function 기다릴시간(글) {
  const 초 = /retry(?:Delay|.after)?["'\s:=]+(\d+(?:\.\d+)?)s?\b/i.exec(글);
  if (초) return Math.ceil(Number(초[1]) * 1000) + 2000;
  const 분 = /in\s+(\d+)\s*minutes?/i.exec(글);
  if (분) return Number(분[1]) * 60 * 1000 + 5000;
  const 시각 = /resets?\s+at\s+([0-9T:\-+.Z]+)/i.exec(글);
  if (시각) {
    const t = Date.parse(시각[1]);
    if (Number.isFinite(t) && t > Date.now()) return t - Date.now() + 2000;
  }
  return 기본대기;
}

const 졸기 = (ms) => new Promise((r) => { setTimeout(r, ms); });

function 한번물어보기(길) {
  return new Promise((맺음) => {
    const 파이프인가 = !명령.includes('{file}');
    const 줄 = 파이프인가 ? 명령 : 명령.replace('{file}', 길);
    const 아이 = spawn(줄, { shell: true, cwd: 뿌리 });
    let 나온것 = ''; let 샌것 = ''; let 끊었나 = false;
    const 시계 = setTimeout(() => { 끊었나 = true; 아이.kill(); }, 한번제한);

    아이.stdout.on('data', (b) => { 나온것 += b; });
    아이.stderr.on('data', (b) => { 샌것 += b; });
    // Always close stdin. A reviewer command that reads to EOF and never gets
    // one hangs until the timeout, and the queue then loses an answer to a
    // pipe nobody closed.
    //
    // The listener is not decoration. A reviewer that exits before reading its
    // briefing raises EPIPE asynchronously, and try/catch cannot see it: the
    // event reaches a stream with no listener and takes the whole run down with
    // a Node stack, losing every answer still queued behind it. Measured at 1
    // run in 8 with a small briefing, and every run with a large one.
    아이.stdin.on('error', (탈) => { 샌것 += `\n${탈?.message ?? 탈}`; });
    try { 아이.stdin.end(파이프인가 ? readFileSync(길, 'utf8') : undefined); } catch { /* already gone */ }

    아이.on('error', (탈) => { clearTimeout(시계); 맺음({ code: -1, 나온것, 샌것: `${샌것}\n${탈?.message ?? 탈}`, 끊었나 }); });
    아이.on('close', (code) => { clearTimeout(시계); 맺음({ code, 나온것, 샌것, 끊었나 }); });
  });
}

// ── run ─────────────────────────────────────────────────────────────────
const 할것 = 브리핑들.filter((f) => !하나만 || basename(f, '.md') === 하나만);
const 결과 = [];

console.log('');
console.log(`  2차 눈 / second eye  —  ${할것.length} briefing(s), one at a time`);
if (설정.secondEye?.model) console.log(`  model: ${설정.secondEye.model}`);
console.log('');

for (const 파일 of 할것) {
  const 표 = basename(파일, '.md');
  const 브리핑길 = join(뿌리, 브리핑칸, 파일);
  const 답길 = join(뿌리, 답칸, `${표}.md`);

  if (이미있나(답길)) {
    결과.push({ 표, 상태: '이미있음' });
    console.log(`  · ${표}  already answered — kept`);
    continue;
  }

  let 남은재시도 = 최대재시도;
  let 됐나 = false;
  while (남은재시도 >= 0 && !됐나) {
    const t0 = Date.now();
    const r = await 한번물어보기(브리핑길);
    const 걸린 = ((Date.now() - t0) / 1000).toFixed(0);
    const 합 = `${r.나온것}\n${r.샌것}`;

    if (r.code === 0 && r.나온것.trim()) {
      writeFileSync(답길, r.나온것, 'utf8');
      결과.push({ 표, 상태: '받음', 줄: r.나온것.split('\n').length });
      console.log(`  ✓ ${표}  ${r.나온것.split('\n').length} lines  ${걸린}s`);
      됐나 = true;
      break;
    }

    if (쿼터표.test(합) && 남은재시도 > 0) {
      const 잘시간 = 기다릴시간(합);
      console.log(`  … ${표}  quota — sleeping ${(잘시간 / 60000).toFixed(1)}min, then asking the SAME briefing again (${남은재시도} left)`);
      남은재시도 -= 1;
      await 졸기(잘시간);
      continue;
    }

    if (남은재시도 > 0) {
      남은재시도 -= 1;
      console.log(`  … ${표}  ${r.끊었나 ? 'timed out' : `exit ${r.code}`} — retrying in 30s (${남은재시도} left)`);
      await 졸기(30000);
      continue;
    }

    // Out of retries. Write the error where the answer would go, so the next
    // run re-asks it instead of treating the hole as an answer.
    writeFileSync(답길, `[cha:error] ${r.끊었나 ? 'timed out' : `exit ${r.code}`}\n\n${합.slice(0, 4000)}\n`, 'utf8');
    결과.push({ 표, 상태: '잃음', 까닭: r.끊었나 ? 'timed out' : `exit ${r.code}` });
    console.log(`  ✗ ${표}  lost — ${r.끊었나 ? 'timed out' : `exit ${r.code}`}`);
    break;
  }
}

// ── report ──────────────────────────────────────────────────────────────
const 받음 = 결과.filter((x) => x.상태 === '받음');
const 이미 = 결과.filter((x) => x.상태 === '이미있음');
const 잃음 = 결과.filter((x) => x.상태 === '잃음');

console.log('');
console.log(`  ${받음.length} answered · ${이미.length} already had answers · ${잃음.length} lost`);
if (잃음.length) {
  // By name, always. A queue that quietly ends with holes is worse than one
  // that failed outright, because it looks finished.
  console.log('');
  console.log('  lost, by name — these still need asking:');
  for (const x of 잃음) console.log(`    ${x.표}  (${x.까닭})`);
}
console.log('');
console.log('  next: /cha-judge <tag>');

process.exitCode = 잃음.length ? 1 : 0;
