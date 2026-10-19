// Typing animation between two versions of the code, as if someone were editing it live.
// Lines that stay are kept; a changed line is edited in place (the different middle part is deleted, then the new
// one typed); new lines are typed from scratch; removed lines go away at the start.
// frames(from, to) returns f(k) → text at progress k (0 to 1).
function lineDiff(a, b) {
  const n = a.length, m = b.length, L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const ops = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { ops.push({ op: 'keep', text: a[i] }); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) ops.push({ op: 'del', text: a[i++] });
    else ops.push({ op: 'add', text: b[j++] });
  }
  while (i < n) ops.push({ op: 'del', text: a[i++] });
  while (j < m) ops.push({ op: 'add', text: b[j++] });
  return ops;
}

export function typingFrames(from, to) {
  const ops = lineDiff(from.split('\n'), to.split('\n')), parts = [];
  // a run of deleted lines followed by added lines: pair them up as edits in place
  for (let k = 0; k < ops.length;) {
    if (ops[k].op === 'keep') { parts.push({ kind: 'keep', text: ops[k].text }); k++; continue; }
    const dels = [], adds = [];
    while (k < ops.length && ops[k].op === 'del') dels.push(ops[k++].text);
    while (k < ops.length && ops[k].op === 'add') adds.push(ops[k++].text);
    const pairs = Math.min(dels.length, adds.length);
    for (let p = 0; p < pairs; p++) {
      const o = dels[p], nw = adds[p];
      let pre = 0; while (pre < o.length && pre < nw.length && o[pre] === nw[pre]) pre++;
      let suf = 0; while (suf < o.length - pre && suf < nw.length - pre && o[o.length - 1 - suf] === nw[nw.length - 1 - suf]) suf++;
      parts.push({ kind: 'edit', head: nw.slice(0, pre), tail: nw.slice(nw.length - suf), old: o.slice(pre, o.length - suf), mid: nw.slice(pre, nw.length - suf) });
    }
    dels.slice(pairs).forEach(() => parts.push({ kind: 'gone' }));
    adds.slice(pairs).forEach(text => parts.push({ kind: 'new', text }));
  }
  // work to do, in characters: deleting the old middle counts less than typing (a quick backspace)
  const cost = p => p.kind === 'edit' ? p.old.length * .3 + p.mid.length : p.kind === 'new' ? p.text.length + 1 : 0;
  const total = parts.reduce((a, p) => a + cost(p), 0) || 1;
  return k => {
    if (k >= 1) return to;
    let budget = Math.max(0, Math.min(1, k)) * total;
    const out = [];
    for (const p of parts) {
      if (p.kind === 'keep') { out.push(p.text); continue; }
      if (p.kind === 'gone') continue;
      const c = cost(p), done = Math.min(c, budget); budget -= done;
      if (p.kind === 'new') { if (done > 0) out.push(p.text.slice(0, Math.floor(done + 1e-9))); continue; }
      const back = p.old.length * .3;
      if (done < back) out.push(p.head + p.old.slice(0, p.old.length - Math.floor(done / .3)) + p.tail);
      else out.push(p.head + p.mid.slice(0, Math.floor(done - back + 1e-9)) + p.tail);
    }
    return out.join('\n');
  };
}

// The text half-way between two versions where every edit outside the section that plays at `bar` is already made
// (Crescendo, #64): a track has one line per section, and only the line that plays is typed live; the others change
// at once. An edit belongs to the section of the nearest clip comment above it ("// Drop · bars 5-9 · pattern A").
const CLIP = /^\/\/ .* · \D*?((?:\d+-\d+(?:, )?)+) · /;
export function settleOthers(from, to, bar) {
  const ops = lineDiff(from.split('\n'), to.split('\n')), out = [];
  let ctx = null;
  // (compact code: one comment can list several runs of bars, "bars 1-31, 86-93")
  const look = l => { if (l.startsWith('// ==========')) ctx = null; const m = l.match(CLIP); if (m) ctx = [...m[1].matchAll(/(\d+)-(\d+)/g)].map(r => [+r[1] - 1, +r[2]]); };
  for (let k = 0; k < ops.length;) {
    if (ops[k].op === 'keep') { look(ops[k].text); out.push(ops[k].text); k++; continue; }
    const dels = [], adds = [];
    while (k < ops.length && ops[k].op !== 'keep') (ops[k].op === 'del' ? dels : adds).push(ops[k++].text);
    // line by line, so a run of changes across two sections splits where the second one's comment is
    for (let p = 0; p < Math.max(dels.length, adds.length); p++) {
      if (p < adds.length) look(adds[p]); else if (p < dels.length) look(dels[p]);
      const playing = !ctx || ctx.some(([a, z]) => bar >= a && bar < z);
      if (playing) { if (p < dels.length) out.push(dels[p]); } else if (p < adds.length) out.push(adds[p]);
    }
  }
  return out.join('\n');
}

