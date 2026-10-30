---
id: recipes-build
related: [growth-shapes, live-build, profiles, comments-and-functions, radio-commands, radio, voice, narrator, checks]
code: [src/song/shapes.js, src/song/crescendo.js, src/song/coder.js, src/live/profiles.js, src/song/functions.js, src/song/writer.js, src/endless/steering.js, src/radio/radio.js, src/endless/director.js]
checks: [npm run check:crescendo, npm run check:profiles, npm run check:live-code, npm run check:functions, npm run check:strudel, npm run check:endless, npm run check:guide]
---

# Recipes: live build and radio

Step by step for the parts that write code while the music plays. Every recipe ends with `npm run knowledge` and `npm run check:knowledge`. A change to code the Strudel catalog reads also needs `npm run catalog:strudel` (several minutes) before the knowledge check passes.

### Add a growth opening or move

A new way for a Live coder build to open, or a new small move between waypoints ([growth-shapes.md](growth-shapes.md)).

**Files:** `src/song/shapes.js` (`OPENINGS`, `DEFAULT_WEIGHTS`, `canPlay`), `src/song/crescendo.js` (openings and developments), `src/song/coder.js` (waypoints and moves), `src/i18n.js` (`opening:<id>` and the `openingHint` text, both languages), `src/guide.js` (growth card), `tools/fixtures/live-coder.json`.

**Steps:**
1. Add the id and its default weight. Write in `canPlay` what the song needs for it (drums, a kit, a pad).
2. Build it as steps of the song format; reuse step actions before adding one ([live-build.md](live-build.md)).
3. Add the names and the hint in both languages, and the Guide line.
4. Run `npm run check:crescendo`. When the Live coder fixtures move on purpose, raise `SHAPES_VERSION` and run `npm run check:crescendo -- --write-fixtures`.
5. Measure the first minute with `tools/growth-measure.mjs`, and export the first two minutes of a song for the owner.

**Checks:** `npm run check:crescendo`, `npm run check:typing`, `npm run check:live-code`, `npm run check:guide`, `node tools/check-crescendo-play.cjs` (dev server).

**Mistakes:** Classic or Crescendo steps that change (their fixtures and `CRESCENDO_VERSION` must not move); typing that has to rush a step; a value the song cannot play left in the draw; a new Strudel function not checked in [strudel-functions.md](strudel-functions.md).

### Add a profile control or option

A new control of the live build panel ([profiles.md](profiles.md)).

**Files:** `src/live/profiles.js` (`CONTROLS`, `PROFILES`), the code that reads it, `src/main.js` (the panel), `src/i18n.js` (label, hint, value names), `src/guide.js`, `tools/knowledge.mjs` (`CONTROL_TEXT`, so the knowledge base finds the help text).

**Steps:**
1. Add the control and its values to `CONTROLS`, and its value to each profile in `PROFILES`. Classic and Crescendo keep the old behaviour.
2. Read it with `resolveProfile`; `cleanOverrides` drops unknown values, so saved overrides stay valid.
3. Add the panel control, the texts in both languages and the Guide line.
4. Map its text keys in `CONTROL_TEXT` of `tools/knowledge.mjs`, or describe it by hand in `profiles.md`.

**Checks:** `npm run check:profiles`, `npm run check:live-code`, `npm run check:crescendo`, `npm run check:guide`, `npm run check:knowledge`.

**Mistakes:** changing a profile's default output (fixtures move); a control with a text in one language; storing a value without a migration when a meaning changes (see `migrateGrowth`).

### Add a technical or library function

A function the app registers for the code it writes ([comments-and-functions.md](comments-and-functions.md)).

**Files:** `src/song/functions.js` (`LIBRARY`: name, params, chain, about in en and it; `NEVER`, `EFFECTS`), `src/song/writer.js` (`HELPERS`, presets), `docs/strudel/variety.json` when it uses a new Strudel function.

**Steps:**
1. Pick a short name that is not a Strudel function or synonym: search [docs/STRUDEL-FUNCTIONS.md](../STRUDEL-FUNCTIONS.md) for it.
2. Add it with its chain written out (`.decay(a).sustain(b)`). The writer folds a chain only when it matches exactly.
3. The prelude of Copy and Open in Strudel must define it, so copied code plays outside the app.

**Checks:** `npm run check:strudel` (fails on a Strudel name), `npm run check:functions` (every step expands back to the line written out), `npm run check:live-code`, `npm run catalog:strudel`.

**Mistakes:** a name that hides Strudel's (`o`, `drive`, `env` were); a function that changes the sound (the code must play the same written out); forgetting the Italian `about`.

### Add a radio command

A new console command that rewrites the song on air ([radio-commands.md](radio-commands.md)).

**Files:** `src/endless/steering.js` (`COMMANDS`, the rewrite, `whyNot`, `applyBar`), `src/radio/radio.js` (button, shortcut), `src/icons.js` (a drawn icon), `src/i18n.js` (`steer:<id>`, `steerTip:<id>`), `src/guide.js` (the Radio card must name it).

