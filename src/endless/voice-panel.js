// The voice instrument controls (voice-controls, #77) as HTML, for the radio console and the new song from an artist in
// Compose: presets, phrases per song, different or repeated phrases, the ways, and how often (the radio) or on and off
// (a single song). The radio sets the presence with the preset; a single song keeps its own on/off.
import { VOICE_PHRASES, VOICE_KINDS, VOICE_WAYS, RADIO_PRESENCE, SONG_PRESENCE, VOICE_PRESET_IDS, cleanVoice, presetOf, applyPreset } from './voice-options.js';

// mode: 'radio' or 'song'
export function voicePanel(raw, { t, esc, mode = 'radio' }) {
  const radio = mode === 'radio', v = cleanVoice(raw), preset = presetOf(v, { presence: radio });
  const presence = radio ? RADIO_PRESENCE : SONG_PRESENCE, off = v.presence === 'never';
  const dis = off ? ' disabled' : '';
  const sel = (k, values, label, hint, lab) => `<label class="ctrl" title="${esc(t(hint))}"><span class="lbl">${esc(t(label))}</span><select data-vinst="${k}" data-no-knob${k === 'presence' ? '' : dis}>${values.map(x => `<option value="${x}"${String(v[k]) === x ? ' selected' : ''}>${esc(lab(x))}</option>`).join('')}</select></label>`;
  const presets = VOICE_PRESET_IDS.map(id => `<button class="chip small" data-vinst-preset="${id}" aria-pressed="${preset === id}" title="${esc(t(`vinstPresetHint:${id}`))}"${dis}>${esc(t(`vinstPreset:${id}`))}</button>`).join('');
  const ways = VOICE_WAYS.map(w => `<button class="chip small" data-vinst-way="${w}" aria-pressed="${!!(v.ways && v.ways.includes(w))}" title="${esc(t('vinstWaysHint'))}"${dis}>${esc(t(`way:${w}`))}</button>`).join('');
  return `<div class="vinst" data-vinst-mode="${mode}">
    <div class="vinst-row">${sel('presence', presence, radio ? 'vinstPresenceLbl' : 'vinstSongLbl', radio ? 'vinstPresenceHint' : 'vinstSongHint', x => t(radio ? `vinstPresence:${x}` : `vinstSong:${x}`))}
      <div class="ctrl"><span class="lbl" title="${esc(t('vinstPresetLbl'))}">${esc(t('vinstPresetLbl'))}</span><div class="chips" role="group">${presets}${preset === 'custom' ? `<span class="badge" data-vinst-custom>${esc(t('vinstPreset:custom'))}</span>` : ''}</div></div></div>
    <div class="vinst-row">${sel('phrases', VOICE_PHRASES, 'vinstPhrasesLbl', 'vinstPhrasesHint', x => t(`vinstPhrases:${x}`))}${sel('kind', VOICE_KINDS, 'vinstKindLbl', 'vinstKindHint', x => t(`vinstKind:${x}`))}
      <div class="ctrl" title="${esc(t('vinstWaysHint'))}"><span class="lbl">${esc(t('vinstWaysLbl'))}</span><div class="chips" role="group">${ways}${v.ways ? '' : `<span class="muted small" data-vinst-style-ways>${esc(t('vinstWaysStyle'))}</span>`}</div></div></div>
  </div>`;
}
// the options after a click or a change in the panel, or null when the event is not the panel's
export function voiceEvent(raw, el, { mode = 'radio' } = {}) {
  const radio = mode === 'radio', v = cleanVoice(raw);
  if (!el || !el.dataset) return null;
  if (el.dataset.vinstPreset) return applyPreset(el.dataset.vinstPreset, v, { presence: radio });
  let next = null;
  if (el.dataset.vinstWay) {
    const w = el.dataset.vinstWay, cur = v.ways || [];
    const list = cur.includes(w) ? cur.filter(x => x !== w) : [...cur, w];
    next = { ...v, ways: list.length ? list : null };
  } else if (el.dataset.vinst) {
    const k = el.dataset.vinst, x = el.value;
    if (k === 'presence' && (radio ? RADIO_PRESENCE : SONG_PRESENCE).includes(x)) next = { ...v, presence: x };
    if (k === 'phrases' && VOICE_PHRASES.includes(x)) next = { ...v, phrases: x };
    if (k === 'kind' && VOICE_KINDS.includes(x)) next = { ...v, kind: x };
  }
  if (!next) return null;
  const c = cleanVoice(next);
  return { ...c, preset: presetOf(c, { presence: radio }) };
}
