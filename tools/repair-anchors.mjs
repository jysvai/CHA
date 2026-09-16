#!/usr/bin/env node
// Find mutant anchors that stopped matching, and offer to re-lift them.
//
// An anchor is a verbatim source line. The file moves — a rename, a reformat,
// one space — and the anchor matches zero times. The runner then reports 못 잼
// for that mutant forever, which is the right verdict and an easy one to stop
// reading once there are twenty of them.
//
// This is the maintenance pass for that. It never repairs silently: a repaired
// anchor is a mutant whose 무엇 may no longer describe what the line does, and
// re-lifting the wrong line gives you a mutant that measures something nobody
// chose.
//
//   node tools/repair-anchors.mjs            report only
//   node tools/repair-anchors.mjs --write    re-lift the ones it is sure about
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const 뿌리 = process.cwd();
const 쓸까 = process.argv.includes('--write');

const 목록길 = join(뿌리, '.cha', 'mutants.json');
if (!existsSync(목록길)) { console.error('  .cha/mutants.json not found.'); process.exit(2); }
const 원자료 = JSON.parse(readFileSync(목록길, 'utf8'));
const 어긋들 = Array.isArray(원자료) ? 원자료 : 원자료.어긋들 ?? 원자료.mutants ?? [];

const 곳의 = (x) => x.곳 ?? x.where ?? x.file;
const 찾을것의 = (x) => x.찾을것 ?? x.find;
const 검사의 = (x) => x.검사 ?? x.test;

// Whitespace-insensitive comparison. Reformatting is the commonest way an
// anchor dies, and it is also the only kind of drift where re-lifting is safe:
// the line still says the same thing, it is just spaced differently.
const 눌러 = (s) => s.replace(/\s+/g, ' ').trim();

const 탈 = [];
const 고칠것 = [];

for (const x of 어긋들) {
  const 곳 = 곳의(x); const 찾을것 = 찾을것의(x); const 검사 = 검사의(x);
  const 표 = x.id ?? 무엇줄(x);

  if (!곳 || !existsSync(join(뿌리, 곳))) { 탈.push({ 표, 까닭: `no such file: ${곳}` }); continue; }
  if (!검사) { 탈.push({ 표, 까닭: '검사/test is empty' }); continue; }
  if (!existsSync(join(뿌리, 검사))) { 탈.push({ 표, 까닭: `검사 is not a real path: ${검사} — a nickname here costs a whole sweep` }); continue; }
  if (찾을것 == null) { 탈.push({ 표, 까닭: '찾을것 is missing' }); continue; }

  const 본문 = readFileSync(join(뿌리, 곳), 'utf8');
  const 몇번 = 본문.split(찾을것).length - 1;
  if (몇번 === 1) continue;                                  // healthy

  if (몇번 > 1) {
    // Widening is a judgement call about which occurrence was meant, and the
    // tool does not have that judgement. Say which lines and stop.
    const 줄들 = 본문.split(/\r?\n/);
    const 자리 = 줄들.map((줄, i) => (줄.includes(찾을것.split('\n')[0]) ? i + 1 : 0)).filter(Boolean);
    탈.push({ 표, 까닭: `찾을것 matches ${몇번} times (lines ${자리.join(', ')}) — widen it by hand with the line above` });
    continue;
  }

  // Zero matches. Is there exactly one line that is the same thing, spaced
  // differently?
  const 줄들 = 본문.split(/\r?\n/);
  const 눌린것 = 눌러(찾을것);
  const 후보 = 줄들
    .map((줄, i) => ({ 줄, i }))
    .filter(({ 줄 }) => 눌러(줄) === 눌린것 && 줄.trim());

  if (후보.length === 1) {
    고칠것.push({ x, 표, 곳, 옛것: 찾을것, 새것: 후보[0].줄, 줄번호: 후보[0].i + 1 });
  } else {
    탈.push({ 표, 까닭: `찾을것 matches 0 times and ${후보.length} whitespace-only candidates — re-lift it by hand` });
  }
}

function 무엇줄(x) { return String(x.무엇 ?? x.what ?? '(unnamed)').slice(0, 48); }

console.log('');
console.log(`  ${어긋들.length} mutants · ${고칠것.length} re-liftable · ${탈.length} need a person`);
console.log('');

for (const r of 고칠것) {
  console.log(`  ~ ${r.표}  ${r.곳}:${r.줄번호}  whitespace drift`);
  console.log(`      was: ${r.옛것.trim()}`);
  console.log(`      now: ${r.새것.trim()}`);
}
for (const t of 탈) console.log(`  ⚠ ${t.표}  ${t.까닭}`);

if (쓸까 && 고칠것.length) {
  for (const r of 고칠것) {
    if ('찾을것' in r.x) r.x.찾을것 = r.새것; else r.x.find = r.새것;
  }
  writeFileSync(목록길, `${JSON.stringify(원자료, null, 2)}\n`, 'utf8');
  console.log('');
  console.log(`  re-lifted ${고칠것.length} anchor(s).`);
  console.log('  Now re-read each 무엇 against the line it points at. A repaired anchor');
  console.log('  on a line whose meaning changed is a mutant measuring something nobody chose.');
} else if (고칠것.length) {
  console.log('');
  console.log('  run again with --write to re-lift these.');
}
console.log('');

// A drifted anchor is a mutant that measures nothing. Exit non-zero so this
// cannot pass quietly in a script.
process.exitCode = (고칠것.length || 탈.length) ? 1 : 0;
