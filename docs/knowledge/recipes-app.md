---
id: recipes-app
related: [checks, strudel-functions, glossary, settings, visuals, export, sound-and-levels, sounds, pitfalls]
code: [tools, package.json, src/i18n.js, src/guide.js, src/settings/settings.js, src/settings/backup.js, src/visuals.js, src/export/fast.js]
checks: [npm run check:guide, npm run check:strudel, npm run check:knowledge, node tools/check-settings.cjs, node tools/snapshot-levels.cjs]
---

# Recipes: the app

Step by step for checks, Strudel updates, texts, settings, visuals, exports and levels. Every recipe ends with `npm run knowledge` and `npm run check:knowledge`.

### Add a check

**Files:** `tools/check-<name>.mjs` (Node, no browser) or `tools/check-<name>.cjs` (Playwright, dev server), `package.json` (`check:<name>` for a Node check), `AGENTS.md` (a line under Tooling).

**Steps:**
1. Start the file with a comment: what it checks, then a usage line. The knowledge base copies the first sentences into [checks.md](checks.md).
2. Print one line per case (`ok` or `FAIL` with the reason) and exit 1 on any failure.
3. A browser check reads `PLAYWRIGHT_CORE`, opens `http://localhost:5173`, and finds songs by title, not by page position.
4. Fixtures go in `tools/fixtures/` or `tests/snapshots/` and are written only with an explicit flag (`--write`).
5. Add the npm script and the `AGENTS.md` line; run `npm run knowledge`.

**Checks:** the new check twice (same result), `npm run check:knowledge`.

**Mistakes:** a check that writes fixtures by default; a check that depends on the order of the song list; a slow Node check run before every commit without need.

### Update Strudel

**Files:** `package.json` (`@strudel/repl`), `package-lock.json`, `docs/strudel/*`, `docs/STRUDEL-FUNCTIONS.md`, `tests/snapshots/`.

**Steps:**
1. Read the Strudel changelog. Raise the version in `package.json` and run `npm install`.
2. `npm run catalog:strudel` rebuilds the catalog and coverage (several minutes). Read the diff: new functions, renamed synonyms.
3. `npm run check:strudel`: no app function may take a new Strudel name.
4. `npm run check:code`, `npm run check:songs`, `npm run check:crescendo`, `npm run check:endless`: the code must not change. Then play songs and run `node tools/snapshot-levels.cjs check`.
5. `node tools/check-sounds.cjs` finds broken soundfont zones and samples; add stand-ins to `SOUNDFONT_FIX`. The guard's memory is per soundfont library version.
6. Run a fast export and compare it with real time (`node tools/check-export.cjs`).

**Checks:** all of the above, `npm run build`, `npm run check:knowledge`.

**Mistakes:** forking Strudel (never; the app wraps it); skipping the catalog; tempo or audio changes noticed only by ear.

### Add interface text in both languages

**Files:** `src/i18n.js` (`STR.it` and `STR.en`, the same key in both), `src/guide.js` (the card of the feature).

**Steps:**
1. Add the key in both blocks. `t('key', { vars })` reads it; `{name}` marks a variable.
2. Use the words of [glossary.md](glossary.md): song, track, section, never "scene" or "composition".
3. A user-facing feature updates its Guide card in English and Italian: `what`, `how`, `know`. `[Label]` marks a button, `{K}` a key.

**Checks:** `npm run check:guide` (same keys in both languages, a card for every tab and console command), `npm run check:knowledge` (help texts feed the notes).

**Mistakes:** a text in one language; long dashes; names of platforms or real people; emoji instead of drawn icons.

### Add a setting

**Files:** `src/settings/settings.js` (the row), a `coding-misk-*` key in `localStorage`, `src/settings/backup.js` (the backup must carry it), `src/i18n.js`, `src/guide.js`.

**Steps:** add the row with its help text, read the value where it is used, include the key in the backup, describe it in [settings.md](settings.md).

**Checks:** `node --no-warnings tools/check-backup.mjs`, `node tools/check-settings.cjs` (dev server), `npm run check:guide`.

