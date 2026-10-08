// Artists tab (#35): profiles as cards and character sheets; the user's artists edited with a form and a JSON view.
// Built-in artists (artists/*.json) are read-only and can be duplicated. The user's artists live in browser storage.
import { validateArtist, withArtistDefaults, ARTIST_FORMAT, PALETTES, MOVE_KINDS, VOICE_CHARACTER_NAMES } from '../endless/artist.js';
import { QUIRKS } from '../endless/quirks.js';
import { SHAPES } from '../endless/recipe.js';
import { portraitUrl } from '../endless/portrait.js';
import { downloadJson, pickJsonFiles, userStore, freeId, errorsByPath } from './library.js';

const RANGES = ['chaos', 'energy', 'complexity', 'talk', 'pace'];

export function createArtistsTab({ root, t, tx, esc, store, builtins, styles, toast, onChange }) {
  const mine = userStore(store, 'coding-misk-artists');
  let open = null, editing = null, jsonView = false;
  const faces = new Map();
  const face = a => { const k = `${a.portrait && a.portrait.seed}|${a.portrait && a.portrait.palette}`; if (!faces.has(k)) faces.set(k, portraitUrl(a.portrait ? a.portrait.seed : a.id, a.portrait ? a.portrait.palette : 'violet')); return faces.get(k); };
  const builtinIds = () => builtins.map(a => a.id);
  const styleIds = () => styles().map(r => r.id);
  const styleName = id => { const r = styles().find(x => x.id === id); return r ? tx(r.name) : id; };
  const all = () => [...builtins.map(a => ({ a, own: false })), ...mine.all.map(a => ({ a, own: true }))];
  const check = a => validateArtist(a, styleIds());
  // artists the radio and Compose may use: built-ins plus the user's valid ones
  const usable = () => [...builtins, ...mine.all.filter(a => !check(a).errors.length && !builtinIds().includes(a.id))];
  const pct = x => `${Math.round(x * 100)}%`;
  const bar = r => `<span class="stat"><span class="stat-fill" style="left:${pct(r[0])};width:${pct(Math.max(0.02, r[1] - r[0]))}"></span></span><span class="muted mono">${r[0]}–${r[1]}</span>`;
  const weightsBars = (w, label = k => k) => { const e = Object.entries(w || {}).filter(([, x]) => x > 0), max = Math.max(1, ...e.map(([, x]) => x)); return e.length ? e.sort((a, b) => b[1] - a[1]).map(([k, x]) => `<div class="wrow"><span>${esc(label(k))}</span><span class="stat"><span class="stat-fill" style="left:0;width:${pct(x / max)}"></span></span><span class="muted mono">${x}</span></div>`).join('') : `<span class="muted">${esc(t('libNone'))}</span>`; };

  function sheet(a0) {
    const a = withArtistDefaults(a0);
    return `<div class="char">
      <div class="char-id"><img class="portrait big" src="${face(a0)}" alt="${esc(a.name)}"><div><h3>${esc(a.name)}</h3><p>${esc(tx(a.bio || {}))}</p>${a.inspiredBy ? `<p class="muted">${esc(t('artInspired', { who: a.inspiredBy }))}</p>` : ''}</div></div>
      <div class="sheet-grid">
        <div class="sheet-block"><h4>${esc(t('artStyles'))}</h4>${weightsBars(a.styles, styleName)}<div class="muted small">${esc(t('artExplore', { p: pct(a.explore) }))}</div></div>
        <div class="sheet-block"><h4>${esc(t('artStats'))}</h4>${RANGES.map(k => `<div class="wrow"><span>${esc(t('art_' + k))}</span>${bar(a[k])}</div>`).join('')}</div>
        <div class="sheet-block"><h4>${esc(t('libShapes'))}</h4>${weightsBars(a.shapes, k => t('shape_' + k))}</div>
        <div class="sheet-block"><h4>${esc(t('artMoves'))}</h4>${weightsBars(a.moves)}</div>
        <div class="sheet-block"><h4>${esc(t('voice'))}</h4>${weightsBars(a.voice.characters)}<div class="muted small">${esc(t('artVoiceChance', { p: pct(a.voice.chance) }))}</div></div>
        <div class="sheet-block"><h4>${esc(t('artQuirks'))}</h4>${Object.entries(a.quirks).length ? Object.entries(a.quirks).map(([q, c]) => `<div class="wrow"><span>${esc(tx(QUIRKS[q] || { en: q }))}</span><span class="muted mono">${pct(c)}</span></div>`).join('') : `<span class="muted">${esc(t('libNone'))}</span>`}</div>
      </div></div>`;
  }

  function form(a, errs) {
    const err = path => Object.keys(errs).filter(p => p === path || p.startsWith(`${path}.`)).map(p => `<div class="field-err">${esc(p)}: ${errs[p].map(esc).join('; ')}</div>`).join('');
    const num = (path, v, step = 0.05) => `<input type="number" step="${step}" min="0" data-num="${esc(path)}" value="${esc(v ?? '')}">`;
    const weights = (path, keys, label = k => k, step = 1) => `<div class="wgrid">${keys.map(k => `<label><span>${esc(label(k))}</span>${num(`${path}.${k}`, (a[path] || {})[k] ?? 0, step)}</label>`).join('')}</div>${err(path)}`;
    const A = withArtistDefaults(a);
    return `<div class="sheet-grid">
      <div class="sheet-block"><h4>${esc(t('artProfile'))}</h4>
        <div class="char-id"><img class="portrait" src="${face(a)}" alt=""><div class="actions"><button class="btn small" id="ar-face">${esc(t('artNewFace'))}</button>
          <select data-text="portrait.palette">${PALETTES.map(p => `<option ${a.portrait && a.portrait.palette === p ? 'selected' : ''}>${p}</option>`).join('')}</select></div></div>
        <div class="ctrl"><span class="lbl">id</span><input type="text" data-text="id" value="${esc(a.id)}">${err('id')}</div>
        <div class="ctrl"><span class="lbl">${esc(t('artName'))}</span><input type="text" data-text="name" value="${esc(a.name || '')}">${err('name')}</div>
        <div class="ctrl"><span class="lbl">Bio (English)</span><input type="text" data-text="bio.en" value="${esc((a.bio || {}).en || '')}"></div>
        <div class="ctrl"><span class="lbl">Bio (italiano)</span><input type="text" data-text="bio.it" value="${esc((a.bio || {}).it || '')}">${err('bio')}</div>
        <div class="ctrl"><span class="lbl">${esc(t('artInspiredLbl'))}</span><input type="text" data-text="inspiredBy" value="${esc(a.inspiredBy || '')}"></div></div>
      <div class="sheet-block"><h4>${esc(t('artStats'))}</h4>${RANGES.map(k => `<div class="ctrl"><span class="lbl">${esc(t('art_' + k))}</span><div class="pair">${num(`${k}.0`, A[k][0])}${num(`${k}.1`, A[k][1])}</div>${err(k)}</div>`).join('')}
        <div class="ctrl"><span class="lbl">${esc(t('artExploreLbl'))}</span>${num('explore', A.explore)}${err('explore')}</div></div>
      <div class="sheet-block"><h4>${esc(t('artStyles'))}</h4>${weights('styles', styleIds(), styleName)}</div>
      <div class="sheet-block"><h4>${esc(t('libShapes'))}</h4>${weights('shapes', SHAPES, k => t('shape_' + k))}</div>
      <div class="sheet-block"><h4>${esc(t('artMoves'))}</h4>${weights('moves', MOVE_KINDS)}</div>
      <div class="sheet-block"><h4>${esc(t('voice'))}</h4><div class="ctrl"><span class="lbl">${esc(t('artVoiceChanceLbl'))}</span>${num('voice.chance', A.voice.chance)}</div>
        <div class="wgrid">${VOICE_CHARACTER_NAMES.map(k => `<label><span>${k}</span>${num(`voice.characters.${k}`, (A.voice.characters || {})[k] ?? 0, 1)}</label>`).join('')}</div>${err('voice')}</div>
      <div class="sheet-block"><h4>${esc(t('artQuirks'))}</h4>${weights('quirks', Object.keys(QUIRKS), k => tx(QUIRKS[k]), 0.05)}</div>
    </div>`;
  }

  const getAt = (o, path) => path.split('.').reduce((x, k) => (x == null ? x : x[k]), o);
  function setAt(o, path, v) { const ks = path.split('.'); let x = o; ks.slice(0, -1).forEach((k, i) => { if (x[k] == null) x[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; x = x[k]; }); x[ks[ks.length - 1]] = v; }
  // weights at 0 are left out, so the file stays readable
  const tidy = a => { for (const k of ['styles', 'shapes', 'moves', 'quirks']) if (a[k]) { a[k] = Object.fromEntries(Object.entries(a[k]).filter(([, v]) => v > 0)); if (!Object.keys(a[k]).length && k !== 'styles') delete a[k]; }
    if (a.voice && a.voice.characters) a.voice.characters = Object.fromEntries(Object.entries(a.voice.characters).filter(([, v]) => v > 0)); return a; };

  function render() {
    const items = all(), cur = open && items.find(x => x.a.id === open);
    if (!cur) open = null;
    const res = cur ? check(editing || cur.a) : null;
    root.innerHTML = `<p class="intro">${esc(t('introArtists'))}</p>
    <div class="lib-top"><button class="btn" id="ar-new">+ ${esc(t('artNew'))}</button><button class="btn" id="ar-import">${esc(t('libImport'))}</button><span class="muted small">${esc(t('artWhere'))}</span></div>
    <div class="lib-list artists">${items.map(({ a, own }) => `<button class="card lib-card art-card${a.id === open ? ' on' : ''}" data-open="${esc(a.id)}">
      <img class="portrait" src="${face(a)}" alt=""><span><strong>${esc(a.name)}</strong><span class="muted small">${esc(Object.keys(a.styles || {}).slice(0, 3).map(styleName).join(' · '))}</span>
      <span class="badges">${own ? `<span class="badge">${esc(t('mine'))}</span>` : `<span class="badge">${esc(t('libBuiltin'))}</span>`}${check(a).errors.length ? `<span class="badge bad">${esc(t('libInvalid'))}</span>` : ''}</span></span></button>`).join('')}</div>
    ${cur ? `<div class="card lib-sheet">
      <div class="sheet-head"><div></div><div class="actions">${cur.own ? (editing ? `<button class="btn" id="ar-json" aria-pressed="${jsonView}">${esc(t('libJson'))}</button><button class="btn primary" id="ar-save" ${res.errors.length ? 'disabled' : ''}>${esc(t('save'))}</button><button class="btn" id="ar-cancel">${esc(t('libCancel'))}</button>`
        : `<button class="btn primary" id="ar-edit">${esc(t('libEdit'))}</button><button class="btn danger" id="ar-del">${esc(t('libDelete'))}</button>`) : ''}
        <button class="btn" id="ar-dup">${esc(t('libDuplicate'))}</button><button class="btn" id="ar-export">${esc(t('libExport'))}</button></div></div>
      ${res.errors.length ? `<div class="field-err">${esc(t('libErrors', { n: res.errors.length }))}</div>` : ''}
      ${editing ? (jsonView ? `<textarea class="lib-json" id="ar-json-text" spellcheck="false">${esc(JSON.stringify(editing, null, 2))}</textarea>${res.errors.map(e => `<div class="field-err">${esc(e.path || '(artist)')}: ${esc(e.msg)}</div>`).join('')}` : form(editing, errorsByPath(res.errors))) : sheet(cur.a)}
    </div>` : `<p class="muted">${esc(t('artPick'))}</p>`}`;
  }

  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.open) { open = b.dataset.open; editing = null; jsonView = false; render(); return; }
    const cur = open && all().find(x => x.a.id === open);
    if (b.id === 'ar-new' || b.id === 'ar-dup') {
      const src = b.id === 'ar-dup' && cur ? cur.a : { format: ARTIST_FORMAT, id: 'new-artist', name: t('artNewName'), bio: { en: 'A new artist.', it: 'Un nuovo artista.' }, portrait: { seed: `new-${Date.now()}`, palette: 'neon' }, styles: { [styleIds()[0]]: 1 } };
      const copy = { ...JSON.parse(JSON.stringify(src)), format: ARTIST_FORMAT, id: freeId(src.id, all().map(x => x.a.id)) };
      if (b.id === 'ar-dup') copy.name = `${src.name} ${t('libCopy')}`;
      mine.put(copy); open = copy.id; editing = JSON.parse(JSON.stringify(copy)); jsonView = false; onChange(); render(); return;
    }
    if (b.id === 'ar-import') {
      pickJsonFiles((a, name, error) => {
        if (!a || error) { toast(t('libImportBad', { name })); return; }
        if (builtinIds().includes(a.id)) a.id = freeId(a.id, all().map(x => x.a.id));
        mine.put(a); open = a.id; onChange(); render(); toast(t('libImported', { name: a.name || a.id }));
      });
      return;
    }
    if (!cur) return;
    if (b.id === 'ar-export') return downloadJson(cur.a.id, editing || cur.a);
    if (b.id === 'ar-edit') { editing = JSON.parse(JSON.stringify(cur.a)); render(); return; }
    if (b.id === 'ar-cancel') { editing = null; jsonView = false; render(); return; }
    if (b.id === 'ar-json') { jsonView = !jsonView; render(); return; }
    if (b.id === 'ar-face' && editing) { editing.portrait = { ...(editing.portrait || { palette: 'neon' }), seed: `${editing.id}-${Date.now().toString(36)}` }; render(); return; }
    if (b.id === 'ar-save' && editing) {
      tidy(editing);
      if (editing.id !== cur.a.id) { if (all().some(x => x.a.id === editing.id)) { toast(t('libIdTaken')); return; } mine.remove(cur.a.id); }
      mine.put(editing); open = editing.id; editing = null; jsonView = false; onChange(); render(); toast(t('libSaved')); return;
    }
    if (b.id === 'ar-del') { mine.remove(cur.a.id); open = null; onChange(); render(); }
  });
  root.addEventListener('change', e => {
    if (!editing) return;
    const el = e.target;
    if (el.dataset.num) { setAt(editing, el.dataset.num, el.value === '' ? 0 : +el.value); render(); }
    if (el.dataset.text) { setAt(editing, el.dataset.text, el.value.trim()); render(); }
    if (el.id === 'ar-json-text') { try { editing = JSON.parse(el.value); } catch (err) { toast(t('libJsonBad', { msg: err.message })); } render(); }
  });

  return { render, usable, face };
}