// ---------- typing like a person (live-typing, typing-lines) ----------
// Inside a changed line only the words that change are edited: the cursor goes there, deletes the old word, types the
// new one, then moves on. Small edits go at about 8 characters a second, long ones speed up to about 30; deletes are
// three times faster; a short pause between places. typingPlan(from, to, { speed, max }) → { total, frame(t) }: total
// seconds at that speed (scaled down to max when it does not fit), frame(t) the text t seconds after typing starts.
// Lines (typing-lines): a changed line is edited in place only when it is like the old one (half of the words in
// common, same leading call); otherwise the old line goes and the new one is written on its own. A new line like one
// above it is pasted as a copy of it, at once, and then edited. A chain broken over several lines (continuation lines
// start with spaces and a dot) is one line for the typing, so a break is typed as Enter at its place.
export const TYPING_SPEEDS = { slow: 0.6, normal: 1, fast: 1.6 };
const TOK = /\n[ \t]*|[ \t]+|[A-Za-z_$][\w$]*|-?\d*\.?\d+|./g;
const toks = s => s.match(TOK) || [];
function lcsLen(x, y) {
  const n = x.length, m = y.length;
  if (!n || !m) return 0;
  let prev = new Int32Array(m + 1), cur = new Int32Array(m + 1);
  for (let i = n - 1; i >= 0; i--) { for (let j = m - 1; j >= 0; j--) cur[j] = x[i] === y[j] ? prev[j + 1] + 1 : Math.max(prev[j], cur[j + 1]); [prev, cur] = [cur, prev]; }
  return prev[0];
}
// how alike two lines are: 0 to 1, the words (names, numbers, mini-notation words) they share in order; 0 when they
// are of a different kind (a comment and code, a pattern and a constant)
const words = s => s.match(/[A-Za-z_][\w$]*|\d*\.?\d+|~/g) || [];
// a pattern line ("$:", muted or not), a comment, or the first word
const lead = s => { const t = s.trim(); return t.startsWith('//') ? '//' : /^[_S]?\$:/.test(t) ? '$:' : (t.match(/^[\w$.]+/) || [t])[0]; };
export function lineLike(a, b) {
  if (lead(a) !== lead(b)) return 0;
  const x = words(a), y = words(b);
  return x.length + y.length ? (2 * lcsLen(x, y)) / (x.length + y.length) : a.trim() === b.trim() ? 1 : 0;
}
const LIKE = 0.5;
// physical lines → lines for the typing: a continuation line ("  .gain(0.5)") joins the line above it
export function chainLines(text) {
  const out = [];
  // (a line of functions commented out, "  // .lpf(800)", is part of its chain too)
  for (const l of text.split('\n')) { if (out.length && /^\s+(\.|\/\/ \.)/.test(l) && !/^\s*\/\//.test(out[out.length - 1].split('\n')[0])) out[out.length - 1] += `\n${l}`; else out.push(l); }
  return out;
}
// token diff of two lines → segments [{ eq: text } | { old, new }]; the common start and end stay, so an insertion at
// the start or in the middle of a chain is typed at its place
function tokenDiff(a, b) {
  const X = toks(a), Y = toks(b);
  let p = 0; while (p < X.length && p < Y.length && X[p] === Y[p]) p++;
  let q = 0; while (q < X.length - p && q < Y.length - p && X[X.length - 1 - q] === Y[Y.length - 1 - q]) q++;
  // a pure insertion or deletion slides left while it ends with the token before it: ".lpf(800)\n  " before ".orbit"
  // rather than "lpf(800)\n  ." after its dot
  if (p + q === X.length || p + q === Y.length) { const Z = p + q === X.length ? Y : X; while (p > 0 && Z[p - 1] === Z[Z.length - q - 1]) { p--; q++; } }
  const x = X.slice(p, X.length - q), y = Y.slice(p, Y.length - q), n = x.length, m = y.length;
  const segs = [];
  const eq = t => { if (!t) return; const last = segs[segs.length - 1]; if (last && last.eq !== undefined) last.eq += t; else segs.push({ eq: t }); };
  eq(X.slice(0, p).join(''));
  if (n * m > 250000) segs.push({ old: x.join(''), new: y.join('') });
  else {
    const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = x[i] === y[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    let i = 0, j = 0, o = '', w = '';
    const flush = () => { if (o || w) segs.push({ old: o, new: w }); o = ''; w = ''; };
    while (i < n || j < m) {
      if (i < n && j < m && x[i] === y[j]) { flush(); eq(x[i]); i++; j++; }
      else if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) w += y[j++];
      else o += x[i++];
    }
    flush();
  }
  eq(X.slice(X.length - q).join(''));
  return segs;
}
// a run of removed lines and a run of new lines: pairs of alike lines in order (the most alike overall)
function pairUp(dels, adds) {
  const n = dels.length, m = adds.length, S = Array.from({ length: n + 1 }, () => new Float64Array(m + 1)), like = dels.map(d => adds.map(a => lineLike(d, a)));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) S[i][j] = Math.max(S[i + 1][j], S[i][j + 1], like[i][j] >= LIKE ? S[i + 1][j + 1] + like[i][j] : -1);
  const pair = new Array(m).fill(-1);
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (like[i][j] >= LIKE && S[i][j] === S[i + 1][j + 1] + like[i][j]) { pair[j] = i; i++; j++; }
    else if (S[i][j] === S[i + 1][j]) i++;
    else j++;
  }
  return pair;
}
// ---------- typing like a person, with a person's mistakes (human-typing) ----------
// Every key has its own time; the typing stops to think before a number, a group of notes or a string; now and then a
// key next to the right one is pressed, seen a few keys later and fixed; now and then a number is typed with another
// value first and changed. The text typed is always the edit's text at the end.
const NEAR = { q: 'wa', w: 'qes', e: 'wrd', r: 'etf', t: 'ryg', y: 'tuh', u: 'yij', i: 'uok', o: 'ipl', p: 'ol', a: 'qsz', s: 'adw', d: 'sfe', f: 'dgr', g: 'fht', h: 'gjy', j: 'hku', k: 'jli', l: 'ko', z: 'xa', x: 'zc', c: 'xv', v: 'cb', b: 'vn', n: 'bm', m: 'n',
  1: '2q', 2: '13', 3: '24', 4: '35', 5: '46', 6: '57', 7: '68', 8: '79', 9: '80', 0: '9', '!': '1@', '<': ',>', '>': '.<', '"': "'", '(': '9*', ')': '0(', '[': ']p', ']': '[', '~': '`', '.': ',', ',': '.', ':': ';', '*': '8(' };
