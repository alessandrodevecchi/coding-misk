// The sound of a voice (voice-full-controls): the voice style picker, the speaker and the eight sound controls, as HTML,
// for the Compose Voices group (one value: the settings of the voice's track, design D1) and the radio Voices group
// (the next songs, D4). The ranges are the track panel's (CONTROLS.voice in main.js). In the hardware theme the
// controls are horizontal faders (data-fader="h", D17). Pure: the app and the Node checks build the same panel.
import { VOICE_DEFAULT, VOICE_STYLES, VOICE_STYLE_IDS, VOICE_SOUND_KEYS, styleOf } from '../song/format.js';
import { SPEAKERS } from '../song/build.js';

export const VOICES = ['narrator', 'spoken'];
// [key, label, min, max, step, format]: format "pct" shows 50%, "num" the number, "cut" the filter on a log scale
export const SOUND_CONTROLS = [
  ['gain', 'volume', 0, 1, 0.01, 'pct'], ['pitch', 'pitch', 0.5, 2, 0.05, 'num'], ['tempo', 'voiceTempo', 0.25, 2, 0.05, 'num'],
  ['cutoff', 'filter', 0, 100, 1, 'cut'], ['hpf', 'lowCut', 0, 2000, 10, 'num'], ['drive', 'drive', 0, 4, 0.1, 'num'],
  ['room', 'reverb', 0, 1, 0.01, 'pct'], ['delay', 'delay', 0, 1, 0.01, 'pct'],
];
// the filter on a log scale, 100 Hz … 20 kHz (as the track panel)
export const cutToRange = c => Math.round(Math.log(c / 100) / Math.log(200) * 100);
export const rangeToCut = v => Math.round(100 * Math.pow(200, v / 100));
export const soundText = (k, v) => (k === 'cutoff' ? (v >= 18000 ? '∞' : `${v} Hz`) : SOUND_CONTROLS.find(c => c[0] === k)[5] === 'pct' ? `${Math.round(v * 100)}%` : String(v));
const cap = s => s[0].toUpperCase() + s.slice(1);
export const speakerName = s => (s ? cap(s) : '');

// The radio sound option of a voice ({ style: 'auto' | <style> | 'custom', settings?, speaker? }), cleaned: unknown
// values read as "auto" (each song draws its voice, as before)
export function cleanSound(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const style = r.style === 'custom' || VOICE_STYLE_IDS.includes(r.style) ? r.style : 'auto';
  const out = { style };
  if (style === 'custom' && r.settings && typeof r.settings === 'object') {
    const s = {};
    for (const k of [...VOICE_SOUND_KEYS, 'gain']) if (Number.isFinite(r.settings[k])) s[k] = r.settings[k];
    out.settings = s;
  }
  if (typeof r.speaker === 'string' && SPEAKERS.includes(r.speaker)) out.speaker = r.speaker;
  return out;
}
export const isAutoSound = raw => { const s = cleanSound(raw); return s.style === 'auto' && !s.speaker; };
// the settings a radio sound option puts over a drawn voice: the style's seven values, or the custom ones (with the
// volume when set), and the speaker when one is set; {} for "auto"
export function soundPatch(raw) {
  const s = cleanSound(raw), out = {};
  if (VOICE_STYLE_IDS.includes(s.style)) Object.assign(out, VOICE_STYLES[s.style]);
  if (s.style === 'custom' && s.settings) Object.assign(out, s.settings);
  if (s.speaker) out.speaker = s.speaker;
  return out;
}
// the values the radio panel shows for an option: the default voice with the option on top
export const soundShown = raw => ({ ...VOICE_DEFAULT, ...soundPatch(raw) });

// the one-line summary of a sound: "Deep · Shelley" (the style, the speaker)
export function soundSummary(settings, { t, radio = null, voice = 'narrator' }) {
  const style = radio ? cleanSound(radio).style : styleOf(settings), sp = radio ? cleanSound(radio).speaker || '' : (settings && settings.speaker) || '';
  const spk = sp ? speakerName(sp) : t(radio ? 'speakerStyle' : voice === 'narrator' ? 'speakerDefaultShort' : 'speakerDrawnShort');
  return `${t(`voiceStyle:${style}`)} · ${spk}`;
}

