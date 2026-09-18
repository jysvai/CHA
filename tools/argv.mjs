// Arguments — read them, or stop. Never guess.
//
// This is a module and not four copies of an `indexOf` because of what the
// copies did. All of it was run, not imagined:
//
//   node tools/queue.mjs --only --redo      sent EVERY briefing. `--redo` was
//                                           taken as the value of --only, the
//                                           filter fell back to null, and the
//                                           screen said "2 answered". A second
//                                           eye costs quota, so that mistake is
//                                           paid for twice.
//   node tools/queue.mjs --brieffings x     ran the default directory and said
//                                           nothing about the typo.
//   node tools/brief.mjs f --max 20kb       Number('20kb') is NaN, every
//                                           `> NaN` is false, so the cap stopped
//                                           existing and a 42KB briefing went
//                                           out under the line "cap NaNKB".
//
// One shape underneath all three: an option the tool did not understand was
// treated as an option the tool did not need. The person reading the screen
// believes they narrowed something; the tool widened it.
//
// So: an unknown option is a stop. A flag where a value belongs is a stop —
// no legal value here (a path, a tag, a byte count) begins with a dash. A
// number that is not a number is a stop.
//
// It lives apart from the tools for a reason the loop it came from learned the
// hard way: while the retry rules sat inside the caller, a refactor deleted
// them whole and every test stayed green. Rules with no seam get no tests.
export function 읽기(인자, { 값받는것 = [], 깃발들 = [] }) {
  const 아는것 = new Set([...값받는것, ...깃발들]);
  const 문제 = [];
  const 값들 = {};
  const 깃발 = {};
  const 위치들 = [];

  for (let i = 0; i < 인자.length; i++) {
    const 칸 = 인자[i];
    if (!칸.startsWith('-')) { 위치들.push(칸); continue; }

    const [이름, ...나머지] = 칸.replace(/^--?/, '').split('=');
    if (!아는것.has(이름)) { 문제.push(`unknown option: ${칸}`); continue; }
    if (!값받는것.includes(이름)) { 깃발[이름] = true; continue; }

    if (나머지.length) {
      const 값 = 나머지.join('=');
      if (!값.trim()) 문제.push(`--${이름} needs a value`);
      else 값들[이름] = 값;
      continue;
    }

    const 다음 = 인자[i + 1];
    if (다음 === undefined || !다음.trim()) 문제.push(`--${이름} needs a value`);
    else if (다음.startsWith('-')) 문제.push(`--${이름} needs a value, and ${다음} is an option, not a value`);
    else { 값들[이름] = 다음; i += 1; }
  }

  return { 문제, 값들, 깃발, 위치들 };
}

/**
 * A number, or a problem. Used for both flags and config keys, because
 * `maxRetries: "six"` did the same thing `--max 20kb` did: NaN compares false
 * against everything, so `NaN >= 0` skipped every briefing in the queue and
 * the run reported "0 answered · 0 lost" and exit 0.
 */
export function 숫자(이름, 날것, 기본) {
  if (날것 === undefined || 날것 === null || 날것 === '') return { 값: 기본 };
  const n = Number(날것);
  if (!Number.isFinite(n)) return { 문제: `${이름} is not a number: ${JSON.stringify(날것)}` };
  if (n < 0) return { 문제: `${이름} cannot be negative: ${n}` };
  return { 값: n };
}

/** Print the problems the way the rest of the tools talk, and stop. */
export function 멈춤(문제, 쓰는법) {
  console.error('');
  for (const 말 of 문제) console.error(`  ${말}`);
  console.error('');
  console.error(`  usage: ${쓰는법}`);
  console.error('');
  process.exit(2);
}