function mulberry(seedText) {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i++) h = Math.imul(h ^ seedText.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// the keys of a text: [{ dt, key }] (key: text added, or null for a backspace)
// o: { lean (no pauses or mistakes), mistakes (false: pauses but no mistakes), typo (chance per character),
//      mind (chance per number), words (wrong words of the same kind: { string: [...], fn: [...] }), wordAt (chance) }
// A typo stays on screen: 3 to 6 more keys are typed before it is seen, a pause, then the fix at a person's pace
// (typing-mistakes). A whole wrong word (another word of the same song) is typed, seen and replaced, once at most.
function humanKeys(text, cps, rng, o = {}) {
  const lean = !!o.lean, mistakes = !lean && o.mistakes !== false;
  const keys = [], key = (k, f = 1) => keys.push({ dt: (f * (0.55 + rng() * 0.9)) / cps, key: k }), wait = s => keys.push({ dt: s, key: '' });
  // backspaces at a person's pace, the first one a little slower (the hand moves to the key)
  const back = n => { for (let i = 0; i < n; i++) keys.push({ dt: (0.9 + rng() * 0.6) / cps + (i ? 0 : 0.15), key: null }); };
  let quote = false, wordDone = false;
  for (let i = 0; i < text.length;) {
    // a line break and its indent: one key
    const nl = text.slice(i).match(/^\n[ \t]*/);
    if (nl) { key(nl[0], 1.5); i += nl[0].length; continue; }
    const c = text[i], before = text[i - 1] || '';
    if (c === '"') quote = !quote;
    if (!lean) {
      // thinking: before a number, a group of notes, a string
      // (the start of an edit counts as after a separator: number edits often start on the number itself)
      const num = /[0-9]/.test(c) && (i === 0 || /[\s(,!*<\[~:]/.test(before));
      if (o.think !== false && ((num && rng() < 0.18) || (c === '[' && quote && rng() < 0.35) || (c === '"' && quote && rng() < 0.3))) wait(0.4 + rng() * (quote ? 2.2 : 1.4));
      // a change of mind: another value first, then the right one
      const whole = num ? text.slice(i).match(/^\d+(\.\d+)?/)[0] : '';
      if (mistakes && whole && rng() < (o.mind ?? 0.1)) {
        const d = whole.replace(/\d(?=\D*$)/, x => String((+x + 1 + Math.floor(rng() * 3)) % 10));
        if (d !== whole) { for (const ch of d) key(ch); keys.push({ dt: 0, key: '', mark: 'on' }); wait(0.5 + rng() * 1.2); back(d.length); keys.push({ dt: 0, key: '', mark: 'off' }); wait(0.2 + rng() * 0.4); if (o.stats) o.stats.minds++; }
      }
      // a whole wrong word: at the start of a word in a string or of a function name, another word of the same kind
      if (mistakes && !wordDone && /[A-Za-z]/.test(c) && !/[A-Za-z0-9_]/.test(before)) {
        const word = text.slice(i).match(/^[A-Za-z][A-Za-z0-9_]*/)[0], kind = quote ? 'string' : before === '.' ? 'fn' : null;
        if (kind && word.length >= 3 && rng() < (o.wordAt ?? 1 / 12)) {
          const pool = ((o.words || {})[kind] || []).filter(w => w !== word);
          let wrong = pool.length ? pool[Math.floor(rng() * pool.length)] : null;
          if (!wrong) { const j = 1 + Math.floor(rng() * (word.length - 2)); wrong = word.slice(0, j - 1) + word[j] + word[j - 1] + word.slice(j + 1); }
          if (wrong !== word) { for (const ch of wrong) key(ch); keys.push({ dt: 0, key: '', mark: 'on' }); wait(0.5 + rng() * 0.5); back(wrong.length); keys.push({ dt: 0, key: '', mark: 'off' }); wait(0.15 + rng() * 0.3); wordDone = true; if (o.stats) o.stats.words++; }
        }
      }
      // a typo: a key next to the right one, seen 3 to 6 keys later, a pause, then fixed
      const near = NEAR[c.toLowerCase()];
      // a short edit has the chance of a 20-character one, so small number edits can slip too
      if (mistakes && near && rng() < (o.typo ?? 1 / 55) * Math.max(1, 20 / text.length)) {
        key(near[Math.floor(rng() * near.length)]);
        keys.push({ dt: 0, key: '', mark: 'on' });
        const more = Math.min(3 + Math.floor(rng() * 4), text.length - i - 1), ahead = text.slice(i + 1, i + 1 + more).replace(/\n[\s\S]*/, '');
        for (const ch of ahead) key(ch);
        wait(0.5 + rng() * 0.5); back(ahead.length + 1); keys.push({ dt: 0, key: '', mark: 'off' });
        if (o.stats) o.stats.typos++;
      }
    }
    key(c); i++;
  }
  return keys;
}
// words of the target code a wrong word can be taken from: words inside strings, function names
function wordsOf(code) {
  const string = new Set(), fn = new Set();
  for (const m of code.matchAll(/"([^"\n]*)"/g)) for (const w of m[1].matchAll(/[A-Za-z][A-Za-z0-9_]{2,}/g)) string.add(w[0]);
  for (const m of code.matchAll(/\.([A-Za-z][A-Za-z0-9_]{2,})\(/g)) fn.add(m[1]);
  return { string: [...string], fn: [...fn] };
}
// how careful a stretch of typing is (typing-mistakes): one typo every 25 to 120 characters, more often careful,
// drawn from the song seed and the stretch (about 16 bars), so the same song has the same careful and hurried stretches
export function stretchRate(songSeed, stretch) {
  const r = mulberry(`${songSeed}\u0000stretch\u0000${stretch}`)(), every = 25 + 95 * Math.pow(r, 0.6);
  return { typo: 1 / every, mind: Math.min(0.3, 0.15 * 55 / every) };
}
function humanPlan(parts, acts, to, { speed, max, seed, mistakes = true, rate = null, lean = false }) {
  const rng0 = mulberry(seed), typed = acts.reduce((a, x) => a + (x.del || x.paste ? 0 : x.n), 0), words = wordsOf(to);
  // a person's pace: about 5 characters a second for a few, up to 8 for a long edit
  const cps = (5 + 3 * Math.max(0, Math.min(1, (typed - 40) / 360))) * speed;
  // plans from the fullest to the leanest: full, without whole wrong words, without pauses to think (the mistakes
  // stay), lean (no pauses or mistakes)
  const build = mode => {
    const lean = mode === 'lean', rng = mulberry(`${seed}/${lean ? 'lean' : 'full'}`);
    const stats = { typos: 0, words: 0, minds: 0, mode, wrong: [] };
    const ko = { lean, mistakes, words, wordAt: mode === 'full' ? 1 / 12 : 0, think: mode !== 'quick', stats, ...(rate || {}) };
    let t = 0, prev = null;
    const out = acts.map(a => {
      const gap = prev && (prev.pi !== a.pi || prev.si !== a.si) ? (a.pi === prev.pi ? (prev.paste ? 0.4 : 0.25) : 0.4 + (lean ? 0 : rng() * 0.8)) : 0;
      t += gap; prev = a;
      const p = parts[a.pi], s = a.si >= 0 ? p.segs[a.si] : null;
      const keys = a.paste ? [] : a.del ? Array.from({ length: a.n }, () => ({ dt: (0.6 + rng() * 0.5) / (cps * 2.5), key: null })) : humanKeys(s.new, cps, rng, ko);
      const at = []; let u = t;
      for (const k of keys) { u += k.dt; if (k.mark === 'on') stats.wrong.push([u, Infinity]); else if (k.mark === 'off') stats.wrong[stats.wrong.length - 1][1] = u; else at.push({ t: u, key: k.key }); }
      const r = { ...a, t0: t, keys: at };
      t = u;
      return r;
    });
    return { list: out, total: t, stats };
  };
  // lean: the leanest plan only (no pauses, no mistakes), the shortest time a person needs (growth-shapes: bursts)
  let plan = build(lean ? 'lean' : 'full');
  if (plan.total > max) plan = build('nowords');
  if (plan.total > max) plan = build('quick');
  if (plan.total > max) plan = build('lean');
  const scale = plan.total > max && plan.total > 0 ? max / plan.total : 1;
  if (scale !== 1) plan.list.forEach(a => { a.t0 *= scale; a.keys.forEach(k => { k.t *= scale; }); });
  if (scale !== 1) plan.stats.wrong = plan.stats.wrong.map(([a, b]) => [a * scale, b * scale]);
  const total = plan.total * scale, list = plan.list, natural = plan.total;
  void rng0;
  const pasteAt = new Map(list.filter(a => a.paste).map(a => [a.pi, a.t0]));
  return {
    total,
    // what the plan holds (typing-mistakes checks): typos, whole wrong words, changes of mind, which plan fitted
    stats: plan.stats,
    // the time the plan needs before any speeding up (growth-shapes: typing load)
    natural,
    frame(time) {
      if (time >= total) return to;
      // each changed place: the old text, its backspaces, then the keys typed (typos and their fixes included)
      const buf = new Map();
      for (const a of list) {
        if (a.paste) continue;
        const k = `${a.pi}:${a.si}`, s = parts[a.pi].segs[a.si];
        let b = buf.has(k) ? buf.get(k) : { text: s.old, started: false };
        for (const x of a.keys) { if (x.t > time) break; if (x.key === null) b = { text: b.text.slice(0, -1), started: b.started }; else if (x.key) b = { text: b.text + x.key, started: !a.del || b.started }; }
        if (!a.del && a.keys.length && a.keys[0].t <= time) b.started = true;
        buf.set(k, b);
      }
      const out = [];
      parts.forEach((p, pi) => {
        if (p.kind === 'keep') { out.push(p.text); return; }
        if (p.kind === 'gone') return;
        if (p.paste && time < pasteAt.get(pi)) return;
        let line = '', any = false;
        p.segs.forEach((s, si) => {
          if (s.eq !== undefined) { line += s.eq; return; }
          const b = buf.get(`${pi}:${si}`) || { text: s.old, started: false };
          if (b.started) any = true;
          line += b.text;
        });
        if (p.kind === 'new' && !p.paste && !any && (p.text || !(time >= pasteAt.get(pi)))) return;
        out.push(line);
      });
      return out.join('\n');
    },
  };
}

// the first k characters of a text, with a line break and its indent as one key (Enter indents by itself)
function whole(text, k) {
  let out = text.slice(0, k);
  if (k < text.length && /[ \t]/.test(text[k]) && /\n[ \t]*$/.test(out)) { while (k < text.length && /[ \t]/.test(text[k])) k++; out = text.slice(0, k); }
  return out;
}
// style 'human' (human-typing): uneven keys, thinking pauses, typos and changes of mind, seeded by the two texts
// force: how many new lines may be pasted whole when the typing does not fit in max (0: none, the typing speeds up
// instead; the paste rules of a live build are in src/live/typing-load.js, pasteRule)
export function typingPlan(from, to, { speed = 1, max = Infinity, style = 'exact', seed = '', mistakes = true, stretch = null, lean = false, force = Infinity } = {}) {
  const ops = lineDiff(chainLines(from), chainLines(to)), parts = [];
  for (let k = 0; k < ops.length;) {
    if (ops[k].op === 'keep') { parts.push({ kind: 'keep', text: ops[k].text }); k++; continue; }
    const dels = [], adds = [];
    while (k < ops.length && ops[k].op !== 'keep') (ops[k].op === 'del' ? dels : adds).push(ops[k++].text);
    const pair = pairUp(dels, adds);
    dels.forEach((_, i) => { if (!pair.includes(i)) parts.push({ kind: 'gone' }); });
    adds.forEach((text, j) => parts.push(pair[j] >= 0 ? { kind: 'edit', segs: tokenDiff(dels[pair[j]], text) } : { kind: 'new', text, segs: [{ old: '', new: text }] }));
  }
  // a new line like a line above it (as it is once that one is done): pasted as a copy, then edited
  parts.forEach((p, i) => {
    if (p.kind !== 'new') return;
    let best = null, score = LIKE;
    for (let k = 0; k < i; k++) {
      const q = parts[k], txt = q.kind === 'keep' || q.kind === 'new' ? q.text : q.kind === 'edit' ? q.segs.map(s => (s.eq !== undefined ? s.eq : s.new)).join('') : null;
      if (txt === null || !txt.trim()) continue;
      const v = lineLike(txt, p.text);
      if (v >= score) { best = txt; score = v; }
    }
    if (best !== null) { p.paste = true; p.segs = tokenDiff(best, p.text); }
  });
  // human style: a long new line unlike the others is sometimes pasted whole, as from notes (typing-mistakes);
  // never a comment or the voice's code
  if (style === 'human') {
    const pr = mulberry(`${seed}\u0000${from}\u0000${to}/paste`);
    parts.forEach(p => { if (p.kind === 'new' && !p.paste && p.text.length >= 60 && !/^\s*\/\//.test(p.text) && !/say_|\.voice\(/.test(p.text) && pr() < 1 / 3) { p.paste = true; p.segs = [{ eq: p.text }]; } });
  }
  // actions in reading order: paste, then delete and type for each changed place
  const actions = () => {
    const out = [];
    parts.forEach((p, pi) => {
      if (p.paste) out.push({ pi, si: -1, paste: true, n: 0 });
      // an empty new line: an Enter at its turn
      if (p.kind === 'new' && !p.text) out.push({ pi, si: -1, paste: true, n: 0 });
      (p.segs || []).forEach((s, si) => { if (s.eq !== undefined) return; if (s.old) out.push({ pi, si, del: true, n: s.old.length }); if (s.new) out.push({ pi, si, del: false, n: s.new.length }); });
    });
    return out;
  };
  let acts = actions();
  if (style === 'human') {
    const opts = { speed, max, seed: `${seed}\u0000${from}\u0000${to}`, mistakes, rate: stretch === null ? null : stretchRate(seed, stretch), lean };
    // growth-shapes: a new line that cannot be typed at a person's pace in the time left is pasted whole (after the
    // short paste pause; a line copied from one above and still to edit is pasted finished), the longest first, instead
    // of typing faster; never a comment or the voice's code
    let forced = 0;
    if (Number.isFinite(max) && force > 0) {
      const fits = () => humanPlan(parts, acts, to, { ...opts, lean: true, max: Infinity }).total <= max;
      const cands = parts.map((p, i) => [p, i]).filter(([p]) => p.kind === 'new' && !(p.paste && (p.segs || []).every(x => x.eq !== undefined)) && p.text.trim() && !/^\s*\/\//.test(p.text) && !/say_|\.voice\(/.test(p.text)).sort((a, b) => b[0].text.length - a[0].text.length || a[1] - b[1]);
      for (const [p] of cands) { if (forced >= force || fits()) break; p.paste = true; p.segs = [{ eq: p.text }]; acts = actions(); forced++; }
    }
    // forced: the new lines pasted because the typing did not fit
    return { ...humanPlan(parts, acts, to, opts), forced };
  }
  const typed = acts.reduce((a, x) => a + (x.del || x.paste ? 0 : x.n), 0);
  const cps = (8 + 22 * Math.max(0, Math.min(1, (typed - 40) / 360))) * speed;
  let t = 0, prev = null;
  for (const a of acts) {
    if (prev && (prev.pi !== a.pi || prev.si !== a.si)) t += a.pi === prev.pi ? (prev.paste ? 0.3 : 0.15) : 0.25;
    a.t0 = t; t += a.paste ? 0 : a.n / (a.del ? cps * 3 : cps); a.t1 = t; prev = a;
  }
  const scale = t > max && t > 0 ? max / t : 1;
  acts.forEach(a => { a.t0 *= scale; a.t1 *= scale; });
  const total = t * scale;
  const pasteAt = new Map(acts.filter(a => a.paste).map(a => [a.pi, a.t0]));
  return {
    total,
    frame(time) {
      if (time >= total) return to;
      const state = new Map();
      for (const a of acts) { if (a.paste) continue; const k = `${a.pi}:${a.si}`, s = state.get(k) || { del: 0, typed: 0 }; const f = time <= a.t0 ? 0 : time >= a.t1 ? 1 : (time - a.t0) / (a.t1 - a.t0); if (a.del) s.del = Math.floor(a.n * f + 1e-9); else s.typed = Math.floor(a.n * f + 1e-9); state.set(k, s); }
      const out = [];
      parts.forEach((p, pi) => {
        if (p.kind === 'keep') { out.push(p.text); return; }
        if (p.kind === 'gone') return;
        // a pasted line appears whole when it is pasted
        if (p.paste && time < pasteAt.get(pi)) return;
        let line = '';
        p.segs.forEach((s, si) => {
          if (s.eq !== undefined) { line += s.eq; return; }
          const st = state.get(`${pi}:${si}`) || { del: 0, typed: 0 };
          line += st.typed > 0 || st.del >= s.old.length ? whole(s.new, st.typed) : whole(s.old, s.old.length - st.del);
        });
        // a new line appears once its first character is typed (an empty one at its Enter)
        if (p.kind === 'new' && !p.paste && !line && (p.text || !(time >= pasteAt.get(pi)))) return;
        out.push(line);
      });
      return out.join('\n');
    },
  };
}

// Long lines broken before a function (typing-lines): a code line longer than cols breaks before a ".name(" outside
// strings and brackets, at the last place that fits, and goes on indented by two spaces (a continuation line at its own); comments and lines that
// cannot break stay as they are. Lines already broken by the compiler keep their breaks.
export function breakPoints(line) {
  const out = [];
  let depth = 0, quote = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === '`') quote = c;
    else if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    // a comment: up to the end of its line (a chain goes on below it)
    else if (c === '/' && line[i + 1] === '/') { const nl = line.indexOf('\n', i); if (nl < 0) break; i = nl; }
    else if (c === '.' && depth === 0 && i > 0 && /^\.[A-Za-z_$][\w$]*\(/.test(line.slice(i))) out.push(i);
  }
  return out;
}
export function breakLines(code, cols) {
  if (!cols || cols < 20) return code;
  return code.split('\n').map(line => {
    if (line.length <= cols || /^\s*\/\//.test(line)) return line;
    // a continuation line ("  .gain(…)") goes on at its own indent
    const lead = line.match(/^\s*/)[0], ind = /^\s+\./.test(line) ? lead : `${lead}  `, rows = [];
    let rest = line, first = true;
    while (rest.length > cols) {
      const pts = breakPoints(rest).filter(i => i > (first ? lead.length : ind.length));
      const fit = pts.filter(i => i <= cols), at = fit.length ? fit[fit.length - 1] : pts[0];
      if (at === undefined) break;
      rows.push(rest.slice(0, at).replace(/\s+$/, ''));
      rest = ind + rest.slice(at);
      first = false;
    }
    rows.push(rest);
    return rows.join('\n');
  }).join('\n');
}
