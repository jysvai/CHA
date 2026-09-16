#!/usr/bin/env node
// 기록 — append one round to .cha/record.md, and bump the status table in place.
//
// The record is the deliverable. The code changes are what it happened to
// produce. So this tool has exactly one property that matters more than every
// feature in it:
//
//   IT REFUSES TO SHRINK THE FILE.
//
// The byte length is read before and after. If the result is not strictly
// longer, the original is written back and the process exits non-zero.
//
// That check is not paranoia about disks. It is about this tool. The status
// table at the top has to be edited in place — counts get bumped every round —
// and an in-place edit is the one plausible way a whole record disappears: a
// regex that matches more than intended, a template that replaces instead of
// appends, a truncating write that lands between two runs. Every one of those
// failures exits 0 and prints something reassuring. A 2,745-line record that
// silently becomes 40 lines looks exactly like a successful run.
//
//   node tools/record.mjs                       append the next round, blank template
//   node tools/record.mjs --round 40            force the round number
//   node tools/record.mjs --date 2026-09-16     force the date
//   node tools/record.mjs --from round40.md     use this file as the round body
//   node tools/record.mjs --set gates=40 --set claims=61
//   node tools/record.mjs --dry                 print what would be appended, write nothing
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const 뿌리 = process.cwd();
const 인자 = process.argv.slice(2);

function 값(이름, 기본 = null) {
  const i = 인자.indexOf(`--${이름}`);
  return i >= 0 && 인자[i + 1] && !인자[i + 1].startsWith('--') ? 인자[i + 1] : 기본;
}
// --set may appear many times; 값() only finds the first.
const 고칠칸 = [];
for (let i = 0; i < 인자.length; i++) {
  if (인자[i] === '--set' && 인자[i + 1]) {
    const eq = 인자[i + 1].indexOf('=');
    if (eq < 1) { console.error(`  --set wants name=value, got: ${인자[i + 1]}`); process.exit(2); }
    고칠칸.push([인자[i + 1].slice(0, eq).trim(), 인자[i + 1].slice(eq + 1).trim()]);
  }
}
const 말로만 = 인자.includes('--dry');

const 기록길 = join(뿌리, 값('record', '.cha/record.md'));
if (!existsSync(기록길)) {
  console.error('  .cha/record.md not found. Run /cha-init first.');
  console.error('  This tool appends to an existing record. It will not create one,');
  console.error('  because a record that can be created by accident can be replaced by accident.');
  process.exit(2);
}

const 원본 = readFileSync(기록길, 'utf8');
const 전바이트 = Buffer.byteLength(원본, 'utf8');
const 디스크전 = statSync(기록길).size;

