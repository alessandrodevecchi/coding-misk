// The controls of how a song is made, shared by the radio and the New song panel of Compose (new-song-panel D2): the
// HTML moved out of the radio's render() and one event function. Each view passes its own store (song-options.js) and
// a prefix ('radio' keeps the ids the radio had, 'ns' for the panel); the data-* attributes are the contract both
// views listen to.
import { DICE, INVENT, CHEVRON, SLIDERS, POWER } from '../icons.js';
import { PROFILE_CHOICES, RADIO_CHOICES, RADIO_PROFILES, customControls } from '../endless/profile.js';
import { CONTROLS } from '../live/profiles.js';
import { COMMENT_PRESETS } from '../song/comments.js';
import { FUNCTION_PRESETS, FUNCTION_OPTIONS } from '../song/writer.js';
import { OPENINGS, PACES, DEVELOPMENTS } from '../song/shapes.js';
import { SESSION_SOURCES } from '../material/index.js';
import { styleKeys } from '../endless/recipe.js';
import { makeArtist, randomStyles, randomGenre, randomKnob, randomMix, KNOBS, genresOf } from '../endless/artist-maker.js';
import { freshSeed, stream } from '../endless/random.js';
import { voicePanel, voiceEvent } from '../endless/voice-panel.js';
import { voiceSoundHtml, syncVoiceSound, soundEvent, nextSound, cleanSound, soundShown } from '../endless/voice-sound.js';
import { cleanVoice } from '../endless/voice-options.js';
import { LENGTHS, LENGTH_MINUTES, cleanLength, hasLength } from '../endless/song-options.js';

export const fmt = n => (Math.round(n * 100) / 100).toString();
// an id of a view: the radio keeps the ids it had (radio-chaos, custom-toggle…), the panel gets its own (ns-chaos…)
export const idOf = (prefix, name, radioName = null) => (prefix === 'radio' ? radioName || `radio-${name}` : `${prefix}-${name}`);
export const COMMENT_KEYS = ['tracks', 'notes', 'steps'];
// the voices' code in Options (voice-track-tuning D11): "V:N code" (the narrator, key voice) and "V:T code" (the voice track)
export const VOICE_CODE_KEYS = ['voice', 'spoken'];
const mid = r => Math.round((r[0] + r[1]) / 2 * 20) / 20;

// a die: kind, tooltip key, optional visible label; the tooltip adds the seed of the last throw
// (the invent die, invented-styles D8: a die with a spark, drawn, not an emoji)
export const dieHtml = ({ t, esc, lastDice = {} }, kind, key, label = '', k = '') => `<button class="dice${kind === 'invent' ? ' dice-invent' : ''}" data-dice="${kind}"${k ? ` data-k="${k}"` : ''} title="${esc(t(key))}${lastDice[kind + k] ? ` · ${esc(t('diceSeed', { seed: lastDice[kind + k] }))}` : ''}" aria-label="${esc(t(key))}">${kind === 'invent' ? INVENT : DICE}${label ? `<span>${esc(label)}</span>` : ''}</button>`;

