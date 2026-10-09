// Radio: endless music in the browser (#22, docs/ENDLESS.md "Radio").
// The radio asks the director for one song at a time and plays them on one timeline of absolute bars:
// the player plays a "window" song (the song on air and the next one, see windowSong), and the radio
// moves the window when a song ends. The player (main.js) owns the editor and the scheduler; the radio
// only builds playables and tells it when to start, swap or stop.
import { createSession, OPTION_DEFAULTS } from '../endless/director.js';
import { TRANSITION_KINDS, HARMONY_MODES } from '../endless/artist.js';
import { overlapOf, extraOf } from '../endless/transitions.js';
import { steerSong, applyBar, whyNot, COMMANDS, ARRANGE_TYPES, songCurves, densityMax } from '../endless/steering.js';
import { stateAt } from '../song/build.js';
import { windowSong } from '../endless/join.js';
import { validateRecipe } from '../endless/recipe.js';
import { buildSteps, sayText } from '../song/build.js';
import { QUIRKS } from '../endless/quirks.js';

const HISTORY = 50;
const barsOf = song => song.sections.reduce((a, s) => a + s.bars, 0);
const fmt = n => (Math.round(n * 100) / 100).toString();
const listOf = v => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const idle = fn => (globalThis.requestIdleCallback ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 50));

// Valid recipes only: an invalid one is left out with a warning.
export function usableRecipes(list) {
  return list.filter(r => {
    const { errors } = validateRecipe(r);
    if (errors.length) console.warn(`style ${r && r.id}: ${errors.map(e => `${e.path} ${e.msg}`).join('; ')}`);
    return !errors.length;
  }).sort((a, b) => a.id.localeCompare(b.id));
}

