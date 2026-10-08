// Radio: endless music in the browser (#22, docs/ENDLESS.md "Radio").
// The radio asks the director for one song at a time and plays them on one timeline of absolute bars:
// the player plays a "window" song (the song on air and the next one, see windowSong), and the radio
// moves the window when a song ends. The player (main.js) owns the editor and the scheduler; the radio
// only builds playables and tells it when to start, swap or stop.
import { createSession, OPTION_DEFAULTS } from '../endless/director.js';
import { TRANSITION_KINDS, HARMONY_MODES } from '../endless/artist.js';
import { overlapOf, extraOf } from '../endless/transitions.js';
import { steerSong, applyBar, canApply, COMMANDS, ARRANGE_TYPES } from '../endless/steering.js';
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
  function stop() { if (!S) return; S = null; player.stop(); render(); }
  // pause keeps the session, the window and the bar; resume plays on from that bar
  function pause() { if (!S || S.paused !== undefined) return; S.paused = player.halt(); render(); }
  function resume() {
    if (!S || S.paused === undefined) return;
    const bar = S.paused; delete S.paused;
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
  // ---------- steering (#24) ----------
  // the song of an item rebuilt from its original plus every command still standing
  function resteer(item) {
    const r = steerSong({ ...item.base, commands: item.commands, seed: S.recipe.seed, n: item.n });
    const extra = item.cut ? 0 : extraOf(item.entry.transition);
    item.song = r.song; item.plan = r.plan;
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
    const same = x => x.at > rel && x.kind === cmd.kind && (x.track || '') === (cmd.track || '') && (x.d ?? -1) === (cmd.d ?? -1) && ['volume', 'curve', 'instrument'].includes(x.kind);
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
  // energy shape as a small line, with the position in the song
  // the energy curve of the song on air, one point per double phrase; the parts still to come have a handle (#24)
  const steerCurve = (item, rel) => {
    const P = item.plan, dbl = 2 * P.phrase, n = P.plan.length, w = 320, h = 72, pad = 8;
    const xOf = d => pad + (d + 0.5) / n * (w - 2 * pad), yOf = v => h - pad - v * (h - 2 * pad);
    const pts = P.plan.map((d, i) => `${xOf(i).toFixed(1)},${yOf(d.target).toFixed(1)}`).join(' ');
    const cur = Math.floor(rel / dbl), x = pad + Math.min(1, rel / Math.max(1, n * dbl)) * (w - 2 * pad);
    const handles = P.plan.map((d, i) => (i > cur ? `<circle class="handle" data-d="${i}" cx="${xOf(i).toFixed(1)}" cy="${yOf(d.target).toFixed(1)}" r="6"><title>${esc(t('steerCurveTip'))}</title></circle>` : `<circle class="past" cx="${xOf(i).toFixed(1)}" cy="${yOf(d.target).toFixed(1)}" r="2.5"/>`)).join('');
    return `<svg class="radio-curve steer" viewBox="0 0 ${w} ${h}" data-w="${w}" data-h="${h}" data-pad="${pad}" role="img" aria-label="${esc(t('radioShape'))}"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2"/><line x1="${x}" x2="${x}" y1="0" y2="${h}" class="pos"/>${handles}</svg>`;
  };
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
  const cmdLabel = c => c.kind === 'add' || c.kind === 'remove' ? t(`steer:${c.kind}`, { type: t(`steerType:${c.type}`) }) : c.kind === 'curve' ? t('steerCurveCmd', { n: c.d + 1, v: Math.round(c.value * 100) }) : ['volume', 'mute', 'unmute', 'lock', 'unlock'].includes(c.kind) || (c.kind === 'instrument' && c.track) ? t(`steer:${c.kind}`, { track: c.track, v: Math.round((c.value || 0) * 100) }) : t(`steer:${c.kind}`);
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
    const btn = (c, label) => { const ok = S.paused === undefined && canApply(c, item.song, item.plan, rel), k = c.type ? TYPE_KEYS[c.type] : KEYS_OF[c.kind]; return `<button class="btn steer-btn" data-cmd="${c.kind}"${c.type ? ` data-type="${c.type}"` : ''} ${ok ? '' : 'disabled'} title="${esc(t(`steerTip:${c.kind}`))}${k ? ` (${esc(keyLabel(k))})` : ''}">${esc(label || t(`steer:${c.kind}`))}</button>`; };
    const types = ARRANGE_TYPES.map(type => { const playingType = on.some(x => (type === 'lead' ? ['arp', 'hook', 'guitar'].includes(x.type) : x.type === type)); return btn({ kind: playingType ? 'remove' : 'add', type }, t(`steer:${playingType ? 'remove' : 'add'}`, { type: t(`steerType:${type}`) })); }).join('');
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
      <div class="radio-pos">${item.plan ? steerCurve(item, rel) : curve(e, rel)}<span>${esc(sec.name)} · ${esc(t('radioBar', { n: Math.floor(rel) + 1, total: item.bars }))}</span></div>
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
  // dragging a handle of the energy curve: the point follows the pointer, the command is queued on release
  root.addEventListener('pointerdown', e => {
    const hnd = e.target.closest('circle.handle'); if (!hnd || !S) return;
    const svg = hnd.closest('svg');
    dragging = { d: +hnd.dataset.d, hnd, svg, value: null };
    hnd.setPointerCapture(e.pointerId); e.preventDefault();
  });
  root.addEventListener('pointermove', e => {
    if (!dragging) return;
    const { svg, hnd } = dragging, r = svg.getBoundingClientRect(), h = +svg.dataset.h, pad = +svg.dataset.pad;
    const y = (e.clientY - r.top) / r.height * h, v = Math.max(0, Math.min(1, (h - pad - y) / (h - 2 * pad)));
    dragging.value = Math.round(v * 20) / 20;
    hnd.setAttribute('cy', (h - pad - dragging.value * (h - 2 * pad)).toFixed(1));
    const line = svg.querySelector('polyline'), pts = line.getAttribute('points').split(' ');
    pts[dragging.d] = `${pts[dragging.d].split(',')[0]},${hnd.getAttribute('cy')}`; line.setAttribute('points', pts.join(' '));
  });
  const endDrag = () => { if (!dragging) return; const { d, value } = dragging; dragging = null; if (value !== null) command({ kind: 'curve', d, value }); else renderNow(); };
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

  return {
    render, tick, stop, start, skip, pause, resume, afterHand, restart, seek, command, cancel,
    get steering() { if (!S) return null; const it = S.stream[S.onAir]; return { n: it.n, commands: it.commands.map(c => ({ ...c })), plan: { bars: it.plan.bars, phrase: it.plan.phrase, targets: it.plan.plan.map(d => d.target), roles: it.plan.plan.map(d => d.role), locked: it.plan.locked || [] }, song: it.song, recipe: clone(S.recipe) }; },
    get paused() { return !!S && S.paused !== undefined; },
    // the player stopped the radio (Compose started, stop pressed)
    stopped() { if (S) { S = null; render(); } },
    get on() { return !!S; },
    get state() { return S && { paused: S.paused, seed: S.recipe.seed, recipe: clone(S.recipe), onAir: S.onAir, stream: S.stream.map(x => ({ n: x.n, start: x.start, bars: x.bars, title: x.song.title, id: x.song.id, transition: x.entry.transition || null })), transition: S.stream[S.onAir].entry.transition || null }; },
    get history() { return history; },
    get options() { return current(); },
  };
}