**Mistakes:** a key left out of the backup; a default that changes what existing users hear.

### Add a look

**Files:** `src/visuals.js` (the drawing), `src/music.js` (`LOOKS` with English and Italian names), `src/guide.js` (card `visuals`), `docs/DESIGN-SYSTEM.md`.

**Steps:** draw from the bar and the instrument levels only, so the fast video draws the same frame. Keep a frame cheap (a few milliseconds). Show the owner screenshots (`node tools/screenshot-visual.cjs <look> <song> 3 /tmp/shots`) before shipping.

**Checks:** `npm run check:video`, `node tools/check-video.cjs`, `npm run build`.

**Mistakes:** time-based animation (fast video and live differ); a look changed without screenshots for the owner.

### Export audio, video or fragments

**Files:** none to change for an export. The export code is in `src/export/` and `src/video/` ([export.md](export.md)).

**Steps:**
1. In the app: the export controls of Compose, the Songs and Playlists tabs, or the radio. Format, speed and video layout come from Settings.
2. From the command line, real time WAV through the app: `node tools/export-audio.cjs /tmp/wav <song-id>` (dev server).
3. Check a fast export against real time: `node tools/check-export.cjs <song-id>` (needs ffmpeg).
4. Fragments: from the song or session menu in the app; `node tools/check-clips.cjs /tmp/shots` makes some and checks them.

**Checks:** `npm run check:export`, `npm run check:video`, `npm run check:clips`, and their browser checks.

**Mistakes:** judging an export by ear only (compare levels and the timeline); long exports in memory instead of to disk; videos for every progress step (the owner wants screenshots during work, a video at the end).

### Fix a level or clipping problem

**Files:** the song or style (`gain`, `postgain` shapes, `drive`, `rack`, the style's `headroom`), sometimes a preset or `ROWS` multipliers in `src/music.js`, `tests/snapshots/levels.json`.

**Steps:**
1. Measure: `node tools/check-levels.cjs <song>` (dev server). Each section prints the line peaks and `out=`, the peak of the master output. Only the output clips: `out` above 1.0 fails. A line above the headroom is a warning ([sound-and-levels.md](sound-and-levels.md)).
2. For a file, export it and run `node tools/check-export.cjs <song> --quick`: it names the time of the first clipped sample.
3. Output above 1.0: lower the loudest lines in that section (`gain`; for driven sounds `postgain` after the drive). Fewer layers often fix the sum.
4. A line above the headroom with the output below 1.0: nothing clips. Lower it if it covers the mix; for a loud genre the style may set `headroom` (up to 1.5) instead.
5. Want a dirtier sound: add distortion (`crunch`, `grit`, the `distort` or `shape` devices, filter `drive`) and set the level after it with `postgain`. Never raise `gain` for it.
6. Measure twice; noise moves guitars and `fx` between runs.
7. When the change is intended, `node tools/snapshot-levels.cjs write <song>` and say why in the commit.

**Checks:** `node tools/snapshot-levels.cjs check`, `npm run check:code`, `node tools/check-transitions.cjs` for the radio, `node tools/check-export.cjs` for files.

**Mistakes:** raising the master; raising `gain` for saturation; treating a line above 1.0 as clipping while the output is fine; editing `src/` while the level tool runs; rewriting the snapshots of every song for one fix.

### Find why a sound is silent

**Files:** `src/sounds/sound-guard.js`, `src/sounds/soundfont-fix.js`, the browser console.

**Steps:**
1. Read the console: the guard logs `[sounds] <name> <font> is broken, playing <other>`; evaluation errors show as `evalError`.
2. Check the name in [sounds.md](sounds.md): a typo in a `gm_` name passes the validator.
3. Samples and soundfonts load from the network; offline only synths play.
4. A voice line without samples is silent by design until `npm run voices` runs.

**Checks:** `npm run check:sound-guard`, `node tools/check-style-sounds.cjs`, `node tools/check-sounds.cjs --only <name>`.

**Mistakes:** adding a stand-in for a sound that is just misspelled; blaming the guard for a line muted with `_$:` or a mask.