// the artist chips (the radio): Custom, the random artist with Keep and ×, the usable artists
export function artistChips({ state, t, tx, esc, artists, face }) {
  return `<div class="chips artist-chips" role="group"><button class="chip" data-artist="" aria-pressed="${!state.artist}">${esc(t('radioCustom'))}</button>${state.temp ? `<span class="chip temp-artist" aria-pressed="${state.artist === state.temp.id}"><button class="plain" data-artist="${esc(state.temp.id)}" title="${esc(tx(state.temp.bio || {}))} · ${esc(t('diceSeed', { seed: state.temp.portrait.seed.replace(/-face$/, '') }))}"><img class="portrait tiny" src="${face(state.temp)}" alt=""> ${esc(state.temp.name)}</button><button class="plain keep" data-keep title="${esc(t('diceKeepHint'))}">${esc(t('diceKeep'))}</button><button class="plain" data-temp-drop aria-label="${esc(t('diceDrop'))}" title="${esc(t('diceDrop'))}">×</button></span>` : ''}${artists.map(a => `<button class="chip" data-artist="${esc(a.id)}" aria-pressed="${state.artist === a.id}" title="${esc(tx(a.bio || {}))}"><img class="portrait tiny" src="${face(a)}" alt=""> ${esc(a.name)}</button>`).join('')}</div>`;
}
// the artist as a select (the panel's quick row): Custom, the random artist when one is drawn, the usable artists
export function artistSelect({ state, t, esc, artists, prefix }) {
  const opt = (id, label) => `<option value="${esc(id)}"${(state.artist || '') === id ? ' selected' : ''}>${esc(label)}</option>`;
  return `<select id="${idOf(prefix, 'artist')}" data-artist-pick data-no-knob aria-label="${esc(t('nsArtist'))}">${opt('', t('radioCustom'))}${state.temp ? opt(state.temp.id, `${state.temp.name} · ${t('nsRandomArtist')}`) : ''}${artists.map(a => opt(a.id, a.name)).join('')}</select>`;
}
// the style chips, after the trial style's chip when one is being tried (invented-styles D9)
export const styleChips = ({ state, recipes, t, tx, esc }) => `${trialChip({ state, t, tx, esc })}<div class="chips" role="group">${recipes.map(r => `<button class="chip" data-style="${esc(r.id)}" aria-pressed="${state.styles.includes(r.id)}" title="${esc(r.description || t('tipStyles'))}">${esc(tx(r.name))}</button>`).join('')}</div>${trialHint({ state, recipes, t, tx, esc })}`;
// under the chips during a trial: where the parts come from, and what × gives back
export function trialHint({ state, recipes, t, tx, esc }) {
  const r = state.tempStyle;
  if (!r) return '';
  const back = ((state.trialBefore || {}).styles || []).map(id => recipes.find(x => x.id === id)).filter(Boolean).map(x => tx(x.name));
  return `<p class="hint muted small trial-hint"><strong>${esc(t('inventTrialHint'))}</strong> ${esc(r.description || '')}${back.length ? ` ${esc(t('inventDropBack', { styles: back.join(' + ') }))}` : ''}</p>`;
}
// the trial style (invented-styles D9): its name, "in prova", its genre, and Tieni, Ancora, ×; the name toggles it like
// any style chip. The tooltip says where each part came from and the seed
export function trialChip({ state, t, tx, esc }) {
  const r = state.tempStyle;
  if (!r) return '';
  const on = state.styles.includes(r.id), tip = `${r.description || ''} · ${t('diceSeed', { seed: (r.invented || {}).seed || '' })}`;
  return `<div class="chips trial-row"><span class="chip trial-style" aria-pressed="${on}"><button class="plain" data-style="${esc(r.id)}" aria-pressed="${on}" title="${esc(tip)}"><strong>${esc(tx(r.name))}</strong> · <em>${esc(t('inventTrial'))}</em> <span class="muted">(${esc(t('inventGenreOf', { g: t(`g:${r.genre || 'experimental'}`) }))})</span></button><button class="plain keep" data-trial-keep title="${esc(t('inventKeepHint'))}">${esc(t('diceKeep'))}</button><button class="plain" data-trial-again title="${esc(t('inventAgainHint'))}">${esc(t('inventAgain'))}</button><button class="plain" data-trial-drop aria-label="${esc(t('inventDropHint'))}" title="${esc(t('inventDropHint'))}">×</button></span></div>`;
}
// the name of a style id: a known style, the trial style, or the id itself
export const styleNameOf = (recipes, state, tx) => id => { const r = recipes.find(x => x.id === id) || (state && state.tempStyle && state.tempStyle.id === id ? state.tempStyle : null); return r ? tx(r.name) : id; };
// the genre chips (new-song-panel D5): a genre with at least one style; on when every style of it is picked
export function genreChips({ state, recipes, t, esc }) {
  return `<div class="chips genre-chips" role="group">${genresOf(recipes).map(g => { const ids = recipes.filter(r => r.genre === g).map(r => r.id), on = ids.length && ids.every(id => state.styles.includes(id)); return `<button class="chip small" data-genre-pick="${esc(g)}" aria-pressed="${!!on}" title="${esc(t('nsGenreTip'))}">${esc(t(`g:${g}`))}</button>`; }).join('')}</div>`;
}
// a knob (chaos, energy, complexity, talk) with its die; value and mark: the radio's compilation shows the song on air's
// value and the lock of a knob held by hand; fader: the hardware theme draws it as a fader (D10)
export function knobSlider({ t, esc, lastDice, prefix }, k, label, help, { value, mark = '', fromComp = false, fader = false } = {}) {
  const tip = key => `title="${esc(t(key))}"`, id = idOf(prefix, k);
  return `<div class="ctrl${fromComp ? ' from-comp' : ''}" ${tip(help)}><div class="row"><label class="lbl" for="${id}">${esc(t(label))}</label>${mark}${dieHtml({ t, esc, lastDice }, 'knob', 'diceKnob', '', k)}<output>${fmt(value)}</output></div><input id="${id}" type="range" min="0" max="1" step="0.05" value="${value}" data-opt="${k}"${fader ? ' data-fader="h"' : ''} ${tip(help)}></div>`;
}
// the dice of the knobs with the range switch, and the sounds die with its seed
export function diceRow({ state, t, esc, lastDice }) {
  const tip = key => `title="${esc(t(key))}"`, die = (...a) => dieHtml({ t, esc, lastDice }, ...a);
  return `<div class="dice-row"><span class="lbl">${esc(t('diceKnobsLbl'))}</span><span class="dice-combo">${die('knobs', 'diceKnobs')}<button class="dice-mode" data-dice-mode ${tip(state.diceRange ? 'diceRangeInTip' : 'diceRangeFullTip')}><span class="comp-lcd">${esc(state.diceRange ? t('diceRangeIn') : t('diceRangeFull'))}</span></button></span>
          <span class="dice-sounds">${die('sounds', 'diceSounds', t('diceSoundsLbl'))}${state.sounds ? `<span class="muted small mono" title="${esc(t('diceSoundsOn'))}">${esc(state.sounds)}</span><button class="plain" data-sounds-clear aria-label="${esc(t('diceSoundsClear'))}" title="${esc(t('diceSoundsClear'))}">×</button>` : ''}</span></div>`;
}
// the material seg; the radio shows its default when the console picked another
export function materialSeg({ state, t, esc, prefix }, { showDefault = false } = {}) {
  const lbl = prefix === 'radio' ? 'mat-source-lbl' : `${prefix}-mat-lbl`;
  return `<div class="mat-source" title="${esc(t('matSourceTip'))} ${esc(t(prefix === 'radio' ? 'matConsoleTip' : 'nsMatTip'))}"><span class="lbl" id="${lbl}">${esc(t('matSource'))}</span><span class="seg" role="radiogroup" aria-labelledby="${lbl}">${SESSION_SOURCES.map(m => `<button class="chip small" role="radio" data-material="${m}" aria-checked="${state.material === m}" aria-pressed="${state.material === m}" title="${esc(t(`mat:${m}`))}">${esc(t(`matShort:${m}`))}</button>`).join('')}</span>${showDefault && state.material !== state.materialDefault ? `<span class="muted small">${esc(t('matDefaultIs', { m: t(`matShort:${state.materialDefault}`) }))}</span>` : ''}</div>`;
}
// the Profile select
export function profileSelect({ state, t, esc, prefix }) {
  const tip = key => `title="${esc(t(key))}"`;
  return `<label class="ctrl" ${tip('radioProfileTip')}><span class="lbl">${esc(t('radioProfile'))}</span><select id="${idOf(prefix, 'profile')}" data-song-profile data-no-knob>${RADIO_CHOICES.map(k => `<option value="${k}"${state.profile === k ? ' selected' : ''}>${esc(t(k === 'artist' ? 'byArtistStyle' : k === 'custom' ? 'radioCustomProfile' : `profile:${k}`))}</option>`).join('')}</select></label>`;
}
// what the Custom controls amount to, in one line (the section folded)
export function customSummary(C, t) {
  const grow = C.build === 'crescendo', natural = grow && C.growth === 'natural';
  return [grow ? t(`growth:${C.growth}`) : t('liveBlocks'), natural ? t(`dur:${C.duration}`) : '', grow ? t({ now: 'liveCodeNow', compact: 'liveCodeCompact', track: 'liveCodeTrack', sections: 'liveCodeSections' }[C.view]) : '',
    t(`comments:${C.comments}`), `${t('fnsLbl')}: ${t(`fns:${C.functions}`)}`, C.typist === 'human' ? t('liveHuman') : '', C.narratorStyle && C.narratorStyle !== 'auto' ? `${t('narratorStyleLbl')}: ${t(`narratorStyle:${C.narratorStyle}`)}` : ''].filter(Boolean).join(' · ');
}
// The same controls as Compose's live build panel, for every generated song from the next one (the radio's Custom
// profile). C: the controls shown (the radio: the Custom ones); open: the radio's fold (null: no fold, the panel);
// all: every control shown and enabled whatever the build (the panel, D5: a change makes the profile Custom);
// planned: the panel's Durata is set, the growth duration shows "In the chosen length" (D12)
export function customPanel({ state, t, esc, prefix }, { C = customControls(state.custom), open = null, all = false, planned = false } = {}) {
  const grow = C.build === 'crescendo', natural = grow && C.growth === 'natural';
  const sel = (k, values, label, hint, lab, dis = false) => `<label class="ctrl" title="${esc(t(hint))}"><span class="lbl">${esc(t(label))}</span><select data-custom="${k}" data-no-knob${dis ? ' disabled' : ''}>${values.map(v => `<option value="${v}"${String(C[k]) === String(v) ? ' selected' : ''}${v === 'custom' ? ' disabled' : ''}>${esc(lab(v))}</option>`).join('')}</select></label>`;
  const chip = (k, on, label, hint, disabled = false) => `<button class="chip small" data-custom-chip="${k}" aria-pressed="${!!on}" title="${esc(t(hint))}"${disabled ? ' disabled' : ''}>${esc(t(label))}</button>`;
  const shape = part => sel(part, ['auto', ...({ opening: OPENINGS, pace: PACES, development: DEVELOPMENTS.filter(d => d !== 'metamorphosis') }[part])], `${part}Lbl`, `${part}Hint`, v => (v === 'auto' ? t('shapeAuto') : t(`${part}:${v}`)));
  const durations = planned ? ['planned', 'fitted', 'free'] : ['fitted', 'free'];
  const duration = sel('duration', durations, 'durLbl', 'durHint', v => t(`dur:${v}`), all && !natural && !planned);
  const fromRow = `<div class="comp-line"><span class="lbl">${esc(t('radioCustomFrom'))}</span>${PROFILE_CHOICES.filter(k => k !== 'artist').map(k => `<button class="chip small" data-custom-base="${k}" aria-pressed="${state.profile === 'custom' && state.custom.base === k && !Object.keys(state.custom.controls || {}).length}" title="${esc(t(`profileHint:${k}`))}">${esc(t(`profile:${k}`))}</button>`).join('')}</div>`;
  const body = `${all ? '' : fromRow}
        <div class="custom-grid">
          ${sel('build', ['blocks', 'crescendo'], 'liveStyle', 'liveStyleHint', v => t(v === 'blocks' ? 'liveBlocks' : 'liveCrescendo'))}
          ${grow || all ? sel('growth', CONTROLS.growth, 'growthLbl', 'growthHint', v => t(`growth:${v}`), !grow) : ''}
          ${natural || all ? duration : ''}
          ${natural || all ? shape('opening') + shape('pace') + shape('development') : ''}
          ${grow || all ? sel('view', CONTROLS.view, 'liveCodeView', 'liveCompactHint', v => t({ now: 'liveCodeNow', compact: 'liveCodeCompact', track: 'liveCodeTrack', sections: 'liveCodeSections' }[v]), !grow) : ''}
          ${grow && !all ? sel('gen', CONTROLS.gen, 'liveGen', 'liveGenHint', v => t(v === 'standard' ? 'liveGenStandard' : 'liveGenIdiomatic')) : ''}
        </div>
        <div class="custom-row">${sel('comments', [...Object.keys(COMMENT_PRESETS), ...(C.comments === 'custom' ? ['custom'] : [])], 'commentsLbl', 'commentsHint', v => t(`comments:${v}`))}<div class="chips">${COMMENT_KEYS.map(k => chip(k, C[k] !== false, `cOpt:${k}`, `cOptHint:${k}`)).join('')}</div></div>
        <div class="custom-row">${sel('functions', [...Object.keys(FUNCTION_PRESETS), ...(C.functions === 'custom' ? ['custom'] : [])], 'fnsLbl', 'fnsHint', v => t(`fns:${v}`))}<div class="chips">${FUNCTION_OPTIONS.map(k => chip(k, C[k], `fOpt:${k}`, `fOptHint:${k}`)).join('')}</div></div>
        <div class="custom-row"><span class="lbl">${esc(t('liveOptions'))}</span><div class="chips">${chip('title', C.title, 'liveTitle', 'liveTitleHint')}${chip('highlights', C.highlights, 'liveHl', 'liveHlHint')}${chip('wrap', C.wrap, 'liveWrap', 'liveWrapHint')}${chip('typist', C.typist === 'human', 'liveHuman', 'liveHumanHint')}${chip('mistakes', C.mistakes !== 'off', 'liveMistakes', 'liveMistakesHint', C.typist !== 'human')}${VOICE_CODE_KEYS.map(k => chip(k, C[k] !== false, `cOpt:${k}`, `cOptHint:${k}`)).join('')}</div></div>`;
  if (open === null) return `<div class="radio-custom ns-custom" id="${idOf(prefix, 'custom')}">${body}</div>`;
  return `<div class="radio-custom" id="${idOf(prefix, 'custom')}">
      <button class="curves-toggle custom-toggle" id="${idOf(prefix, 'custom-toggle', 'custom-toggle')}" aria-expanded="${open}" aria-controls="${idOf(prefix, 'custom-body', 'custom-body')}" title="${esc(t('radioCustomTip'))}"><span class="tw">${CHEVRON}${SLIDERS}<span>${esc(t('radioCustomTitle'))}</span></span><span class="custom-summary">${esc(customSummary(C, t))}</span></button>
      <div class="custom-body" id="${idOf(prefix, 'custom-body', 'custom-body')}" ${open ? '' : 'hidden'}>
        ${body}
        <p class="hint muted small">${esc(t('radioCustomVoices'))}</p>
        <p class="hint muted small">${esc(t('radioCustomNext'))}</p>
      </div>
    </div>`;
}
// The Voices group (voice-full-controls D12, variant B): the settings for the next songs only, in two blocks, each with
// its switch (D15), a main row and folded parts (Sound, and the voice track's Phrases). The narrator style and Narrated
// growth keep the Custom-only rule (voice-placement); the knob, the switches and the Sound parts work with every profile.
// talkKnob: the narrator knob (option talk), drawn by the view's knob so its die, lock and compilation mark stay the same
// vfold(id): whether a folded part was left open; hint: the line under the group
export function voicesGroup({ state, t, esc, prefix }, { talkKnob = '', vfold = () => false, hint = 'radioVoicesHint' } = {}) {
  const opts = state, custom = opts.profile === 'custom', C = custom ? customControls(opts.custom) : RADIO_PROFILES.includes(opts.profile) ? customControls({ base: opts.profile, controls: {} }) : null;
  const vswitch = (k, on, label) => `<button class="vswitch" data-rvoice-switch="${k}" aria-pressed="${on}" title="${esc(t('voiceSwitchTip', { voice: t(label) }))}"><span class="vs-lamp" aria-hidden="true"></span>${POWER}<span class="vs-txt">${esc(t(on ? 'switchOn' : 'switchOff'))}</span></button>`;
  const narOn = opts.voices.narrator, trOn = opts.voices.track, grow = !!C && C.build === 'crescendo', lock = custom ? '' : t(opts.profile === 'artist' ? 'radioNarratorArtist' : 'radioNarratorCustomOnly');
  const narOff = narOn ? '' : t('voiceOffTip', { voice: t('narratorLbl') }), trOff = trOn ? '' : t('voiceOffTip', { voice: t('vinstLbl') });
  const tipOf = (k, off) => esc(narOff || lock || (off ? t(off) : t(k)));
  const style = C ? C.narratorStyle || 'auto' : 'auto';
  const tag = prefix === 'radio' ? '-r' : `-${prefix}`, fold = name => `${prefix}-${name}`;
  const sty = `<label class="ctrl" title="${tipOf('narratorStyleHint')}"><span class="lbl">${esc(t('narratorStyleLbl'))}</span><select data-custom="narratorStyle" data-no-knob${!custom || !narOn ? ' disabled' : ''}>${CONTROLS.narratorStyle.map(v => `<option value="${v}"${style === v ? ' selected' : ''}>${esc(t(`narratorStyle:${v}`))}</option>`).join('')}</select></label>`;
  const ngr = `<button class="chip small" data-custom-chip="narrated" aria-pressed="${!!(C && C.narrated)}" title="${tipOf('liveNarratedHint', !grow ? 'narratedNeedsCrescendo' : '')}"${!custom || !grow || !narOn ? ' disabled' : ''}>${esc(t('liveNarrated'))}</button>`;
  const narSound = voiceSoundHtml({ voice: 'narrator', settings: soundShown(opts.narratorSound), t, esc, radio: opts.narratorSound, off: narOff, open: vfold(fold('narrator-sound')), fold: fold('narrator-sound'), tag });
  const v = opts.voice, trSound = voiceSoundHtml({ voice: 'spoken', settings: soundShown(v.sound), t, esc, radio: v.sound, off: trOff, open: vfold(fold('spoken-sound')), fold: fold('spoken-sound'), tag });
  const phrases = `<details class="voice-part" data-vfold="${fold('spoken-phrases')}"${vfold(fold('spoken-phrases')) ? ' open' : ''}><summary><span class="lbl">${esc(t('vinstPhrasesPart'))}</span> <span class="vs-sum">${esc([t(`vinstPhrases:${v.phrases}`), t(`vinstKind:${v.kind}`), ...v.where.map(w => t(`vinstWhere:${w}`))].join(' · '))}</span></summary>${voicePanel(v, { t, esc, mode: 'radio', only: 'options', off: trOff })}</details>`;
  return `<div class="radio-voices" id="${idOf(prefix, 'voices')}" role="group" aria-labelledby="${idOf(prefix, 'voices-lbl')}"><span class="lbl" id="${idOf(prefix, 'voices-lbl')}" title="${esc(t('voicesHint'))}">${esc(t('voicesLbl'))}</span>
      <div class="voice-block voices-nar${narOn ? '' : ' off'}" id="${idOf(prefix, 'narrator')}"><div class="vb-head"><span class="lbl voices-sub">${esc(t('narratorLbl'))}</span>${vswitch('narrator', narOn, 'narratorLbl')}</div>
        ${narOn ? '' : `<p class="hint muted small">${esc(t('radioVoiceOffHint'))}</p>`}
        <div class="vb-main"><div class="ctrls voices-knob">${talkKnob}</div>${sty}<div class="chips">${ngr}</div></div>
        <div class="vb-parts" data-rsound="narrator">${narSound}</div></div>
      <div class="voice-block radio-voice${trOn ? '' : ' off'}" id="${idOf(prefix, 'voice')}"><div class="vb-head"><span class="lbl voices-sub" title="${esc(t('vinstHint'))}">${esc(t('vinstLbl'))}</span>${vswitch('track', trOn, 'vinstLbl')}</div>
        ${trOn ? '' : `<p class="hint muted small">${esc(t('radioVoiceOffHint'))}</p>`}
        <div class="vb-main">${voicePanel(v, { t, esc, mode: 'radio', only: 'main', off: trOff })}</div>
        <div class="vb-parts">${phrases}<div data-rsound="spoken">${trSound}</div></div></div>
      <p class="hint muted small" id="${idOf(prefix, 'voices-hint')}">${esc(t(hint))}</p></div>`;
}

