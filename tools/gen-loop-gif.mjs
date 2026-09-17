#!/usr/bin/env node
// docs/diagrams/loop-anim{,-dark,-ko,-ko-dark}.gif — generated, not recorded.
//
// Both READMEs open with a ten-second animation of the loop. Every frame is
// computed here as an SVG and photographed by headless Chrome, then ffmpeg
// stitches the frames into a GIF. Nothing is prompted and nothing is traced by
// hand, because the whole point of the picture is that every label is spelled
// right and every step exists exactly once — the two things a generated video
// could not be trusted to keep.
//
//   node tools/gen-loop-gif.mjs               write all four GIFs into docs/diagrams/
//   node tools/gen-loop-gif.mjs path/to/dir   write them somewhere else
//
// Needs Chrome or Edge, and ffmpeg, on the machine that regenerates the GIFs —
// never on a machine that only installs the plugin. CHROME and FFMPEG override
// the lookups.
//
// Light and dark for the same reason as the SVGs: a GIF has no media query, so
// each README picks one with <picture>. The palette below is copied from
// tools/gen-diagrams.mjs, plus a green, because that file writes on import and
// cannot be imported. Change one, change both.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const OUT = resolve(process.argv[2] ?? 'docs/diagrams');
const W = 1200, H = 580, FPS = 20, SECONDS = 10;

// Hangul is not in any of the monospace faces, so the Korean fonts close both
// stacks explicitly instead of leaving the fallback to whatever Chrome picks.
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Malgun Gothic', 'Apple SD Gothic Neo', monospace";

const LIGHT = {
  bg: '#ffffff', text: '#1a1a1a', muted: '#6b6b6b', accent: '#b4341c',
  stroke: '#d0d0d0', boxfill: '#fafafa', onaccent: '#ffffff', faint: '#ececec',
  green: '#1a7f37',
};
const DARK = {
  bg: '#0d1117', text: '#e6edf3', muted: '#8b949e', accent: '#ff7b62',
  stroke: '#30363d', boxfill: '#161b22', onaccent: '#0d1117', faint: '#21262d',
  green: '#3fb950',
};

// One README per language, so one pair of GIFs per language. The Korean terms
// are the ones docs/ko/ and loop.svg already use — a reader who meets 어긋 here
// has to find 어긋 in 07-어긋내기.md, not a synonym.
//
// steps: [label, what the step does, what it leaves behind, colour]. The third
// column shows only on the first, slow lap — it is the trail a reader follows.
const TEXT = {
  en: {
    subtitle: 'Cyclic Hostile Adversarial Harnessing · the loop',
    readOnly: 'READ-ONLY · other platform',
    again: ['open issues > 0', '→ go around again'],
    counter: 'OPEN ISSUES',
    idle: 'Runs until open issues reach 0 — and nothing ships without a human go-ahead.',
    finale: '✓ 0 open issues · gate green → ready to ship, once a human says go',
    broken: 'BROKEN',
    steps: [
      ['HUNT', 'find suspicious lines', 'SUSPICIONS', 'plain'],
      ['BRIEF', 'cut into ≤20KB chunks', 'BRIEFINGS', 'plain'],
      ['SECOND EYE', 'independent review', 'CLAIMS', 'plain'],
      ['JUDGE', 'run every claim', 'TRUE', 'plain'],
      ['RED TEST', 'prove it fails first', 'FAILS', 'red'],
      ['FIX', 'one writer, one fix', 'PASSES', 'green'],
      ['MUTANT', 'break it on purpose', 'CAUGHT', 'green'],
      ['GATE', 'tests + lint + docs', 'GREEN', 'green'],
      ['RECORD', 'append, never delete', '+1 ROUND', 'plain'],
    ],
  },
  ko: {
    subtitle: '순환형 적대적 하네싱 · 루프',
    readOnly: '다른 플랫폼 · 읽기 전용',
    again: ['열린 이슈 > 0', '→ 한 바퀴 더'],
    counter: '열린 이슈',
    idle: '열린 이슈가 0 이 될 때까지 돈다 — 배포는 사람이 허락한 뒤에만.',
    finale: '✓ 열린 이슈 0 · 관문 초록 → 사람이 허락하면 배포',
    broken: '깨뜨림',
    steps: [
      ['사냥', '의심 가는 줄 찾기', '의심 목록', 'plain'],
      ['브리핑', '≤20KB 조각으로 자르기', '브리핑', 'plain'],
      ['2차 눈', '다른 눈으로 따로 검토', '주장', 'plain'],
      ['판정', '주장마다 돌려 보기', '참', 'plain'],
      ['빨간 검사', '실패부터 증명하기', '실패', 'red'],
      ['고침', '고치는 손은 하나', '통과', 'green'],
      ['어긋', '일부러 깨뜨려 보기', '잡음', 'green'],
      ['관문', '테스트 + 린트 + 문서', '초록', 'green'],
      ['기록', '덧붙이기만, 안 지움', '+1 회차', 'plain'],
    ],
  },
};
const MUTANT = 6;

