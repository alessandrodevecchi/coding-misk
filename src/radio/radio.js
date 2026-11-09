// Radio: endless music in the browser (#22, docs/ENDLESS.md "Radio").
// The radio asks the director for one song at a time and plays them on one timeline of absolute bars:
// the player plays a "window" song (the song on air and the next one, see windowSong), and the radio
// moves the window when a song ends. The player (main.js) owns the editor and the scheduler; the radio
// only builds playables and tells it when to start, swap or stop.
import { createSession, OPTION_DEFAULTS, leadEntry, stylesNear, DIRECTOR_VERSION } from '../endless/director.js';
import { TRANSITION_KINDS, HARMONY_MODES } from '../endless/artist.js';
import { overlapOf, extraOf } from '../endless/transitions.js';
import { steerSong, sayAir, applyBar, whyNot, COMMANDS, VARY_TYPES, varyTracks, songCurves, densityMax, extendIndex, extendSeconds, INSTRUMENTS, RECOMMENDED, TRACK_CAP, RISER_BARS, RISER_SOUNDS, instrumentOf, lockedIds, moreWarning, partHas, fitsAir, unfitReason, patternPart, TREATMENTS, KEY_MOVES, keyTo, SESSION_KINDS, biasSong } from '../endless/steering.js';
import { stateAt } from '../song/build.js';
import { windowSong } from '../endless/join.js';
import { combosRecord } from '../voices/combos.js';
import { withMine, withCombos, sessionItems, recipeOptionsAt, howOf, GROWTH_ON_AIR, growsOnAir, waypointsOnAir, airChooserOf, holdsGrown, extraStylesOf } from '../endless/items.js';
import { steerOnAir, airBoundaries, airOffset, directorView, AIR_CHOOSER, chooserOf } from '../endless/waypoints.js';
import { PROFILE_CHOICES, RADIO_CHOICES, RADIO_PROFILES, CUSTOM_DEFAULT, customControls, profileOptions, savedSongProfile } from '../endless/profile.js';
import { growOnAir, airControls, leadOnAir, shapeSearchSetting, searchOf, playedOf } from '../endless/growth.js';
import { resolveProfile, CONTROLS, displayOf, withDisplay } from '../live/profiles.js';
import { COMMENT_PRESETS } from '../song/comments.js';
import { FUNCTION_PRESETS, FUNCTION_OPTIONS } from '../song/writer.js';
import { OPENINGS, PACES, DEVELOPMENTS, SHAPES_VERSION } from '../song/shapes.js';
import { CRESCENDO_VERSION } from '../song/crescendo.js';
import { sessionVersions } from '../library/playlists.js';
import { validateRecipe, recipeOrder, styleId, styleKeys } from '../endless/recipe.js';
import { buildSteps, sayText, spokenSchedule, captionSchedule, spokenNeeds, missingNeeds, voicesAt } from '../song/build.js';
import { spokenContext } from '../song/spoken.js';
import { saySlug as sayFile } from '../song/build.js';
import { textIn } from '../voices/phrases.js';
import { liveBuildOf } from '../live/live-code.js';
import { nextRows } from './next-changes.js';
import { QUIRKS } from '../endless/quirks.js';
import { makeArtist, randomStyles, randomGenre, randomKnob, randomMix, KNOBS } from '../endless/artist-maker.js';
import { freshSeed } from '../endless/random.js';
import { compilationOptions, segmentAt, PRESETS, SETUP_DEFAULT } from '../endless/compilation.js';
import { SENSIBLE } from '../endless/artist-maker.js';
import { DICE, INVENT, GEAR, LOCK, LOCK_OPEN, LOCK_HALF, VARY, SWAP, CHEVRON, SLIDERS, ROWS, CARDS, LISTEN, STOP, POWER } from '../icons.js';
import { previewOf } from '../library/patterns.js';
import { PROGS } from '../music.js';
import { paintPreview } from '../library/patterns-tab.js';
import { savedView, cleanView, daysAgo, SAVED_GROUP } from './saved-view.js';
import { SESSION_SOURCES } from '../material/index.js';
import { cleanVoice, voiceOption, applyPreset, VOICE_PRESET_IDS } from '../endless/voice-options.js';
import { VOICE_STYLE_IDS } from '../song/format.js';
import { speakerOf, narratorSpeaker } from '../song/spoken.js';
import { SPEAKERS, speakerIn } from '../song/build.js';
import { voicePanel, voiceEvent } from '../endless/voice-panel.js';
import { voiceSoundHtml, syncVoiceSound, soundEvent, nextSound, cleanSound, isAutoSound, soundShown } from '../endless/voice-sound.js';
import { dieHtml, knobSlider, artistChips, styleChips, trialChip, trialHint, diceRow, materialSeg, profileSelect, customPanel, voicesGroup, songControlEvent, lengthChips, applyTrial } from './song-controls.js';
import { hasLength } from '../endless/song-options.js';
import { createLoadMonitor } from './load-monitor.js';

const HISTORY = 50;
const barsOf = song => song.sections.reduce((a, s) => a + s.bars, 0);
const fmt = n => (Math.round(n * 100) / 100).toString();
const idle = fn => (globalThis.requestIdleCallback ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 50));

// Valid recipes only: an invalid one is left out with a warning.
export function usableRecipes(list) {
  return list.filter(r => {
    const { errors } = validateRecipe(r);
    if (errors.length) console.warn(`style ${r && r.id}: ${errors.map(e => `${e.path} ${e.msg}`).join('; ')}`);
    return !errors.length;
  }).sort((a, b) => recipeOrder(a.id).localeCompare(recipeOrder(b.id)));
}

