// The settings page (#31): appearance, audio, radio defaults and the data kept in this browser.
// It is opened from the gear in the top bar; theme and language stay in the top bar too, for quick tests.
import { makeBackup, mergeBackup } from './backup.js';
import { downloadJson, pickJsonFiles } from '../library/library.js';
import { TRANSITION_KINDS, HARMONY_MODES } from '../endless/artist.js';
import { LAYOUTS, QUALITIES, CARDS, VIDEO_DEFAULTS, SOULS } from '../video/layout.js';
import { FORMATS, MP3_RATES, formatOf } from '../export/encode.js';


export function createSettings({ root, t, tx, esc, store, looks, app, toast, confirmTwice }) {
  const opt = (v, cur, label) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(label)}</option>`;
  const seg = (attr, items, cur) => `<div class="langs" role="group">${items.map(([v, l]) => `<button ${attr}="${esc(v)}" aria-pressed="${v === cur}">${esc(l)}</button>`).join('')}</div>`;
  const row = (label, html, hint = '') => `<div class="set-row"><span class="lbl">${esc(label)}</span><div class="set-ctrl">${html}${hint ? `<p class="hint muted">${esc(hint)}</p>` : ''}</div></div>`;

  function render() {
    if (root.hidden) return;
    const fmt = formatOf(store.get('coding-misk-export-format', 'wav')), r = app.radioSettings(), vid = { ...VIDEO_DEFAULTS, ...(store.get('coding-misk-video', {}) || {}) }, presets = store.get('coding-misk-video-presets', {}) || {};
    root.innerHTML = `<p class="intro">${esc(t('setIntro'))}</p>
      <div class="set-grid">
        <div class="card set-card"><h3>${esc(t('setLook'))}</h3>
          ${row(t('setTheme'), seg('data-set-ui', [['neon', 'NEON'], ['hw', 'HW']], app.ui()))}
          ${row(t('setLang'), seg('data-set-lang', [['it', 'IT'], ['en', 'EN']], app.lang()))}
          ${row(t('setRadioLook'), `<select id="set-radio-look" data-no-knob>${looks.map(([k, l]) => opt(k, store.get('coding-misk-radio-look', 'studio'), tx(l))).join('')}</select>`, t('setRadioLookHint'))}
        </div>
        <div class="card set-card"><h3>${esc(t('setAudio'))}</h3>
          ${row(t('setVolume'), `<span class="set-vol"><input type="range" id="set-volume" min="0" max="100" step="1" value="${app.volume()}" data-no-knob><output>${app.volume()}%</output></span>`)}
          ${row(t('setFormat'), `<select id="set-format" data-no-knob>${FORMATS.map(f => opt(f, fmt, t(`set${f[0].toUpperCase()}${f.slice(1)}`))).join('')}</select>`, t('setFormatHint'))}
          ${fmt === 'mp3' ? row(t('setMp3Rate'), seg('data-set-mp3', MP3_RATES.map(r => [String(r), `${r} kbps`]), String(store.get('coding-misk-export-mp3', 320)))) : ''}
          ${row(t('setSpeed'), `<select id="set-speed" data-no-knob>${opt('fast', store.get('coding-misk-export-speed', 'fast'), t('setSpeedFast'))}${opt('real', store.get('coding-misk-export-speed', 'fast'), t('setSpeedReal'))}</select>`, t('setSpeedHint'))}
        </div>
        <div class="card set-card" id="set-video"><h3>${esc(t('setVideo'))}</h3>
          <figure class="vid-preview"><canvas id="set-vid-preview" width="480" height="270" aria-label="${esc(t('vidPreview'))}"></canvas><figcaption class="hint muted">${esc(t('vidPreviewHint'))}</figcaption></figure>
          ${row(t('setVidLayout'), `<select data-vid-opt="layout" data-no-knob>${LAYOUTS.map(k => opt(k, vid.layout, t(`vidLayout:${k}`))).join('')}</select>`, t(`vidLayoutHint:${vid.layout}`))}
          ${row(t('setVidQuality'), `<select data-vid-opt="quality" data-no-knob>${Object.keys(QUALITIES).map(k => opt(k, vid.quality, t(`vidQuality:${k}`))).join('')}</select>`, t('setVidQualityHint'))}
          ${row(t('setVidCard'), `<select data-vid-opt="card" data-no-knob>${CARDS.map(k => opt(k, vid.card, t(`vidCard:${k}`))).join('')}</select>`)}
          ${row(t('setVidVisual'), `<select data-vid-opt="visual" data-no-knob>${opt('song', vid.visual, t('vidVisual:song'))}${looks.map(([k, l]) => opt(`fixed:${k}`, vid.visual, t('vidVisual:fixed', { look: tx(l) }))).join('')}${opt('song-cycle', vid.visual, t('vidVisual:song-cycle'))}${opt('section-cycle', vid.visual, t('vidVisual:section-cycle'))}</select>`, t('setVidVisualHint'))}
          ${row(t('setVidSoulMode'), `<select data-vid-opt="soul" data-no-knob>${SOULS.map(k => opt(k, vid.soul, t(`vidSoul:${k}`))).join('')}</select>`, t(`vidSoulHint:${vid.soul}`))}
          ${vid.layout === 'code' && vid.soul !== 'off' && vid.soul !== 'full' ? row(t('setVidSoul'), seg('data-vid-soul', [['1', t('vidSoulShown')], ['0', t('vidSoulFolded')]], vid.soulPanel ? '1' : '0'), t('setVidSoulHint')) : ''}
          ${row(t('setVidPreset'), `<span class="vid-presets"><select id="set-vid-preset" data-no-knob><option value="">${esc(t('vidPresetPick'))}</option>${Object.keys(presets).sort().map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('')}</select><input id="set-vid-preset-name" type="text" maxlength="40" placeholder="${esc(t('vidPresetName'))}" aria-label="${esc(t('vidPresetName'))}"><button class="btn small" id="set-vid-preset-save">${esc(t('vidPresetSave'))}</button>${Object.keys(presets).length ? `<button class="btn small danger" id="set-vid-preset-del">${esc(t('vidPresetDel'))}</button>` : ''}</span>`, t('setVidPresetHint'))}
        </div>
        <div class="card set-card" id="set-live"><h3>${esc(t('setLive'))}</h3>
          <p class="muted">${esc(t('setLiveIntro'))}</p>
          <div class="actions"><button class="btn primary" id="set-live-window">${esc(t('setLiveWindow'))}</button><button class="btn" id="set-live-room">${esc(t('setLiveRoom'))}</button></div>
          <p class="hint muted">${esc(t(app.liveOn && app.liveOn() ? 'setLiveOn' : 'setLiveHint'))}</p>
        </div>
        <div class="card set-card"><h3>${esc(t('setRadio'))}</h3>
          ${row(t('radioTransition'), `<select data-radio-opt="transition" data-no-knob>${['artist', ...TRANSITION_KINDS].map(k => opt(k, r.transition, t(k === 'artist' ? 'byArtist' : `tx:${k}`))).join('')}</select>`)}
          ${row(t('radioHarmony'), `<select data-radio-opt="harmony" data-no-knob>${['artist', ...HARMONY_MODES].map(k => opt(k, r.harmony, t(k === 'artist' ? 'byArtist' : `harmony:${k}`))).join('')}</select>`)}
          ${row(t('setScope'), `<select data-radio-opt="scope" data-no-knob>${opt('song', r.scope, t('steerScopeSong'))}${opt('session', r.scope, t('steerScopeSession'))}</select>`)}
        </div>
        <div class="card set-card"><h3>${esc(t('setData'))}</h3>
          <p class="muted">${esc(t('setDataIntro'))}</p>
          <div class="actions"><button class="btn primary" id="set-export">${esc(t('setExport'))}</button><button class="btn" id="set-import">${esc(t('setImport'))}</button><button class="btn danger" id="set-reset">${esc(t('setReset'))}</button></div>
        </div>
      </div>`;
    if (app.videoPreview) app.videoPreview(root.querySelector('#set-vid-preview'));
  }

  const setVid = (k, v) => store.set('coding-misk-video', { ...VIDEO_DEFAULTS, ...(store.get('coding-misk-video', {}) || {}), [k]: v });
  const entries = () => { const out = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); out.push([k, store.get(k, null)]); } return out; };
  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.setUi) { app.setUi(b.dataset.setUi); return render(); }
    if (b.dataset.setLang) { app.setLang(b.dataset.setLang); return render(); }
    if (b.dataset.setMp3) { store.set('coding-misk-export-mp3', +b.dataset.setMp3); return render(); }
    // direction presets (#53): the whole video setting under a name
    if (b.id === 'set-vid-preset-save') {
      const name = root.querySelector('#set-vid-preset-name').value.trim(); if (!name) { toast(t('vidPresetNameFirst')); return; }
      store.set('coding-misk-video-presets', { ...(store.get('coding-misk-video-presets', {}) || {}), [name]: { ...VIDEO_DEFAULTS, ...(store.get('coding-misk-video', {}) || {}) } });
      toast(t('vidPresetSaved', { name })); return render();
    }
    if (b.id === 'set-vid-preset-del') {
      const name = root.querySelector('#set-vid-preset').value; if (!name) { toast(t('vidPresetPickFirst')); return; }
      const all = { ...(store.get('coding-misk-video-presets', {}) || {}) }; delete all[name]; store.set('coding-misk-video-presets', all); return render();
    }
    if (b.id === 'set-live-window') { if (!app.liveOpenWindow()) toast(t('setLiveBlocked')); else setTimeout(render, 1500); return; }
    if (b.id === 'set-live-room') { app.liveOpenRoom(); return; }
    if (b.dataset.vidSoul) { setVid('soulPanel', b.dataset.vidSoul === '1'); return render(); }
    if (b.id === 'set-export') { const d = new Date().toISOString().slice(0, 10); downloadJson(`coding-misk-backup-${d}`, makeBackup(entries())); toast(t('setExported')); return; }
    if (b.id === 'set-import') {
      return pickJsonFiles(data => {
        const r = mergeBackup(data, k => store.get(k, null));
        if (r.error) { toast(t('setImportBad')); return; }
        for (const [k, v] of Object.entries(r.values)) store.set(k, v);
        toast(t('setImported', r.counts));
        setTimeout(() => location.reload(), 900);
      });
    }
    if (b.id === 'set-reset') {
      if (!confirmTwice('set-reset', t('setResetConfirm'))) return;
      const keys = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('coding-misk-')) keys.push(k); }
      keys.forEach(k => { try { localStorage.removeItem(k); } catch (err) {} });
      location.reload();
    }
  });
  root.addEventListener('input', e => { if (e.target.id === 'set-volume') { app.setVolume(+e.target.value); e.target.nextElementSibling.textContent = `${e.target.value}%`; } });
  root.addEventListener('change', e => {
    if (e.target.id === 'set-radio-look') store.set('coding-misk-radio-look', e.target.value);
    if (e.target.id === 'set-format') { store.set('coding-misk-export-format', e.target.value); render(); }
    if (e.target.id === 'set-speed') store.set('coding-misk-export-speed', e.target.value);
    if (e.target.dataset.radioOpt) app.setRadio(e.target.dataset.radioOpt, e.target.value);
    if (e.target.dataset.vidOpt) { setVid(e.target.dataset.vidOpt, e.target.value); render(); }
    if (e.target.id === 'set-vid-preset' && e.target.value) { const p = (store.get('coding-misk-video-presets', {}) || {})[e.target.value]; if (p) { store.set('coding-misk-video', { ...VIDEO_DEFAULTS, ...p }); toast(t('vidPresetLoaded', { name: e.target.value })); render(); } }
  });
  return { render };
}