// Hangul is about a full em wide, Latin in these faces a little over half.
const textWidth = (s, size) => [...s].reduce((w, ch) => w + (/[ᄀ-ᇿ㄰-㆏가-힯]/.test(ch) ? size : size * 0.57), 0);

/* ───────────────────────── geometry ───────────────────────── */

// A rectangular track: 1–5 left to right on top, 6–9 right to left underneath,
// and the way back up on the left. Every label stays horizontal.
const COLS = [50, 278, 506, 734, 962];
const CW = 188, CH = 104, TOP = 150, BOT = 394;
const pos = (i) => (i < 5 ? [COLS[i], TOP] : [COLS[9 - i], BOT]);

function link(i) {
  if (i < 4) { const y = TOP + CH / 2; return [[COLS[i] + CW, y], [COLS[i + 1], y]]; }
  if (i === 4) { const x = COLS[4] + CW / 2; return [[x, TOP + CH], [x, BOT]]; }
  const y = BOT + CH / 2;
  return [[COLS[9 - i], y], [COLS[8 - i] + CW, y]];
}
const REPEAT = [[COLS[1], BOT + CH / 2], [COLS[0] + CW / 2, BOT + CH / 2], [COLS[0] + CW / 2, TOP + CH]];

// Pull both ends off the box edges so an arrowhead never touches a border.
function inset(pts, a, b) {
  const p = pts.map(([x, y]) => [x, y]);
  const nudge = (from, to, d) => {
    const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
    from[0] += ((to[0] - from[0]) / len) * d;
    from[1] += ((to[1] - from[1]) / len) * d;
  };
  nudge(p[0], p[1], a);
  nudge(p[p.length - 1], p[p.length - 2], b);
  return p;
}

function along(pts, f) {
  const segs = pts.slice(1).map((q, k) => Math.hypot(q[0] - pts[k][0], q[1] - pts[k][1]));
  let d = segs.reduce((a, b) => a + b, 0) * f;
  for (let k = 0; k < segs.length; k++) {
    if (d <= segs[k] || k === segs.length - 1) {
      const u = segs[k] ? Math.min(1, d / segs[k]) : 0;
      return [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * u, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * u];
    }
    d -= segs[k];
  }
  return pts[pts.length - 1];
}

/* ───────────────────────── timeline ───────────────────────── */

// One slow lap a reader can follow, then two quick ones. Each lap closes one
// issue at RECORD; the loop goes around again only while the count is above 0.
const START = 0.3, SLOW = 0.62, FAST = 0.75 / 9, REPEAT_DUR = [0.45, 0.3];
const LAPS = [];
{
  let t = START;
  for (let n = 0; n < 3; n++) {
    const step = n === 0 ? SLOW : FAST;
    const lap = { start: t, step, end: t + 9 * step, slow: n === 0, travel: n === 0 ? 0.3 : 0.5 };
    t = lap.end;
    if (n < 2) { lap.repeat = { start: t, end: t + REPEAT_DUR[n] }; t = lap.repeat.end; }
    LAPS.push(lap);
  }
}
const DONE = LAPS[2].end;
const FADE = 9.6;

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (v) => (v < 0.5 ? 4 * v * v * v : 1 - (-2 * v + 2) ** 3 / 2);