// ── which round is this ─────────────────────────────────────────────────
// Read it off the file rather than off a counter somewhere else. A counter in
// a second place goes out of step with the record, and then two rounds share a
// number and the sections stop being addressable.
const 회차들 = [...원본.matchAll(/^##\s*회차\s*(\d+)/gm)].map((m) => Number(m[1]));
const 라운드들 = [...원본.matchAll(/^##\s*(?:.*?\b)?round\s*(\d+)/gmi)].map((m) => Number(m[1]));
const 본것 = [...회차들, ...라운드들].filter(Number.isFinite);
const 지난회차 = 본것.length ? Math.max(...본것) : 0;
const 이번회차 = Number(값('round', 지난회차 + 1));

if (!Number.isInteger(이번회차) || 이번회차 < 1) {
  console.error(`  --round wants a positive integer, got: ${값('round')}`);
  process.exit(2);
}
if (본것.includes(이번회차)) {
  // Two sections with the same number is how a record stops being a record:
  // "round 39" no longer identifies anything, and the status table's totals
  // can no longer be traced to the sections under it.
  console.error(`  회차 ${이번회차} / round ${이번회차} is already in ${기록길}.`);
  console.error('  Appending a second one would make the number stop identifying a round.');
  console.error(`  Use --round ${지난회차 + 1}, or edit that section by hand.`);
  process.exit(2);
}

const 날짜 = 값('date', new Date().toISOString().slice(0, 10));

// ── the round body ──────────────────────────────────────────────────────
// A blank template with every heading present. The headings are not optional:
// a round with no 「사냥」 heading and a round where nothing was hunted look
// identical a year later, and only one of them is a fact.
function 빈틀(n, d) {
  return [
    ``,
    `## 회차 ${n} / round ${n} — ${d}`,
    ``,
    `### 사냥 / hunt`,
    `files read: · files skipped: (say which, and why)`,
    ``,
    `### 브리핑 / briefings`,
    `<tag> <bytes> · <tag> <bytes>`,
    ``,
    `### 2차 눈 / second eye`,
    `model: <pinned id> · sent <n> · answered <n> · lost <n>`,
    ``,
    `### 판정 / adjudication`,
    ``,
    `| 주장 / claim | 판정 | 돌린 것 / command | 나온 것 / output |`,
    `|---|---|---|---|`,
    `|  | 참 | \`\` | \`\` |`,
    `|  | 거짓 | \`\` | counter-evidence, not "no" |`,
    `|  | 못 잼 | — | why it cannot be run here |`,
    ``,
    `### 고침 / fixes`,
    `<file:line> — red \`<output>\` → green \`<output>\` — mutant <id>`,
    ``,
    `### 어긋 / mutants`,
    `added <n> (<ids>) · sweep: <total> → <caught> 잡음 / <leaked> 샜음 / <unmeasurable> 못 잼 · <elapsed>`,
    ``,
    `### 관문 / gate ${n}`,
    `test <pass> / <fail> / <skip> — <n> of <n> files · check <…> · docs <…>`,
    ``,
    `### 다음 회차 후보 / next round candidates`,
    `<file:line> — what you saw and did not take`,
    ``,
  ].join('\n');
}

let 본문;
const 가져올곳 = 값('from');
if (가져올곳) {
  const 길 = join(뿌리, 가져올곳);
  if (!existsSync(길)) { console.error(`  no such file: ${가져올곳}`); process.exit(2); }
  const 글 = readFileSync(길, 'utf8').replace(/\s+$/, '');
  if (!글.trim()) { console.error(`  ${가져올곳} is empty. An empty round is not a round.`); process.exit(2); }
  // If the body already carries its own heading, do not add a second one.
  본문 = /^##\s/m.test(글) ? `\n${글}\n` : `\n## 회차 ${이번회차} / round ${이번회차} — ${날짜}\n\n${글}\n`;
} else {
  본문 = 빈틀(이번회차, 날짜);
}

// ── the status table, updated in place ──────────────────────────────────
// Only the table is ever edited. Only its value cells. The row labels and the
// number of rows are left alone: a row that disappears takes a total with it,
// and nobody notices a missing row in a two-column table.
function 표고치기(글, 고칠것) {
  const 못찾음 = [];
  let 바뀜 = 0;
  for (const [이름, 값새것] of 고칠것) {
    const 낮은이름 = 이름.toLowerCase();
    const 줄들 = 글.split('\n');
    let 맞은줄 = -1;
    let 몇번 = 0;
    for (let i = 0; i < 줄들.length; i++) {
      const 줄 = 줄들[i];
      if (!줄.startsWith('|')) continue;
      const 칸 = 줄.split('|');
      if (칸.length < 4) continue;
      const 이름칸 = 칸[1].trim();
      if (!이름칸 || /^-+$/.test(이름칸)) continue;
      if (이름칸.toLowerCase().includes(낮은이름)) { 몇번++; 맞은줄 = i; }
    }
    if (몇번 === 0) { 못찾음.push(`${이름} — no row matched`); continue; }
    if (몇번 > 1) {
      // Ambiguous is refused, not guessed. Writing the right number into the
      // wrong row is worse than not writing it: the table still adds up.
      못찾음.push(`${이름} — matched ${몇번} rows, refusing to guess`);
      continue;
    }
    const 칸 = 줄들[맞은줄].split('|');
    칸[2] = ` ${값새것} `;
    줄들[맞은줄] = 칸.join('|');
    글 = 줄들.join('\n');
    바뀜++;
  }
  return { 글, 바뀜, 못찾음 };
}

let 새글 = 원본.replace(/\s*$/, '\n');
let 표결과 = { 바뀜: 0, 못찾음: [] };
if (고칠칸.length) {
  표결과 = 표고치기(새글, 고칠칸);
  새글 = 표결과.글;
  for (const 탈 of 표결과.못찾음) console.error(`  status table: ${탈}`);
  if (표결과.못찾음.length) {
    console.error('  nothing written. Fix the --set names or edit the table by hand.');
    process.exit(2);
  }
}
새글 = 새글 + 본문;

const 후바이트 = Buffer.byteLength(새글, 'utf8');

if (말로만) {
  process.stdout.write(본문);
  console.log(`  --dry — nothing written. ${전바이트} → ${후바이트} bytes (+${후바이트 - 전바이트})`);
  process.exit(0);
}

// ── the one check that matters ──────────────────────────────────────────
// Checked in memory first, so the bad write never reaches the disk at all.
if (후바이트 <= 전바이트) {
  console.error(`  REFUSING TO WRITE: the record would not grow.`);
  console.error(`  ${전바이트} bytes before, ${후바이트} bytes after.`);
  console.error('  The record is append-only. A run that does not make it longer is a bug in this tool.');
  process.exit(1);
}

writeFileSync(기록길, 새글, 'utf8');

// And again from the disk, because the in-memory check cannot see a short
// write, a full volume, or another process that got there in between.
const 디스크후 = statSync(기록길).size;
if (디스크후 <= 디스크전) {
  writeFileSync(기록길, 원본, 'utf8');
  console.error(`  RESTORED: ${기록길} did not grow on disk (${디스크전} → ${디스크후} bytes).`);
  console.error('  The original has been written back. Check the disk and run again.');
  process.exit(1);
}

console.log('');
console.log(`  회차 ${이번회차} / round ${이번회차} — ${날짜}  appended to ${기록길}`);
if (표결과.바뀜) console.log(`  status table: ${표결과.바뀜} row(s) updated in place`);
console.log(`  ${디스크전} → ${디스크후} bytes (+${디스크후 - 디스크전})`);
console.log('');
console.log('  Fill the headings as you go, not at the end. A verdict you remember');
console.log('  but did not write is a verdict you will re-derive.');
console.log('');