// The Durata chips (new-song-panel D5, D12; the radio's Durata since phase 8): As the style, Short, Medium, Long, Exact
// with its minutes. The length is the length heard, growth included
export function lengthChips({ state, t, esc, prefix }) {
  const L = cleanLength(state.length), exact = typeof L === 'number';
  const chip = v => `<button class="chip small" data-song-length="${v}" aria-pressed="${v === 'exact' ? exact : L === v}" title="${esc(t(`nsLenTip:${v}`))}">${esc(t(`nsLen:${v}`))}</button>`;
  return `<div class="ctrl song-length" id="${idOf(prefix, 'length')}"><span class="lbl">${esc(t('nsLength'))}</span><div class="chips" role="group">${[...LENGTHS, 'exact'].map(chip).join('')}<label class="ns-min"${exact ? '' : ' hidden'}><input type="number" data-song-minutes min="${LENGTH_MINUTES[0]}" max="${LENGTH_MINUTES[1]}" step="0.5" value="${exact ? L : 3}" aria-label="${esc(t('nsMinutesLbl'))}" title="${esc(t('nsLenTip:exact'))}"> ${esc(t('rxMin'))}</label></div></div>`;
}
// a Durata picked: a Custom free growth gives way (D12: they exclude each other); ctx.freed: the line saying the length
// was turned off by a free growth goes
export function setLength(ctx, v) {
  const opts = ctx.options.state, L = cleanLength(v), patch = { length: L };
  if (hasLength(L) && opts.custom && opts.custom.controls && opts.custom.controls.duration === 'free') { const { duration: _, ...rest } = opts.custom.controls; patch.custom = { ...opts.custom, controls: rest }; }
  if (hasLength(L)) ctx.freed = false;
  Object.assign(opts, JSON.parse(JSON.stringify(patch)));
  ctx.options.save(Object.keys(patch));
  return { keys: ['length'], render: true };
}
// the growth duration picked with a Durata (D12): "in the chosen length" changes nothing; Libera or the fitted growth
// turns the Durata off (ctx.freed: its line shows)
export function lengthHook(ctx, k, v) {
  if (k !== 'duration') return null;
  if (v === 'planned') return { keys: [], render: true };
  if (hasLength(ctx.options.state.length)) { ctx.options.state.length = 'style'; ctx.freed = true; }
  return null;
}