function stateAt(t) {
  const s = { lap: 0, active: -1, k: 0, visited: 0, trail: 1, dot: null, repeatLit: false, count: 3, pop: 1, countAlpha: 1, done: 0 };

  // The last 0.4s walks back to frame 0 so the GIF has no seam. It is not a
  // dissolve: two counters or two captions at half opacity on the same spot
  // read as one garbled word, so the old one leaves before the new one arrives.
  if (t >= FADE) {
    const f = clamp01((t - FADE) / (SECONDS - FADE)), gone = 1 - ease(f);
    const first = f < 0.5;
    return { ...s, lap: 2, visited: 9, trail: gone, done: gone, count: first ? 0 : 3,
      countAlpha: first ? 1 - 2 * f : 2 * f - 1, finale: clamp01(1 - 2 * f), idle: clamp01(2 * f - 1) };
  }

  for (const lap of LAPS) {
    const at = lap.start + (8 + lap.travel) * lap.step;
    if (t >= at) { s.count--; s.pop = clamp01((t - at) / 0.35); }
  }

  for (let n = 0; n < LAPS.length; n++) {
    const lap = LAPS[n];
    if (t >= lap.start && t < lap.end) {
      const x = (t - lap.start) / lap.step;
      const i = Math.min(8, Math.floor(x)), local = x - i;
      const travel = i === 0 ? 0 : lap.travel;
      s.lap = n; s.visited = i;
      if (local < travel) s.dot = along(inset(link(i - 1), 6, 6), ease(local / travel));
      else { s.active = i; s.k = clamp01((local - travel) / (1 - travel)); }
      return s;
    }
    if (lap.repeat && t >= lap.repeat.start && t < lap.repeat.end) {
      const f = (t - lap.repeat.start) / (lap.repeat.end - lap.repeat.start);
      s.lap = n; s.visited = 9; s.trail = 1 - f; s.repeatLit = true;
      s.dot = along(inset(REPEAT, 6, 6), ease(f));
      return s;
    }
  }
  if (t >= DONE) { s.lap = 2; s.visited = 9; s.done = clamp01((t - DONE) / 0.35); }
  return s;
}

/* ───────────────────────── drawing ───────────────────────── */

const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function txt(x, y, s, { fam = MONO, size = 12, weight = 400, fill, anchor = 'start', spacing = 0, opacity = 1 }) {
  return `<text x="${x}" y="${y}" font-family="${fam}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"${spacing ? ` letter-spacing="${spacing}"` : ''}${opacity < 1 ? ` opacity="${opacity.toFixed(3)}"` : ''}>${esc(s)}</text>`;
}

function arrow(pts, color, width, opacity = 1) {
  const [ax, ay] = pts[pts.length - 2], [bx, by] = pts[pts.length - 1];
  const len = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / len, uy = (by - ay) / len;
  const hx = bx - ux * 9, hy = by - uy * 9, px = -uy * 5, py = ux * 5;
  const d = [...pts.slice(0, -1), [hx, hy]].map(([x, y], k) => `${k ? 'L' : 'M'}${x} ${y}`).join(' ');
  return `<g opacity="${opacity.toFixed(3)}"><path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linejoin="round"/>` +
    `<path d="M${bx} ${by} L${hx + px} ${hy + py} L${hx - px} ${hy - py} Z" fill="${color}"/></g>`;
}

function pill(x, y, label, kind, opacity, c) {
  const w = Math.round(textWidth(label, 11) + 18);
  const fill = kind === 'red' ? c.accent : kind === 'green' ? c.green : c.faint;
  const ink = kind === 'plain' ? c.text : c.onaccent;
  return `<g opacity="${opacity.toFixed(3)}"><rect x="${x}" y="${y}" width="${w}" height="20" rx="10" fill="${fill}"/>` +
    txt(x + w / 2, y + 14, label, { size: 11, weight: 700, fill: ink, anchor: 'middle' }) + '</g>';
}

