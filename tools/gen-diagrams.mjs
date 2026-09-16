#!/usr/bin/env node
// docs/diagrams/*.svg — generated, not hand-written.
//
// There are six files and only three diagrams. Each one ships twice, once for
// a light background and once for a dark one, because GitHub strips <style>
// out of an SVG and a media query would never fire anyway.
//
// That is the whole reason this file exists. A hand-maintained dark copy drifts
// from the light one and NOBODY NOTICES, because each file renders perfectly
// well on its own — you only ever look at one of them at a time, and the one
// you are looking at is always fine. The divergence shows up months later as a
// reader asking why the dark diagram is missing a box. So the geometry is
// written once here and the palette is the only thing that varies.
//
//   node tools/gen-diagrams.mjs                 write into docs/diagrams/
//   node tools/gen-diagrams.mjs path/to/dir     write the SVGs somewhere else, page untouched
//   node tools/gen-diagrams.mjs docs/diagrams site/index.html
//
// Rules the output has to keep, all of them learned from something that broke:
//
//   · No <script>, no <style>, no <foreignObject>, no <marker>. GitHub's
//     sanitiser removes them and an arrow that loses its head is worse than no
//     arrow, so arrowheads are explicit <path> triangles.
//   · Every <text> carries its own x and y. Nothing is positioned by CSS.
//   · No rotated Korean. Rotated CJK does not shape — the glyphs come out
//     stacked and separated, and it is unreadable at any size. Labels that
//     want to sit on a line get a horizontal backdrop rect instead.
//   · Nothing is drawn over a box. A connector that crosses a node strikes out
//     the text inside it, and arithmetic width checks cannot see that — only
//     rendering it can.
//
// It also rewrites the copies inlined in site/index.html, for the same reason
// in a different place: that page is self-contained on purpose, so it carries
// its own copy of each diagram, and a copy nobody regenerates is a copy that
// goes stale without ever looking stale. Its palette is a third one — CSS
// variables, so the one inline copy serves light and dark.
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.argv[2] ?? 'docs/diagrams';
mkdirSync(OUT, { recursive: true });

