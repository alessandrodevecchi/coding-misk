// The New song panel of Compose (new-song-panel): an inline card under the title row with a quick row (Da zero,
// Artista, Preset, Seme, Genera, Sorprendimi), five folded sections (Stile e genere, Profilo e crescita, Voci,
// Materiale, Durata) and a footer (Prendi dalla radio, the preset). The controls are the radio's (src/radio/
// song-controls.js) on the panel's own store (src/endless/song-options.js); the page makes the songs (onScratch,
// onGenerate, onSurprise).
import { CHEVRON, SLIDERS, DICE, CROSS, SAVE, BIN } from '../icons.js';
import { dieHtml, knobSlider, artistSelect, styleChips, genreChips, diceRow, materialSeg, profileSelect, customPanel, voicesGroup, songControlEvent, pickArtist, idOf } from '../radio/song-controls.js';
import { panelControls, baseDuration } from '../endless/new-song.js';
import { hasLength, cleanLength, LENGTHS, LENGTH_MINUTES } from '../endless/song-options.js';
import { LENGTH_RANGES } from '../endless/director.js';
import { BUILTIN_PRESETS, userPresets, presetById, presetValues, savePreset, deletePreset, presetLabel } from '../endless/song-presets.js';
import { CONTROLS } from '../live/profiles.js';

export const NS_OPEN = 'coding-misk-new-song-open';
export const NS_FOLDS = 'coding-misk-new-song-folds';
const SECTIONS = ['style', 'profile', 'voices', 'material', 'length'];
const P = 'ns';
const clock = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

