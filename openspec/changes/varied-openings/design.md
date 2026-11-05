## Context

The opening probe (`#82`, 440 radio songs, 12 per style and profile) measured the current state:

- **Crescendo** never uses a growth shape (`growSong` resolves a shape only when `rules.coder`), so its destination tracks keep the type order `ORDER` (`src/song/crescendo.js:36`, sorted at about line 845) and the drums come first. The simplest drum form keeps one kick on beat one (`thinRows`, `beatForms`). Result: 94% kick, 36% the single line `$: s("bd").bank("RolandTR909")`.
- **Live coder** draws an opening from `DEFAULT_WEIGHTS.opening` (`src/song/shapes.js:35-37`, `slow` weight 2) or from the style's `growthShapes.openings`. Only 6 of 20 styles have these weights. In `orderByShape` (`crescendo.js:392-409`) the openings slow, full-kick, filtered and broken put the kick first, and typed, muted-base and mid-set leave the type order, so the drums come first again: 7 of 10 openings lead with the kick. Result: 73% kick, 80% of openings drawn from the seed.
- **Drum machines.** The director picks one kit per song with `rng.pick(R.drums.kits)` (`src/endless/director.js:100`). House, trance, gated-trance, pure-trance and progressive-house list only `RolandTR909`.

Grown builds are not stored with songs. Compose, library and radio songs are stored as written songs or as recipes and grow again with the current code. See Migration.

## Goals / Non-Goals

**Goals:**

- Openings that follow the genre in both growing profiles, with one weight table per style.
- A varied first kick when a song opens on the kick.
- More drum machines and sounds per style, only from sounds the app already loads.
- Measured targets, checked by a kept probe tool.

**Non-Goals:**

- No new samples, synths or sound files. No change to the sound catalog.
- No change to the Classic profile.
- No change to pace and development weights (only the opening part).
- No new Compose control for the kick start (the style and the seed choose it).

## Decisions

### D1. Three new openings: `bass`, `chord`, `top`

The existing ids cover the kick, a melody, a pad and a voice, but not the bass, a chord part or a beat without its kick. These are the usual first sounds of lo-fi (keys or a soft bass), jazz (ride, walking bass, piano comping), rock and country (a guitar), and of many techno and drum and bass intros (hats or a break before the kick).

- `bass`: the bass track first. Playable when the destination has a bass track.
- `chord`: a pad with a rhythmic preset (`stab`, `synco`, `staccato` and the other non-held presets), a keys sound, or a guitar track first. Playable when the destination has a pad or a guitar. A held pad stays the `pad` opening.
- `top`: the drum track first without its kick rows. When the kick lives in its own track (the director writes `kick` and `beat` tracks), the `beat` track comes first and the kick track enters at the second waypoint. When one track holds both, its first form drops the `bd` row (a new core `'top'` in `beatForms`, `rowForms` and `thinRows`: the hats, ride or percussion hits, without the kick), and the kick row returns at its next level.
- In `coderPath` the drums with a kick enter no earlier than the third waypoint for `bass` and `chord`, as `melodic` does today.

Alternative: reuse `melodic` for the bass and the guitar. Rejected because a style could not then weight "bass first" apart from "lead first", and jazz and lo-fi need exactly that.

### D2. One lead draw for Crescendo and for openings without a lead

A new function in `shapes.js`, `resolveLead(song, { styles, seed, deny })`, draws a lead opening from the style's `growthShapes.openings` (else `DEFAULT_WEIGHTS.opening`), restricted to the lead openings: slow, full-kick, filtered, broken (drums with the kick), melodic, pad, bass, chord and top, and to what the song can play (`canPlay`). The song's own `growthShape.opening` wins when it is a lead opening.

- **Crescendo** (no shape): `growSong` calls `resolveLead` and moves that track to the front of `dest`, with the same front rules as `orderByShape`. The drums of a kick-led draw keep today's Crescendo growth, except the kick start (D3).
- **Live coder**, openings typed, muted-base and mid-set: `orderByShape` calls the same draw for the track that comes first. Today these openings put the drums first by type order. `voice` keeps the spoken track first, with the lead draw choosing the second track.
- With the `as-written` development the openings typed, muted-base and mid-set keep the written order (no lead draw): that development means the tracks enter where they are written (implementation, checked by the arpeggio test song).
- The draw uses a stream of its own, `stream(seed, 'lead-1')`, so the other Crescendo draws (stream `crescendo-1`) and the shape draws (`shape-5`) keep their values. A Crescendo song whose lead draw lands on the drums and whose kick start draws `one` grows exactly as before.

