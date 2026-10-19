---
id: recipes-parts
related: [sounds, songs, music-engine, patterns, material, ideas, sound-and-levels, recipes-music, checks]
code: [songs, src/music.js, src/material/index.js, public/samples/README.md]
checks: [npm run check:songs, npm run check:code, npm run check:material, npm run check:patterns, npm run check:ideas]
---

# Recipes: sounds, songs and parts

Step by step for sounds, songs, presets, patterns, generator rules, keys and progressions. Every recipe ends with the knowledge base: run `npm run knowledge`, then `npm run check:knowledge`. Artists and styles are in [recipes-music.md](recipes-music.md).

### Add a sound or an instrument

A new sound for styles, songs or Compose menus.

**Files:** `src/music.js` (`WAVES` for the Compose menu, `TEXTURES` for a texture sample, `GUITAR_TYPES` for an amp type), `public/samples/` for a custom sample, styles and songs that use it.

**Steps:**
1. Look in [sounds.md](sounds.md) first: most General MIDI fonts are shipped and unused.
2. For a custom sample: a folder in `public/samples/<name>/` with short WAV files, no silence at the start. It plays as `s("<name>")`.
3. Add it to the menu table with English and Italian names when people should pick it.
4. Measure it in a song: `node tools/check-levels.cjs <song>`. Set `gain` so a lead peaks near 0.5 and no line passes 0.9 ([sound-and-levels.md](sound-and-levels.md)).
5. For a new soundfont used by a style: `node tools/check-sounds.cjs --fonts --only <name>` finds broken zones; add a stand-in to `SOUNDFONT_FIX` when needed.

**Checks:** `npm run check:styles`, `npm run check:songs`, `node tools/check-style-sounds.cjs`, `node tools/snapshot-levels.cjs check`.

**Mistakes:** a sample that only exists on this machine (samples in `public/samples/` other than the voice folders must be committed or the song is silent elsewhere); loud soundfonts; heavy drive with the level set before it.

### Write a song

A built-in song in format v2 ([songs.md](songs.md)).

**Files:** `songs/<id>.json`, `songs/index.json` (library order), `tests/snapshots/code/<id>.strudel`, `tests/snapshots/levels.json`.

**Steps:**
1. Start from an example in `songs/examples/` and `docs/COMPOSING.md`. Write sections (bars, bpm, key, chords) and tracks with patterns and clips. Prefer ideas for new parts.
2. Tag it: `tags.genres`, `tags.styles`, `tags.free` (`test` for test songs). Add `inspiration` for a mood line if the owner wants one.
3. Add the id to `songs/index.json`.
4. `node --no-warnings tools/song.mjs validate songs/<id>.json`, then `compile` to read the code.
5. Measure: `node tools/check-levels.cjs <id>`. Balance, then `node tools/snapshot-levels.cjs write <id>`.
6. `npm run check:code` reports the new song as `NEW`: run `npm run snapshot:code`, and `git status` must show only the new snapshot. Run `npm run check:crescendo` and read what it says about the new song before writing any fixture.
7. `npm run catalog:strudel`, then `npm run knowledge`.

**Checks:** `npm run check:songs`, `npm run check:code`, `npm run check:crescendo`, `npm run check:strudel`, `npm run check:knowledge`.

**Mistakes:** more than 5 layers per section; hard cuts between sections (use `fade` or a shared layer); `.cps()` in a code track; snapshots of other songs rewritten by accident.

### Add a preset

A new bass, arpeggio, hook, pad, guitar pattern, groove or texture rhythm in `src/music.js` ([music-engine.md](music-engine.md)).

**Files:** `src/music.js` (the table of the kind); styles that should use it.

**Steps:**
1. Add an entry with English and Italian names, in the shape of its neighbours. Hooks are degrees (semitones in `chromatic`), riffs are semitone offsets, grooves are 16-step rows.
2. Its idea is derived at load (`presetIdea`). Check the short form with `npm run check:ideas`.
3. Listen to it in the Patterns tab and measure its level in a song.
4. Name it in the styles that should use it.

**Checks:** `npm run check:patterns` (every preset once), `npm run check:ideas`, `npm run check:code` (existing songs must not change), `npm run check:styles`, `npm run check:knowledge`.

**Mistakes:** renaming or reordering an existing preset (songs and fixtures name it); a groove row a kit lacks; a sweet stepwise hook.

### Add a pattern

A pattern for the Patterns tab or the radio pool ([patterns.md](patterns.md)).

**Files:** none in the repo for a user pattern: it lives in the browser (`coding-misk-patterns`) and the backup. A built-in pattern is a preset (see "Add a preset").

**Steps:**
1. In Compose: [Save as pattern] on a track, or [New] in the Patterns tab to compose one.
2. Tag it with styles so the radio uses it only there.
3. [Add to song] puts it on the song open in Compose.

**Checks:** `npm run check:patterns`, `node tools/check-patterns.cjs` (dev server).

**Mistakes:** expecting a saved pattern in the repo; untagged patterns go to every style's pool.

### Add a generator rule

A new rule of the material generator ([material.md](material.md)).

**Files:** `src/material/<kind>.js` (`MELODY_RULES`, `BASS_RULES`, `ARP_RULES`, `CHORD_RULES`, drum `FAMILIES`), `src/material/index.js`, styles that allow it.

**Steps:**
1. Write the rule as a choice among musical options, drawn from the kind's seeded stream. Never free random notes: stay in key and on chord tones.
2. Add its name to the kind's list; the recipe validator reads the lists.
3. Add `why` entries so a part says which rules it used.
4. Allow it in styles (`material.rules` or `families`).
5. Read [strudel-functions.md](strudel-functions.md) first if the rule needs a Strudel function the app has never written.

**Checks:** `npm run check:material`, `npm run check:endless` (fixtures at complexity 0 must not move), `npm run check:strudel`, `npm run catalog:strudel`.

**Mistakes:** drawing from another stream (other songs change); notes outside the key; changing what complexity 0 or the source `patterns` produce.

### Add a key, a progression or a meter

**Files:** `src/music.js` (`KEYS`, `PROGS`, `CHORDS`, `METERS`, `GROOVES` for a groove in the new meter).

**Steps:**
1. A progression is written in A minor with chord names of `CHORDS`; add a chord there first if needed.
2. A key is a root and its semitones from A. A meter is a name and its sixteenth steps per bar.
3. Name it in styles; listen in the Patterns tab with the new key or progression.

**Checks:** `npm run check:code`, `npm run check:songs`, `npm run check:styles`, `npm run check:material`, `npm run check:knowledge`.

**Mistakes:** `Fmaj7`-style names in ideas with `voicing()` (write `F^7`); presets that do not fit an odd meter (riffs of 16 steps).

