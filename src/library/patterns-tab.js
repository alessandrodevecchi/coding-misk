// Patterns tab (pattern-library, #72): every built-in pattern and the user's own, by kind, with search and filters;
// a detail with the loop controls (sound, key, progression, mode, tempo, beat), a preview that lights the current
// step, the code of the loop, the styles that use it, and the actions (Add to song, Save, Rename, Delete). "New"
// composes a part of the same kind with the material generator; it stays in a "new" strip until it is saved.
// Pure data and rules live in src/library/patterns.js; the loop plays through the app's player (main.js).
import { KEYS, PROGS, MODES, WAVES, KITS, GUITAR_TYPES } from '../music.js';
import { compose } from '../material/index.js';
import { builtinPatterns, stylesUsing, patternStore, loopSong, previewOf, KINDS, KIND_DEFAULTS, KIND_TYPE, MATERIAL_KIND, RIFF_STYLE, savedFromGenerated, kindOfPreset, haystack } from './patterns.js';
import { PLAY, STOP, COMPOSE, KEEP, PENCIL, ADD_TO, BIN } from '../icons.js';

const PAGE = 20, GROUP = 4;
// loop: { play(song, uid, title), stop(), state() → { uid, cycle } | null }; codeOf(song) → the loop's code as the app
// writes it; addToSong(item, cfg) → a message; onStyle(id) opens a style; recipes() → the styles
export function createPatternsTab({ root, t, tx, esc, store, recipes, loop, codeOf, addToSong, onStyle, toast }) {
  const mine = patternStore(store);
  const st = { kind: 'all', source: 'all', qRaw: '', q: '', sel: null, limit: 0, cfg: null, fresh: [], freshN: 0, nums: {}, energy: 0.5, style: '', codeOpen: false, armed: null };
  const builtins = builtinPatterns();
  let using = null;
  const usingMap = () => (using = using || stylesUsing(recipes()));

  // every pattern as the tab shows it: { uid, kind, type, name, pattern, defaults, context, sound, settings, src }
  const asBuiltin = b => ({ ...b, uid: `b:${b.key}`, name: tx(b.label), src: 'builtin', styles: usingMap()[b.key] || [] });
  const asMine = p => ({ ...p, uid: `u:${p.id}`, src: 'mine', defaults: { ...KIND_DEFAULTS[p.kind] } });
  const all = () => [...builtins.map(asBuiltin), ...mine.list().map(asMine)];
  const find = uid => (uid ? st.fresh.find(x => x.uid === uid) || all().find(x => x.uid === uid) || null : null);
  const kindName = k => t(`plKind_${k}`);
  const srcName = it => t(it.src === 'builtin' ? 'plSrcBuiltin' : it.src === 'mine' ? 'plSrcMine' : 'plSrcNew');
  const matches = it => !st.q || st.q.split(/\s+/).every(w => haystack(it, it.name, kindName(it.kind)).includes(w));
  const visible = () => all().filter(it => (st.kind === 'all' || it.kind === st.kind) && (st.source === 'all' || it.src === st.source) && matches(it));

  // loop settings of a pattern: its own context, its kind's defaults, the values passed by a link
  function cfgOf(it, over = {}) {
    const d = { ...KIND_DEFAULTS[it.kind], ...(it.defaults || {}), ...(it.context || {}) };
    return { sound: over.sound ?? it.sound ?? (it.type === 'guitar' && d.sound === 'sawtooth' ? 'distorted' : d.sound), key: over.key || d.key || 'A', chords: over.chords || d.chords, mode: over.mode || d.mode || 'minor',
      bpm: Math.round(over.bpm || d.bpm || 128), meter: over.meter || d.meter || '4/4', beat: over.beat ?? d.beat ?? false, settings: over.settings || it.settings || null };
  }
  const songOf = (it, cfg) => loopSong(it, { ...cfg, title: it.name });
  const playing = () => { const s = loop.state(); return s && s.uid ? s.uid : null; };
  const play = it => loop.play(songOf(it, st.sel === it.uid && st.cfg ? st.cfg : cfgOf(it)), it.uid, it.name);
  // a change of sound, key, progression, mode, tempo or beat: the loop plays it from the next bar
  const replay = () => { const it = find(st.sel); if (it && playing() === it.uid) play(it); };

  function select(uid, over = null) {
    const it = find(uid); if (!it) return;
    st.sel = uid; st.cfg = cfgOf(it, over || {}); st.armed = null;
  }
  // the sounds a type can take: waves for melodic tracks, guitar types, drum machines
  function soundOptions(type, cur) {
    const list = type === 'drums' ? KITS.map(k => [k, k]) : type === 'guitar' ? Object.entries(GUITAR_TYPES).map(([k, v]) => [k, tx(v[0])]) : WAVES.map(([k, v]) => [k, tx(v)]);
    if (cur && !list.some(([k]) => k === cur)) list.unshift([cur, cur]);
    return list.map(([k, v]) => `<option value="${esc(k)}"${k === cur ? ' selected' : ''}>${esc(v)}</option>`).join('');
  }
  const opt = (list, cur) => list.map(([k, v]) => `<option value="${esc(k)}"${k === cur ? ' selected' : ''}>${esc(v)}</option>`).join('');

  function render() {
    // all kinds and no search: grouped by kind, a few of each; one kind or a search: a list in pages
    const list = visible(), shown = list.slice(0, PAGE + st.limit), more = list.length - shown.length, grouped = st.kind === 'all' && !st.q;
    const counts = Object.fromEntries(KINDS.map(k => [k, all().filter(x => x.kind === k).length]));
    root.innerHTML = `
      <div class="pn-top">
        <input class="sb-search pn-search" type="search" value="${esc(st.qRaw)}" placeholder="${esc(t('plSearch', { n: all().length }))}" aria-label="${esc(t('plSearchAria'))}">
        <div class="chips" role="group" aria-label="${esc(t('plSource'))}">${['all', 'builtin', 'mine'].map(s => `<button class="chip" data-pn-src="${s}" aria-pressed="${st.source === s}">${esc(t(`plSrc_${s}`))}</button>`).join('')}</div>
      </div>
      <div class="chips pn-kinds" role="group" aria-label="${esc(t('plKinds'))}"><button class="chip" data-pn-kind="all" aria-pressed="${st.kind === 'all'}">${esc(t('plAll'))} <small>${all().length}</small></button>${KINDS.map(k => `<button class="chip" data-pn-kind="${k}" aria-pressed="${st.kind === k}">${esc(kindName(k))} <small>${counts[k]}</small></button>`).join('')}</div>
      <div class="pn-body">
        <div class="pn-listcol">
          ${st.fresh.length ? `<div class="pn-fresh"><span class="lbl">${esc(t('plFresh'))}</span><div class="pn-cards">${st.fresh.map(card).join('')}</div></div>` : ''}
          ${!list.length ? `<p class="note">${esc(t('plNone'))}</p>` : grouped ? KINDS.map(k => group(k, list.filter(x => x.kind === k))).join('') : `<div class="pn-cards">${shown.map(card).join('')}</div>`}
          ${!grouped && more > 0 ? `<button class="btn small sb-more" data-pn-more>${esc(t('sbMore', { n: more }))}</button>` : ''}
        </div>
        ${detail()}
      </div>`;
    draw();
  }
  const group = (k, items) => (items.length ? `<section class="pn-group"><div class="pn-ghead"><h4>${esc(kindName(k))}</h4>${items.length > GROUP ? `<button class="btn small" data-pn-kind="${k}">${esc(t('plShowAll', { n: items.length }))}</button>` : ''}</div><div class="pn-cards">${items.slice(0, GROUP).map(card).join('')}</div></section>` : '');
  function card(it) {
    const on = playing() === it.uid;
    return `<div class="pn-card${st.sel === it.uid ? ' on' : ''}" data-pn-card="${esc(it.uid)}">
      <button class="pn-cplay" data-pn-play="${esc(it.uid)}" aria-pressed="${on}" aria-label="${esc(t(on ? 'plStopAria' : 'plPlayAria', { name: it.name }))}">${on ? STOP : PLAY}</button>
      <button class="pn-cbody" data-pn-sel="${esc(it.uid)}" aria-current="${st.sel === it.uid}"><b>${esc(it.name)}</b><small>${esc(kindName(it.kind))} · ${esc(srcName(it))}</small><canvas class="pn-pv" data-pv="${esc(it.uid)}" width="160" height="40" aria-hidden="true"></canvas></button>
    </div>`;
  }
  // the kind "New" composes: the selected pattern's, else the filter's, else melodies
  const genKind = () => { const it = find(st.sel); return it ? it.kind : st.kind !== 'all' ? st.kind : 'melodies'; };
  const numOf = k => st.nums[k] || 1;
  function genRow() {
    const k = genKind();
    return `<div class="pn-gen"><button class="btn small" data-pn-new title="${esc(t('plNewTip'))}">${COMPOSE}<span>${esc(t('plNew', { kind: kindName(k) }))}</span></button>
      <label class="tp-cnum"><span class="lbl">#</span><input type="number" data-pn-num min="1" max="9999" step="1" value="${numOf(k)}" aria-label="${esc(t('composeNum'))}"></label>
      <div class="ctrl tp-cen"><div class="row"><label class="lbl" for="pn-energy">${esc(t('composeEnergy'))}</label><output>${Math.round(st.energy * 100)}%</output></div><input type="range" id="pn-energy" data-pn-energy min="0" max="1" step="0.05" value="${st.energy}"></div>
      <div class="ctrl"><label class="lbl" for="pn-style">${esc(t('plStyle'))}</label><select id="pn-style" data-pn-style>${opt([['', t('plAnyStyle')], ...recipes().map(r => [r.id, tx(r.name || { en: r.id })])], st.style)}</select></div></div>`;
  }
  function detail() {
    const it = find(st.sel);
    if (!it) return `<div class="card pn-detail empty"><p class="note">${esc(t('plPick'))}</p>${genRow()}</div>`;
    const c = st.cfg, on = playing() === it.uid;
    let code = '';
    try { code = codeOf(songOf(it, c)); } catch (e) { code = `// ${e.message}`; }
    const styles = it.src === 'builtin' ? usingMap()[it.key] || [] : (it.styles || []).filter(id => recipes().some(r => r.id === id));
    const styleName = id => { const r = recipes().find(x => x.id === id); return r ? tx(r.name || { en: id }) : id; };
    const del = st.armed && st.armed.uid === it.uid && Date.now() - st.armed.at < 4000;
    return `<div class="card pn-detail">
      <div class="pn-dhead"><div><h3>${esc(it.name)}</h3><span class="lbl">${esc(kindName(it.kind))} · ${esc(srcName(it))}${it.src !== 'builtin' && it.created ? ` · ${esc(it.created)}` : ''}</span></div>
        <button class="btn primary pn-play" data-pn-toggle aria-pressed="${on}">${on ? STOP : PLAY}<span>${esc(t(on ? 'plStop' : 'plPlay'))}</span></button></div>
      <canvas class="pn-pv big" data-pv="${esc(it.uid)}" data-big="1" width="480" height="110" aria-label="${esc(t('plPreviewAria'))}"></canvas>
      <div class="pn-ctrls">
        <div class="ctrl"><label class="lbl" for="pn-sound">${esc(t('plSound'))}</label><select id="pn-sound" data-pn-cfg="sound">${soundOptions(it.type, c.sound)}</select></div>
        ${it.type === 'drums' ? '' : `<div class="ctrl"><label class="lbl" for="pn-key">${esc(t('key'))}</label><select id="pn-key" data-pn-cfg="key">${opt(KEYS.map(k => [k[0], tx(k[2])]), c.key)}</select></div>
        <div class="ctrl"><label class="lbl" for="pn-chords">${esc(t('plChords'))}</label><select id="pn-chords" data-pn-cfg="chords">${opt(Object.entries(PROGS).map(([k, v]) => [k, tx(v[0])]), c.chords)}</select></div>`}
        ${it.type === 'hook' ? `<div class="ctrl"><label class="lbl" for="pn-mode">${esc(t('plMode'))}</label><select id="pn-mode" data-pn-cfg="mode">${opt(MODES.map(([k, v]) => [k, tx(v)]), c.mode)}</select></div>` : ''}
        <div class="ctrl"><div class="row"><label class="lbl" for="pn-bpm">${esc(t('plTempo'))}</label><output>${c.bpm} BPM</output></div><input type="range" id="pn-bpm" data-pn-cfg="bpm" min="60" max="200" step="1" value="${c.bpm}"></div>
        <label class="pn-beat"><input type="checkbox" data-pn-cfg="beat"${c.beat ? ' checked' : ''}> ${esc(t('plBeat'))}</label>
      </div>
      ${it.why && it.why.length ? `<p class="note pn-why">${esc(t('plWhy', { seed: it.seed || '', why: it.why.join(' · ') }))}</p>` : ''}
      <div class="pn-styles"><span class="lbl">${esc(t('plStyles'))}</span> ${styles.length ? styles.map(id => `<button class="chip small" data-pn-open-style="${esc(id)}">${esc(styleName(id))}</button>`).join(' ') : `<span class="muted small">${esc(t(it.src === 'builtin' ? 'plNoStyles' : 'plAnyStyleUse'))}</span>`}</div>
      <div class="pn-actions">
        <button class="btn" data-pn-add>${ADD_TO}<span>${esc(t('plAdd'))}</span></button>
        ${it.src === 'new' ? `<button class="btn primary" data-pn-save>${KEEP}<span>${esc(t('plSave'))}</span></button>` : ''}
        ${it.src === 'mine' ? `<span class="pn-rename"><input type="text" data-pn-name maxlength="60" value="${esc(it.name)}" aria-label="${esc(t('plName'))}"><button class="btn" data-pn-rename>${PENCIL}<span>${esc(t('plRename'))}</span></button></span>
          <button class="btn danger" data-pn-del>${BIN}<span>${esc(t(del ? 'plDelSure' : 'plDel'))}</span></button>` : ''}
      </div>
      <details class="pn-codebox"${st.codeOpen ? ' open' : ''}><summary class="lbl">${esc(t('plCode'))}</summary><pre class="pn-code">${esc(code)}</pre></details>
      ${genRow()}
    </div>`;
  }
  const refreshDetail = () => { const d = root.querySelector('.pn-detail'); if (d) { d.outerHTML = detail(); draw(); } };
  const refreshCards = () => root.querySelectorAll('[data-pn-play]').forEach(b => { const on = playing() === b.dataset.pnPlay; if (b.getAttribute('aria-pressed') !== String(on)) { b.setAttribute('aria-pressed', on); b.innerHTML = on ? STOP : PLAY; } });

  // ---------- preview (design D3): notes against time, or a step grid, in the theme's colours ----------
  const pvCache = new Map();
  function pvOf(it, cfg) {
    const k = `${it.uid}|${cfg.chords}|${cfg.meter}|${cfg.mode}`;
    if (!pvCache.has(k)) { if (pvCache.size > 400) pvCache.clear(); pvCache.set(k, previewOf(it.type, it.pattern, cfg)); }
    return pvCache.get(k);
  }
  const lit = new Map();
  function paint(cv, pv, step = -1) {
    const css = getComputedStyle(root), col = n => css.getPropertyValue(n).trim() || '#888';
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1), w = cv.clientWidth || cv.width, h = cv.clientHeight || cv.height;
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const line = col('--line'), a1 = col('--a1'), a2 = col('--a2'), ink = col('--ink');
    const bars = pv.grid ? 1 : pv.bars, cols = pv.N * bars, cw = w / cols;
    // beats and bars
    for (let k = 0; k <= cols; k += 4) { g.fillStyle = line; g.globalAlpha = k % pv.N === 0 ? 0.9 : 0.4; g.fillRect(Math.min(w - 1, k * cw), 0, 1, h); }
    g.globalAlpha = 1;
    if (step >= 0) { g.fillStyle = a2; g.globalAlpha = 0.22; g.fillRect(step * cw, 0, cw, h); g.globalAlpha = 1; }
    if (pv.grid) {
      const rows = pv.rows.length || 1, rh = h / rows;
      pv.rows.forEach(([, steps], r) => { for (let k = 0; k < pv.N; k++) if (steps[k] === 'x') { g.fillStyle = k === step ? ink : a1; g.fillRect(k * cw + 1, r * rh + 1.5, Math.max(1, cw - 2), Math.max(1, rh - 3)); } });
      return;
    }
    // one row per semitone over at least an octave, centred; a note is at least 2 px high and stays inside the canvas
    const range = pv.hi - pv.lo + 1, span = Math.max(12, range), pad = 3, nh = (h - 2 * pad) / span, nhh = Math.max(2, nh - 1);
    for (const n of pv.notes) {
      const x = n.b * pv.N * cw, ww = Math.max(2, (n.e - n.b) * pv.N * cw - 1), on = step >= 0 && step >= Math.floor(n.b * pv.N + 1e-6) && step < Math.ceil(n.e * pv.N - 1e-6);
      for (const p of n.p) { const y = Math.max(0, Math.min(h - nhh, h - pad - (p - pv.lo + 1 + (span - range) / 2) * nh)); g.fillStyle = on ? ink : a1; g.fillRect(x, y, ww, nhh); }
    }
  }
  function draw() {
    root.querySelectorAll('canvas[data-pv]').forEach(cv => {
      const it = find(cv.dataset.pv); if (!it) return;
      const cfg = st.sel === it.uid && st.cfg ? st.cfg : cfgOf(it);
      paint(cv, pvOf(it, cfg), -1); lit.delete(cv);
    });
  }
  // while a pattern plays, its previews light the current step (read from the player's time)
  (function frame() {
    requestAnimationFrame(frame);
    if (root.hidden || !root.offsetParent) return;
    const s = loop.state();
    refreshCards();
    const tg = root.querySelector('[data-pn-toggle]'), cur = find(st.sel);
    if (tg && cur) { const on = !!s && s.uid === cur.uid; if (tg.getAttribute('aria-pressed') !== String(on)) { tg.setAttribute('aria-pressed', on); tg.innerHTML = `${on ? STOP : PLAY}<span>${esc(t(on ? 'plStop' : 'plPlay'))}</span>`; } }
    root.querySelectorAll('canvas[data-pv]').forEach(cv => {
      const it = find(cv.dataset.pv); if (!it) return;
      const cfg = st.sel === it.uid && st.cfg ? st.cfg : cfgOf(it), pv = pvOf(it, cfg);
      let step = -1;
      if (s && s.uid === it.uid && s.cycle >= 0) { const bars = pv.grid ? 1 : pv.bars; step = Math.floor(((s.cycle % bars) + bars) % bars * pv.N); }
      if (lit.get(cv) !== step) { lit.set(cv, step); paint(cv, pv, step); }
    });
  })();

  // ---------- actions ----------
  function composeNew() {
    const kind = genKind(), n = numOf(kind), c = st.cfg && find(st.sel) && find(st.sel).kind === kind ? st.cfg : cfgOf({ kind, type: KIND_TYPE[kind], defaults: KIND_DEFAULTS[kind] });
    const type = kind === 'riffs' ? 'bass' : KIND_TYPE[kind], R = recipes().find(r => r.id === st.style), part = R && R[type] ? R[type].material || {} : {};
    const style = kind === 'riffs' ? { ...part, rules: [...new Set([...(part.rules || []), ...RIFF_STYLE.rules])] } : part;
    const seed = `pattern:${kind}:${n}`;
    const out = compose(MATERIAL_KIND[kind], { seed, style, harmony: { key: c.key, mode: type === 'hook' ? c.mode : 'minor', chords: c.chords }, meter: c.meter, energy: st.energy, type });
    if (!out || !out.idea) { toast(t('composeNone')); return; }
    st.nums[kind] = n + 1;
    const sound = type === 'guitar' ? 'distorted' : KIND_DEFAULTS[kind].sound;
    const it = { uid: `n:${++st.freshN}`, src: 'new', kind, type, name: t('plGenName', { kind: kindName(kind), n }), pattern: { ...(type === 'arp' ? { speed: '16' } : {}), idea: out.idea },
      sound, settings: null, defaults: { ...KIND_DEFAULTS[kind] }, context: { key: c.key, chords: c.chords, meter: c.meter, bpm: c.bpm, mode: c.mode }, seed, why: out.why || [], styles: st.style ? [st.style] : [], energy: st.energy };
    st.fresh.unshift(it);
    select(it.uid, { ...c, sound: c.sound && it.type === (find(st.sel) || {}).type ? c.sound : sound });
    render(); play(it);
  }
  function saveFresh(it) {
    const p = it.draft ? { ...it.draft, sound: st.cfg.sound, context: { ...it.draft.context, key: st.cfg.key, chords: st.cfg.chords, bpm: st.cfg.bpm, mode: st.cfg.mode } }
      : savedFromGenerated({ pattern: it.pattern, seed: it.seed, why: it.why }, { name: it.name, kind: it.kind, type: it.type, sound: st.cfg.sound, context: { key: st.cfg.key, chords: st.cfg.chords, meter: st.cfg.meter, bpm: st.cfg.bpm, mode: st.cfg.mode }, styles: it.styles });
    const saved = mine.add(p), wasPlaying = playing() === it.uid;
    st.fresh = st.fresh.filter(x => x !== it);
    const cfg = st.cfg; st.sel = `u:${saved.id}`; st.cfg = cfg;
    render(); toast(t('plSaved', { name: saved.name }));
    if (wasPlaying) play(find(st.sel));
  }

  root.addEventListener('input', e => {
    const el = e.target;
    if (el.matches('.pn-search')) {
      st.qRaw = el.value; st.q = st.qRaw.trim().toLowerCase(); st.limit = 0;
      const pos = el.selectionStart; render();
      const s = root.querySelector('.pn-search'); s.focus(); s.setSelectionRange(pos, pos); return;
    }
    if (el.dataset.pnCfg === 'bpm') { const o = el.closest('.ctrl').querySelector('output'); if (o) o.textContent = `${el.value} BPM`; return; }
    if (el.dataset.pnEnergy !== undefined) { st.energy = +el.value; const o = el.closest('.ctrl').querySelector('output'); if (o) o.textContent = `${Math.round(st.energy * 100)}%`; return; }
    if (el.dataset.pnNum !== undefined) { const v = Math.round(+el.value); if (v >= 1) st.nums[genKind()] = v; }
  });
  root.addEventListener('change', e => {
    const el = e.target, k = el.dataset.pnCfg;
    if (el.dataset.pnStyle !== undefined) { st.style = el.value; return; }
    if (!k || !st.cfg) return;
    st.cfg[k] = k === 'beat' ? el.checked : k === 'bpm' ? Math.round(+el.value) : el.value;
    refreshDetail(); replay();
  });
  root.addEventListener('toggle', e => { if (e.target.matches('.pn-codebox')) st.codeOpen = e.target.open; }, true);
  root.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset.pnName !== undefined) { e.preventDefault(); root.querySelector('[data-pn-rename]').click(); } });
  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset;
    if (d.pnKind) { st.kind = d.pnKind; st.limit = 0; return render(); }
    if (d.pnSrc) { st.source = d.pnSrc; st.limit = 0; return render(); }
    if (d.pnMore !== undefined) { st.limit += PAGE; return render(); }
    if (d.pnSel) { if (st.sel !== d.pnSel) select(d.pnSel); return render(); }
    if (d.pnPlay) {
      const it = find(d.pnPlay); if (!it) return;
      if (playing() === it.uid) return loop.stop();
      if (st.sel !== it.uid) { select(it.uid); render(); }
      return play(it);
    }
    if (d.pnNew !== undefined) return composeNew();
    if (d.pnOpenStyle) return onStyle(d.pnOpenStyle);
    const it = find(st.sel); if (!it) return;
    if (d.pnToggle !== undefined) return playing() === it.uid ? loop.stop() : play(it);
    if (d.pnAdd !== undefined) return toast(addToSong(it, st.cfg));
    if (d.pnSave !== undefined && it.src === 'new') return saveFresh(it);
    if (d.pnRename !== undefined && it.src === 'mine') {
      const v = (root.querySelector('[data-pn-name]') || {}).value || '';
      if (!v.trim()) return toast(t('plNameEmpty'));
      mine.rename(it.id, v); render(); return toast(t('plRenamed', { name: v.trim() }));
    }
    if (d.pnDel !== undefined && it.src === 'mine') {
      // a second press within 4 seconds deletes
      if (!(st.armed && st.armed.uid === it.uid && Date.now() - st.armed.at < 4000)) { st.armed = { uid: it.uid, at: Date.now() }; refreshDetail(); setTimeout(() => { if (st.armed && st.armed.uid === it.uid && Date.now() - st.armed.at >= 4000) { st.armed = null; refreshDetail(); } }, 4100); return; }
      if (playing() === it.uid) loop.stop();
      mine.remove(it.id); st.sel = null; st.cfg = null; st.armed = null; render(); return toast(t('plDeleted', { name: it.name }));
    }
  });

  return {
    render() { using = null; render(); },
    // opens a pattern with the loop values of a link (Compose, Sounds, Styles): { kind, id } of a built-in pattern, saved
    // (the id of a saved one), or item (a pattern of a song not saved yet, shown in the "new" strip); over: { sound, key, chords, mode, bpm, meter, settings }
    open({ kind = null, id = null, item = null, saved = null, over = {} } = {}) {
      let uid = saved ? `u:${saved}` : null;
      if (item) { const x = { ...item, uid: `n:${++st.freshN}`, src: 'new' }; st.fresh.unshift(x); uid = x.uid; }
      else if (kind && id) uid = `b:${kind}/${id}`;
      if (!find(uid)) return false;
      st.kind = find(uid).kind; st.source = 'all'; st.qRaw = st.q = ''; st.limit = 0;
      // the selected pattern may be beyond the first page
      const at = visible().findIndex(x => x.uid === uid);
      if (at >= PAGE) st.limit = Math.ceil((at + 1 - PAGE) / PAGE) * PAGE;
      select(uid, over); render();
      const el = root.querySelector('.pn-detail'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
      return true;
    },
    // the tab closes: new parts that were not saved go (design, open question "Where generated parts appear")
    closed() { const keep = playing(); st.fresh = st.fresh.filter(x => x.uid === keep); if (st.sel && !find(st.sel)) { st.sel = null; st.cfg = null; } },
    kindOfPreset,
    get selected() { return find(st.sel); },
  };
}