function card(i, s, lap, c, L) {
  const [x, y] = pos(i);
  let [label, note, out, kind] = L.steps[i];
  const active = s.active === i, visited = i < s.visited;

  // The mutant is broken first and caught second; that order is the step.
  if (i === MUTANT && active && s.k < 0.45) { out = L.broken; kind = 'red'; }

  const tone = kind === 'red' ? c.accent : kind === 'green' ? c.green : c.accent;
  const showOut = lap.slow && (active || visited);
  let o = `<rect x="${x}" y="${y}" width="${CW}" height="${CH}" rx="10" fill="${c.boxfill}" stroke="${active ? (lap.slow ? tone : c.accent) : c.stroke}" stroke-width="${active ? 2 : 1}"/>`;
  if (active) {
    const a = lap.slow && kind !== 'plain' ? 0.13 : 0.06;
    o += `<rect x="${x}" y="${y}" width="${CW}" height="${CH}" rx="10" fill="${lap.slow ? tone : c.accent}" fill-opacity="${a}"/>`;
  }
  if (s.done) {
    o += `<rect x="${x}" y="${y}" width="${CW}" height="${CH}" rx="10" fill="${c.green}" fill-opacity="${(0.1 * s.done).toFixed(3)}" stroke="${c.green}" stroke-width="1.6" stroke-opacity="${s.done.toFixed(3)}"/>`;
  }

  const lit = active ? 1 : visited ? s.trail : 0;
  o += `<circle cx="${x + 26}" cy="${y + 27}" r="13" fill="${c.faint}"/>`;
  if (lit) o += `<circle cx="${x + 26}" cy="${y + 27}" r="13" fill="${c.accent}" opacity="${lit.toFixed(3)}"/>`;
  if (s.done) o += `<circle cx="${x + 26}" cy="${y + 27}" r="13" fill="${c.green}" opacity="${s.done.toFixed(3)}"/>`;
  o += txt(x + 26, y + 32, i + 1, { size: 13, weight: 700, fill: Math.max(lit, s.done) > 0.5 ? c.onaccent : c.muted, anchor: 'middle' });

  o += txt(x + 48, y + 33, label, { fam: SANS, size: 16.5, weight: 700, fill: c.text });
  o += txt(x + 18, y + 60, note, { size: 11.5, fill: c.muted });
  if (showOut) o += pill(x + 18, y + 72, out, kind, active ? clamp01(s.k * 4) : 0.7 * s.trail, c);
  return o;
}

function scene(t, c, L) {
  const s = stateAt(t);
  const lap = LAPS[s.lap];
  let o = `<rect width="${W}" height="${H}" fill="${c.bg}"/>`;

  o += txt(50, 50, 'CHA', { fam: SANS, size: 26, weight: 700, fill: c.text });
  o += txt(50, 74, L.subtitle, { size: 12.5, fill: c.muted });
  o += `<line x1="50" y1="92" x2="${W - 50}" y2="92" stroke="${c.stroke}" stroke-width="1"/>`;

  // Step 3 runs somewhere else and cannot write. Briefings cross in, claims cross back.
  const bx = COLS[2] - 14, by = TOP - 36;
  o += `<rect x="${bx}" y="${by}" width="${CW + 28}" height="${CH + 46}" rx="12" fill="none" stroke="${c.accent}" stroke-width="1.4" stroke-dasharray="6 5"/>`;
  o += txt(bx + 12, by + 22, L.readOnly, { size: 11, weight: 700, fill: c.accent });

  for (let i = 0; i < 8; i++) o += arrow(inset(link(i), 6, 4), c.muted, 1.4);

  const back = 1 - 0.65 * s.done;
  if (s.repeatLit) o += `<path d="M${REPEAT.map(([x, y]) => `${x} ${y}`).join(' L')}" fill="none" stroke="${c.accent}" stroke-width="7" stroke-opacity="0.18" stroke-linejoin="round"/>`;
  o += arrow(inset(REPEAT, 6, 4), c.accent, s.repeatLit ? 2.4 : 1.8, back);
  o += txt(COLS[0] + CW / 2 + 14, 318, L.again[0], { size: 12, weight: 700, fill: c.accent, opacity: back });
  o += txt(COLS[0] + CW / 2 + 14, 337, L.again[1], { size: 12, fill: c.muted, opacity: back });

  for (let i = 0; i < 9; i++) o += card(i, s, lap, c, L);

  if (s.dot) {
    o += `<circle cx="${s.dot[0]}" cy="${s.dot[1]}" r="12" fill="${c.accent}" fill-opacity="0.2"/>`;
    o += `<circle cx="${s.dot[0]}" cy="${s.dot[1]}" r="6" fill="${c.accent}"/>`;
  }

  const cx = 600, cy = 352;
  o += txt(cx, 312, L.counter, { size: 12, weight: 700, fill: c.muted, anchor: 'middle', spacing: 1.5 });
  const grow = 1 + 0.3 * (1 - ease(s.pop));
  const ink = s.count === 0 ? c.green : s.pop < 1 ? c.accent : c.text;
  o += `<g transform="translate(${cx} ${cy}) scale(${grow.toFixed(3)}) translate(${-cx} ${-cy})">` +
    txt(cx, 372, s.count, { fam: SANS, size: 54, weight: 700, fill: ink, anchor: 'middle', opacity: s.countAlpha }) + '</g>';

  const idle = s.idle ?? 1 - s.done, finale = s.finale ?? s.done;
  if (idle) o += txt(50, 548, L.idle, { size: 12.5, fill: c.muted, opacity: idle });
  if (finale) o += txt(50, 548, L.finale, { size: 12.5, weight: 700, fill: c.green, opacity: finale });
  return o;
}