// The Sound part of a voice: a <details> folded by default (open: its remembered state), with the style picker, the
// speaker and the eight controls. voice: 'narrator' | 'spoken'; settings: the values shown; radio: the radio option
// (the picker then offers "As the style"); off: the reason the controls are disabled (a tooltip), or ''.
export function voiceSoundHtml({ voice, settings, t, esc, radio = null, off = '', open = false, fold = '' }) {
  const v = { ...VOICE_DEFAULT, ...(settings || {}) }, dis = off ? ' disabled' : '', tip = off ? ` title="${esc(off)}"` : '';
  const style = radio ? cleanSound(radio).style : styleOf(v);
  const styles = [...(radio ? ['auto'] : []), ...VOICE_STYLE_IDS, 'custom'];
  const styleSel = `<label class="ctrl vs-style"${tip}><span class="lbl">${esc(t('voiceStyleLbl'))}</span><select data-vsound-style="${voice}" data-no-knob title="${esc(off || t('voiceStyleTip'))}"${dis}>${styles.map(s => `<option value="${s}"${s === style ? ' selected' : ''}${s === 'custom' ? ' disabled' : ''}>${esc(t(`voiceStyle:${s}`))}</option>`).join('')}</select></label>`;
  const sp = radio ? cleanSound(radio).speaker || '' : v.speaker || '';
  const first = radio ? t('speakerStyle') : voice === 'narrator' ? t('speakerDefault') : t('speakerDrawn');
  const spkSel = `<label class="ctrl vs-speaker"${tip}><span class="lbl">${esc(t('speaker'))}</span><select data-vsound="${voice}:speaker" data-no-knob title="${esc(off || t('speaker'))}"${dis}><option value="">${esc(first)}</option>${SPEAKERS.map(k => `<option value="${k}"${k === sp ? ' selected' : ''}>${esc(speakerName(k))}</option>`).join('')}</select></label>`;
  const ranges = SOUND_CONTROLS.map(([k, label, min, max, step]) => {
    const val = k === 'cutoff' ? cutToRange(v[k]) : v[k];
    return `<div class="ctrl vs-ctl" data-vs-ctl="${k}"${tip}><div class="row"><label class="lbl" for="vs-${voice}-${k}${radio ? '-r' : ''}">${esc(t(label))}</label><output data-vsound-out="${voice}:${k}">${esc(soundText(k, v[k]))}</output></div><input type="range" id="vs-${voice}-${k}${radio ? '-r' : ''}" data-vsound="${voice}:${k}" data-fader="h" min="${min}" max="${max}" step="${step}" value="${val}" title="${esc(off || t(label))}"${dis}></div>`;
  }).join('');
  return `<details class="voice-part vs-part" data-vfold="${esc(fold || `${radio ? 'radio' : 'compose'}-${voice}-sound`)}"${open ? ' open' : ''}><summary><span class="lbl">${esc(t('soundLbl'))}</span> <span class="vs-sum" data-vsound-sum="${voice}">${esc(soundSummary(v, { t, radio, voice }))}</span></summary>
    <div class="vs-body"><div class="vs-pick">${styleSel}${spkSel}</div><div class="vs-grid">${ranges}</div></div></details>`;
}
// The values of a Sound part brought up to date without rebuilding it (a control being dragged keeps its drag): every
// input but the focused one, the outputs, the style picker and the summary
export function syncVoiceSound(box, { voice, settings, t, radio = null, off = '' }) {
  if (!box) return;
  const v = { ...VOICE_DEFAULT, ...(settings || {}) }, active = document.activeElement;
  for (const [k] of SOUND_CONTROLS) {
    const i = box.querySelector(`[data-vsound="${voice}:${k}"]`), o = box.querySelector(`[data-vsound-out="${voice}:${k}"]`);
    if (i && i !== active) i.value = k === 'cutoff' ? cutToRange(v[k]) : v[k];
    if (i) i.disabled = !!off;
    if (o) o.textContent = soundText(k, v[k]);
  }
  const sp = box.querySelector(`[data-vsound="${voice}:speaker"]`);
  if (sp && sp !== active) sp.value = radio ? cleanSound(radio).speaker || '' : v.speaker || '';
  const st = box.querySelector(`[data-vsound-style="${voice}"]`);
  if (st && st !== active) st.value = radio ? cleanSound(radio).style : styleOf(v);
  const sum = box.querySelector(`[data-vsound-sum="${voice}"]`);
  if (sum) sum.textContent = soundSummary(v, { t, radio, voice });
}
// the patch a Sound control asks for: { voice, patch } (a style: its seven values; a control: its value), or null
export function soundEvent(el) {
  if (!el || !el.dataset) return null;
  if (el.dataset.vsoundStyle) {
    const s = el.value;
    if (s === 'auto') return { voice: el.dataset.vsoundStyle, style: 'auto', patch: {} };
    if (!VOICE_STYLES[s]) return null;
    return { voice: el.dataset.vsoundStyle, style: s, patch: { ...VOICE_STYLES[s] } };
  }
  if (!el.dataset.vsound) return null;
  const [voice, k] = el.dataset.vsound.split(':');
  if (k === 'speaker') return { voice, patch: { speaker: el.value } };
  const x = +el.value;
  if (!Number.isFinite(x)) return null;
  return { voice, patch: { [k]: k === 'cutoff' ? rangeToCut(x) : x } };
}
// a radio sound option after a patch: a style picked; "auto"; or the values shown with the patch, as Custom (or as
// the style they match)
export function nextSound(raw, ev) {
  const cur = cleanSound(raw), speaker = 'speaker' in ev.patch ? ev.patch.speaker : cur.speaker;
  const sp = speaker ? { speaker } : {};
  if (ev.style === 'auto') return { style: 'auto', ...sp };
  if (ev.style) return { style: ev.style, ...sp };
  if (Object.keys(ev.patch).every(k => k === 'speaker')) return { ...cur, ...sp, ...(speaker ? {} : { speaker: undefined }) };
  const shown = { ...soundShown(cur), ...ev.patch }, style = styleOf(shown);
  if (style !== 'custom' && Math.abs((shown.gain ?? VOICE_DEFAULT.gain) - VOICE_DEFAULT.gain) < 1e-9) return { style, ...sp };
  const settings = Object.fromEntries([...VOICE_SOUND_KEYS, 'gain'].map(k => [k, shown[k]]));
  return { style: 'custom', settings, ...sp };
}
