// Radio: endless music in the browser (#22, docs/ENDLESS.md "Radio").
// The radio asks the director for one song at a time and plays them on one timeline of absolute bars:
// the player plays a "window" song (the song on air and the next one, see windowSong), and the radio
// moves the window when a song ends. The player (main.js) owns the editor and the scheduler; the radio
// only builds playables and tells it when to start, swap or stop.
import { createSession, OPTION_DEFAULTS } from '../endless/director.js';
import { windowSong } from '../endless/join.js';
import { validateRecipe } from '../endless/recipe.js';
import { buildSteps, sayText } from '../song/build.js';

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

export function createRadio({ root, t, tx, esc, store, recipes, player, toast, getLang }) {
  const ids = recipes.map(r => r.id);
  const saved = store.get('coding-misk-radio', null) || {};
  const opts = {
    styles: (saved.styles || []).filter(id => ids.includes(id)),
    chaos: saved.chaos ?? OPTION_DEFAULTS.chaos, energy: saved.energy ?? OPTION_DEFAULTS.energy, complexity: saved.complexity ?? OPTION_DEFAULTS.complexity,
    talk: saved.talk ?? OPTION_DEFAULTS.talk,
  };
  if (!opts.styles.length) opts.styles = [ids.includes('synthwave') ? 'synthwave' : ids[0]];
  let history = store.get('coding-misk-radio-history', []);
  if (!Array.isArray(history)) history = [];
  let seedField = '';
  // the session on air: stream of songs with their start bar; onAir = index in the stream
  let S = null;
  const saveOpts = () => store.set('coding-misk-radio', opts);
  const current = () => ({ styles: opts.styles.slice(), chaos: opts.chaos, energy: opts.energy, complexity: opts.complexity, talk: opts.talk });
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
    const { song, entry } = S.session.next(optionsFor(n));
    const item = { song, entry, n, start: prev ? prev.start + prev.bars : 0, bars: barsOf(song) };
    S.stream.push(item);
    return item;
  }
  function windowPlayable() {
    const items = S.stream.slice(S.onAir, S.onAir + 2);
    return player.makePlayable(windowSong(items.map(x => ({ song: x.song, n: x.n + 1, start: x.start }))));
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
    cur.bars = Math.max(1, cut - cur.start);
    let at = cur.start + cur.bars;
    for (const x of S.stream.slice(S.onAir + 1)) { x.start = at; at += x.bars; }
    S.onAir++;
    remember(S.stream[S.onAir]);
    player.jump(windowPlayable(), S.stream[S.onAir].start);
    render();
  }
  // after live coding by hand: when the song on air ended meanwhile, the next one starts on "bar"
  // (returns true); otherwise the song on air goes on and the player types its code back (false)
  function afterHand(bar) {
    if (!S) return false;
    const cur = S.stream[S.onAir];
    if (bar < cur.start + cur.bars) return false;
    if (S.stream.length <= S.onAir + 1) generate();
    cur.bars = bar - cur.start;
    let at = bar;
    for (const x of S.stream.slice(S.onAir + 1)) { x.start = at; at += x.bars; }
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
  const curve = (entry, rel) => {
    const ph = entry.phrases, w = 160, h = 36, n = Math.max(1, ph.length - 1);
    const pts = ph.map((p, i) => `${(i / n * w).toFixed(1)},${(h - 3 - p.target * (h - 6)).toFixed(1)}`).join(' ');
    const x = Math.min(w, Math.max(0, rel / Math.max(1, entry.bars) * w));
    return `<svg class="radio-curve" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(t('radioShape'))}"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2"/><line x1="${x}" x2="${x}" y1="0" y2="${h}" class="pos"/></svg>`;
  };
  const partsText = entry => Object.entries(entry.parts).filter(([k]) => k !== 'dominant').map(([k, v]) => `${t('part_' + k)} ${styleName(v)}`).join(' · ');
  const styleName = id => { const r = recipes.find(x => x.id === id); return r ? tx(r.name) : id; };

  function renderNow(cyc) {
    const box = root.querySelector('#radio-now');
    if (!box) return;
    if (!S) { box.innerHTML = `<div class="lbl">${esc(t('radioNow'))}</div><p class="muted">${esc(t('radioIdle'))}</p>`; return; }
    const item = S.stream[S.onAir], song = item.song, e = item.entry;
    const rel = Math.max(0, (cyc ?? player.now()) - item.start);
    let acc = 0, sec = song.sections[0];
    for (const s of song.sections) { if (rel >= acc) sec = s; acc += s.bars; }
    const next = buildSteps(song).filter(s => s.at > rel).slice(0, 3);
    const nextSong = S.stream[S.onAir + 1];
    box.innerHTML = `<div class="lbl">${esc(t('radioNow'))} · ${esc(t('radioSongN', { n: item.n + 1 }))}</div>
      <h3 class="radio-title">${esc(song.title)}</h3>
      <div class="radio-meta">${esc(e.key)} · ${e.bpm} BPM · ${esc(e.meter)} · ${esc(t('shape_' + e.shape))}</div>
      <div class="radio-parts">${esc(partsText(e))}</div>
      <div class="radio-pos">${curve(e, rel)}<span>${esc(sec.name)} · ${esc(t('radioBar', { n: Math.floor(rel) + 1, total: item.bars }))}</span></div>
      <div class="lbl">${esc(t('radioComing'))}</div>
      <ul class="radio-next">${next.map(s => `<li><span class="at">${esc(t('radioBarShort', { n: s.at + 1 }))}</span> ${esc(stepText(s))}${s.say ? ` <em>“${esc(sayText(s.say, getLang()))}”</em>` : ''}</li>`).join('') || `<li class="muted">${esc(t('radioNoChanges'))}</li>`}</ul>
      <div class="radio-after muted">${nextSong ? esc(t('radioAfter', { title: nextSong.song.title })) : esc(t('radioPreparing'))}</div>`;
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
        <div class="ctrl" ${tip('tipStyles')}><span class="lbl">${esc(t('radioStyles'))}</span>
          <div class="chips" role="group">${recipes.map(r => `<button class="chip" data-style="${esc(r.id)}" aria-pressed="${opts.styles.includes(r.id)}" title="${esc(r.description || t('tipStyles'))}">${esc(tx(r.name))}</button>`).join('')}</div>
        </div>
        <div class="ctrls four">${slider('chaos', 'radioChaos', 'tipChaos')}${slider('energy', 'radioEnergy', 'tipEnergy')}${slider('complexity', 'radioComplexity', 'tipComplexity')}${slider('talk', 'radioTalk', 'tipTalk')}</div>
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
    <div class="card radio-history">
      <div class="lbl">${esc(t('radioHistory'))}</div>
      ${history.length ? `<ol class="radio-hist">${history.map((h, i) => `<li><span class="when">${esc(new Date(h.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}</span> <strong>${esc(h.title)}</strong> <span class="muted">${esc(h.styles.map(styleName).join(' + '))} · ${esc(t('radioSeed'))} ${esc(h.seed)}</span>
        <span class="hist-actions"><button class="btn small" data-hist-save="${i}" ${tip('tipSave')}>${esc(t('radioSave'))}</button><button class="btn small" data-hist-open="${i}" ${tip('tipOpen')}>${esc(t('radioOpen'))}</button></span></li>`).join('')}</ol>` : `<p class="muted">${esc(t('radioNoHistory'))}</p>`}
    </div>`;
    renderNow();
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
    if (b.dataset.style) {
      const id = b.dataset.style, has = opts.styles.includes(id);
      if (has && opts.styles.length === 1) { toast(t('radioOneStyle')); return; }
      opts.styles = has ? opts.styles.filter(x => x !== id) : [...opts.styles, id];
      saveOpts();
      b.setAttribute('aria-pressed', !has);
    }
  });
  root.addEventListener('input', e => {
    const k = e.target.dataset.opt;
    if (k) { opts[k] = +e.target.value; saveOpts(); e.target.closest('.ctrl').querySelector('output').textContent = fmt(opts[k]); }
    if (e.target.id === 'radio-seed') seedField = e.target.value.trim();
    if (e.target.id === 'radio-volume') player.setVolume(+e.target.value);
  });

  return {
    render, tick, stop, start, skip, pause, resume, afterHand, restart, seek,
    get paused() { return !!S && S.paused !== undefined; },
    // the player stopped the radio (Compose started, stop pressed)
    stopped() { if (S) { S = null; render(); } },
    get on() { return !!S; },
    get state() { return S && { paused: S.paused, seed: S.recipe.seed, recipe: clone(S.recipe), onAir: S.onAir, stream: S.stream.map(x => ({ n: x.n, start: x.start, bars: x.bars, title: x.song.title, id: x.song.id })) }; },
    get history() { return history; },
    get options() { return current(); },
  };
}
