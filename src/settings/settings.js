// The settings page (#31): appearance, audio, radio defaults and the data kept in this browser.
// It is opened from the gear in the top bar; theme and language stay in the top bar too, for quick tests.
import { makeBackup, mergeBackup } from './backup.js';
import { downloadJson, pickJsonFiles } from '../library/library.js';
import { TRANSITION_KINDS, HARMONY_MODES } from '../endless/artist.js';
import { OWN_IDS, STRUDEL_IDS, FONTS, SIZES, themeName, fontName } from '../code-themes/themes.js';
import { CODE_COLORS, REAL_SCOPES, LAYOUTS, QUALITIES, CARDS, VIDEO_DEFAULTS, SOULS, F_FORMATS, F_SHOWS, F_ASPECTS, F_CODE, F_FILES, fragmentOpts, fragmentSize, V_DEFAULTS } from '../video/layout.js';
import { FORMATS, MP3_RATES, formatOf } from '../export/encode.js';
import { VIEWS as SOUL_VIEWS, VIEW_NAMES as SOUL_VIEW_NAMES } from '../soul/data.js';
import { nextTagline } from '../video/fragments.js';
import { DICE, REVERT } from '../icons.js';
import { confirmInline } from '../library/songs-view.js';
import { SHAPE_CAP, SHAPE_CAP_MIN, SHAPE_CAP_MAX, shapeCapOf, SHAPE_KEEPS, shapeKeepOf, LONG_SONG, LONG_SONG_MIN, LONG_SONG_MAX, longSongOf } from '../song/crescendo.js';
import { shapeCounts } from '../song/shapes.js';
import { AIR_CHOOSERS, AIR_CHOOSER, chooserOf, chooserName } from '../endless/waypoints.js';
import { RENDERS } from '../music.js';
import { CW_KEY, CW_DEFAULTS, CW_INSTRUMENTS, CW_WINDOWS, CW_PARAMS, CW_SIZE_LIMITS, WIDGETS, widgetSettings } from '../live/widgets.js';
import { CAPTIONS_KEY, captionSettings, WHERES, STEP_FORMS } from '../captions/captions.js';
import { SPEAKER_KINDS, MARKS } from '../song/speakers.js';
import { SW_KEY, SW_OPEN, SW_LAYERS, SW_MAPPINGS, SW_COLOURS, SW_SILENT, SW_LIMITS, stageSettings } from '../visuals/stage-settings.js';

// the code widgets card (code-widgets D2): the sections left open, remembered in this browser
const CW_OPEN = 'coding-misk-cw-open';
const ARROW = d => `<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${d === 'up' ? 'M4 10l4-4 4 4' : 'M4 6l4 4 4-4'}"/></svg>`;