// 'Malgun Gothic' is in the stack because the Korean has to render on Windows,
// which is where this repo is written.
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const LIGHT = {
  bg: '#ffffff', text: '#1a1a1a', muted: '#6b6b6b', accent: '#b4341c',
  stroke: '#d0d0d0', boxfill: '#fafafa', stepfill: '#f1f1f0', onaccent: '#ffffff',
  faint: '#ececec',
};
const DARK = {
  bg: '#0d1117', text: '#e6edf3', muted: '#8b949e', accent: '#ff7b62',
  stroke: '#30363d', boxfill: '#161b22', stepfill: '#1c232c', onaccent: '#0d1117',
  faint: '#21262d',
};
// For the inline copies in site/index.html only. SVG `fill` and `stroke` take
// var(), so one inline copy follows the page's own light/dark tokens and there
// is no second inline copy to keep in step.
const SITE = {
  bg: 'var(--dia-bg)', text: 'var(--dia-ink)', muted: 'var(--dia-muted)',
  accent: 'var(--dia-accent)', stroke: 'var(--dia-rule)', boxfill: 'var(--dia-panel)',
  stepfill: 'var(--dia-step)', onaccent: 'var(--dia-bg)', faint: 'var(--dia-faint)',
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const headR = (x, y, f) => `<path d="M${x} ${y} L${x - 9} ${y - 5} L${x - 9} ${y + 5} Z" fill="${f}"/>`;
const headD = (x, y, f) => `<path d="M${x} ${y} L${x - 5} ${y - 9} L${x + 5} ${y - 9} Z" fill="${f}"/>`;

function svgOpen(w, h, title, desc, c) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-labelledby="t d">
<title id="t">${esc(title)}</title>
<desc id="d">${esc(desc)}</desc>
<rect x="0" y="0" width="${w}" height="${h}" fill="${c.bg}"/>`;
}

function header(c, title, sub, w) {
  return `<text x="50" y="46" font-family="${SANS}" font-size="21" font-weight="700" fill="${c.text}">${esc(title)}</text>
<text x="50" y="72" font-family="${MONO}" font-size="12.5" fill="${c.muted}">${esc(sub)}</text>
<line x1="50" y1="92" x2="${w - 50}" y2="92" stroke="${c.stroke}" stroke-width="1"/>`;
}

/* ───────────────────────── 1. the nine-step loop ───────────────────────── */

const STEPS = [
  ['사냥', 'hunt', 'first eye reads a slice, writes suspicions'],
  ['브리핑', 'brief', 'cut to ≤20KB + the promises'],
  ['2차 눈', 'second eye', 'another platform, read-only'],
  ['판정', 'adjudicate', 'run it: 참 / 거짓 / 못 잼'],
  ['빨간 검사', 'red test', 'prove the failure first'],
  ['고침', 'fix', 'one writer, one defect'],
  ['어긋', 'mutant', 'break it on purpose'],
  ['관문', 'gate', 'real numbers, not "pass"'],
  ['기록', 'record', 'append, never delete'],
];

function loopSvg(c) {
  const W = 1200, H = 780, BW = 330, BH = 92;
  const cols = [50, 435, 820];
  const rows = [140, 330, 480];
  const cx = (i) => cols[i % 3];
  const cy = (i) => rows[Math.floor(i / 3)];

  let s = svgOpen(W, H, 'CHA — the nine-step loop',
    'Nine steps in a closed cycle: hunt, brief, second eye, adjudicate, red test, fix, mutant, gate, record. Step three runs on another platform and is read-only. While the open issue count is above zero the loop returns to step one.', c);
  s += header(c, 'CHA — 순환형 적대적 하네싱', 'Cyclic Hostile Adversarial Harnessing · the nine-step loop', W);

  s += `\n<rect x="806" y="112" width="358" height="164" rx="10" fill="none" stroke="${c.accent}" stroke-width="1.4" stroke-dasharray="6 5"/>`;
  s += `\n<text x="818" y="254" font-family="${SANS}" font-size="11.5" font-weight="600" fill="${c.accent}">다른 플랫폼 · 읽기 전용</text>`;
  s += `\n<text x="818" y="270" font-family="${MONO}" font-size="10.5" fill="${c.muted}">another platform · read-only</text>`;

  STEPS.forEach(([ko, en, note], i) => {
    const X = cx(i), Y = cy(i);
    const eye = i === 2;
    s += `\n<rect x="${X}" y="${Y}" width="${BW}" height="${BH}" rx="8" fill="${c.boxfill}" stroke="${eye ? c.accent : c.stroke}" stroke-width="${eye ? 1.5 : 1}"/>`;
    s += `\n<circle cx="${X + 26}" cy="${Y + 28}" r="13" fill="${c.accent}"/>`;
    s += `<text x="${X + 26}" y="${Y + 33}" font-family="${MONO}" font-size="13" font-weight="700" fill="${c.onaccent}" text-anchor="middle">${i + 1}</text>`;
    s += `\n<text x="${X + 50}" y="${Y + 27}" font-family="${SANS}" font-size="15.5" font-weight="700" fill="${c.text}">${esc(ko)}</text>`;
    s += `<text x="${X + 50}" y="${Y + 47}" font-family="${MONO}" font-size="12.5" fill="${c.muted}">${esc(en)}</text>`;
    s += `\n<text x="${X + 18}" y="${Y + 74}" font-family="${MONO}" font-size="11.5" fill="${c.muted}">${esc(note)}</text>`;
  });

  const rowArrow = (from, y) =>
    `\n<line x1="${cols[from] + BW + 8}" y1="${y}" x2="${cols[from + 1] - 9}" y2="${y}" stroke="${c.muted}" stroke-width="1.4"/>${headR(cols[from + 1], y, c.muted)}`;
  for (const y of [186, 376, 526]) s += rowArrow(0, y) + rowArrow(1, y);

  const wrap = (fx, fy, tx, ty, band) =>
    `\n<path d="M${fx} ${fy} V${band} H${tx} V${ty - 9}" fill="none" stroke="${c.muted}" stroke-width="1.4"/>${headD(tx, ty, c.muted)}`;
  s += wrap(1100, 232, 215, 330, 302);
  s += wrap(985, 422, 215, 480, 452);

  s += `\n<path d="M985 572 V648 H25 V186 H41" fill="none" stroke="${c.accent}" stroke-width="1.8"/>${headR(50, 186, c.accent)}`;
  s += `\n<rect x="462" y="634" width="236" height="26" rx="4" fill="${c.bg}"/>`;
  s += `\n<text x="580" y="652" font-family="${MONO}" font-size="12.5" font-weight="700" fill="${c.accent}" text-anchor="middle">${esc('이슈 > 0 ? / issues > 0 ?')}</text>`;

  s += `\n<text x="50" y="706" font-family="${SANS}" font-size="12.5" fill="${c.text}">관문이 초록이고 열린 항목이 0 일 때만 멈춘다. 배포는 사람이 허락한 뒤에만.</text>`;
  s += `\n<text x="50" y="728" font-family="${MONO}" font-size="11.5" fill="${c.muted}">It stops only when the gate is green and the open count is zero. Nothing ships without an explicit human go-ahead.</text>`;
  return s + '\n</svg>\n';
}

/* ───────────────────────── 2. architecture ───────────────────────── */

const KIND = { file: 'file', tool: 'tool', step: 'step' };

function archSvg(c) {
  const W = 1240, H = 760;
  const COLS = [40, 267, 494, 721];
  // 58, not 52. At 52 the second line's Korean descenders sat on the box
  // border and the label read as clipped.
  const BW = 194, BH = 58;
  const DIV = 930;
  const bands = [194, 304, 414, 524];
  const midY = (b) => bands[b] + 29;

  const box = (x, y, w, kind, l1, l2) => {
    let r;
    if (kind === KIND.file) r = `<rect x="${x}" y="${y}" width="${w}" height="${BH}" rx="3" fill="${c.boxfill}" stroke="${c.stroke}" stroke-width="1"/>`;
    else if (kind === KIND.tool) r = `<rect x="${x}" y="${y}" width="${w}" height="${BH}" rx="9" fill="${c.boxfill}" stroke="${c.accent}" stroke-width="1.5"/>`;
    else r = `<rect x="${x}" y="${y}" width="${w}" height="${BH}" rx="${BH / 2}" fill="${c.stepfill}" stroke="${c.stroke}" stroke-width="1"/>`;
    const fam = kind === KIND.step ? SANS : MONO;
    r += `\n<text x="${x + w / 2}" y="${y + (l2 ? 23 : 35)}" font-family="${fam}" font-size="${kind === KIND.step ? 14 : 12.5}" font-weight="${kind === KIND.step ? 700 : 600}" fill="${c.text}" text-anchor="middle">${esc(l1)}</text>`;
    if (l2) r += `<text x="${x + w / 2}" y="${y + 44}" font-family="${MONO}" font-size="10" fill="${c.muted}" text-anchor="middle">${esc(l2)}</text>`;
    return '\n' + r;
  };

  let s = svgOpen(W, H, 'CHA — how the pieces connect',
    'A left-to-right data flow. Everything with write access is on the left of a dashed read-only boundary: the plugin tools, the .cha files and the one writer. On the right is the second eye, on another platform with a pinned model id and no write tools, no shell and no repository access. It receives briefing text and returns claim text, and nothing else crosses.', c);
  s += header(c, '조각들이 어떻게 붙나 · how the pieces connect', 'one writer on the left · a read-only second eye on the right · every artefact under .cha/', W);

  s += `\n<text x="40" y="118" font-family="${SANS}" font-size="14" font-weight="700" fill="${c.text}">쓰는 곳 하나 / one writer</text>`;
  s += `\n<text x="290" y="118" font-family="${MONO}" font-size="11" fill="${c.muted}">Claude Code + this plugin — the only thing with write access to the repo</text>`;

  // The boundary. Its label is HORIZONTAL on a backdrop rect: rotated Korean
  // renders as stacked separated glyphs and cannot be read at any size.
  s += `\n<line x1="${DIV}" y1="96" x2="${DIV}" y2="700" stroke="${c.accent}" stroke-width="1.6" stroke-dasharray="7 6"/>`;
  s += `\n<rect x="805" y="99" width="250" height="26" rx="4" fill="${c.bg}"/>`;
  s += `\n<text x="930" y="117" font-family="${MONO}" font-size="11.5" font-weight="700" fill="${c.accent}" text-anchor="middle">읽기 전용 경계 / read-only boundary</text>`;

  s += `\n<rect x="40" y="132" width="875" height="34" rx="4" fill="${c.faint}" stroke="${c.stroke}" stroke-width="1"/>`;
  s += `\n<text x="54" y="154" font-family="${MONO}" font-size="12.5" font-weight="700" fill="${c.text}">.cha/config.json</text>`;
  s += `<text x="196" y="154" font-family="${MONO}" font-size="10.5" fill="${c.muted}">gate · secondEye · briefing.maxBytes · mutate · writer</text>`;
  s += `<text x="901" y="154" font-family="${MONO}" font-size="10.5" fill="${c.muted}" text-anchor="end">모든 도구가 읽는다 / every tool reads this</text>`;

  s += box(COLS[0], bands[0], BW, KIND.step, 'src/**', 'the source under review');
  s += box(COLS[1], bands[0], BW, KIND.tool, 'tools/brief.mjs', '≤20480 bytes');
  s += box(COLS[2], bands[0], BW, KIND.file, '.cha/briefings/*.md');
  s += box(COLS[3], bands[0], BW, KIND.tool, 'tools/queue.mjs', 'serial · quota-aware');

  s += box(COLS[0], bands[1], BW, KIND.file, '.cha/answers/*.md');
  s += box(COLS[1], bands[1], BW, KIND.step, '판정 / adjudicate', '돌려 본다 / by execution');
  s += box(COLS[2], bands[1], BW, KIND.step, '빨간 검사 / red test', 'watch it fail first');
  s += box(COLS[3], bands[1], BW, KIND.step, '고침 / fix', 'one writer, one defect');

  s += box(COLS[0], bands[2], BW, KIND.tool, 'tools/add-mutant.mjs', 'anchor lifted, never retyped');
  s += box(COLS[1], bands[2], BW, KIND.file, '.cha/mutants.json');
  s += box(COLS[2], bands[2], BW, KIND.tool, 'tools/mutate.mjs', 'restore in a finally');
  s += box(COLS[3], bands[2], BW, KIND.step, '잡음 / 샜음 / 못 잼', 'caught / leaked / unmeasurable');

  s += box(COLS[0], bands[3], BW, KIND.step, '관문 / gate', 'tests · check · docs');
  s += box(COLS[1], bands[3], BW, KIND.tool, 'tools/record.mjs', 'refuses to shrink the file');
  s += box(COLS[2], bands[3], 421, KIND.file, '.cha/record.md', '보태기만 · append-only · never edited downward');

  // The second eye. Every line gets its own baseline; a Korean line and an
  // English line never share one, and the pairs are spaced apart so the block
  // reads as four facts rather than one smear.
  const PY = 194, PH = 262;
  s += `\n<rect x="968" y="${PY}" width="232" height="${PH}" rx="9" fill="${c.boxfill}" stroke="${c.accent}" stroke-width="1.5"/>`;
  s += `\n<text x="1084" y="${PY + 28}" font-family="${SANS}" font-size="15" font-weight="700" fill="${c.text}" text-anchor="middle">2차 눈 / second eye</text>`;
  s += `\n<line x1="982" y1="${PY + 40}" x2="1186" y2="${PY + 40}" stroke="${c.stroke}"/>`;
  const pairs = [
    ['다른 플랫폼', 'another platform'],
    ['모델 id 못박음', 'pinned model id'],
    ['받는 것: 브리핑 글만', 'receives: briefing text only'],
    ['보내는 것: 지적 글만', 'returns: claim text only'],
    ['쓰기 도구 · 셸 · 저장소 접근 없음', 'no writes · no shell · no repo'],
  ];
  pairs.forEach(([ko, en], i) => {
    const y = PY + 62 + i * 40;
    s += `\n<text x="982" y="${y}" font-family="${SANS}" font-size="11" font-weight="600" fill="${c.text}">${esc(ko)}</text>`;
    s += `<text x="982" y="${y + 16}" font-family="${MONO}" font-size="10" fill="${c.muted}">${esc(en)}</text>`;
  });

  const between = (i, y) =>
    `\n<line x1="${COLS[i] + BW + 6}" y1="${y}" x2="${COLS[i + 1] - 9}" y2="${y}" stroke="${c.muted}" stroke-width="1.3"/>${headR(COLS[i + 1], y, c.muted)}`;
  for (const b of [0, 1, 2, 3]) {
    const last = b === 3 ? 1 : 2;
    for (let i = 0; i <= last; i++) s += between(i, midY(b));
  }

  // Out across the boundary, and back. The return leg travels in the empty
  // gap between band 1 and band 2 — routed straight across at its own height
  // it went through the 판정, 빨간 검사 and 고침 boxes and struck out their
  // sub-labels.
  s += `\n<line x1="921" y1="${midY(0)}" x2="959" y2="${midY(0)}" stroke="${c.accent}" stroke-width="1.6"/>${headR(968, midY(0), c.accent)}`;
  s += `\n<path d="M968 278 H137 V295" fill="none" stroke="${c.accent}" stroke-width="1.6"/>${headD(137, bands[1], c.accent)}`;

  s += `\n<path d="M818 362 V388 H137 V405" fill="none" stroke="${c.muted}" stroke-width="1.3"/>${headD(137, bands[2], c.muted)}`;
  s += `\n<path d="M818 472 V498 H137 V515" fill="none" stroke="${c.muted}" stroke-width="1.3"/>${headD(137, bands[3], c.muted)}`;

  s += `\n<line x1="40" y1="622" x2="915" y2="622" stroke="${c.stroke}" stroke-width="1"/>`;
  s += `\n<rect x="40" y="640" width="26" height="16" rx="3" fill="${c.boxfill}" stroke="${c.stroke}"/>`;
  s += `<text x="74" y="653" font-family="${MONO}" font-size="11" fill="${c.muted}">파일 / file</text>`;
  s += `\n<rect x="172" y="640" width="26" height="16" rx="6" fill="${c.boxfill}" stroke="${c.accent}" stroke-width="1.5"/>`;
  s += `<text x="206" y="653" font-family="${MONO}" font-size="11" fill="${c.muted}">도구 / tool (tools/*.mjs)</text>`;
  s += `\n<rect x="388" y="640" width="26" height="16" rx="8" fill="${c.stepfill}" stroke="${c.stroke}"/>`;
  s += `<text x="422" y="653" font-family="${MONO}" font-size="11" fill="${c.muted}">단계 / step</text>`;

  s += `\n<text x="40" y="700" font-family="${SANS}" font-size="12.5" fill="${c.text}">쓰는 곳이 둘이면 두 수정이 만나는 자리를 아무도 안 읽는다. 반만 붙은 고침이 나오는 자리가 거기다 — 세 번 나왔다.</text>`;
  s += `\n<text x="40" y="722" font-family="${MONO}" font-size="11.5" fill="${c.muted}">Two writers produce edits whose interaction nobody read. That is where half-applied fixes come from — found three times.</text>`;
  return s + '\n</svg>\n';
}

/* ───────────────────────── 3. verdicts ───────────────────────── */

function verdictsSvg(c) {
  const W = 1000, H = 560;
  let s = svgOpen(W, H, 'CHA — 57 claims, split by execution',
    'Fifty-seven second-eye claims enter and are split by execution, not by reading. Twenty-two were true and nineteen fixes landed. The false ones were recorded with counter-evidence and no code was edited. Four were unmeasurable and were recorded as unmeasurable, never as false.', c);
  s += header(c, '주장 57건, 실행으로 가른다', '57 claims · split by execution, never by plausibility', W);

  // Above the fan-out, not beside it. Placed level with the first verdict box
  // this sentence ran underneath it and came out the other side as a fragment.
  s += `\n<text x="40" y="118" font-family="${SANS}" font-size="12.5" font-weight="700" fill="${c.accent}">실행으로 가른다 / split by execution</text>`;
  s += `\n<text x="40" y="136" font-family="${MONO}" font-size="10.5" fill="${c.muted}">a claim is true when you have run something that would behave differently if it were false</text>`;

  s += `\n<rect x="40" y="238" width="190" height="80" rx="8" fill="${c.boxfill}" stroke="${c.stroke}"/>`;
  s += `\n<text x="135" y="270" font-family="${SANS}" font-size="17" font-weight="700" fill="${c.text}" text-anchor="middle">주장 57</text>`;
  s += `<text x="135" y="290" font-family="${MONO}" font-size="12.5" fill="${c.muted}" text-anchor="middle">57 claims received</text>`;
  s += `<text x="135" y="307" font-family="${MONO}" font-size="10.5" fill="${c.muted}" text-anchor="middle">39 briefings · 39 rounds</text>`;

  const rows = [
    { y: 190, ko: '참', en: 'true', n: '22',
      o1: '고침 19', o2: '19 fixes landed', o3: '빨간 검사 먼저 · 어긋으로 지킴 / guarded', dash: false, accent: true },
    { y: 278, ko: '거짓', en: 'false', n: '',
      o1: '반증을 기록', o2: 'counter-evidence recorded', o3: '코드는 안 건드림 / no code edited', dash: true, accent: false },
    { y: 366, ko: '못 잼', en: 'unmeasurable', n: '4',
      o1: '기록. 거짓 아님', o2: 'recorded, never as false', o3: '하네스의 지도 / a map of the harness', dash: false, accent: false },
  ];

  for (const r of rows) {
    const top = r.y - 32;
    s += `\n<path d="M230 278 C300 278, 320 ${r.y}, 400 ${r.y}" fill="none" stroke="${r.accent ? c.accent : c.muted}" stroke-width="1.6"/>`;
    s += `\n<rect x="400" y="${top}" width="180" height="64" rx="8" fill="${c.boxfill}" stroke="${r.accent ? c.accent : c.stroke}" stroke-width="${r.accent ? 1.6 : 1}"/>`;
    s += `\n<text x="416" y="${r.y - 6}" font-family="${SANS}" font-size="15" font-weight="700" fill="${c.text}">${esc(r.ko)}</text>`;
    s += `<text x="416" y="${r.y + 13}" font-family="${MONO}" font-size="11" fill="${c.muted}">${esc(r.en)}</text>`;
    if (r.n) s += `\n<text x="564" y="${r.y + 6}" font-family="${MONO}" font-size="21" font-weight="700" fill="${c.accent}" text-anchor="end">${esc(r.n)}</text>`;

    s += `\n<line x1="586" y1="${r.y}" x2="641" y2="${r.y}" stroke="${c.muted}" stroke-width="1.4"/>${headR(650, r.y, c.muted)}`;
    s += `\n<rect x="650" y="${top}" width="310" height="64" rx="8" fill="${c.boxfill}" stroke="${c.stroke}" stroke-width="1"${r.dash ? ' stroke-dasharray="6 5"' : ''}/>`;
    s += `\n<text x="666" y="${r.y - 12}" font-family="${SANS}" font-size="13" font-weight="700" fill="${c.text}">${esc(r.o1)}</text>`;
    s += `<text x="666" y="${r.y + 5}" font-family="${MONO}" font-size="11" fill="${c.text}">${esc(r.o2)}</text>`;
    s += `<text x="666" y="${r.y + 21}" font-family="${MONO}" font-size="9.5" fill="${c.muted}">${esc(r.o3)}</text>`;
  }

  s += `\n<line x1="50" y1="440" x2="950" y2="440" stroke="${c.stroke}"/>`;
  s += `\n<text x="50" y="468" font-family="${SANS}" font-size="13" fill="${c.text}">실행이 아니라 그럴듯함으로 움직였으면, 멀쩡한 코드에 35번 손을 댔을 것이다.</text>`;
  s += `\n<text x="50" y="490" font-family="${MONO}" font-size="12" fill="${c.muted}">Acting on plausibility instead of execution would have meant 35 edits to working code.</text>`;
  s += `\n<text x="50" y="512" font-family="${MONO}" font-size="10.5" fill="${c.muted}">57 − 22 = 35. 잰 숫자다, 어림이 아니다 / measured, not estimated.</text>`;
  return s + '\n</svg>\n';
}

/* ───────────────────────── write them out ───────────────────────── */

const jobs = [
  ['loop.svg', loopSvg(LIGHT)], ['loop-dark.svg', loopSvg(DARK)],
  ['architecture.svg', archSvg(LIGHT)], ['architecture-dark.svg', archSvg(DARK)],
  ['verdicts.svg', verdictsSvg(LIGHT)], ['verdicts-dark.svg', verdictsSvg(DARK)],
];

console.log('');
for (const [name, body] of jobs) {
  writeFileSync(join(OUT, name), body, 'utf8');
  console.log(`  ${name.padEnd(24)} ${String(Buffer.byteLength(body)).padStart(6)} bytes`);
}
console.log('');
console.log(`  ${jobs.length} files into ${OUT}/`);

/* ──────────────── the inline copies in site/index.html ──────────────── */
// Replaced between markers rather than appended, and the markers have to be
// there already. Generating them if they are missing would let a page that
// quietly lost its diagram come back looking fine, which is the failure this
// step exists to prevent, one layer up.

// Asking for the SVGs somewhere else means you are trying something out, and a
// tool that writes into the repository while you are trying something out is a
// tool that edits a file you did not name. So a custom output directory turns
// the page step off unless the page is named too.
const SITE_PAGE = process.argv[3] ?? (process.argv[2] ? null : 'site/index.html');
const 끼울것 = [
  ['loop', () => loopSvg(SITE), 900],
  ['architecture', () => archSvg(SITE), 980],
  ['verdicts', () => verdictsSvg(SITE), 820],
];

if (!SITE_PAGE) {
  console.log(`  wrote to ${OUT}/ only — pass a page path as the second argument to also refresh its inline copies.`);
} else if (!existsSync(SITE_PAGE)) {
  console.log(`  ${SITE_PAGE} not here — skipped the inline copies.`);
} else {
  let 쪽 = readFileSync(SITE_PAGE, 'utf8');
  const 전 = Buffer.byteLength(쪽);
  const 못찾음 = [];
  let 바꾼것 = 0;

  for (const [이름, 짓기, 최소너비] of 끼울것) {
    const 여는것 = `<!-- diagram:${이름} -->`;
    const 닫는것 = `<!-- /diagram:${이름} -->`;
    const a = 쪽.indexOf(여는것);
    const b = 쪽.indexOf(닫는것);
    if (a < 0 || b < 0 || b < a) { 못찾음.push(이름); continue; }

    // Responsive: the viewBox carries the aspect ratio, so width/height must
    // not pin it. min-width keeps the text legible and lets the container
    // scroll on a phone instead of shrinking 11px type into nothing.
    const 몸 = 짓기()
      .trim()
      .replace(/ width="\d+" height="\d+"/, ` style="width:100%;height:auto;min-width:${최소너비}px"`)
      .replace(/ id="t"/, ` id="${이름}-t"`)
      .replace(/ id="d"/, ` id="${이름}-d"`)
      .replace(/ aria-labelledby="t d"/, ` aria-labelledby="${이름}-t ${이름}-d"`)
      // The page supplies the background; an opaque canvas rect would sit on it.
      .replace(/<rect x="0" y="0" width="\d+" height="\d+" fill="var\(--dia-bg\)"\/>/, '');

    쪽 = 쪽.slice(0, a + 여는것.length) + '\n' + 몸 + '\n' + 쪽.slice(b);
    바꾼것 += 1;
  }

  if (못찾음.length) {
    console.error('');
    console.error(`  ${SITE_PAGE}: no <!-- diagram:NAME --> … <!-- /diagram:NAME --> markers for ${못찾음.join(', ')}.`);
    console.error('  Nothing written to the page. Put the markers back rather than letting');
    console.error('  this tool invent them — a page that lost a diagram must not come back green.');
    process.exit(1);
  }

  writeFileSync(SITE_PAGE, 쪽, 'utf8');
  console.log(`  ${바꾼것} inline copies refreshed in ${SITE_PAGE} (${전} → ${Buffer.byteLength(쪽)} bytes)`);
}

console.log('');
console.log('  Now LOOK at them. An arithmetic width check cannot see a connector');
console.log('  crossing a box, and that is the defect this file keeps producing.');
console.log('');
