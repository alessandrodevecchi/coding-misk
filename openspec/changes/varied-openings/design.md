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

Every `styles/*.json` gets `growthShapes.openings` and `growthShapes.kicks`. The full table, with the reason for each style, is in `research.md` (section Openings). Kick-led share means the weight of slow, full-kick, filtered and broken over the weight of the playable openings; it is the probe's target per style.

### D6. More instruments per style

Each style gets one to three more drum machines and one or two more sounds per role, chosen from genre research and mapped only to bank ids and sound names in the app's catalog (`src/sounds/catalog.js` and the loaded sample maps). The table and its reasons are in `research.md` (section Instruments). Rules:

- A new kit must have samples for every drum row the style's grooves play (`bd cp sd hh oh rd`), or `KIT_MISSING` in `src/music.js` must name the missing rows so they fall back. Two of the proposed kits need a new entry (`RolandCompurhythm78`, `MPC1000`). A new Node check reads a committed snapshot of the drum machine index's rows (`tests/snapshots/kit-rows.json`, written from the index once) and fails when a recipe kit lacks a row its grooves play and `KIT_MISSING` does not cover it; `node tools/check-style-sounds.cjs` confirms the same in the browser.
- No brand names in recipe text, descriptions or docs beyond the existing bank ids.
- The owner's taste rules (`docs/CONTEXT.md`) still hold: dark or tense sounds, no cheerful leads where the style does not have them.

### D7. Earshot is not needed

The choice here is which existing bank or sound fits a genre. That is genre knowledge, not timbre analysis: the catalog already names each bank's machine and each sound's family. Earshot (parked in the backlog) describes the timbre of a rendered sound. It would help to pick among many samples of one bank, or to search sounds by description, which this change does not do. It is Python with large models and runs offline only. The owner's listening pass (task 6.4) is the check instead.

### D8. Versions

- `CRESCENDO_VERSION` 2 to 3: the lead draw and the kick start move Crescendo builds. The stream name `crescendo-1` stays.
- `SHAPES_VERSION` 8 to 9: new openings, default weights, lead draw for typed, muted-base and mid-set. `SHAPES_SEED` stays 5, so a song whose weights did not change keeps its drawn pace and development.
- `DIRECTOR_VERSION` 16 to 17: new kits and sounds in the recipes change the director's picks, so the endless fixtures move.
- `STYLE_MAKER_VERSION` 1 to 2 only if the invent seed fixtures move (the style maker trims the recipes' kit and sound lists).
- `AGENTS.md` says the Crescendo fixtures must not move with a shapes bump. This change moves both on purpose, with both versions raised in the same commit; the commit message says so.

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

## Open Questions

- Should Crescendo show the Compose opening control too (today only Live coder reads it)? The spec lets a song's `growthShape.opening` steer Crescendo; a Compose control can come later without changing the rules here.