// ---------- events ----------
// The rules every view follows when a song control changes: picking an artist sets the styles and knobs to its centre;
// touching the styles or a knob with an artist picked goes back to Custom; a die throws a fresh seed. The state is
// changed in place and saved through the view's store (options.save, its listeners told the keys).
// ctx: { options, recipes, artists(), keepArtist(a), toast, t, lastDice, root, comp }
//   comp: the radio's compilation rules ({ off(), lock(keys) }), or null (the panel)
//   onCustom(changes): a Custom control changed (the radio shows display controls on the song on air)
// → { keys, render } (render: the view draws again; false: the element was brought up to date in place), or null when
// the element is not a song control
export function pickArtist(ctx, id) {
  const { options, recipes } = ctx, opts = options.state, a = options.artistOf(id);
  if (ctx.comp) ctx.comp.off();
  if (!a) { opts.artist = null; options.save(['artist']); return { keys: ['artist'], render: true }; }
  opts.artist = a.id;
  { const taste = styleKeys(a.styles); opts.styles = Object.keys(taste).filter(s => taste[s] > 0 && recipes.some(r => r.id === s)); }
  for (const k of KNOBS) if (a[k]) opts[k] = mid(a[k]);
  options.save(['artist', 'styles', ...KNOBS]);
  return { keys: ['artist'], render: true };
}
// ---------- invented styles (invented-styles D8 to D10) ----------
// A trial style from a seed: ctx.invent(seed, { genre, base }) makes it (the page's maker, over the built-in styles).
// The state before the first trial is kept in trialBefore, so × gives it back; the trial plays alone, with the artist
// set to Custom and the compilation off, from the next song. ctx.onTrial(recipe): the radio adds it to the session on air
export function startTrial(ctx, seed, { genre = null, base } = {}) {
  const opts = ctx.options.state;
  if (!ctx.invent) return null;
  // the base: the first selected style half the time (the invention starts near what plays), else any
  const sel = opts.tempStyle ? (opts.trialBefore || {}).styles || [] : opts.styles;
  const b = base !== undefined ? base : !genre && sel.length && stream(seed, 'invent-base').chance(0.5) ? sel[0] : null;
  return applyTrial(ctx, ctx.invent(seed, { genre, base: b }));
}
// a ready invented style (the Styles tab's trial card, a Genres card) goes on trial
// (quiet: no toast, the caller says what happens)
export function applyTrial(ctx, recipe, { quiet = false } = {}) {
  const { options, t, toast } = ctx, opts = options.state;
  if (!recipe) return null;
  if (!opts.tempStyle) opts.trialBefore = { styles: opts.styles.slice(), artist: opts.artist || null, ...(ctx.comp ? { compilation: opts.compilation } : {}) };
  opts.tempStyle = recipe;
  opts.styles = [recipe.id];
  opts.artist = null;
  if (ctx.comp) ctx.comp.off();
  options.save(['tempStyle', 'trialBefore', 'styles', 'artist']);
  if (ctx.onTrial) ctx.onTrial(recipe);
  if (!quiet) toast(t(ctx.panel ? 'inventNextPanel' : 'inventNext'));
  return { keys: ['styles'], render: true };
}
// Tieni: the trial joins the user's styles (ctx.keepStyle(recipe) → its id, or null); the selection stays
export function keepTrial(ctx) {
  const { options, t, toast } = ctx, opts = options.state, r = opts.tempStyle;
  if (!r || !ctx.keepStyle) return { keys: [], render: false };
  const id = ctx.keepStyle(r);
  if (!id) return { keys: [], render: false };
  opts.tempStyle = null; opts.trialBefore = null;
  opts.styles = opts.styles.map(x => (x === r.id ? id : x));
  options.save(['tempStyle', 'trialBefore', 'styles']);
  toast(t('inventKept'));
  return { keys: ['styles'], render: true };
}
// ×: the trial goes, the styles, artist and compilation from before it come back
export function dropTrial(ctx) {
  const { options, recipes } = ctx, opts = options.state, r = opts.tempStyle, before = opts.trialBefore || {};
  if (!r) return { keys: [], render: false };
  const known = id => recipes.some(x => x.id === id);
  const back = (before.styles || []).filter(known), rest = opts.styles.filter(x => x !== r.id && known(x));
  opts.styles = back.length ? back : rest.length ? rest : [recipes[0].id];
  opts.artist = before.artist && options.artistOf(before.artist) ? before.artist : null;
  if (ctx.comp && before.compilation && before.compilation !== 'off') opts.compilation = before.compilation;
  opts.tempStyle = null; opts.trialBefore = null;
  options.save(['tempStyle', 'trialBefore', 'styles', 'artist']);
  return { keys: ['styles'], render: true };
}

