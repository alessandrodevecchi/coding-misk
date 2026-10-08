// Styles tab (#35): every style as a readable sheet; the user's styles edited with a form and a JSON view.
// Built-in styles (styles/*.json) are read-only and can be duplicated. The user's styles live in browser storage.
import { KITS, KEYS, PROGS, METERS, BASS, ARPS, HOOKS, PADS, GUITAR_PATTERNS, GUITAR_TYPES, TEXTURES, TEX_RHYTHMS, GROOVES, MODES, chordName } from '../music.js';
import { validateRecipe, INSTRUMENTS, SHAPES, RECIPE_FORMAT } from '../endless/recipe.js';
import { MACHINES } from '../sounds/machines.js';
import { SPEAKERS } from '../song/build.js';
import { downloadJson, pickJsonFiles, userStore, freeId, errorsByPath } from './library.js';

// names a list field of an instrument offers in the form
const CHOICES = {
  'drums.kits': MACHINES, 'drums.grooves': Object.keys(GROOVES), 'bass.presets': Object.keys(BASS), 'arp.presets': Object.keys(ARPS), 'arp.speeds': ['8', '16'],
  'hook.presets': Object.keys(HOOKS), 'hook.modes': MODES.map(([m]) => m), 'pad.presets': Object.keys(PADS), 'guitar.patterns': Object.keys(GUITAR_PATTERNS),
  'guitar.types': Object.keys(GUITAR_TYPES), 'texture.samples': TEXTURES, 'texture.rhythms': Object.keys(TEX_RHYTHMS),
};
const INSTR = Object.keys(INSTRUMENTS);