export function createSettings({ root, t, tx, esc, store, looks, app, toast, confirmTwice }) {
  const opt = (v, cur, label) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(label)}</option>`;
  const seg = (attr, items, cur) => `<div class="langs" role="group">${items.map(([v, l]) => `<button ${attr}="${esc(v)}" aria-pressed="${v === cur}">${esc(l)}</button>`).join('')}</div>`;
  const row = (label, html, hint = '') => `<div class="set-row"><span class="lbl">${esc(label)}</span><div class="set-ctrl">${html}${hint ? `<p class="hint muted">${esc(hint)}</p>` : ''}</div></div>`;

  function render() {
    if (root.hidden) return;
    const fmt = formatOf(store.get('coding-misk-export-format', 'wav')), r = app.radioSettings(), vid = { ...VIDEO_DEFAULTS, ...(store.get('coding-misk-video', {}) || {}) }, presets = store.get('coding-misk-video-presets', {}) || {}, fr = fragmentOpts(store.get('coding-misk-fragments', {}) || {}), shapeAll = store.get('coding-misk-shape-all', null) === true, counts = shapeCounts();
    root.innerHTML = `<p class="intro">${esc(t('setIntro'))}</p>
      <div class="set-grid">
        <div class="card set-card"><h3>${esc(t('setLook'))}</h3>
          ${row(t('setTheme'), seg('data-set-ui', [['neon', 'NEON'], ['hw', 'HW'], ['light', t('uiLight')]], app.ui()), t('setThemeHint'))}
          ${row(t('setUiFollow'), seg('data-set-ui-follow', [['1', t('cwYes')], ['0', t('cwNo')]], app.uiFollow() ? '1' : '0'), t('setUiFollowHint'))}
          ${row(t('setLang'), seg('data-set-lang', [['it', 'IT'], ['en', 'EN']], app.lang()))}
          ${row(t('setRadioLook'), `<select id="set-radio-look" data-no-knob>${looks.map(([k, l]) => opt(k, store.get('coding-misk-radio-look', 'palco'), tx(l))).join('')}</select>`, t('setRadioLookHint'))}
          ${row(t('setRender'), `<select id="set-render" data-no-knob>${RENDERS.map(([k, l]) => opt(k, store.get('coding-misk-render', 'normal'), tx(l))).join('')}</select>`, t('setRenderHint'))}
          ${row(t('setRenderLight'), `<select id="set-render-light" data-no-knob>${['auto', 'on', 'off'].map(k => opt(k, store.get('coding-misk-render-light', 'auto'), t(`setRenderLight:${k}`))).join('')}</select>`, t('setRenderLightHint'))}
          ${codeRows()}
        </div>
        ${captionsCard()}
        <div class="card set-card"><h3>${esc(t('setAudio'))}</h3>
          ${row(t('setVolume'), `<span class="set-vol"><input type="range" id="set-volume" min="0" max="100" step="1" value="${app.volume()}" data-no-knob><output>${app.volume()}%</output></span>`)}
          ${row(t('setFormat'), `<select id="set-format" data-no-knob>${FORMATS.map(f => opt(f, fmt, t(`set${f[0].toUpperCase()}${f.slice(1)}`))).join('')}</select>`, t('setFormatHint'))}
          ${fmt === 'mp3' ? row(t('setMp3Rate'), seg('data-set-mp3', MP3_RATES.map(r => [String(r), `${r} kbps`]), String(store.get('coding-misk-export-mp3', 320)))) : ''}
          ${row(t('setTyping'), `<select id="set-typing" data-no-knob>${['slow', 'normal', 'fast'].map(k => opt(k, store.get('coding-misk-typing', 'normal'), t(`setTyping:${k}`))).join('')}</select>`, t('setTypingHint'))}
          ${row(t('setSpeed'), `<select id="set-speed" data-no-knob>${opt('fast', store.get('coding-misk-export-speed', 'fast'), t('setSpeedFast'))}${opt('real', store.get('coding-misk-export-speed', 'fast'), t('setSpeedReal'))}</select>`, t('setSpeedHint'))}
        </div>
        <div class="card set-card" id="set-video"><h3>${esc(t('setVideo'))}</h3>
          <figure class="vid-preview"><canvas id="set-vid-preview" width="480" height="270" aria-label="${esc(t('vidPreview'))}"></canvas><figcaption class="hint muted">${esc(t('vidPreviewHint'))}</figcaption></figure>
          ${row(t('setVidLayout'), `<select data-vid-opt="layout" data-no-knob>${LAYOUTS.map(k => opt(k, vid.layout, t(`vidLayout:${k}`))).join('')}</select>`, t(`vidLayoutHint:${vid.layout}`))}
          ${row(t('setVidQuality'), `<select data-vid-opt="quality" data-no-knob>${Object.keys(QUALITIES).map(k => opt(k, vid.quality, t(`vidQuality:${k}`))).join('')}</select>`, t('setVidQualityHint'))}
          ${row(t('setVidCard'), `<select data-vid-opt="card" data-no-knob>${CARDS.map(k => opt(k, vid.card, t(`vidCard:${k}`))).join('')}</select>`)}
          ${row(t('setVidCodeColors'), `<select data-vid-opt="codeColors" data-no-knob>${CODE_COLORS.map(k => opt(k, vid.codeColors, t(`vidCodeColors:${k}`))).join('')}</select>`, t('setVidCodeColorsHint'))}
          ${row(t('setVidRealScope'), `<select data-vid-opt="realScope" data-no-knob>${REAL_SCOPES.map(k => opt(k, vid.realScope, t(`vidRealScope:${k}`))).join('')}</select>`, t('setVidRealScopeHint'))}
          ${row(t('setVidVisual'), `<select data-vid-opt="visual" data-no-knob>${opt('song', vid.visual, t('vidVisual:song'))}${looks.map(([k, l]) => opt(`fixed:${k}`, vid.visual, t('vidVisual:fixed', { look: tx(l) }))).join('')}${opt('song-cycle', vid.visual, t('vidVisual:song-cycle'))}${opt('section-cycle', vid.visual, t('vidVisual:section-cycle'))}</select>`, t('setVidVisualHint'))}
          ${row(t('setRender'), `<select data-vid-opt="render" data-no-knob>${opt('stage', vid.render, t('renderStage'))}${RENDERS.map(([k, l]) => opt(k, vid.render, tx(l))).join('')}</select>`)}
          ${row(t('setVidSoulMode'), `<select data-vid-opt="soul" data-no-knob>${SOULS.map(k => opt(k, vid.soul, t(`vidSoul:${k}`))).join('')}</select>`, t(`vidSoulHint:${vid.soul}`))}
          ${vid.layout === 'code' && vid.soul !== 'off' && vid.soul !== 'full' ? row(t('setVidSoul'), seg('data-vid-soul', [['1', t('vidSoulShown')], ['0', t('vidSoulFolded')]], vid.soulPanel ? '1' : '0'), t('setVidSoulHint')) : ''}
          ${row(t('setCap'), `<span class="muted">${esc(t(captionSettings(store.get(CAPTIONS_KEY, null)).on && captionSettings(store.get(CAPTIONS_KEY, null)).videos ? 'capExportOn' : 'capExportOff'))} · <a href="#set-captions" data-cap-link>${esc(t('capExportLink'))}</a></span>${app.capsSkipNext ? ` <label class="rx-opt"><input type="checkbox" data-cap-skip${app.capsSkipNext() ? ' checked' : ''} data-no-knob> <span>${esc(t('capExportNone'))}</span></label>` : ''}`)}
          ${row(t('setVidPreset'), `<span class="vid-presets"><select id="set-vid-preset" data-no-knob><option value="">${esc(t('vidPresetPick'))}</option>${Object.keys(presets).sort().map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('')}</select><input id="set-vid-preset-name" type="text" maxlength="40" placeholder="${esc(t('vidPresetName'))}" aria-label="${esc(t('vidPresetName'))}"><button class="btn small" id="set-vid-preset-save">${esc(t('vidPresetSave'))}</button>${Object.keys(presets).length ? `<button class="btn small danger" id="set-vid-preset-del">${esc(t('vidPresetDel'))}</button>` : ''}</span>`, t('setVidPresetHint'))}
        </div>
        <div class="card set-card" id="set-fragments"><h3>${esc(t('setVertical'))}</h3>
          <p class="muted">${esc(t('setVerticalIntro'))}</p>
          <figure class="vid-preview v"><canvas id="set-frag-preview" width="270" height="270" aria-label="${esc(t('vidPreview'))}"></canvas></figure>
          ${row(t('fragFormat'), `<select data-frag-opt="format" data-no-knob>${Object.keys(F_FORMATS).map(k => opt(k, fr.format, t(`fragFormat:${k}`))).join('')}</select>`)}
          ${row(t('fragShow'), `<select data-frag-opt="show" data-no-knob>${F_SHOWS.map(k => opt(k, fr.show, t(`fragShow:${k}`))).join('')}</select>`)}
          ${row(t('fragAspect'), `<select data-frag-opt="aspect" data-no-knob>${F_ASPECTS.map(k => opt(k, fr.aspect, t(`fragAspect:${k}`))).join('')}</select>`, t('fragAspectHint'))}
          ${row(t('fragLook'), `<select data-frag-opt="look" data-no-knob>${opt('song', fr.look, t('fragPick:song'))}${opt('random', fr.look, t('fragPick:random'))}${looks.map(([k, l]) => opt(k, fr.look, tx(l))).join('')}</select>`)}
          ${row(t('setRender'), `<select data-frag-opt="render" data-no-knob>${opt('stage', fr.render, t('renderStage'))}${RENDERS.map(([k, l]) => opt(k, fr.render, tx(l))).join('')}</select>`)}
          ${row(t('fragSoulView'), `<select data-frag-opt="soulView" data-no-knob>${opt('song', fr.soulView, t('fragPick:song'))}${opt('random', fr.soulView, t('fragPick:random'))}${SOUL_VIEWS.map(k => opt(k, fr.soulView, `${k.toUpperCase()} · ${SOUL_VIEW_NAMES[k]}`)).join('')}</select>`)}
          ${row(t('fragFiles'), `<span class="chips" role="group">${F_FILES.map(k => `<button class="chip" data-frag-file="${k}" aria-pressed="${fr.files.includes(k)}">${esc(t(`fragFile:${k}`))}</button>`).join('')}</span>`, t('fragFilesHint'))}
          ${row(t('fragBandTop'), seg('data-fb-bandtop', [['1', t('fragOn')], ['0', t('fragOff')]], fr.bandTop ? '1' : '0'))}
          ${row(t('fragBandBottom'), seg('data-fb-bandbottom', [['1', t('fragOn')], ['0', t('fragOff')]], fr.bandBottom ? '1' : '0'))}
          ${row(t('fragBleed'), seg('data-fb-bleed', [['1', t('fragOn')], ['0', t('fragOff')]], fr.bleed ? '1' : '0'), t('fragBleedHint'))}
          ${row(t('fragRotate'), seg('data-fb-rotate', [['1', t('fragOn')], ['0', t('fragOff')]], fr.rotate ? '1' : '0'), t('fragRotateHint'))}
          ${row(t('fragCode'), `<select data-frag-opt="codeMode" data-no-knob>${F_CODE.map(k => opt(k, fr.codeMode, t(`fragCode:${k}`))).join('')}</select>`, t(`fragCodeHint:${fr.codeMode}`))}
          ${row(t('setFragTagline'), `<span class="die-row"><input type="text" data-frag-opt="tagline" value="${esc(fr.tagline)}" maxlength="60" data-no-knob><button class="dice" data-frag-die title="${esc(t('fragDie'))}" aria-label="${esc(t('fragDie'))}">${DICE}</button>${fr.tagline !== V_DEFAULTS.tagline ? `<button class="dice" data-frag-revert title="${esc(t('fragRevert'))}" aria-label="${esc(t('fragRevert'))}">${REVERT}</button>` : ''}</span>`)}
          ${row(t('setFragFull'), `<input type="text" data-frag-opt="fullLine" value="${esc(fr.fullLine)}" maxlength="60" placeholder="${esc(t('setFragFullHint'))}" data-no-knob>`)}
          ${row(t('setFragTitle'), seg('data-fb-vtitle', [['1', t('fragOn')], ['0', t('fragOff')]], fr.vTitle ? '1' : '0'), t('setFragTitleHint'))}
          ${row(t('setFragLabel'), seg('data-fb-label', [['1', t('fragOn')], ['0', t('fragOff')]], fr.label ? '1' : '0'))}
          ${row(t('setFragNext'), `<input type="number" id="set-frag-n" min="1" max="9999" value="${Math.max(1, +store.get('coding-misk-fragment-n', 1) || 1)}" data-no-knob>`, t('setFragNextHint'))}
          ${row(t('setFragGlitch'), seg('data-fb-glitch', [['1', t('fragOn')], ['0', t('fragOff')]], fr.glitch ? '1' : '0'))}
          ${row(t('setFragLength'), `<input type="number" data-frag-opt="vLength" min="5" max="180" value="${fr.vLength}" data-no-knob> s`)}
          <div class="actions"><button class="btn" id="set-frag-recipe">${esc(t('setFragRecipe'))}</button></div>
        </div>
        <div class="card set-card" id="set-live"><h3>${esc(t('setLive'))}</h3>
          <p class="muted">${esc(t('setLiveIntro'))}</p>
          <div class="actions"><button class="btn primary" id="set-live-window">${esc(t('setLiveWindow'))}</button><button class="btn" id="set-live-room">${esc(t('setLiveRoom'))}</button></div>
          <p class="hint muted">${esc(t(app.liveOn && app.liveOn() ? 'setLiveOn' : 'setLiveHint'))}</p>
        </div>
        <div class="card set-card"><h3>${esc(t('setRadio'))}</h3>
          ${row(t('radioTransition'), `<select data-radio-opt="transition" data-no-knob>${['artist', ...TRANSITION_KINDS].map(k => opt(k, r.transition, t(k === 'artist' ? 'byArtist' : `tx:${k}`))).join('')}</select>`)}
          ${row(t('radioHarmony'), `<select data-radio-opt="harmony" data-no-knob>${['artist', ...HARMONY_MODES].map(k => opt(k, r.harmony, t(k === 'artist' ? 'byArtist' : `harmony:${k}`))).join('')}</select>`)}
          ${row(t('radioProfile'), `<select data-radio-opt="profile" data-no-knob>${['artist', 'classic', 'crescendo', 'switch'].map(k => opt(k, r.profile || 'artist', t(k === 'artist' ? 'byArtistStyle' : `profile:${k}`))).join('')}</select>`, t('radioProfileTip'))}
          ${row(t('setScope'), `<select data-radio-opt="scope" data-no-knob>${opt('song', r.scope, t('steerScopeSong'))}${opt('session', r.scope, t('steerScopeSession'))}</select>`)}
          ${row(t('matDefault'), `<select data-radio-opt="material" data-no-knob>${['mix', 'patterns', 'varied', 'composed'].map(k => opt(k, r.material || 'mix', t(`mat:${k}`))).join('')}</select>`, `${t('matDefaultTip')} ${t('matSourceTip')} ${t('matVariedTip')}`)}
        </div>
        <div class="card set-card" id="set-library"><h3>${esc(t('setLibrary'))}</h3>
          <p class="muted">${esc(t('setLibraryIntro'))}</p>
          <div class="actions">${app.hiddenSongs && app.hiddenSongs() ? `<button class="btn" id="set-show-hidden">${esc(t('setShowHidden', { n: app.hiddenSongs() }))}</button>` : `<span class="muted">${esc(t('setHiddenNone'))}</span>`}</div>
        </div>
        ${widgetsCard()}
        ${stageCard()}
        <div class="card set-card" id="set-advanced"><h3>${esc(t('setAdvanced'))}</h3>
          <p class="muted">${esc(t('setAdvancedIntro'))}</p>
          <p class="muted" id="set-shape-count" data-shapes="${counts.shapes}">${esc(t('setShapeCount', counts))}</p>
          ${row(t('setShapeCap'), `<input type="number" id="set-shape-cap" min="${SHAPE_CAP_MIN}" max="${SHAPE_CAP_MAX}" step="1" value="${shapeCapOf(store.get('coding-misk-shape-cap', null))}"${shapeAll ? ' disabled' : ''} data-no-knob>`, t('setShapeCapHint'))}
          ${row(t('setShapeAll'), `<label class="rx-opt"><input type="checkbox" id="set-shape-all"${shapeAll ? ' checked' : ''} data-no-knob> <span>${esc(t('setShapeAllOn'))}</span></label>`, t('setShapeAllHint', counts))}
          ${row(t('setShapeKeep'), `<select id="set-shape-keep"${shapeAll ? '' : ' disabled'} data-no-knob>${SHAPE_KEEPS.map(k => opt(k, shapeKeepOf(store.get('coding-misk-shape-keep', null)), t(`setShapeKeep:${k}`))).join('')}</select>`, t('setShapeKeepHint'))}
          ${row(t('setShapeRandom'), `<label class="rx-opt"><input type="checkbox" id="set-shape-random"${store.get('coding-misk-shape-random', null) === false ? '' : ' checked'} data-no-knob> <span>${esc(t('setShapeRandomOn'))}</span></label>`, t('setShapeRandomHint'))}
          ${row(t('setLongSong'), `<input type="number" id="set-long-song" min="${LONG_SONG_MIN / 60}" max="${LONG_SONG_MAX / 60}" step="1" value="${longSongOf(store.get('coding-misk-long-song', null)) / 60}" data-no-knob> min`, t('setLongSongHint'))}
          ${row(t('setAirChooser'), `<select id="set-air-chooser" data-no-knob>${Object.keys(AIR_CHOOSERS).map(id => opt(id, chooserOf(store.get('coding-misk-air-chooser', null)), chooserName(id, app.lang()))).join('')}</select>`, t('setAirChooserHint'))}
        </div>
        <div class="card set-card"><h3>${esc(t('setData'))}</h3>
          <p class="muted">${esc(t('setDataIntro'))}</p>
          <div class="actions"><button class="btn primary" id="set-export">${esc(t('setExport'))}</button><button class="btn" id="set-import">${esc(t('setImport'))}</button><button class="btn danger" id="set-reset">${esc(t('setReset'))}</button></div>
        </div>
      </div>`;
    if (app.videoPreview) app.videoPreview(root.querySelector('#set-vid-preview'));
    if (app.fragPreview) app.fragPreview(root.querySelector('#set-frag-preview'), () => { const x = { ...fragmentOpts(store.get('coding-misk-fragments', {}) || {}), stageRatio: app.stageRatio ? app.stageRatio() : 2.4 }; return { ...x, size: fragmentSize(x), next: store.get('coding-misk-fragment-n', 1) }; });
  }

  // code themes (code-themes D6): theme, font, size and the dimmed muted lines, in the Appearance card
  function codeRows() {
    if (!app.codeTheme) return '';
    const C = app.codeTheme.settings(), L = app.lang();
    const themes = `${opt('auto', C.theme, t('codeTheme:auto'))}<optgroup label="${esc(t('setCodeThemeOwn'))}">${OWN_IDS.map(id => opt(id, C.theme, themeName(id, L))).join('')}</optgroup><optgroup label="${esc(t('setCodeThemeStrudel'))}">${STRUDEL_IDS.map(id => opt(id, C.theme, themeName(id, L))).join('')}</optgroup>`;
    return `${row(t('setCodeTheme'), `<select id="set-code-theme" data-no-knob>${themes}</select>`, C.theme === 'auto' ? t('setCodeThemeAuto', { name: app.codeTheme.autoName(L) }) : t('setCodeThemeChosen'))}
          ${row(t('setCodeFont'), `<select id="set-code-font" data-no-knob>${Object.keys(FONTS).map(k => opt(k, C.font, fontName(k, L))).join('')}</select>`)}
          ${row(t('setCodeSize'), seg('data-set-code-size', Object.keys(SIZES).map(k => [k, t(`codeSize:${k}`)]), C.size), t('setCodeSizeHint'))}
          ${row(t('setCodeDim'), seg('data-set-code-dim', [['1', t('cwYes')], ['0', t('cwNo')]], C.dim ? '1' : '0'), t('setCodeDimHint'))}`;
  }

  // code widgets (code-widgets D2): one card, sections that open and close
  function widgetsCard() {
    const S = widgetSettings(store.get(CW_KEY, null)), open = new Set(store.get(CW_OPEN, ['general']) || []);
    const sec = (id, body) => `<details class="cw-sec" data-cw-sec="${id}"${open.has(id) ? ' open' : ''}><summary>${esc(t(`cwSec:${id}`))}</summary>${body}</details>`;
    const check = (attr, on, label) => `<label class="rx-opt"><input type="checkbox" ${attr}${on ? ' checked' : ''} data-no-knob> <span>${esc(label)}</span></label>`;
    const order = `<ol class="cw-order">${S.order.map((k, i) => `<li><span>${esc(t(`cwInst:${k}`))}</span><button class="icon-btn" data-cw-move="${k}" data-dir="-1" title="${esc(t('cwUp'))}" aria-label="${esc(`${t('cwUp')}: ${t(`cwInst:${k}`)}`)}"${i === 0 ? ' disabled' : ''}>${ARROW('up')}</button><button class="icon-btn" data-cw-move="${k}" data-dir="1" title="${esc(t('cwDown'))}" aria-label="${esc(`${t('cwDown')}: ${t(`cwInst:${k}`)}`)}"${i === S.order.length - 1 ? ' disabled' : ''}>${ARROW('down')}</button></li>`).join('')}</ol>`;
    const inst = CW_INSTRUMENTS.map(k => { const I = S.instruments[k]; return `<div class="cw-inst" data-cw-inst="${k}">
      ${check(`data-cw-inst-on="${k}"`, I.on, t(`cwInst:${k}`))}
      <label class="cw-prim"><span class="muted">${esc(t('cwPrimary'))}</span> <select data-cw-prim="${k}" data-no-knob>${WIDGETS.map(w => opt(w, I.primary, w)).join('')}</select></label>
      <span class="chips" role="group" aria-label="${esc(t('cwSecondary'))}"><span class="muted">${esc(t('cwSecondary'))}</span> ${WIDGETS.filter(w => w !== I.primary).map(w => `<button class="chip" data-cw-sec2="${k}" data-w="${w}" aria-pressed="${I.secondary.includes(w)}">${w}</button>`).join('')}</span>
    </div>`; }).join('');
    return `<div class="card set-card" id="set-widgets"><h3>${esc(t('setCw'))}</h3>
      <p class="muted">${esc(t('setCwIntro'))}</p>
      ${row(t('cwOn'), seg('data-cw-on', [['1', t('cwYes')], ['0', t('cwNo')]], S.on ? '1' : '0'), t('cwOnHint'))}
      ${sec('general', `${row(t('cwMax'), `<input type="number" data-cw-num="max" min="1" max="8" step="1" value="${S.max}" data-no-knob>`, t('cwMaxHint'))}
        ${row(t('cwRoll'), seg('data-cw-roll', [['pianoroll', 'pianoroll'], ['punchcard', 'punchcard']], S.roll))}
        ${row(t('cwOrder'), order, t('cwOrderHint'))}
        ${row(t('cwShare'), `<span class="cw-unit"><input type="number" data-cw-num="share" min="0" max="100" step="5" value="${S.share}" data-no-knob> %</span>`, t('cwShareHint'))}
        ${row(t('cwNotes'), seg('data-cw-notes', [['volume', t('cwNotes:volume')], ['full', t('cwNotes:full')]], S.notes), t('cwNotesHint'))}`)}
      ${sec('muted', `${row(t('cwWindow'), `<select data-cw-window data-no-knob>${CW_WINDOWS.map(w => opt(String(w), String(S.window), w === 'always' ? t('cwWindow:always') : t('cwWindow:n', { n: w }))).join('')}</select>`, t('cwWindowHint'))}
        ${row(t('cwDim'), seg('data-cw-dim', [['1', t('cwYes')], ['0', t('cwNo')]], S.dim ? '1' : '0'), t('cwDimHint'))}`)}
      ${sec('widgets', `<p class="hint muted">${esc(t('cwWidgetsHint'))}</p><div class="cw-checks">${WIDGETS.map(w => check(`data-cw-widget="${w}"`, S.widgets[w], w)).join('')}</div>`)}
      ${sec('instruments', `<p class="hint muted">${esc(t('cwInstHint'))}</p>${inst}`)}
      ${sec('params', `<p class="hint muted">${esc(t('cwParamsHint'))}</p><div class="cw-checks">${CW_PARAMS.map(k => check(`data-cw-param="${k}"`, S.params[k], k)).join('')}</div>`)}
      ${sec('sizes', `<p class="hint muted">${esc(t('cwSizesHint'))}</p>${Object.keys(CW_DEFAULTS.sizes).map(k => row(t(`cwSize:${k}`), `<span class="cw-unit"><input type="number" data-cw-size="${k}" min="${CW_SIZE_LIMITS[k][0]}" max="${CW_SIZE_LIMITS[k][1]}" step="2" value="${S.sizes[k]}" data-no-knob> px</span>`)).join('')}`)}
      <div class="actions"><button class="btn" id="set-cw-defaults">${esc(t('cwDefaults'))}</button></div>
    </div>`;
  }
  // stage widgets (widgets-on-stage D9): the layer over the scene, then sections that open and close, like the code
  // widgets card
  // texts on stage (spoken-text-on-stage D7): one switch, the choices under it folded while it is off and kept
  function captionsCard() {
    const S = captionSettings(store.get(CAPTIONS_KEY, null));
    const check = (k, label, hint = '') => `<label class="rx-opt"${hint ? ` title="${esc(hint)}"` : ''}><input type="checkbox" data-cap-show="${k}"${S[k] ? ' checked' : ''} data-no-knob> <span>${esc(label)}</span></label>`;
    const kinds = Object.keys(SPEAKER_KINDS).filter(k => !SPEAKER_KINDS[k].future);
    return `<div class="card set-card" id="set-captions"><h3>${esc(t('setCap'))}</h3>
      <p class="muted">${esc(t('setCapIntro'))}</p>
      ${row(t('capOn'), seg('data-cap-on', [['1', t('cwYes')], ['0', t('cwNo')]], S.on ? '1' : '0'), t('capOnHint'))}
      <div class="cap-choices"${S.on ? '' : ' hidden'}>
        ${row(t('capShow'), `<div class="cw-checks">${check('narrator', t('capNarrator'))}${check('voice', t('capVoice'))}${check('typed', t('capTyped'))}${check('steps', t('capSteps'))}${check('claude', t('capClaude'), t('capClaudeHint'))}</div>`)}
        ${row(t('capStepForm'), `<select data-cap-opt="stepForm" data-no-knob${S.steps ? '' : ' disabled'}>${STEP_FORMS.map(k => opt(k, S.stepForm, t(`capStepForm:${k}`))).join('')}</select>`)}
        ${row(t('capMarks'), kinds.map(k => `<label class="cap-mark"><span class="muted">${esc(t(`capKind:${k}`))}</span> <select data-cap-mark="${k}" data-no-knob>${MARKS.map(m => opt(m, S.marks[k], t(`capMark:${m}`))).join('')}</select></label>`).join(''), t('capMarksHint'))}
        ${row(t('capWhere'), `<select data-cap-opt="where" data-no-knob>${WHERES.map(k => opt(k, S.where, t(`capWhere:${k}`))).join('')}</select>`)}
        ${row(t('capVideos'), seg('data-cap-videos', [['1', t('cwYes')], ['0', t('cwNo')]], S.videos ? '1' : '0'), t('capVideosHint'))}
      </div>
    </div>`;
  }
  const setCap = f => { if (app.setCaptions) app.setCaptions(f); else { const S = captionSettings(store.get(CAPTIONS_KEY, null)); f(S); store.set(CAPTIONS_KEY, captionSettings(S)); } };
  function stageCard() {
    const W = stageSettings(store.get(SW_KEY, null)), open = new Set(store.get(SW_OPEN, ['general']) || []), vid = { ...VIDEO_DEFAULTS, ...(store.get('coding-misk-video', {}) || {}) };
    const sec = (id, body) => `<details class="cw-sec" data-sw-sec="${id}"${open.has(id) ? ' open' : ''}><summary>${esc(t(`swSec:${id}`))}</summary>${body}</details>`;
    const check = (attr, on, label) => `<label class="rx-opt"><input type="checkbox" ${attr}${on ? ' checked' : ''} data-no-knob> <span>${esc(label)}</span></label>`;
    const inst = W.mapping === 'own' ? CW_INSTRUMENTS.map(k => { const I = W.instruments[k]; return `<div class="cw-inst" data-sw-inst="${k}">
      ${check(`data-sw-inst-on="${k}"`, I.on, t(`cwInst:${k}`))}
      <label class="cw-prim"><span class="muted">${esc(t('cwPrimary'))}</span> <select data-sw-prim="${k}" data-no-knob>${WIDGETS.map(w => opt(w, I.primary, w)).join('')}</select></label>
      <span class="chips" role="group" aria-label="${esc(t('cwSecondary'))}"><span class="muted">${esc(t('cwSecondary'))}</span> ${WIDGETS.filter(w => w !== I.primary).map(w => `<button class="chip" data-sw-sec2="${k}" data-w="${w}" aria-pressed="${I.secondary.includes(w)}">${w}</button>`).join('')}</span>
    </div>`; }).join('') : '';
    return `<div class="card set-card" id="set-stage-widgets"><h3>${esc(t('setSw'))}</h3>
      <p class="muted">${esc(t('setSwIntro'))}</p>
      ${row(t('swLayer'), seg('data-sw-layer', SW_LAYERS.map(k => [k, t(`swLayer:${k}`)]), W.layer), t('swLayerHint'))}
      ${sec('general', `${row(t('swMonitor'), `<input type="number" data-sw-num="monitor" min="${SW_LIMITS.monitor[0]}" max="${SW_LIMITS.monitor[1]}" step="1" value="${W.monitor}" data-no-knob>`, t('swMonitorHint'))}
        ${row(t('swStrip'), `<input type="number" data-sw-num="strip" min="${SW_LIMITS.strip[0]}" max="${SW_LIMITS.strip[1]}" step="1" value="${W.strip}" data-no-knob>`, t('swStripHint'))}
        ${row(t('swMapping'), seg('data-sw-mapping', SW_MAPPINGS.map(k => [k, t(`swMapping:${k}`)]), W.mapping), t('swMappingHint'))}
        ${row(t('swColours'), `<select data-sw-colours data-no-knob>${SW_COLOURS.map(k => opt(k, W.colours, t(`swColours:${k}`))).join('')}</select>`, t('swColoursHint'))}
        ${row(t('swSilent'), seg('data-sw-silent', SW_SILENT.map(k => [k, t(`swSilent:${k}`)]), W.silent), t('swSilentHint'))}`)}
      ${sec('widgets', `<p class="hint muted">${esc(t('swWidgetsHint'))}</p><div class="cw-checks">${WIDGETS.map(w => check(`data-sw-widget="${w}"`, W.widgets[w], w)).join('')}</div>`)}
      ${sec('instruments', W.mapping === 'own' ? `<p class="hint muted">${esc(t('swInstHint'))}</p>${inst}` : `<p class="hint muted" data-sw-same>${esc(t('swInstSame'))}</p>`)}
      ${sec('video', `<p class="hint muted">${esc(t('swVideoHint', { value: t(`vidRealScope:${vid.realScope}`) }))}</p>`)}
      <div class="actions"><button class="btn" id="set-sw-defaults">${esc(t('cwDefaults'))}</button></div>
    </div>`;
  }
  // a change of the stage widgets' settings, stored whole (the defaults filled in)
  const setSw = f => { const W = stageSettings(store.get(SW_KEY, null)); f(W); store.set(SW_KEY, stageSettings(W)); };
  // a change of the code widgets' settings, stored whole (the defaults filled in)
  const setCw = f => { const S = widgetSettings(store.get(CW_KEY, null)); f(S); store.set(CW_KEY, widgetSettings(S)); if (app.widgetsChanged) app.widgetsChanged(); };
  const setFrag = (k, v) => store.set('coding-misk-fragments', { ...fragmentOpts(store.get('coding-misk-fragments', {}) || {}), [k]: v });
  const setVid = (k, v) => store.set('coding-misk-video', { ...VIDEO_DEFAULTS, ...(store.get('coding-misk-video', {}) || {}), [k]: v });
  const entries = () => { const out = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); out.push([k, store.get(k, null)]); } return out; };
  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.setUi) { app.setUi(b.dataset.setUi); return render(); }
    if (b.dataset.setUiFollow) { app.setUiFollow(b.dataset.setUiFollow === '1'); return render(); }
    if (b.dataset.setLang) { app.setLang(b.dataset.setLang); return render(); }
    if (b.dataset.capOn) { setCap(S => { S.on = b.dataset.capOn === '1'; }); return render(); }
    if (b.dataset.capVideos) { setCap(S => { S.videos = b.dataset.capVideos === '1'; }); return render(); }
    if (b.dataset.setCodeSize) { app.codeTheme.set({ size: b.dataset.setCodeSize }); return render(); }
    if (b.dataset.setCodeDim) { app.codeTheme.set({ dim: b.dataset.setCodeDim === '1' }); return render(); }
    // code widgets (code-widgets D2)
    if (b.dataset.cwOn) { setCw(S => { S.on = b.dataset.cwOn === '1'; }); return render(); }
    if (b.dataset.cwRoll) { setCw(S => { S.roll = b.dataset.cwRoll; }); return render(); }
    if (b.dataset.cwNotes) { setCw(S => { S.notes = b.dataset.cwNotes; }); return render(); }
    if (b.dataset.cwDim) { setCw(S => { S.dim = b.dataset.cwDim === '1'; }); return render(); }
    if (b.dataset.cwMove) { const k = b.dataset.cwMove, d = +b.dataset.dir; setCw(S => { const i = S.order.indexOf(k), j = i + d; if (i >= 0 && j >= 0 && j < S.order.length) [S.order[i], S.order[j]] = [S.order[j], S.order[i]]; }); render(); const f = root.querySelector(`[data-cw-move="${k}"][data-dir="${d}"]:not([disabled])`) || root.querySelector(`[data-cw-move="${k}"]:not([disabled])`); if (f) f.focus(); return; }
    if (b.dataset.cwSec2) { const k = b.dataset.cwSec2, w = b.dataset.w; setCw(S => { const I = S.instruments[k], has = I.secondary.includes(w); I.secondary = has ? I.secondary.filter(x => x !== w) : [...I.secondary, w]; }); return render(); }
    if (b.id === 'set-cw-defaults') { const on = widgetSettings(store.get(CW_KEY, null)).on; store.set(CW_KEY, { ...widgetSettings(null), on }); if (app.widgetsChanged) app.widgetsChanged(); toast(t('cwDefaultsDone')); return render(); }
    // stage widgets (widgets-on-stage D9)
    if (b.dataset.swLayer) { setSw(W => { W.layer = b.dataset.swLayer; }); return render(); }
    if (b.dataset.swSilent) { setSw(W => { W.silent = b.dataset.swSilent; }); return render(); }
    // the stage's own instruments start as a copy of the code widgets' ones (unless the stage's copy was already edited)
    if (b.dataset.swMapping) { setSw(W => { W.mapping = b.dataset.swMapping; if (W.mapping === 'own' && JSON.stringify(W.instruments) === JSON.stringify(stageSettings(null).instruments)) W.instruments = widgetSettings(store.get(CW_KEY, null)).instruments; }); return render(); }
    if (b.dataset.swSec2) { const k = b.dataset.swSec2, w = b.dataset.w; setSw(W => { const I = W.instruments[k], has = I.secondary.includes(w); I.secondary = has ? I.secondary.filter(x => x !== w) : [...I.secondary, w]; }); return render(); }
    if (b.id === 'set-sw-defaults') { store.set(SW_KEY, stageSettings(null)); toast(t('swDefaultsDone')); return render(); }
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
    { const fb = { fbVtitle: 'vTitle', fbLabel: 'label', fbGlitch: 'glitch', fbBandtop: 'bandTop', fbBandbottom: 'bandBottom', fbRotate: 'rotate', fbBleed: 'bleed' }, k = Object.keys(fb).find(x => b.dataset[x] !== undefined); if (k) { setFrag(fb[k], b.dataset[k] === '1'); if (fb[k] === 'bandTop' || fb[k] === 'bandBottom') { const x = fragmentOpts(store.get('coding-misk-fragments', {}) || {}); setFrag('bands', x.bandTop || x.bandBottom); } return render(); } }
    // the die puts another phrase in the tagline, the arrow brings the default back
    if (b.dataset.fragFile) { const cur = fragmentOpts(store.get('coding-misk-fragments', {}) || {}).files, k = b.dataset.fragFile, next = cur.includes(k) ? cur.filter(x => x !== k) : [...cur, k]; if (!next.length) { toast(t('fragFilesOne')); return; } setFrag('files', next); return render(); }
    if (b.dataset.fragDie !== undefined) { setFrag('tagline', nextTagline(fragmentOpts(store.get('coding-misk-fragments', {}) || {}).tagline)); setFrag('taglineMode', 'fixed'); return render(); }
    if (b.dataset.fragRevert !== undefined) { setFrag('tagline', V_DEFAULTS.tagline); return render(); }
    if (b.id === 'set-frag-recipe') { pickJsonFiles(data => { if (data && data.seed && app.fragmentsFromRecipe) app.fragmentsFromRecipe(data, b); else toast(t('fragErr:source')); }); return; }
    if (b.id === 'set-live-window') { if (!app.liveOpenWindow()) toast(t('setLiveBlocked')); else setTimeout(render, 1500); return; }
    if (b.id === 'set-live-room') { app.liveOpenRoom(); return; }
    if (b.dataset.vidSoul) { setVid('soulPanel', b.dataset.vidSoul === '1'); return render(); }
    // hidden built-in songs (#68, D3b): all of them back in the list, after a confirmation in the card
    if (b.id === 'set-show-hidden') { confirmInline({ anchor: b.closest('.actions'), trigger: b, key: 'show-hidden', msg: t('setShowHiddenAsk'), ok: t('setShowHiddenOk'), t, esc, onConfirm: () => { toast(t('setShowHiddenDone', { n: app.showHiddenSongs() })); render(); } }); return; }
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
  // the sections of the code widgets card left open
  root.addEventListener('toggle', e => { const d = e.target; if (d.dataset && d.dataset.swSec) { const open = new Set(store.get(SW_OPEN, ['general']) || []); if (d.open) open.add(d.dataset.swSec); else open.delete(d.dataset.swSec); store.set(SW_OPEN, [...open]); return; } if (!d.dataset || !d.dataset.cwSec) return; const open = new Set(store.get(CW_OPEN, ['general']) || []); if (d.open) open.add(d.dataset.cwSec); else open.delete(d.dataset.cwSec); store.set(CW_OPEN, [...open]); }, true);
  root.addEventListener('change', e => {
    { const x = e.target, d = x.dataset || {};
      if (d.capSkip !== undefined && app.capsSkipNext) { app.capsSkipNext(x.checked); return; }
      if (d.capShow) { setCap(S => { S[d.capShow] = x.checked; }); return render(); }
      if (d.capOpt) { setCap(S => { S[d.capOpt] = x.value; }); return; }
      if (d.capMark) { setCap(S => { S.marks[d.capMark] = x.value; }); return; }
      if (d.cwNum) { setCw(S => { S[d.cwNum] = +x.value; }); x.value = widgetSettings(store.get(CW_KEY, null))[d.cwNum]; return; }
      if (d.cwWindow !== undefined) { setCw(S => { S.window = x.value === 'always' ? 'always' : +x.value; }); return; }
      if (d.cwWidget) { setCw(S => { S.widgets[d.cwWidget] = x.checked; }); return; }
      if (d.cwParam) { setCw(S => { S.params[d.cwParam] = x.checked; }); return; }
      if (d.cwSize) { setCw(S => { S.sizes[d.cwSize] = +x.value; }); x.value = widgetSettings(store.get(CW_KEY, null)).sizes[d.cwSize]; return; }
      if (d.cwInstOn) { setCw(S => { S.instruments[d.cwInstOn].on = x.checked; }); return; }
      if (d.swNum) { setSw(W => { W[d.swNum] = +x.value; }); x.value = stageSettings(store.get(SW_KEY, null))[d.swNum]; return; }
      if (d.swColours !== undefined) { setSw(W => { W.colours = x.value; }); return; }
      if (d.swWidget) { setSw(W => { W.widgets[d.swWidget] = x.checked; }); return; }
      if (d.swInstOn) { setSw(W => { W.instruments[d.swInstOn].on = x.checked; }); return; }
      if (d.swPrim) { setSw(W => { const I = W.instruments[d.swPrim], old = I.primary; I.primary = x.value; I.secondary = [...I.secondary.filter(w => w !== x.value), ...(old !== x.value && !I.secondary.includes(old) ? [old] : [])]; }); return render(); }
      if (d.cwPrim) { setCw(S => { const I = S.instruments[d.cwPrim], old = I.primary; I.primary = x.value; I.secondary = [...I.secondary.filter(w => w !== x.value), ...(old !== x.value && !I.secondary.includes(old) ? [old] : [])]; }); return render(); }
    }
    if (e.target.id === 'set-radio-look') store.set('coding-misk-radio-look', e.target.value);
    // the stage's render and its light form on slow devices (widget-render-styles D8)
    if (e.target.id === 'set-render') { if (app.setRender) app.setRender(e.target.value); else store.set('coding-misk-render', e.target.value); }
    if (e.target.id === 'set-render-light') { if (e.target.value === 'auto') store.remove('coding-misk-render-light'); else store.set('coding-misk-render-light', e.target.value); }
    if (e.target.id === 'set-code-theme') { app.codeTheme.set({ theme: e.target.value }); render(); }
    if (e.target.id === 'set-code-font') { app.codeTheme.set({ font: e.target.value }); render(); }
    if (e.target.id === 'set-format') { store.set('coding-misk-export-format', e.target.value); render(); }
    if (e.target.id === 'set-speed') store.set('coding-misk-export-speed', e.target.value);
    if (e.target.id === 'set-typing') store.set('coding-misk-typing', e.target.value);
    if (e.target.dataset.radioOpt) app.setRadio(e.target.dataset.radioOpt, e.target.value);
    if (e.target.dataset.vidOpt) { setVid(e.target.dataset.vidOpt, e.target.value); render(); }
    if (e.target.dataset.fragOpt) { setFrag(e.target.dataset.fragOpt, e.target.type === 'number' ? Math.max(5, Math.min(180, +e.target.value || 30)) : e.target.value); if (e.target.tagName === 'SELECT') render(); }
    // the shapes a Compose growth tries (shape-search D3): kept within 4 and 32, the default not stored
    if (e.target.id === 'set-shape-cap') { const v = shapeCapOf(e.target.value); e.target.value = v; if (v === SHAPE_CAP) store.remove('coding-misk-shape-cap'); else store.set('coding-misk-shape-cap', v); }
    // shape-search D6, D7: Try all, what it keeps, the order and the long-song threshold (minutes, stored in seconds),
    // the defaults not stored
    if (e.target.id === 'set-shape-all') { if (e.target.checked) store.set('coding-misk-shape-all', true); else store.remove('coding-misk-shape-all'); render(); }
    if (e.target.id === 'set-shape-keep') { const v = shapeKeepOf(e.target.value); if (v === 'first') store.remove('coding-misk-shape-keep'); else store.set('coding-misk-shape-keep', v); }
    if (e.target.id === 'set-shape-random') { if (e.target.checked) store.remove('coding-misk-shape-random'); else store.set('coding-misk-shape-random', false); }
    if (e.target.id === 'set-long-song') { const v = longSongOf(60 * Math.round(+e.target.value || 0) || null); e.target.value = v / 60; if (v === LONG_SONG) store.remove('coding-misk-long-song'); else store.set('coding-misk-long-song', v); }
    // the chooser on air (radio-chooser-versions D3): the default not stored, an unknown id read as the default
    if (e.target.id === 'set-air-chooser') { const v = chooserOf(e.target.value); if (v === AIR_CHOOSER) store.remove('coding-misk-air-chooser'); else store.set('coding-misk-air-chooser', v); }
    if (e.target.id === 'set-frag-n') store.set('coding-misk-fragment-n', Math.max(1, Math.round(+e.target.value || 1)));
    if (e.target.id === 'set-vid-preset' && e.target.value) { const p = (store.get('coding-misk-video-presets', {}) || {})[e.target.value]; if (p) { store.set('coding-misk-video', { ...VIDEO_DEFAULTS, ...p }); toast(t('vidPresetLoaded', { name: e.target.value })); render(); } }
  });
  return { render };
}