// the random tools (#50): every throw has its own fresh seed; changes apply from the next song, like the controls
export function throwDice(ctx, kind, k) {
  const { options, recipes, t, toast } = ctx, opts = options.state, ids = recipes.map(r => r.id);
  const seed = freshSeed();
  ctx.lastDice[kind + (k || '')] = seed;
  if (kind === 'invent') return startTrial(ctx, seed) || { keys: [], render: false };
  if (kind === 'artist') { opts.temp = makeArtist(seed, recipes); return pickArtist(ctx, opts.temp.id); }
  if (kind === 'sounds') { opts.sounds = seed; options.save(['sounds']); toast(t('diceSoundsNext')); return { keys: ['sounds'], render: true }; }
  opts.artist = null;
  if ((kind === 'styles' || kind === 'genre') && ctx.comp) ctx.comp.off();
  if (kind === 'styles') opts.styles = randomMix(seed, recipes);
  if (kind === 'genre') { const g = randomGenre(seed, recipes); opts.styles = randomStyles(seed, recipes, { genre: g }); toast(t('diceGenreNow', { g: t(`g:${g}`) })); }
  if (kind === 'knob' && KNOBS.includes(k)) opts[k] = randomKnob(seed, k, opts.diceRange);
  if (kind === 'knobs') for (const x of KNOBS) opts[x] = randomKnob(seed, x, opts.diceRange);
  // during a compilation a thrown knob is held, like one moved by hand (#59)
  if (ctx.comp && (kind === 'knob' || kind === 'knobs')) ctx.comp.lock(kind === 'knob' ? [k] : KNOBS);
  if (!opts.styles.length) opts.styles = [ids[0]];
  options.save(['artist', 'styles', ...KNOBS]);
  return { keys: ['styles'], render: true };
}
// one Custom control changed: kept with the others. The panel (all) turns a profile into Custom based on it with the
// change (D5: "touching a control goes back to Custom"; the artist's choice becomes Custom based on Live coder)
export function setCustom(ctx, changes) {
  const opts = ctx.options.state;
  if (ctx.panel && opts.profile !== 'custom') {
    const base = RADIO_PROFILES.includes(opts.profile) ? opts.profile : 'switch';
    // (the profile's own growth duration is kept: Live coder grows free in Compose, unless a Durata holds)
    opts.profile = 'custom';
    opts.custom = { base, controls: { ...(ctx.baseControls ? ctx.baseControls(base) : {}), ...changes } };
  } else opts.custom = { base: opts.custom.base, controls: { ...(opts.custom.controls || {}), ...changes } };
  if (ctx.onCustom) ctx.onCustom(changes);
  ctx.options.save(['custom', 'profile']);
  return { keys: ['custom'], render: true };
}
// a click, change or input on a song control of a view
export function songControlEvent(ctx, el, type) {
  const { options, recipes, t, toast } = ctx, opts = options.state, d = el.dataset || {};
  if (type === 'click') {
    if (d.artist !== undefined) return pickArtist(ctx, d.artist);
    if (d.dice) return throwDice(ctx, d.dice, d.k);
    if (d.diceMode !== undefined) { opts.diceRange = !opts.diceRange; options.save(['diceRange']); return { keys: ['diceRange'], render: true }; }
    if (d.soundsClear !== undefined) { opts.sounds = null; options.save(['sounds']); return { keys: ['sounds'], render: true }; }
    if (d.keep !== undefined && opts.temp) { const id = ctx.keepArtist(opts.temp); if (id) { opts.temp = null; opts.artist = id; options.save(['artist', 'temp']); toast(t('diceKept')); return { keys: ['artist'], render: true }; } return { keys: [], render: false }; }
    if (d.trialKeep !== undefined) return keepTrial(ctx);
    if (d.trialDrop !== undefined) return dropTrial(ctx);
    if (d.trialAgain !== undefined) { const seed = freshSeed(); ctx.lastDice.invent = seed; return startTrial(ctx, seed) || { keys: [], render: false }; }
    if (d.tempDrop !== undefined) { if (opts.artist === (opts.temp && opts.temp.id)) opts.artist = null; opts.temp = null; options.save(['artist', 'temp']); return { keys: ['artist'], render: true }; }
    if (d.material) { const was = opts.material; opts.material = d.material; options.save(['material']); return { keys: was !== opts.material ? ['material'] : [], render: true }; }
    if (d.customBase) { opts.custom = { base: d.customBase, controls: {} }; if (ctx.panel) opts.profile = 'custom'; if (ctx.onCustom) ctx.onCustom(customControls(opts.custom)); options.save(['custom']); return { keys: ['custom'], render: true }; }
    if (d.vinstPreset || d.vinstWay || d.vinstWhere) { const v = voiceEvent(opts.voice, el, { mode: 'radio' }); if (!v) return { keys: [], render: false }; opts.voice = v; options.save(['voice']); return { keys: ['voice'], render: true }; }
    if (d.rvoiceSwitch) { const k = d.rvoiceSwitch; opts.voices = { ...opts.voices, [k]: !opts.voices[k] }; options.save(['voices']); return { keys: ['voices'], render: true }; }
    if (d.customChip) {
      const k = d.customChip, C = ctx.controls ? ctx.controls() : customControls(opts.custom);
      if (k === 'typist') return setCustom(ctx, { typist: C.typist === 'human' ? 'exact' : 'human' });
      if (k === 'mistakes') return setCustom(ctx, { mistakes: C.mistakes === 'off' ? 'on' : 'off' });
      return setCustom(ctx, { [k]: COMMENT_KEYS.includes(k) || VOICE_CODE_KEYS.includes(k) ? C[k] === false : !C[k] });
    }
    if (d.songLength) { if (d.songLength === 'exact') { const i = ctx.root && ctx.root.querySelector('[data-song-minutes]'); return setLength(ctx, i ? +i.value || 3 : 3); } return setLength(ctx, d.songLength); }
    if (d.genrePick) {
      // a genre picks its styles; a second press on a genre whose styles are all picked takes them out (one style stays)
      const ids = recipes.filter(r => r.genre === d.genrePick).map(r => r.id);
      if (!ids.length) return { keys: [], render: false };
      opts.artist = null;
      const all = ids.every(id => opts.styles.includes(id));
      const next = all ? opts.styles.filter(id => !ids.includes(id)) : [...opts.styles, ...ids.filter(id => !opts.styles.includes(id))];
      opts.styles = next.length ? next : opts.styles;
      options.save(['styles', 'artist']);
      return { keys: ['styles'], render: true };
    }
    if (d.style) {
      if (opts.artist) opts.artist = null;
      if (ctx.comp) ctx.comp.off();
      const id = d.style, has = opts.styles.includes(id);
      if (has && opts.styles.length === 1) { toast(t('radioOneStyle')); return { keys: [], render: false }; }
      opts.styles = has ? opts.styles.filter(x => x !== id) : [...opts.styles, id];
      options.save(['styles', 'artist']);
      el.setAttribute('aria-pressed', !has);
      // (the trial chip's frame follows its name, invented-styles D9)
      { const f = el.closest('.trial-style'); if (f) f.setAttribute('aria-pressed', !has); }
      if (ctx.root) ctx.root.querySelectorAll('[data-artist]').forEach(c => c.setAttribute('aria-pressed', c.dataset.artist === ''));
      return { keys: ['styles'], render: false };
    }
    return null;
  }
  if (type === 'change') {
    if (d.artistPick !== undefined) return pickArtist(ctx, el.value);
    if (d.songMinutes !== undefined) return setLength(ctx, +el.value || 3);
    if (d.songProfile !== undefined) { if (!RADIO_CHOICES.includes(el.value)) return null; opts.profile = el.value; options.save(['profile']); return { keys: ['profile'], render: true }; }
    if (d.vinst) { const v = voiceEvent(opts.voice, el, { mode: 'radio' }); if (!v) return { keys: [], render: false }; opts.voice = v; options.save(['voice']); return { keys: ['voice'], render: true }; }
    if (d.vsound || d.vsoundStyle) return soundChanged(ctx, el) ? { keys: ['sound'], render: false, end: true } : null;
    if (d.custom) {
      const k = d.custom, v = el.value;
      { const r = lengthHook(ctx, k, v); if (r) return r; }
      if (ctx.customHook) { const r = ctx.customHook(k, v); if (r) return r; }
      if (k === 'comments' && COMMENT_PRESETS[v]) return setCustom(ctx, { ...COMMENT_PRESETS[v] });
      if (k === 'functions' && FUNCTION_PRESETS[v]) return setCustom(ctx, { ...FUNCTION_PRESETS[v] });
      if (CONTROLS[k] && CONTROLS[k].map(String).includes(v)) return setCustom(ctx, { [k]: CONTROLS[k].find(x => String(x) === v) });
      return { keys: [], render: false };
    }
    return null;
  }
  if (type === 'input') {
    const k = d.opt;
    if (k) {
      if (opts.artist) { opts.artist = null; if (ctx.root) ctx.root.querySelectorAll('[data-artist]').forEach(c => c.setAttribute('aria-pressed', c.dataset.artist === '')); }
      opts[k] = +el.value;
      if (ctx.comp) ctx.comp.lock([k]);
      options.save([k]);
      el.closest('.ctrl').querySelector('output').textContent = fmt(opts[k]);
      return { keys: [k], render: false };
    }
    if (el.type === 'range' && d.vsound) return soundChanged(ctx, el) ? { keys: ['sound'], render: false } : null;
    return null;
  }
  return null;
}
// a Sound control of a voice: the option for the next songs, the part brought up to date without a new render (a
// control being dragged keeps its drag)
function soundChanged(ctx, el) {
  const ev = soundEvent(el); if (!ev) return false;
  const opts = ctx.options.state, key = ev.voice === 'narrator' ? 'narratorSound' : null, cur = key ? opts.narratorSound : opts.voice.sound, next = cleanSound(nextSound(cur, ev));
  if (key) opts.narratorSound = next; else opts.voice = cleanVoice({ ...opts.voice, sound: next });
  ctx.options.save([key || 'voice']);
  const box = ctx.root && ctx.root.querySelector(`[data-rsound="${ev.voice}"]`);
  if (box) syncVoiceSound(box, { voice: ev.voice, settings: soundShown(next), t: ctx.t, radio: next, off: '' });
  return true;
}
