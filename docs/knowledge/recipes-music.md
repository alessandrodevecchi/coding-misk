---
id: recipes-music
related: [artists, styles, music-engine, from-a-reference, recipes-parts, checks]
code: [artists, styles, src/endless/recipe.js, src/endless/artist.js, src/endless/artist-maker.js, src/song/format.js]
checks: [npm run check:styles, npm run check:endless, npm run check:random, node --no-warnings tools/artist.mjs validate]
---

# Recipes: artists and styles

Step by step for artists, styles, genres and references. Sounds, songs, presets, patterns and generator rules are in [recipes-parts.md](recipes-parts.md). Every recipe ends with the knowledge base: run `npm run knowledge`, then `npm run check:knowledge`. Recipes for the live build and the radio are in [recipes-build.md](recipes-build.md), for the app in [recipes-app.md](recipes-app.md). Always start with an OpenSpec change shown to the owner when the task is a new feature.

### Define an artist

A built-in artist: a taste over styles and knob ranges ([artists.md](artists.md)).

**Files:** `artists/<id>.json`. Copy a built-in artist close to the new one.

**Steps:**
1. Set `id` (the file name), `name`, `bio` in English and Italian, `portrait` (`seed`, `palette`).
2. Set `styles` with weights; one heavy weight makes a focused artist. Add `explore` for a few songs outside them.
3. Set ranges for `chaos`, `energy`, `complexity`, `talk`, `pace`. A range, not a value: songs must differ.
4. Optional: `shapes`, `moves`, `quirks`, `voice.characters`, `transitions`. Leave out what should keep the defaults.
5. Listen: `npm run endless -- --artist <id> --minutes 20 --seed test`, then `node --no-warnings tools/endless-recap.mjs` for a recap with space for notes. You cannot hear: report the measures and let the owner listen.

**Checks:** `node --no-warnings tools/artist.mjs validate`, `npm run check:endless`, `npm run check:random`; in the browser `node tools/check-library.cjs` (Artists tab).

**Mistakes:** real names of people or brands in `name`, `bio` or `inspiredBy` (kept privately by the owner; ask); a style id that does not exist (the validator names it); fixed values where ranges belong; forgetting the Italian `bio`.

### Generate an artist

A random artist from a seed, as the radio's dice make it.

**Files:** none to write for a try. `src/endless/artist-maker.js` makes it; the Artists tab and the radio dice call it.

**Steps:**
1. In the app: the dice in the radio or the Artists tab, then Keep to save it among the user's artists (browser only).
2. In Node: `makeArtist(seed, recipes)` from `src/endless/artist-maker.js` (recipes from `loadStyles()` in `tools/styles-dir.mjs`). The same seed gives the same artist. `randomStyles`, `randomGenre` and `randomKnobs` draw the rest of the dice.
3. To make it built-in, export its JSON from the Artists tab and follow "Define an artist".

**Checks:** `npm run check:random` (random artists valid and repeatable), `node tools/check-random.cjs` (browser).

**Mistakes:** expecting a different artist from the same seed; editing the word lists of the maker without running `npm run check:random`.

### Define a style

A style recipe the director makes songs from ([styles.md](styles.md)).

**Files:** `styles/<id>.json`; new building blocks in `src/music.js` when the style needs them.

**Steps:**
1. Copy the closest recipe. Change `id` (the file name), `name` (en, it), `genre` (one of the library genres), `description` (one sentence on the sound).
2. Set `tempo`, `keys`, `progressions`, `meters`, `swing`, `shapes`, `minutes`, `phrase`, `tracks` ([music-engine.md](music-engine.md)).
3. Fill the instrument blocks with presets, grooves, kits and waves that exist ([sounds.md](sounds.md)). Add `material` with a modest `share`.
4. Optional: `voice`, `spoken`, `narrator`, `growthShapes`, `family`, `profile`.
5. Give `words` in en, it and es, at least three each.
6. Generate a session: `npm run endless -- --styles <id> --minutes 20 --seed test`. Ask the owner to listen.
7. Run `npm run catalog:strudel` (the catalog reads every style; several minutes), then `npm run knowledge`.

**Checks:** `npm run check:styles`, `npm run check:endless`, `node tools/check-style-sounds.cjs` and `node tools/check-endless-play.cjs` (dev server), `npm run check:knowledge`.

**Mistakes:** more than 4 to 5 layers; sweet major hooks where the owner wants tension; a `gm_` name with a typo (the validator only warns); a groove with a row the kit lacks; endless fixtures that move without a `DIRECTOR_VERSION` bump.

### Add a genre

**Files:** `src/song/format.js` (`GENRES`), `src/i18n.js` (`g:<genre>` in both languages), styles of that genre.

**Steps:** add the id, its names, then at least one style with `genre` set to it. The Genres tab and the song filters read the list.

**Checks:** `npm run check:styles`, `npm run check:song-filter`, `npm run check:guide`, `node tools/check-library.cjs`.

**Mistakes:** a genre with no style (empty in the Genres tab); a name in one language only.

### Make material from a reference

A style, an artist, a song or patterns from a song, a video, an audio or MIDI file, a score or a description.

**Files:** as in the recipes above; the measures stay in the owner's private notes when they name a real work.

**Steps:** follow [from-a-reference.md](from-a-reference.md): ask for the files, measure, map the measures to recipe fields, then follow "Define a style" here, or "Write a song" and "Add a preset" in [recipes-parts.md](recipes-parts.md).

**Checks:** the checks of the recipe you follow.

**Mistakes:** copying a recognisable melody; downloading the reference yourself instead of asking for the file; writing a real name in the repo without asking.
