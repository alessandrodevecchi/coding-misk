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
const lead = s => { const t = s.trim(); return t.startsWith('//') ? '//' : /^_?\$:/.test(t) ? '$:' : (t.match(/^[\w$.]+/) || [t])[0]; };
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
// the first k characters of a text, with a line break and its indent as one key (Enter indents by itself)
function whole(text, k) {
  let out = text.slice(0, k);
  if (k < text.length && /[ \t]/.test(text[k]) && /\n[ \t]*$/.test(out)) { while (k < text.length && /[ \t]/.test(text[k])) k++; out = text.slice(0, k); }
  return out;
}
export function typingPlan(from, to, { speed = 1, max = Infinity } = {}) {
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
  // actions in reading order: paste, then delete and type for each changed place
  const acts = [];
  parts.forEach((p, pi) => {
    if (p.paste) acts.push({ pi, si: -1, paste: true, n: 0 });
    // an empty new line: an Enter at its turn
    if (p.kind === 'new' && !p.text) acts.push({ pi, si: -1, paste: true, n: 0 });
    (p.segs || []).forEach((s, si) => { if (s.eq !== undefined) return; if (s.old) acts.push({ pi, si, del: true, n: s.old.length }); if (s.new) acts.push({ pi, si, del: false, n: s.new.length }); });
  });
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
