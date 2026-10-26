// The voice instrument controls (voice-controls, #77) as HTML, for the radio, the next song by an artist in Compose and
// (voice-placement) the voice instrument track of the song being edited: presets, phrases per song, different or
// repeated phrases, the ways, where it speaks (voice-full-controls D7), and in the radio how often and the vocabulary
// the next songs draw from (D16), on and off (a new song) or New phrases (a track). The radio sets the presence with
// the preset (never over Sempre, D14); a new song keeps its own on/off; a track has none (it exists).
import { VOICE_PHRASES, VOICE_KINDS, VOICE_WAYS, VOICE_WHERE, VOICE_VOCABS, VOICE_PRESETS, RADIO_PRESENCE, SONG_PRESENCE, VOICE_PRESET_IDS, cleanVoice, presetOf, applyPreset, whereOf } from './voice-options.js';

// mode: 'radio', 'song' or 'track' (track: the track's id, kept on the panel)
// only: 'main' (presets, how often or New phrases), 'options' (phrases, kind, ways, where, the radio's vocabulary) or
// null (both, as before); off: the reason every control is disabled (a voice switched off), or ''
export function voicePanel(raw, { t, esc, mode = 'radio', track = '', only = null, off = '' }) {
  const radio = mode === 'radio', own = mode === 'track', v = cleanVoice(own ? { ...(raw || {}), presence: 'style' } : raw), preset = presetOf(v, { presence: radio });
  const presence = radio ? RADIO_PRESENCE : SONG_PRESENCE, never = v.presence === 'never';
  const dis = never || off ? ' disabled' : '', offTip = off ? ` title="${esc(off)}"` : '';
  const sel = (k, values, label, hint, lab) => `<label class="ctrl" title="${esc(off || t(hint))}"><span class="lbl">${esc(t(label))}</span><select data-vinst="${k}" data-no-knob${k === 'presence' ? (off ? ' disabled' : '') : dis}>${values.map(x => `<option value="${x}"${String(v[k]) === x ? ' selected' : ''}${k === 'presence' && radio ? ` title="${esc(t(`vinstPresenceTip:${x}`))}"` : ''}>${esc(lab(x))}</option>`).join('')}</select></label>`;
  const presets = VOICE_PRESET_IDS.map(id => `<button class="chip small" data-vinst-preset="${id}" aria-pressed="${preset === id}" title="${esc(off || t(`vinstPresetHint:${id}`))}"${dis}>${esc(t(`vinstPreset:${id}`))}</button>`).join('');
  const ways = VOICE_WAYS.map(w => `<button class="chip small" data-vinst-way="${w}" aria-pressed="${!!(v.ways && v.ways.includes(w))}" title="${esc(off || t('vinstWaysHint'))}"${dis}>${esc(t(`way:${w}`))}</button>`).join('');
  // Where (D7): the last flag on cannot be turned off
  const where = whereOf(v.where), whereChips = VOICE_WHERE.map(w => { const on = where.includes(w), last = on && where.length === 1; return `<button class="chip small" data-vinst-where="${w}" aria-pressed="${on}" title="${esc(off || t(last ? 'vinstWhereLast' : 'vinstWhereHint'))}"${dis}${last && !dis ? ' aria-disabled="true"' : ''}>${esc(t(`vinstWhere:${w}`))}</button>`; }).join('');
  const first = own ? `<div class="ctrl"><span class="lbl">&nbsp;</span><button class="btn small" data-vinst-redraw title="${esc(off || t('vinstRedrawHint'))}"${off ? ' disabled' : ''}>${esc(t('vinstRedraw'))}</button></div>`
    : sel('presence', presence, radio ? 'vinstPresenceLbl' : 'vinstSongLbl', radio ? 'vinstPresenceHint' : 'vinstSongHint', x => t(radio ? `vinstPresence:${x}` : `vinstSong:${x}`));
  // the radio (D12): How often and the preset as two menus, the main row of the Voce: traccia block
  const presetSel = `<label class="ctrl" title="${esc(off || t('vinstPresetLbl'))}"><span class="lbl">${esc(t('vinstPresetLbl'))}</span><select data-vinst="preset" data-no-knob${dis}>${[...VOICE_PRESET_IDS, ...(preset === 'custom' ? ['custom'] : [])].map(id => `<option value="${id}"${id === preset ? ' selected' : ''}${id === 'custom' ? ' disabled' : ''}>${esc(t(`vinstPreset:${id}`))}</option>`).join('')}</select></label>`;
  const mainRow = radio ? `<div class="vinst-row">${first}${presetSel}</div>`
    : `<div class="vinst-row"><div class="ctrl"${offTip}><span class="lbl" title="${esc(t('vinstPresetLbl'))}">${esc(t('vinstPresetLbl'))}</span><div class="chips" role="group">${presets}${preset === 'custom' ? `<span class="badge" data-vinst-custom>${esc(t('vinstPreset:custom'))}</span>` : ''}</div></div>${first}</div>`;
  const vocab = radio ? sel('vocab', VOICE_VOCABS, 'vinstFillLbl', 'vinstVocabHint', x => (x === 'style' ? t('vinstVocab:style') : t(`vocab:${x}`))) : '';
  const optRows = `<div class="vinst-row">${sel('phrases', VOICE_PHRASES, 'vinstPhrasesLbl', 'vinstPhrasesHint', x => t(`vinstPhrases:${x}`))}${sel('kind', VOICE_KINDS, 'vinstKindLbl', 'vinstKindHint', x => t(`vinstKind:${x}`))}
      <div class="ctrl" title="${esc(off || t('vinstWaysHint'))}"><span class="lbl">${esc(t('vinstWaysLbl'))}</span><div class="chips" role="group">${ways}${v.ways ? '' : `<span class="muted small" data-vinst-style-ways>${esc(t('vinstWaysStyle'))}</span>`}</div></div></div>
    <div class="vinst-row"><div class="ctrl" title="${esc(off || t('vinstWhereHint'))}"><span class="lbl">${esc(t('vinstWhereLbl'))}</span><div class="chips" role="group">${whereChips}</div></div>${vocab}</div>`;
  const body = only === 'main' ? mainRow : only === 'options' ? optRows : mainRow + optRows;
  return `<div class="vinst" data-vinst-mode="${mode}"${own ? ` data-vinst-track="${esc(track)}"` : ''}>${body}</div>`;
}
// the options after a click or a change in the panel, or null when the event is not the panel's (New phrases is the
// caller's: it changes the draw, not the options)
export function voiceEvent(raw, el, { mode = 'radio' } = {}) {
  const radio = mode === 'radio', own = mode === 'track', v = cleanVoice(own ? { ...(raw || {}), presence: 'style' } : raw);
  if (!el || !el.dataset) return null;
  if (el.dataset.vinstPreset) return applyPreset(el.dataset.vinstPreset, v, { presence: radio });
  let next = null;
  if (el.dataset.vinstWay) {
    const w = el.dataset.vinstWay, cur = v.ways || [];
    const list = cur.includes(w) ? cur.filter(x => x !== w) : [...cur, w];
    next = { ...v, ways: list.length ? list : null };
  } else if (el.dataset.vinstWhere) {
    const w = el.dataset.vinstWhere, cur = whereOf(v.where);
    if (cur.includes(w) && cur.length === 1) return null;
    next = { ...v, where: cur.includes(w) ? cur.filter(x => x !== w) : [...cur, w] };
  } else if (el.dataset.vinst) {
    const k = el.dataset.vinst, x = el.value;
    if (k === 'preset' && VOICE_PRESETS[x]) return applyPreset(x, v, { presence: radio });
    if (k === 'presence' && !own && (radio ? RADIO_PRESENCE : SONG_PRESENCE).includes(x)) next = { ...v, presence: x };
    if (k === 'phrases' && VOICE_PHRASES.includes(x)) next = { ...v, phrases: x };
    if (k === 'kind' && VOICE_KINDS.includes(x)) next = { ...v, kind: x };
    if (k === 'vocab') next = { ...v, vocab: x };
  }
  if (!next) return null;
  const c = cleanVoice(next);
  return { ...c, preset: presetOf(c, { presence: radio }) };
}
