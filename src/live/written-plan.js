// The plan of the written part of a Live coder growth (reused-lines D4, D8): which muted returning lines are edited into
// their return form while still muted, and at which step, and which new lines are typed ahead, muted, at a step with
// time to spare. Measured as the typing load measures a step (src/live/typing-load.js): from half a bar after the step
// before to a fifth of a second before the step, a listening pause of up to 2 s first, the leanest human typing.
// Pure: the app, the video and the checks plan the same lines.
import { buildSteps } from '../song/build.js';
import { typingPlan, settleOthers, chainLines } from '../song/typing.js';
import { barSeconds } from './typing-load.js';

// D8 limits, the Balanced level (owner, lines-ahead-balanced D1, 2026-10-28): lines ahead in the code at once, bars of
// look-ahead (`section: true` would also stop it at the next section change), muted lines shown at which no line is typed
// ahead, the seconds a step keeps to spare beyond the line's typing
export const AHEAD = { atOnce: 2, bars: 32, muted: 8, margin: 2, section: false };
// (browser checks and screenshots may widen them for a page: globalThis.codingMiskAhead, read when a plan is made)

const PATTERN = /^\s*[_S]?\$:/;
const norm = l => l.replace(/^\s*[_S]?\$:\s*/, '').replace(/\s+/g, '');
const GATE_ANY = /\.mask\((\w+)\)\.(?:velocity\(\1\)|postgain\(\1\.mul\((?:-?[\d.]+|"<?[\d.! ]+>?")\)\))/;