**Steps:**
1. Add the command with its group; `structural` applies on a double phrase, `bar` on the next bar, else the next phrase.
2. Write the rewrite as steps added to the song from the boundary. Draw randomness from a stream named after the command and the song (`vary:<song>:<index>`), so replay and cancel give the same song. On a grown song the command becomes a waypoint by itself (`src/endless/waypoints.js` types the moves from the code on air to the rewrite); add a rule there only when the moves must be typed in another way (as mute types `_$:`).
3. Give `whyNot` a reason when it cannot apply (`not-playing`, `locked`).
4. Add the button, a key, a drawn icon, the texts and the Guide line.

**Checks:** `npm run check:endless`, `npm run check:radio-profiles` (the command on grown songs: past kept, typing, arrival), `npm run check:guide`, `node tools/check-steering.cjs`, `node tools/check-radio.cjs`, `node tools/check-transitions.cjs` (dev server).

**Mistakes:** a command that changes songs without commands (fixtures move); sessions saved with the command that now sound different without a `DIRECTOR_VERSION` bump; emoji icons.

### Add a transition, an energy shape or a quirk

**Files:** `src/endless/artist.js` (`TRANSITION_KINDS`), `src/endless/transitions.js`; `src/endless/recipe.js` and `src/endless/shapes.js` (`SHAPES`); `src/endless/quirks.js` (`QUIRKS`); `src/i18n.js`; `docs/ARTISTS.md` and `docs/STYLES.md` for the fields.

**Steps:** add the id, its behaviour, its names in both languages and a default weight that keeps old sessions the same (0, or a new random stream). Add it to artists or styles that should use it.

**Checks:** `npm run check:endless`, `node tools/check-transitions.cjs <kind>`, `npm run check:compilation`, `npm run check:random`.

**Mistakes:** a new kind drawn from an existing stream (every later song changes); a transition louder than the songs around it.

### Add voice lines, a speaker or a language

**Files:** `src/song/vocabulary.js` (line groups and poetic lines), styles (`spoken.lines`, `narrator`), `tools/voice.mjs` (`npm run voices`), `src/song/build.js` (`SPEAKERS`), `src/song/format.js` (`VOICE_CHARACTERS`, `VOICE_LIMITS`).

**Steps:**
1. Write lines of at most 12 words, in English and Italian.
2. Run `npm run voices` (macOS `say` and ffmpeg) to make the samples; they are git-ignored.
3. A song without samples stays silent on those lines and still plays.

**Checks:** `npm run check:spoken`, `npm run check:endless`, `node tools/check-spoken-play.cjs` (dev server).

**Mistakes:** the narrator's speaker reused for the voice instrument; lines that name real people; committing the generated samples.

### Add a pool kind or a moment

**Files:** the pool (`PHRASES` in `src/song/build.js`, `POOL` in `src/endless/phrases.js`, `CRESCENDO_POOL` in `src/song/crescendo.js`), `src/voices/moments.js` (my-phrases D2), `src/i18n.js` (`phMoment:<id>` in both languages).

**Steps:**
1. Map the new key in `PHRASES_MOMENT`, `POOL_MOMENT` or `crescendoMoment`, so a phrase of mine of that moment can replace its lines.
2. A new moment goes in one of `MOMENT_GROUPS` (tracks, colour, structure), with its label in both languages.

**Checks:** `npm run check:phrases` (every pool key mapped), `npm run check:guide`, `npm run check:samples`.

**Mistakes:** a moment in no group never shows in the Voices tab's form; changing a pool's lines moves the director's fixtures (bump `DIRECTOR_VERSION`), the moments map does not ([phrases.md](phrases.md)).

### Change the director safely

Any change to how radio songs are written.

**Files:** `src/endless/director.js` (`DIRECTOR_VERSION`), `tests/snapshots/endless.json` (seed fixtures), `tests/snapshots/radio-growth.json` (radio items, Classic and grown), `src/endless/profile.js` and `src/endless/growth.js` (profiles and growth on air), `src/endless/waypoints.js` (commands on grown songs), `src/endless/items.js` (`GROWTH_ON_AIR`).

**Steps:**
1. Run `npm run check:endless` before and after.
2. When fixtures move on purpose, run `npm run check:endless -- --write-fixtures` and raise `DIRECTOR_VERSION` in the same commit. Playlists warn that saved sessions may sound different.
3. Keep complexity 0 and the source `patterns` producing the old songs.
4. Run `npm run check:radio-profiles` (a few minutes: it grows 60 songs). Its Classic fixtures must not move with a change that keeps the director's songs; rewrite them with `-- --write-fixtures` only on purpose. New randomness for profiles or growth goes in its own stream (`profile/<n>`, `artist-profile`), and `entry.profile` is written only when it is not Classic.

**Checks:** `npm run check:endless`, `npm run check:radio-profiles`, `npm run check:compilation`, `npm run catalog:strudel`, `node tools/check-endless-play.cjs`, `node tools/check-radio.cjs`.

**Mistakes:** rewriting fixtures without a version bump; new randomness drawn from an existing stream; a draw added to `artistSongOptions` (every later artist draw shifts); reading the Compose profile in the radio.
