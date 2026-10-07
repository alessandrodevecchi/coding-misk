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
