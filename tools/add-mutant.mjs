#!/usr/bin/env node
// Add one mutant to .cha/mutants.json, with the anchor lifted out of the file.
//
// The anchor is read from disk and never retyped. One character of whitespace
// off and the anchor stops matching forever — and a non-matching anchor is a
// mutant that runs, measures nothing, and leaves the sweep total looking
// healthy. That failure has happened here, and it is the reason this script
// exists instead of a paragraph telling people to be careful.
//
//   node tools/add-mutant.mjs src/foo.js 88 --test test/foo.test.js \
//     --what "only the longest match scores" \
//     --then "a 3-variant word outranks a 1-variant word" \
//     --replace "const 다맞음 = 맞은낱말 >= 1 ? 12 : 0;"
//
// --replace may be omitted; the mutant is then written with a TODO marker and
// the tool says so. A mutant you have not finished is better visible than
// remembered.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, basename, extname } from 'node:path';

const 뿌리 = process.cwd();
const 인자 = process.argv.slice(2);

function 값(이름, 기본 = null) {
  const i = 인자.indexOf(`--${이름}`);
  return i >= 0 && 인자[i + 1] && !인자[i + 1].startsWith('--') ? 인자[i + 1] : 기본;
}

const 위치들 = 인자.filter((a, i) => !a.startsWith('--') && !(i > 0 && 인자[i - 1].startsWith('--')));
const 곳 = (위치들[0] ?? '').replace(/\\/g, '/');
const 줄번호 = Number(위치들[1]);

if (!곳 || !Number.isInteger(줄번호) || 줄번호 < 1) {
  console.error('  usage: add-mutant.mjs <file> <line> --test <testfile> --what "…" --then "…" [--replace "…"]');
  process.exit(2);
}

const 파일길 = join(뿌리, 곳);
if (!existsSync(파일길)) { console.error(`  no such file: ${곳}`); process.exit(2); }

const 줄들 = readFileSync(파일길, 'utf8').split(/\r?\n/);
if (줄번호 > 줄들.length) { console.error(`  ${곳} has ${줄들.length} lines; asked for ${줄번호}`); process.exit(2); }

let 찾을것 = 줄들[줄번호 - 1];
if (!찾을것.trim()) { console.error(`  ${곳}:${줄번호} is blank — nothing there carries meaning`); process.exit(2); }

// ── uniqueness ──────────────────────────────────────────────────────────
// If the anchor appears more than once the runner cannot know which one you
// meant, and quietly taking the first is how a mutant ends up measuring a
// different line than its 무엇 describes. Widen with the line above until it
// is unique, and say that we did.
const 본문 = 줄들.join('\n');
let 넓혔나 = 0;
while (본문.split(찾을것).length - 1 !== 1) {
  const 위 = 줄번호 - 2 - 넓혔나;
  if (위 < 0) { console.error(`  cannot make the anchor unique at ${곳}:${줄번호}`); process.exit(2); }
  찾을것 = `${줄들[위]}\n${찾을것}`;
  넓혔나 += 1;
}

const 검사 = 값('test');
if (!검사) { console.error('  --test is required, and it must be a PATH, not a nickname'); process.exit(2); }
if (!existsSync(join(뿌리, 검사))) {
  // The one that cost a whole sweep: "recall" instead of "test/recall.test.js".
  console.error(`  --test ${검사} does not exist. 검사 is a path, never a nickname.`);
  process.exit(2);
}

const 무엇 = 값('what');
const 그러면 = 값('then');
if (!무엇) { console.error('  --what is required: the meaning this line carries, one sentence'); process.exit(2); }
if (!그러면) { console.error('  --then is required: what a person experiences when it is wrong'); process.exit(2); }

const 바꿀것 = 값('replace');
if (바꿀것 !== null && 바꿀것 === 찾을것) { console.error('  --replace is identical to the line: that is a no-op, not a mutant'); process.exit(2); }

// ── id ──────────────────────────────────────────────────────────────────
const 목록길 = join(뿌리, '.cha', 'mutants.json');
const 원자료 = existsSync(목록길) ? JSON.parse(readFileSync(목록길, 'utf8')) : { 어긋들: [] };
// Whichever list is already there is the list. `어긋들 ??= []` used to add a
// second one beside an existing `mutants` — the shape docs/en/10-faq.md offers
// — and the sweep reads 어긋들 first, so every mutant written before that
// moment stopped being swept while staying visible in the file. In the list,
// named, counted by eye, measuring nothing: the defect this repository hunts.
const 어긋들 = Array.isArray(원자료) ? 원자료
  : Array.isArray(원자료.어긋들) ? 원자료.어긋들
    : Array.isArray(원자료.mutants) ? 원자료.mutants
      : (원자료.어긋들 = []);

const 씨 = basename(곳, extname(곳)).toLowerCase().replace(/[^a-z0-9]+/g, '-');
const 쓰인번호 = 어긋들
  .map((x) => String(x.id ?? ''))
  .filter((s) => s.startsWith(`${씨}-`))
  .map((s) => Number(s.slice(씨.length + 1)))
  .filter(Number.isInteger);
const id = `${씨}-${String((쓰인번호.length ? Math.max(...쓰인번호) : 0) + 1).padStart(3, '0')}`;

const 새것 = {
  id,
  곳,
  무엇,
  그러면,
  찾을것,
  바꿀것,                       // null until you write the break; the runner reports 못 잼 for that
  TODO: 바꿀것 === null ? 'write 바꿀것 — the actual break' : undefined,
  검사,
};

어긋들.push(새것);
writeFileSync(목록길, `${JSON.stringify(Array.isArray(원자료) ? 어긋들 : 원자료, null, 2)}\n`, 'utf8');

console.log(JSON.stringify(새것, null, 2));
console.log('');
if (넓혔나) console.log(`  anchor widened by ${넓혔나} line(s) to make it unique.`);
if (바꿀것 === null) console.log('  바꿀것 is a TODO — this mutant will report 못 잼 until you write the break.');
console.log(`  added ${id} (${어긋들.length} mutants total)`);
console.log(`  measure it: node tools/mutate.mjs --id ${id}`);