export function createRadio({ root, t, tx, esc, store, recipes, player, toast, getLang, artists = () => [], face = () => '' }) {
  const ids = recipes.map(r => r.id);
  const saved = store.get('coding-misk-radio', null) || {};
  const opts = {
    styles: (saved.styles || []).filter(id => ids.includes(id)),
    chaos: saved.chaos ?? OPTION_DEFAULTS.chaos, energy: saved.energy ?? OPTION_DEFAULTS.energy, complexity: saved.complexity ?? OPTION_DEFAULTS.complexity,
    talk: saved.talk ?? OPTION_DEFAULTS.talk,
    // the artist picked (its id), or null when the controls are set by hand ("custom")
    artist: saved.artist ?? null,
    // transitions (#23): the artist's choice or always one kind; harmony: the artist's, compatible or free
    transition: ['artist', ...TRANSITION_KINDS].includes(saved.transition) ? saved.transition : 'artist',
    harmony: ['artist', ...HARMONY_MODES].includes(saved.harmony) ? saved.harmony : 'artist',
    // steering (#24): commands for this song only, or for the whole session (they also move the sliders)
    scope: saved.scope === 'session' ? 'session' : 'song',
  };
  if (!opts.styles.length) opts.styles = [ids.includes('synthwave') ? 'synthwave' : ids[0]];
  let history = store.get('coding-misk-radio-history', []);
  if (!Array.isArray(history)) history = [];
  let seedField = '';
  // the session on air: stream of songs with their start bar; onAir = index in the stream
  let S = null;
  const saveOpts = () => store.set('coding-misk-radio', opts);
  const artistOf = id => (id ? artists().find(a => a.id === id) || null : null);
  // with an artist, its whole taste goes to the director (and into the session recipe); the controls only show its centre
  const current = () => { const a = artistOf(opts.artist), how = { transition: opts.transition, harmony: opts.harmony }; return a ? { artist: JSON.parse(JSON.stringify(a)), ...how } : { styles: opts.styles.slice(), chaos: opts.chaos, energy: opts.energy, complexity: opts.complexity, talk: opts.talk, ...how }; };
  const mid = r => Math.round((r[0] + r[1]) / 2 * 20) / 20;
  function pickArtist(id) {
    const a = artistOf(id);
    if (!a) { opts.artist = null; saveOpts(); render(); return; }
    opts.artist = a.id;
    opts.styles = Object.keys(a.styles).filter(s => a.styles[s] > 0 && recipes.some(r => r.id === s));
    for (const k of ['chaos', 'energy', 'complexity', 'talk']) if (a[k]) opts[k] = mid(a[k]);
    saveOpts(); render();
  }
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  // ---------- stream ----------
  // options for song n: from the recipe when replaying, else the controls (recorded when they change)
  function optionsFor(n) {
    if (S.replay) { let o = S.recipe.options; for (const c of S.recipe.changes) if (c.song <= n) o = c.options; return o; }
    const o = current(), last = S.lastOptions;
    if (n > 0 && !same(o, last)) S.recipe.changes.push({ song: n, options: o });
    S.lastOptions = o;
    return o;
  }
  function generate() {
    const n = S.stream.length, prev = S.stream[n - 1];
    const { song, entry, plan, opts: used } = S.session.next(optionsFor(n));
    // the director has just planned the transition from the song before: an interlude lengthens it,
    // an overlap starts this song before it ends
    if (prev && !prev.cut) prev.bars += extraOf(prev.entry.transition);
    const item = { song, entry, n, start: prev ? prev.start + prev.bars - (prev.cut ? 0 : overlapOf(prev.entry.transition)) : 0, bars: barsOf(song), base: { song, plan, opts: used }, plan, commands: [] };
    S.stream.push(item);
    // a replayed session steers its songs the same way, before they play
    const recorded = (S.recipe.steering || []).filter(c => c.song === n);
    if (S.replay && recorded.length) { item.commands = recorded.map(({ song: _, ...c }) => c); resteer(item); }
    return item;
  }
  function windowPlayable() {
    const items = S.stream.slice(S.onAir, S.onAir + 2);
    return player.makePlayable(windowSong(items.map(x => ({ song: x.song, n: x.n + 1, start: x.start, transition: x.entry.transition, cut: x.cut }))));
  }
  function start({ seed, recipe } = {}) {
    stopQuiet();
    const s = recipe ? recipe.seed : (seed || seedField || undefined);
    const session = createSession(recipes, s);
    S = { session, stream: [], onAir: 0, pending: false, replay: !!recipe, recipe: recipe ? clone(recipe) : { seed: session.seed, options: current(), changes: [] }, lastOptions: null, lastCard: 0 };
    S.recipe.seed = session.seed;
    generate();
    remember(S.stream[0]);
    player.start(windowPlayable(), 0);
    render();
  }
  function stopQuiet() { if (S) { S = null; } }
  function stop() { if (!S) return; if (recS) stopRec(); S = null; player.stop(); render(); }
  // pause keeps the session, the window and the bar; resume plays on from that bar
  function pause() { if (!S || S.paused !== undefined) return; S.paused = player.halt(); if (recS) { recS.cap.pause(); recS.pauseStart = performance.now(); } render(); }
  function resume() {
    if (!S || S.paused === undefined) return;
    const bar = S.paused; delete S.paused;
    if (recS) { recS.cap.resume(); if (recS.pauseStart) recS.paused += performance.now() - recS.pauseStart; recS.pauseStart = null; }
    player.resumeAt(windowPlayable(), bar);
    render();
  }
  // the next song is generated once the song on air has played 40 % of its length: control changes made
  // before then still reach it, and it is ready long before it is needed
  function prepareNext(cyc) {
    const cur = S.stream[S.onAir];
    if (S.stream.length > S.onAir + 1 || S.pending || cyc < cur.start + cur.bars * 0.4) return;
    S.pending = true;
    const mine = S;
    idle(() => { if (S !== mine) return; generate(); S.pending = false; player.swap(windowPlayable()); render(); });
  }
  // called by the player every frame while the radio plays
  function tick(cyc) {
    if (!S || S.paused !== undefined) return;
    prepareNext(cyc);
    const cur = S.stream[S.onAir];
    if (cyc >= cur.start + cur.bars) {
      if (S.stream.length <= S.onAir + 1) generate();
      S.onAir++;
      remember(S.stream[S.onAir]);
      player.swap(windowPlayable());
      render();
    } else if (performance.now() - S.lastCard > 250) { S.lastCard = performance.now(); renderNow(cyc); }
  }
  // skip: the song on air ends with this bar, the next one starts on the next bar
  function skip() {
    if (!S || S.paused !== undefined) return;
    const cyc = player.now(), cur = S.stream[S.onAir], cut = Math.floor(cyc) + 1;
    if (S.stream.length <= S.onAir + 1) generate();
    cur.bars = Math.max(1, cut - cur.start); cur.cut = true;
    relayout();
    S.onAir++;
    remember(S.stream[S.onAir]);
    player.jump(windowPlayable(), S.stream[S.onAir].start);
    render();
  }
  // ---------- recording (#30) ----------
  // the session as audio, from now until stopped (pauses leave no gap), with the recipe and a track list
  let recS = null;
  const recElapsed = () => !recS ? 0 : (performance.now() - recS.t0 - recS.paused - (recS.pauseStart ? performance.now() - recS.pauseStart : 0)) / 1000;
  const clockOf = sec => { const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s2 = Math.floor(sec % 60); return `${h ? `${h}:${String(m).padStart(2, '0')}` : String(m).padStart(2, '0')}:${String(s2).padStart(2, '0')}`; };
  const listEntry = item => ({ t: recElapsed(), title: item.song.title, artist: item.entry.artist ? item.entry.artist.name : '' });
  function startRec() {
    if (recS) return;
    if (!S) start();
    recS = { cap: player.capture(), t0: performance.now(), paused: 0, pauseStart: S.paused !== undefined ? performance.now() : null, list: [], seed: S.recipe.seed };
    if (recS.pauseStart) recS.cap.pause();
    recS.list.push(listEntry(S.stream[S.onAir]));
    render();
  }
  function recordFromStart() {
    const recipe = S ? clone(S.recipe) : history[0] && history[0].recipe && clone(history[0].recipe);
    if (!recipe) return;
    if (recS) stopRec();
    start({ recipe });
    startRec();
  }
  async function stopRec() {
    if (!recS) return;
    const r = recS; recS = null; render();
    const recipe = S ? clone(S.recipe) : null, base = `coding-misk-radio-${String(r.seed).replace(/[^\w-]+/g, '-')}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}`;
    const { blob, ext } = await r.cap.stop();
    saveBlob(`${base}.${ext}`, blob);
    const lines = [`coding-misk radio · seed ${r.seed} · ${new Date().toLocaleString()}`, '', ...r.list.map(x => `${clockOf(x.t)} ${x.title}${x.artist ? ` · ${x.artist}` : ''}`)];
    setTimeout(() => saveBlob(`${base}-tracklist.txt`, new Blob([lines.join('\n') + '\n'], { type: 'text/plain' })), 400);
    if (recipe) setTimeout(() => saveBlob(`${base}-recipe.json`, new Blob([JSON.stringify(recipe, null, 2) + '\n'], { type: 'application/json' })), 800);
    toast(t('recSaved'));
  }
  function saveBlob(name, blob) {
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  // ---------- steering (#24) ----------
  // the song of an item rebuilt from its original plus every command still standing
  function resteer(item) {
    const r = steerSong({ ...item.base, commands: item.commands, seed: S.recipe.seed, n: item.n });
    const extra = item.cut ? 0 : extraOf(item.entry.transition);
    item.song = r.song; item.plan = r.plan; item.opts = r.opts; item.curves = null;
    const bars = barsOf(r.song) + extra;
    if (bars !== item.bars && !item.cut) { item.bars = bars; const i = S.stream.indexOf(item); if (i >= 0) relayoutFrom(i); }
  }
  function relayoutFrom(i) {
    for (let k = i + 1; k < S.stream.length; k++) { const p = S.stream[k - 1]; S.stream[k].start = p.start + p.bars - (p.cut ? 0 : overlapOf(p.entry.transition)); }
  }
  const relNow = () => { const it = S.stream[S.onAir]; return Math.max(0, player.now() - it.start); };
  let cmdN = 0;
  // queues a command on the song on air: rewrites it from the command's bar and swaps the window
  function command(c) {
    if (!S || S.paused !== undefined) return false;
    const item = S.stream[S.onAir], rel = relNow();
    const at = applyBar(c.kind, rel, item.plan);
    if (at <= rel || at >= barsOf(item.song)) { toast(t('steerLate')); return false; }
    const cmd = { ...c, at, id: ++cmdN };
    // a later command of the same kind on the same track (or curve part) replaces a pending one
    const same = x => x.at > rel && x.kind === cmd.kind && (x.track || '') === (cmd.track || '') && (x.curve || '') === (cmd.curve || '') && (x.d ?? -1) === (cmd.d ?? -1) && ['volume', 'curve', 'curve-reset', 'instrument'].includes(x.kind);
    item.commands = item.commands.filter(x => !same(x));
    item.commands.push(cmd);
    S.recipe.steering = [...(S.recipe.steering || []).filter(x => !(x.song === item.n && same(x))), { song: item.n, ...cmd }];
    resteer(item);
    keepHistory(item);
    // the whole session: energy, complexity and voice also move the sliders for the next songs
    if (opts.scope === 'session' && !opts.artist) {
      const nudge = { 'energy-up': ['energy', 0.1], 'energy-down': ['energy', -0.1], 'more-complex': ['complexity', 0.1], 'less-complex': ['complexity', -0.1], 'talk-more': ['talk', 0.1], 'talk-less': ['talk', -0.1] }[cmd.kind];
      if (nudge) { opts[nudge[0]] = Math.round(Math.max(0, Math.min(1, opts[nudge[0]] + nudge[1])) * 100) / 100; saveOpts(); syncSliders(); }
    }
    player.swap(windowPlayable());
    renderNow();
    return true;
  }
  function cancel(id) {
    const item = S && S.stream[S.onAir];
    if (!item) return;
    const c = item.commands.find(x => x.id === id);
    if (!c || c.at <= relNow()) return;
    item.commands = item.commands.filter(x => x.id !== id);
    S.recipe.steering = (S.recipe.steering || []).filter(x => !(x.song === item.n && x.id === id));
    resteer(item);
    keepHistory(item);
    player.swap(windowPlayable());
    renderNow();
  }
  // the history keeps the song as steered, so saving it from there keeps the listener's changes
  function keepHistory(item) {
    const h = history.find(x => x.n === item.n && x.seed === S.recipe.seed);
    if (h) { h.song = item.song; h.recipe = clone(S.recipe); try { store.set('coding-misk-radio-history', history); } catch (e) {} }
  }
  function syncSliders() {
    for (const k of ['energy', 'complexity', 'talk']) { const el = root.querySelector(`#radio-${k}`); if (el) { el.value = opts[k]; el.closest('.ctrl').querySelector('output').textContent = fmt(opts[k]); } }
  }

  // starts of the songs after the one on air, once it was cut short (a skip always cuts, no transition)
  function relayout() {
    for (let i = S.onAir + 1; i < S.stream.length; i++) { const p = S.stream[i - 1]; S.stream[i].start = p.start + p.bars - (p.cut ? 0 : overlapOf(p.entry.transition)); }
  }
  // after live coding by hand: when the song on air ended meanwhile, the next one starts on "bar"
  // (returns true); otherwise the song on air goes on and the player types its code back (false)
  function afterHand(bar) {
    if (!S) return false;
    const cur = S.stream[S.onAir];
    if (bar < cur.start + cur.bars) return false;
    if (S.stream.length <= S.onAir + 1) generate();
    cur.bars = bar - cur.start; cur.cut = true;
    relayout();
    S.onAir++;
    remember(S.stream[S.onAir]);
    player.jump(windowPlayable(), S.stream[S.onAir].start);
    render();
    return true;
  }
  // the bar's timeline: a bar inside the song on air
  function seek(rel) {
    if (!S) return;
    const it = S.stream[S.onAir], bar = it.start + Math.max(0, Math.min(it.bars - .25, rel));
    if (S.paused !== undefined) { S.paused = bar; return; }
    player.start(windowPlayable(), bar);
  }
  // previous in the player bar: the song on air from its first bar
  function restart() {
    if (!S) return;
    delete S.paused;
    player.start(windowPlayable(), S.stream[S.onAir].start);
    render();
  }
  function remember(item) {
    if (recS && recS.list.length && recS.list[recS.list.length - 1].title !== item.song.title) recS.list.push(listEntry(item));
    history.unshift({ title: item.song.title, styles: item.entry.styles, seed: S.recipe.seed, recipe: clone(S.recipe), n: item.n, at: new Date().toISOString(), song: item.song, entry: item.entry });
    history = history.slice(0, HISTORY);
    try { store.set('coding-misk-radio-history', history); } catch (e) { history = history.slice(0, 20); try { store.set('coding-misk-radio-history', history); } catch (e2) {} }
  }
  const clone = o => JSON.parse(JSON.stringify(o));

  // ---------- view ----------
  const stepText = s => {
    const parts = [];
    for (const k of ['add', 'remove']) if (s[k] !== undefined) parts.push(`${k === 'add' ? '+' : '−'} ${listOf(s[k]).join(', ')}`);
    if (s.set) { const { track, ...v } = s.set; parts.push(`${track}: ${Object.entries(v).map(([k, x]) => `${k} ${x}`).join(', ')}`); }
    if (s.pattern) parts.push(`${s.pattern.track} → ${s.pattern.to}`);
    if (s.rack) parts.push(`${s.rack.track} + ${s.rack.device}`);
    if (s.unrack) parts.push(`${s.unrack.track} − ${s.unrack.device}`);
    return parts.join(' · ');
  };
  // ---------- curves of the song on air (#24, #40, look #47) ----------
  // energy is the main curve, on top; the four detail lanes fold under a summary line. Every curve: one small
  // square per double phrase (filled when the listener set it), a solid line, a glow on set parts, the parts
  // already played shaded. Handles only on the parts still to come.
  const LANES = ['density', 'brightness', 'tension', 'voice'];
  const CW = 320, CPAD = 8;
  let detailsOpen = !!store.get('coding-misk-radio-details', false), hoverD = null;
  const curveData = item => {
    const P = item.plan, max = densityMax(P);
    if (!item.curves) item.curves = songCurves(item.song, P, item.opts || item.base.opts);
    const C = item.curves, val = (d, c) => C[d].set[c] ?? C[d].measured[c];
    const charge = P.plan.map((d, i) => d.role !== 'drop' && (P.plan[i + 1] || {}).role === 'drop' && (C[i].set.tension ?? 0) >= 0.7);
    return { P, C, max, val, charge };
  };
  const shownOf = (c, v, max) => (c === 'density' ? t('curveOf', { n: v, max }) : String(Math.round(v * 100)));
  // one curve as SVG: vals 0..max, set[i] true when the listener set part i
  function drawCurve({ vals, set = [], max = 1, cur, frac, h, energy = false, curve = '', roles = null, charge = [], title = '' }) {
    const n = vals.length, top = 6, bot = energy ? 16 : 6, col = (CW - 2 * CPAD) / n;
    const x = i => CPAD + (i + 0.5) * col, y = v => top + (1 - Math.max(0, Math.min(1, v / max))) * (h - top - bot);
    const f = `cg-${curve || 'energy'}`, px = CPAD + Math.min(1, frac) * (CW - 2 * CPAD);
    let g = `<defs><filter id="${f}" filterUnits="userSpaceOnUse" x="-10" y="-10" width="${CW + 20}" height="${h + 20}"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
    for (const q of [0, 0.5, 1]) g += `<line class="grid${q === 0.5 ? ' mid' : ''}" x1="${CPAD}" x2="${CW - CPAD}" y1="${y(q * max).toFixed(1)}" y2="${y(q * max).toFixed(1)}"/>`;
    for (let i = 0; i <= n; i++) g += `<line class="grid v" x1="${(CPAD + i * col).toFixed(1)}" x2="${(CPAD + i * col).toFixed(1)}" y1="${top}" y2="${h - bot}"/>`;
    // part names where the part changes, skipped when too close to the previous one, kept inside on the right
    if (roles) { let last = -Infinity; roles.forEach((r, i) => { if (i > 0 && roles[i - 1] === r) return; const lx = CPAD + i * col + 2, label = t('role:' + r).toUpperCase(), wide = label.length * 5 + 4; if (lx < last) return; last = lx + wide; const end = lx + wide > CW; g += `<text class="role" x="${(end ? CW - CPAD : lx).toFixed(1)}" y="${h - 4}"${end ? ' text-anchor="end"' : ''}>${esc(label)}</text>`; }); }
    charge.forEach((on, i) => { if (on) g += `<rect class="charge" x="${(CPAD + i * col).toFixed(1)}" y="${top}" width="${col.toFixed(1)}" height="${h - top - bot}"/><text class="charge-name" x="${(CPAD + i * col + 3).toFixed(1)}" y="${top + 9}">${esc(t('curveCharge').toUpperCase())}</text>`; });
    g += `<rect class="past-shade" x="${CPAD}" y="${top}" width="${Math.max(0, px - CPAD).toFixed(1)}" height="${h - top - bot}"/>`;
    g += `<polyline class="line" points="${vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}" fill="none" stroke="currentColor" stroke-width="${energy ? 2.2 : 1.6}"/>`;
    set.forEach((s, i) => { if (s) g += `<polyline class="glow" points="${[i - 1, i, i + 1].filter(j => j >= 0 && j < n).map(j => `${x(j).toFixed(1)},${y(vals[j]).toFixed(1)}`).join(' ')}" fill="none" stroke="currentColor" stroke-width="3" filter="url(#${f})"/>`; });
    const sz = energy ? 7 : 6;
    vals.forEach((v, i) => {
      const cls = `${i > cur ? 'handle' : 'pt past'}${set[i] ? ' set' : ''}`, data = i > cur ? ` data-d="${i}"${curve ? ` data-curve="${curve}"` : ''}` : '';
      const tip = i > cur ? `<title>${esc(curve ? t('curveTip', { curve: t('curve:' + curve) }) : t('steerCurveTip'))}</title>` : '';
      g += `<rect class="${cls}"${data} x="${(x(i) - sz / 2).toFixed(1)}" y="${(y(v) - sz / 2).toFixed(1)}" width="${sz}" height="${sz}" ${set[i] ? `filter="url(#${f})"` : ''}>${tip}</rect>`;
    });
    g += `<line class="pos" x1="${px.toFixed(1)}" x2="${px.toFixed(1)}" y1="0" y2="${h - bot + 2}"/>`;
    if (hoverD !== null && hoverD < n) g += `<line class="hover" x1="${x(hoverD).toFixed(1)}" x2="${x(hoverD).toFixed(1)}" y1="0" y2="${h}"/>`;
    return `<svg class="radio-curve ${energy ? 'steer' : 'lane'}" viewBox="0 0 ${CW} ${h}" data-h="${h}" data-top="${top}" data-bot="${bot}" data-n="${n}" data-sz="${sz}" data-max="${curve === 'density' ? max : ''}" role="img" aria-label="${esc(title)}">${energy ? `<title>${esc(t('curveHelp:energy'))}</title>` : ''}${g}</svg>`;
  }
  function curvePanel(item, rel, sec) {
    const { P, C, max, val, charge } = curveData(item), dbl = 2 * P.phrase, n = P.plan.length;
    const cur = Math.min(n - 1, Math.floor(rel / dbl)), frac = rel / Math.max(1, n * dbl);
    const energy = drawCurve({ vals: P.plan.map(d => d.target), cur, frac, h: 96, energy: true, roles: P.plan.map(d => d.role), charge, title: t('radioShape') });
    const lanes = LANES.map(c => {
      const anySet = C.some((p, i) => i > cur && p.set[c] !== null);
      const svg = drawCurve({ vals: C.map((p, i) => val(i, c)), set: C.map(p => p.set[c] !== null), max: c === 'density' ? Math.max(1, max) : 1, cur, frac, h: 50, curve: c, title: t('curve:' + c) });
      return `<div class="radio-lane" data-lane="${c}" title="${esc(t('curveHelp:' + c))}"><span class="lane-name">${esc(t('curve:' + c))}</span><output>${esc(shownOf(c, val(cur, c), max))}</output>
        <button class="mini" data-curve-reset="${c}" ${anySet ? '' : 'disabled'} title="${esc(t('curveResetTip'))}">↺</button><div class="screen">${svg}</div></div>`;
    }).join('');
    const summary = LANES.map(c => `<span data-lane="${c}">${esc(t('curve:' + c))} <b>${esc(shownOf(c, val(cur, c), max))}</b></span>`).join(' · ');
    return `<div class="curves">
      <div class="radio-lane main" data-lane="energy"><span class="lane-name">${esc(t('curve:energy'))} · ${esc(t('curveMain'))}</span><output>${Math.round(P.plan[cur].target * 100)}</output><span></span><div class="screen">${energy}</div></div>
      <span class="curves-where">${esc(sec)}</span>
      <button class="curves-toggle" id="curves-toggle" aria-expanded="${detailsOpen}" title="${esc(t('curvesDetailsTip'))}"><span class="tw">${detailsOpen ? '▾' : '▸'} ${esc(t('curvesDetails'))}</span> ${detailsOpen ? '' : summary}</button>
      <div class="radio-lanes" ${detailsOpen ? '' : 'hidden'}>${lanes}</div>
    </div>`;
  }
  // the box with every value of one part (hover, or the part being dragged)
  const tipBox = (() => { const el = document.createElement('div'); el.className = 'curve-tip'; el.hidden = true; document.body.appendChild(el); return el; })();
  function showTip(item, d, px, py, over = {}) {
    if (!item || !item.plan || d === null) { tipBox.hidden = true; return; }
    const { P, max, val } = curveData(item);
    if (d < 0 || d >= P.plan.length) { tipBox.hidden = true; return; }
    const v = c => (over.curve === c ? over.value : c === 'energy' ? P.plan[d].target : val(d, c));
    tipBox.innerHTML = `<div class="tip-part">${esc(t('curvePart', { n: d + 1, role: t('role:' + P.plan[d].role) }))}</div>${['energy', ...LANES].map(c => `<div data-lane="${c}"><span>${esc(t('curve:' + c))}</span><b>${esc(c === 'energy' ? String(Math.round(v(c) * 100)) : shownOf(c, v(c), max))}</b></div>`).join('')}`;
    tipBox.hidden = false;
    const w = tipBox.offsetWidth, hh = tipBox.offsetHeight;
    tipBox.style.left = `${px + 14 + w > innerWidth ? px - 14 - w : px + 14}px`;
    tipBox.style.top = `${Math.max(4, Math.min(innerHeight - hh - 4, py - hh / 2))}px`;
  }
  const partAt = (svg, clientX) => { const r = svg.getBoundingClientRect(), n = +svg.dataset.n, vx = (clientX - r.left) / r.width * CW; return Math.max(0, Math.min(n - 1, Math.floor((vx - CPAD) / ((CW - 2 * CPAD) / n)))); };
  const curve = (entry, rel) => {
    const ph = entry.phrases, w = 160, h = 36, n = Math.max(1, ph.length - 1);
    const pts = ph.map((p, i) => `${(i / n * w).toFixed(1)},${(h - 3 - p.target * (h - 6)).toFixed(1)}`).join(' ');
    const x = Math.min(w, Math.max(0, rel / Math.max(1, entry.bars) * w));
    return `<svg class="radio-curve" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(t('radioShape'))}"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2"/><line x1="${x}" x2="${x}" y1="0" y2="${h}" class="pos"/></svg>`;
  };
  const partsText = entry => Object.entries(entry.parts).filter(([k]) => k !== 'dominant').map(([k, v]) => `${t('part_' + k)} ${styleName(v)}`).join(' · ');
  const styleName = id => { const r = recipes.find(x => x.id === id); return r ? tx(r.name) : id; };

  // ---------- console, queue and mixer (#24) ----------
  // keyboard shortcuts: a key per command (type toggles add or remove)
  const KEYS_OF = { 'energy-up': 'ArrowUp', 'energy-down': 'ArrowDown', 'more-complex': '+', 'less-complex': '-', darker: '[', brighter: ']', dirtier: 'x', cleaner: 'c', 'more-space': 's', instrument: 'i', progression: 'h', key: 'k', 'talk-more': 'v', 'talk-less': 'V', drop: 'g', stay: 'r', end: 'e' };
  const TYPE_KEYS = { drums: '1', bass: '2', lead: '3', pad: '4', texture: '5' };
  const keyLabel = k => ({ ArrowUp: '↑', ArrowDown: '↓', V: 'Shift+V' }[k] || k.toUpperCase());
  let steerKey = '', dragging = null;
  const cmdLabel = c => c.kind === 'add' || c.kind === 'remove' ? t(`steer:${c.kind}`, { type: t(`steerType:${c.type}`) }) : c.kind === 'curve' && c.curve ? t('curveCmd', { curve: t('curve:' + c.curve), n: c.d + 1, v: c.curve === 'density' ? c.value : Math.round(c.value * 100) }) : c.kind === 'curve-reset' ? t('curveResetCmd', { curve: t('curve:' + c.curve) }) : c.kind === 'curve' ? t('steerCurveCmd', { n: c.d + 1, v: Math.round(c.value * 100) }) : ['volume', 'mute', 'unmute', 'lock', 'unlock'].includes(c.kind) || (c.kind === 'instrument' && c.track) ? t(`steer:${c.kind}`, { track: c.track, v: Math.round((c.value || 0) * 100) }) : t(`steer:${c.kind}`);
  function renderSteer(force = false) {
    const box = root.querySelector('#radio-steer');
    if (!box || dragging) return;
    if (!S) { if (box.dataset.k !== 'off') { box.dataset.k = 'off'; box.innerHTML = `<div class="lbl">${esc(t('steerTitle'))}</div><p class="muted">${esc(t('steerIdle'))}</p>`; } return; }
    const item = S.stream[S.onAir], rel = relNow(), ph = item.plan.phrase;
    const st = stateAt(item.song, rel).song, on = st.tracks.filter(x => !x.mute && x.type !== 'voice' && x.clips.some(c => c.start <= rel && c.start + c.bars > rel));
    const pending = item.commands.filter(c => c.at > rel);
    const key = [item.n, Math.floor(rel / ph), on.map(x => x.id).join(), pending.map(c => c.id).join(), (item.plan.locked || []).join(), S.paused !== undefined, opts.scope].join('|');
    if (!force && key === steerKey) return;
    steerKey = key;
    const tip = k => `title="${esc(t(k))}"`;
    // a disabled button says why in its tooltip ("this song has no pad")
    const btn = (c, label) => {
      const why = S.paused !== undefined ? 'paused' : whyNot(c, item.song, item.plan, rel), k = c.type ? TYPE_KEYS[c.type] : KEYS_OF[c.kind];
      const tipText = `${t(`steerTip:${c.kind}`)}${k ? ` (${keyLabel(k)})` : ''}${why ? ` · ${t(`steerWhy:${why}`, { type: c.type ? t(`steerType:${c.type}`) : '' })}` : ''}`;
      return `<button class="btn steer-btn" data-cmd="${c.kind}"${c.type ? ` data-type="${c.type}"` : ''} ${why ? 'disabled' : ''} title="${esc(tipText)}">${esc(label || t(`steer:${c.kind}`))}</button>`;
    };
    // the type buttons say what the next phrase can do: "+" when the type will be silent there, "−" when it will play
    const nextBar = Math.min(barsOf(item.song) - 1, applyBar('add', rel, item.plan)), onNext = stateAt(item.song, nextBar).song.tracks.filter(x => !x.mute && x.type !== 'voice' && x.clips.some(c => c.start <= nextBar && c.start + c.bars > nextBar));
    const types = ARRANGE_TYPES.map(type => { const playingType = onNext.some(x => (type === 'lead' ? ['arp', 'hook', 'guitar'].includes(x.type) : x.type === type)); return btn({ kind: playingType ? 'remove' : 'add', type }, t(`steer:${playingType ? 'remove' : 'add'}`, { type: t(`steerType:${type}`) })); }).join('');
    const group = (name, html) => `<div class="steer-group"><span class="lbl">${esc(t(`steerGroup:${name}`))}</span><div class="steer-btns">${html}</div></div>`;
    box.innerHTML = `<div class="steer-head"><div class="lbl">${esc(t('steerTitle'))}</div>
        <span class="hand-from steer-scope" ${tip('steerScopeTip')}><button class="led" id="steer-scope" aria-pressed="${opts.scope === 'session'}" aria-labelledby="steer-scope-lbl"></button><span id="steer-scope-lbl">${esc(t(opts.scope === 'session' ? 'steerScopeSession' : 'steerScopeSong'))}</span></span></div>
      <div class="steer-console">
        ${group('energy', btn({ kind: 'energy-up' }) + btn({ kind: 'energy-down' }))}
        ${group('arrangement', types + btn({ kind: 'more-complex' }) + btn({ kind: 'less-complex' }))}
        ${group('sound', ['darker', 'brighter', 'dirtier', 'cleaner', 'more-space', 'instrument'].map(k => btn({ kind: k })).join(''))}
        ${group('harmony', btn({ kind: 'progression' }) + btn({ kind: 'key' }))}
        ${group('voice', btn({ kind: 'talk-more' }) + btn({ kind: 'talk-less' }))}
        ${group('song', btn({ kind: 'drop' }) + btn({ kind: 'stay' }) + btn({ kind: 'end' }))}
      </div>
      <div class="lbl">${esc(t('steerQueue'))}</div>
      <ul class="steer-queue">${pending.map(c => `<li><span class="at">${esc(t('radioBarShort', { n: c.at + 1 }))}</span> ${esc(cmdLabel(c))} <button class="mini" data-cancel="${c.id}" aria-label="${esc(t('steerCancel'))}" title="${esc(t('steerCancel'))}">✕</button></li>`).join('') || `<li class="muted">${esc(t('steerQueueEmpty'))}</li>`}</ul>
      <div class="lbl">${esc(t('steerMixer'))}</div>
      <div class="steer-mixer">${[...on, ...st.tracks.filter(x => x.mute && (item.plan.locked || []).includes(x.id))].map(x => { const locked = (item.plan.locked || []).includes(x.id), g = (x.settings || {}).gain ?? 0.5; return `<div class="mix-row"><span class="mix-name">${esc(x.name || x.id)}</span>
        <input type="range" min="0" max="1.2" step="0.05" value="${g}" data-mix-vol="${esc(x.id)}" data-no-knob aria-label="${esc(t('steerVolume', { track: x.name || x.id }))}" title="${esc(t('steerVolume', { track: x.name || x.id }))}">
        <button class="mini" data-mix-mute="${esc(x.id)}" aria-pressed="${!!x.mute}" title="${esc(t('steerTip:mute'))}">M</button>
        <button class="mini" data-mix-lock="${esc(x.id)}" aria-pressed="${locked}" title="${esc(t('steerTip:lock'))}">${locked ? '🔒' : '🔓'}</button>
        <button class="mini" data-mix-inst="${esc(x.id)}" title="${esc(t('steerTip:instrument'))}">♪</button></div>`; }).join('') || `<p class="muted">${esc(t('steerMixerEmpty'))}</p>`}</div>`;
  }

  function renderNow(cyc) {
    const box = root.querySelector('#radio-now');
    if (!box || dragging) return;
    const rt = root.querySelector('#radio-rec-time'); if (rt) rt.textContent = clockOf(recElapsed());
    renderSteer();
    if (!S) { box.innerHTML = `<div class="lbl">${esc(t('radioNow'))}</div><p class="muted">${esc(t('radioIdle'))}</p>`; return; }
    const item = S.stream[S.onAir], song = item.song, e = item.entry;
    const rel = Math.max(0, (cyc ?? player.now()) - item.start);
    let acc = 0, sec = song.sections[0];
    for (const s of song.sections) { if (rel >= acc) sec = s; acc += s.bars; }
    const next = buildSteps(song).filter(s => s.at > rel).slice(0, 3);
    const nextSong = S.stream[S.onAir + 1];
    box.innerHTML = `<div class="lbl">${esc(t('radioNow'))} · ${esc(t('radioSongN', { n: item.n + 1 }))}</div>
      ${e.artist ? `<div class="radio-artist">${(() => { const a = artistOf(e.artist.id); return a ? `<img class="portrait tiny" src="${face(a)}" alt="">` : ''; })()}<span>${esc(e.artist.name)}</span>${e.artist.quirks && e.artist.quirks.length ? `<span class="muted small">· ${esc(e.artist.quirks.map(q => tx(QUIRKS[q] || { en: q })).join(', '))}</span>` : ''}</div>` : ''}
      <h3 class="radio-title">${esc(song.title)}</h3>
      <div class="radio-meta">${esc(e.key)} · ${e.bpm} BPM · ${esc(e.meter)} · ${esc(t('shape_' + e.shape))}</div>
      <div class="radio-parts">${esc(partsText(e))}</div>
      ${item.plan ? curvePanel(item, rel, `${sec.name} · ${t('radioBar', { n: Math.floor(rel) + 1, total: item.bars })}`) : `<div class="radio-pos">${curve(e, rel)}<span>${esc(sec.name)} · ${esc(t('radioBar', { n: Math.floor(rel) + 1, total: item.bars }))}</span></div>`}
      <div class="lbl">${esc(t('radioComing'))}</div>
      <ul class="radio-next">${next.map(s => `<li><span class="at">${esc(t('radioBarShort', { n: s.at + 1 }))}</span> ${esc(stepText(s))}${s.say ? ` <em>“${esc(sayText(s.say, getLang()))}”</em>` : ''}</li>`).join('') || `<li class="muted">${esc(t('radioNoChanges'))}</li>`}</ul>
      <div class="radio-after muted">${nextSong ? esc(t('radioAfter', { title: nextSong.song.title })) : esc(t('radioPreparing'))}${nextSong && e.transition && !item.cut ? ` · ${esc(e.transition.kind === 'cut' ? t('radioNextTxCut') : t('radioNextTx', { kind: t(`tx:${e.transition.kind}`), bars: e.transition.bars }))}` : ''}</div>`;
  }

  function render() {
    const on = !!S;
    const paused = on && S.paused !== undefined, tip = k => `title="${esc(t(k))}"`;
    const slider = (k, label, help) => `<div class="ctrl" ${tip(help)}><div class="row"><label class="lbl" for="radio-${k}">${esc(t(label))}</label><output>${fmt(opts[k])}</output></div><input id="radio-${k}" type="range" min="0" max="1" step="0.05" value="${opts[k]}" data-opt="${k}" ${tip(help)}></div>`;
    root.innerHTML = `<p class="intro">${esc(t('introRadio'))}</p>
    <div class="radio-grid">
      <div class="card radio-ctrls">
        <div class="radio-onair">
          <button class="btn primary radio-start" id="radio-start" aria-pressed="${on}" ${tip(on ? 'tipStop' : 'tipStart')}>${on ? '■ ' + esc(t('radioStop')) : '▶ ' + esc(t('radioStart'))}</button>
          <button class="btn" id="radio-pause" ${on ? '' : 'disabled'} ${tip(paused ? 'tipResume' : 'tipPause')}>${paused ? '▶ ' + esc(t('radioResume')) : '❚❚ ' + esc(t('radioPause'))}</button>
          <button class="btn" id="radio-skip" ${on && !paused ? '' : 'disabled'} ${tip('tipSkip')}>⏭ ${esc(t('radioSkip'))}</button>
          <span class="radio-vol" ${tip('volumeAll')}><button class="btn icon" id="radio-mute" aria-label="${esc(t('mute'))}"></button><input type="range" id="radio-volume" min="0" max="100" step="1" value="${player.volume().volume}" aria-label="${esc(t('volumeAll'))}"><output id="radio-volume-out"></output></span>
          <button class="btn rec-btn" id="radio-rec" aria-pressed="${!!recS}" ${tip(recS ? 'tipRecStop' : 'tipRec')}>${recS ? `■ ${esc(t('recStop'))} <span class="rec-time" id="radio-rec-time">${clockOf(recElapsed())}</span>` : `● ${esc(t('recStart'))}`}</button>
          <span class="onair ${on && !paused ? 'on' : ''}" ${tip('tipOnAir')}>${esc(paused ? t('radioPaused') : t('radioOnAir'))}</span>
        </div>
        <div class="ctrl" ${tip('tipArtist')}><span class="lbl">${esc(t('radioArtist'))}</span>
          <div class="chips artist-chips" role="group"><button class="chip" data-artist="" aria-pressed="${!opts.artist}">${esc(t('radioCustom'))}</button>${artists().map(a => `<button class="chip" data-artist="${esc(a.id)}" aria-pressed="${opts.artist === a.id}" title="${esc(tx(a.bio || {}))}"><img class="portrait tiny" src="${face(a)}" alt=""> ${esc(a.name)}</button>`).join('')}</div>
        </div>
        <div class="ctrl" ${tip('tipStyles')}><span class="lbl">${esc(t('radioStyles'))}</span>
          <div class="chips" role="group">${recipes.map(r => `<button class="chip" data-style="${esc(r.id)}" aria-pressed="${opts.styles.includes(r.id)}" title="${esc(r.description || t('tipStyles'))}">${esc(tx(r.name))}</button>`).join('')}</div>
        </div>
        <div class="ctrls four">${slider('chaos', 'radioChaos', 'tipChaos')}${slider('energy', 'radioEnergy', 'tipEnergy')}${slider('complexity', 'radioComplexity', 'tipComplexity')}${slider('talk', 'radioTalk', 'tipTalk')}</div>
        <div class="radio-how">
          <label class="ctrl" ${tip('tipTransition')}><span class="lbl">${esc(t('radioTransition'))}</span><select id="radio-transition" data-no-knob>${['artist', ...TRANSITION_KINDS].map(k => `<option value="${k}"${opts.transition === k ? ' selected' : ''}>${esc(t(k === 'artist' ? 'byArtist' : `tx:${k}`))}</option>`).join('')}</select></label>
          <label class="ctrl" ${tip('tipHarmony')}><span class="lbl">${esc(t('radioHarmony'))}</span><select id="radio-harmony" data-no-knob>${['artist', ...HARMONY_MODES].map(k => `<option value="${k}"${opts.harmony === k ? ' selected' : ''}>${esc(t(k === 'artist' ? 'byArtist' : `harmony:${k}`))}</option>`).join('')}</select></label>
        </div>
        <p class="hint muted">${esc(t('radioNextHint'))}</p>
        <div class="radio-seed">
          <div class="ctrl grow" ${tip('tipSeed')}><label class="lbl" for="radio-seed">${esc(t('radioSeed'))}</label><input id="radio-seed" type="text" maxlength="40" autocomplete="off" placeholder="${esc(t('radioSeedAuto'))}" value="${esc(on ? S.recipe.seed : seedField)}" ${on ? 'readonly' : ''}></div>
          <button class="btn" id="radio-replay" ${on || history.length ? '' : 'disabled'} ${tip('tipReplay')}>↺ ${esc(t('radioReplay'))}</button>
          <button class="btn" id="radio-rec-start" ${on || history.length ? '' : 'disabled'} ${tip('tipRecFromStart')}>● ${esc(t('recFromStart'))}</button>
        </div>
        <div class="actions">
          <button class="btn" id="radio-save" ${on ? '' : 'disabled'} ${tip('tipSave')}>${esc(t('radioSave'))}</button>
          <button class="btn" id="radio-open" ${on ? '' : 'disabled'} ${tip('tipOpen')}>${esc(t('radioOpen'))}</button>
        </div>
      </div>
      <div class="card radio-now" id="radio-now" aria-live="polite"></div>
    </div>
    <div class="card radio-steer" id="radio-steer"></div>
    <div class="card radio-history">
      <div class="lbl">${esc(t('radioHistory'))}</div>
      ${history.length ? `<ol class="radio-hist">${history.map((h, i) => `<li><span class="when">${esc(new Date(h.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}</span> <strong>${esc(h.title)}</strong> <span class="muted">${esc(h.styles.map(styleName).join(' + '))} · ${esc(t('radioSeed'))} ${esc(h.seed)}</span>
        <span class="hist-actions"><button class="btn small" data-hist-save="${i}" ${tip('tipSave')}>${esc(t('radioSave'))}</button><button class="btn small" data-hist-open="${i}" ${tip('tipOpen')}>${esc(t('radioOpen'))}</button></span></li>`).join('')}</ol>` : `<p class="muted">${esc(t('radioNoHistory'))}</p>`}
    </div>`;
    steerKey = '';
    renderNow();
    renderSteer(true);
    player.renderVolume();
  }

  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'radio-start') return S ? stop() : start();
    if (b.id === 'radio-skip') return skip();
    if (b.id === 'radio-rec') return recS ? stopRec() : startRec();
    if (b.id === 'radio-rec-start') return recordFromStart();
    if (b.id === 'radio-mute') return player.toggleMute();
    if (b.id === 'radio-pause') return S && S.paused !== undefined ? resume() : pause();
    if (b.id === 'radio-replay') {
      // replay the session on air from its first song, or the session of the latest song heard
      const recipe = S ? clone(S.recipe) : history[0] && history[0].recipe && clone(history[0].recipe);
      if (recipe) start({ recipe });
      return;
    }
    if (b.id === 'radio-save' && S) return player.saveSong(S.stream[S.onAir].song);
    if (b.id === 'radio-open' && S) { const sg = S.stream[S.onAir].song; stop(); return player.openSong(sg); }
    if (b.dataset.histSave) return player.saveSong(history[+b.dataset.histSave].song);
    if (b.dataset.histOpen) { const sg = history[+b.dataset.histOpen].song; stop(); return player.openSong(sg); }
    if (b.dataset.artist !== undefined) return pickArtist(b.dataset.artist);
    if (b.dataset.cmd) return command({ kind: b.dataset.cmd, ...(b.dataset.type ? { type: b.dataset.type } : {}) });
    if (b.dataset.cancel) return cancel(+b.dataset.cancel);
    if (b.id === 'steer-scope') { opts.scope = opts.scope === 'session' ? 'song' : 'session'; saveOpts(); return renderSteer(true); }
    if (b.dataset.mixMute) return command({ kind: b.getAttribute('aria-pressed') === 'true' ? 'unmute' : 'mute', track: b.dataset.mixMute });
    if (b.dataset.mixLock) { const item = S && S.stream[S.onAir]; return command({ kind: item && (item.plan.locked || []).includes(b.dataset.mixLock) ? 'unlock' : 'lock', track: b.dataset.mixLock }); }
    if (b.dataset.mixInst) return command({ kind: 'instrument', track: b.dataset.mixInst });
    if (b.dataset.curveReset) return command({ kind: 'curve-reset', curve: b.dataset.curveReset });
    if (b.id === 'curves-toggle') { detailsOpen = !detailsOpen; try { store.set('coding-misk-radio-details', detailsOpen); } catch (err) {} return renderNow(); }
    if (b.dataset.style) {
      if (opts.artist) opts.artist = null;
      const id = b.dataset.style, has = opts.styles.includes(id);
      if (has && opts.styles.length === 1) { toast(t('radioOneStyle')); return; }
      opts.styles = has ? opts.styles.filter(x => x !== id) : [...opts.styles, id];
      saveOpts();
      b.setAttribute('aria-pressed', !has);
      root.querySelectorAll('[data-artist]').forEach(c => c.setAttribute('aria-pressed', c.dataset.artist === ''));
    }
  });
  // dragging a handle of a curve: the square follows the pointer, the values box shows the part, the command is
  // queued on release
  const onAir = () => S && S.stream[S.onAir];
  root.addEventListener('pointerdown', e => {
    const hnd = e.target.closest('rect.handle'); if (!hnd || !S) return;
    const svg = hnd.closest('svg');
    dragging = { d: +hnd.dataset.d, curve: hnd.dataset.curve, hnd, svg, value: null };
    hnd.setPointerCapture(e.pointerId); e.preventDefault();
  });
  root.addEventListener('pointermove', e => {
    if (!dragging) {
      // hover (mouse only): a line on the part under the pointer in every curve, and its values
      if (e.pointerType !== 'mouse') return;
      const svg = e.target.closest && e.target.closest('.curves svg.radio-curve');
      const d = svg ? partAt(svg, e.clientX) : null;
      if (d !== hoverD) { hoverD = d; renderNow(); }
      showTip(onAir(), d, e.clientX, e.clientY);
      return;
    }
    const { svg, hnd } = dragging, r = svg.getBoundingClientRect(), h = +svg.dataset.h, top = +svg.dataset.top, bot = +svg.dataset.bot, sz = +svg.dataset.sz;
    const y = (e.clientY - r.top) / r.height * h, v = Math.max(0, Math.min(1, (h - bot - y) / (h - top - bot)));
    // density snaps to a count of tracks (at least one)
    const max = +svg.dataset.max || 0;
    dragging.value = max ? Math.max(1, Math.round(v * max)) : Math.round(v * 20) / 20;
    const nv = max ? dragging.value / max : dragging.value, cy = top + (1 - nv) * (h - top - bot);
    hnd.setAttribute('y', (cy - sz / 2).toFixed(1)); hnd.classList.add('set');
    showTip(onAir(), dragging.d, e.clientX, e.clientY, { curve: dragging.curve || 'energy', value: dragging.value });
    if (dragging.curve) { const o = svg.closest('.radio-lane').querySelector('output'); if (o) o.textContent = max ? t('curveOf', { n: dragging.value, max }) : Math.round(dragging.value * 100); return; }
    const line = svg.querySelector('polyline.line'), pts = line.getAttribute('points').split(' ');
    pts[dragging.d] = `${pts[dragging.d].split(',')[0]},${cy.toFixed(1)}`; line.setAttribute('points', pts.join(' '));
  });
  root.addEventListener('pointerleave', () => { if (hoverD !== null && !dragging) { hoverD = null; tipBox.hidden = true; renderNow(); } });
  const endDrag = () => { if (!dragging) return; const { d, value, curve } = dragging; dragging = null; tipBox.hidden = true; if (value !== null) command({ kind: 'curve', d, value, ...(curve ? { curve } : {}) }); else renderNow(); };
  root.addEventListener('pointerup', endDrag);
  root.addEventListener('pointercancel', endDrag);
  // shortcuts while the Radio tab is open and the radio plays (not while typing in a field)
  document.addEventListener('keydown', e => {
    if (root.hidden || !S || e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input, select, textarea, [contenteditable], strudel-editor, .cm-editor')) return;
    const kind = Object.keys(KEYS_OF).find(k => KEYS_OF[k] === e.key);
    const type = Object.keys(TYPE_KEYS).find(k => TYPE_KEYS[k] === e.key);
    if (!kind && !type) return;
    e.preventDefault();
    if (type) { const b = root.querySelector(`[data-type="${type}"]`); if (b && !b.disabled) b.click(); return; }
    const b = root.querySelector(`[data-cmd="${kind}"]`);
    if (b && !b.disabled) b.click();
  });
  root.addEventListener('change', e => {
    if (e.target.dataset.mixVol) command({ kind: 'volume', track: e.target.dataset.mixVol, value: +e.target.value });
    if (e.target.id === 'radio-transition') { opts.transition = e.target.value; saveOpts(); }
    if (e.target.id === 'radio-harmony') { opts.harmony = e.target.value; saveOpts(); }
  });
  root.addEventListener('input', e => {
    const k = e.target.dataset.opt;
    if (k) { if (opts.artist) { opts.artist = null; root.querySelectorAll('[data-artist]').forEach(c => c.setAttribute('aria-pressed', c.dataset.artist === '')); } opts[k] = +e.target.value; saveOpts(); e.target.closest('.ctrl').querySelector('output').textContent = fmt(opts[k]); }
    if (e.target.id === 'radio-seed') seedField = e.target.value.trim();
    if (e.target.id === 'radio-volume') player.setVolume(+e.target.value);
  });

  // what plays, for the studio visual (#28): song, artist, styles, bar, the last spoken comment
  function info(cyc) {
    if (!S) return null;
    const it = S.stream[S.onAir], e = it.entry, rel = Math.max(0, cyc - it.start);
    const said = buildSteps(it.song).filter(x => x.say && x.at <= rel).pop();
    return { onAir: S.paused === undefined, n: it.n + 1, title: it.song.title, artist: e.artist && e.artist.name, line: `${e.styles.map(styleName).join(' + ')} · ${e.key}`, bar: rel, bars: barsOf(it.song), bpm: e.bpm, say: said ? sayText(said.say, getLang()) : '', sayAt: said ? said.at : 0 };
  }

  return {
    render, tick, stop, start, skip, pause, resume, afterHand, restart, seek, command, cancel, info,
    get steering() { if (!S) return null; const it = S.stream[S.onAir]; return { n: it.n, commands: it.commands.map(c => ({ ...c })), plan: { bars: it.plan.bars, phrase: it.plan.phrase, targets: it.plan.plan.map(d => d.target), curves: it.plan.plan.map(d => d.curves || {}), roles: it.plan.plan.map(d => d.role), locked: it.plan.locked || [] }, song: it.song, recipe: clone(S.recipe) }; },
    get paused() { return !!S && S.paused !== undefined; },
    get recording() { return recS ? { seconds: recElapsed(), list: recS.list.map(x => ({ ...x })) } : null; },
    startRec, stopRec, recordFromStart,
    // the Genres tab (#43): the radio plays these styles, with the sliders as they are
    playStyles(ids) { const ok = ids.filter(id => recipes.some(r => r.id === id)); if (!ok.length) return false; opts.artist = null; opts.styles = ok; saveOpts(); start(); return true; },
    // the player stopped the radio (Compose started, stop pressed)
    stopped() { if (S) { S = null; render(); } },
    get on() { return !!S; },
    get state() { return S && { paused: S.paused, seed: S.recipe.seed, recipe: clone(S.recipe), onAir: S.onAir, stream: S.stream.map(x => ({ n: x.n, start: x.start, bars: x.bars, title: x.song.title, id: x.song.id, transition: x.entry.transition || null })), transition: S.stream[S.onAir].entry.transition || null }; },
    get history() { return history; },
    get options() { return current(); },
    // defaults the settings page shows and changes (#31)
    get settings() { return { transition: opts.transition, harmony: opts.harmony, scope: opts.scope }; },
    setOption(k, v) { if (!['transition', 'harmony', 'scope'].includes(k)) return; opts[k] = v; saveOpts(); if (!root.hidden) render(); },
  };
}
