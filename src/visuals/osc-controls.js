// The Oscilloscope look's controls (oscilloscope-smudge D8), shared by the Settings card and the stage panel: the same
// rows, the same events, one store. A change is stored at once (the stage reads the settings each frame) and announced
// with OSC_EVENT, so the other place shows the same values without being drawn again.
import { OSC_KEY, OVERLAYS, MODES, PARAMS, LINKS, SHOWN, oscSettings } from './oscilloscope-rules.js';

export const OSC_EVENT = 'coding-misk-osc';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const opt = (v, cur, label) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(label)}</option>`;
const seg = (attr, items, cur) => `<div class="langs" role="group">${items.map(([v, l]) => `<button type="button" ${attr}="${esc(v)}" aria-pressed="${v === cur}">${esc(l)}</button>`).join('')}</div>`;
const row = (label, html, hint = '') => `<div class="set-row"><span class="lbl"${hint ? ` title="${esc(hint)}"` : ''}>${esc(label)}</span><div class="set-ctrl">${html}${hint ? `<p class="hint muted">${esc(hint)}</p>` : ''}</div></div>`;

// the rows: Screen, Mode, Oversample, every parameter (value and link), Defaults. t: the app's translate function
export function oscRows(S, t) {
  const param = k => {
    const [, lo, hi, step] = PARAMS.find(p => p[0] === k), v = S.values[k];
    return row(t(`osc:${k}`), `<span class="osc-param"><input type="range" data-osc-val="${k}" min="${lo}" max="${hi}" step="${step}" value="${v}" data-no-knob aria-label="${esc(t(`osc:${k}`))}"><output>${v}</output>
      <select data-osc-link="${k}" data-no-knob aria-label="${esc(t('oscLinkOf', { name: t(`osc:${k}`) }))}">${LINKS.map(l => opt(l, S.links[k], t(`oscLink:${l}`))).join('')}</select></span>`, t(`osc:${k}Hint`));
  };
  return `${row(t('oscOverlay'), `<select data-osc-opt="overlay" data-no-knob aria-label="${esc(t('oscOverlay'))}">${OVERLAYS.map(k => opt(k, S.overlay, t(`oscOverlay:${k}`))).join('')}</select>`, t('oscOverlayHint'))}
    ${row(t('oscMode'), seg('data-osc-mode', MODES.map(k => [k, t(`oscMode:${k}`)]), S.mode), t('oscModeHint'))}
    ${row(t('oscOversample'), seg('data-osc-over', [['1', t('cwYes')], ['0', t('cwNo')]], S.oversample ? '1' : '0'), t('oscOversampleHint'))}
    ${SHOWN.map(param).join('')}
    <div class="actions"><button type="button" class="btn" data-osc-defaults>${esc(t('cwDefaults'))}</button></div>`;
}

const read = store => oscSettings(store.get(OSC_KEY, null));
// an event on a control → the settings changed and stored; false when the event is not on one of these controls.
// from: 'card' or 'panel' (who changed it, in the announcement)
export function oscHandle(e, store, from) {
  const x = e.target && e.target.closest ? e.target.closest('[data-osc-val],[data-osc-link],[data-osc-opt],[data-osc-mode],[data-osc-over],[data-osc-defaults]') : null;
  if (!x) return false;
  const d = x.dataset, S = read(store);
  if (e.type === 'input' && d.oscVal) { S.values[d.oscVal] = +x.value; const o = x.nextElementSibling; if (o) o.textContent = x.value; }
  else if (e.type === 'change' && d.oscLink) S.links[d.oscLink] = x.value;
  else if (e.type === 'change' && d.oscOpt) S[d.oscOpt] = x.value;
  else if (e.type === 'click' && d.oscMode) S.mode = d.oscMode;
  else if (e.type === 'click' && d.oscOver) S.oversample = d.oscOver === '1';
  else if (e.type === 'click' && d.oscDefaults !== undefined) { store.remove(OSC_KEY); announce(from); return true; }
  else return false;
  store.set(OSC_KEY, S); announce(from);
  return true;
}
const announce = from => { try { document.dispatchEvent(new CustomEvent(OSC_EVENT, { detail: { from } })); } catch (e) { /* no DOM */ } };

// the values of the rows under `root` set from the stored settings (the slider being dragged is left alone)
export function oscSync(root, store) {
  if (!root) return;
  const S = read(store);
  for (const i of root.querySelectorAll('[data-osc-val]')) {
    const v = S.values[i.dataset.oscVal];
    if (document.activeElement !== i && +i.value !== v) i.value = v;
    const o = i.nextElementSibling; if (o) o.textContent = String(v);
  }
  for (const s of root.querySelectorAll('[data-osc-link]')) s.value = S.links[s.dataset.oscLink];
  for (const s of root.querySelectorAll('[data-osc-opt]')) s.value = S[s.dataset.oscOpt];
  for (const b of root.querySelectorAll('[data-osc-mode]')) b.setAttribute('aria-pressed', String(b.dataset.oscMode === S.mode));
  for (const b of root.querySelectorAll('[data-osc-over]')) b.setAttribute('aria-pressed', String((b.dataset.oscOver === '1') === S.oversample));
}