// keepArtist(artist): saves a random artist among the listener's, returns its id (#50)
// invent(seed, { genre, base }): a new invented style (invented-styles); keepStyle(recipe): saves it among the user's, → id
// userPatterns(): the user's saved patterns as the director reads them (pattern-library): they join a song where they fit
export function createRadio({ root, t, tx, esc, store, options, recipes, player, toast, getLang, artists = () => [], face = () => '', keepArtist = () => null, invent = null, keepStyle = null, userPatterns = () => [], onPatternUsed = () => {}, reloadSamples = async () => {}, voiceFiles = () => ({}), mine = () => null, onTyped = () => {}, onSampleMade = () => {}, typedSaved = () => true, saveTyped = () => {} }) {
  const ids = recipes.map(r => r.id);
  // the options of how the next songs are made (new-song-panel D1): read, migrated and saved by the shared store under
  // coding-misk-radio, as before; the New song panel of Compose keeps its own values in a second instance
  const opts = options.state;
  let compOpen = false;
  const userPresets = () => store.get('coding-misk-comp-presets', {}) || {};
  // the seed of the last die thrown, per die (shown in its tooltip)
  const lastDice = {};
  let history = store.get('coding-misk-radio-history', []);
  if (!Array.isArray(history)) history = [];
  let seedField = '';
  // the session on air: stream of songs with their start bar; onAir = index in the stream
  let S = null, sessionN = 0;
  // the song of the session a steering is for: the workers keep its steering's results under it, and drop them when the
  // song leaves the air (incremental-steering D6)
  const ownerOf = item => (S && item ? `${S.sid}:${item.n}` : null);
  const leftAir = item => { if (item && player.forgetSteer) player.forgetSteer(ownerOf(item)); };
  const saveOpts = () => options.save();
  // the chooser on air of a new session (radio-chooser-versions D2, D4): the Settings choice, recorded in the recipe only
  // when it is not the default, so default recipes stay as they were; a session on air keeps the one it started with
  // reused-lines D5: the growth shape settings that differ from the defaults, recorded in the options of a new session
  const searchRecord = () => { const s = shapeSearchSetting((k, f) => store.get(k, f)); return s ? { shapeSearch: s } : {}; };
  // my phrases (my-phrases D4): a new session records the snapshot of the collection (never with Mai), so its songs,
  // Replay and a saved session draw the same phrases after the collection changes
  const mineRecord = () => { const m = mine(); return m ? { mine: m } : {}; };
  // the allowed voice styles (voice-combos-ui D5): a new session records the effective table when the user's overrides
  // change it, so its songs, Replay and its export draw with it after the overrides change; none: the committed file
  const comboRecord = () => { const c = combosRecord(); return c ? { combos: c } : {}; };
  const chooserRecord = () => { const c = chooserOf(store.get('coding-misk-air-chooser', null)); return c === AIR_CHOOSER ? {} : { chooser: c }; };
  const artistOf = id => options.artistOf(id);
  // with an artist, its whole taste goes to the director (and into the session recipe); the controls only show its centre
  const current = () => options.directorOptions({ use: 'radio' });
  // the shared song controls (new-song-panel D2): the radio's store, its compilation rules (picking an artist or a
  // style ends the compilation, a knob moved or thrown during one is held) and its display controls on air
  const comp = { off: () => { opts.compilation = 'off'; }, lock: keys => { if (opts.compilation !== 'off') for (const x of keys) opts.compLocks[x] = opts[x]; } };
  // a trial style (invented-styles D9) joins the session on air as an extra style, recorded in its recipe for a replay
  const addExtra = r => { if (!S || S.replay || S.frozen || !r) return; S.session.addStyle(r); const ex = (S.recipe.extraStyles || []).filter(x => x.id !== r.id); S.recipe.extraStyles = [...ex, clone(r)]; };
  const trialRecord = () => (opts.tempStyle ? { extraStyles: [clone(opts.tempStyle)] } : {});
  const ctl = { options, recipes, artists, keepArtist: a => keepArtist(a), invent, keepStyle, onTrial: r => addExtra(r), toast: (...a) => toast(...a), t, lastDice, root, comp, onCustom: changes => showDisplay(changes) };
  const sc = { state: opts, t, tx, esc, prefix: 'radio', lastDice };
  // the Custom controls shown: with a Durata a growing build grows inside it (phase 8, D12: "in the chosen length")
  const radioCustomC = () => { const C = customControls(opts.custom); return hasLength(opts.length) && C.build === 'crescendo' ? { C: { ...C, duration: 'planned' }, planned: true } : { C }; };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const vfold = id => { try { return !!(JSON.parse(localStorage.getItem('coding-misk-voice-folds') || '{}') || {})[id]; } catch (e) { return false; } };

  // ---------- stream ----------
  // options for song n: from the recipe when replaying, else the controls (recorded when they change)
  function optionsFor(n) {
    // (a recipe saved before radio-profiles replays as Classic)
    if (S.replay) return recipeOptionsAt(S.recipe, n);
    const o = current(), last = S.lastOptions;
    if (n > 0 && !same(o, last)) S.recipe.changes.push({ song: n, options: o });
    S.lastOptions = o;
    return o;
  }
  // async (prepareNext): a song that grows (radio-profiles D5) grows away from the page (player.grow) and the item
  // carries the promise in `growing`; otherwise it grows here, at once (the first song, a skip)
  function generate(async = false) {
    const n = S.stream.length, prev = S.stream[n - 1];
    // a frozen session (#38) plays its stored songs, never regenerated
    if (S.frozen) {
      const f = S.frozen[n]; if (!f) return null;
      if (prev && !prev.cut) prev.bars += extraOf(prev.entry.transition);
      const entry = { ...leadEntry(f.song), lead: false, frozen: true, transition: f.transition || undefined };
      const item = { song: f.song, entry, n, start: prev ? prev.start + prev.bars - (prev.cut ? 0 : overlapOf(prev.entry.transition)) : 0, bars: barsOf(f.song), frozen: true, commands: [] };
      // a grown song stored as heard (radio-profiles D11): never grown again, played with the controls it had
      if (f.grown && f.grown.custom) item.custom = f.grown.custom;
      if (f.grown && f.grown.controls) item.ctl = f.grown.controls;
      // (a song in blocks of a Custom session shows its code with the Custom controls, as it did on air)
      if (!f.grown && f.custom) item.custom = f.custom;
      S.stream.push(item);
      return item;
    }
    const raw = optionsFor(n), comp = raw.compilation;
    const g0 = S.session.next(withCombos(withMine(comp ? compilationOptions(S.recipe.seed, n, comp, recipes, howOf(raw)) : raw, S.recipe), S.recipe));
    // the session's choices (radio-arrangement D10) on the director's song: the base the listener's commands steer; the
    // director's own stays as base0, so a choice given later can be put on again
    const { song, entry, plan, opts: used } = biasSong(S.recipe, n, g0);
    // the director has just planned the transition from the song before: an interlude lengthens it,
    // an overlap starts this song before it ends
    if (prev && !prev.cut) { prev.extra = extraOf(prev.entry.transition); prev.bars += prev.extra; }
    const item = { song, entry, n, start: prev ? prev.start + prev.bars - (prev.cut ? 0 : overlapOf(prev.entry.transition)) : 0, bars: barsOf(song), base: { song, plan, opts: used }, base0: { song: g0.song, plan: g0.plan, opts: g0.opts }, plan, commands: [], plain: song };
    if (comp) item.comp = segmentAt(S.recipe.seed, n, comp, recipes, comp.pool || []);
    // a Crescendo or Live coder song grows on air (radio-profiles D5), with the Custom controls when the session has
    // them; a recipe saved before the radio grew its songs (no growth marker) plays every song in blocks, as heard
    if (raw.custom) item.custom = raw.custom;
    // (the Voce: narratore switch off, voice-full-controls D15: the narrator stays silent, the music is the same)
    if (raw.voices && raw.voices.narrator === false) item.hush = true;
    if (growsOnAir(S.recipe) && entry.profile) item.growCtx = { profile: entry.profile, artist: used.artist || null, into: prev && prev.entry.transition ? prev.entry.transition.kind : null, styles: shapeStyles(), phrase: plan.phrase, controls: raw.custom ? customControls(raw.custom) : null, ...(searchOf(S.recipe) ? { search: searchOf(S.recipe) } : {}) , ...(raw.length && raw.length !== 'style' ? { fitted: true } : {}) };
    S.stream.push(item);
    // a replayed session steers its songs the same way, before they play
    const recorded = (S.recipe.steering || []).filter(c => c.song === n);
    if (S.replay && recorded.length) { item.commands = recorded.map(({ song: _, ...c }) => c); resteer(item, { async }); }
    else if (item.growCtx) grow(item, song, { async });
    return item;
  }
  // the style recipes by id, for the growth shapes
  let shapeCache = null;
  // (with the styles a session embeds, invented-styles D10)
  const shapeStyles = () => { const base = shapeCache || (shapeCache = Object.fromEntries(recipes.map(r => [r.id, r]))), ex = S ? extraStylesOf(S.recipe) : []; return ex.length ? { ...base, ...Object.fromEntries(ex.map(r => [r.id, r])) } : base; };
  // an item's song grown from `song` (its director song, or the song as steered); a newer growth of the same item wins
  // (the growth of the director's song is kept as `g0`: commands on it are its waypoints, radio-profiles D9)
  // reused-lines D6: with shape settings that differ from the defaults, a song grows first with the default search (it is
  // ready in time, as before) and then, away from the page, with the settings; the wider growth takes its place when it
  // arrives at least WIDE_MARGIN seconds before the song starts and at most WIDE_WAIT after its default growth, and the
  // song has not been steered or started. What each song played is recorded in the session (shapeSearch.played), so a
  // replay and an export grow it the same; a replay tries the wider growth again for a song that played it.
  const WIDE_MARGIN = 20, WIDE_WAIT = 60;
  const record = (n, how) => { const s = S && S.recipe.options && S.recipe.options.shapeSearch; if (s) s.played = { ...(s.played || {}), [n]: how }; };
  // seconds until an item starts, at the tempo of the song on air
  const secondsTo = item => { const cur = S.stream[S.onAir], secs = cur && cur.song && cur.song.sections, bpm = (secs && secs.length && (secs[secs.length - 1].bpm || 120)) || 120; return (item.start - player.now()) * 240 / bpm; };
  function growWide(item, song) {
    const search = searchOf(S.recipe);
    if (!search || !player.grow || item.commands.length) { record(item.n, 'default'); return; }
    const token = item.growToken, t0 = performance.now(), mine = S;
    record(item.n, 'default');
    player.grow(song, { ...item.growCtx, wide: true }).then(g => {
      if (S !== mine || item.growToken !== token || item.commands.length || !g || !g.onAir) return;
      const i = S.stream.indexOf(item);
      if (i <= S.onAir || (performance.now() - t0) / 1000 > WIDE_WAIT || secondsTo(item) < WIDE_MARGIN) return;
      // (the window made ready before it goes on: its plan away from the page, #82)
      item.g0 = g; setSong(item, g); record(item.n, 'wide');
      swapSoon(windowPlayable(), item.start); render();
    }, () => {});
  }
  // then: called once the growth away from the page is ready (the window on air swaps to the grown song)
  function grow(item, song, { async = false, then = null } = {}) {
    const token = item.growToken = (item.growToken || 0) + 1, ctx = item.growCtx, g0t = performance.now();
    const recorded = S && S.replay ? playedOf(S.recipe, item.n) : null;
    const done = g => {
      if (item.growToken !== token) return;
      // (how long the song took to grow: the expected time of its steering, console-add-ahead D2)
      item.growMs = performance.now() - g0t;
      delete item.growing; delete item.finish;
      if (song === item.base.song) item.g0 = g;
      setSong(item, g);
      // (the wider growth after the default one, away from the page; a song grown here at once, or recorded with its
      // default growth, keeps the default)
      if (ctx.search && song === item.base.song) { if (async && recorded !== 'default') growWide(item, song); else record(item.n, 'default'); }
    };
    // (here and now: the song goes on air; the worker's answer, later, is left out)
    item.finish = () => { done(growOnAir(song, ctx)); item.growToken++; };
    if (!async || !player.grow) { item.finish(); return; }
    item.growing = player.grow(song, ctx).then(done, () => { if (item.growToken === token) item.finish(); });
    if (then) item.growing.then(() => { if (S && S.stream.includes(item)) then(); });
  }
  // a song still growing (or being steered) away from the page when it is needed now: it is done here
  function growNow(item) { if (item && item.growing && item.finish) item.finish(); }
  // commands as waypoints (radio-profiles D9): a grown song of a recipe with the growth marker 2 or more
  const airSteer = item => !!(item && item.growCtx && S && waypointsOnAir(S.recipe));
  // the director's view of a steered grown song (plan, options, the song as steered): the console and Save read it
  function airView(item) {
    const r = directorView({ song: item.base.song, plan: item.base.plan, opts: item.base.opts, commands: item.commands, seed: S.recipe.seed, n: item.n, grown: item.g0 });
    item.plan = r.plan; item.opts = r.opts; item.plain = r.song;
  }
  // the commands as the steering placed them: each pending one gets the boundary that leaves time for its typing (the
  // queue and the recipe show it); one no boundary was left for is dropped
  function airSettle(item, resolved) {
    const byId = new Map(resolved.map(c => [c.id, c]));
    item.commands = item.commands.flatMap(c => { const r = byId.get(c.id); if (!r) return c.pend ? [] : [c]; const { pend, ...x } = { ...c, ...r }; return [x]; });
    S.recipe.steering = (S.recipe.steering || []).flatMap(x => { if (x.song !== item.n) return [x]; const c = item.commands.find(y => y.id === x.id); return c ? [{ song: item.n, ...c }] : x.pend ? [] : [x]; });
  }
  // a grown song steered with waypoints, away from the page when async (the worker grows it first when needed)
  function steerAir(item, { async = false, then = null } = {}) {
    const token = item.growToken = (item.growToken || 0) + 1;
    // (#82: the director's view with the new commands, for the console until the answer, in a task of its own after the
    // press; the answer brings the view made in the worker)
    const hasView = async && !!player.steer;
    if (item.g0) { if (hasView) setTimeout(() => { if (S && item.growToken === token && item.growing) airView(item); }, 0); else airView(item); }
    const args = { grown: item.g0 || null, song: item.base.song, plan: item.base.plan, opts: item.base.opts, commands: item.commands.map(c => ({ ...c })), seed: S.recipe.seed, n: item.n, ctx: item.growCtx, chooser: airChooserOf(S.recipe), owner: ownerOf(item), ...(hasView ? { view: true } : {}) };
    // (the answer to a typed line gives the song already on air: that one is kept, so the window is not written again
    // and its plan not made twice, #82)
    const view = r => { if (r.view) { item.plan = r.view.plan; item.opts = r.view.opts; item.plain = r.view.song; } else airView(item); };
    const done = r => { if (item.growToken !== token || !S) return; delete item.growing; delete item.finish; item.g0 = r.grown; airSettle(item, r.commands); view(r); const same = item.said && item.said === item.song && JSON.stringify(r.song) === JSON.stringify(item.song); delete item.said; setSong(item, same ? item.song : r.song); };
    item.finish = () => { done(steerOnAir(args)); item.growToken++; };
    if (!async || !player.steer) { item.finish(); return; }
    // (the song on air in the console worker, where its console changes are steered and their results kept, D6)
    item.growing = (S.stream[S.onAir] === item && player.steerOnAir ? player.steerOnAir : player.steer)(args).then(done, () => { if (item.growToken === token) item.finish(); });
    if (then) item.growing.then(() => { if (S && S.stream.includes(item)) then(); });
  }
  // the song an item plays; its bars move the songs after it
  function setSong(item, song) {
    // (ver: the console is drawn again when the song changes, #82: a command's steering answers after its press)
    item.song = song; item.curves = null; item.ver = (item.ver || 0) + 1;
    const bars = barsOf(song) + (item.cut ? 0 : item.extra || 0);
    if (bars !== item.bars && !item.cut) { item.bars = bars; const i = S ? S.stream.indexOf(item) : -1; if (i >= 0) relayoutFrom(i); }
  }
  // the song to save or open in Compose: a grown song as the director wrote it (steered), with the profile it played
  // with, so Compose grows it with its own controls (D1)
  const songOut = item => (item && item.song && item.song.onAir ? { ...(item.plain || item.song), profile: item.song.onAir.profile } : item && item.song);
  // the window and its songs, each with its own controls (radio-profiles D7, D8): the song on air in its profile's view,
  // the next one shown (Classic, as before) or hidden (a grown song) as the incoming option says
  // over: { item, song } the window with that song on that item, without changing it (a typed line tried first, #82)
  // (items: the window's items, the song on air first; a skip makes the window of the next song before it goes on air)
  function windowPlayable(over = null, list = null) {
    const items = (list || S.stream.slice(S.onAir, S.onAir + 2)).map(x => (over && x === over.item ? { ...x, song: over.song } : x));
    const W = windowSong(items.map(x => ({ song: x.song, n: x.n + 1, start: x.start, transition: x.entry.transition, cut: x.cut })));
    const p = player.makePlayable(W, items.map((x, i) => ({ n: x.n + 1, prefix: `s${x.n + 1}-`, start: x.start, song: x.song, title: x.song.title, profile: profileOf(x), custom: !!x.custom || !!displayOn(x), ctl: liveControlsOf(x), show: i === 0 ? 'air' : showOf(x) })));
    // (what it is made of, so a resume can play on the window the player has when nothing changed, #82)
    if (p && typeof p === 'object') p.winKey = windowKey(items);
    return p;
  }
  // A window handed to the player once its song on air's written plan is made, a little at a time, with the page free
  // between the slices (#82: a typed line froze the page while a Live coder window made its plan in one block). It goes
  // on air when ready, or at the latest a third of a bar before the bar `by` (in the window's bars: the first bar the
  // change is heard; without one, the first step at least a bar ahead), and the plan is then finished at once, as before.
  // The steps before it change nothing the new window changes. Another window handed to the player meanwhile (a swap,
  // a skip, a start) wins, and this one is dropped; so does a window still waiting for its plan when a newer one comes
  // here (the newer one holds every change, and keeps the earlier of the two bars).
  let windowSeq = 0, soon = null;
  // (handed: the last window handed to the player)
  let handed = null;
  for (const k of ['swap', 'jump', 'start', 'resumeAt', 'stop']) if (typeof player[k] === 'function') { const f = player[k]; player[k] = (...a) => { windowSeq++; handed = k === 'stop' ? null : a[0]; return f.apply(player, a); }; }
  function swapSoon(p, by = Infinity) {
    if (!p.prepare) { if (soon) soon.done = true; soon = null; player.swap(p); return; }
    const seq = windowSeq, mine = S, now = player.now();
    let next = Number.isFinite(by) ? by : Math.min(...buildSteps(p.build).map(x => x.at).filter(b => b >= now + 1));
    if (soon && !soon.done) { if (soon.seq === seq && soon.S === mine) next = Math.min(next, soon.next); soon.done = true; }
    const me = soon = { seq, S: mine, next, done: false };
    const go = () => { if (me.done) return; me.done = true; if (soon === me) soon = null; if (windowSeq === seq && S === mine && S && S.paused === undefined) player.swap(p); };
    const watch = () => { if (me.done) return; if (windowSeq !== seq || S !== mine) { me.done = true; return; } if (player.now() >= next - 0.34) go(); else setTimeout(watch, 30); };
    p.prepare(12, () => !me.done && windowSeq === seq && S === mine).then(go, go);
    watch();
  }
  // the bar a typed line goes on in a song (its clip), or null
  const lineBarOf = (song, c) => { const sp = song && song.tracks.find(x => x.type === 'spoken'); if (!sp) return null; const k = Object.keys(sp.patterns || {}).find(q => sp.patterns[q].typed && sp.patterns[q].text && sp.patterns[q].text[c.lang] === c.text); const cl = k ? (sp.clips || []).find(x => x.pattern === k) : null; return cl ? cl.start : null; };
  // the bar a command is heard from: a typed line's own bar (At the right moment puts it on a later free part)
  const heardAt = (item, c) => (c.kind === 'say-live' ? lineBarOf(item.song, c) ?? c.at : c.at);
  // the first bar (in the window's bars) a pending command of the song on air changes, or Infinity
  const pendingBy = item => { const rel = relNow(), bars = item.commands.map(c => heardAt(item, c)).filter(b => b > rel); return bars.length ? item.start + Math.min(...bars) : Infinity; };
  // the display controls set while the session plays (radio-profiles 9.1): those changed during a song (x.display, on
  // the song on air and the songs already prepared) and, in a replay, the console's Custom ones when it started
  // (S.display). They change only how the code looks, so they are never recorded
  const displayOn = x => { const d = { ...(S && S.display), ...x.display }; return Object.keys(d).length ? d : null; };
  const liveControlsOf = x => { const d = displayOn(x); return d ? withDisplay(controlsOf(x), d) : controlsOf(x); };
  // display controls changed in the console: the song on air shows them from its next code edit, the songs prepared too;
  // the sound does not change
  function showDisplay(changes) {
    const d = displayOf(changes);
    if (!S || !Object.keys(d).length) return;
    for (const x of S.stream.slice(S.onAir)) x.display = { ...x.display, ...d };
    if (S.replay) S.display = { ...S.display, ...d };
    if (S.paused === undefined) player.swap(windowPlayable());
  }
  // the profile a song plays with: Crescendo or Live coder once grown, else Classic (blocks)
  const profileOf = x => (x.song && x.song.onAir ? x.song.onAir.profile : 'classic');
  // its controls: the Compose ones of song 0 (D2), the Custom ones, else the profile's own on air (owner decision 4), else
  // Classic
  const ownControls = x => (x.ctl ? x.ctl : x.custom ? customControls(x.custom) : x.song && x.song.onAir ? airControls(x.song.onAir.profile, x.song.onAir.free) : resolveProfile('classic'));
  const controlsOf = x => (x.hush ? { ...ownControls(x), narrator: false } : ownControls(x));
  const showOf = x => (opts.incoming !== 'profile' ? opts.incoming : profileOf(x) === 'classic' ? 'visible' : 'hidden');
  // lead (#29): { song, from } a song from Compose or the Songs tab played first (song 0, from bar "from"); the
  // radio continues after it. A recipe with a lead replays it.
  // limit and onEnd (#38): a saved session plays that many songs, then hands back; frozen: its stored songs
  function start({ seed, recipe, lead, limit = 0, onEnd = null, frozen = null } = {}) {
    stopQuiet();
    const s = recipe ? recipe.seed : (seed || seedField || undefined);
    const L = recipe ? recipe.lead : lead, le = L ? leadEntry(L.song) : null;
    // (the styles a replayed session embeds, or the trial style of a new one, invented-styles D10)
    const extra = recipe ? extraStylesOf(recipe) : opts.tempStyle ? [opts.tempStyle] : [];
    const session = createSession(recipes, s, { ...(le ? { lead: le } : {}), extra });
    // a new session records the growth marker (radio-profiles stage 4): its Crescendo and Live coder songs grow on air,
    // and its replays grow them the same; a recipe saved before has none and replays in blocks
    // (a new session: the steering's kept results of the last one dropped in the workers, incremental-steering D6)
    if (player.forgetSteer) player.forgetSteer('*');
    S = { sid: ++sessionN, session, stream: [], onAir: 0, pending: false, replay: !!recipe, recipe: recipe ? clone(recipe) : { seed: session.seed, options: { ...current(), ...searchRecord() }, changes: [], growth: GROWTH_ON_AIR, ...chooserRecord(), ...mineRecord(), ...comboRecord(), ...(L ? { lead: leadRecord(L) } : {}), ...trialRecord() }, lastOptions: null, lastCard: 0 };
    S.recipe.seed = session.seed;
    // a replay shows the code with the display controls set when it starts (the console's Custom profile), not with each
    // change made while the session was heard (radio-profiles 9.1)
    if (recipe && opts.profile === 'custom') S.display = displayOf(customControls(opts.custom));
    if (limit) { S.limit = limit; S.onEnd = onEnd; }
    if (frozen) { S.frozen = frozen; S.replay = true; generate(); }
    else if (L) {
      // song 0 keeps the profile it had in Compose (radio-profiles D2): grown as there, with its controls; a Classic lead
      // plays as written, as before. Save and Open in Compose give the song as written (plain) with that profile
      const R = S.recipe.lead, g = leadOnAir(R, shapeStyles());
      const it = { song: g, entry: le, n: 0, start: 0, bars: barsOf(g), lead: true, commands: [], plain: R.song };
      if (g.onAir && R.controls) it.ctl = R.controls;
      S.stream.push(it);
    }
    else generate();
    if (!limit) remember(S.stream[0]);
    if (player.warm) player.warm();
    player.start(windowPlayable(), L ? Math.min(L.from || 0, S.stream[0].bars - 1) : 0, { voices: airVoices() });
    render();
  }
  // a song from Compose or a song card goes on in the radio, in the styles closest to it
  // the songs of a session as heard (#38), rebuilt without playing: song 0, then each song with its steering
  // until(out): optional, stops early once true (the radio export by length, #8)
  function rebuild(recipe, count, until = null) {
    const out = sessionItems(recipes, recipe, count, until);
    // a grown song is marked as grown, with what its controls need (Freeze, radio-profiles D11): never grown again
    const grownOf = (x, i) => {
      const a = x.song && x.song.onAir; if (!a) return null;
      if (a.lead) return { profile: a.profile, free: !!a.free, ...(recipe.lead && recipe.lead.controls ? { controls: clone(recipe.lead.controls) } : {}) };
      const custom = recipeOptionsAt(recipe, i).custom;
      return { profile: a.profile, free: !!a.free, ...(custom ? { custom: clone(custom) } : {}) };
    };
    // (a song in blocks of a Custom session keeps the Custom controls its code was shown with)
    const customOf = (x, i) => (x.entry && x.entry.lead ? null : recipeOptionsAt(recipe, i).custom || null);
    return out.map((x, i) => { const g = grownOf(x, i), c = g ? null : customOf(x, i); return { song: x.song, transition: x.entry.transition || null, artist: x.entry.artist ? x.entry.artist.name : '', ...(g ? { grown: g } : {}), ...(c ? { custom: clone(c) } : {}) }; });
  }
  // the songs of rebuilt items as the radio plays them (radio-profiles D12, the exports): the profile, the controls and
  // whether a song not on air is shown, as windowPlayable gives them
  function airSongs(items) {
    return items.map(x => {
      const g = x.grown || {}, y = { song: x.song, ...(g.controls ? { ctl: g.controls } : {}), ...(g.custom || x.custom ? { custom: g.custom || x.custom } : {}) };
      return { profile: profileOf(y), custom: !!y.custom, ctl: controlsOf(y), show: showOf(y) };
    });
  }
  // ---------- fast export of the radio (#8) ----------
  // a song's seconds from its sections (a tempo ramp counts at its middle)
  const songSeconds = song => song.sections.reduce((a, x) => a + x.bars * 240 / (((x.bpm || 120) + (x.bpmEnd ?? x.bpm ?? 120)) / 2), 0);
  // the songs of an export range: { kind: 'now' } from the first song to the one on air, { kind: 'songs', n } from the
  // song on air, { kind: 'minutes', minutes } from the song on air until the length is reached. With the radio off the
  // ranges start at the first song of a new session (the seed field and the options as they are).
  function exportItems(range) {
    // with the radio off: a new session, with the growth marker when one of its songs grows (radio-profiles D12; a session
    // of Classic songs keeps the recipe it had)
    const recipe = S ? clone(S.recipe) : { seed: createSession(recipes, seedField || undefined).seed, options: { ...current(), ...searchRecord() }, changes: [], growth: GROWTH_ON_AIR, ...chooserRecord(), ...mineRecord(), ...comboRecord(), ...trialRecord() };
    const marked = (r, items) => { if (!S && !items.some(x => x.grown)) delete r.growth; return items; };
    const from = S ? S.stream[S.onAir].n : 0;
    let items;
    // a clip (#5): one song composed to the clip's length, at full energy, from a new seed each time
    if (range.kind === 'clip') {
      const sec = Math.max(5, Math.min(600, +range.seconds || 30));
      const clip = { seed: createSession(recipes, seedField || undefined).seed, options: { ...current(), ...searchRecord(), fit: Math.max(4, sec - 1) }, changes: [], growth: GROWTH_ON_AIR, ...chooserRecord(), ...mineRecord(), ...comboRecord(), ...trialRecord() };
      const items = rebuild(clip, 1);
      if (!items.some(x => x.grown)) delete clip.growth;
      return { recipe: clip, items, from: 0 };
    }
    if (range.kind === 'now') { if (!S) return null; items = rebuild(recipe, from + 1); }
    else if (range.kind === 'songs') items = rebuild(recipe, from + Math.max(1, range.n | 0));
    else {
      const target = Math.max(1, +range.minutes || 1) * 60;
      // the songs from the one on air, minus the bars their transitions overlap, until the target
      items = rebuild(recipe, 1e4, out => out.length > from && out.slice(from).reduce((a, x, i, l) => a + songSeconds(x.song) - (i < l.length - 1 ? overlapOf(x.entry.transition) * 240 / (x.song.sections[x.song.sections.length - 1].bpm || 120) : 0), 0) >= target);
    }
    marked(recipe, items);
    return { recipe, items: items.slice(range.kind === 'now' ? 0 : from), from: range.kind === 'now' ? 0 : from };
  }
  // a session item of a playlist: the songs heard so far (the one on air included)
  // (radio-profiles D11: with a grown song it also records the shapes and growth versions, so a later change warns)
  const sessionItem = (recipe, count, first) => ({ recipe: clone(recipe), count, title: t(count === 1 ? 'plSessionTitle1' : 'plSessionTitle', { title: first, n: count }), date: new Date().toISOString(), ...sessionVersions({ director: DIRECTOR_VERSION, shapes: SHAPES_VERSION, growth: CRESCENDO_VERSION }, holdsGrown(recipes, recipe, count)) });
  function playSession(s, { onEnd } = {}) { start({ recipe: s.recipe, limit: s.count, onEnd, frozen: s.frozen || null }); }
  // the end of a limited session: hand back to the playlist
  function endLimited() { const cb = S.onEnd; S = null; render(); if (cb) cb(); else player.stop(); }
  // how (radio-profiles D2): { profile, controls } the profile and the Compose controls the song was growing with, or
  // null when it played in blocks: then an undeclared song takes the session's forced profile (grown as a radio song), a
  // declared or Classic one stays as written
  function continueSong(song, from = 0, how = null) {
    opts.artist = null;
    opts.styles = stylesNear(song, recipes);
    saveOpts();
    let lead = { song, from };
    if (how && RADIO_PROFILES.includes(how.profile) && how.profile !== 'classic') lead = { ...lead, profile: how.profile, ...(how.controls ? { controls: clone(how.controls) } : {}) };
    else if (!how || !how.declared) { const r = savedSongProfile(song, { forced: opts.profile }); if (r.from === 'session' && r.profile !== 'classic') lead = { ...lead, profile: r.profile }; }
    start({ lead });
  }
  // the recipe's lead: the song as written, its bar, and the profile and controls it keeps (D2; none for Classic)
  const leadRecord = L => ({ song: clone(L.song), from: L.from || 0, ...(L.profile ? { profile: L.profile } : {}), ...(L.controls ? { controls: clone(L.controls) } : {}) });
  function stopQuiet() { if (S) { S = null; } }
  function stop() { if (!S) return; if (recS) stopRec(); S = null; player.stop(); render(); }
  // pause keeps the session, the window and the bar; resume plays on from that bar
  function pause() { if (!S || S.paused !== undefined) return; S.paused = player.halt(); if (recS) { recS.cap.pause(); recS.pauseStart = performance.now(); } render(); }
  function resume() {
    if (!S || S.paused === undefined) return;
    const bar = S.paused; delete S.paused;
    if (recS) { recS.cap.resume(); if (recS.pauseStart) recS.paused += performance.now() - recS.pauseStart; recS.pauseStart = null; }
    // (#82: the window the player has when nothing it is made of changed during the pause: a window made anew had every
    // cache empty, its code, its paste rule and its plan made again on the first bars after the resume, and the
    // scheduler skipped windows there)
    const items = S.stream.slice(S.onAir, S.onAir + 2), keep = handed && handed.winKey && sameWindow(handed.winKey, windowKey(items));
    player.resumeAt(keep ? handed : windowPlayable(), bar);
    render();
  }
  // the next song is generated once the song on air has played 40 % of its length: control changes made
  // before then still reach it, and it is ready long before it is needed
  function prepareNext(cyc) {
    const cur = S.stream[S.onAir];
    if (S.stream.length > S.onAir + 1 || S.pending || cyc < cur.start + cur.bars * 0.4 || (S.limit && S.stream.length >= S.limit)) return;
    S.pending = true;
    const mine = S;
    idle(() => {
      if (S !== mine) return;
      // (a skip pressed meanwhile made the next song already, #82)
      if (S.stream.length > S.onAir + 1) { S.pending = false; return; }
      // (the window with the next song made ready a little at a time: the song on air's plan is made again, #82)
      // (the next song's voice samples then load one at a time, in a task of their own, #82)
      const it = generate(true), ready = () => { if (S !== mine) return; S.pending = false; const nx = S.stream[S.onAir + 1]; swapSoon(windowPlayable(), nx ? nx.start : Infinity); render(); setTimeout(() => { if (S === mine && player.preloadVoices && nx) player.preloadVoices(voicesOf(nx)); }, 0); };
      if (it && it.growing) it.growing.then(ready); else ready();
    });
  }
  // called by the player every frame while the radio plays
  function tick(cyc) {
    if (!S || S.paused !== undefined) return;
    prepareNext(cyc);
    const cur = S.stream[S.onAir];
    if (cyc >= cur.start + cur.bars) {
      if (S.limit && S.onAir + 1 >= S.limit) return endLimited();
      if (S.stream.length <= S.onAir + 1 && !generate()) return endLimited();
      // (a song still growing away from the page grows here: it goes on air now)
      const ahead = S.ahead; delete S.ahead;
      growNow(S.stream[S.onAir + 1]);
      S.onAir++; leftAir(S.stream[S.onAir - 1]);
      if (!S.limit) remember(S.stream[S.onAir]);
      // (#82: the window made ready ahead, when nothing it is made of changed since; else made here, as before)
      const items = S.stream.slice(S.onAir, S.onAir + 2), made = !!(ahead && ahead.p && sameWindow(ahead.key, windowKey(items)));
      changed = { ahead: changed.ahead + (made ? 1 : 0), here: changed.here + (made ? 0 : 1), p: made ? ahead.p : windowPlayable() };
      player.swap(changed.p);
      // (the radio drawn in a task of its own, the console in another)
      setTimeout(() => render({ split: true }), 0);
    } else {
      changeAhead(cyc);
      if (performance.now() - S.lastCard > 250) { S.lastCard = performance.now(); renderNow(cyc); }
    }
  }
  // the window that starts at the next song (items: it and the song after it, as they will be on air), its song's
  // written plan made away from the page (#82). Shared by the skip and the natural song change; each hands it to the
  // player on its own bar. alive(): false drops the preparation; ready once the plan is made, ms the time it took
  function nextWindow(items, alive) {
    const w = { p: windowPlayable(null, items), key: windowKey(items), ready: false, ms: null }, t0 = performance.now();
    const prepared = () => { w.ready = true; w.ms = performance.now() - t0; };
    (w.p.prepare ? w.p.prepare(12, alive) : Promise.resolve()).then(prepared, prepared);
    return w;
  }
  // what windowPlayable makes a window of: compared by reference, so a change to a song, its start, its transition,
  // its controls or the display controls makes the window again
  const windowKey = items => [S.display, opts.incoming, ...items.flatMap(x => [x.song, x.n, x.start, x.bars, x.entry, x.entry.transition, x.cut, x.custom, x.ctl, x.hush, x.display])];
  const sameWindow = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  // the natural song change made ready ahead (#82: the window of the next song on air was made at the change, its
  // Live coder plan included, in one block on the page): once the next song is ready and its change is less than
  // AHEAD_SECONDS (at least AHEAD_BARS) away, its window is made in a task of its own and its plan in the plan worker;
  // made again when something it is made of changes. At the change tick hands it to the player, as it handed the
  // window made there
  const AHEAD_SECONDS = 16, AHEAD_BARS = 4;
  // the natural changes with the window made ahead and made at the change, and the last window handed (check-radio)
  let changed = { ahead: 0, here: 0, p: null };
  function changeAhead(cyc) {
    const cur = S.stream[S.onAir], nx = S.stream[S.onAir + 1], end = cur.start + cur.bars;
    if (!nx || nx.growing || S.pending || S.skipping || (S.limit && S.onAir + 1 >= S.limit)) return;
    if (end - cyc > AHEAD_BARS && (end - cyc) * barSecOf(cur.song, Math.max(0, Math.floor(cyc - cur.start))) > AHEAD_SECONDS) return;
    const items = S.stream.slice(S.onAir + 1, S.onAir + 3), a = S.ahead;
    if (a && (a.queued || sameWindow(a.key, windowKey(items)))) return;
    const mine = S, me = S.ahead = { queued: true, key: [] };
    setTimeout(() => {
      if (S !== mine || S.ahead !== me) return;
      const its = S.stream.slice(S.onAir + 1, S.onAir + 3);
      if (!its.length || its[0].growing) { delete S.ahead; return; }
      // (dropped once the change has gone by, another window is made, or something it is made of changed)
      const key = windowKey(its);
      let w = null;
      w = S.ahead = nextWindow(its, () => S === mine && (S.ahead === me || S.ahead === w) && sameWindow(key, windowKey(S.stream.slice(S.onAir + 1, S.onAir + 3))));
    }, 0);
  }
  // skip: the song on air ends with this bar, the next one starts on the next bar
  // (#82: a next song still growing away from the page, or not made yet, grew here, on the main thread: up to seconds
  // of frozen page and late notes. Now the skip waits for it, "Skipping…", while the song on air plays on; then the
  // next song's window is made ready, its plan away from the page, and it goes on air on the first bar after that)
  function skip() {
    if (!S || S.paused !== undefined || S.skipping) return;
    if (S.limit && S.onAir + 1 >= S.limit) return endLimited();
    if (S.stream.length <= S.onAir + 1 && !generate(true)) return endLimited();
    const mine = S, nx = S.stream[S.onAir + 1], token = S.skipping = { at: performance.now() };
    paintSkip();
    const alive = () => S === mine && S.skipping === token && S.paused === undefined && S.stream[S.onAir + 1] === nx;
    const drop = () => { if (S === mine && S.skipping === token) { delete S.skipping; render(); } };
    // (a newer growth or steering of the next song meanwhile is waited for too)
    const grown = () => { if (!alive()) return drop(); if (nx.growing) { nx.growing.then(grown, grown); return; } skipPrepare(nx, token, alive, drop); };
    grown();
  }
  // the next song's window, its first bar at least SKIP_LEAD seconds plus the expected preparation ahead, made ready (the
  // plan of its song away from the page), then handed to the player on that bar; when the bar is reached first, the
  // skip goes on at the next bar with the window made here (as before)
  const SKIP_LEAD = 0.5;
  let skipPrep = 1;
  function skipPrepare(nx, token, alive, drop) {
    const cur = S.stream[S.onAir], now = player.now(), bs = barSecOf(cur.song, Math.max(0, Math.floor(now - cur.start)));
    const cut = Math.max(Math.floor(now) + 1, Math.ceil(now + (SKIP_LEAD + skipPrep) / bs));
    const song0 = nx.song;
    let done = false;
    const go = () => {
      done = true;
      // (too late for its bar, or the next song changed meanwhile: on the next bar, with a window made now)
      if (player.now() > cut - 0.05 || nx.song !== song0) { skipNow(); return; }
      skipNow(cut, w.p);
    };
    // (on air in the last half bar before the cut, as a skip on the next bar did; not ready a third of a bar before it,
    // it goes on air anyway and its plan is finished at once)
    const w = nextWindow([{ ...nx, start: cut }], () => !done && alive());
    let seen = false;
    const watch = () => {
      if (done) return; if (!alive()) { done = true; drop(); return; }
      if (w.ready && !seen) { seen = true; skipPrep = Math.max(0.3, Math.min(8, w.ms / 1000 * 1.3)); }
      const now = player.now(); if ((w.ready && now >= cut - 0.5) || now >= cut - 0.34) go(); else setTimeout(watch, 30);
    };
    watch();
  }
  // the skip itself: the song on air cut at `cut` (the next bar without one), the next song on air from there
  function skipNow(cut = null, p = null) {
    delete S.skipping;
    const cyc = player.now(), cur = S.stream[S.onAir];
    if (cut === null) cut = Math.floor(cyc) + 1;
    delete S.ahead;
    growNow(S.stream[S.onAir + 1]);
    cur.bars = Math.max(1, cut - cur.start); cur.cut = true;
    relayout();
    S.onAir++; leftAir(S.stream[S.onAir - 1]);
    remember(S.stream[S.onAir]);
    player.jump(p || windowPlayable(), S.stream[S.onAir].start, { voices: airVoices() });
    // (the radio drawn in a task of its own)
    setTimeout(() => render(), 0);
  }
  // the Skip button while the skip waits for the next song
  function paintSkip() {
    const b = root.querySelector('#radio-skip');
    if (!b) return;
    const on = !!(S && S.skipping);
    b.disabled = on || !S || S.paused !== undefined;
    b.textContent = `⏭ ${t(on ? 'radioSkipping' : 'radioSkip')}`;
    if (on) b.setAttribute('aria-busy', 'true'); else b.removeAttribute('aria-busy');
  }
  // ---------- recording (#30) ----------
  // the session as audio, from now until stopped (pauses leave no gap), with the recipe and a track list
  let recS = null, startingRec = false;
  const recElapsed = () => !recS ? 0 : (performance.now() - recS.t0 - recS.paused - (recS.pauseStart ? performance.now() - recS.pauseStart : 0)) / 1000;
  const clockOf = sec => { const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s2 = Math.floor(sec % 60); return `${h ? `${h}:${String(m).padStart(2, '0')}` : String(m).padStart(2, '0')}:${String(s2).padStart(2, '0')}`; };
  const listEntry = item => ({ t: recElapsed(), title: item.song.title, artist: item.entry.artist ? item.entry.artist.name : '' });
  // video (#27): the frame and the audio; the video bar's stop and cancel end it too
  async function startRec(video = false) {
    if (recS || startingRec) return;
    let cap;
    if (video) {
      startingRec = true;
      cap = await player.captureVideo({ onStop: () => stopRec(), onCancel: () => stopRec(true) });
      startingRec = false;
      if (!cap || recS) { if (cap) cap.stop(true); return; }
    }
    if (!S) start();
    recS = { cap: cap || player.capture(), video, t0: performance.now(), paused: 0, pauseStart: S.paused !== undefined ? performance.now() : null, list: [], seed: S.recipe.seed };
    if (recS.pauseStart) recS.cap.pause();
    recS.list.push(listEntry(S.stream[S.onAir]));
    render();
  }
  function recordFromStart() {
    const recipe = S ? clone(S.recipe) : history[0] && history[0].recipe && clone(history[0].recipe);
    if (!recipe) return;
    if (recS) stopRec();
    start({ recipe });
    startRec(player.outKind() === 'video');
  }
  // cancel: a video is dropped, nothing is saved
  async function stopRec(cancel = false) {
    if (!recS) return;
    const r = recS; recS = null; render();
    const recipe = S ? clone(S.recipe) : null, base = `coding-misk-radio-${String(r.seed).replace(/[^\w-]+/g, '-')}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}`;
    const out = await r.cap.stop(cancel);
    if (!out) { toast(t('vidCancelled')); return; }
    const { blob, ext } = out;
    saveBlob(`${base}.${ext}`, blob);
    const lines = [`coding-misk radio · seed ${r.seed} · ${new Date().toLocaleString()}`, '', ...r.list.map(x => `${clockOf(x.t)} ${x.title}${x.artist ? ` · ${x.artist}` : ''}`)];
    setTimeout(() => saveBlob(`${base}-tracklist.txt`, new Blob([lines.join('\n') + '\n'], { type: 'text/plain' })), 400);
    if (recipe) setTimeout(() => saveBlob(`${base}-recipe.json`, new Blob([JSON.stringify(recipe, null, 2) + '\n'], { type: 'application/json' })), 800);
    toast(t(r.video ? 'vidRecSaved' : 'recSaved'));
  }
  function saveBlob(name, blob) {
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  // ---------- steering (#24) ----------
  // the song of an item rebuilt from its original plus every command still standing
  // (a grown song of a recipe from stage 4, growth marker 1, grows again from the song as steered, away from the page
  // when async: the window swaps when it is ready; since stage 5 a grown song's commands are waypoints, steerAir)
  function resteer(item, { async = false, then = null } = {}) {
    if (airSteer(item)) return steerAir(item, { async, then });
    // (#82: a Classic song is steered away from the page too, as a grown one: on the press it took the main thread; the
    // window swaps when the answer comes, and a song needed before that is steered here, growNow)
    if (async && !item.growCtx && player.steerPlain) return steerPlainAway(item, then);
    const r = steerSong({ ...item.base, commands: item.commands, seed: S.recipe.seed, n: item.n });
    item.plan = r.plan; item.opts = r.opts; item.plain = r.song;
    if (!item.growCtx) { setSong(item, r.song); return; }
    grow(item, r.song, { async, then });
  }
  function steerPlainAway(item, then) {
    const token = item.growToken = (item.growToken || 0) + 1, args = { ...item.base, commands: item.commands.map(c => ({ ...c })), seed: S.recipe.seed, n: item.n, owner: ownerOf(item) };
    const done = r => { if (item.growToken !== token || !S) return; delete item.growing; delete item.finish; item.plan = r.plan; item.opts = r.opts; item.plain = r.song; setSong(item, r.song); };
    item.finish = () => { done(steerSong(args)); item.growToken++; };
    item.growing = player.steerPlain(args).then(done, () => { if (item.growToken === token) item.finish(); });
    if (then) item.growing.then(() => { if (S && S.stream.includes(item)) then(); });
  }
  function relayoutFrom(i) {
    for (let k = i + 1; k < S.stream.length; k++) { const p = S.stream[k - 1]; S.stream[k].start = p.start + p.bars - (p.cut ? 0 : overlapOf(p.entry.transition)); }
  }
  // (the bar now: where the radio was paused while it is, #82: a paused scheduler reads bar 0, so the console listed
  // every command of the song as still to come and counted the badges from the start of the session, "273 s")
  const nowBar = () => (S && S.paused !== undefined ? S.paused : player.now());
  const relNow = () => { const it = S.stream[S.onAir]; return Math.max(0, nowBar() - it.start); };
  // bars at the end of a song where the next song already plays (the transition overlap past the song's own bars)
  const tailOf = item => (item.cut || !item.entry.transition ? 0 : Math.max(0, overlapOf(item.entry.transition) - extraOf(item.entry.transition)));
  const secs = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  let cmdN = 0;
  // queues a command on the song on air: rewrites it from the command's bar and swaps the window
  // pre (a typed line, #82): { at, song, steer, p } its bar, the song on air with it (grown on air) or the steering's
  // result (Classic), and the window with it, already made ready: the line was tried before it was queued
  function command(c, pre = null) {
    if (!S || S.paused !== undefined) return false;
    const item = S.stream[S.onAir], rel = relNow(), before = item.song;
    if (!item.plan) { toast(t(item.frozen ? 'steerWhy:frozen' : 'steerWhy:lead')); return false; }
    // a grown song (radio-profiles D9): the first boundary of the waypoint, in the grown song's bars; the steering
    // moves it to the phrase after when its edit cannot be typed in time (pend, with the bar it came: q)
    const air = airSteer(item) && item.g0, off = air ? airOffset(item.g0) : 0;
    let at;
    if (air) {
      const cands = pre ? [pre.at] : airBoundaries(c.kind, rel, item.plan, item.g0);
      if (!cands.length || (c.kind === 'extend' && whyNot(c, item.plain || item.base.song, item.plan, rel - off, tailOf(item)))) { toast(t('steerLate')); return false; }
      at = cands[0];
    } else {
      at = pre ? pre.at : applyBar(c.kind, rel, item.plan);
      if (at <= rel || at >= barsOf(item.song) || (c.kind === 'extend' && whyNot(c, item.song, item.plan, rel, tailOf(item)))) { toast(t('steerLate')); return false; }
    }
    const cmd = { ...c, at, id: ++cmdN, ...(air ? { at0: at, q: Math.round(rel * 100) / 100, pend: true } : {}) };
    // the whole session (radio-arrangement D10): an arrangement command also goes to the recipe's arrange list, for the
    // songs after this one; Vary, Swap and the riser stay on this song
    const forSession = opts.scope === 'session' && SESSION_KINDS.includes(c.kind);
    if (forSession) cmd.scope = 'session';
    // an extension remembers where its part goes, so cancelling it also drops the curve edits made on later parts
    if (c.kind === 'extend') { cmd.ins = extendIndex(item.plan, Math.ceil((at - off) / item.plan.phrase) >> 1); cmd.s = Math.round(extendSeconds(item.plan)); }
    // a later command of the same kind on the same track (or curve part) replaces a pending one
    // (two Vary or two Swap of the same part for the same boundary count as one)
    const same = x => x.at > rel && x.kind === cmd.kind && (x.track || '') === (cmd.track || '') && (x.curve || '') === (cmd.curve || '') && (x.d ?? -1) === (cmd.d ?? -1) && (['volume', 'curve', 'curve-reset', 'instrument', 'voice'].includes(x.kind) || (['vary', 'swap'].includes(x.kind) && x.type === cmd.type && (x.target || '') === (cmd.target || '') && (x.at0 ?? x.at) === (cmd.at0 ?? cmd.at)));
    item.commands = item.commands.filter(x => !same(x));
    item.commands.push(cmd);
    S.recipe.steering = [...(S.recipe.steering || []).filter(x => !(x.song === item.n && same(x))), { song: item.n, ...cmd }];
    // a typed line on a grown song goes on the song on air at once, on its bar, as steerOnAir puts it after the other
    // commands: the steering away from the page can answer after that bar (it may wait behind the growth of the next
    // song), and a line whose step reached the player late was never heard (fx3). The answer gives the same line
    if (air && c.kind === 'say-live') { setSong(item, pre ? pre.song : sayAir(item.song, [{ at, text: c.text, lang: c.lang, speaker: c.speaker || '', mode: c.mode === 'moment' ? 'moment' : 'now' }])); item.said = item.song; }
    // (the answer swaps the window only when it changed the song: a typed line's answer is the song already playing)
    const swapped = item.song;
    // (a typed line tried on a Classic song: the steering's result is the song with it, as resteer gives it)
    if (pre && pre.steer && !air) { const r = pre.steer; item.plan = r.plan; item.opts = r.opts; item.plain = r.song; setSong(item, r.song); }
    else resteer(item, { async: true, then: () => { keepHistory(item); if (item.song !== swapped) swapSoon(windowPlayable(), pendingBy(item)); renderNow(); } });
    if (forSession) { const { at: _a, id: _i, scope: _s, at0: _b, q: _q, pend: _p, ...e } = cmd; S.recipe.arrange = [...(S.recipe.arrange || []), { song: item.n, ref: cmd.id, ...e }]; rebias(item.n); }
    keepHistory(item);
    // the whole session: energy, complexity and voice also move the sliders for the next songs
    if (opts.scope === 'session' && !opts.artist) {
      const nudge = { 'energy-up': ['energy', 0.1], 'energy-down': ['energy', -0.1], 'more-complex': ['complexity', 0.1], 'less-complex': ['complexity', -0.1], 'talk-more': ['talk', 0.1], 'talk-less': ['talk', -0.1] }[cmd.kind];
      if (nudge) { opts[nudge[0]] = Math.round(Math.max(0, Math.min(1, opts[nudge[0]] + nudge[1])) * 100) / 100; saveOpts(); syncSliders(); }
    }
    // (a typed line tried first: its window is ready, made with this very song)
    // (and the console drawn in a task of its own)
    if (pre && pre.p) { if (soon) soon.done = true; soon = null; player.swap(pre.p); setTimeout(() => renderNow(), 0); return true; }
    // (#82: while the steering runs away from the page the song is the same: its window, and the plan of its code, were
    // made again for nothing; the answer swaps the window)
    if (!(item.growing && item.song === before)) swapSoon(windowPlayable(), item.start + heardAt(item, cmd));
    renderNow();
    return true;
  }
  // the songs after song k take the session's choices again (radio-arrangement D10): from the director's song (base0)
  // with the recipe's arrange list as it is now, then their own commands or their growth; a song that grows or is
  // steered again away from the page swaps the window on air when it is ready, so the song being prepared plays the
  // choice (#86)
  function rebias(k) {
    const swap = () => { swapSoon(windowPlayable(), (S.stream.find(x => x.n > k) || {}).start ?? Infinity); renderNow(); };
    for (const x of S.stream) {
      if (x.n <= k || !x.base0 || x.frozen) continue;
      const b = biasSong(S.recipe, x.n, x.base0);
      x.base = { song: b.song, plan: b.plan, opts: b.opts }; x.plan = b.plan; x.opts = b.opts; x.plain = b.song; delete x.g0;
      if (x.commands.length) resteer(x, { async: true, then: swap });
      else if (x.growCtx) grow(x, b.song, { async: true, then: swap });
      else setSong(x, b.song);
    }
  }
  function cancel(id) {
    const item = S && S.stream[S.onAir];
    if (!item) return;
    const c = item.commands.find(x => x.id === id);
    if (!c) return;
    // a choice for the session already heard on this song: until the next song starts it can leave the session
    if (c.at <= relNow() && c.scope === 'session') {
      S.recipe.arrange = (S.recipe.arrange || []).filter(e => !(e.song === item.n && e.ref === id));
      c.scope = 'song';
      S.recipe.steering = (S.recipe.steering || []).map(x => (x.song === item.n && x.id === id ? { ...x, scope: 'song' } : x));
      rebias(item.n); player.swap(windowPlayable()); renderSteer(true);
      return;
    }
    if (c.at <= relNow()) return;
    // (the window without it made ready before the bar it was heard from, #82)
    const by = item.start + heardAt(item, c);
    if (c.scope === 'session') { S.recipe.arrange = (S.recipe.arrange || []).filter(e => !(e.song === item.n && e.ref === id)); rebias(item.n); }
    const drop = x => x.id === id || (c.kind === 'extend' && x.kind === 'curve' && x.id > id && x.at > relNow() && x.d >= c.ins);
    item.commands = item.commands.filter(x => !drop(x));
    S.recipe.steering = (S.recipe.steering || []).filter(x => !(x.song === item.n && drop(x)));
    const before = item.song;
    resteer(item, { async: true, then: () => { keepHistory(item); swapSoon(windowPlayable(), by); renderNow(); } });
    keepHistory(item);
    if (!(item.growing && item.song === before)) swapSoon(windowPlayable(), by);
    renderNow();
  }
  // ---------- "+" and "−" prepared ahead (console-add-ahead) ----------
  // A press of "+" or "−" in the Arrangement group only records a pending change (D1): a signed net count per instrument
  // for one boundary (D3). The batch of a boundary is prepared ADD_SETTLE ms after its last press, away from the page
  // (D4): the steering in the growth worker (Classic too), the window a little at a time, the new tracks' sounds. It
  // enters at the boundary when ready and the page is quiet, else it moves to the next phrase start (D2); ADD_BOUND
  // seconds after the first press it enters on the next boundary where it is ready, even under load (logged).
  // The default boundary is the first phrase start at least ADD_LEAD seconds plus the expected preparation ahead of the
  // press. (A half-phrase start was planned for a later entry; the steering writes a change from the phrase start at or
  // after its bar, so later entries go to the next phrase start.)
  const ADD_LEAD = 2, ADD_SETTLE = 250, ADD_BOUND = 30, ADD_QUIET = 2000, ADD_TASK = 50, ADD_STEP = 100, ADD_MARGIN = 0.34;
  const load = createLoadMonitor();
  let batches = [], batchN = 0, addPrep = 1, addRest = 0.5, addTimer = null, addsDone = [];
  // the longest piece of the batches' own work on the main thread, per kind (tools/check-add-lag.cjs)
  const addCost = {};
  const cost = (k, t0) => { const d = performance.now() - t0; if (d > (addCost[k] || 0)) addCost[k] = Math.round(d); };
  // the seconds of one bar of a song at a bar (4/4 bars, as leadOf reads them)
  const barSecOf = (song, bar) => { let a = 0, bpm = 120; for (const x of song.sections) { bpm = x.bpm || 120; if (bar < a + x.bars) break; a += x.bars; } return 240 / bpm; };
  const secsTo = (item, at) => (item.start + at - nowBar()) * barSecOf(item.song, at);
  // the phrase starts of the song on air after bar rel, in its bars (a grown song: the director's phrases moved by its
  // offset, as airBoundaries gives them, without its limit of two)
  function addStarts(item, rel) {
    const ph = item.plan.phrase, last = item.plan.bars - ph, air = airSteer(item) && item.g0, off = air ? airOffset(item.g0) : 0, out = [];
    for (let d = Math.max(0, (Math.floor((rel - off) / ph) + 1) * ph); d <= last; d += ph) if (d + off > rel) out.push(d + off);
    return out;
  }
  // the boundary a change pressed now takes: the first phrase start after `after` that leaves ADD_LEAD seconds plus this
  // song's expected preparation of a batch of k commands (expectedPrep), or null near the end of the song
  function addAt(item, after = -Infinity, k = 1) {
    const rel = relNow(), need = ADD_LEAD + expectedPrep(item, k);
    return addStarts(item, rel).find(b => b > after && (b - rel) * barSecOf(item.song, b) >= need) ?? null;
  }
  // the expected preparation of a batch of k commands on a song (D2; incremental-steering D9). Classic: the last batch's
  // time on this song, else the page's (1 s before the first). A grown song: the steering reuses the commands before the
  // batch, so it grows with the batch's new commands only: the steering time per command measured on this song
  // (steerPer: its last batch's steering over the commands the worker steered; 0.3 × its growth time before one is
  // measured), times k, with a margin, plus the rest of its last preparation (addRest: window, plan, sounds). A steering
  // still running when its batch moved holds the estimate up until a batch is ready (addHold). At most ADD_BOUND.
  function expectedPrep(item, k = 1) {
    const own = item.addPrep ?? addPrep;
    if (!(airSteer(item) && item.g0)) return own;
    const per = item.steerPer ?? (item.growMs ? 0.3 * item.growMs / 1000 : null);
    if (per === null) return own;
    return Math.min(ADD_BOUND, Math.max(item.addHold || 0, 1.3 * per * k + (item.addRest ?? addRest) + 0.5));
  }
  // the commands of a batch: its net counts, saved patterns and locks
  const sizeOf = b => Math.max(1, Object.values(b.parts).reduce((a, n) => a + Math.abs(n), 0) + b.pats.length + Object.keys(b.locks).length);
  // a batch's preparation that ran long holds this song's estimate up (a grown song: addHold, Classic: addPrep)
  const holdPrep = (item, s) => { const v = Math.min(ADD_BOUND, s); if (airSteer(item) && item.g0) item.addHold = Math.max(item.addHold || 0, v); else item.addPrep = Math.max(item.addPrep ?? addPrep, v); };
  const batchesOf = item => batches.filter(b => b.item === item).sort((a, b) => a.at - b.at);
  // the instruments of the batches that entered with some new track still to come (#82)
  const trailsOf = item => (S && item === S.stream[S.onAir] && item.trails ? item.trails.filter(x => x.ats.some(a => a > relNow())) : []);
  // the net count of an instrument from every batch of the song up to a bar
  const netOf = (b, part) => (b.parts[part] || 0) + b.pats.filter(x => x.part === part).length;
  const netUpTo = (item, at, part) => batchesOf(item).filter(b => b.at <= at).reduce((a, b) => a + netOf(b, part), 0);
  // the tracks playing at a bar of the song on air, as the console counts them (renderSteer leaves the count of the next
  // phrase here, so a press on that boundary costs nothing), kept per song and bar
  let playMemo = null;
  // (a grown song: the director's song and bars, as the buttons' reasons read them)
  function playingAt(item, at) {
    const air = airSteer(item) && item.g0, song = air ? item.plain || item.base.song : item.song, bar = Math.min(barsOf(song) - 1, at - (air ? airOffset(item.g0) : 0));
    if (!playMemo || playMemo.song !== song || playMemo.bar !== bar) playMemo = { song, bar, on: stateAt(song, bar).song.tracks.filter(x => !x.mute && x.clips.some(c => c.start <= bar && c.start + c.bars > bar)) };
    return playMemo.on.filter(x => !['voice', 'spoken', 'riser'].includes(x.type));
  }
  // why a press cannot join its batch (D3: the rules of "+" and "−" on the song with the pending changes), or null
  function pendWhy(item, b, kind, part) {
    const net = netUpTo(item, b.at, part);
    // (a press that undoes a pending one is always allowed)
    if ((kind === 'more' && net < 0) || (kind === 'less' && net > 0)) return null;
    // (the reasons on the song as it is are on the button already, disabled with its tooltip: here the counts with the
    // pending changes, on the batch's bar)
    const air = airSteer(item) && item.g0, songNow = air ? item.plain || item.base.song : item.song;
    const on = playingAt(item, b.at), total = on.length + INSTRUMENTS.reduce((a, p) => a + netUpTo(item, b.at, p), 0);
    if (kind === 'more') return !songNow.tracks.some(x => instrumentOf(x) === part) && !partHas(item.plan.R, part) ? 'no-type' : total + 1 > TRACK_CAP ? 'cap' : null;
    const mine = on.filter(x => instrumentOf(x) === part).length + net;
    return mine <= 0 ? 'not-playing' : total <= 1 ? 'last-track' : null;
  }
  // a press: the batch it joins (the earliest one of the song with ADD_LEAD seconds left, D3), else the batch of the
  // boundary a press now takes
  function pend(kind, part) { const t0 = performance.now(); try { return pendNow(kind, part); } finally { cost('press', t0); } }
  function pendNow(kind, part) {
    if (!S || S.paused !== undefined || !['more', 'less'].includes(kind)) return false;
    const item = S.stream[S.onAir];
    if (!item.plan) { toast(t(item.frozen ? 'steerWhy:frozen' : 'steerWhy:lead')); return false; }
    const b = batchFor(item);
    if (!b) { toast(t('steerLate')); return false; }
    const why = pendWhy(item, b, kind, part);
    if (why) { if (emptyBatch(b)) batches = batches.filter(x => x !== b); toast(t(`steerWhy:${why}`, { type: instName(part) })); paintPending(); return false; }
    // (a "−" takes back a saved pattern pending for the instrument before anything else, #82)
    const pat = kind === 'less' && !((b.parts[part] || 0) > 0) ? b.pats.map(x => x.part).lastIndexOf(part) : -1;
    if (pat >= 0) b.pats.splice(pat, 1);
    else {
      b.parts[part] = (b.parts[part] || 0) + (kind === 'more' ? 1 : -1);
      if (!b.parts[part]) delete b.parts[part];
    }
    b.session = opts.scope === 'session';
    restartBatch(b, ADD_SETTLE);
    paintPending();
    addWatch();
    return true;
  }
  // the batch a press joins (D3): the earliest one of the song with ADD_LEAD seconds left, else the batch of the
  // boundary a press now takes (made when there is none), or null near the end of the song
  function batchFor(item) {
    let b = batchesOf(item).find(x => secsTo(item, x.at) >= ADD_LEAD);
    if (b) return b;
    const at = addAt(item);
    if (at === null) return null;
    b = batchesOf(item).find(x => x.at === at) || null;
    if (!b) { b = { id: ++batchN, S, item, at, at0: at, parts: {}, pats: [], locks: {}, t0: performance.now(), q: Math.round(relNow() * 100) / 100, state: 'settle', seq: 0, pushes: 0, flash: 0, session: false }; batches.push(b); }
    return b;
  }
  const emptyBatch = b => !Object.keys(b.parts).length && !b.pats.length && !Object.keys(b.locks).length;
  // a saved pattern added as a new track (radio-arrangement D9) waits in the batch of its boundary with the "+" and "−"
  // pressed for it and enters with them (#82): prepared ahead like them, never steered on the page
  function pendPattern(pat) { const t0 = performance.now(); try { return pendPatternNow(pat); } finally { cost('press', t0); } }
  function pendPatternNow(pat) {
    if (!S || S.paused !== undefined) return false;
    const item = S.stream[S.onAir];
    if (!item.plan) { toast(t(item.frozen ? 'steerWhy:frozen' : 'steerWhy:lead')); return false; }
    const b = batchFor(item);
    if (!b) { toast(t('steerLate')); return false; }
    const part = patternPart(pat);
    if (pendWhy(item, b, 'more', part) === 'cap') { if (emptyBatch(b)) batches = batches.filter(x => x !== b); toast(t('steerWhy:cap', { type: instName(part) })); paintPending(); return false; }
    b.pats.push({ item: pat, part });
    b.session = opts.scope === 'session';
    restartBatch(b, ADD_SETTLE);
    paintPending();
    addWatch();
    return true;
  }
  // a lock press (D8): the Arrangement lock of an instrument (key "p.<part>") or the mixer lock of a track ("t.<id>")
  // records a pending lock in the batch of its boundary, as "+" and "−" do; `kind` is what the press means on the
  // song as it is (lock-part or unlock-part, lock or unlock). A pending lock of the same key that has not started to
  // enter is taken back instead (a lock and an unlock cancel out); after one that is entering, the press means the
  // opposite of it
  const LOCK_BACK = { 'lock-part': 'unlock-part', 'unlock-part': 'lock-part', lock: 'unlock', unlock: 'lock' };
  function pendLock(key, kind, target) { const t0 = performance.now(); try { return pendLockNow(key, kind, target); } finally { cost('press', t0); } }
  function pendLockNow(key, kind, target) {
    if (!S || S.paused !== undefined || !LOCK_BACK[kind]) return false;
    const item = S.stream[S.onAir];
    if (!item.plan) { toast(t(item.frozen ? 'steerWhy:frozen' : 'steerWhy:lead')); return false; }
    const last = batchesOf(item).filter(x => x.locks[key]).pop();
    if (last && item.start + last.at - nowBar() > ADD_MARGIN) {
      delete last.locks[key];
      restartBatch(last, ADD_SETTLE);
      paintPending();
      return true;
    }
    if (last) kind = LOCK_BACK[last.locks[key].kind];
    const b = batchFor(item);
    if (!b) { toast(t('steerLate')); return false; }
    b.locks[key] = { kind, ...target };
    b.session = opts.scope === 'session';
    restartBatch(b, ADD_SETTLE);
    paintPending();
    addWatch();
    return true;
  }
  // (a batch whose counts all came back to zero, with no lock left, is gone: nothing is prepared and nothing changes at
  // its boundary)
  function restartBatch(b, wait = 0) {
    if (b.inflight && player.cancelAhead) { b.inflight = false; player.cancelAhead(); }
    b.seq++; b.state = 'settle'; b.ready = null; b.retarget = false;
    clearTimeout(b.timer);
    if (emptyBatch(b)) { batches = batches.filter(x => x !== b); return; }
    b.timer = setTimeout(() => prepBatch(b), wait);
  }
  // the batch as commands (D3): instruments in the order of INSTRUMENTS, "−" before "+", |n| times each, then the locks
  // in the order pressed (D8), one boundary, each in today's form (lock-part and unlock-part with the part, lock and
  // unlock with the track)
  function batchCommands(b, air) {
    const out = [];
    // (a grown song: the steering on air takes the batch together, `batch`, from the bar it was pressed, q, and its
    // boundary at the earliest, min: its head on the first boundary where most of it can be typed in time, the rest over
    // the next phrases, #82)
    const batch = cmdN + 1, extra = () => ({ at: b.at, id: ++cmdN, ...(air ? { at0: b.at, q: b.q, pend: true, min: b.min ?? b.at, batch } : {}) });
    for (const kind of ['less', 'more']) for (const part of INSTRUMENTS) {
      const n = b.parts[part] || 0;
      if ((kind === 'more') !== (n > 0)) continue;
      for (let k = 0; k < Math.abs(n); k++) out.push({ kind, part, ...extra() });
    }
    for (const x of b.pats) out.push({ kind: 'pattern', mode: 'new', item: x.item, ...extra() });
    for (const L of Object.values(b.locks)) out.push({ ...L, ...extra() });
    return out;
  }
  const windowItems = () => S.stream.slice(S.onAir, S.onAir + 2);
  // the preparation (D4): steering away from the page, then the window in slices and the new tracks' sounds
  function prepBatch(b) { const t0 = performance.now(); try { prepNow(b); } finally { cost('prepare', t0); } }
  function prepNow(b) {
    if (!S || S !== b.S || !batches.includes(b)) return;
    const item = b.item;
    if (S.stream[S.onAir] !== item) { batches = batches.filter(x => x !== b); return; }
    if (S.paused !== undefined) { b.timer = setTimeout(() => prepBatch(b), 300); return; }
    // (the earliest boundary its steering may take, #82: the first that leaves time to prepare the batch as it is now,
    // or its bar when that is earlier. Its own head moved later by the typing never holds a new steering back: a batch
    // steered again for a new press took the head of the last steering as its earliest boundary, the typing moved it
    // on again, and a batch that kept taking presses drifted phrase after phrase)
    const tgt = addAt(item, -Infinity, sizeOf(b));
    b.min = tgt === null ? b.at : Math.min(b.at, tgt);
    const seq = ++b.seq, air = airSteer(item) && item.g0, cmds = batchCommands(b, air), started = performance.now();
    b.state = 'prep'; b.base = item.commands; b.song0 = item.song; b.win = windowItems(); b.started = started; b.inflight = true;
    const alive = () => b.seq === seq && batches.includes(b) && S === b.S && S.stream[S.onAir] === item;
    const fresh = () => alive() && item.commands === b.base && item.song === b.song0;
    const all = [...item.commands, ...cmds].map(c => ({ ...c }));
    const job = air ? (player.steerAhead || player.steer)({ grown: item.g0, song: item.base.song, plan: item.base.plan, opts: item.base.opts, commands: all, seed: S.recipe.seed, n: item.n, ctx: item.growCtx, chooser: airChooserOf(S.recipe), view: true, owner: ownerOf(item) })
      : (player.steerClassic ? player.steerClassic({ ...item.base, commands: all, seed: S.recipe.seed, n: item.n, owner: ownerOf(item) }) : new Promise(r => setTimeout(r, 0)).then(() => steerSong({ ...item.base, commands: all, seed: S.recipe.seed, n: item.n })))
        .then(r => (item.growCtx && player.grow ? (player.growAhead || player.grow)(r.song, item.growCtx).then(g => ({ ...r, plain: r.song, song: g })) : { ...r, plain: r.song }));
    paintPending();
    b.times = {};
    job.then(r => { const t1 = performance.now(); try { steered(r); } finally { cost('answer', t1); } }, err => { if (b.seq === seq) b.inflight = false; if (alive() && !/cancelled/.test(String(err && err.message))) { console.warn('[radio] console change not prepared', err); restartBatch(b, 300); } else if (batches.includes(b) && b.seq === seq) restartBatch(b, 0); });
    function steered(r) {
      b.times.steer = Math.round(performance.now() - started); b.times.own = r.ms;
      if (b.seq === seq) b.inflight = false;
      if (!alive()) return;
      // (this song's steering time per command the worker steered, D9; the commands of the batch when it does not say)
      if (air) item.steerPer = (Number.isFinite(r.ms) ? r.ms : performance.now() - started) / 1000 / Math.max(1, Number.isFinite(r.work) ? r.work : cmds.length);
      if (b.retarget) {
        b.retarget = false; holdPrep(item, (performance.now() - started) / 1000 * 1.2 + 0.5);
        const at2 = addAt(item, b.at - 1, cmds.length);
        if (at2 === null) { batches = batches.filter(x => x !== b); toast(t('steerLate')); paintPending(); return; }
        // (#82: a grown song's steering whose head is at or after the boundary the push gave is kept as it is: steered
        // again, it took as long once more and was pushed again)
        const got = air && fresh() ? cmds.map(c => r.commands.find(x => x.id === c.id)) : null, head = got && got.every(Boolean) ? Math.min(...got.map(x => x.at)) : null;
        if (head === null || head < at2) {
          if (at2 !== b.at) { console.info(`[radio] console change moved from bar ${b.at + 1} to bar ${at2 + 1} (steering of ${Math.round(performance.now() - started)} ms answered after a push)`); b.at = at2; b.flash = performance.now() + 600; b.pushes++; }
          restartBatch(b, 0); return;
        }
      }
      if (!fresh()) { restartBatch(b); return; }
      let at = b.at;
      if (air) {
        // (the steering on air takes the batch together, #82: its head on the first boundary where most of it can be
        // typed in time, a push when that is later, shown at once; the rest over the next phrases, never steered again)
        const got = cmds.map(c => r.commands.find(x => x.id === c.id));
        if (got.some(x => !x)) { batches = batches.filter(x => x !== b); toast(t('steerLate')); paintPending(); return; }
        at = Math.min(...got.map(x => x.at));
        if (at !== b.at) {
          const h = (r.heads || []).find(x => x.batch === cmds[0].batch);
          console.info(`[radio] console change moved from bar ${b.at + 1} to bar ${at + 1} (typing${h ? `: ${h.k} of ${h.n} lines on the head, ${h.cands.join(' ')}` : ''})`);
          b.at = at; b.flash = performance.now() + 600; b.pushes++;
        }
      }
      const ats = air ? new Set(r.commands.filter(x => cmds.some(c => c.id === x.id)).map(x => x.at - airOffset(r.grown))) : new Set([at]);
      const plain = air ? r.view.song : r.plain, plan = air ? r.view.plan : r.plan, ids = new Set((plan.added || []).filter(a => ats.has(a.at)).map(a => a.id));
      // (the sounds to load ahead, #82: the new tracks', those of a track silent now that plays from the batch's bars
      // (a "+" can bring back a kick that never played, on a drum machine never loaded) and those of a track the
      // steering changed (another machine), in the director's bars)
      const off = air ? airOffset(r.grown) : 0, nowB = relNow() - off, heads = [...ats].flatMap(a => [a, a + 1]);
      const plays = (tr, bar) => !!tr && !tr.mute && (tr.clips || []).some(c => c.start <= bar && c.start + c.bars > bar);
      const was = new Map(((item.plain || item.base.song).tracks || []).map(x => [x.id, x])), sig = x => JSON.stringify([x.settings, x.sound, x.bank]);
      const fresh0 = plain.tracks.filter(x => ids.has(x.id) || !was.has(x.id) || sig(was.get(x.id)) !== sig(x) || (!plays(was.get(x.id), nowB) && heads.some(a => plays(x, a))));
      // (the window made in a task of its own, then its plan in slices; the sounds one per task)
      setTimeout(() => {
        if (!alive() || !fresh()) { if (alive()) restartBatch(b); return; }
        const w0 = performance.now(), p = windowPlayable({ item, song: r.song });
        b.times.window = Math.round(performance.now() - w0); cost('window', w0);
        // (the voice samples of the song with the batch queued ahead, in a task of their own, #82: a steering can move the
        // voice track's lines, and their samples loaded on the entry bar)
        if (player.preloadVoices) setTimeout(() => { if (!alive()) return; const v0 = performance.now(); try { player.preloadVoices(voicesOf({ ...item, song: r.song })); } catch (e) {} cost('voices', v0); }, 0);
        const ready = [p.prepare ? p.prepare(12, () => alive()).then(() => { b.times.plan = Math.round(performance.now() - started); }) : Promise.resolve(), player.warmTracks ? player.warmTracks(fresh0).then(n => { b.times.sounds = Math.round(performance.now() - started); b.times.nSounds = n; }) : Promise.resolve()];
        Promise.all(ready).then(() => {
          if (!alive()) return;
          if (!fresh()) { restartBatch(b); return; }
          b.state = 'ready'; b.ready = { p, r, cmds, air };
          // (the expected preparation of the next press: this song's own time, else the page's last; a grown song's part
          // after its steering, D9)
          addPrep = item.addPrep = Math.max(0.5, Math.min(ADD_BOUND, (performance.now() - started) / 1000));
          if (air) { addRest = item.addRest = Math.max(0.2, (performance.now() - started - b.times.steer) / 1000); delete item.addHold; }
          paintPending();
        }, () => { if (alive()) restartBatch(b); });
      }, 0);
    }
  }
  // a batch moves to the next phrase start that leaves time to prepare it again (D2), or is dropped at the song's end
  function pushBatch(b, why) {
    // (not ready: the preparation takes at least as long as it ran, so the next boundary leaves that much again)
    if (b.state === 'prep' && b.started) holdPrep(b.item, (performance.now() - b.started) / 1000 * 1.25);
    const at = addAt(b.item, b.at, sizeOf(b));
    if (at === null) { batches = batches.filter(x => x !== b); toast(t('steerLate')); paintPending(); return; }
    console.info(`[radio] console change moved from bar ${b.at + 1} to bar ${at + 1} (${why})`);
    b.at = at; b.flash = performance.now() + 600; b.pushes++;
    // (a steering still running is left to finish: it says how long this song's steering takes, and the batch is
    // steered again for its new boundary when it answers; stopping it would start the same long work again)
    if (b.inflight) { b.retarget = true; paintPending(); return; }
    restartBatch(b, 0);
    paintPending();
  }
  // the entry (D2, D4): a third of a bar before its boundary a ready batch whose window is still the one on air enters
  // when the page was quiet over the last ADD_QUIET ms and the expected entry cost fits; else it moves on. Past
  // ADD_BOUND seconds it enters on the next boundary where it is ready, even under load
  function addWatch() {
    if (addTimer) return;
    const run = () => { const t0 = performance.now(); try { watchNow(); } finally { cost('watch', t0); } };
    const watchNow = () => {
      addTimer = null;
      if (!S) { batches = []; return; }
      for (const b of batches.slice()) {
        if (b.S !== S || S.stream[S.onAir] !== b.item) { batches = batches.filter(x => x !== b); continue; }
        if (S.paused !== undefined) continue;
        const item = b.item, left = item.start + b.at - player.now();
        if (b.state !== 'settle' && (item.commands !== b.base || item.song !== b.song0)) { restartBatch(b); continue; }
        // (a ready batch whose window lost its next song meanwhile gets its window made again)
        if (b.state === 'ready' && !sameWin(b) && left > ADD_MARGIN + 1) { reWindow(b); continue; }
        if (left > ADD_MARGIN + 0.12) continue;
        if (left < 0.05) { pushBatch(b, 'late'); continue; }
        const bound = (performance.now() - b.t0) / 1000 >= ADD_BOUND;
        const step = player.lastStep ? player.lastStep() : 0, quiet = load.quiet(ADD_QUIET, ADD_TASK) && step * 1.5 <= ADD_STEP;
        const same = sameWin(b);
        if (b.state === 'ready' && same && (quiet || bound)) commitBatch(b, !quiet);
        else pushBatch(b, b.state !== 'ready' || !same ? 'not ready' : 'busy page');
      }
      paintPending();
      if (batches.length || trailsOf(S.stream[S.onAir]).length) addTimer = setTimeout(run, 50);
    };
    addTimer = setTimeout(run, 50);
  }
  // the window made again around a steering already done (the next song in the window changed meanwhile)
  function reWindow(b) {
    const { r } = b.ready, seq = b.seq, item = b.item;
    b.state = 'prep'; b.win = windowItems();
    setTimeout(() => {
      if (b.seq !== seq || !batches.includes(b)) return;
      const p = windowPlayable({ item, song: r.song });
      (p.prepare ? p.prepare(12, () => b.seq === seq) : Promise.resolve()).then(() => { if (b.seq === seq && batches.includes(b)) { b.state = 'ready'; b.ready = { ...b.ready, p }; paintPending(); } });
    }, 0);
  }
  const sameWin = b => !!b.win && windowItems().length === b.win.length && windowItems().every((x, i) => x === b.win[i]);
  // the commit (D4, D6): the commands recorded as today's, the song, its plan and the window handed to the player
  function commitBatch(b, underLoad) { const t0 = performance.now(); try { commitNow(b, underLoad); } finally { cost('commit', t0); } }
  function commitNow(b, underLoad) {
    const item = b.item, { p, r, cmds, air } = b.ready;
    batches = batches.filter(x => x !== b);
    // (each instrument's badge stays until all of its new tracks play, #82: the boundary of each of its commands)
    const placed = cmds.map(c => ({ c, at: air ? ((r.commands.find(x => x.id === c.id) || {}).at ?? b.at) : b.at })), fams = {};
    for (const { c, at } of placed) { const part = c.kind === 'pattern' ? patternPart(c.item) : c.kind === 'more' ? c.part : null; if (part) (fams[part] = fams[part] || []).push(at); }
    item.trails = [...(item.trails || []).filter(x => x.ats.some(a => a > relNow())), ...Object.entries(fams).map(([part, ats]) => ({ id: b.id, part, ats: ats.sort((x, y) => x - y) }))];
    addsDone = [...addsDone.slice(-19), { id: b.id, at0: b.at0, at: b.at, ats: placed.map(x => x.at), pats: b.pats.length, parts: { ...b.parts }, locks: Object.fromEntries(Object.entries(b.locks).map(([k, L]) => [k, L.kind])), pushes: b.pushes, underLoad, waited: Math.round(performance.now() - b.t0) }];
    // (the whole session: the kinds that go to the session, as command() gives them; a mixer lock stays on this song)
    const recs = cmds.map(c => (b.session && SESSION_KINDS.includes(c.kind) ? { ...c, scope: 'session' } : c));
    item.growToken = (item.growToken || 0) + 1; delete item.growing; delete item.finish;
    item.commands = [...item.commands, ...recs];
    S.recipe.steering = [...(S.recipe.steering || []), ...recs.map(c => ({ song: item.n, ...c }))];
    if (air) {
      item.g0 = r.grown; airSettle(item, r.commands);
      const strip = c => { if (!cmds.some(x => x.id === c.id)) return c; const { min: _m, ...y } = c; return y; };
      item.commands = item.commands.map(strip);
      S.recipe.steering = S.recipe.steering.map(x => (x.song === item.n ? strip(x) : x));
      item.plan = r.view.plan; item.opts = r.view.opts; item.plain = r.view.song;
    } else { item.plan = r.plan; item.opts = r.opts; item.plain = r.plain; }
    setSong(item, r.song);
    if (b.session) { for (const c of recs.filter(x => x.scope === 'session')) { const { at: _a, id: _i, scope: _s, at0: _b, q: _q, pend: _p, min: _n, batch: _t, ...e } = c; S.recipe.arrange = [...(S.recipe.arrange || []), { song: item.n, ref: c.id, ...e }]; } }
    keepHistory(item);
    if (soon) soon.done = true;
    soon = null;
    player.swap(p);
    if (underLoad) console.info(`[radio] entered under load on bar ${b.at + 1}`);
    // (the songs after it take the session's choices in a task of their own; the console drawn in another)
    if (recs.some(x => x.scope === 'session')) setTimeout(() => { if (S) rebias(item.n); }, 0);
    setTimeout(() => renderNow(), 0);
  }
  // (part: an instrument, or a lock's key, D8)
  function cancelPend(id, part) {
    const b = batches.find(x => x.id === id);
    if (!b || !(part in b.parts || part in b.locks || b.pats.some(x => x.part === part))) return;
    if (b.item.start + b.at - nowBar() <= ADD_MARGIN) return;
    delete b.parts[part]; delete b.locks[part]; b.pats = b.pats.filter(x => x.part !== part);
    restartBatch(b, 0);
    paintPending();
  }
  // the badge of an instrument and the queue rows (D5): drawn from the batches, again every quarter second without a
  // console rebuild; the badge counts down, pulses while preparing and flashes when its entry moved later
  function pendView(item) {
    const out = [];
    for (const b of batchesOf(item)) for (const part of INSTRUMENTS) {
      const n = netOf(b, part);
      if (!n) continue;
      const s = Math.max(0, Math.ceil(secsTo(item, b.at))), left = item.start + b.at - nowBar();
      out.push({ id: b.id, part, n: `${n > 0 ? '+' : '−'}${Math.abs(n)}`, s, bar: b.at + 1, state: b.state, flash: b.flash > performance.now(), entering: left <= ADD_MARGIN });
    }
    // (a batch that entered: each instrument's badge until all of its new tracks play, "1 of 2 in", #82)
    const rel = relNow();
    for (const x of trailsOf(item)) {
      const k = x.ats.filter(a => a <= rel).length, next = x.ats.find(a => a > rel);
      out.push({ id: x.id, part: x.part, n: `+${x.ats.length}`, ...(k ? { k, total: x.ats.length } : {}), s: Math.max(0, Math.ceil(secsTo(item, next))), bar: next + 1, state: 'ready', flash: false, entering: true });
    }
    // (the locks after the instruments, D8: one row each, with the button's key)
    for (const b of batchesOf(item)) for (const [key, L] of Object.entries(b.locks)) {
      const s = Math.max(0, Math.ceil(secsTo(item, b.at))), left = item.start + b.at - nowBar(), tr = L.track && item.song.tracks.find(x => x.id === L.track);
      out.push({ id: b.id, part: key, lock: L.kind, what: t(`steer:${L.kind}`, { part: L.part ? instName(L.part) : '', track: tr ? tr.name || tr.id : L.track }), s, bar: b.at + 1, state: b.state, flash: b.flash > performance.now(), entering: left <= ADD_MARGIN });
    }
    return out;
  }
  // the pending state of a lock button (D8): a ring, the seconds left, the tooltip with the bar
  const lockTip = v => t(/^unlock/.test(v.lock) ? 'arrUnlockPend' : 'arrLockPend', { bar: v.bar, s: v.s });
  function paintLock(btn, v) {
    const tip = v ? lockTip(v) : null, had = btn.dataset.tip0 !== undefined;
    if (v && !had) btn.dataset.tip0 = btn.title;
    const want = v ? tip : had ? btn.dataset.tip0 : btn.title;
    if (btn.title !== want) { btn.title = want; btn.setAttribute('aria-label', want); }
    if (!v && had) delete btn.dataset.tip0;
    const s = v ? t('arrLockPendShort', { s: v.s }) : null, st = v ? (v.state === 'ready' ? 'ready' : 'prep') : null;
    if ((btn.dataset.pendS ?? null) !== s) { if (s === null) delete btn.dataset.pendS; else btn.dataset.pendS = s; }
    if ((btn.dataset.pendState ?? null) !== st) { if (st === null) delete btn.dataset.pendState; else btn.dataset.pendState = st; }
    if (v && v.flash) btn.dataset.pendFlash = ''; else delete btn.dataset.pendFlash;
  }
  const badgeHtml = v => `<span class="arr-pend${v.state === 'ready' ? ' ready' : ' prep'}${v.flash ? ' flash' : ''}" data-pend="${v.part}" title="${esc(t('arrPendBar', { bar: v.bar }))}"><i class="arr-pend-led" aria-hidden="true"></i><span class="arr-pend-t">${esc(v.k ? t('arrPendSome', { k: v.k, n: v.total, s: v.s }) : t('arrPendIn', { n: v.n, s: v.s }))}</span><span class="arr-pend-s" aria-hidden="true">${esc(v.k ? t('arrPendSomeShort', { k: v.k, n: v.total, s: v.s }) : t('arrPendShort', { n: v.n, s: v.s }))}</span></span>`;
  const rowHtml = v => `<li data-pend-row="${v.id}:${esc(v.part)}"><span class="at">${esc(t('radioBarShort', { n: v.bar }))}</span> ${esc(v.lock ? t('arrPendLockRow', { what: v.what, s: v.s }) : t('arrPendRow', { n: v.k ? `${v.k}/${v.total}` : v.n, part: instName(v.part), s: v.s }))} <button class="mini" data-pend-cancel="${v.id}:${esc(v.part)}"${v.entering ? ` disabled title="${esc(t('arrPendEntering'))}" aria-label="${esc(t('arrPendEntering'))}"` : ` aria-label="${esc(t('steerCancel'))}" title="${esc(t('steerCancel'))}"`}>✕</button></li>`;
  function paintPending() {
    const box = root.querySelector('#radio-steer');
    if (!box || !S) return;
    const item = S.stream[S.onAir], views = item && item.plan ? pendView(item) : [], first = {}, locks = {};
    for (const v of views) if (v.lock) locks[v.part] = v; else if (!first[v.part]) first[v.part] = v;
    box.querySelectorAll('[data-lock-part]').forEach(el => paintLock(el, locks[`p.${el.dataset.lockPart}`]));
    box.querySelectorAll('[data-mix-lock]').forEach(el => paintLock(el, locks[`t.${el.dataset.mixLock}`]));
    box.querySelectorAll('.arr-inst[data-arr]').forEach(el => {
      const v = first[el.dataset.arr], old = el.querySelector('.arr-pend');
      // (a pending "+" can always be taken back with "−", and the other way round, D3: the button the song alone
      // disables comes back while the change waits)
      const net = v ? netUpTo(item, Infinity, el.dataset.arr) : 0;
      for (const [kind, on] of [['less', net > 0], ['more', net < 0]]) { const btn = el.querySelector(`[data-cmd="${kind}"]`); if (btn && btn.dataset.why) btn.disabled = !on; }
      if (!v) { if (old) old.remove(); return; }
      const html = badgeHtml(v);
      if (old && old.outerHTML === html) return;
      const tmp = document.createElement('span'); tmp.innerHTML = html;
      if (old) old.replaceWith(tmp.firstChild); else { const nm = el.querySelector('.arr-name'); if (nm) nm.after(tmp.firstChild); }
    });
    const q = box.querySelector('.steer-queue');
    if (!q) return;
    const rows = views.map(rowHtml).join(''), had = [...q.querySelectorAll('[data-pend-row]')];
    if (had.map(x => x.outerHTML).join('') === rows) return;
    had.forEach(x => x.remove());
    const empty = q.querySelector('li.muted');
    if (rows) { if (empty) empty.hidden = true; q.insertAdjacentHTML('afterbegin', rows); } else if (empty) empty.hidden = false;
  }
  // the Extend waiting for its double phrase (#82): a badge next to the button with the seconds left, as the "+" of the
  // Arrangement group; drawn again with the console's quarter-second tick, without a rebuild
  function paintExtend() {
    const box = root.querySelector('#radio-steer'), btn = box && box.querySelector('[data-cmd="extend"]');
    if (!btn || !S) return;
    const item = S.stream[S.onAir], rel = relNow(), old = btn.parentElement.querySelector('[data-ext-pend]');
    const c = item.plan ? item.commands.filter(x => x.kind === 'extend' && x.at > rel).sort((a, b) => a.at - b.at)[0] : null;
    if (!c) { if (old) old.remove(); return; }
    const s = Math.max(0, Math.ceil(secsTo(item, c.at))), x = `+${c.s ?? Math.round(extendSeconds(item.plan))} s`;
    const html = `<span class="arr-pend ${c.pend ? 'prep' : 'ready'} ext-pend" data-ext-pend title="${esc(t('arrPendBar', { bar: c.at + 1 }))}"><i class="arr-pend-led" aria-hidden="true"></i><span class="arr-pend-t">${esc(t('extPendIn', { x, s }))}</span><span class="arr-pend-s" aria-hidden="true">${esc(t('arrPendShort', { n: x, s }))}</span></span>`;
    if (old && old.outerHTML === html) return;
    const tmp = document.createElement('span'); tmp.innerHTML = html;
    if (old) old.replaceWith(tmp.firstChild); else btn.after(tmp.firstChild);
  }
  // the history keeps the song as steered, so saving it from there keeps the listener's changes
  function keepHistory(item) {
    const h = history.find(x => x.n === item.n && x.seed === S.recipe.seed);
    if (h) { h.song = songOut(item); h.recipe = clone(S.recipe); saveHistory(); }
  }
  // (the history written to the browser storage once, after the command or the steering answer that changed it: the
  // whole list is written each time, #82)
  let historyTimer = null;
  function saveHistory() {
    if (historyTimer !== null) return;
    historyTimer = setTimeout(() => { historyTimer = null; try { store.set('coding-misk-radio-history', history); } catch (e) {} }, 0);
  }
  function syncSliders() {
    for (const k of ['energy', 'complexity', 'talk']) { const el = root.querySelector(`#radio-${k}`); if (el) { el.value = opts[k]; el.closest('.ctrl').querySelector('output').textContent = fmt(opts[k]); } }
  }

  // starts of the songs after the one on air, once it was cut short (a skip always cuts, no transition)
  function relayout() {
    for (let i = S.onAir + 1; i < S.stream.length; i++) { const p = S.stream[i - 1]; S.stream[i].start = p.start + p.bars - (p.cut ? 0 : overlapOf(p.entry.transition)); }
  }
  // after live coding by hand: when the song on air ended meanwhile, the next one starts on "bar"
  // (returns true); otherwise the song on air goes on and the player types its code back (false)
  function afterHand(bar) {
    if (!S) return false;
    const cur = S.stream[S.onAir];
    if (bar < cur.start + cur.bars) return false;
    if (S.stream.length <= S.onAir + 1) generate();
    growNow(S.stream[S.onAir + 1]);
    cur.bars = bar - cur.start; cur.cut = true;
    relayout();
    S.onAir++; leftAir(S.stream[S.onAir - 1]);
    remember(S.stream[S.onAir]);
    player.jump(windowPlayable(), S.stream[S.onAir].start, { voices: airVoices() });
    render();
    return true;
  }
  // the bar's timeline: a bar inside the song on air
  function seek(rel) {
    if (!S) return;
    const it = S.stream[S.onAir], bar = it.start + Math.max(0, Math.min(it.bars - .25, rel));
    if (S.paused !== undefined) { S.paused = bar; renderNow(); return; }
    player.start(windowPlayable(), bar, { voices: airVoices() });
  }
  // previous in the player bar: the song on air from its first bar
  function restart() {
    if (!S) return;
    delete S.paused;
    player.start(windowPlayable(), S.stream[S.onAir].start, { voices: airVoices() });
    render();
  }
  function remember(item) {
    if (recS && recS.list.length && recS.list[recS.list.length - 1].title !== item.song.title) recS.list.push(listEntry(item));
    history.unshift({ title: item.song.title, styles: item.entry.styles, seed: S.recipe.seed, recipe: clone(S.recipe), n: item.n, at: new Date().toISOString(), song: songOut(item), entry: item.entry });
    history = history.slice(0, HISTORY);
    try { store.set('coding-misk-radio-history', history); } catch (e) { history = history.slice(0, 20); try { store.set('coding-misk-radio-history', history); } catch (e2) {} }
  }
  const clone = o => JSON.parse(JSON.stringify(o));

  // ---------- view ----------
  // what each voice says in the song on air (after-tests-oct28 D2): the schedule of its code, from the live build of its
  // controls; kept per song, language, controls and samples manifest (Next changes is drawn four times a second)
  const scheduleMemo = new WeakMap();
  const scheduleOf = item => {
    const C = liveControlsOf(item), lang = getLang(), files = voiceFiles(), key = `${lang}|${JSON.stringify(C)}`;
    const m = scheduleMemo.get(item.song);
    if (m && m.key === key && m.files === files) return m.list;
    let list = [];
    try { list = spokenSchedule(liveBuildOf(item.song, C), C, lang, files); } catch (e) { list = []; }
    scheduleMemo.set(item.song, { key, files, list });
    return list;
  };
  // the voice samples of a song as it is written on air (#82): [{ s, n, at }] in the window's bars, first lines first,
  // from the song's own schedule (the one its captions use). Not from the window's build: that holds the growth bound of
  // the song on air only, so the next song's refrains placed in its own growth were missing and loaded on its first bar
  function voicesOf(item) {
    if (!item || !item.song) return [];
    const C = liveControlsOf(item), lang = getLang(), files = voiceFiles() || {};
    // (one list with Compose's Play, voicesAt: the speaker's own sample, else the default voice's, as lineSample picks it)
    let list = [];
    try { list = voicesAt(liveBuildOf(item.song, C), C, lang, files); } catch (e) { list = []; }
    return list.map(v => ({ ...v, at: item.start + v.at }));
  }
  // the voice samples of the window on air: its song on air and the next one, when made
  const airVoices = () => (S ? S.stream.slice(S.onAir, S.onAir + 2).flatMap(voicesOf) : []);
  const voiceTag = v => `<span class="vtag vtag-${v.voice === 'N' ? 'n' : 't'}" title="${esc(t(v.voice === 'N' ? 'narratorLbl' : 'vinstLbl'))}">V:${v.voice}</span> <em>“${esc(v.text)}”</em>`;
  // (a bar with many moves, the opening of a growth: the first four, the rest in the tooltip)
  const nextRow = r => `<li data-at="${r.at}"><span class="at">${esc(t('radioBarShort', { n: r.at + 1 }))}</span> ${r.labels.length ? `<span class="nx-step"${r.labels.length > 4 ? ` title="${esc(r.labels.join(' · '))}"` : ''}>${esc(r.labels.slice(0, 4).join(' · '))}${r.labels.length > 4 ? ' …' : ''}</span>` : ''}${r.voices.map(v => ` ${voiceTag(v)}`).join('')}</li>`;
  // ---------- curves of the song on air (#24, #40, look #47) ----------
  // energy is the main curve, on top; the four detail lanes fold under a summary line. Every curve: one small
  // square per double phrase (filled when the listener set it), a solid line, a glow on set parts, the parts
  // already played shaded. Handles only on the parts still to come.
  const LANES = ['density', 'brightness', 'tension', 'voice'];
  const CW = 320, CPAD = 8;
  let detailsOpen = !!store.get('coding-misk-radio-details', false), hoverD = null;
  const curveData = item => {
    const P = item.plan, max = densityMax(P);
    // (a grown song: measured on the song as the director wrote it, in the plan's bars)
    if (!item.curves) item.curves = songCurves(item.song && item.song.onAir ? item.plain || item.base.song : item.song, P, item.opts || item.base.opts);
    const C = item.curves, val = (d, c) => C[d].set[c] ?? C[d].measured[c];
    const charge = P.plan.map((d, i) => d.role !== 'drop' && (P.plan[i + 1] || {}).role === 'drop' && (C[i].set.tension ?? 0) >= 0.7);
    return { P, C, max, val, charge };
  };
  const shownOf = (c, v, max) => (c === 'density' ? t('curveOf', { n: v, max }) : String(Math.round(v * 100)));
  // one curve as SVG: vals 0..max, set[i] true when the listener set part i
  function drawCurve({ vals, set = [], max = 1, cur, frac, h, energy = false, curve = '', roles = null, charge = [], title = '' }) {
    const n = vals.length, top = 6, bot = energy ? 16 : 6, col = (CW - 2 * CPAD) / n;
    const x = i => CPAD + (i + 0.5) * col, y = v => top + (1 - Math.max(0, Math.min(1, v / max))) * (h - top - bot);
    const f = `cg-${curve || 'energy'}`, px = CPAD + Math.min(1, frac) * (CW - 2 * CPAD);
    let g = `<defs><filter id="${f}" filterUnits="userSpaceOnUse" x="-10" y="-10" width="${CW + 20}" height="${h + 20}"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
    for (const q of [0, 0.5, 1]) g += `<line class="grid${q === 0.5 ? ' mid' : ''}" x1="${CPAD}" x2="${CW - CPAD}" y1="${y(q * max).toFixed(1)}" y2="${y(q * max).toFixed(1)}"/>`;
    for (let i = 0; i <= n; i++) g += `<line class="grid v" x1="${(CPAD + i * col).toFixed(1)}" x2="${(CPAD + i * col).toFixed(1)}" y1="${top}" y2="${h - bot}"/>`;
    // part names where the part changes, skipped when too close to the previous one, kept inside on the right
    if (roles) { let last = -Infinity; roles.forEach((r, i) => { if (i > 0 && roles[i - 1] === r) return; const lx = CPAD + i * col + 2, label = t('role:' + r).toUpperCase(), wide = label.length * 5 + 4; if (lx < last) return; last = lx + wide; const end = lx + wide > CW; g += `<text class="role" x="${(end ? CW - CPAD : lx).toFixed(1)}" y="${h - 4}"${end ? ' text-anchor="end"' : ''}>${esc(label)}</text>`; }); }
    charge.forEach((on, i) => { if (on) g += `<rect class="charge" x="${(CPAD + i * col).toFixed(1)}" y="${top}" width="${col.toFixed(1)}" height="${h - top - bot}"/><text class="charge-name" x="${(CPAD + i * col + 3).toFixed(1)}" y="${top + 9}">${esc(t('curveCharge').toUpperCase())}</text>`; });
    g += `<rect class="past-shade" x="${CPAD}" y="${top}" width="${Math.max(0, px - CPAD).toFixed(1)}" height="${h - top - bot}"/>`;
    g += `<polyline class="line" points="${vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}" fill="none" stroke="currentColor" stroke-width="${energy ? 2.2 : 1.6}"/>`;
    set.forEach((s, i) => { if (s) g += `<polyline class="glow" points="${[i - 1, i, i + 1].filter(j => j >= 0 && j < n).map(j => `${x(j).toFixed(1)},${y(vals[j]).toFixed(1)}`).join(' ')}" fill="none" stroke="currentColor" stroke-width="3" filter="url(#${f})"/>`; });
    const sz = energy ? 7 : 6;
    vals.forEach((v, i) => {
      const cls = `${i > cur ? 'handle' : 'pt past'}${set[i] ? ' set' : ''}`, data = i > cur ? ` data-d="${i}"${curve ? ` data-curve="${curve}"` : ''}` : '';
      const tip = i > cur ? `<title>${esc(curve ? t('curveTip', { curve: t('curve:' + curve) }) : t('steerCurveTip'))}</title>` : '';
      g += `<rect class="${cls}"${data} x="${(x(i) - sz / 2).toFixed(1)}" y="${(y(v) - sz / 2).toFixed(1)}" width="${sz}" height="${sz}" ${set[i] ? `filter="url(#${f})"` : ''}>${tip}</rect>`;
    });
    g += `<line class="pos" x1="${px.toFixed(1)}" x2="${px.toFixed(1)}" y1="0" y2="${h - bot + 2}"/>`;
    if (hoverD !== null && hoverD < n) g += `<line class="hover" x1="${x(hoverD).toFixed(1)}" x2="${x(hoverD).toFixed(1)}" y1="0" y2="${h}"/>`;
    return `<svg class="radio-curve ${energy ? 'steer' : 'lane'}" viewBox="0 0 ${CW} ${h}" data-h="${h}" data-top="${top}" data-bot="${bot}" data-n="${n}" data-sz="${sz}" data-max="${curve === 'density' ? max : ''}" role="img" aria-label="${esc(title)}">${energy ? `<title>${esc(t('curveHelp:energy'))}</title>` : ''}${g}</svg>`;
  }
  function curvePanel(item, rel, sec) {
    const { P, C, max, val, charge } = curveData(item), dbl = 2 * P.phrase, n = P.plan.length;
    const cur = Math.min(n - 1, Math.floor(rel / dbl)), frac = rel / Math.max(1, n * dbl);
    const energy = drawCurve({ vals: P.plan.map(d => d.target), cur, frac, h: 96, energy: true, roles: P.plan.map(d => d.role), charge, title: t('radioShape') });
    const lanes = LANES.map(c => {
      const anySet = C.some((p, i) => i > cur && p.set[c] !== null);
      const svg = drawCurve({ vals: C.map((p, i) => val(i, c)), set: C.map(p => p.set[c] !== null), max: c === 'density' ? Math.max(1, max) : 1, cur, frac, h: 50, curve: c, title: t('curve:' + c) });
      return `<div class="radio-lane" data-lane="${c}" title="${esc(t('curveHelp:' + c))}"><span class="lane-name">${esc(t('curve:' + c))}</span><output>${esc(shownOf(c, val(cur, c), max))}</output>
        <button class="mini" data-curve-reset="${c}" ${anySet ? '' : 'disabled'} title="${esc(t('curveResetTip'))}">↺</button><div class="screen">${svg}</div></div>`;
    }).join('');
    const summary = LANES.map(c => `<span data-lane="${c}">${esc(t('curve:' + c))} <b>${esc(shownOf(c, val(cur, c), max))}</b></span>`).join(' · ');
    return `<div class="curves">
      <div class="radio-lane main" data-lane="energy"><span class="lane-name">${esc(t('curve:energy'))} · ${esc(t('curveMain'))}</span><output>${Math.round(P.plan[cur].target * 100)}</output><span></span><div class="screen">${energy}</div></div>
      <span class="curves-where">${esc(sec)}</span>
      <button class="curves-toggle" id="curves-toggle" aria-expanded="${detailsOpen}" title="${esc(t('curvesDetailsTip'))}"><span class="tw">${detailsOpen ? '▾' : '▸'} ${esc(t('curvesDetails'))}</span> ${detailsOpen ? '' : summary}</button>
      <div class="radio-lanes" ${detailsOpen ? '' : 'hidden'}>${lanes}</div>
    </div>`;
  }
  // the box with every value of one part (hover, or the part being dragged)
  const tipBox = (() => { const el = document.createElement('div'); el.className = 'curve-tip'; el.hidden = true; document.body.appendChild(el); return el; })();
  function showTip(item, d, px, py, over = {}) {
    if (!item || !item.plan || d === null) { tipBox.hidden = true; return; }
    const { P, max, val } = curveData(item);
    if (d < 0 || d >= P.plan.length) { tipBox.hidden = true; return; }
    const v = c => (over.curve === c ? over.value : c === 'energy' ? P.plan[d].target : val(d, c));
    tipBox.innerHTML = `<div class="tip-part">${esc(t('curvePart', { n: d + 1, role: t('role:' + P.plan[d].role) }))}</div>${['energy', ...LANES].map(c => `<div data-lane="${c}"><span>${esc(t('curve:' + c))}</span><b>${esc(c === 'energy' ? String(Math.round(v(c) * 100)) : shownOf(c, v(c), max))}</b></div>`).join('')}`;
    tipBox.hidden = false;
    const w = tipBox.offsetWidth, hh = tipBox.offsetHeight;
    tipBox.style.left = `${px + 14 + w > innerWidth ? px - 14 - w : px + 14}px`;
    tipBox.style.top = `${Math.max(4, Math.min(innerHeight - hh - 4, py - hh / 2))}px`;
  }
  const partAt = (svg, clientX) => { const r = svg.getBoundingClientRect(), n = +svg.dataset.n, vx = (clientX - r.left) / r.width * CW; return Math.max(0, Math.min(n - 1, Math.floor((vx - CPAD) / ((CW - 2 * CPAD) / n)))); };
  const curve = (entry, rel) => {
    const ph = entry.phrases, w = 160, h = 36, n = Math.max(1, ph.length - 1);
    const pts = ph.map((p, i) => `${(i / n * w).toFixed(1)},${(h - 3 - p.target * (h - 6)).toFixed(1)}`).join(' ');
    const x = Math.min(w, Math.max(0, rel / Math.max(1, entry.bars) * w));
    return `<svg class="radio-curve" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(t('radioShape'))}"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2"/><line x1="${x}" x2="${x}" y1="0" y2="${h}" class="pos"/></svg>`;
  };
  const partsText = entry => Object.entries(entry.parts).filter(([k]) => k !== 'dominant').map(([k, v]) => `${t('part_' + k)} ${styleName(v)}`).join(' · ');
  // (a trial style, or one a session embeds, invented-styles D9)
  const styleOf = id => recipes.find(x => x.id === id) || (opts.tempStyle && opts.tempStyle.id === id ? opts.tempStyle : null) || (S ? extraStylesOf(S.recipe).find(x => x.id === id) || ((S.stream.find(x => x.comp && x.comp.style && x.comp.style.id === id) || {}).comp || {}).style : null);
  const styleName = id => { const r = styleOf(id); return r ? tx(r.name) : id; };
  // a song made with a style that is not among the known ones: a trial style
  const onTrial = e => !!(e && e.styles && e.styles.some(id => !recipes.some(r => r.id === id) && styleOf(id)));

  // ---------- console, queue and mixer (#24) ----------
  // keyboard shortcuts: a key per command (type toggles add or remove)
  const KEYS_OF = { voicing: 'a', 'energy-up': 'ArrowUp', 'energy-down': 'ArrowDown', 'more-complex': '+', 'less-complex': '-', darker: '[', brighter: ']', dirtier: 'x', cleaner: 'c', 'more-space': 's', instrument: 'i', progression: 'h', key: 'k', 'talk-more': 'v', 'talk-less': 'V', drop: 'g', stay: 'r', extend: 'l', end: 'e', vary: 'n', swap: 'w' };
  // the instruments of the Arrangement group in their two rows (radio-arrangement D1): rhythm and low end, then melodic
  // and colour parts; digits 1 to 8 add the instruments shown in this order, Shift with the digit removes one
  const ARR_ROWS = [['kick', 'beat', 'bass', 'texture'], ['arp', 'hook', 'guitar', 'pad']];
  // the riser row (D11): what the next press places, remembered while the page is open
  const riserForm = { bars: 'auto', dir: 'up', sound: 'noise' };
  const keyLabel = k => ({ ArrowUp: '↑', ArrowDown: '↓', V: 'Shift+V' }[k] || k.toUpperCase());
  let steerKey = '', steerUseKey = '', dragging = null, pendingSession = null;
  // the part Vary and Swap act on (radio-variation D5): the lead by default, remembered while the page is open
  let varyPart = 'lead';
  // the track Vary and Swap act on (radio-arrangement D7): Auto, or one playing track of the part by id; back to Auto
  // when that track stops
  let varyTarget = 'auto';
  // Part harmony's treatment and the Song harmony menu (radio-arrangement D8), Auto by default
  let voicingTreat = 'auto', harmChords = 'auto', harmKey = 'auto';
  // Add a saved pattern (radio-arrangement D9, saved-patterns-hide): the panel shown or hidden, and its body as rows or
  // cards (both remembered in this browser; the old key "saved-open" now means cards), the track each pattern would replace
  let spCards = false, spHidden = false;
  try { spCards = !!store.get('coding-misk-radio-saved-open', false); spHidden = !!store.get('coding-misk-radio-saved-hidden', false); } catch (e) {}
  const spTarget = {};
  // the panel among many saved patterns (saved-patterns-list D1): its view (instrument chip, Fit this song, style, sort,
  // collapsed groups) remembered in this browser; the search, the scroll position and the last context of the console
  // kept here, so the console's rebuild at every phrase does not lose them
  let spView = cleanView(null);
  try { spView = cleanView(store.get('coding-misk-radio-saved-view', null)); } catch (e) {}
  let spQ = '', spScroll = 0, spCtx = null, spHtml = '';
  const spSaveView = () => { try { const { inst, fit, style, sort, closed } = spView; store.set('coding-misk-radio-saved-view', { inst, fit, style, sort, closed }); } catch (e) {} };
  // the instrument shown on the console: its name in the language of the page
  const instName = p => t(`inst:${p}`);
  // the queue label of an arrangement command: "+ arp (Arp 2)", "bass: locked", "riser 4 bars, up"
  const arrLabel = (c, item) => {
    if (c.kind === 'more') {
      const j = item ? item.commands.indexOf(c) : -1, a = item && item.plan && (item.plan.added || []).find(x => x.i === j), tr = a && item.song.tracks.find(x => x.id === a.id);
      return tr ? t('steerQ:more', { part: instName(c.part), track: tr.name || tr.id }) : t('steer:more', { part: instName(c.part) });
    }
    if (c.kind === 'riser') return t('steerQ:riser', { bars: c.bars === 'auto' || !c.bars ? t('riserAuto') : t('riserBarsN', { n: c.bars }), dir: t(`riserDir:${c.dir === 'down' ? 'down' : 'up'}`) });
    if (c.kind === 'pattern') {
      const name = (c.item && c.item.name) || t('steer:pattern');
      if (c.mode === 'replace') { const tr = item && item.song.tracks.find(x => x.id === c.target); return t('steerQ:patternReplace', { name, track: (tr && (tr.name || tr.id)) || c.target }); }
      const j = item ? item.commands.indexOf(c) : -1, a = item && item.plan && (item.plan.added || []).find(x => x.i === j), tr = a && item.song.tracks.find(x => x.id === a.id);
      return t('steerQ:patternNew', { name, track: tr ? tr.name || tr.id : t(`inst:${patternPart(c.item)}`) });
    }
    return t(`steer:${c.kind}`, { part: instName(c.part) });
  };
  // Vary and Swap with a target: the queue names the track ("Vary arp (Arp 2)"), with Auto the one it took
  const varyLabel = (c, item) => {
    const pre = c.kind === 'vary' ? 'V' : 'S', st = item && (item.song.build || []).find(s => s.at === c.at && s.by === 'listener' && s.pattern && new RegExp(`^${pre}\\d+$`).test(s.pattern.to) && (c.target === 'auto' || s.pattern.track === c.target));
    const tr = item && st && item.song.tracks.find(x => x.id === st.pattern.track);
    return tr ? t(`steerQ:${c.kind}`, { type: t(`steerType:${c.type || 'lead'}`), track: tr.name || tr.id }) : t(`steer:${c.kind}`, { type: t(`steerType:${c.type || 'lead'}`) });
  };
  // Part harmony and the Song harmony menu in the queue: the treatment (with Auto the one taken), the chords or the key
  const harmLabel = (c, item) => {
    if (c.kind === 'voicing') { const v = item && item.plan && (item.plan.voiced || []).filter(x => x.at === c.at && (!c.target || c.target === 'auto' || x.track === c.target)).pop(), tr = v && item.song.tracks.find(x => x.id === v.track); return v ? t('steerQ:voicing', { type: t(`steerType:${c.type || 'lead'}`), treat: t(`treat:${v.treatment}`), track: tr ? tr.name || tr.id : v.track }) : `${t('steer:voicing')} · ${t(`steerType:${c.type || 'lead'}`)}`; }
    if (c.kind === 'progression') return t('steerQ:progression', { name: PROGS[c.chords] ? tx(PROGS[c.chords][0]) : c.chords });
    const h = item && item.plan && (item.plan.harmony || []).find(x => x.from === c.at && x.key);
    return t('steerQ:key', { to: t(`harmKey:${c.to}`), key: h ? h.key : '' });
  };
  const cmdLabel = (c, item) => c.kind === 'say-live' ? t('svCmdSay', { text: c.text }) : c.kind === 'voice' || c.kind === 'voice-sound' ? t('svCmdVoice', { what: [c.voice && c.voice.preset ? t(`vinstPreset:${c.voice.preset}`) : '', c.sound && c.sound.style ? t(`voiceStyle:${c.sound.style}`) : ''].filter(Boolean).join(', ') || t('vinstLbl') }) : c.kind === 'voicing' || (['progression', 'key'].includes(c.kind) && ((c.chords && c.chords !== 'auto') || (c.to && c.to !== 'auto'))) ? harmLabel(c, item) : ['more', 'less', 'lock-part', 'unlock-part', 'riser', 'pattern'].includes(c.kind) ? arrLabel(c, item) : ['vary', 'swap'].includes(c.kind) && c.target ? varyLabel(c, item) : c.kind === 'extend' ? t('steer:extend', { s: c.s ? `+${c.s} s` : '' }) : ['add', 'remove', 'vary', 'swap'].includes(c.kind) ? t(`steer:${c.kind}`, { type: t(`steerType:${c.type || 'lead'}`) }) : c.kind === 'curve' && c.curve ? t('curveCmd', { curve: t('curve:' + c.curve), n: c.d + 1, v: c.curve === 'density' ? c.value : Math.round(c.value * 100) }) : c.kind === 'curve-reset' ? t('curveResetCmd', { curve: t('curve:' + c.curve) }) : c.kind === 'curve' ? t('steerCurveCmd', { n: c.d + 1, v: Math.round(c.value * 100) }) : ['volume', 'mute', 'unmute', 'lock', 'unlock'].includes(c.kind) || (c.kind === 'instrument' && c.track) ? t(`steer:${c.kind}`, { track: (item && (item.song.tracks.find(x => x.id === c.track) || {}).name) || c.track, v: Math.round((c.value || 0) * 100) }) : t(`steer:${c.kind}`);
  // ---------- the console's Voice group (voice-full-controls D10) ----------
  // the voice helper of the dev server (D8): a typed line needs it for its sample
  let voiceHelper = null;
  fetch('/voice/status').then(r => (r.ok ? r.json() : { ok: false })).then(j => { voiceHelper = !!(j && j.ok); renderSteer(true); }, () => { voiceHelper = false; });
  // the pickers of the Voce: traccia row (kept while the console redraws), the lines waiting for their sample
  const sv = { preset: '', style: '', line: '' }, sayWait = [];
  // the speaker a typed line speaks with: the voice track's of the song on air, else one that is not the narrator's
  const lineSpeaker = song => { const sp = song.tracks.find(x => x.type === 'spoken'), nar = narratorSpeaker(song); return sp ? speakerOf(song, sp) : SPEAKERS.find(x => x !== nar); };
  function voiceGroup(item, rel, btn) {
    const song = item.plain || item.song, has = song.tracks.some(x => x.type === 'spoken'), session = opts.scope === 'session';
    const sel = (k, list, lab, tipK) => `<select data-sv-${k} data-no-knob aria-label="${esc(t(tipK))}" title="${esc(t(tipK))}"><option value="">${esc(t('svKeep'))}</option>${list.map(v => `<option value="${v}"${sv[k] === v ? ' selected' : ''}>${esc(lab(v))}</option>`).join('')}</select>`;
    const nothing = !sv.preset && !sv.style, why = nothing ? t('svPickFirst') : !has && !session ? t('steerWhy:no-voice') : S.paused !== undefined ? t('steerWhy:paused') : '';
    const apply = `<button class="btn steer-btn" data-sv-apply${why ? ' disabled' : ''} title="${esc(t(session ? 'svApplySessionTip' : 'svApplyTip'))}${why ? ` · ${esc(why)}` : ''}">${esc(t('svApply'))}</button>`;
    const helperWhy = voiceHelper === false ? t('svNoHelper') : voiceHelper === null ? t('svHelperWait') : S.paused !== undefined ? t('steerWhy:paused') : '';
    const dis = helperWhy ? ` disabled title="${esc(t('svSayLbl'))} · ${esc(helperWhy)}"` : '';
    return `<div class="steer-group steer-voice"><span class="lbl">${esc(t('steerGroup:voice'))}</span>
      <div class="sv-row"><span class="lbl">${esc(t('narratorLbl'))}</span><div class="steer-btns">${btn({ kind: 'talk-more' })}${btn({ kind: 'talk-less' })}</div></div>
      <div class="sv-row"><span class="lbl">${esc(t('vinstLbl'))}</span><div class="steer-btns">${sel('preset', VOICE_PRESET_IDS, v => t(`vinstPreset:${v}`), 'svPresetTip')}${sel('style', VOICE_STYLE_IDS, v => t(`voiceStyle:${v}`), 'svStyleTip')}${apply}</div></div>
      <div class="sv-row sv-say"><span class="lbl">${esc(t('svSayLbl'))}</span><div class="steer-btns"><input type="text" data-sv-line maxlength="120" autocomplete="off" spellcheck="false" value="${esc(sv.line)}" placeholder="${esc(t('svSayPh'))}"${dis || ` title="${esc(t('svHint'))}"`}><button class="btn steer-btn" data-sv-say="now"${dis || ` title="${esc(t('svNowTip'))}"`}>${esc(t('svNow'))}</button><button class="btn steer-btn" data-sv-say="moment"${dis || ` title="${esc(t('svMomentTip'))}"`}>${esc(t('svMoment'))}</button></div></div>
      <p class="hint muted small">${esc(t('svHint'))}</p></div>`;
  }
  // Apply: the phrase preset and the voice style on the song on air (one command, one Cancel); with the whole session
  // they also go to the Voices group for the next songs (also with an artist: they are not an artist's traits)
  function voiceApply() {
    const item = S && S.stream[S.onAir]; if (!item) return;
    const session = opts.scope === 'session', song = item.plain || item.song, has = song.tracks.some(x => x.type === 'spoken');
    if (session) {
      const v = sv.preset ? applyPreset(sv.preset, opts.voice, { presence: true }) : opts.voice;
      opts.voice = cleanVoice({ ...v, sound: sv.style ? { style: sv.style } : v.sound });
      saveOpts();
      if (!opts.voices.track) toast(t('svTrackOff'));
    }
    if (has) {
      const p = sv.preset ? cleanVoice(applyPreset(sv.preset, cleanVoice({}), { presence: false })) : null;
      const cmd = { kind: 'voice', voice: p ? { phrases: p.phrases, kind: p.kind, ways: p.ways, presence: p.presence, preset: sv.preset } : null, ...(sv.style ? { sound: { style: sv.style } } : {}) };
      if (command(cmd)) toast(t('svApplied'));
    } else if (session) toast(t('svNextOnly'));
    if (session) render();
  }
  // a typed line (D10): its sample first (the voice helper), then the line tried on the song on air and queued once its
  // window is ready (#82: nothing heavy on the click, the window's plan made a little at a time). Say now means "in a few
  // seconds" (owner, 2 November): the first bar that starts at least SAY_LEAD seconds after the click; At the right
  // moment: the next free part where the voice track may speak from that bar. When the sample or the window is not ready
  // a third of a bar before the line's bar, the line moves to the first bar SAY_LEAD seconds ahead again (a push), never
  // lost; after SAY_PUSHES pushes its window is finished at once. Recorded like any command, so Replay says it
  const SAY_LEAD = 2, SAY_PUSHES = 3, SAY_LOAD = 15000, sayPushes = {};
  // the bars of SAY_LEAD seconds at a bar of a song
  const leadOf = (song, bar) => { let a = 0, bpm = 120; for (const x of song.sections) { bpm = x.bpm || 120; if (bar < a + x.bars) break; a += x.bars; } return SAY_LEAD * bpm / 240; };
  // the command's bar for a typed line on the song on air, now: SAY_LEAD seconds ahead at least; null when it is late
  function sayAt(item) {
    const rel = relNow(), lead = leadOf(item.song, rel);
    if (airSteer(item) && item.g0) { const c = airBoundaries('say-live', rel, item.plan, item.g0, lead); return c.length ? c[0] : null; }
    const at = applyBar('say-live', rel, item.plan, lead);
    return at > rel && at < barsOf(item.song) ? at : null;
  }
  async function sayLine(mode) {
    const item = S && S.stream[S.onAir]; if (!item || !item.plan) return;
    const text = sv.line.trim().replace(/\s+/g, ' '), words = text ? text.split(' ').length : 0;
    if (!text) return toast(t('plEmptyText'));
    if (words > 12) return toast(t('plTooMany', { n: words, max: 12 }));
    const song = item.plain || item.song, lang = getLang(), speaker = speakerIn(lang, lineSpeaker(song));
    if (mode === 'moment') {
      const why = whyNot({ kind: 'say-live', mode }, song, item.plan, relNow());
      if (why) return toast(t('svNoPart'));
    }
    sv.line = '';
    // (the queue shows the bar Say now aims at while the sample comes)
    const w = { text, mode, item, at: mode === 'now' ? sayAt(item) : null }; sayWait.push(w); renderSteer(true);
    // (my-phrases D2, D3: the line is offered to my phrases, kind voice, the style's vocabulary group and the style)
    // (in a task of its own after the click: my phrases save and draw the tabs again, #82)
    setTimeout(() => onTyped({ text, lang, song }), 0);
    const got = await fetch('/voice/say', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, lang, speaker }) })
      .then(async r => { if (!r.ok) return null; const j = await r.json().catch(() => ({})); if (j && j.made) onSampleMade({ text, lang, bank: j.bank, song }); return j || {}; })
      .catch(() => null);
    const drop = () => { const i = sayWait.indexOf(w); if (i >= 0) sayWait.splice(i, 1); };
    if (!got) { drop(); renderSteer(true); return toast(t('svSampleFailed')); }
    // (only the bank of the new sample is read again: the whole manifest took a long task, #82)
    await reloadSamples(got.bank || null);
    // its buffer loaded and decoded before the line goes on a bar: a sample still decoding on its bar is skipped by the
    // player and the line lost (#82); a sample that never answers is given up after SAY_LOAD ms
    if (player.loadVoice && got.bank && got.n >= 0) {
      w.ready = false;
      Promise.race([player.loadVoice({ s: got.bank, n: got.n }), new Promise(r => setTimeout(r, SAY_LOAD))]).catch(() => {}).then(() => { w.ready = true; });
    }
    placeLine(w, { kind: 'say-live', text, lang, speaker, mode }, drop);
  }
  // the line tried on the song on air (the window with it made ready a little at a time), queued when ready before its
  // bar, else pushed (see sayLine)
  function placeLine(w, c, drop, tries = 0) {
    const later = (ms, n = tries) => setTimeout(() => placeLine(w, c, drop, n), ms);
    if (!S) { drop(); return; }
    if (S.paused !== undefined) { later(300); return; }
    const item = S.stream[S.onAir];
    if (!item.plan) { drop(); renderSteer(true); toast(t(item.frozen ? 'steerWhy:frozen' : 'steerWhy:lead')); return; }
    // the bar aimed at on the click while it still leaves half of SAY_LEAD (the sample came; the window is made in that
    // time), else the first one SAY_LEAD seconds ahead (a push)
    const rel = relNow(), lead = leadOf(item.song, rel);
    const at = w.item === item && w.at !== null && w.at >= rel + Math.max(0.5, lead / 2) ? w.at : sayAt(item);
    if (at === null) { drop(); renderSteer(true); toast(t('steerLate')); return; }
    const moved = at !== w.at;
    if (moved && w.at !== null) sayPushes[c.text] = (sayPushes[c.text] || 0) + 1;
    w.at = at; w.item = item;
    if (moved) renderSteer(true);
    const air = airSteer(item) && item.g0, line = { at, text: c.text, lang: c.lang, speaker: c.speaker || '', mode: c.mode === 'moment' ? 'moment' : 'now' };
    // the song with the line, as command gives it: on the grown song at once (fx3), or the Classic steering
    let pre;
    if (air) pre = { at, song: sayAir(item.song, [line]) };
    else if (!item.growCtx) { const r = steerSong({ ...item.base, commands: [...item.commands, { ...c, at }], seed: S.recipe.seed, n: item.n }); pre = { at, song: r.song, steer: r }; }
    else { drop(); renderSteer(true); command(c); return; }
    const bar = lineBarOf(pre.song, c);
    // (At the right moment and no free part left from that bar)
    if (bar === null) { drop(); renderSteer(true); toast(t('svNoPart')); return; }
    const mine = S, songNow = item.song, inWin = () => S.stream.slice(S.onAir, S.onAir + 2), win0 = inWin();
    const still = () => S === mine && S.stream[S.onAir] === item && item.song === songNow && inWin().length === win0.length && inWin().every((x, i) => x === win0[i]);
    // (the window made in a task of its own after the steering's song)
    setTimeout(() => {
      if (!still()) { later(0); return; }
      const p = windowPlayable({ item, song: pre.song }), forced = tries >= SAY_PUSHES, loaded = () => w.ready !== false;
      const commit = () => {
        if (!still()) { later(0); return; }
        if (S.paused !== undefined) { later(300); return; }
        // (late: its window not ready a third of a bar before the line's bar, as swapSoon, or its sample not decoded yet
        // (#82; even after SAY_PUSHES pushes): the line moves on)
        if ((!forced || !loaded()) && player.now() >= item.start + bar - 0.34) { later(0, tries + 1); return; }
        drop();
        if (!command(c, { ...pre, p })) renderSteer(true);
      };
      const waits = [];
      if (!forced && p.prepare) waits.push(null);
      if (!loaded()) waits.push(new Promise(r => { const poll = () => (loaded() ? r() : setTimeout(poll, 30)); poll(); }));
      if (!waits.length) { commit(); return; }
      // (late before it is ready: given up at once, the slices stop)
      let gone = false;
      const watch = () => { if (gone) return; if (!still()) { gone = true; return; } if (player.now() >= item.start + bar - 0.34) { gone = true; commit(); } else setTimeout(watch, 30); };
      const ready = waits.map(x => x || p.prepare(12, () => !gone && still()));
      const go = () => { if (!gone) { gone = true; commit(); } };
      Promise.all(ready.map(x => x.catch(() => {}))).then(go);
      watch();
    }, 0);
  }
  // the lines typed in the song on air (my-phrases D3): each keeps a small save button until the song ends, for a late
  // Salva after a Chiedi left unanswered or a Non salvare mai
  function typedRows(item) {
    if (!item || !item.commands) return [];
    const seen = new Set(), out = [];
    for (const c of item.commands) if (c.kind === 'say-live' && c.text && !seen.has(`${c.lang}|${c.text}`)) { seen.add(`${c.lang}|${c.text}`); out.push({ text: c.text, lang: c.lang || getLang(), song: item.song, saved: !!typedSaved(c.text, c.lang || getLang()) }); }
    return out;
  }
  function typedHtml(item) {
    const rows = typedRows(item);
    if (!rows.length) return '';
    return `<div class="lbl">${esc(t('svTypedTitle'))}</div><ul class="steer-typed">${rows.map((x, i) => `<li><span class="sv-typed-text">«${esc(x.text)}»</span> ${x.saved ? `<span class="muted small">${esc(t('svTypedSaved'))}</span>` : `<button class="mini sv-keep" data-sv-keep="${i}" title="${esc(t('svTypedSaveTip'))}" aria-label="${esc(t('svTypedSaveTip'))}">${esc(t('phAskSave'))}</button>`}</li>`).join('')}</ul>`;
  }
  // the song's state at a bar, kept for the bar (renderSteer runs four times a second; steps and clips are on whole bars)
  let stateMemo = null;
  const stateNow = (song, rel) => { const b = Math.floor(rel); if (!stateMemo || stateMemo.song !== song || stateMemo.b !== b) stateMemo = { song, b, st: stateAt(song, b).song }; return stateMemo.st; };
  function renderSteer(force = false) {
    const box = root.querySelector('#radio-steer');
    if (!box || dragging) return;
    if (!S) { if (box.dataset.k !== 'off') { box.dataset.k = 'off'; box.innerHTML = `<div class="lbl">${esc(t('steerTitle'))}</div><p class="muted">${esc(t('steerIdle'))}</p>`; } return; }
    const item = S.stream[S.onAir], rel = relNow();
    // song 0 from Compose (#29) is not the director's: steering starts from song 1
    if (!item.plan) { const k = item.frozen ? 'frozen' : 'lead'; if (box.dataset.k !== k) { box.dataset.k = k; steerKey = ''; box.innerHTML = `<div class="lbl">${esc(t('steerTitle'))}</div><p class="muted">${esc(t('steerWhy:' + k))}</p>`; } return; }
    box.dataset.k = '';
    const ph = item.plan.phrase;
    const st = stateNow(item.song, rel), on = st.tracks.filter(x => !x.mute && x.type !== 'voice' && x.clips.some(c => c.start <= rel && c.start + c.bars > rel));
    const pending = item.commands.filter(c => c.at > rel || c.scope === 'session');
    // (the use counts of the saved patterns redraw only the panel's body, not the console: an add or a replace counts a
    // use right after its own redraw, #82)
    const pats = userPatterns(), useKey = pats.map(x => `${x.uses || 0}:${x.lastUsed || ''}`).join();
    const key = [item.n, item.ver || 0, Math.floor(rel / ph), on.map(x => x.id).join(), pending.map(c => `${c.id}@${c.at}`).join(), lockedIds(item.plan).join(), (item.plan.lockedParts || []).join(), S.paused !== undefined, opts.scope, varyPart, varyTarget, voicingTreat, harmChords, harmKey, JSON.stringify(riserForm), spCards, spHidden, JSON.stringify(spTarget), player.preview ? player.preview.on : '', pats.map(x => x.id).join(), sv.preset, sv.style, voiceHelper, sayWait.map(w => w.at).join(), typedRows(item).map(x => `${x.text}:${x.saved}`).join('~')].join('|');
    if (!force && key === steerKey) { if (useKey !== steerUseKey) { steerUseKey = useKey; spUsesChanged(pats); } return; }
    steerKey = key; steerUseKey = useKey;
    const typing = document.activeElement && document.activeElement.matches && document.activeElement.matches('[data-sv-line]') ? document.activeElement.selectionStart : null;
    setTimeout(() => { if (typing === null) return; const i = root.querySelector('[data-sv-line]'); if (i) { i.focus(); try { i.setSelectionRange(typing, typing); } catch (e) {} } }, 0);
    const tip = k => `title="${esc(t(k))}"`;
    const air = airSteer(item) && item.g0, airOff = air ? airOffset(item.g0) : 0;
    // a disabled button says why in its tooltip ("this song has no pad")
    // (a grown song: the director's view in its own bars, late when no boundary is left, radio-profiles D9)
    const whyOf = c => (S.paused !== undefined ? 'paused' : air && !airBoundaries(c.kind, rel, item.plan, item.g0).length ? 'late' : whyNot(c, air ? item.plain || item.base.song : item.song, item.plan, rel - airOff, tailOf(item), item.opts || (item.base && item.base.opts) || {}));
    const btn = (c, label) => {
      const part = ['vary', 'swap', 'voicing'].includes(c.kind);
      const why = whyOf(c), k = KEYS_OF[c.kind];
      const songOnly = opts.scope === 'session' && ['vary', 'swap', 'riser'].includes(c.kind) ? ` · ${t('steerSongOnly')}` : '';
      const tipText = `${t(`steerTip:${c.kind}`, { ...(c.vars || {}), ...(part ? { type: t(`steerType:${c.type}`) } : {}) })}${songOnly}${k ? ` (${keyLabel(k)})` : ''}${why ? ` · ${t(`steerWhy:${why}`, { type: c.type ? t(`steerType:${c.type}`) : '' })}` : ''}`;
      // Vary and Swap carry their part in data-part (data-type is the Add and Remove buttons' shortcut target)
      return `<button class="btn steer-btn${c.icon ? ' with-ico' : ''}" data-cmd="${c.kind}"${c.type ? ` data-${part ? 'part' : 'type'}="${c.type}"` : ''}${c.target ? ` data-target="${esc(c.target)}"` : ''}${c.treatment ? ` data-treatment="${esc(c.treatment)}"` : ''}${c.chords ? ` data-chords="${esc(c.chords)}"` : ''}${c.to ? ` data-to="${esc(c.to)}"` : ''} ${why ? 'disabled' : ''} title="${esc(tipText)}"${why ? ` data-why="${why}"` : ''}>${c.icon || ''}${esc(label || t(`steer:${c.kind}`))}</button>`;
    };
    // the type buttons say what the next phrase can do: "+" when the type will be silent there, "−" when it will play
    const nextBar = Math.min(barsOf(item.song) - 1, applyBar('add', rel, item.plan)), onNext = stateAt(item.song, nextBar).song.tracks.filter(x => !x.mute && x.type !== 'voice' && x.clips.some(c => c.start <= nextBar && c.start + c.bars > nextBar));
    if (!air) playMemo = { song: item.song, bar: nextBar, on: onNext };
    // the Arrangement group (radio-arrangement): a − and a + per instrument the style or the song has, with a count badge
    // and a lock, in two rows; a line with the tracks playing and the warning past the recommended counts; the riser row
    const songNow = air ? item.plain || item.base.song : item.song, relNowDir = rel - airOff;
    // the target of Vary and Swap: Auto or a playing track of the part at the next phrase (D7)
    const targets = varyTracks(onNext, varyPart);
    if (varyTarget !== 'auto' && !targets.some(x => x.id === varyTarget)) varyTarget = 'auto';
    // Add a saved pattern (D9): the patterns that fit (type and meter), folded to a list or open as cards, each with a
    // preview drawing and a listen; the ones that do not fit are counted
    const saved = userPatterns(), fitting = saved.filter(x => fitsAir(x, item.plan, songNow)), unfit = saved.filter(x => !fitsAir(x, item.plan, songNow));
    const unMeter = unfit.filter(x => unfitReason(x, item.plan) === 'meter').length, unType = unfit.length - unMeter;
    const secNow = (() => { let a = 0, sc = item.song.sections[0]; for (const x of item.song.sections) { if (rel >= a) sc = x; a += x.bars; } return sc || {}; })();
    const pvOn = player.preview ? player.preview.on : null;
    const listenBtn = x => { const on = pvOn === x.id, tip = t(on ? 'savedListenStop' : 'savedListen'); return `<button class="mini sp-listen" data-sp-listen="${esc(x.id)}" aria-pressed="${on}" title="${esc(tip)}" aria-label="${esc(tip)}"${S.paused !== undefined ? ' disabled' : ''}>${on ? STOP : LISTEN}</button>`; };
    const typeOf = x => instName(patternPart(x));
    const whyMemo = new Map();
    const spBtn = (x, mode) => {
      const targets = onNext.filter(y => y.type === x.type), tg = spTarget[x.id] && targets.some(y => y.id === spTarget[x.id]) ? spTarget[x.id] : (targets[0] || {}).id;
      // (every pattern listed fits, so the reason depends only on the mode, the type and the target: worked out once per
      // render, not per card, saved-patterns-list D4)
      const c = { kind: 'pattern', mode, item: x, ...(mode === 'replace' ? { target: tg } : {}) }, wk = `${mode}|${x.type}|${tg || ''}`, label = t(mode === 'new' ? 'savedAddNew' : 'savedReplace');
      if (!whyMemo.has(wk)) whyMemo.set(wk, whyOf(c));
      const why = whyMemo.get(wk);
      const tip = `${t('steerTip:pattern')}${why ? ` · ${t(`steerWhy:${why}`, { type: typeOf(x) })}` : ''}`;
      const sel = mode === 'replace' && targets.length ? `<select data-sp-target="${esc(x.id)}" data-no-knob aria-label="${esc(label)}">${targets.map(y => `<option value="${esc(y.id)}"${y.id === tg ? ' selected' : ''}>${esc(y.name || y.id)}</option>`).join('')}</select>` : '';
      return `${sel}<button class="btn small" data-sp-${mode}="${esc(x.id)}" title="${esc(tip)}"${why ? ` disabled data-why="${why}"` : ''}>${esc(label)}</button>`;
    };
    const spInfo = x => { const c = x.context || {}; return t('savedInfo', { type: typeOf(x), key: c.key || 'A', bpm: c.bpm || '?' }); };
    const tempoHint = x => { const b = Number((x.context || {}).bpm), now = Number(secNow.bpm || item.entry.bpm); return b && now && (now / b > 1.5 || b / now > 1.5) ? `<small class="sp-tempo">${esc(t('savedTempo', { bpm: b, now: Math.round(now) }))}</small>` : ''; };
    // (a drawing carries the values it was drawn with, so a console rebuild can keep it: saved-patterns-list D4)
    const pvKey = x => { const c = x.context || {}; return `${c.chords || secNow.chords || ''}|${c.meter || '4/4'}|${c.mode || 'minor'}`; };
    const spCanvas = (x, big) => `<canvas class="sp-pv${big ? ' big' : ''}" data-sp-pv="${esc(x.id)}" data-sp-k="${esc(pvKey(x))}" width="${big ? 220 : 64}" height="${big ? 44 : 20}" aria-hidden="true"></canvas>`;
    // (the folded list adds as a new track from its row too, with the card's reason when it cannot)
    const spPlus = x => {
      const wk = `new|${x.type}|`;
      if (!whyMemo.has(wk)) whyMemo.set(wk, whyOf({ kind: 'pattern', mode: 'new', item: x }));
      const why = whyMemo.get(wk), tip = `${t('savedAddNew')}${why ? ` · ${t(`steerWhy:${why}`, { type: typeOf(x) })}` : ''}`;
      return `<button class="mini sp-add" data-sp-new="${esc(x.id)}" title="${esc(tip)}" aria-label="${esc(tip)}"${why ? ` disabled data-why="${why}"` : ''}>+</button>`;
    };
    const spRow = x => `<li class="sp-row">${listenBtn(x)}${spCanvas(x, false)}<span class="sp-name">${esc(x.name || x.id)}</span><span class="chip small">${esc(typeOf(x))}</span>${spPlus(x)}</li>`;
    // with the toolbar (more than 8 patterns), a card says how often the pattern was used (D5)
    const spUses = x => { const n = Number(x.uses) || 0, d = daysAgo(x.lastUsed); return !n ? t('savedNeverUsed') : `${t(n === 1 ? 'savedUsedOnce' : 'savedUsedN', { n })}${d === null ? '' : ` · ${d === 0 ? t('savedToday') : d === 1 ? t('savedYesterday') : t('savedDaysAgo', { d })}`}`; };
    const spCard = (x, uses = false) => `<div class="sp-card"><div class="sp-top">${listenBtn(x)}<b>${esc(x.name || x.id)}</b></div><small class="muted">${esc(spInfo(x))}${(x.styles || []).filter(y => y !== 'any').length ? ` · ${esc(x.styles.filter(y => y !== 'any').join(', '))}` : ''}</small>${uses ? `<small class="muted sp-uses">${esc(spUses(x))}</small>` : ''}${spCanvas(x, true)}${tempoHint(x)}<div class="sp-acts">${spBtn(x, 'new')}${spBtn(x, 'replace')}</div></div>`;
    const spNote = !saved.length ? t('savedNone') : !fitting.length ? t('savedNoneFit') : '';
    const spUnfit = [unMeter ? t('savedUnfitMeter', { n: unMeter }) : '', unType ? t('savedUnfitType', { n: unType }) : ''].filter(Boolean).join(' · ');
    spCtx = { fitting, spRow, spCard, song: { styles: item.entry.styles || [], bpm: Number(secNow.bpm || item.entry.bpm) || 0 }, note: [spNote, spUnfit].filter(Boolean).join(' ') };
    const savedPanel = spPanelHtml();
    // Part harmony (D8): the treatment menu and the button, on the part and track picked for Vary and Swap
    const treatSel = `<label class="arr-sel"><span>${esc(t('voicingTreat'))}</span><select data-voicing-treat data-no-knob>${['auto', ...TREATMENTS].map(x => `<option value="${x}"${x === voicingTreat ? ' selected' : ''}>${esc(t(`treat:${x}`))}</option>`).join('')}</select></label>`;
    const voicingRow = `<span class="steer-voicing">${treatSel}${btn({ kind: 'voicing', type: varyPart, target: varyTarget, treatment: voicingTreat }, t('steer:voicing'))}</span>`;
    // the Song harmony menu (D8): the style's progressions by name and a key move, Auto by default
    const curSec = (() => { let a = 0, sc = item.song.sections[0]; const b = Math.min(barsOf(item.song) - 1, applyBar('key', rel, item.plan)); for (const x of item.song.sections) { if (b >= a) sc = x; a += x.bars; } return sc || {}; })();
    if (harmChords !== 'auto' && !(item.plan.R.progressions || []).includes(harmChords)) harmChords = 'auto';
    const harmMenu = `<span class="steer-harm"><label class="arr-sel"><span>${esc(t('harmChords'))}</span><select data-harm-chords data-no-knob>${['auto', ...(item.plan.R.progressions || [])].map(x => `<option value="${esc(x)}"${x === harmChords ? ' selected' : ''}>${esc(x === 'auto' ? t('harmAuto') : PROGS[x] ? tx(PROGS[x][0]) : x)}</option>`).join('')}</select></label><label class="arr-sel"><span>${esc(t('harmKey'))}</span><select data-harm-key data-no-knob>${KEY_MOVES.map(x => `<option value="${x}"${x === harmKey ? ' selected' : ''}>${esc(x === 'auto' ? t('harmAuto') : `${t(`harmKey:${x}`)}${keyTo(curSec.key || item.entry.key, x) ? ` (${keyTo(curSec.key || item.entry.key, x)})` : ''}`)}</option>`).join('')}</select></label></span>`;
    const targetSel = `<label class="arr-sel steer-target" title="${esc(t('steerTargetTip'))}"><span>${esc(t('steerTarget'))}</span><select data-vary-target data-no-knob>${[['auto', t('steerTargetAuto')], ...targets.map(x => [x.id, x.name || x.id])].map(([v, l]) => `<option value="${esc(v)}"${v === varyTarget ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
    const shown = ARR_ROWS.map(row => row.filter(p => partHas(item.plan.R, p) || item.song.tracks.some(x => instrumentOf(x) === p)));
    const order = shown.flat(), lk = lockedIds(item.plan);
    const countOf = p => onNext.filter(x => instrumentOf(x) === p).length;
    const lockOf = p => {
      if ((item.plan.lockedParts || []).includes(p)) return { state: 'closed' };
      const ids = item.song.tracks.filter(x => instrumentOf(x) === p).map(x => x.id), n = ids.filter(id => lk.includes(id)).length;
      return { state: !ids.length || !n ? 'open' : n === ids.length ? 'closed' : 'half', n, m: ids.length };
    };
    const lockBtn = p => {
      const L = lockOf(p), riser = p === 'riser';
      const tip = riser ? t(L.state === 'closed' ? 'riserLockClosed' : 'riserLockOpen') : L.state === 'half' ? t('arrLockHalf', { n: L.n, m: L.m, part: instName(p) }) : t(L.state === 'closed' ? 'arrLockClosed' : 'arrLockOpen', { part: instName(p) });
      return `<button class="mini arr-lock" data-lock-part="${p}" data-state="${L.state}" aria-pressed="${L.state === 'closed'}" aria-label="${esc(tip)}" title="${esc(tip)}"${S.paused !== undefined ? ' disabled' : ''}>${L.state === 'closed' ? LOCK : L.state === 'half' ? LOCK_HALF : LOCK_OPEN}</button>`;
    };
    const instBtn = (kind, p) => {
      // (a pending change on the instrument can be taken back with the other button, console-add-ahead D3)
      const net = netUpTo(item, Infinity, p), back = (kind === 'less' && net > 0) || (kind === 'more' && net < 0);
      const c = { kind, part: p }, why = back ? null : whyOf(c), name = instName(p), k = order.indexOf(p) + 1;
      const warn = kind === 'more' && !why ? moreWarning(p, songNow, item.plan, relNowDir) : null;
      const tip = `${t(`steerTip:${kind}`, { part: name })}${warn ? ` · ${t('arrWarn', { part: name, n: warn.count, rec: warn.rec })}` : ''} (${kind === 'less' ? 'Shift+' : ''}${k})${why ? ` · ${t(`steerWhy:${why}`, { type: name })}` : ''}`;
      return `<button class="btn steer-btn arr-pm" data-cmd="${kind}" data-inst="${p}" aria-label="${esc(t(`steer:${kind}`, { part: name }))}" title="${esc(tip)}"${why ? ` disabled data-why="${why}"` : ''}>${kind === 'more' ? '+' : '−'}</button>`;
    };
    const pendViews = pendView(item), pendOf = {};
    for (const v of pendViews) if (!v.lock && !pendOf[v.part]) pendOf[v.part] = v;
    const instBox = p => { const n = countOf(p), over = n > RECOMMENDED[p]; return `<span class="arr-inst${over ? ' over' : ''}" data-arr="${p}">${instBtn('less', p)}<span class="arr-name">${esc(instName(p))}${n > 1 ? `<span class="arr-count${over ? ' warn' : ''}">×${n}</span>` : ''}</span>${pendOf[p] ? badgeHtml(pendOf[p]) : ''}${instBtn('more', p)}${lockBtn(p)}</span>`; };
    const total = onNext.filter(x => x.type !== 'riser' && x.type !== 'spoken').length;
    const over = order.filter(p => countOf(p) > RECOMMENDED[p]);
    const sel = (k, list, lab) => `<label class="arr-sel"><span>${esc(t(lab))}</span><select data-riser="${k}" data-no-knob>${list.map(([v, l]) => `<option value="${v}"${String(riserForm[k]) === String(v) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
    const riserRow = `<div class="arr-riser" title="${esc(t('steerTip:riser'))}">${btn({ kind: 'riser', bars: riserForm.bars, dir: riserForm.dir, sound: riserForm.sound }, t('steer:riser'))}${sel('bars', RISER_BARS.map(b => [b, b === 'auto' ? t('riserAuto') : t('riserBarsN', { n: b })]), 'riserBars')}${sel('dir', [['up', t('riserDir:up')], ['down', t('riserDir:down')]], 'riserDir')}${sel('sound', RISER_SOUNDS.map(x => [x, t(`riserSound:${x}`)]), 'riserSound')}${lockBtn('riser')}</div>`;
    const types = `<div class="arr-rows">${shown.map((row, i) => `<div class="arr-row">${row.map(instBox).join('')}${i === 1 ? btn({ kind: 'more-complex' }) + btn({ kind: 'less-complex' }) : ''}</div>`).join('')}${riserRow}
      <p class="arr-info muted">${esc(t('arrCount', { n: total, usual: item.plan.usualHigh, cap: TRACK_CAP }))}</p>${over.length ? `<p class="arr-warn">${esc(over.map(p => t('arrWarn', { part: instName(p), n: countOf(p), rec: RECOMMENDED[p] })).join(' · '))}. ${esc(t('arrRec'))}</p>` : ''}</div>`;
    // (a group with a hint: the harmony, which changes every part with notes, owner's tests #76)
    const group = (name, html) => `<div class="steer-group${name === 'arrangement' ? ' arr' : ''}"><span class="lbl"${name === 'harmony' ? ` title="${esc(t(`steerGroupTip:${name}`))}"` : ''}>${esc(t(`steerGroup:${name}`))}</span><div class="steer-btns">${html}</div></div>`;
    // the saved patterns panel survives the rebuild (D1): the same node when nothing in it changed, else a new one that
    // takes the drawings already made; then its scroll, the focus and the search's caret come back
    const spOld = box.querySelector('.sp'), spFocus = spFocusOf(spOld);
    box.innerHTML = `<div class="steer-head"><div class="lbl">${esc(t('steerTitle'))}</div>
        <span class="hand-from steer-scope" ${tip('steerScopeTip')}><button class="led" id="steer-scope" aria-pressed="${opts.scope === 'session'}" aria-labelledby="steer-scope-lbl"></button><span id="steer-scope-lbl">${esc(t(opts.scope === 'session' ? 'steerScopeSession' : 'steerScopeSong'))}</span></span></div>
      <div class="steer-console">
        ${group('energy', btn({ kind: 'energy-up' }) + btn({ kind: 'energy-down' }))}
        ${group('arrangement', types)}
        ${group('parts', `<span class="steer-part" role="radiogroup" aria-label="${esc(t('steerPartPick'))}">${VARY_TYPES.map(p => `<button class="chip small" role="radio" data-vary-part="${p}" aria-checked="${varyPart === p}" aria-pressed="${varyPart === p}" title="${esc(t('steerPartPick'))}: ${esc(t(`steerType:${p}`))}">${esc(t(`steerType:${p}`))}</button>`).join('')}</span>${targetSel}${btn({ kind: 'vary', type: varyPart, target: varyTarget, icon: VARY }, t('steerBtn:vary'))}${btn({ kind: 'swap', type: varyPart, target: varyTarget, icon: SWAP }, t('steerBtn:swap'))}${voicingRow}`)}
        <div class="sp-slot"></div>
        ${group('sound', ['darker', 'brighter', 'dirtier', 'cleaner', 'more-space', 'instrument'].map(k => btn({ kind: k })).join(''))}
        ${group('harmony', harmMenu + btn({ kind: 'progression', chords: harmChords }) + btn({ kind: 'key', to: harmKey }))}
        ${voiceGroup(item, rel, btn)}
        ${group('song', btn({ kind: 'drop' }) + btn({ kind: 'stay' }) + (() => { const s = `+${Math.round(extendSeconds(item.plan))} s`; return btn({ kind: 'extend', vars: { s } }, t('steer:extend', { s })); })() + btn({ kind: 'end' }))}
      </div>
      <div class="lbl">${esc(t('steerQueue'))}</div>
      <ul class="steer-queue">${pendViews.map(rowHtml).join('')}${sayWait.map(w => `<li><span class="at">${w.at !== null && w.item === item ? esc(t('radioBarShort', { n: w.at + 1 })) : '…'}</span> ${esc(t('svQueueWait', { text: w.text }))}</li>`).join('')}${pending.map(c => `<li><span class="at">${esc(t('radioBarShort', { n: heardAt(item, c) + 1 }))}</span> ${esc(cmdLabel(c, item))}${c.scope === 'session' ? `<span class="muted"> · ${esc(t('steerForSession'))}</span>` : ''} ${['more', 'less', 'lock-part', 'unlock-part', 'lock', 'unlock'].includes(c.kind) && heardAt(item, c) - rel > 0 && heardAt(item, c) - rel <= ADD_MARGIN ? `<button class="mini" disabled aria-label="${esc(t('arrPendEntering'))}" title="${esc(t('arrPendEntering'))}">✕</button>` : `<button class="mini" data-cancel="${c.id}" aria-label="${esc(t('steerCancel'))}" title="${esc(t('steerCancel'))}">✕</button>`}</li>`).join('') || `<li class="muted"${sayWait.length || pendViews.length ? ' hidden' : ''}>${esc(t('steerQueueEmpty'))}</li>`}</ul>${typedHtml(item)}
      <div class="lbl">${esc(t('steerMixer'))}</div>
      <div class="steer-mixer">${[...on, ...st.tracks.filter(x => x.mute && lk.includes(x.id))].map(x => { const locked = lk.includes(x.id), g = (x.settings || {}).gain ?? 0.5; return `<div class="mix-row"><span class="mix-name">${esc(x.name || x.id)}</span>
        <input type="range" min="0" max="1.2" step="0.05" value="${g}" data-mix-vol="${esc(x.id)}" data-no-knob aria-label="${esc(t('steerVolume', { track: x.name || x.id }))}" title="${esc(t('steerVolume', { track: x.name || x.id }))}">
        <button class="mini" data-mix-mute="${esc(x.id)}" aria-pressed="${!!x.mute}" title="${esc(t('steerTip:mute'))}">M</button>
        <button class="mini" data-mix-lock="${esc(x.id)}" aria-pressed="${locked}" title="${esc(t('steerTip:lock'))}" aria-label="${esc(t('steerTip:lock'))}">${locked ? LOCK : LOCK_OPEN}</button>
        <button class="mini" data-mix-inst="${esc(x.id)}" title="${esc(t('steerTip:instrument'))}">♪</button></div>`; }).join('') || `<p class="muted">${esc(t('steerMixerEmpty'))}</p>`}</div>`;
    spMount(box.querySelector('.sp-slot'), spOld, savedPanel, spFocus);
    // (the locks waiting for their boundary keep their ring after a rebuild, D8)
    paintPending();
    paintExtend();
  }

  // ---------- saved patterns among many (saved-patterns-list) ----------
  const SP_SORT_LABEL = { saved: 'savedSort_saved', recent: 'savedSort_recent', used: 'savedSort_used', name: 'savedSort_name', tempo: 'savedSort_tempo' };
  // the panel's HTML from the last console context and the view: the title, the toolbar (more than 8 patterns), the
  // instrument chips, the line of what is shown, the scroll area with groups or one list, the note of unfit patterns
  function spParts() {
    const c = spCtx, open = spCards;
    const v = savedView(c.fitting, { ...spView, q: spQ }, c.song, { inst: instName, style: styleName });
    const list = items => (open ? `<div class="sp-cards">${items.map(x => c.spCard(x, v.toolbar)).join('')}</div>` : `<ul class="sp-list">${items.map(c.spRow).join('')}</ul>`);
    const next = open ? 'savedViewRows' : 'savedViewCards';
    const head = `<div class="sp-head"><button class="sp-toggle lbl" id="sp-toggle" aria-expanded="${!spHidden}" title="${esc(t('savedToggleTip'))}">${CHEVRON}<span>${esc(t('savedTitle', { n: c.fitting.length }))}</span></button><button class="btn small icon sp-view" id="sp-view" title="${esc(t(next))}" aria-label="${esc(t(next))}">${open ? ROWS : CARDS}</button></div>`;
    if (!v.toolbar) return { v, head, tools: '', body: c.fitting.length ? list(c.fitting) : '' };
    const opt = (val, cur, label) => `<option value="${esc(val)}"${val === cur ? ' selected' : ''}>${esc(label)}</option>`;
    const styles = v.styles.includes(spView.style) || spView.style === 'all' ? v.styles : [...v.styles, spView.style];
    const tools = `<div class="sp-tools"><input type="search" class="sb-search sp-search" data-sp-q value="${esc(spQ)}" placeholder="${esc(t('savedSearch', { n: v.total }))}" aria-label="${esc(t('savedSearchAria'))}" aria-keyshortcuts="P" title="${esc(t('savedSearchTip'))}" autocomplete="off" spellcheck="false">
      <button class="chip sp-fit" data-sp-fit aria-pressed="${spView.fit}" title="${esc(t('savedFitTip'))}">${esc(t('savedFit'))}</button>
      <label class="arr-sel"><span>${esc(t('savedStyle'))}</span><select data-sp-style data-no-knob>${opt('all', spView.style, t('savedStyleAll'))}${styles.map(id => opt(id, spView.style, styleName(id))).join('')}</select></label>
      <label class="arr-sel"><span>${esc(t('savedSort'))}</span><select data-sp-sort data-no-knob>${Object.keys(SP_SORT_LABEL).map(k => opt(k, spView.sort, t(SP_SORT_LABEL[k]))).join('')}</select></label></div>`;
    const parts = v.inst !== 'all' && !v.parts.includes(v.inst) ? [...v.parts, v.inst] : v.parts;
    const all = Object.values(v.counts).reduce((a, b) => a + b, 0);
    const chips = `<div class="chips sp-insts" role="group" aria-label="${esc(t('savedInsts'))}"><button class="chip small" data-sp-inst="all" aria-pressed="${v.inst === 'all'}">${esc(t('savedAll'))} <small>${all}</small></button>${parts.map(p => `<button class="chip small" data-sp-inst="${esc(p)}" aria-pressed="${v.inst === p}">${esc(instName(p))} <small>${v.counts[p] || 0}</small></button>`).join('')}</div>`;
    const sum = v.grouped ? '' : `<p class="muted small sp-sum" aria-live="polite">${esc([t('savedShown', { n: v.shown, total: v.total }), spQ.trim() ? `“${spQ.trim()}”` : '', v.inst !== 'all' ? instName(v.inst) : '', spView.fit ? t('savedFit').toLowerCase() : '', spView.style !== 'all' ? styleName(spView.style) : '', spView.sort !== 'saved' ? t(SP_SORT_LABEL[spView.sort]).toLowerCase() : ''].filter(Boolean).join(' · '))}</p>`;
    const inner = !v.shown ? `<p class="sp-none">${esc(t('savedNoMatch'))} <button class="btn small" data-sp-clear>${esc(t('savedClear'))}</button></p>`
      : v.grouped ? v.groups.map(g => `<section class="sp-group"><button class="sp-ghead" data-sp-group="${esc(g.inst)}" aria-expanded="${g.open}">${CHEVRON}<b>${esc(instName(g.inst))}</b> <small>${g.n}</small></button>${g.open ? `${list(g.items)}${g.n > SAVED_GROUP ? `<button class="btn small sp-all" data-sp-inst="${esc(g.inst)}">${esc(t('savedShowAll', { n: g.n }))}</button>` : ''}` : ''}</section>`).join('')
      : list(v.items);
    return { v, head, tools, body: `${chips}${sum}<div class="sp-scroll${open ? ' open' : ''}">${inner}</div>` };
  }
  function spPanelHtml() {
    const p = spParts();
    if (spHidden) return `<div class="steer-group arr sp hidden">${p.head}</div>`;
    return `<div class="steer-group arr sp${p.v.toolbar ? ' many' : ''}">${p.head}${p.tools}<div class="sp-body">${p.body}</div>${spCtx.note ? `<p class="muted small sp-note">${esc(spCtx.note)}</p>` : ''}</div>`;
  }
  // what had the focus inside the panel: a selector by its data attribute, and the caret of the search
  const SP_FOCUS = ['data-sp-q', 'data-sp-listen', 'data-sp-new', 'data-sp-replace', 'data-sp-target', 'data-sp-inst', 'data-sp-group', 'data-sp-fit', 'data-sp-style', 'data-sp-sort', 'data-sp-clear', 'id'];
  function spFocusOf(panel) {
    const a = document.activeElement;
    if (!panel || !a || !panel.contains(a)) return null;
    const at = SP_FOCUS.find(k => a.hasAttribute(k));
    if (!at) return null;
    const val = a.getAttribute(at);
    return { sel: at === 'id' ? `#${CSS.escape(val)}` : val ? `[${at}="${CSS.escape(val)}"]` : `[${at}]`, start: a.selectionStart ?? null, end: a.selectionEnd ?? null };
  }
  const themeKey = () => `${document.documentElement.dataset.ui || ''}|${document.documentElement.dataset.look || ''}`;
  // puts the panel in the slot: the old node when its HTML is the same, else a new one with the old drawings moved in
  function spMount(slot, old, html, focus) {
    if (!slot) return;
    let el = old;
    if (!old || html !== spHtml) {
      const tmp = document.createElement('div'); tmp.innerHTML = html; el = tmp.firstElementChild;
      if (old) spKeepDrawings(old, el);
    }
    spHtml = html;
    slot.replaceWith(el);
    spRestore(el, focus);
    spObserve(el);
  }
  // the drawings of the old panel go into the new one where the pattern, the size, the values and the theme are the same
  function spKeepDrawings(from, to) {
    const tk = themeKey(), byKey = new Map();
    from.querySelectorAll('canvas[data-sp-pv][data-painted]').forEach(cv => { if (cv.dataset.painted === tk) byKey.set(`${cv.dataset.spPv}|${cv.className}|${cv.dataset.spK}`, cv); });
    to.querySelectorAll('canvas[data-sp-pv]').forEach(cv => { const k = `${cv.dataset.spPv}|${cv.className}|${cv.dataset.spK}`, o = byKey.get(k); if (o) { byKey.delete(k); cv.replaceWith(o); } });
  }
  function spRestore(el, focus) {
    const area = el.querySelector('.sp-scroll');
    if (area && spScroll) area.scrollTop = spScroll;
    // (measured after the frame's layout, not forced here)
    if (area) requestAnimationFrame(() => spFade(area));
    if (!focus) return;
    const f = el.querySelector(focus.sel);
    if (!f) return;
    try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); }
    if (focus.start !== null && f.setSelectionRange) try { f.setSelectionRange(focus.start, focus.end ?? focus.start); } catch (e) {}
  }
  // the soft fade at the bottom says there is more below (D4)
  const spFade = area => { if (area) area.classList.toggle('more', area.scrollHeight - area.scrollTop - area.clientHeight > 4); };
  // the drawings are painted when they scroll into view (D4); a drawing's data is kept while the pattern does not change
  const spPvData = new Map();
  let spIo = null, spIoRoot = null;
  function spPaintOne(cv) {
    const c = spCtx, x = c && c.fitting.find(y => y.id === cv.dataset.spPv);
    if (!x) return;
    const k = `${x.id}|${JSON.stringify(x.pattern).length}|${cv.dataset.spK}`;
    if (!spPvData.has(k)) {
      if (spPvData.size > 600) spPvData.clear();
      const [chords, meter, mode] = (cv.dataset.spK || '').split('|');
      try { spPvData.set(k, previewOf(x.type, x.pattern, { chords: chords || undefined, meter: meter || '4/4', mode: mode || 'minor' })); } catch (e) { spPvData.set(k, null); }
    }
    const pv = spPvData.get(k);
    if (!pv) return;
    try { paintPreview(cv, pv, root); cv.dataset.painted = themeKey(); } catch (e) {}
  }
  function spObserve(panel) {
    const area = panel && panel.querySelector('.sp-scroll'), list = panel ? [...panel.querySelectorAll('canvas[data-sp-pv]:not([data-painted])')] : [];
    if (!area || typeof IntersectionObserver === 'undefined') { list.forEach(spPaintOne); return; }
    if (spIoRoot !== area) {
      if (spIo) spIo.disconnect();
      spIoRoot = area;
      spIo = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { spIo.unobserve(e.target); spPaintOne(e.target); } }), { root: area, rootMargin: '160px 0px' });
    }
    list.forEach(cv => spIo.observe(cv));
  }
  // the use counts changed (an add, a replace): the panel's patterns read again and its body drawn, not the console
  function spUsesChanged(pats) {
    if (!spCtx) return;
    const by = new Map(pats.map(x => [x.id, x]));
    spCtx.fitting = spCtx.fitting.map(x => by.get(x.id) || x);
    spRenderBody();
  }
  // a chip, a menu or the search draws only the panel's body again, not the console (D1)
  function spRenderBody({ top = false } = {}) {
    const el = root.querySelector('#radio-steer .sp'), body = el && el.querySelector('.sp-body');
    if (!el || !body || !spCtx) return;
    if (top) spScroll = 0;
    const p = spParts(), focus = spFocusOf(body);
    const tmp = document.createElement('div'); tmp.innerHTML = p.body;
    spKeepDrawings(body, tmp);
    body.replaceChildren(...tmp.childNodes);
    el.classList.toggle('many', p.v.toolbar);
    const fit = el.querySelector('[data-sp-fit]'); if (fit) fit.setAttribute('aria-pressed', spView.fit);
    spHtml = spPanelHtml();
    if (top) { const area = el.querySelector('.sp-scroll'); if (area) area.scrollTop = 0; }
    spRestore(el, focus);
    spObserve(el);
  }

  // a style the compilation invented for the song on air: the Invent trial's chip and hint, with Keep only
  // (radio-invented-style-chip D1, D2); the same in Now playing and in the STYLES block
  const compStyleOf = item => item && item.comp && item.comp.kind === 'invented' && item.comp.style && !recipes.some(r => r.id === item.comp.style.id) ? item.comp.style : null;
  const compChip = style => trialChip({ t, tx, esc, style, actions: 'keep', label: t('inventBadgeShort'), keepAttr: 'data-comp-keep-style' });
  const compHint = style => trialHint({ t, tx, esc, recipes, style, label: t('inventCompHint'), back: false });
  // what the card shows apart from the position within the bar: the same within a bar, unless the song, its plan, the
  // queue, the next song or a setting of the card changed (#82: the card was built again four times a second; between
  // bars only the position marks move, see movePos)
  let nowMemo = null;
  const nowSig = (item, rel) => [S, item, item.song, item.plan, item.plan && item.plan.extended, item.curves, item.comp, item.commands, item.commands && item.commands.length, item.bars, item.cut, S.stream[S.onAir + 1], (S.stream[S.onAir + 1] || {}).song, Math.floor(rel), prepText, detailsOpen, hoverD, S.paused, getLang(), voiceFiles(), artists().length];
  const sameSig = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  // the position marks of the card's curves moved in place (the line where the song is and the shade of the past)
  function movePos(box, item, rel) {
    if (item.plan) {
      const n = item.plan.plan.length, frac = rel / Math.max(1, n * 2 * item.plan.phrase), px = CPAD + Math.min(1, frac) * (CW - 2 * CPAD);
      for (const svg of box.querySelectorAll('svg.radio-curve')) {
        const ln = svg.querySelector('line.pos'), sh = svg.querySelector('rect.past-shade');
        if (ln) { ln.setAttribute('x1', px.toFixed(1)); ln.setAttribute('x2', px.toFixed(1)); }
        if (sh) sh.setAttribute('width', Math.max(0, px - CPAD).toFixed(1));
      }
    } else {
      const ln = box.querySelector('svg.radio-curve line.pos'), x = Math.min(160, Math.max(0, rel / Math.max(1, item.entry.bars) * 160));
      if (ln) { ln.setAttribute('x1', x); ln.setAttribute('x2', x); }
    }
  }
  function renderNow(cyc) {
    const box = root.querySelector('#radio-now');
    if (!box || dragging) return;
    const rt = root.querySelector('#radio-rec-time'); if (rt) rt.textContent = clockOf(recElapsed());
    renderSteer();
    paintExtend();
    if (!S) { nowMemo = null; box.innerHTML = `<div class="lbl">${esc(t('radioNow'))}</div><p class="muted">${esc(t('radioIdle'))}</p>`; return; }
    const item = S.stream[S.onAir], song = item.song, e = item.entry;
    // (paused: the bar it stopped on, the player's clock no longer runs)
    const rel = Math.max(0, (cyc ?? (S.paused !== undefined ? S.paused : player.now())) - item.start);
    // (the player's tick, four times a second: built again only when what the card shows changed, or a row of Coming
    // next is reached; other calls follow a change and build it again)
    const sig = nowSig(item, rel);
    if (cyc !== undefined && nowMemo && nowMemo.box === box && rel < nowMemo.until && sameSig(nowMemo.sig, sig)) { movePos(box, item, rel); return; }
    let acc = 0, sec = song.sections[0];
    for (const s of song.sections) { if (rel >= acc) sec = s; acc += s.bars; }
    const next = nextRows(song, scheduleOf(item), rel, 3);
    const nextSong = S.stream[S.onAir + 1];
    nowMemo = { box, sig, until: next.length ? next[0].at : Infinity };
    box.innerHTML = `<div class="lbl">${esc(t('radioNow'))} · ${esc(e.lead ? t('radioLeadShort') : t('radioSongN', { n: item.n + 1 }))}</div>
      ${item.comp ? `<div class="comp-tag"><span class="chip small">${esc(item.comp.start + item.comp.length - item.n <= 1 ? t('compNextOne') : t('compNext', { n: item.comp.start + item.comp.length - item.n }))}</span>${item.comp.kind === 'random' && !artists().some(a => a.name === item.comp.artist.name) ? `<button class="chip small" data-comp-keep title="${esc(t('diceKeepHint'))}">${esc(t('diceKeep'))} ${esc(item.comp.artist.name)}</button>` : ''}</div>${compStyleOf(item) ? `${compChip(compStyleOf(item))}${compHint(compStyleOf(item))}` : ''}` : ''}
      ${e.artist ? `<div class="radio-artist">${(() => { const a = artistOf(e.artist.id); return a ? `<img class="portrait tiny" src="${face(a)}" alt="">` : ''; })()}<span>${esc(e.artist.name)}</span>${e.artist.quirks && e.artist.quirks.length ? `<span class="muted small">· ${esc(e.artist.quirks.map(q => tx(QUIRKS[q] || { en: q })).join(', '))}</span>` : ''}</div>` : ''}
      ${onTrial(e) && !compStyleOf(item) ? `<div class="trial-tag"><span class="chip small" title="${esc(t('inventTrialSongTip'))}">${esc(t('inventTrialSong'))}</span></div>` : ''}
      <h3 class="radio-title">${esc(song.title)}</h3>
      <div class="radio-meta">${esc(e.key)} · ${e.bpm} BPM · ${esc(e.meter)}${e.shape ? ` · ${esc(t('shape_' + e.shape))}` : ''}</div>
      <div class="radio-profile-now" data-profile-now="${esc(profileOf(item))}" title="${esc(t('radioProfileNowTip'))}">${profileLine(item)}</div>
      <div class="radio-parts">${esc(e.lead ? t('radioLeadParts', { styles: opts.styles.map(styleName).join(', ') }) : partsText(e))}</div>
      ${item.plan ? curvePanel(item, rel, `${sec.name} · ${t('radioBar', { n: Math.floor(rel) + 1, total: item.bars })}${item.plan.extended ? ` · ${t('radioExtended', { t: secs(item.plan.extended * extendSeconds(item.plan)) })}` : ''}`) : `<div class="radio-pos">${e.lead ? '' : curve(e, rel)}<span>${esc(sec.name)} · ${esc(t('radioBar', { n: Math.floor(rel) + 1, total: item.bars }))}</span></div>`}
      <div class="lbl">${esc(t('radioComing'))}</div>
      <p class="hint muted small radio-prep"${prepText ? '' : ' hidden'}>${esc(prepText)}</p>
      <ul class="radio-next">${next.map(nextRow).join('') || `<li class="muted">${esc(t('radioNoChanges'))}</li>`}</ul>
      <div class="radio-after muted">${nextSong ? esc(t('radioAfter', { title: nextSong.song.title })) + (onTrial(nextSong.entry) ? ` · ${esc(t('inventTrialSong'))}` : '') : esc(t('radioPreparing'))}${nextSong && e.transition && !item.cut ? ` · ${esc(e.transition.kind === 'cut' ? t('radioNextTxCut') : t('radioNextTx', { kind: t(`tx:${e.transition.kind}`), bars: e.transition.bars }))}` : ''}</div>`;
  }

  // ---------- compilation setup (#49) ----------
  const GENRE_LIST = () => [...new Set(recipes.map(r => r.genre).filter(Boolean))].sort();
  function presetName(k) { if (PRESETS[k]) return t(`compP_${k}`); if (k === 'custom' || !userPresets()[k]) return t('compPresetCustom'); return k; }
  function setupPanel() {
    const tip = k => `title="${esc(t(k))}"`;
    const S0 = { ...SETUP_DEFAULT, ...opts.compSetup }, rg = { ...JSON.parse(JSON.stringify(SETUP_DEFAULT.ranges)), ...(S0.ranges || {}) }, mine = userPresets();
    // with "All" on, the single chips are off: a tap picks just that one
    const chips = (list, sel, attr, label) => list.map(x => `<button class="chip small" ${attr}="${esc(x)}" aria-pressed="${!!sel && sel.includes(x)}">${esc(label(x))}</button>`).join('');
    // one track with two handles: the low and the high end of the knob's range
    const knob = k => `<div class="comp-range" title="${esc(t({ chaos: 'tipChaos', energy: 'tipEnergy', complexity: 'tipComplexity', talk: 'tipTalk' }[k]))} · ${esc(t('compRangeTip'))}"><span class="lbl">${esc(t({ chaos: 'radioChaos', energy: 'radioEnergy', complexity: 'radioComplexity', talk: 'radioTalk' }[k]))}</span><span class="dual" style="--lo:${rg[k][0] * 100}%;--hi:${rg[k][1] * 100}%"><span class="dual-fill"></span><input type="range" min="0" max="1" step="0.05" value="${rg[k][0]}" data-comp-min="${k}" aria-label="${esc(t('compMin'))}" data-no-knob><input type="range" min="0" max="1" step="0.05" value="${rg[k][1]}" data-comp-max="${k}" aria-label="${esc(t('compMax'))}" data-no-knob></span><output>${rg[k][0]}–${rg[k][1]}</output></div>`;
    return `<div class="card comp-setup">
      <div class="comp-line"><label class="lbl" for="comp-preset">${esc(t('compPreset'))}</label><select id="comp-preset" data-no-knob>${Object.keys(PRESETS).map(k => `<option value="${k}"${opts.compPreset === k ? ' selected' : ''}>${esc(t(`compP_${k}`))}</option>`).join('')}${Object.keys(mine).map(k => `<option value="${esc(k)}"${opts.compPreset === k ? ' selected' : ''}>${esc(k)}</option>`).join('')}${opts.compPreset === 'custom' ? `<option value="custom" selected>${esc(t('compPresetCustom'))}</option>` : ''}</select>
        <input type="text" id="comp-name" maxlength="30" placeholder="${esc(t('compSaveAs'))}"><button class="btn small" id="comp-save">${esc(t('compSave'))}</button>${mine[opts.compPreset] ? `<button class="btn small danger" id="comp-del">${esc(t('compDelete'))}</button>` : ''}</div>
      <div class="comp-line"><span class="lbl">${esc(t('compMovement'))}</span><button class="chip small" data-comp-move="journey" aria-pressed="${S0.movement === 'journey'}" ${tip('compJourneyTip')}>${esc(t('compJourney'))}</button><button class="chip small" data-comp-move="free" aria-pressed="${S0.movement === 'free'}" ${tip('compFreeTip')}>${esc(t('compFree'))}</button></div>
      <div class="comp-line"><span class="lbl">${esc(t('compGenres'))}</span><button class="chip small" data-comp-all="genres" aria-pressed="${!S0.genres}">${esc(t('compAll'))}</button>${chips(GENRE_LIST(), S0.genres, 'data-comp-genre', g => t(`g:${g}`))}</div>
      <div class="comp-line"><span class="lbl">${esc(t('compArtists'))}</span><button class="chip small" data-comp-all="artists" aria-pressed="${!S0.artists}">${esc(t('compAll'))}</button>${chips(artists().map(a => a.id), S0.artists, 'data-comp-artist', id => (artists().find(a => a.id === id) || {}).name || id)}
        <button class="chip small" data-comp-random aria-pressed="${!!S0.randomArtists}" ${tip('compRandomTip')}>${DICE} ${esc(t('compRandomArtists'))}</button><button class="chip small" data-comp-invented aria-pressed="${S0.invented === true}" ${tip('compInventedTip')}>${INVENT} ${esc(t('compInvented'))}</button></div>
      <div class="comp-line" ${tip('matSourceTip')}><span class="lbl">${esc(t('matSource'))}</span>${SESSION_SOURCES.map(m => `<button class="chip small" data-material="${m}" aria-pressed="${opts.material === m}">${esc(t(`mat:${m}`))}</button>`).join('')}</div>
      ${opts.material === 'varied' ? `<p class="hint muted small">${esc(t('matVariedTip'))}</p>` : ''}
      <div class="comp-ranges">${['chaos', 'energy', 'complexity', 'talk'].map(knob).join('')}</div>
    </div>`;
  }
  function editSetup(fn) { const S0 = JSON.parse(JSON.stringify({ ...SETUP_DEFAULT, ...opts.compSetup })); fn(S0); opts.compSetup = S0; opts.compPreset = 'custom'; saveOpts(); render(); }
  const toggleIn = (list, all, x) => { const cur = list || []; const next = cur.includes(x) ? cur.filter(y => y !== x) : [...cur, x]; return next.length === all.length ? null : next.length ? next : cur; };

  // ---------- profile of the song on air and the Custom profile (radio-profiles D13, 4.6) ----------
  // "Live coder · full kick · fast · masks": the profile, and the growth shape of a Live coder song
  function profileLine(item) {
    const p = profileOf(item), sh = item.song && item.song.crescendo && item.song.crescendo.shape;
    const parts = [item.custom ? `${t('radioCustomProfile')} · ${t(`profile:${p}`)}` : t(`profile:${p}`)];
    if (sh && sh.opening) parts.push(t(`opening:${sh.opening}`), t(`pace:${sh.pace}`), t(`development:${sh.development}`));
    return `${item.custom ? SLIDERS : ''}<span>${esc(parts.join(' · '))}</span>`;
  }
  let customOpen = store.get('coding-misk-radio-custom-open', true) !== false;
  // split (#82, the natural song change): the console is drawn in a task of its own after the rest; meanwhile the old
  // console stays in place (no empty frame)
  function render({ split = false } = {}) {
    const on = !!S;
    const oldSteer = split ? root.querySelector('#radio-steer') : null;
    const paused = on && S.paused !== undefined, tip = k => `title="${esc(t(k))}"`;
    // a die: kind, tooltip key, optional visible label; the tooltip adds the seed of the last throw
    const die = (kind, key, label = '', k = '') => dieHtml({ t, esc, lastDice }, kind, key, label, k);
    // during a compilation a knob shows the song on air's value (#59), or the value held by hand with a lock
    const comp = opts.compilation !== 'off', onAirOpts = S && S.stream[S.onAir] && S.stream[S.onAir].base ? S.stream[S.onAir].base.opts : null;
    const knobValue = k => (comp && typeof opts.compLocks[k] !== 'number' && onAirOpts && typeof onAirOpts[k] === 'number' ? Math.round(onAirOpts[k] * 100) / 100 : opts[k]);
    const knobMark = k => !comp ? '' : typeof opts.compLocks[k] === 'number' ? `<button class="knob-lock" data-unlock="${k}" title="${esc(t('compKnobHeld'))}" aria-label="${esc(t('compKnobHeld'))}">${LOCK}</button>` : '';
    const slider = (k, label, help) => knobSlider(sc, k, label, help, { value: knobValue(k), mark: knobMark(k), fromComp: comp });
    root.innerHTML = `<p class="intro">${esc(t('introRadio'))}</p>
    <div class="radio-grid">
      <div class="card radio-ctrls">
        <div class="onair-bar ${on && !paused ? 'on' : ''}" ${tip('tipOnAir')}><span>${esc(paused ? t('radioPaused') : on ? t('radioOnAir') : t('radioOffAir'))}</span></div>
        <div class="radio-onair">
          <button class="btn primary radio-start" id="radio-start" aria-pressed="${on}" ${tip(on ? 'tipStop' : 'tipStart')}>${on ? '■ ' + esc(t('radioStop')) : '▶ ' + esc(t('radioStart'))}</button>
          <button class="btn" id="radio-pause" ${on ? '' : 'disabled'} ${tip(paused ? 'tipResume' : 'tipPause')}>${paused ? '▶ ' + esc(t('radioResume')) : '❚❚ ' + esc(t('radioPause'))}</button>
          <button class="btn" id="radio-skip" ${on && !paused && !S.skipping ? '' : 'disabled'}${on && S.skipping ? ' aria-busy="true"' : ''} ${tip('tipSkip')}>⏭ ${esc(t(on && S.skipping ? 'radioSkipping' : 'radioSkip'))}</button>
          <button class="btn" id="radio-pl" ${on && !S.limit ? '' : 'disabled'} ${tip('tipSessionPl')}>${esc(t('addToPlaylist'))}</button>
          <span class="radio-vol" ${tip('volumeAll')}><button class="btn icon" id="radio-mute" aria-label="${esc(t('mute'))}"></button><input type="range" id="radio-volume" min="0" max="100" step="1" value="${player.volume().volume}" aria-label="${esc(t('volumeAll'))}"><output id="radio-volume-out"></output></span>
        </div>
        <div class="radio-out">
          <span class="out-combo"><button class="btn" id="radio-export" data-export="radio" aria-expanded="false" ${tip('tipRadioExport')}>${esc(t('exportWav'))}</button><button class="btn rec-btn" id="radio-rec" aria-pressed="${!!recS}" ${tip(recS ? 'tipRecStop' : 'tipRec')}>${recS ? `■ ${esc(t('recStop'))} <span class="rec-time" id="radio-rec-time">${clockOf(recElapsed())}</span>` : `● ${esc(t('recStart'))}`}</button>${player.outKindButton()}<button class="combo-gear" id="radio-video-set" aria-label="${esc(t('tipVideoSettings'))}" ${tip('tipVideoSettings')}>${GEAR}</button></span>

        </div>
        <div class="comp-row"><span class="out-combo"><button class="btn comp-btn" id="radio-comp" aria-pressed="${opts.compilation !== 'off'}" title="${esc(t('compTip'))} · ${esc(opts.compilation === 'song' ? t('compEverySong') : opts.compilation === 'some' ? t('compEverySome') : t('compOff'))}">${esc(t('compBtn'))}<span class="comp-lamps" aria-hidden="true"><i class="${opts.compilation === 'song' ? 'on' : ''}"></i><b>1</b><i class="${opts.compilation === 'some' ? 'on' : ''}"></i><b>2–4</b></span></button>
          <button class="comp-setup-btn" id="radio-comp-setup" aria-expanded="${compOpen}" aria-label="${esc(t('compSetup'))}" ${tip('compSetupTip')}>${GEAR}<span class="comp-lcd">${esc(presetName(opts.compPreset))}</span></button></span></div>
        ${compOpen ? setupPanel() : ''}
        ${(() => {
          // the compilation sets artist and styles aside; the invented style's chip is live, so it sits outside the dimming
          const aside = h => (comp ? `<div class="set-aside">${h}</div>` : h), cs = compStyleOf(S && S.stream[S.onAir]);
          const hintP = comp ? `<p class="hint muted small">${esc(t('compAside'))}</p>` : '';
          const artistCtrl = `<div class="ctrl" ${tip('tipArtist')}><span class="lbl">${esc(t('radioArtist'))} ${die('artist', 'diceArtist')}</span>
          ${artistChips({ state: opts, t, tx, esc, artists: artists(), face })}
        </div>`;
          const stylesLbl = `<span class="lbl">${esc(t('radioStyles'))} ${die('styles', 'diceStyles', t('diceStylesLbl'))} ${die('genre', 'diceGenre', t('diceGenreLbl'))} ${die('invent', 'diceInvent', t('diceInventLbl'))}</span>`;
          const chips = styleChips({ state: opts, recipes, t, tx, esc });
          if (!cs) return `<div class="${comp ? 'set-aside' : ''}">${hintP}${artistCtrl}<div class="ctrl" ${tip('tipStyles')}>${stylesLbl}${chips}</div></div>`;
          return `<div class="${comp ? 'set-aside' : ''}">${hintP}${artistCtrl}</div><div class="ctrl" ${tip('tipStyles')}>${aside(stylesLbl)}<div class="comp-style-live">${compChip(cs)}${compHint(cs)}</div>${aside(chips)}</div>`;
        })()}
        ${diceRow(sc)}
        ${comp ? `<p class="hint muted small comp-knobs-hint">${esc(t('compKnobAutoTip'))}</p>` : ''}<div class="ctrls three">${slider('chaos', 'radioChaos', 'tipChaos')}${slider('energy', 'radioEnergy', 'tipEnergy')}${slider('complexity', 'radioComplexity', 'tipComplexity')}</div>
        ${materialSeg(sc, { showDefault: true })}
        <div class="radio-how">
          <label class="ctrl" ${tip('tipTransition')}><span class="lbl">${esc(t('radioTransition'))}</span><select id="radio-transition" data-no-knob>${['artist', ...TRANSITION_KINDS].map(k => `<option value="${k}"${opts.transition === k ? ' selected' : ''}>${esc(t(k === 'artist' ? 'byArtist' : `tx:${k}`))}</option>`).join('')}</select></label>
          <label class="ctrl" ${tip('tipHarmony')}><span class="lbl">${esc(t('radioHarmony'))}</span><select id="radio-harmony" data-no-knob>${['artist', ...HARMONY_MODES].map(k => `<option value="${k}"${opts.harmony === k ? ' selected' : ''}>${esc(t(k === 'artist' ? 'byArtist' : `harmony:${k}`))}</option>`).join('')}</select></label>
          ${profileSelect(sc)}
          <label class="ctrl" ${tip('radioIncomingTip')}><span class="lbl">${esc(t('radioIncoming'))}</span><select id="radio-incoming" data-no-knob>${['profile', 'hidden', 'visible'].map(k => `<option value="${k}"${opts.incoming === k ? ' selected' : ''}>${esc(t(`incoming:${k}`))}</option>`).join('')}</select></label>
        </div>
        <div class="radio-length">${lengthChips(sc)}<p class="hint muted small" id="radio-length-line">${esc(t(hasLength(opts.length) ? 'radioLenOn' : 'radioLenOff'))}</p>${ctl.freed ? `<p class="hint muted small" id="radio-target-off">${esc(t('radioTargetOff'))}</p>` : ''}</div>
        ${voicesGroup(sc, { talkKnob: slider('talk', 'radioTalk', 'tipTalk'), vfold })}
        ${opts.profile === 'custom' ? customPanel(sc, { open: customOpen, ...radioCustomC() }) : ''}
        <p class="hint muted">${esc(t('radioNextHint'))}</p>
        <div class="radio-seed">
          <div class="ctrl grow" ${tip('tipSeed')}><label class="lbl" for="radio-seed">${esc(t('radioSeed'))}</label><input id="radio-seed" type="text" maxlength="40" autocomplete="off" placeholder="${esc(t('radioSeedAuto'))}" value="${esc(on ? S.recipe.seed : seedField)}" ${on ? 'readonly' : ''}></div>
          <button class="btn" id="radio-replay" ${on || history.length ? '' : 'disabled'} ${tip('tipReplay')}>↺ ${esc(t('radioReplay'))}</button>
          <button class="btn" id="radio-rec-start" ${on || history.length ? '' : 'disabled'} ${tip('tipRecFromStart')}>● ${esc(t('recFromStart'))}</button>
        </div>
        <div class="actions">
          <button class="btn" id="radio-save" ${on ? '' : 'disabled'} ${tip('tipSave')}>${esc(t('radioSave'))}</button>
          <button class="btn" id="radio-open" ${on ? '' : 'disabled'} ${tip('tipOpen')}>${esc(t('radioOpen'))}</button>
        </div>
      </div>
      <div class="card radio-now" id="radio-now" aria-live="polite"></div>
    </div>
    <div class="card radio-steer" id="radio-steer"></div>
    <div class="card radio-history">
      <div class="lbl">${esc(t('radioHistory'))}</div>
      ${history.length ? `<ol class="radio-hist">${history.map((h, i) => `<li><span class="when">${esc(new Date(h.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}</span> <strong>${esc(h.title)}</strong> <span class="muted">${esc(h.styles.map(styleName).join(' + '))} · ${esc(t('radioSeed'))} ${esc(h.seed)}</span>
        <span class="hist-actions"><button class="btn small" data-hist-save="${i}" ${tip('tipSave')}>${esc(t('radioSave'))}</button><button class="btn small" data-hist-open="${i}" ${tip('tipOpen')}>${esc(t('radioOpen'))}</button>${h.recipe ? `<button class="btn small" data-hist-pl="${i}" ${tip('tipSessionPl')}>${esc(t('addToPlaylist'))}</button>` : ''}</span></li>`).join('')}</ol>` : `<p class="muted">${esc(t('radioNoHistory'))}</p>`}
    </div>`;
    steerKey = '';
    renderNow();
    const fresh = oldSteer && root.querySelector('#radio-steer');
    if (fresh && oldSteer.dataset.k !== undefined) { fresh.replaceWith(oldSteer); const mine = S; setTimeout(() => { if (S === mine && root.contains(oldSteer)) renderSteer(true); }, 0); }
    else renderSteer(true);
    player.renderVolume();
  }

  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'radio-start') return S ? stop() : start();
    if (b.id === 'radio-skip') return skip();
    if (b.id === 'radio-rec') return recS ? stopRec() : startRec(player.outKind() === 'video');
    if (b.id === 'radio-video-set') return player.openVideoSettings();
    if (b.id === 'radio-export') {
      // a second tap cancels an export running; otherwise the range panel opens and closes
      if (player.exporting()) return player.exportRadio(null);
      const old = root.querySelector('.radio-export-menu'); if (old) { old.remove(); b.setAttribute('aria-expanded', 'false'); return; }
      const r = { kind: 'songs', n: 3, minutes: 60, ...(store.get('coding-misk-radio-export', {}) || {}) }, on = !!S;
      if (r.kind === 'now' && !on) r.kind = 'songs';
      const radioOpt = (k, label) => `<label class="rx-opt"><input type="radio" name="rx-kind" value="${k}"${r.kind === k ? ' checked' : ''}${k === 'now' && !on ? ' disabled' : ''}> ${label}</label>`;
      b.closest('.out-combo').insertAdjacentHTML('afterend', `<div class="radio-export-menu card" role="dialog" aria-label="${esc(t('radioExportTitle'))}">
        <span class="lbl">${esc(t('radioExportTitle'))}</span>
        ${radioOpt('now', esc(on ? t('rxNow', { n: S.stream[S.onAir].n + 1 }) : t('rxNowOff')))}
        ${radioOpt('this', esc(on ? t('rxThis', { title: S.stream[S.onAir].song.title }) : t('rxThisOff')))}
        ${radioOpt('songs', `${esc(t('rxNext'))} <input type="number" data-rx="n" min="1" max="200" value="${r.n}" aria-label="${esc(t('rxNextN'))}"> ${esc(t('rxSongs'))}`)}
        ${radioOpt('minutes', `${esc(t('rxLength'))} <input type="number" data-rx="minutes" min="1" max="600" value="${r.minutes}" aria-label="${esc(t('rxMinutes'))}"> ${esc(t('rxMin'))} <span class="rx-exact" title="${esc(t('rxExactTip'))}"><input type="checkbox" data-rx="exact"${r.exact !== false ? ' checked' : ''}> ${esc(t('rxExact'))}</span>`)}
        ${radioOpt('clip', `${esc(t('rxClip'))} <input type="number" data-rx="seconds" min="5" max="600" value="${r.seconds || 30}" aria-label="${esc(t('rxSeconds'))}"> ${esc(t('rxSec'))} ${[15, 30, 60].map(n => `<button class="chip small" type="button" data-rx-sec="${n}">${n}</button>`).join('')}`)}
        <p class="hint muted">${esc(on ? t('rxHintOn') : t('rxHintOff'))}</p>
        <div class="actions"><button class="btn primary" data-rx-go>${esc(t('exportWav'))}</button></div></div>`);
      b.setAttribute('aria-expanded', 'true');
      return;
    }
    if (b.dataset.rxSec) { const m = b.closest('.radio-export-menu'); m.querySelector('[data-rx="seconds"]').value = b.dataset.rxSec; m.querySelector('input[value="clip"]').checked = true; return; }
    if (b.dataset.rxGo !== undefined) {
      const m = b.closest('.radio-export-menu'), kind = (m.querySelector('input[name="rx-kind"]:checked') || {}).value || 'songs';
      const range = { kind, n: +m.querySelector('[data-rx="n"]').value || 3, minutes: +m.querySelector('[data-rx="minutes"]').value || 60, exact: m.querySelector('[data-rx="exact"]').checked, seconds: +m.querySelector('[data-rx="seconds"]').value || 30 };
      store.set('coding-misk-radio-export', range);
      m.remove(); const eb = root.querySelector('#radio-export'); if (eb) eb.setAttribute('aria-expanded', 'false');
      // "This song" (#76): the song on air from its start to its end, as the next one song
      return player.exportRadio(kind === 'this' ? { ...range, kind: 'songs', n: 1 } : range);
    }
    if (b.id === 'radio-rec-start') return recordFromStart();
    if (b.id === 'radio-mute') return player.toggleMute();
    if (b.id === 'radio-pause') return S && S.paused !== undefined ? resume() : pause();
    if (b.id === 'radio-replay') {
      // replay the session on air from its first song, or the session of the latest song heard
      const recipe = S ? clone(S.recipe) : history[0] && history[0].recipe && clone(history[0].recipe);
      if (recipe) start({ recipe });
      return;
    }
    if (b.id === 'radio-save' && S) return player.saveSong(songOut(S.stream[S.onAir]));
    if (b.id === 'radio-open' && S) { const sg = songOut(S.stream[S.onAir]); stop(); return player.openSong(sg); }
    if (b.dataset.histSave) return player.saveSong(history[+b.dataset.histSave].song);
    if (b.dataset.histOpen) { const sg = history[+b.dataset.histOpen].song; stop(); return player.openSong(sg); }
    // the song controls (new-song-panel D2): the shared rules; the radio draws again, tells what applies from the next
    // song, and redraws when a style ends a compilation
    { const wasComp = opts.compilation !== 'off', r = songControlEvent(ctl, b, 'click');
      if (r) { if (r.render || (wasComp && opts.compilation === 'off')) render(); if (S && (r.keys.includes('voice') || r.keys.includes('voices'))) toast(t('vinstNextOnly')); if (S && r.keys.includes('material')) toast(t('matNext', { m: t(`matShort:${opts.material}`) })); if (S && r.keys.includes('length')) toast(t(S.stream.length > S.onAir + 1 ? 'radioLenQueued' : 'radioLenNext')); return; } }
    if (b.id === 'radio-comp') { opts.compilation = opts.compilation === 'off' ? 'song' : opts.compilation === 'song' ? 'some' : 'off'; saveOpts(); return render(); }
    if (b.id === 'radio-comp-setup') { compOpen = !compOpen; return render(); }
    if (b.dataset.compMove) return editSetup(S0 => { S0.movement = b.dataset.compMove; });
    if (b.dataset.compAll) return editSetup(S0 => { S0[b.dataset.compAll] = null; });
    if (b.dataset.compGenre) return editSetup(S0 => { S0.genres = toggleIn(S0.genres, GENRE_LIST(), b.dataset.compGenre); });
    if (b.dataset.compArtist) return editSetup(S0 => { S0.artists = toggleIn(S0.artists, artists().map(a => a.id), b.dataset.compArtist); });
    if (b.dataset.compRandom !== undefined) return editSetup(S0 => { S0.randomArtists = !S0.randomArtists; });
    // invented styles in the compilation (invented-styles D11, phase 2): off by default
    if (b.dataset.compInvented !== undefined) return editSetup(S0 => { S0.invented = S0.invented !== true; });
    // (Keep acts on pointerdown, see below; a click with no pointer, from the keyboard, does the same)
    if (b.dataset.compKeepStyle !== undefined) { if (e.detail === 0) keepCompStyle(); return; }
    if (b.id === 'comp-save') { const name = (root.querySelector('#comp-name').value || '').trim(); if (!name || PRESETS[name]) { toast(t('compNameBad')); return; } const all = userPresets(); all[name] = JSON.parse(JSON.stringify(opts.compSetup)); store.set('coding-misk-comp-presets', all); opts.compPreset = name; saveOpts(); render(); return toast(t('compSaved', { name })); }
    if (b.id === 'comp-del') { const all = userPresets(); delete all[opts.compPreset]; store.set('coding-misk-comp-presets', all); opts.compPreset = 'custom'; saveOpts(); return render(); }
    if (b.dataset.compKeep !== undefined && S) { const it = S.stream[S.onAir]; if (it.comp && it.comp.artist) { keepArtist(it.comp.artist); toast(t('diceKept')); renderNow(); } return; }
    if (b.dataset.varyPart) { varyPart = b.dataset.varyPart; return renderSteer(true); }
    if (b.dataset.svApply !== undefined) return voiceApply();
    if (b.dataset.svSay) { sv.line = (root.querySelector('[data-sv-line]') || { value: sv.line }).value; return sayLine(b.dataset.svSay); }
    if (b.dataset.cmd === 'riser') return command({ kind: 'riser', bars: riserForm.bars === 'auto' ? 'auto' : +riserForm.bars, dir: riserForm.dir, sound: riserForm.sound });
    // ("+" and "−" of an instrument: a pending change, prepared ahead, console-add-ahead D1)
    if (b.dataset.inst && (b.dataset.cmd === 'more' || b.dataset.cmd === 'less')) return pend(b.dataset.cmd, b.dataset.inst);
    if (b.dataset.pendCancel) { const k = b.dataset.pendCancel.indexOf(':'); return cancelPend(+b.dataset.pendCancel.slice(0, k), b.dataset.pendCancel.slice(k + 1)); }
    if (b.dataset.cmd) return command({ kind: b.dataset.cmd, ...(b.dataset.type ? { type: b.dataset.type } : {}), ...(b.dataset.part ? { type: b.dataset.part } : {}), ...(b.dataset.inst ? { part: b.dataset.inst } : {}), ...(b.dataset.target ? { target: b.dataset.target } : {}), ...(b.dataset.treatment ? { treatment: b.dataset.treatment } : {}), ...(b.dataset.chords && b.dataset.chords !== 'auto' ? { chords: b.dataset.chords } : {}), ...(b.dataset.to && b.dataset.to !== 'auto' ? { to: b.dataset.to } : {}) });
    // the lock of an instrument (radio-arrangement D12): closed opens, open or half locks every track of it
    // Add a saved pattern (D9): fold or open the panel, listen, add as a new track or in place of a playing one
    if (b.id === 'sp-toggle') { spHidden = !spHidden; spScroll = 0; try { store.set('coding-misk-radio-saved-hidden', spHidden); } catch (err) {} return renderSteer(true); }
    if (b.id === 'sp-view') { spCards = !spCards; spScroll = 0; try { store.set('coding-misk-radio-saved-open', spCards); } catch (err) {} return renderSteer(true); }
    // the panel among many (saved-patterns-list): instrument chips and "Show all", Fit this song, groups, clear filters
    if (b.dataset.spInst) { const all = b.classList.contains('sp-all'); spView.inst = b.dataset.spInst; spSaveView(); spRenderBody({ top: true }); if (all) { const f = root.querySelector(`#radio-steer .sp-insts [data-sp-inst="${CSS.escape(spView.inst)}"]`); if (f) f.focus(); } return; }
    if (b.dataset.spFit !== undefined) { spView.fit = !spView.fit; spSaveView(); return spRenderBody({ top: true }); }
    if (b.dataset.spGroup) { const g = b.dataset.spGroup; spView.closed = spView.closed.includes(g) ? spView.closed.filter(x => x !== g) : [...spView.closed, g]; spSaveView(); return spRenderBody(); }
    if (b.dataset.spClear !== undefined) { spQ = ''; spView = { ...spView, inst: 'all', fit: false, style: 'all' }; spScroll = 0; spSaveView(); renderSteer(true); const q = root.querySelector('#radio-steer [data-sp-q]'); if (q) q.focus(); return; }
    if (b.dataset.spListen || b.dataset.spNew || b.dataset.spReplace) {
      const id = b.dataset.spListen || b.dataset.spNew || b.dataset.spReplace, x = userPatterns().find(y => y.id === id), it = S && S.stream[S.onAir];
      if (!x || !it || !it.plan) return;
      const item = JSON.parse(JSON.stringify(x));
      if (b.dataset.spListen) {
        let a = 0, sc = it.song.sections[0]; const rel = relNow();
        for (const y of it.song.sections) { if (rel >= a) sc = y; a += y.bars; }
        if (player.preview) player.preview.toggle(item, { key: sc.key, chords: sc.chords, bpm: sc.bpm || it.entry.bpm, meter: sc.meter || it.entry.meter, n: it.n });
        return renderSteer(true);
      }
      // the command carries the pattern without the console's counters, so a replay is as before; a queued add or
      // replace counts as one use (saved-patterns-list D5)
      delete item.created; delete item.uses; delete item.lastUsed;
      const sel = b.dataset.spNew ? null : root.querySelector(`[data-sp-target="${CSS.escape(id)}"]`);
      // (a new track waits with the "+" and "−" of its boundary and enters with them, #82)
      // (one redraw: the badge or the queued replace is drawn by the press; the use count then redraws the panel's body)
      const ok = b.dataset.spNew ? pendPattern(item) : command({ kind: 'pattern', mode: 'replace', target: sel ? sel.value : spTarget[id], item });
      if (ok) { onPatternUsed(id); renderSteer(); }
      return ok;
    }
    // (a lock waits for its boundary with the "+" and "−" pressed for it, console-add-ahead D8)
    if (b.dataset.lockPart) return pendLock(`p.${b.dataset.lockPart}`, b.dataset.state === 'closed' ? 'unlock-part' : 'lock-part', { part: b.dataset.lockPart });
    if (b.dataset.cancel) return cancel(+b.dataset.cancel);
    if (b.dataset.svKeep !== undefined) { const x = typedRows(S && S.stream[S.onAir])[+b.dataset.svKeep]; if (x) { saveTyped(x); renderSteer(true); } return; }
    if (b.id === 'steer-scope') { opts.scope = opts.scope === 'session' ? 'song' : 'session'; saveOpts(); return renderSteer(true); }
    if (b.dataset.mixMute) return command({ kind: b.getAttribute('aria-pressed') === 'true' ? 'unmute' : 'mute', track: b.dataset.mixMute });
    if (b.dataset.mixLock) { const item = S && S.stream[S.onAir]; return pendLock(`t.${b.dataset.mixLock}`, item && lockedIds(item.plan).includes(b.dataset.mixLock) ? 'unlock' : 'lock', { track: b.dataset.mixLock }); }
    if (b.dataset.mixInst) return command({ kind: 'instrument', track: b.dataset.mixInst });
    // a session into a playlist (#38): a small menu next to the button
    if (b.id === 'radio-pl' || b.dataset.histPl !== undefined) {
      const old = root.querySelector('.radio-pl-menu'); if (old) { const same = old.previousElementSibling === b; old.remove(); if (same) return; }
      const h = b.dataset.histPl !== undefined ? history[+b.dataset.histPl] : null;
      const item = h ? sessionItem(h.recipe, h.n + 1, h.recipe.lead ? h.recipe.lead.song.title : h.title) : (S && sessionItem(S.recipe, S.onAir + 1, S.stream[0].song.title));
      if (!item) return;
      pendingSession = item;
      b.insertAdjacentHTML('afterend', `<span class="radio-pl-menu"><select data-pl-pick aria-label="${esc(t('addToPlaylist'))}" data-no-knob>${player.playlists().map(l => `<option value="${esc(l.id)}">${esc(l.name)}</option>`).join('')}<option value="">${esc(t('newPlaylist'))}…</option></select><button class="btn small primary" data-pl-ok>${esc(t('plAdd'))}</button></span>`);
      return;
    }
    if (b.dataset.plOk !== undefined) { const sel = b.parentNode.querySelector('select'); if (pendingSession) player.addSession(sel.value || null, pendingSession); pendingSession = null; b.parentNode.remove(); return; }
    if (b.dataset.unlock) { delete opts.compLocks[b.dataset.unlock]; saveOpts(); render(); return toast(t('compKnobBack')); }
    if (b.dataset.curveReset) return command({ kind: 'curve-reset', curve: b.dataset.curveReset });
    if (b.id === 'custom-toggle') { customOpen = !customOpen; try { store.set('coding-misk-radio-custom-open', customOpen); } catch (err) {} return render(); }
    if (b.id === 'curves-toggle') { detailsOpen = !detailsOpen; try { store.set('coding-misk-radio-details', detailsOpen); } catch (err) {} return renderNow(); }
  });
  // dragging a handle of a curve: the square follows the pointer, the values box shows the part, the command is
  // queued on release
  const onAir = () => S && S.stream[S.onAir];
  // Keep for a style the compilation invented: on pointer down, because Now playing is redrawn about every 250 ms and a
  // click (down and up on the same button) is lost when the button is rebuilt between the two (radio-invented-style-chip D4)
  function keepCompStyle() {
    const style = compStyleOf(S && S.stream[S.onAir]);
    if (!style || !keepStyle) return;
    keepStyle(style); toast(t('inventKept')); render();
  }
  root.addEventListener('pointerdown', e => {
    const kb = e.target.closest && e.target.closest('[data-comp-keep-style]');
    if (kb && e.button === 0) { e.preventDefault(); return keepCompStyle(); }
    const hnd = e.target.closest('rect.handle'); if (!hnd || !S) return;
    const svg = hnd.closest('svg');
    dragging = { d: +hnd.dataset.d, curve: hnd.dataset.curve, hnd, svg, value: null };
    hnd.setPointerCapture(e.pointerId); e.preventDefault();
  });
  root.addEventListener('pointermove', e => {
    if (!dragging) {
      // hover (mouse only): a line on the part under the pointer in every curve, and its values
      if (e.pointerType !== 'mouse') return;
      const svg = e.target.closest && e.target.closest('.curves svg.radio-curve');
      const d = svg ? partAt(svg, e.clientX) : null;
      if (d !== hoverD) { hoverD = d; renderNow(); }
      showTip(onAir(), d, e.clientX, e.clientY);
      return;
    }
    const { svg, hnd } = dragging, r = svg.getBoundingClientRect(), h = +svg.dataset.h, top = +svg.dataset.top, bot = +svg.dataset.bot, sz = +svg.dataset.sz;
    const y = (e.clientY - r.top) / r.height * h, v = Math.max(0, Math.min(1, (h - bot - y) / (h - top - bot)));
    // density snaps to a count of tracks (at least one)
    const max = +svg.dataset.max || 0;
    dragging.value = max ? Math.max(1, Math.round(v * max)) : Math.round(v * 20) / 20;
    const nv = max ? dragging.value / max : dragging.value, cy = top + (1 - nv) * (h - top - bot);
    hnd.setAttribute('y', (cy - sz / 2).toFixed(1)); hnd.classList.add('set');
    showTip(onAir(), dragging.d, e.clientX, e.clientY, { curve: dragging.curve || 'energy', value: dragging.value });
    if (dragging.curve) { const o = svg.closest('.radio-lane').querySelector('output'); if (o) o.textContent = max ? t('curveOf', { n: dragging.value, max }) : Math.round(dragging.value * 100); return; }
    const line = svg.querySelector('polyline.line'), pts = line.getAttribute('points').split(' ');
    pts[dragging.d] = `${pts[dragging.d].split(',')[0]},${cy.toFixed(1)}`; line.setAttribute('points', pts.join(' '));
  });
  root.addEventListener('pointerleave', () => { if (hoverD !== null && !dragging) { hoverD = null; tipBox.hidden = true; renderNow(); } });
  const endDrag = () => { if (!dragging) return; const { d, value, curve } = dragging; dragging = null; tipBox.hidden = true; if (value !== null) command({ kind: 'curve', d, value, ...(curve ? { curve } : {}) }); else renderNow(); };
  root.addEventListener('pointerup', endDrag);
  root.addEventListener('pointercancel', endDrag);
  // shortcuts while the Radio tab is open and the radio plays (not while typing in a field)
  // (Enter in the line field: Say now)
  root.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches && e.target.matches('[data-sv-line]')) { e.preventDefault(); sv.line = e.target.value; sayLine('now'); } });
  // the panel's search (saved-patterns-list): Escape clears it, a second Escape leaves it; the down arrow goes to the
  // first pattern's listen button
  root.addEventListener('keydown', e => {
    if (!e.target.matches || !e.target.matches('[data-sp-q]')) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (e.target.value) { e.target.value = ''; spQ = ''; spRenderBody({ top: true }); } else e.target.blur(); return; }
    if (e.key === 'ArrowDown') { const f = root.querySelector('#radio-steer .sp-scroll [data-sp-listen]:not([disabled])') || root.querySelector('#radio-steer .sp-scroll button:not([disabled])'); if (f) { e.preventDefault(); f.focus(); } }
  });
  root.addEventListener('scroll', e => { if (e.target.classList && e.target.classList.contains('sp-scroll')) { spScroll = e.target.scrollTop; spFade(e.target); } }, true);
  document.addEventListener('keydown', e => {
    if (root.hidden || !S || e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input, select, textarea, [contenteditable], strudel-editor, .cm-editor')) return;
    // digits 1 to 8: + of the instruments in the console's order; with Shift: − (by the key's position, any layout)
    const digit = /^Digit([1-8])$/.exec(e.code || '');
    if (digit) {
      const boxes = [...root.querySelectorAll('#radio-steer .arr-inst')], box = boxes[+digit[1] - 1];
      if (!box) return;
      e.preventDefault();
      const b = box.querySelector(`[data-cmd="${e.shiftKey ? 'less' : 'more'}"]`);
      if (b && !b.disabled) b.click();
      return;
    }
    // P: the search of the saved patterns (saved-patterns-list), when the panel shows it
    // on a hidden panel it shows the panel first; without a search (8 patterns or fewer) the focus goes to the chevron
    if (e.key === 'p' || e.key === 'P') {
      if (spHidden && root.querySelector('#radio-steer #sp-toggle')) { spHidden = false; spScroll = 0; try { store.set('coding-misk-radio-saved-hidden', false); } catch (err) {} renderSteer(true); }
      const q = root.querySelector('#radio-steer [data-sp-q]') || root.querySelector('#radio-steer #sp-toggle');
      if (q) { e.preventDefault(); q.focus(); if (q.select) q.select(); }
      return;
    }
    const kind = Object.keys(KEYS_OF).find(k => KEYS_OF[k] === e.key);
    if (kind === 'extend' && e.repeat) return;
    if (!kind) return;
    e.preventDefault();
    const b = root.querySelector(`[data-cmd="${kind}"]`);
    if (b && !b.disabled) b.click();
  });
  root.addEventListener('change', e => {
    if (e.target.dataset.spTarget) { spTarget[e.target.dataset.spTarget] = e.target.value; return renderSteer(true); }
    if (e.target.dataset.spStyle !== undefined) { spView.style = e.target.value; spSaveView(); return spRenderBody({ top: true }); }
    if (e.target.dataset.spSort !== undefined) { spView.sort = e.target.value; spSaveView(); return spRenderBody({ top: true }); }
    if (e.target.dataset.voicingTreat !== undefined) { voicingTreat = e.target.value; return renderSteer(true); }
    if (e.target.dataset.harmChords !== undefined) { harmChords = e.target.value; return renderSteer(true); }
    if (e.target.dataset.harmKey !== undefined) { harmKey = e.target.value; return renderSteer(true); }
    if (e.target.dataset.varyTarget !== undefined) { varyTarget = e.target.value; return renderSteer(true); }
    if (e.target.dataset.riser) { riserForm[e.target.dataset.riser] = e.target.value; return renderSteer(true); }
    if (e.target.dataset.mixVol) command({ kind: 'volume', track: e.target.dataset.mixVol, value: +e.target.value });
    if (e.target.dataset.opt && opts.compilation !== 'off') render();
    if (e.target.id === 'radio-transition') { opts.transition = e.target.value; saveOpts(); }
    if (e.target.id === 'comp-preset') { const k = e.target.value, src = PRESETS[k] || userPresets()[k]; if (src) { opts.compSetup = JSON.parse(JSON.stringify(src)); opts.compPreset = k; saveOpts(); render(); } }
    if (e.target.dataset.compMin || e.target.dataset.compMax) { const k = e.target.dataset.compMin || e.target.dataset.compMax, lo = e.target.dataset.compMin ? +e.target.value : null, hi = e.target.dataset.compMax ? +e.target.value : null; editSetup(S0 => { const r = (S0.ranges && S0.ranges[k]) ? S0.ranges[k].slice() : SENSIBLE[k].slice(); if (lo !== null) r[0] = Math.min(lo, r[1]); if (hi !== null) r[1] = Math.max(hi, r[0]); S0.ranges = { ...(S0.ranges || {}), [k]: r }; }); }
    if (e.target.id === 'radio-harmony') { opts.harmony = e.target.value; saveOpts(); }
    // the Profile control applies from the next song prepared; the incoming option changes the panel at once
    if (e.target.id === 'radio-incoming') { opts.incoming = e.target.value; saveOpts(); if (S && S.paused === undefined) player.swap(windowPlayable()); }
    { const r = songControlEvent(ctl, e.target, 'change'); if (r) { if (r.render) render(); if (S && (r.keys.includes('voice') || r.keys.includes('sound'))) toast(t('vinstNextOnly')); } }
    if (e.target.matches('[data-sv-preset]')) { sv.preset = e.target.value; renderSteer(true); }
    if (e.target.matches('[data-sv-style]')) { sv.style = e.target.value; renderSteer(true); }
  });
  root.addEventListener('input', e => {
    const k = e.target.dataset.opt;
    if (k || (e.target.type === 'range' && e.target.dataset.vsound)) songControlEvent(ctl, e.target, 'input');
    if (e.target.id === 'radio-seed') seedField = e.target.value.trim();
    if (e.target.id === 'radio-volume') player.setVolume(+e.target.value);
    if (e.target.matches('[data-sv-line]')) sv.line = e.target.value;
    if (e.target.matches('[data-sp-q]')) { spQ = e.target.value; spRenderBody({ top: true }); }
  });

  // what plays, for the studio visual (#28): song, artist, styles, bar, the last spoken comment
  function info(cyc) {
    if (!S) return null;
    const it = S.stream[S.onAir], e = it.entry, rel = Math.max(0, cyc - it.start);
    // (the narrator off for this song, profile-options: no phrase over the stage)
    const said = liveControlsOf(it).narrator === false ? null : buildSteps(it.song).filter(x => x.say && x.at <= rel).pop();
    return { onAir: S.paused === undefined, n: it.n + 1, title: it.song.title, artist: e.artist && e.artist.name, line: `${e.lead ? t('radioLeadShort') : e.styles.map(styleName).join(' + ')} · ${e.key}`, bar: rel, bars: barsOf(it.song), bpm: e.bpm, say: said ? sayText(said.say, getLang()) : '', sayAt: said ? said.at : 0 };
  }

  // the captions of the song on air (spoken-text-on-stage D1): its caption schedule from the same spoken schedule as
  // Coming next, in the song's own bars (offset: where it starts in the radio's window); kept per song, language,
  // controls, samples manifest and lengths
  const capMemo = new WeakMap();
  function captions() {
    if (!S) return null;
    const it = S.stream[S.onAir]; if (!it || !it.song) return null;
    const C = liveControlsOf(it), lang = getLang(), files = voiceFiles(), lengths = spokenContext.lengths, key = `${lang}|${JSON.stringify(C)}`, m = capMemo.get(it.song);
    if (m && m.key === key && m.files === files && m.lengths === lengths) return { lines: m.lines, offset: it.start };
    let lines = [];
    try { lines = captionSchedule(liveBuildOf(it.song, C), C, lang, files, lengths, { schedule: scheduleOf(it) }); } catch (e) { lines = []; }
    capMemo.set(it.song, { key, files, lengths, lines });
    return { lines, offset: it.start };
  }

  // the lines the next song (first lines first), then the song on air, would speak with no sample at all (D9), and the
  // phrases of mine whose speaker has no sample of its own (radio-phrase-speaker D1, D2: the session's snapshot of my
  // phrases, the ones its songs draw), and every built-in line whose speaker has no sample of its own (narrator,
  // voice-track and vocabulary lines, radio-narrator-speakers D3; the app asks each bank/slug once per page): the app
  // asks the voice helper for them; samplesArrived writes the songs again with the new samples
  // ({ every: true }: every line of the two songs, with its sample or not, next: of the next song; for
  // tools/check-voice-preload.cjs --speaker)
  function needs({ every = false } = {}) {
    if (!S) return [];
    const files = voiceFiles(), lang = getLang(), out = [], seen = new Set();
    const snap = S.recipe && S.recipe.mine && S.recipe.mine.list;
    const mineSlugs = new Set((snap || []).map(p => textIn(p, lang)).filter(Boolean).map(x => sayFile(x)));
    for (const it of [S.stream[S.onAir + 1], S.stream[S.onAir]].filter(Boolean)) {
      const C = liveControlsOf(it);
      let list = [];
      try { list = spokenNeeds(liveBuildOf(it.song, C), C, lang, files); } catch (e) { list = []; }
      for (const x of list) { const slug = x.text.toLowerCase(); const k = `${x.bank}|${slug}`; if ((x.has && !every) || seen.has(k)) continue; seen.add(k); out.push(every ? { ...x, next: it === S.stream[S.onAir + 1] } : x); }
    }
    return every ? out : missingNeeds(out, files, mineSlugs, { speakers: true });
  }
  // (a sample made after the next song was preloaded, a speaker's sample of a phrase of mine among them, is queued for
  // it at once, so it loads before the next song's first bar: radio-phrase-speaker D3; loaded ones are skipped)
  function samplesArrived() {
    if (!S) return;
    if (S.paused === undefined) swapSoon(windowPlayable());
    const nx = S.stream[S.onAir + 1];
    if (nx && nx.song && player.preloadVoices) player.preloadVoices(voicesOf(nx));
  }
  let prepText = '';
  function setPrep(txt) { if (txt === prepText) return; prepText = txt; const el = root.querySelector('.radio-prep'); if (el) { el.textContent = txt; el.hidden = !txt; } }

  // the song on air for its soul (#46): the song with the director's plan (steering replaces the song object),
  // or the song alone for a lead or frozen song
  function soulSource(cyc) {
    if (!S) return null;
    const it = S.stream[S.onAir], rel = Math.max(0, cyc - it.start);
    const ctx = it.plan ? { plan: it.plan, entry: it.entry, opts: it.opts || (it.base && it.base.opts) || {}, seed: S.recipe.seed, n: it.n } : { entry: it.entry };
    return { key: `radio:${S.recipe.seed}:${it.n}`, song: it.song, ctx, bar: rel };
  }

  return {
    render, tick, stop, start, skip, pause, resume, afterHand, restart, seek, command, cancel, pend, cancelPend, info, captions, needs, samplesArrived, setPrep, soulSource, continueSong, playSession, rebuild, exportItems, airSongs,
    // the session on air as a playlist item (#38)
    get sessionNow() { return S && !S.limit ? sessionItem(S.recipe, S.onAir + 1, S.stream[0].song.title) : null; },
    get steering() { if (!S) return null; const it = S.stream[S.onAir]; if (!it.plan) return { n: it.n, lead: true, commands: [], plan: null, song: it.song, recipe: clone(S.recipe) }; return { n: it.n, commands: it.commands.map(c => ({ ...c })), plan: { bars: it.plan.bars, phrase: it.plan.phrase, targets: it.plan.plan.map(d => d.target), curves: it.plan.plan.map(d => d.curves || {}), roles: it.plan.plan.map(d => d.role), locked: it.plan.locked || [], lockedParts: it.plan.lockedParts || [], added: clone(it.plan.added || []), risers: clone(it.plan.risers || []), usualHigh: it.plan.usualHigh, hardMax: it.plan.hardMax, gestures: clone(it.plan.gestures || []) }, song: it.song, recipe: clone(S.recipe) }; },
    get paused() { return !!S && S.paused !== undefined; },
    // the console alone drawn again: my phrases changed (a typed row's save button, #82)
    renderConsole() { renderSteer(true); },
    // the console changes pending (tools/check-add-lag.cjs): per batch its boundary, counts, state and pushes
    get pendingAdds() { return batches.map(b => ({ id: b.id, at: b.at, at0: b.at0, parts: { ...b.parts }, pats: b.pats.map(x => x.part), locks: Object.fromEntries(Object.entries(b.locks).map(([k, L]) => [k, L.kind])), state: b.state, pushes: b.pushes, t0: b.t0, times: { ...(b.times || {}) } })); },
    // the last batches that entered: boundary planned and taken, pushes, whether under load, ms from the first press
    get addCost() { return { ...addCost }; },
    resetAddCost() { for (const k of Object.keys(addCost)) delete addCost[k]; },
    get addsDone() { return addsDone.map(x => ({ ...x, parts: { ...x.parts } })); },
    // what the load monitor saw over the last ms (tools/check-add-lag.cjs)
    loadSeen: ms => load.seen(ms),
    // the pushes of each typed line (tools/check-say-lag.cjs)
    get sayPushes() { return { ...sayPushes }; },
    get recording() { return recS ? { seconds: recElapsed(), list: recS.list.map(x => ({ ...x })) } : null; },
    startRec, stopRec, recordFromStart,
    // the Genres tab (#43): the radio plays these styles, with the sliders as they are
    // an invented style on trial (invented-styles D8): a ready recipe (the Styles tab), or one invented in a genre (a
    // Genres card); the radio starts when it is off, else the trial plays from the next song
    tryStyle(recipe) { const was = !!S; if (!applyTrial(ctl, recipe, { quiet: !was })) return false; if (!was) start(); else render(); return true; },
    inventIn(genre) { const seed = freshSeed(); lastDice.invent = seed; const r = ctl.invent && ctl.invent(seed, { genre, base: null }); return r ? this.tryStyle(r) : false; },
    playStyles(ids) { const ok = ids.filter(id => recipes.some(r => r.id === id)); if (!ok.length) return false; opts.artist = null; opts.compilation = 'off'; opts.styles = ok; saveOpts(); start(); return true; },
    // the player stopped the radio (Compose started, stop pressed)
    stopped() { if (S) { S = null; render(); } },
    get on() { return !!S; },
    // the song on air's index, cheap enough to read every few ms (measurements of the natural song change, #82)
    get onAirN() { return S ? S.onAir : -1; },
    get changed() { return changed; },
    // the window on air as the player gets it (tools/check-radio.cjs evaluates its code at chosen bars)
    get airPlayable() { return S ? windowPlayable() : null; },
    get state() { return S && { paused: S.paused, seed: S.recipe.seed, recipe: clone(S.recipe), onAir: S.onAir, stream: S.stream.map(x => ({ n: x.n, start: x.start, bars: x.bars, title: x.song.title, id: x.song.id, transition: x.entry.transition || null, profile: profileOf(x), grown: !!(x.song && x.song.onAir), growing: !!x.growing, show: x === S.stream[S.onAir] ? 'air' : showOf(x), shape: x.song && x.song.crescendo && x.song.crescendo.shape ? { ...x.song.crescendo.shape } : null, knobs: x.base ? Object.fromEntries(KNOBS.map(k => [k, x.base.opts[k]])) : null })), transition: S.stream[S.onAir].entry.transition || null }; },
    get history() { return history; },
    get options() { return current(); },
    // defaults the settings page shows and changes (#31)
    // the material source here is the default for new sessions; the console changes the one on air
    get settings() { return { transition: opts.transition, harmony: opts.harmony, profile: opts.profile, scope: opts.scope, material: opts.materialDefault }; },
    setOption(k, v) {
      if (!['transition', 'harmony', 'profile', 'scope', 'material'].includes(k)) return;
      if (k === 'profile' && !PROFILE_CHOICES.includes(v)) return;
      if (k === 'material') { if (!SESSION_SOURCES.includes(v)) return; opts.materialDefault = v; if (!S) opts.material = v; } else opts[k] = v;
      saveOpts(); if (!root.hidden) render();
    },
  };
}
