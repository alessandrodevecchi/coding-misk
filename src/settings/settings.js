// The settings page (#31): appearance, audio, radio defaults and the data kept in this browser.
// It is opened from the gear in the top bar; theme and language stay in the top bar too, for quick tests.
import { makeBackup, mergeBackup } from './backup.js';
import { downloadJson, pickJsonFiles } from '../library/library.js';
import { TRANSITION_KINDS, HARMONY_MODES } from '../endless/artist.js';

export const EXPORT_FORMATS = ['wav', 'opus'];

export function createSettings({ root, t, tx, esc, store, looks, app, toast, confirmTwice }) {
  const opt = (v, cur, label) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(label)}</option>`;
  const seg = (attr, items, cur) => `<div class="langs" role="group">${items.map(([v, l]) => `<button ${attr}="${esc(v)}" aria-pressed="${v === cur}">${esc(l)}</button>`).join('')}</div>`;
  const row = (label, html, hint = '') => `<div class="set-row"><span class="lbl">${esc(label)}</span><div class="set-ctrl">${html}${hint ? `<p class="hint muted">${esc(hint)}</p>` : ''}</div></div>`;

  function render() {
    if (root.hidden) return;
    const r = app.radioSettings();
    root.innerHTML = `<p class="intro">${esc(t('setIntro'))}</p>
      <div class="set-grid">
        <div class="card set-card"><h3>${esc(t('setLook'))}</h3>
          ${row(t('setTheme'), seg('data-set-ui', [['neon', 'NEON'], ['hw', 'HW']], app.ui()))}
          ${row(t('setLang'), seg('data-set-lang', [['it', 'IT'], ['en', 'EN']], app.lang()))}
          ${row(t('setRadioLook'), `<select id="set-radio-look" data-no-knob>${looks.map(([k, l]) => opt(k, store.get('coding-misk-radio-look', 'studio'), tx(l))).join('')}</select>`, t('setRadioLookHint'))}
        </div>
        <div class="card set-card"><h3>${esc(t('setAudio'))}</h3>
          ${row(t('setVolume'), `<span class="set-vol"><input type="range" id="set-volume" min="0" max="100" step="1" value="${app.volume()}" data-no-knob><output>${app.volume()}%</output></span>`)}
          ${row(t('setFormat'), `<select id="set-format" data-no-knob>${opt('wav', store.get('coding-misk-export-format', 'wav'), t('setWav'))}${opt('opus', store.get('coding-misk-export-format', 'wav'), t('setOpus'))}</select>`, t('setFormatHint'))}
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
  }

  const entries = () => { const out = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); out.push([k, store.get(k, null)]); } return out; };
  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.setUi) { app.setUi(b.dataset.setUi); return render(); }
    if (b.dataset.setLang) { app.setLang(b.dataset.setLang); return render(); }
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
    if (e.target.id === 'set-format') store.set('coding-misk-export-format', e.target.value);
    if (e.target.dataset.radioOpt) app.setRadio(e.target.dataset.radioOpt, e.target.value);
  });
  return { render };
}