const frame = (t, c, L) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${scene(t, c, L)}</svg>`;

/* ───────────────────────── capture ───────────────────────── */

function fail(msg) {
  console.error(`\n  ${msg}\n`);
  process.exit(1);
}

function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  return [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].find((p) => existsSync(p)) ?? fail('No Chrome or Edge found. Set CHROME to the browser executable.');
}

const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';
if (spawnSync(FFMPEG, ['-version'], { stdio: 'ignore' }).status !== 0) {
  fail('ffmpeg not found. Install it, or set FFMPEG to its executable.');
}

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function openBrowser(exe, profile) {
  const proc = spawn(exe, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: 'ignore' });

  const portFile = join(profile, 'DevToolsActivePort');
  let lines = [];
  for (let n = 0; lines.length < 2; n++) {
    if (n > 150) { proc.kill(); throw new Error('the browser did not open a debugging port within 15s'); }
    await pause(100);
    if (existsSync(portFile)) lines = readFileSync(portFile, 'utf8').trim().split('\n');
  }

  const ws = new WebSocket(`ws://127.0.0.1:${lines[0].trim()}${lines[1].trim()}`);
  await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });
  let seq = 0;
  const waiting = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (!waiting.has(m.id)) return;
    const { ok, no } = waiting.get(m.id);
    waiting.delete(m.id);
    m.error ? no(new Error(m.error.message)) : ok(m.result);
  };
  const send = (method, params = {}, sessionId) => new Promise((ok, no) => {
    const id = ++seq;
    waiting.set(id, { ok, no });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const page = (method, params) => send(method, params, sessionId);
  await page('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await page('Runtime.evaluate', { expression: "document.body.style.margin = '0'" });

  return {
    async shoot(svg) {
      await page('Runtime.evaluate', {
        expression: `document.body.innerHTML = ${JSON.stringify(svg)}; new Promise((r) => { requestAnimationFrame(() => r()); setTimeout(r, 50); })`,
        awaitPromise: true,
      });
      const { data } = await page('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
      return Buffer.from(data, 'base64');
    },
    async close() {
      await send('Browser.close').catch(() => {});
      await new Promise((r) => {
        if (proc.exitCode !== null) return r();
        const timer = setTimeout(() => { proc.kill(); r(); }, 5000);
        proc.once('exit', () => { clearTimeout(timer); r(); });
      });
    },
  };
}

function encode(frames, out) {
  const r = spawnSync(FFMPEG, [
    '-v', 'error', '-y', '-framerate', String(FPS), '-i', join(frames, '%04d.png'),
    '-filter_complex', 'split[a][b];[a]palettegen=max_colors=128:stats_mode=full:reserve_transparent=0[p];[b][p]paletteuse=dither=none:diff_mode=rectangle',
    '-loop', '0', out,
  ], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`ffmpeg exited with ${r.status} on ${out}`);
}

const work = mkdtempSync(join(tmpdir(), 'cha-loop-gif-'));
mkdirSync(OUT, { recursive: true });
const browser = await openBrowser(findChrome(), join(work, 'profile'));
try {
  console.log('');
  const jobs = [
    ['loop-anim.gif', LIGHT, TEXT.en], ['loop-anim-dark.gif', DARK, TEXT.en],
    ['loop-anim-ko.gif', LIGHT, TEXT.ko], ['loop-anim-ko-dark.gif', DARK, TEXT.ko],
  ];
  for (const [name, palette, words] of jobs) {
    const dir = join(work, name);
    mkdirSync(dir);
    for (let f = 0; f < FPS * SECONDS; f++) {
      writeFileSync(join(dir, `${String(f).padStart(4, '0')}.png`), await browser.shoot(frame(f / FPS, palette, words)));
    }
    const out = join(OUT, name);
    encode(dir, out);
    console.log(`  ${name.padEnd(22)} ${String(readFileSync(out).length).padStart(9)} bytes`);
  }
  console.log('');
  console.log('  Now WATCH every one of them. A frame that is right on its own can still be');
  console.log('  wrong in sequence, and only playing it shows that.');
  console.log('');
} finally {
  await browser.close();
  rmSync(work, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