// codeWith(bar, keep, { plan, info, wrap }): the code of the moment (live-code.js); G: the first bar of the written
// part; shownLine(text): a compiled line as the code shows it; growth (lines-ahead-balanced D2): the steps of the growth
// host lines ahead too, and their new lines may be typed ahead (false: the written part only, as the shape search
// measures it). → { edits: Map(id → bar), ahead: [{ header, text, from, to }] }
export function planWritten(codeWith, build, G, shownLine = x => x, { growth = true } = {}) {
  const AH = { ...AHEAD, ...(globalThis.codingMiskAhead || {}) };
  const seed = build.id || '', sb = barSeconds(build);
  const steps = [...new Set([0, ...buildSteps(build).map(x => x.at)])].filter(b => b >= 0).sort((a, b) => a - b);
  const starts = new Set();
  { let a = 0; for (const s of build.sections) { starts.add(a); a += s.bars; } }
  // the first bar measured and planned: the first step after bar 0 (the song starts from empty code), or the written part
  const H = growth ? 1 : G;
  // the code of a growth step depends on the plan only through the lines ahead shown at it: kept by those
  const early = new Map(), typings = new Map();
  const typing = (was, code, earlier) => {
    const k = `${was}\u0000${code}\u0000${earlier.join("\u0001")}`;
    if (!typings.has(k)) typings.set(k, typingPlan(was, code, { style: 'human', lean: true, seed, notes: false, earlier }));
    return typings.get(k);
  };
  const pass = plan => {
    const res = new Map(), seen = new Map();
    let prev = null;
    for (const at of steps) {
      let r;
      if (at < G) {
        const act = at >= H ? plan.ahead.filter(a => a.from <= at && at < a.to) : [];
        const k = `${at}\u0000${JSON.stringify(act)}`;
        if (!early.has(k)) { const info = []; early.set(k, { code: at >= H ? codeWith(at, undefined, { plan: act.length ? { edits: new Map(), ahead: act } : null, info, wrap: false }) : codeWith(at, undefined, { wrap: false }), info }); }
        r = { ...early.get(k) };
      } else {
        const info = [];
        r = { code: codeWith(at, undefined, { plan, info, wrap: false }), info };
      }
      if (at >= H && at >= 1) {
        const p = prev === null ? null : res.get(prev);
        const avail = Math.max(0.2, (at - (prev ?? 0) - 0.5) * sb - 0.2), usable = Math.max(0.2, avail - Math.min(avail * 0.5, 2));
        const was = p ? settleOthers(p.code, r.code, at) : r.code;
        const tp = was === r.code ? { natural: 0, lines: [] } : typing(was, r.code, [...seen.keys()]);
        Object.assign(r, { usable, need: tp.natural, spare: usable - tp.natural, typed: (tp.lines || []).filter(x => x.how === 'typed').map(x => x.text) });
      }
      for (const l of chainLines(r.code)) if (PATTERN.test(l)) { seen.delete(l); seen.set(l, true); }
      res.set(at, r);
      prev = at;
    }
    return res;
  };
  const written = steps.filter(b => b >= G && b >= 1), hosts = steps.filter(b => b >= H && b >= 1);
  const plan = { edits: new Map(), ahead: [] };
  if (!hosts.length) return plan;

  // D4: a muted line that returns changed is edited at the step of its silence with the most time to spare, when the
  // spare time covers the edit (the time the edits planned there take is counted); else at its return, as before
  const A = pass(plan), silences = new Map(), spare = new Map(written.map(at => [at, A.get(at).spare]));
  for (const at of written) for (const x of A.get(at).info) if (x.kind === 'return' && x.id && x.was !== x.ret && shownLine(x.was) !== shownLine(x.ret)) { const v = silences.get(x.id) || { x, bars: [] }; v.bars.push(at); silences.set(x.id, v); }
  for (const [id, { x, bars }] of [...silences].sort((p, q) => p[1].x.retBar - q[1].x.retBar)) {
    const need = typingPlan(shownLine(x.was), shownLine(x.ret), { style: 'human', lean: true, seed, notes: false }).natural;
    let best = null;
    for (const at of bars) { const sp = spare.get(at); if (sp >= need && (best === null || sp > spare.get(best))) best = at; }
    if (best === null) continue;
    plan.edits.set(id, best);
    spare.set(best, spare.get(best) - need);
  }

  // D8: new lines of a coming step typed ahead, muted, at a step with time to spare
  const B = plan.edits.size ? pass(plan) : A;
  const nextChange = s => { for (const b of [...starts].sort((x, y) => x - y)) if (b > s) return b; return Infinity; };
  const cost = line => typingPlan('', line, { style: 'human', lean: true, seed, notes: false }).natural;
  const active = s => plan.ahead.filter(a => a.from <= s && s < a.to);
  for (const s of hosts) {
    const S = B.get(s);
    let spare = S.spare;
    if (spare <= AH.margin || active(s).length >= AH.atOnce) continue;
    // (the measure was made before any line ahead: those in the code at this step add to its muted lines)
    const muted = chainLines(S.code).filter(l => /^\s*_\$:/.test(l)).length + active(s).length;
    if (muted >= AH.muted) continue;
    const shownKeys = new Set(S.info.map(x => `${x.header}\u0000${x.key}`)), limit = Math.min(AH.section ? nextChange(s) : Infinity, s + AH.bars);
    const cands = [];
    for (const t of hosts) {
      if (t <= s || t > limit) continue;
      const T = B.get(t), typed = new Set(T.typed.map(norm));
      for (const x of T.info) {
        if (x.kind !== 'play' || shownKeys.has(`${x.header}\u0000${x.key}`)) continue;
        if (active(s).some(a => a.header === x.header) || plan.ahead.some(a => a.header === x.header && a.text === x.text)) continue;
        const shown = shownLine(x.text.replace(GATE_ANY, ''));
        if (!typed.has(norm(shown))) continue;
        cands.push({ t, x, len: shown.length, rush: T.need - T.usable, cost: cost(shown) });
      }
    }
    const pick = cands.filter(c => c.cost + AH.margin <= spare).sort((a, b) => (b.rush > 0) - (a.rush > 0) || (b.rush > 0 ? b.rush - a.rush : 0) || b.len - a.len || a.t - b.t)[0];
    if (!pick) continue;
    plan.ahead.push({ header: pick.x.header, text: pick.x.text, from: s, to: pick.t });
    spare -= pick.cost;
  }
  // a line typed ahead that its step would still type (its place moved, another line took it), or that a step before
  // its target does not show (lines-ahead-balanced D2: its track could not come in for it): left out
  for (let round = 0; round < 3 && plan.ahead.length; round++) {
    const Cp = pass(plan), n = plan.ahead.length;
    plan.ahead = plan.ahead.filter(a => {
      const T = Cp.get(a.to), typed = new Set(T.typed.map(norm));
      if (typed.has(norm(shownLine(a.text.replace(GATE_ANY, ''))))) return false;
      const bare = a.text.replace(GATE_ANY, '');
      return steps.filter(b => b >= a.from && b < a.to).every(b => Cp.get(b).info.some(x => x.kind === 'ahead' && x.header === a.header && x.text.replace(GATE_ANY, '') === bare));
    });
    if (plan.ahead.length === n) break;
  }
  return plan;
}
