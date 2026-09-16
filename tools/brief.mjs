#!/usr/bin/env node
// Cut a source file into second-eye briefings of at most 20KB.
//
// The cap is not a style preference. Above it three things break, and all
// three break quietly:
//
//   1. the reviewer's answer is truncated mid-finding, with no marker saying so
//   2. recall drops in the middle, so findings cluster at both ends — and a
//      middle that was never really read looks exactly like a middle that was
//      clean
//   3. forty claims from one briefing cannot be adjudicated in one sitting, so
//      they queue, and queued claims rot: the file moves and the line numbers
//      drift out from under them
//
// Bytes, not lines. A 400-line Korean file is three times the budget of a
// 400-line English one, and the one that blows the cap is never the one you
// expected.
//
//   node tools/brief.mjs src/foo.js
//   node tools/brief.mjs src/foo.js --out .cha/briefings --max 20480
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, basename, extname } from 'node:path';

const 뿌리 = process.cwd();
const 인자 = process.argv.slice(2);
const 값 = (이름, 기본) => {
  const i = 인자.indexOf(`--${이름}`);
  return i >= 0 && 인자[i + 1] && !인자[i + 1].startsWith('--') ? 인자[i + 1] : 기본;
};

const 위치들 = 인자.filter((a, i) => !a.startsWith('--') && !(i > 0 && 인자[i - 1].startsWith('--')));
const 곳 = (위치들[0] ?? '').replace(/\\/g, '/');
if (!곳) { console.error('  usage: brief.mjs <file> [--out .cha/briefings] [--max 20480]'); process.exit(2); }

const 설정길 = join(뿌리, '.cha', 'config.json');
const 설정 = existsSync(설정길) ? JSON.parse(readFileSync(설정길, 'utf8')) : {};
const 최대 = Number(값('max', 설정.briefing?.maxBytes ?? 20480));
const 나갈곳 = 값('out', '.cha/briefings');

const 파일길 = join(뿌리, 곳);
if (!existsSync(파일길)) { console.error(`  no such file: ${곳}`); process.exit(2); }

const 본문 = readFileSync(파일길, 'utf8');
const 줄들 = 본문.split(/\r?\n/);
const 확장 = extname(곳).slice(1);
const 말머리 = { js: 'js', mjs: 'js', cjs: 'js', ts: 'ts', tsx: 'tsx', jsx: 'jsx', py: 'python', go: 'go', rs: 'rust', rb: 'ruby', java: 'java', kt: 'kotlin', swift: 'swift', c: 'c', h: 'c', cpp: 'cpp', cs: 'csharp', php: 'php', sh: 'bash' }[확장] ?? 확장 ?? '';

const 바이트 = (s) => Buffer.byteLength(s, 'utf8');

// ── the file's promises ─────────────────────────────────────────────────
// The header is the specification. Most real findings in this method came from
// a comment contradicting the line under it, and a reviewer can only see that
// contradiction when the comment is in front of them. Shipping code without
// its header is asking somebody to review an implementation against nothing.
function 머리말(줄들) {
  const 모은것 = [];
  for (const 줄 of 줄들) {
    const t = 줄.trim();
    if (t.startsWith('#!')) continue;
    if (t === '' && 모은것.length === 0) continue;
    if (t.startsWith('//') || t.startsWith('#') || t.startsWith('/*') || t.startsWith('*') || t.startsWith('"""') || t.startsWith("'''")) { 모은것.push(줄); continue; }
    if (t === '' && 모은것.length) { 모은것.push(줄); continue; }
    break;
  }
  return 모은것.join('\n').trimEnd();
}

// ── where a function starts ─────────────────────────────────────────────
// Split here and nowhere else. A reviewer who cannot see the early return will
// invent one, and you pay a full adjudication to disprove a finding about a
// path that was guarded ten lines above the cut.
const 시작표 = [
  /^(export\s+)?(async\s+)?function\b/,
  /^(export\s+)?(default\s+)?(async\s+)?(function|class)\b/,
  /^(export\s+)?const\s+[\w$가-힣]+\s*=\s*(async\s*)?\(/,
  /^(export\s+)?class\b/,
  /^\s{0,2}(def|class)\s+/,          // python
  /^func\s+/,                        // go
  /^(pub\s+)?(async\s+)?fn\s+/,      // rust
  /^\s{0,4}(public|private|protected)\s+/, // java/c#
];
const 함수시작인가 = (줄) => 시작표.some((r) => r.test(줄));

// A boundary owns the comment block directly above it — the promise belongs
// with the code it is about, on the same side of the cut.
function 경계들(줄들) {
  const 자리 = [0];
  for (let i = 1; i < 줄들.length; i += 1) {
    if (!함수시작인가(줄들[i])) continue;
    let 위 = i;
    while (위 > 0) {
      const t = 줄들[위 - 1].trim();
      if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('#')) 위 -= 1;
      else break;
    }
    if (위 !== 자리[자리.length - 1]) 자리.push(위);
  }
  자리.push(줄들.length);
  return 자리;
}