// root: the #new-song card; options: the panel's store; radioOptions: the radio's (Prendi dalla radio)
// onScratch(), onGenerate(seed), onSurprise(): the page's; dirty(): the song in Compose has unsaved changes
export function createNewSongPanel({ root, button, t, tx, esc, store, options, radioOptions, recipes, artists, face = () => '', keepArtist = () => null, toast, getLang, userPatterns = () => [], onScratch, onGenerate, onSurprise }) {
  const opts = options.state, lastDice = {};
  let open = store.get(NS_OPEN, false) === true, folds = store.get(NS_FOLDS, {}) || {};
  let seedShown = '', busy = false, saving = false, freed = false;
  const vfold = id => { try { return !!(JSON.parse(localStorage.getItem('coding-misk-voice-folds') || '{}') || {})[id]; } catch (e) { return false; } };
  const ctl = {
    options, recipes, artists, keepArtist, toast, t, lastDice, root, comp: null, panel: true,
    controls: () => panelControls(opts),
    baseControls: base => baseDuration(base),
    // the growth duration (D12): Libera or the fitted growth with a Durata turns the Durata off, with its line
    customHook: (k, v) => {
      if (k !== 'duration') return null;
      if (v === 'planned') return { keys: [], render: true };
      if (hasLength(opts.length)) { opts.length = 'style'; freed = true; }
      return null;
    },
  };
  const sc = { state: opts, t, tx, esc, prefix: P, lastDice, recipes };
  const tip = k => `title="${esc(t(k))}"`;

  // ---------- summaries ----------
  const profName = () => t(opts.profile === 'artist' ? 'byArtistStyle' : opts.profile === 'custom' ? 'radioCustomProfile' : `profile:${opts.profile}`);
  const growing = () => panelControls(opts).build === 'crescendo';
  function lengthHeard() {
    const L = cleanLength(opts.length);
    if (L === 'style') return '';
    const [lo, hi] = typeof L === 'number' ? [L, L] : LENGTH_RANGES[L];
    // (Classic plays the written song, about one phrase under the target: 16 s at 120 bpm)
    const cut = growing() ? 0 : 16, a = lo * 60 - cut, b = hi * 60 - cut;
    return a === b ? t('nsAbout', { len: clock(a) }) : `${clock(a)}–${clock(b)}`;
  }
  const lengthName = () => { const L = cleanLength(opts.length); return typeof L === 'number' ? t('nsMinutes', { n: L }) : t(`nsLen:${L}`); };
  function summary(k) {
    if (k === 'style') return [opts.artist ? (artists().find(a => a.id === opts.artist) || opts.temp || {}).name || '' : opts.styles.map(id => tx((recipes.find(r => r.id === id) || {}).name || id)).join(' + '), `${t('radioChaos')} ${opts.chaos}`, `${t('radioEnergy')} ${opts.energy}`, `${t('radioComplexity')} ${opts.complexity}`].filter(Boolean).join(' · ');
    if (k === 'profile') { const C = panelControls(opts); return [profName(), ...(C.build === 'crescendo' && C.growth === 'natural' ? ['opening', 'pace', 'development'].map(x => (C[x] === 'auto' ? t('shapeAuto') : t(`${x}:${C[x]}`))) : []), C.duration === 'planned' ? t('nsGrowInLength') : ''].filter(Boolean).join(' · '); }
    if (k === 'voices') return [`${t('narratorLbl')}: ${t(opts.voices.narrator ? 'switchOn' : 'switchOff')}`, `${t('vinstLbl')}: ${opts.voices.track ? t(`vinstPreset:${opts.voice.preset}`) : t('switchOff')}`].join(' · ');
    if (k === 'material') { const C = panelControls(opts); return [t(`matShort:${opts.material}`), C.build === 'crescendo' ? t(C.gen === 'standard' ? 'liveGenStandard' : 'liveGenIdiomatic') : ''].filter(Boolean).join(' · '); }
    if (k === 'length') { const h = lengthHeard(); return h ? `${lengthName()} · ${t('nsHeardWith', { len: h, profile: profName() })}` : lengthName(); }
    return '';
  }

  // ---------- sections ----------
  const knob = (k, label, help) => knobSlider(sc, k, label, help, { value: opts[k], fader: true });
  function body(k) {
    const die = (...a) => dieHtml({ t, esc, lastDice }, ...a);
    if (k === 'style') return `<div class="ctrl"><span class="lbl">${esc(t('nsGenres'))}</span>${genreChips(sc)}</div>
      <div class="ctrl" ${tip('tipStyles')}><span class="lbl">${esc(t('radioStyles'))} ${die('styles', 'diceStyles', t('diceStylesLbl'))} ${die('genre', 'diceGenre', t('diceGenreLbl'))}</span>${styleChips({ state: opts, recipes, t, tx, esc })}</div>
      ${diceRow(sc)}
      <div class="ctrls three ns-knobs">${knob('chaos', 'radioChaos', 'tipChaos')}${knob('energy', 'radioEnergy', 'tipEnergy')}${knob('complexity', 'radioComplexity', 'tipComplexity')}</div>`;
    if (k === 'profile') { const C = panelControls(opts); return `<div class="ns-row">${profileSelect(sc)}</div>${opts.profile !== 'custom' ? `<p class="hint muted small">${esc(t('nsShapeHint'))}</p>` : ''}${customPanel(sc, { C, all: true, planned: C.duration === 'planned' })}`; }
    if (k === 'voices') return voicesGroup(sc, { talkKnob: knob('talk', 'radioTalk', 'tipTalk'), vfold, hint: 'nsVoicesHint' });
    if (k === 'material') {
      const C = panelControls(opts), blocks = C.build !== 'crescendo', n = userPatterns().length;
      return `${materialSeg(sc)}
      <div class="ns-row"><label class="ctrl" title="${esc(blocks ? t('nsGenBlocks') : t('liveGenHint'))}"><span class="lbl">${esc(t('liveGen'))}</span><select data-custom="gen" data-no-knob${blocks ? ' disabled' : ''}>${CONTROLS.gen.map(v => `<option value="${v}"${C.gen === v ? ' selected' : ''}>${esc(t(v === 'standard' ? 'liveGenStandard' : 'liveGenIdiomatic'))}</option>`).join('')}</select></label></div>
      ${blocks ? `<p class="hint muted small">${esc(t('nsGenBlocks'))}</p>` : ''}
      <p class="hint muted small">${esc(t('nsPatterns', { n }))}</p>`;
    }
    if (k === 'length') {
      const L = cleanLength(opts.length), exact = typeof L === 'number', C = panelControls(opts), natural = C.build === 'crescendo' && C.growth === 'natural';
      const chip = v => `<button class="chip small" data-ns-length="${v}" aria-pressed="${v === 'exact' ? exact : L === v}" title="${esc(t(`nsLenTip:${v}`))}">${esc(t(`nsLen:${v}`))}</button>`;
      const durs = C.duration === 'planned' ? ['planned', 'fitted', 'free'] : ['fitted', 'free'];
      const line = !hasLength(L) ? (C.build === 'crescendo' ? t('nsLineStyleGrow') : '') : C.build === 'crescendo' ? t('nsLineGrow') : t('nsLineClassic');
      return `<div class="ns-length">
        <div class="ctrl"><span class="lbl">${esc(t('nsLength'))}</span><div class="chips" role="group">${[...LENGTHS, 'exact'].map(chip).join('')}<label class="ns-min"${exact ? '' : ' hidden'}><input type="number" data-ns-minutes min="${LENGTH_MINUTES[0]}" max="${LENGTH_MINUTES[1]}" step="0.5" value="${exact ? L : 3}" aria-label="${esc(t('nsMinutesLbl'))}"> ${esc(t('rxMin'))}</label></div></div>
        <label class="ctrl" title="${esc(t('durHint'))}"><span class="lbl">${esc(t('durLbl'))}</span><select data-custom="duration" data-no-knob${natural || C.duration === 'planned' ? '' : ' disabled'}>${durs.map(v => `<option value="${v}"${C.duration === v ? ' selected' : ''}>${esc(t(`dur:${v}`))}</option>`).join('')}</select></label></div>
        ${line ? `<p class="hint muted small" id="ns-length-line">${esc(line)}</p>` : ''}
        ${freed ? `<p class="hint muted small" id="ns-target-off">${esc(t('targetOff'))}</p>` : ''}`;
    }
    return '';
  }
  const ICON = { style: '', profile: SLIDERS, voices: '', material: '', length: '' };
  const section = k => `<div class="ns-sec" data-ns-sec="${k}"><button class="curves-toggle custom-toggle" data-ns-fold="${k}" aria-expanded="${!!folds[k]}" aria-controls="ns-body-${k}"><span class="tw">${CHEVRON}${ICON[k]}<span>${esc(t(`nsSec:${k}`))}</span></span><span class="custom-summary">${esc(summary(k))}</span></button><div class="custom-body" id="ns-body-${k}"${folds[k] ? '' : ' hidden'}>${folds[k] ? body(k) : ''}</div></div>`;

  // ---------- quick row and footer ----------
  function presetSelect() {
    const mine = Object.keys(userPresets(store)), cur = opts.preset, known = cur && presetById(store, cur);
    return `<select id="ns-preset" data-no-knob aria-label="${esc(t('nsPreset'))}">${known ? '' : `<option value="" selected>${esc(t('radioCustom'))}</option>`}<optgroup label="${esc(t('nsBuiltin'))}">${BUILTIN_PRESETS.map(p => `<option value="${esc(p.id)}"${cur === p.id ? ' selected' : ''}>${esc(p.name[getLang()] || p.name.en)}</option>`).join('')}</optgroup>${mine.length ? `<optgroup label="${esc(t('nsMine'))}">${mine.map(n => `<option value="${esc(n)}"${cur === n ? ' selected' : ''}>${esc(n)}</option>`).join('')}</optgroup>` : ''}</select>`;
  }
  const presetName = () => (opts.preset && presetLabel(opts.preset, getLang(), store)) || t('radioCustom');
  function render() {
    if (button) { button.setAttribute('aria-expanded', String(open)); }
    root.hidden = !open;
    if (!open) { root.innerHTML = ''; return; }
    const own = !!userPresets(store)[opts.preset];
    root.innerHTML = `<div class="ns-head"><span class="lbl ns-title">${esc(t('newTrack'))}</span><span class="muted small ns-for">${esc(t('nsFor'))}</span><button class="plain ns-close" id="ns-close" aria-label="${esc(t('nsClose'))}" ${tip('nsClose')}>${CROSS}</button></div>
      <div class="ns-quick">
        <button class="btn" id="ns-scratch" ${tip('nsScratchTip')}>${esc(t('nsScratch'))}</button><span class="ns-div" aria-hidden="true"></span>
        <div class="ctrl ns-artist"><label class="lbl" for="ns-artist">${esc(t('nsArtist'))}</label><span class="ns-inline">${artistSelect({ state: opts, t, esc, artists: artists(), prefix: P })}${dieHtml({ t, esc, lastDice }, 'artist', 'diceArtist')}</span></div>
        <div class="ctrl ns-presets"><label class="lbl" for="ns-preset">${esc(t('nsPreset'))}</label><span class="ns-inline">${presetSelect()}<button class="btn icon" id="ns-save" aria-label="${esc(t('nsSaveTip'))}" ${tip('nsSaveTip')} aria-expanded="${saving}">${SAVE}</button><button class="btn icon" id="ns-del" aria-label="${esc(t('nsDeleteTip'))}" ${own ? tip('nsDeleteTip') : `title="${esc(t('nsDeleteNo'))}" disabled`}>${BIN}</button></span></div>
        <div class="ctrl ns-seed"><label class="lbl" for="ns-seed">${esc(t('radioSeed'))}</label><input id="ns-seed" type="text" maxlength="40" autocomplete="off" spellcheck="false" placeholder="${esc(t('radioSeedAuto'))}" value="${esc(seedShown)}" ${tip('nsSeedTip')}></div>
        <button class="btn primary" id="ns-generate" ${tip('nsGenerateTip')}>${esc(t('nsGenerate'))}</button>
        <button class="btn ns-surprise" id="ns-surprise" ${tip('nsSurpriseTip')}>${DICE}<span>${esc(t('nsSurprise'))}</span></button>
      </div>
      ${saving ? `<div class="ns-saveas"><input type="text" id="ns-name" maxlength="30" autocomplete="off" placeholder="${esc(t('compSaveAs'))}" value="${esc(own ? opts.preset : '')}"><button class="btn small primary" id="ns-save-ok">${esc(t('compSave'))}</button><button class="btn small" id="ns-save-cancel">${esc(t('nsCancel'))}</button><span class="muted small" id="ns-save-msg"></span></div>` : ''}
      <div class="ns-secs">${SECTIONS.map(section).join('')}</div>
      <div class="ns-foot"><button class="btn small" id="ns-take" ${tip('nsTakeTip')}>${esc(t('nsTake'))}</button><span class="muted small" id="ns-preset-now">${esc(t('nsPresetNow', { name: presetName() }))}</span></div>`;
  }
  // after a value changed without a new render (a knob being dragged): the preset line and the select
  function syncPreset() {
    const el = root.querySelector('#ns-preset-now'); if (el) el.textContent = t('nsPresetNow', { name: presetName() });
    const s = root.querySelector('#ns-preset'); if (s && !opts.preset && s.value !== '') s.outerHTML = presetSelect();
  }
  // any value changed: the preset picked last no longer holds (Personalizzato); the panel draws again when shown
  options.on(keys => {
    if (opts.preset && keys && !keys.includes('preset')) { opts.preset = ''; options.save(['preset']); return; }
    if (busy || !open) { syncPreset(); return; }
    render();
  });

  function setOpen(v) { open = !!v; store.set(NS_OPEN, open); render(); }
  function setLength(v) {
    const L = cleanLength(v);
    // (a Durata makes the growth duration grow inside it: a Custom free growth gives way, D12)
    const patch = { length: L };
    if (hasLength(L) && opts.profile === 'custom' && opts.custom.controls && opts.custom.controls.duration === 'free') { const { duration: _, ...rest } = opts.custom.controls; patch.custom = { ...opts.custom, controls: rest }; }
    if (hasLength(L)) freed = false;
    options.set(patch);
  }
  const seedNow = () => { const el = root.querySelector('#ns-seed'); return el ? el.value.trim() : seedShown; };

  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.id === 'ns-close') return setOpen(false);
    if (b.id === 'ns-scratch') return onScratch();
    if (b.id === 'ns-generate') return onGenerate(seedNow());
    if (b.id === 'ns-surprise') return onSurprise();
    if (b.id === 'ns-take') { options.takeFrom(radioOptions); toast(t('nsTaken')); return; }
    if (b.id === 'ns-save') { saving = !saving; render(); if (saving) { const i = root.querySelector('#ns-name'); if (i) i.focus(); } return; }
    if (b.id === 'ns-save-cancel') { saving = false; return render(); }
    if (b.id === 'ns-save-ok') return saveNow(b);
    if (b.id === 'ns-del') { const n = opts.preset; if (deletePreset(store, n)) { opts.preset = ''; options.save(['preset']); toast(t('nsDeleted', { name: n })); } return; }
    if (b.dataset.nsFold) { const k = b.dataset.nsFold; folds = { ...folds, [k]: !folds[k] }; store.set(NS_FOLDS, folds); return render(); }
    if (b.dataset.nsLength) { const v = b.dataset.nsLength; if (v === 'exact') { const i = root.querySelector('[data-ns-minutes]'); return setLength(i ? +i.value || 3 : 3); } return setLength(v); }
    busy = true;
    let r = null;
    try { r = songControlEvent(ctl, b, 'click'); } finally { busy = false; }
    if (r) { if (r.render) render(); else syncPreset(); }
  });
  root.addEventListener('change', e => {
    const el = e.target;
    if (el.id === 'ns-preset') {
      const p = presetById(store, el.value);
      if (p) { options.set({ ...presetValues(p, opts), preset: el.value }); toast(t('nsPresetPicked', { name: presetName() })); }
      return;
    }
    if (el.dataset.nsMinutes !== undefined) return setLength(+el.value || 3);
    if (el.dataset.opt) return render();
    busy = true;
    let r = null;
    try { r = songControlEvent(ctl, el, 'change'); } finally { busy = false; }
    if (r && r.render) render(); else if (r) syncPreset();
  });
  root.addEventListener('input', e => {
    if (!e.target.dataset.opt && !(e.target.type === 'range' && e.target.dataset.vsound)) return;
    busy = true;
    try { songControlEvent(ctl, e.target, 'input'); } finally { busy = false; }
    syncPreset();
  });
  root.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'ns-name') { e.preventDefault(); saveNow(); } });
  // Esc closes the panel (not while typing a preset name: Esc there leaves the name)
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !open || root.closest('[hidden]') || root.hidden) return;
    if (e.target.id === 'ns-name') { saving = false; render(); return; }
    if (e.target.closest && e.target.closest('.cm-editor, strudel-editor')) return;
    setOpen(false);
    if (button) button.focus();
  });
  // Save: a new preset of the owner's; his own name again asks once to confirm and overwrites it; a built-in name makes
  // a new one of his own (built-in presets are never changed)
  let confirmName = '';
  function saveNow() {
    const i = root.querySelector('#ns-name'), name = (i ? i.value : '').trim(), msg = root.querySelector('#ns-save-msg');
    if (!name) { if (msg) msg.textContent = t('compNameBad'); return; }
    if (userPresets(store)[name] && confirmName !== name) { confirmName = name; if (msg) msg.textContent = t('nsOverwriteAsk', { name }); return; }
    confirmName = '';
    const r = savePreset(store, name, opts);
    if (!r) return;
    saving = false; opts.preset = r.name; options.save(['preset']);
    toast(t(r.overwrote ? 'nsOverwritten' : 'nsSaved', { name: r.name }));
  }
  render();
  return {
    render,
    get open() { return open; },
    setOpen,
    // the seed used by the last song (shown in the Seme field)
    showSeed(s) { seedShown = s || ''; const el = root.querySelector('#ns-seed'); if (el) el.value = seedShown; },
    // the Artists tab (D7): the panel open, the artist picked
    pickArtist(id) { open = true; store.set(NS_OPEN, true); busy = true; try { pickArtist(ctl, id); } finally { busy = false; } render(); },
    // Esc and the close button leave the song in Compose as it is
    close() { setOpen(false); },
    idOf: name => idOf(P, name),
  };
}