export function createStylesTab({ root, t, tx, esc, store, builtins, toast, onChange }) {
  const mine = userStore(store, 'coding-misk-styles');
  let open = null, editing = null, jsonView = false;
  const builtinIds = () => builtins.map(r => r.id);
  const all = () => [...builtins.map(r => ({ r, own: false })), ...mine.all.map(r => ({ r, own: true }))];
  const check = r => validateRecipe(r);
  // the styles the radio and the director may use: built-ins plus the user's valid ones
  const usable = () => [...builtins, ...mine.all.filter(r => !check(r).errors.length && !builtinIds().includes(r.id))];

  const chips = (list, on, path) => `<div class="chips">${list.map(x => `<button class="chip small" data-pick="${esc(path)}" data-val="${esc(x)}" aria-pressed="${on.includes(x)}">${esc(x)}</button>`).join('')}</div>`;
  const tagList = list => (list && list.length ? list.map(x => `<span class="tag-chip">${esc(x)}</span>`).join(' ') : `<span class="muted">${esc(t('libNone'))}</span>`);
  const range = r => (Array.isArray(r) ? `${r[0]}–${r[1]}` : r ?? '');

  function sheet(r) {
    const prog = id => `${id} <span class="muted">${(PROGS[id] ? PROGS[id][1] : []).map(c => chordName(c, 0)).join(' ')}</span>`;
    const instr = INSTR.filter(k => r[k]).map(k => {
      const p = r[k], lists = Object.keys(INSTRUMENTS[k]).filter(f => p[f]).map(f => `<div><span class="lbl">${esc(f)}</span> ${tagList(p[f])}</div>`).join('');
      const set = p.settings ? `<div><span class="lbl">settings</span> ${Object.entries(p.settings).map(([s, v]) => `${esc(s)} ${esc(range(v))}`).join(' · ')}</div>` : '';
      return `<div class="sheet-block"><h4>${esc(k)}${p.weight !== undefined ? ` <span class="muted">· ${esc(t('libWeight'))} ${p.weight}</span>` : ''}</h4>${lists}${set}</div>`;
    }).join('');
    const v = r.voice || {};
    return `<div class="sheet-grid">
      <div class="sheet-block"><h4>${esc(t('libTempo'))}</h4><div class="big">${esc(range(r.tempo))} BPM</div>
        <div><span class="lbl">${esc(t('libLength'))}</span> ${esc(range(r.minutes || [3, 5]))} min · ${esc(t('libPhrase'))} ${r.phrase || 8} · ${esc(t('libTracks'))} ${esc(range((r.tracks || {}).usual || [4, 5]))}, max ${(r.tracks || {}).max ?? 8}</div>
        <div><span class="lbl">${esc(t('libShapes'))}</span> ${tagList(r.shapes)}</div></div>
      <div class="sheet-block"><h4>${esc(t('libHarmony'))}</h4><div><span class="lbl">${esc(t('libKeys'))}</span> ${tagList(r.keys)}</div>
        <div class="progs">${(r.progressions || []).map(p => `<div>${prog(p)}</div>`).join('')}</div>
        <div><span class="lbl">${esc(t('libMeters'))}</span> ${tagList(r.meters || ['4/4'])}${r.swing ? ` · swing ${esc(range(r.swing))}` : ''}</div></div>
      ${instr}
      <div class="sheet-block"><h4>${esc(t('voice'))}</h4><div><span class="lbl">${esc(t('libSpeakers'))}</span> ${tagList(v.speakers || (v.speaker !== undefined ? [v.speaker || 'default'] : []))}</div>
        <div>${Object.entries(v).filter(([k]) => !['speaker', 'speakers'].includes(k)).map(([k, x]) => `${esc(k)} ${esc(range(x))}`).join(' · ')}</div></div>
      <div class="sheet-block"><h4>${esc(t('libWords'))}</h4>${['en', 'it', 'es'].map(l => `<div><span class="lbl">${l}</span> ${esc(((r.words || {})[l] || []).join(', '))}</div>`).join('')}</div>
    </div>`;
  }

  function form(r, errs) {
    const err = path => (errs[path] ? `<div class="field-err">${errs[path].map(esc).join('<br>')}</div>` : '');
    const num = (path, v, step = 1) => `<input type="number" step="${step}" data-num="${esc(path)}" value="${esc(v ?? '')}">`;
    const ins = INSTR.map(k => {
      const p = r[k];
      const lists = p ? Object.keys(INSTRUMENTS[k]).map(f => {
        // drum machines: the ones of the Compose menus plus those already chosen (71 would be too many)
        const known = f === 'kits' ? [...new Set([...KITS, ...(p[f] || [])])] : CHOICES[`${k}.${f}`];
        return `<div class="ctrl"><span class="lbl">${esc(f)}</span>${known ? chips(known, p[f] || [], `${k}.${f}`) : `<input type="text" data-list="${esc(`${k}.${f}`)}" value="${esc((p[f] || []).join(', '))}" placeholder="sawtooth, gm_piano">`}${err(`${k}.${f}`)}${Object.keys(errs).filter(e => e.startsWith(`${k}.${f}[`)).map(err).join('')}</div>`;
      }).join('') : '';
      return `<div class="sheet-block"><h4><button class="led" data-instr="${k}" aria-pressed="${!!p}" aria-label="${esc(k)}"></button> ${esc(k)}</h4>${lists}</div>`;
    }).join('');
    return `<div class="style-form">
      <div class="sheet-grid">
        <div class="sheet-block"><h4>${esc(t('libName'))}</h4>
          <div class="ctrl"><span class="lbl">id</span><input type="text" data-text="id" value="${esc(r.id)}">${err('id')}</div>
          <div class="ctrl"><span class="lbl">English</span><input type="text" data-text="name.en" value="${esc((r.name || {}).en || '')}">${err('name.en')}</div>
          <div class="ctrl"><span class="lbl">Italiano</span><input type="text" data-text="name.it" value="${esc((r.name || {}).it || '')}">${err('name.it')}</div>
          <div class="ctrl"><span class="lbl">${esc(t('libDescription'))}</span><input type="text" data-text="description" value="${esc(r.description || '')}"></div></div>
        <div class="sheet-block"><h4>${esc(t('libTempo'))}</h4>
          <div class="ctrl"><span class="lbl">BPM</span><div class="pair">${num('tempo.0', (r.tempo || [])[0])}${num('tempo.1', (r.tempo || [])[1])}</div>${err('tempo')}</div>
          <div class="ctrl"><span class="lbl">${esc(t('libLength'))} (min)</span><div class="pair">${num('minutes.0', (r.minutes || [3, 5])[0], .5)}${num('minutes.1', (r.minutes || [3, 5])[1], .5)}</div>${err('minutes')}</div>
          <div class="ctrl"><span class="lbl">${esc(t('libShapes'))}</span>${chips(SHAPES, r.shapes || [], 'shapes')}${err('shapes')}</div></div>
        <div class="sheet-block"><h4>${esc(t('libHarmony'))}</h4>
          <div class="ctrl"><span class="lbl">${esc(t('libKeys'))}</span>${chips(KEYS.map(k => k[0]), r.keys || [], 'keys')}${err('keys')}</div>
          <div class="ctrl"><span class="lbl">${esc(t('libProgressions'))}</span>${chips(Object.keys(PROGS), r.progressions || [], 'progressions')}${err('progressions')}</div>
          <div class="ctrl"><span class="lbl">${esc(t('libMeters'))}</span>${chips(METERS.map(m => m[0]), r.meters || ['4/4'], 'meters')}</div></div>
        <div class="sheet-block"><h4>${esc(t('voice'))}</h4>
          <div class="ctrl"><span class="lbl">${esc(t('libSpeakers'))}</span>${chips(['', ...SPEAKERS].map(s => s || 'default'), ((r.voice || {}).speakers || []).map(s => s || 'default'), 'voice.speakers')}</div>
          <p class="muted small">${esc(t('libVoiceJson'))}</p></div>
        ${ins}
        <div class="sheet-block"><h4>${esc(t('libWords'))}</h4>${['en', 'it', 'es'].map(l => `<div class="ctrl"><span class="lbl">${l}</span><input type="text" data-list="words.${l}" value="${esc(((r.words || {})[l] || []).join(', '))}">${err(`words.${l}`)}</div>`).join('')}</div>
      </div></div>`;
  }

  const getAt = (o, path) => path.split('.').reduce((x, k) => (x == null ? x : x[k]), o);
  function setAt(o, path, v) { const ks = path.split('.'); let x = o; ks.slice(0, -1).forEach((k, i) => { if (x[k] == null) x[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; x = x[k]; }); x[ks[ks.length - 1]] = v; }

  function render() {
    const items = all();
    const cur = open && items.find(x => x.r.id === open);
    if (!cur) open = null;
    const res = cur ? check(editing || cur.r) : null;
    root.innerHTML = `<p class="intro">${esc(t('introStyles'))}</p>
    <div class="lib-top"><button class="btn" id="st-new">+ ${esc(t('libNewStyle'))}</button><button class="btn" id="st-import">${esc(t('libImport'))}</button><span class="muted small">${esc(t('libWhere'))}</span></div>
    <div class="lib-list">${items.map(({ r, own }) => { const bad = check(r).errors.length; return `<button class="card lib-card${r.id === open ? ' on' : ''}" data-open="${esc(r.id)}">
      <strong>${esc(tx(r.name || { en: r.id }))}</strong><span class="muted">${esc(range(r.tempo))} BPM</span>
      <span class="badges">${own ? `<span class="badge">${esc(t('mine'))}</span>` : `<span class="badge">${esc(t('libBuiltin'))}</span>`}${bad ? `<span class="badge bad">${esc(t('libInvalid'))}</span>` : ''}</span></button>`; }).join('')}</div>
    ${cur ? `<div class="card lib-sheet">
      <div class="sheet-head"><div><h3>${esc(tx((editing || cur.r).name || { en: cur.r.id }))}</h3><p class="muted">${esc((editing || cur.r).description || '')}</p></div>
        <div class="actions">${cur.own ? (editing ? `<button class="btn" id="st-json" aria-pressed="${jsonView}">${esc(t('libJson'))}</button><button class="btn primary" id="st-save" ${res.errors.length ? 'disabled' : ''}>${esc(t('save'))}</button><button class="btn" id="st-cancel">${esc(t('libCancel'))}</button>`
          : `<button class="btn primary" id="st-edit">${esc(t('libEdit'))}</button><button class="btn danger" id="st-del">${esc(t('libDelete'))}</button>`) : ''}
          <button class="btn" id="st-dup">${esc(t('libDuplicate'))}</button><button class="btn" id="st-export">${esc(t('libExport'))}</button></div></div>
      ${res.errors.length ? `<div class="field-err">${esc(t('libErrors', { n: res.errors.length }))}${editing ? '' : `: ${res.errors.slice(0, 3).map(e => `${esc(e.path)} ${esc(e.msg)}`).join('; ')}`}</div>` : ''}
      ${editing ? (jsonView ? `<textarea class="lib-json" id="st-json-text" spellcheck="false">${esc(JSON.stringify(editing, null, 2))}</textarea>${res.errors.map(e => `<div class="field-err">${esc(e.path || '(style)')}: ${esc(e.msg)}</div>`).join('')}` : form(editing, errorsByPath(res.errors))) : sheet(cur.r)}
    </div>` : `<p class="muted">${esc(t('libPick'))}</p>`}`;
  }

  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.open) { open = b.dataset.open; editing = null; jsonView = false; render(); return; }
    const cur = open && all().find(x => x.r.id === open);
    if (b.id === 'st-new' || b.id === 'st-dup') {
      const src = b.id === 'st-dup' && cur ? cur.r : builtins.find(r => r.id === 'synthwave') || builtins[0];
      const copy = { ...JSON.parse(JSON.stringify(src)), format: RECIPE_FORMAT, id: freeId(src.id, all().map(x => x.r.id)) };
      copy.name = { en: `${tx(src.name)} ${t('libCopy')}`, it: `${src.name.it} ${t('libCopy')}` };
      mine.put(copy); open = copy.id; editing = JSON.parse(JSON.stringify(copy)); jsonView = false; onChange(); render(); return;
    }
    if (b.id === 'st-import') {
      pickJsonFiles((r, name, error) => {
        if (!r || error) { toast(t('libImportBad', { name })); return; }
        if (builtinIds().includes(r.id)) r.id = freeId(r.id, all().map(x => x.r.id));
        mine.put(r); open = r.id; onChange(); render(); toast(t('libImported', { name: r.id }));
      });
      return;
    }
    if (!cur) return;
    if (b.id === 'st-export') return downloadJson(cur.r.id, editing || cur.r);
    if (b.id === 'st-edit') { editing = JSON.parse(JSON.stringify(cur.r)); render(); return; }
    if (b.id === 'st-cancel') { editing = null; jsonView = false; render(); return; }
    if (b.id === 'st-json') { jsonView = !jsonView; render(); return; }
    if (b.id === 'st-save' && editing) {
      if (editing.id !== cur.r.id) { if (all().some(x => x.r.id === editing.id)) { toast(t('libIdTaken')); return; } mine.remove(cur.r.id); }
      mine.put(editing); open = editing.id; editing = null; jsonView = false; onChange(); render(); toast(t('libSaved')); return;
    }
    if (b.id === 'st-del') { mine.remove(cur.r.id); open = null; onChange(); render(); return; }
    if (editing && b.dataset.pick) {
      const path = b.dataset.pick, val = b.dataset.val === 'default' && path === 'voice.speakers' ? '' : b.dataset.val;
      const list = (getAt(editing, path) || []).slice(), i = list.indexOf(val);
      if (i >= 0) list.splice(i, 1); else list.push(val);
      setAt(editing, path, list); render(); return;
    }
    if (editing && b.dataset.instr) {
      const k = b.dataset.instr;
      if (editing[k]) delete editing[k]; else editing[k] = Object.fromEntries(Object.keys(INSTRUMENTS[k]).map(f => [f, []]));
      render();
    }
  });
  root.addEventListener('change', e => {
    if (!editing) return;
    const el = e.target;
    if (el.dataset.num) { setAt(editing, el.dataset.num, el.value === '' ? undefined : +el.value); render(); }
    if (el.dataset.text) { setAt(editing, el.dataset.text, el.value.trim()); render(); }
    if (el.dataset.list) { setAt(editing, el.dataset.list, el.value.split(',').map(x => x.trim()).filter(Boolean)); render(); }
    if (el.id === 'st-json-text') { try { editing = JSON.parse(el.value); } catch (err) { toast(t('libJsonBad', { msg: err.message })); } render(); }
  });

  return { render, usable, get mine() { return mine.all; } };
}