Alternative: a separate `growthShapes.leads` field for Crescendo. Rejected: two tables per style that say the same thing would drift apart. Live-coder-only openings in the table are skipped by the Crescendo draw.

### D3. Kick starts

A new part of the opening, the kick start, gives the first form of the kick when the drums lead with the `slow` opening or in Crescendo. Ids and hits on a 16-step bar:

| id     | hits         | written as (example) |
| ------ | ------------ | -------------------- |
| `one`  | first kick   | `s("bd")`            |
| `pair` | first two kicks of the written kick | `s("bd ~!9 bd ~!5")` (dnb) |
| `two`  | 0, 8         | `s("bd*2")`          |
| `four` | 0, 4, 8, 12  | `s("bd*4")`          |
| `push` | 0, 12        | `s("[bd ~ ~ bd]")`   |
| `off`  | 8            | `s("~ bd")`          |

- A start is playable when its hits are a subset of the written kick of the reference section (on other grids, the hits scale as `beatForms` already does for beats). Of the 20 grooves, only the straight ones (`trance`, `rolling`, `techno`, `hard`, `synthwave`, `metal`) contain `four`; `dnb`, `boombap`, `phonk` and `halftime` contain only `one` and `pair`. So a start outside the written kick is also playable when the style weights it explicitly: it is the first form only, as the `broken` opening already does with the tresillo, and the next level is the written kick thinned. Under the default weights such a start is left out. `one` is the fallback, and the strongest hit stays the fallback when there is no kick (today's rule).
- The start becomes the `core` of the drums' simplest form (a new `o.core` value `{ hits }` in `thinRows`, `beatForms` and `rowForms`), so the kick grows from it to the written kick with the existing thinning rules.
- Style weights live in a new recipe field `growthShapes.kicks` (`{ "four": 3, "one": 1 }`). Default weights: one 2, pair 1, two 1, four 1, push 1, off 0.5. The draw uses the stream `stream(seed, 'kick-1')`.
- The code writer already writes these forms (`bd*4`, `[bd ~ ~ bd]` appear in today's Live coder openings), so no writer change is expected. Task 3.4 checks it.

Alternative: random rotation of the single kick. Rejected: a kick off beat one without the groove behind it sounds like an error; the six starts are figures a live coder types.

### D4. Default weights

`DEFAULT_WEIGHTS.opening` becomes: slow 1, full-kick 1, typed 1, broken 1, filtered 1, melodic 1, pad 1, voice 0.5, muted-base 1, mid-set 1, bass 1, chord 1, top 1. Only songs whose style and artist give no opening weights use them; after this change every built-in style has its own, so the defaults matter for invented styles that lose the field, user styles and songs without a style.

### D5. Per-style opening and kick-start weights

Every `styles/*.json` gets `growthShapes.openings` and `growthShapes.kicks`. The full table, with the reason for each style, is in Appendix, Openings per style. Kick-led share means the weight of slow, full-kick, filtered and broken over the weight of the playable openings; it is the probe's target per style.

### D6. More instruments per style

Each style gets one to three more drum machines and one or two more sounds per role, chosen from genre research and mapped only to bank ids and sound names in the app's catalog (`src/sounds/catalog.js` and the loaded sample maps). The table and its reasons are in Appendix, Instruments per style. Rules:

- A new kit must have samples for every drum row the style's grooves play (`bd cp sd hh oh rd`), or `KIT_MISSING` in `src/music.js` must name the missing rows so they fall back. Two of the proposed kits need a new entry (`RolandCompurhythm78`, `MPC1000`). A new Node check reads a committed snapshot of the drum machine index's rows (`tests/snapshots/kit-rows.json`, written from the index once) and fails when a recipe kit lacks a row its grooves play and `KIT_MISSING` does not cover it; `node tools/check-style-sounds.cjs` confirms the same in the browser.
- `RolandR8`, already listed by four styles, joins `KITS` too. The new kits without a crash sample (`RolandMC303`, `MPC1000`, `RolandCompurhythm78`) join `NO_CRASH`, so the fills' crash comes from the 909; the kit-rows check (`npm run check:kit-rows`) checks that too (implementation).
- No brand names in recipe text, descriptions or docs beyond the existing bank ids.
- The owner's taste rules (`docs/CONTEXT.md`) still hold: dark or tense sounds, no cheerful leads where the style does not have them.

### D7. No timbre analysis tool

The choice here is which existing bank or sound fits a genre. That is genre knowledge, not timbre analysis: the catalog already names each bank's machine and each sound's family. The timbre-description tool parked in the backlog describes the timbre of a rendered sound. It would help to pick among many samples of one bank, or to search sounds by description, which this change does not do. It is Python with large models and runs offline only. The owner's listening pass (task 6.5) is the check instead.

### D8. Versions

- `CRESCENDO_VERSION` 2 to 3: the lead draw and the kick start move Crescendo builds. The stream name `crescendo-1` stays.
- `SHAPES_VERSION` 8 to 9: new openings, default weights, lead draw for typed, muted-base and mid-set. `SHAPES_SEED` stays 5, so a song whose weights did not change keeps its drawn pace and development.
- `DIRECTOR_VERSION` 16 to 17: new kits and sounds in the recipes, and the longer `KITS` fallback of the steering, change the director's picks, so the endless fixtures move. The bump and the regeneration happen once, at the end of the work (task group 7), so a parallel change that also moves the director (fewer voice speakers) can share the same bump: whichever change lands second rebases, keeps one bump and regenerates the fixtures once.
- `STYLE_MAKER_VERSION` 1 to 2 only if the invent seed fixtures move (the style maker trims the recipes' kit and sound lists).
- `AGENTS.md` says the Crescendo fixtures must not move with a shapes bump. This change moves both on purpose, with both versions raised in the same commit; the commit message says so.

### D9. The Compose opening control steers Crescendo

`growthRules` (`src/live/profiles.js`) returns `{}` for the Crescendo growth today, so the control is ignored. It will return `{ lead: C.opening || 'auto' }` (plus `styles`), and `resolveLead` takes the user's lead opening first. With the Crescendo profile the control lists Auto and the nine lead openings; a stored Live-coder-only value (typed, voice, muted-base, mid-set) reads as Auto there and is kept for Live coder. Pace and Development stay hidden for Crescendo. The growth cache key already holds the profile's controls, so a changed control grows the song again.

Alternative: a separate Crescendo control. Rejected: one control with a filtered list is what the user already knows.

### D10. New kits in the hand-pick list

Every kit added to a style is appended to `KITS` (`src/music.js`). Users of the list and what to watch:

- `src/decode/writer.js` picks `KITS[2]` and `KITS[4]` by index: appending keeps them.
- `src/endless/steering.js` falls back to `KITS` for styles with one kit or none (kit swaps and allowed sounds). After this change every built-in style lists two kits or more, so the fallback is used by user and invented styles only; their steering draws move, and the endless fixtures are regenerated once at the end.
- `src/library/styles-tab.js` and `src/library/patterns-tab.js` list the kits in menus; the longer list must still fit at 400 px.
- `tools/knowledge.mjs` marks every `KITS` entry as described, so the sounds note needs a line per new kit (`npm run check:knowledge`).
- `kitRow` falls back only for kits in `KIT_MISSING`, so every new `KITS` entry must be complete for the six rows or have an entry there (the kit-rows check covers `KITS` too).

## Risks / Trade-offs

- [A new kit lacks a row a groove plays (for example no `rd` or `oh`)] → the kit-rows check fails on it; the kit gets a `KIT_MISSING` entry or is dropped from that style.
- [Non-kick openings make the first bars quieter, and a radio song may feel weaker at the join] → the lead draw keeps the kick-led share high in the dance styles (house, trance, techno), and the probe reports the per-style share against its target.
- [The `top` opening on a song whose kick and hats share one track may write a first line with only a shaker] → `top` needs at least one row other than the kick with four or more hits per bar; otherwise it is not playable.
- [More recipe sounds give invented styles new combinations] → the invent check (coherence, 300 seeds) runs; its fixtures move with `STYLE_MAKER_VERSION`.
- [Distribution targets are statistical and can fail by chance on 12 songs] → the probe runs 24 songs per style and profile for the targets; 12 stays the quick mode.

## Migration Plan

What happens to existing songs:

- **Built-in Compose and library songs** (`songs/*.json`) are written songs; their grown build is computed at play time. The IndexedDB growth store is keyed by a hash of `src/song`, `src/live`, `src/endless` and `styles`, so it is cleared after the update and every song grows again. A song with no `growthShape` may open differently in Crescendo and Live coder. A song that names `growthShape.opening` keeps its opening (only `songs/prova-voce-notte.json` names one today). Classic stays the same.
- **User songs** saved in the browser are written songs too, and behave like built-in ones. Their card lengths are keyed by `CRESCENDO_VERSION` and `SHAPES_VERSION`, so they are measured again.
- **Radio history, Replay and Open in Compose** regenerate from the seed and the recipe with the current director and styles. The same seed gives a different song after the update (new kit and sound picks, new openings).
- **Saved radio sessions** in playlists store the recipe and the versions they were made with. After the update they show the existing "may sound different" badge and play with the new rules. **Frozen sessions** store their songs whole, play exactly as before and show no badge.
- **Exported audio, video and code files** are unaffected.
- There are no shared seed links in the app today.

Rollback: revert the change; the growth store hash changes again and songs grow with the old rules.

## Appendix: per-style tables

Sources: local notes.

### Baseline (probe, 2026-11-04)

The probe grew 12 songs per style and profile (20 styles, Crescendo and Live coder), plus artist and compilation runs, 440 songs in all. The first sounding line of each build was classified.

| Profile    | Kick first | Most common exact line                    | Distinct first lines |
| ---------- | ---------- | ----------------------------------------- | -------------------- |
| Crescendo  | 94%        | `$: s("bd").bank("RolandTR909")`, 36%     | 97 of 140            |
| Live coder | 73%        | `$: s("bd").bank("RolandTR909")`, 18%     | 117 of 140           |

In Crescendo, the kick pattern was `bd` in 94% of songs. In Live coder it was `bd` in 48% and `bd*4` in 11%. Most of the 80% of Live coder openings drawn from the seed came from the 14 styles without `growthShapes.openings`.

### Kick hits of the grooves

The starts a groove's kick contains (16 steps, `x` = kick):

| Groove                                          | Kick               | Starts it contains        |
| ----------------------------------------------- | ------------------ | ------------------------- |
| trance, rolling, techno, hard, synthwave, metal | `x...x...x...x...` | one, pair, two, four, push, off |
| rock                                            | `x.......x.x.....` | one, pair, two, off       |
| train                                           | `x.......x.......` | one, pair, two, off       |
| rockChorus                                      | `x.x.....x.x.....` | one, pair, two, off       |
| breakbeat                                       | `x.....x...x.....` | one, pair                 |
| boombap                                         | `x......x.x......` | one, pair                 |
| phonk                                           | `x......x..x.....` | one, pair                 |
| dnb, halftime                                   | `x.........x.....` | one, pair                 |
| gallopDrums, blast                              | busy               | one, pair, two            |
| pulse                                           | `x...............` | one                       |
| swing                                           | no kick            | none (the ride leads)     |

### Openings per style

Kick-led share means the weight of slow, full-kick, filtered and broken over the weight of all the openings listed. Live-coder-only openings (typed, voice, muted-base, mid-set) count in Live coder only. The probe target per style is this share, within 15 points.

| Style             | `openings`                                                                 | `kicks`                         | Kick-led (LC) | Reason |
| ----------------- | -------------------------------------------------------------------------- | ------------------------------- | ------------- | ------ |
| house             | full-kick 2, filtered 2, slow 1, broken 1, chord 2, bass 1, top 1, muted-base 1 | four 3, one 1, two 1       | 55%           | Kick or filtered kick first, the organ or keys stab is the other classic start |
| trance            | full-kick 3, filtered 2, slow 1, pad 1, melodic 1, top 0.5, typed 0.5      | four 4, one 1                   | 67%           | Kick-led intros for the mix, sometimes a pad or an arp first |
| pure-trance       | full-kick 3, filtered 1, slow 1, pad 1, melodic 1, typed 1                 | four 4, one 1                   | 63%           | As trance; keeps its current weights for full-kick and typed |
| gated-trance      | full-kick 3, filtered 1, slow 1, pad 1, mid-set 1, top 0.5                 | four 4, one 1                   | 67%           | The gated pad can lead; keeps its current mid-set |
| progressive-house | filtered 2, full-kick 2, slow 1, melodic 2, chord 1, pad 1, bass 1, top 1  | four 3, one 1, push 1           | 45%           | Long filtered builds, a pluck or piano can start alone |
| berlin-techno     | full-kick 2, filtered 2, slow 1, broken 1, top 1, bass 1, typed 1          | four 3, one 1, off 1            | 67%           | Kick first, or hats and a rumble bass before it |
| acid              | filtered 3, full-kick 1, slow 1, bass 3, typed 1                           | four 2, one 1                   | 56%           | The acid line alone is the genre's signature start |
| industrial        | broken 2, full-kick 1, slow 1, filtered 1, top 1, bass 1, typed 1          | one 1, two 1, four 1, push 1, off 1 | 63%       | Hard, irregular kick figures; metal percussion first |
| ambient           | pad 3, melodic 1, chord 1, typed 1, voice 0.5                              | one 1, off 1                    | 0%            | Opens on a drone or a pad; the kick (if any) comes late |
| lo-fi             | chord 3, bass 2, melodic 1, pad 1, top 1, slow 1, typed 1                  | one 1, pair 2, two 1            | 10%           | Keys or a soft bass loop first, the dusty beat drops in |
| jazz              | top 3, bass 3, chord 2, melodic 1, typed 0.5                               | one 1, two 1                    | 0%            | Ride, walking bass or piano comping; no kick-led start |
| phonk             | melodic 3, bass 2, broken 1, slow 1, top 1, voice 1                        | one 1, pair 3                   | 22%           | The cowbell melody or the sub bass first; chopped voice where it exists |
| drum-and-bass     | broken 3, top 2, pad 2, bass 1, filtered 1, melodic 1                      | pair 3, one 1                   | 40%           | The break or its hats, or an atmospheric pad intro |
| synthwave         | melodic 2, pad 2, bass 2, chord 1, full-kick 1, slow 1, filtered 1         | four 2, two 2, one 1            | 30%           | Arp or octave bass first, the gated kick enters later |
| darksynth         | bass 2, full-kick 2, melodic 2, filtered 1, slow 1, pad 1                  | four 2, two 1, one 1            | 44%           | A heavy bass or the kick, harder than synthwave |
| dark-cyberpunk    | pad 2, bass 2, melodic 1, broken 1, filtered 1, full-kick 1, typed 1       | two 2, one 1, push 1            | 33%           | Dark drone or bass first, then a tense beat |
| dreamy-cyberpunk  | pad 3, melodic 2, chord 1, top 1, slow 1                                   | two 2, one 1                    | 13%           | Haze and bells first, a soft halftime beat later |
| classic-rock      | chord 3, top 1, full-kick 1, slow 1, bass 1, melodic 1                     | two 2, one 1, four 1            | 25%           | The guitar riff or chords first; a hi-hat count-in |
| melodic-metal     | chord 2, full-kick 2, melodic 2, pad 1, top 1                              | four 2, two 1                   | 25%           | Riff, lead or choir intro, or the double kick at once |
| country           | chord 3, bass 1, top 1, melodic 1, slow 1                                  | two 3, one 1                    | 14%           | Strummed guitar or banjo first, the train beat after |

Notes:

- `four`, `push` and `off` are weighted only where the groove can play them, or where the style wants that figure on purpose (industrial). The `pair` start gives variety to broken and boom-bap kicks.
- The weights of acid, ambient, lo-fi, gated-trance, pure-trance and house replace the current ones; their old ids keep similar weights.

### Result (probe, 48 songs per style and profile)

`npm run probe:openings -- --check` passes (exit 0). The weights below replace the table above where they differ: the
first runs missed the 70% cap on one kick pattern in the four-on-the-floor styles (the full-kick and filtered openings
open on the written kick, `bd*4`) and one style's kick-led share by chance, so `slow` took weight from them and the kick
starts were spread out (house, acid, berlin-techno, progressive-house, the trance styles, darksynth, melodic-metal,
phonk, country, dreamy-cyberpunk); drum-and-bass got `filtered` 2.

| Profile    | Kick first (before) | Most common first line (before)             | Distinct first lines |
| ---------- | ------------------- | ------------------------------------------- | -------------------- |
| Crescendo  | 43% (92%)           | `$: s("bd*4").bank("RolandTR909")`, 4% (38%) | 440 of 960           |
| Live coder | 44% (74%)           | `$: s("bd*4").bank("RolandTR909")`, 6% (19%) | 462 of 960           |

The probe works out the share a style's weights give per song, over the openings that song can play: a song without a
pad never draws `pad`, so the share moves with the songs. The Live-coder-only openings typed, muted-base and mid-set
take their first track from the lead draw and count with its kick-led share; the voice opening never leads with the
kick. The check grows 48 songs per style and profile, so the ±15 points hold without misses by chance (on 24 songs, two
to three pairs of 40 missed by chance; a run with other seeds, `--salt`, tells a rule from chance).

| Style | `openings` | `kicks` | Kick-led, Crescendo (weights) | Kick-led, Live coder (weights) |
| ----- | ---------- | ------- | ----------------------------- | ------------------------------ |
| acid | filtered 2, full-kick 1, slow 3, bass 3, typed 1 | one 2, two 1, four 1, push 1 | 58% (67%) | 73% (67%) |
| ambient | pad 3, melodic 1, chord 1, typed 1, voice 0.5 | one 1, off 1 | 0% (0%) | 2% (3%) |
| berlin-techno | full-kick 1, filtered 2, slow 2, broken 1, top 1, bass 1, typed 1 | four 1, one 1, off 1, two 1 | 81% (77%) | 65% (77%) |
| classic-rock | chord 3, top 1, full-kick 1, slow 1, bass 1, melodic 1 | two 2, one 1, four 1 | 29% (26%) | 33% (26%) |
| country | chord 3, bass 1, top 1, melodic 1, slow 1 | two 2, one 2 | 13% (16%) | 8% (16%) |
| dark-cyberpunk | pad 2, bass 2, melodic 1, broken 1, filtered 1, full-kick 1, typed 1 | two 2, one 1, push 1 | 54% (41%) | 58% (43%) |
| darksynth | bass 2, full-kick 2, melodic 2, filtered 1, slow 1, pad 1 | four 1, two 1, one 1 | 44% (46%) | 50% (48%) |
| dreamy-cyberpunk | pad 3, melodic 2, chord 1, top 1, slow 1 | two 1, one 1, pair 1 | 17% (14%) | 13% (15%) |
| drum-and-bass | broken 3, top 2, pad 2, bass 1, filtered 2, melodic 1 | pair 3, one 1 | 38% (50%) | 52% (50%) |
| gated-trance | full-kick 3, filtered 1, slow 1, pad 1, mid-set 1, top 0.5 | four 3, one 1, two 1 | 85% (88%) | 92% (89%) |
| house | full-kick 2, filtered 1, slow 2, broken 1, chord 2, bass 1, top 1, muted-base 1 | four 2, one 1, two 1, push 1 | 67% (63%) | 63% (64%) |
| industrial | broken 2, full-kick 1, slow 1, filtered 1, top 1, bass 1, typed 1 | one 1, two 1, four 1, push 1, off 1 | 75% (74%) | 69% (74%) |
| jazz | top 3, bass 3, chord 2, melodic 1, typed 0.5 | one 1, two 1 | 0% (0%) | 0% (0%) |
| lo-fi | chord 3, bass 2, melodic 1, pad 1, top 1, slow 1, typed 1 | one 1, pair 2, two 1 | 21% (23%) | 17% (24%) |
| melodic-metal | chord 2, full-kick 2, melodic 2, pad 1, top 1 | four 1, two 1, one 1 | 19% (27%) | 38% (25%) |
| phonk | melodic 3, bass 2, broken 1, slow 1, top 1, voice 1 | pair 2, one 1, two 1 | 19% (28%) | 31% (27%) |
| progressive-house | filtered 1, full-kick 1, slow 2, melodic 2, chord 1, pad 1, bass 1, top 1 | four 1, one 1, push 1, two 1 | 48% (43%) | 35% (45%) |
| pure-trance | full-kick 3, filtered 1, slow 1, pad 1, melodic 1, typed 1 | four 2, one 1, two 1 | 85% (82%) | 83% (81%) |
| synthwave | melodic 2, pad 2, bass 2, chord 1, full-kick 1, slow 1, filtered 1 | four 2, two 2, one 1 | 25% (32%) | 27% (31%) |
| trance | full-kick 3, filtered 2, slow 1, pad 1, melodic 1, top 0.5, typed 0.5 | four 2, one 1, two 1, push 1 | 73% (72%) | 63% (69%) |

### Sounds the app can play

- **Drum machines.** A recipe kit must be in `MACHINES` (`src/sounds/machines.js`, 71 bank ids). The samples come from the drum machine index that the app loads at run time . Songs play six rows only: `bd cp sd hh oh rd` (`ROWS`, `src/music.js`). Fills also play `cr`, and the `cowbell` hook wave plays `cb` from `RolandTR808`. A missing row falls back to the nearest one only for the kits in `KIT_MISSING` (`src/music.js`); for every other kit a missing row is silent.
- **Melodic sounds.** Recipe `waves` accept the oscillators and synths of `SYNTHS` (`src/song/validate.js`), the curated `WAVES` (`src/music.js`) and any `gm_*` name of the installed soundfont list (`node_modules/@strudel/soundfonts/gm.mjs`, 128 names). Avoid `gm_slap_bass_2` and `gm_gunshot` (broken fonts, `src/sounds/soundfont-fix.js`).
- **Texture** samples are a fixed list (`TEXTURES`: vinyl, numbers, industrial, metal, glitch, space, wind, crow). This change adds none.
- **Guitar** recipes name `types` (`GUITAR_TYPES`), not waves. This change adds none.

#### Rows of the candidate drum machines

Read from the drum machine index on 2026-11-04. A tick means at least one sample. `KIT_MISSING` says whether the app already falls back for the missing rows.

| Bank id                | bd | cp | sd | hh | oh | rd | cr | Missing rows covered     |
| ---------------------- | -- | -- | -- | -- | -- | -- | -- | ------------------------ |
| RolandTR808            | ✓  | ✓  | ✓  | ✓  | ✓  | -  | ✓  | yes (`rd`)               |
| RolandTR707            | ✓  | ✓  | ✓  | ✓  | ✓  | -  | ✓  | yes (`rd`)               |
| RolandTR606            | ✓  | -  | ✓  | ✓  | ✓  | -  | ✓  | yes (`cp`, `rd`)         |
| RolandTR505            | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  | complete                 |
| RolandTR626            | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  | complete                 |
| RolandMC303            | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  | -  | complete for the 6 rows  |
| RolandCompurhythm78    | ✓  | -  | ✓  | ✓  | ✓  | -  | -  | no: add to `KIT_MISSING` |
| AkaiLinn               | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  | yes (`rim`)              |
| KorgM1                 | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  | complete                 |
| BossDR110              | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  | complete                 |
| AlesisSR16             | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  | complete                 |
| YamahaRY30             | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  | complete                 |
| MPC1000                | ✓  | ✓  | ✓  | ✓  | ✓  | -  | -  | no: add to `KIT_MISSING` |

Rejected: `RolandTR727` (percussion only), `BossDR55` and `CasioRZ1` (no `oh`), `SimmonsSDS5` (no `cp`, no `rd`).

### Instruments per style

Each addition is an existing bank id or sound name. "Kits" are added to `drums.kits`; the other columns add to `waves` of that role. The reason is the genre's usual instrument, from genre research and general genre knowledge; the owner's listening pass (task 6.5) confirms or drops each one.

| Style             | + Kits                             | + Sounds by role                                                         | Reason |
| ----------------- | ---------------------------------- | ------------------------------------------------------------------------ | ------ |
| house             | RolandTR808, RolandTR707, KorgM1   | pad `gm_piano`, `gm_percussive_organ`; bass `gm_synth_bass_1`            | Early and deep house used these boxes; piano and organ stabs are house staples |
| trance            | RolandMC303, RolandTR808           | pad `gm_synth_strings_1`, `gm_pad_halo`                                  | Late-90s groovebox kits; string and halo pads for breakdowns |
| pure-trance       | RolandMC303                        | pad `gm_pad_halo`, `gm_synth_choir`; hook `gm_lead_2_sawtooth`           | Same era; airy choir pad under the supersaw |
| gated-trance      | RolandTR707                        | pad `gm_synth_strings_1`, `gm_pad_poly`                                  | Hi-NRG roots of the gated sound; a chopped poly pad |
| progressive-house | KorgM1, RolandTR707                | pad `gm_pad_warm`; hook `gm_lead_4_chiff`                                | 90s progressive kits; a short-attack lead close to a pluck |
| berlin-techno     | RolandTR808, RolandTR606           | pad `gm_pad_metallic`; bass `gm_synth_bass_2`                            | Second kick colour and the small analog box; cold metallic pad |
| acid              | RolandTR606                        | bass `square`                                                            | The acid bass line's partner box; the line's other waveform |
| industrial        | RolandTR606, BossDR110             | hook `gm_orchestra_hit`; bass `gm_synth_bass_2`                          | Cheap analog boxes of early industrial and EBM; orchestra-hit stabs |
| ambient           | RolandCompurhythm78                | pad `gm_pad_halo`, `gm_pad_bowed`, `gm_fx_atmosphere`; hook `gm_fx_crystal` | A soft vintage rhythm box for the pulse; long evolving pads |
| lo-fi             | RolandTR808, MPC1000               | pad `gm_electric_guitar_jazz`; bass `gm_fretless_bass`; hook `gm_muted_trumpet` | Sampler and 808 kicks of the genre; jazzy guitar chords, a round soft bass, muted horn |
| jazz              | YamahaRY30, AlesisSR16             | pad `gm_electric_guitar_jazz`; hook `gm_tenor_sax`, `gm_muted_trumpet`   | Acoustic kits with several ride samples; guitar comping, sax and muted trumpet |
| phonk             | EmuSP12, AkaiMPC60                 | pad `gm_pad_choir`; hook `gm_piano`                                      | Memphis-era sampler drums; dark choir and piano loops |
| drum-and-bass     | RolandTR808, KorgM1                | pad `gm_pad_sweep`, `gm_pad_warm`; hook `gm_epiano1`                     | Jungle sub kicks and 90s rave kits; liquid keys and sweeping pads |
| synthwave         | AkaiLinn, RolandTR505              | pad `gm_epiano2`, `gm_pad_poly`; bass `gm_synth_bass_1`                  | 80s sampled-drum sound; FM electric piano and poly pads |
| darksynth         | RolandTR707                        | pad `gm_synth_choir`; bass `gm_synth_bass_2`; hook `gm_lead_8_bass_lead` | 80s box with a harder edge; dark choir and a heavy lead |
| dark-cyberpunk    | RolandTR808, RolandTR626           | pad `gm_pad_metallic`; hook `gm_lead_7_fifths`                           | Late-80s digital kit; metallic pad and an open-fifths lead |
| dreamy-cyberpunk  | RolandTR808, RolandTR626           | pad `gm_pad_halo`, `gm_epiano2`; hook `gm_fx_crystal`                    | Soft halftime kicks; hazy pads and glassy bells |
| classic-rock      | YamahaRY30, AlesisSR16             | pad `gm_piano`; hook `gm_electric_guitar_clean`                          | Acoustic-kit drum machines; rock piano and a clean lead guitar |
| melodic-metal     | AlesisSR16, YamahaRY30             | pad `gm_synth_strings_1`, `gm_church_organ`; hook `gm_violin`            | The home-recording metal drum box; symphonic strings, organ, violin lead |
| country           | AlesisSR16                         | pad `gm_piano`; hook `gm_electric_guitar_clean`                          | Acoustic-kit box; honky-tonk piano and a twangy clean guitar |

Notes:

- `RolandCompurhythm78` and `MPC1000` need a `KIT_MISSING` entry (`cp`, `rd`, `cr`, `rim`, `mt`, `ht` and `rd`, `cr`, `rim`, `mt`, `ht`) in the same change, so their missing rows fall back.
- The director picks kits and sounds uniformly. One added kit in a style with one kit gives the old kit half of the songs, which is the variety wanted.
- Taste rules (`docs/CONTEXT.md`) stay: no bright or cheerful additions for the dark styles.
