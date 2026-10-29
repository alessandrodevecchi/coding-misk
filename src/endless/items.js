// The songs of a radio session rebuilt without playing (#38, radio-profiles): song 0 (a lead from Compose), then each
// generated song with its options (the recipe's options and changes, or the compilation's draw) and its steering. The
// radio's replay, its exports, saved sessions and tools/check-radio-profiles.mjs build the same items from here.
// Pure: no browser APIs.
import { createSession, leadEntry } from './director.js';
import { compilationOptions } from './compilation.js';
import { steerSong, biasSong } from './steering.js';
import { recipeProfile, customControls } from './profile.js';
import { growOnAir, leadOnAir, searchOf, playedOf } from './growth.js';
import { steerOnAir, AIR_CHOOSER, AIR_CHOOSERS } from './waypoints.js';

// the options of song n in a recipe: the first options, then every change up to n; options without the Profile option
// (saved before radio-profiles) replay as Classic
export function recipeOptionsAt(recipe, n) {
  let o = recipe.options;
  for (const c of recipe.changes || []) if (c.song <= n) o = c.options;
  return { ...o, profile: recipeProfile(o) };
}
// the growth marker of a recipe (radio-profiles stage 4): its version since the radio plays Crescendo and Live coder songs
// grown; a recipe without it (saved before) replays in blocks
// 2 (stage 5, D9): a command on a grown song is the next waypoint of its growth (waypoints.js); a recipe of version 1
// replays its steered grown songs as they were heard then, grown again from the steered song
// 3: the moves to a waypoint come in the order of the normal chooser (AIR_CHOOSER, waypoints.js); a recipe of version 2
// replays with the chooser on air it was heard with (radio-1)
export const GROWTH_ON_AIR = 3;
export const growsOnAir = recipe => !!(recipe && Number(recipe.growth) >= 1);
export const waypointsOnAir = recipe => !!(recipe && Number(recipe.growth) >= 2);
// a recipe of a new session records its chooser when it is not the default (radio-chooser-versions D4): the recorded id
// when it is still in the code, an id no longer there gives the default (the playlist warns, playlists.js)
export const airChooserOf = recipe => {
  const c = recipe && recipe.chooser;
  if (typeof c === 'string' && Object.hasOwn(AIR_CHOOSERS, c)) return c;
  return c === undefined && Number(recipe && recipe.growth) < 3 ? 'radio-1' : AIR_CHOOSER;
};
// the per-song choices a compilation keeps from the radio's controls (a clip keeps its length)
export const howOf = o => ({ transition: o.transition, harmony: o.harmony, ...(o.profile !== undefined ? { profile: o.profile } : {}), ...(o.custom ? { custom: o.custom } : {}), ...(o.sounds ? { sounds: o.sounds } : {}), ...(o.material ? { material: o.material } : {}), ...(o.userPatterns ? { userPatterns: o.userPatterns } : {}), ...(o.fit ? { fit: o.fit } : {}), ...(o.voice ? { voice: o.voice } : {}) });
// the director options of song n: the compilation's draw, else the recipe's
export const directorOptions = (recipes, recipe, n, o = recipeOptionsAt(recipe, n)) => (o.compilation ? compilationOptions(recipe.seed, n, o.compilation, recipes, howOf(o)) : o);

// recipes: the usable style recipes; recipe: { seed, options, changes, steering, lead }; count: songs wanted
// until(out): optional, stops early once true (the radio export by length, #8)
// grow (radio-profiles D5): Crescendo and Live coder songs grow on air (growth.js), seeded by the song id. By default
// a recipe grows its songs when it carries the growth marker (GROWTH_ON_AIR, recorded since the radio plays grown
// songs); a recipe saved before has none and replays every song in blocks, as it was heard
// (steering a grown song, D9: its commands are waypoints of the growth, past steps kept, waypoints.js; a recipe of
// growth version 1 grows the steered song again, as the radio played it then)
// → [{ song, entry, plan, opts }] (song 0 of a lead has only song and entry)
// the styles a session recipe embeds (invented-styles D10): trial styles the songs used, so a replay needs no store
export const extraStylesOf = recipe => (recipe && Array.isArray(recipe.extraStyles) ? recipe.extraStyles.filter(r => r && r.id) : []);
export function sessionItems(recipes, recipe, count, until = null, { grow = growsOnAir(recipe), styles = null } = {}) {
  // (invented-styles D10: the styles a session embeds, a trial style, join it as extra styles)
  const extra = extraStylesOf(recipe), all = extra.length ? [...recipes, ...extra.filter(x => !recipes.some(r => r.id === x.id))] : recipes;
  const shapes = grow ? (styles && !extra.length ? styles : { ...(styles || {}), ...Object.fromEntries(all.map(r => [r.id, r])) }) : null;
  const L = recipe.lead, le = L ? leadEntry(L.song) : null, ses = createSession(recipes, recipe.seed, { ...(le ? { lead: le } : {}), extra });
  // (song 0 keeps the profile it had in Compose, or takes the forced one, radio-profiles D2: leadOnAir)
  const out = L ? [{ song: leadOnAir(L, shapes || Object.fromEntries(all.map(r => [r.id, r]))), entry: le }] : [];
  for (let n = out.length; out.length < count && !(until && until(out)); n++) {
    // (the session's choices on the director's song, radio-arrangement D10: the base the listener's commands steer)
    const g = biasSong(recipe, n, ses.next(directorOptions(recipes, recipe, n))), cmds = (recipe.steering || []).filter(c => c.song === n).map(({ song: _, ...c }) => c);
    // the transition into this song: planned on the entry before it (the lead's for the first song after it)
    const before = out.length ? out[out.length - 1].entry : null;
    const custom = recipeOptionsAt(recipe, n).custom;
    // (reused-lines D5, D6: the session's shape settings; a song grows with them unless it played its default growth on
    // air; its commands steer the growth it had)
    const search = searchOf(recipe), wide = !!search && playedOf(recipe, n) !== 'default';
    const ctx = { profile: g.entry.profile, artist: g.opts.artist || null, into: before && before.transition ? before.transition.kind : null, styles: shapes, phrase: g.plan.phrase, controls: custom ? customControls(custom) : null, ...(search ? { search, wide } : {}), ...(g.opts.length && g.opts.length !== 'style' ? { fitted: true } : {}) };
    let song;
    if (grow && g.entry.profile && (!cmds.length || waypointsOnAir(recipe))) song = steerOnAir({ song: g.song, plan: g.plan, opts: g.opts, commands: cmds, seed: recipe.seed, n, ctx, chooser: airChooserOf(recipe) }).song;
    else {
      song = cmds.length ? steerSong({ song: g.song, plan: g.plan, opts: g.opts, commands: cmds, seed: recipe.seed, n }).song : g.song;
      if (grow && g.entry.profile) song = growOnAir(song, ctx);
    }
    out.push({ song, entry: g.entry, plan: g.plan, opts: g.opts });
  }
  return out;
}

// D11: whether the first `count` songs of a recipe hold a grown song: a grown lead, or a Crescendo or Live coder song of a
// recipe with the growth marker. Only the director's profiles are read (no growth), so it is quick.
export function holdsGrown(recipes, recipe, count) {
  const L = recipe && recipe.lead;
  if (L && (L.profile === 'crescendo' || L.profile === 'switch')) return true;
  if (!growsOnAir(recipe)) return false;
  return sessionItems(recipes, { ...recipe, lead: L ? { song: L.song, from: L.from } : undefined }, count, null, { grow: false }).some(x => x.entry && x.entry.profile && !x.entry.lead);
}