// ── chunking ────────────────────────────────────────────────────────────
const 자리 = 경계들(줄들);
// Budget for what the wrapper costs, not just for the code. The header, the
// five classes, the answer format and the seven-character line-number gutter
// on every line add up — a chunk measured at 20KB of source shipped as a 21KB
// briefing here, and a cap you measured against the wrong number is a cap that
// never applied.
const 머리 = 머리말(줄들);
// The header is repeated into every chunk, so it is part of the per-chunk
// cost, not a one-off. A 6KB file header silently ate a third of the budget
// before this line counted it.
const 겉 = 바이트(머리) + 1200;                   // header + the five classes + the answer format
const 크기 = (a, b) => 바이트(줄들.slice(a, b).join('\n')) + (b - a) * 7 + 겉;
const 예산 = 최대;
const 덩이들 = [];
let 시작 = 자리[0];
for (let k = 1; k < 자리.length; k += 1) {
  const 끝 = 자리[k];
  if (k === 자리.length - 1) { 덩이들.push([시작, 끝]); 시작 = 끝; break; }
  if (크기(시작, 자리[k + 1]) > 예산) { 덩이들.push([시작, 끝]); 시작 = 끝; }
}
if (시작 < 줄들.length) 덩이들.push([시작, 줄들.length]);

const 씨 = basename(곳, extname(곳)).toLowerCase().replace(/[^a-z0-9]+/g, '-');
const 글자 = 'abcdefghijklmnopqrstuvwxyz';

mkdirSync(join(뿌리, 나갈곳), { recursive: true });

const 낸것 = [];
덩이들.forEach(([a, b], i) => {
  const 표 = 덩이들.length === 1 ? 씨 : `${씨}-${글자[i] ?? i}`;
  const 조각 = 줄들.slice(a, b);
  // Real line numbers, always. Every claim is adjudicated by running something
  // at a specific line; a briefing renumbered from 1 makes you map each claim
  // back by hand, and that is where wrong adjudications come from.
  const 번호붙인 = 조각.map((줄, j) => `${String(a + j + 1).padStart(5, ' ')}  ${줄}`).join('\n');

  const 글 = `# ${표} — ${곳} lines ${a + 1}–${b}

${덩이들.length > 1 ? `> This is part ${i + 1} of ${덩이들.length}. The rest of the file exists and is not shown.\n` : ''}
## What this file promises

${머리 ? `\`\`\`\n${머리}\n\`\`\`` : '_(no file header)_'}

## Code

\`\`\`${말머리}
${번호붙인}
\`\`\`

## What to look for

1. A rule that never matches real input.
2. Silent failure — a swallowed error, a dropped item, a fallback that hides it.
3. A test that does not guard — the name promises more than the assertion checks.
4. Comment contradicts code.
5. Trust-boundary leak — a key, a path, a network call crossing a line the code says it does not cross.

A false warning is a defect. Code that reports a problem that is not there costs the same as silence about one that is.

## Answer format — nothing else

For each defect, and only for defects:

1) input → what happens now vs what should happen
2) line number and the line, quoted
3) confidence

If you find nothing, answer "none". Do not summarise the file.
Say plainly which parts you could not see.
`;

  const 길 = join(뿌리, 나갈곳, `${표}.md`);
  writeFileSync(길, 글, 'utf8');
  낸것.push({ 표, 길: `${나갈곳}/${표}.md`, 바이트: 바이트(글), 줄: `${a + 1}–${b}` });
});

console.log('');
for (const x of 낸것) {
  const 넘었나 = x.바이트 > 최대;
  console.log(`  ${넘었나 ? '⚠' : '·'} ${x.표}  ${x.길}  ${(x.바이트 / 1024).toFixed(1)}KB  lines ${x.줄}${넘었나 ? '  OVER THE CAP' : ''}`);
}
// Measured on what was actually written, not on what we predicted. A single
// function bigger than the cap cannot be split without lying about it, so the
// tool says so instead of cutting mid-body.
const 너무큰것 = 낸것.filter((x) => x.바이트 > 최대);

console.log('');
console.log(`  ${낸것.length} briefing(s), cap ${(최대 / 1024).toFixed(0)}KB`);
if (너무큰것.length) {
  console.log(`  ${너무큰것.length} over the cap — one function in each is bigger than the cap by itself:`);
  for (const x of 너무큰것) console.log(`    ${x.표}  ${(x.바이트 / 1024).toFixed(1)}KB  lines ${x.줄}`);
  console.log('  Split by hand at a boundary inside it, or brief that function alone and say which parts are missing.');
}
console.log('');
console.log('  Before sending: strip keys, tokens, internal hostnames, and customer data.');
console.log('  Never include the conversation, your own suspicions, or the fix you have in mind.');
console.log('  next: /cha-review2');
