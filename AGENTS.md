# Agent guide for coding-misk

Start here. This file and `docs/` hold everything a coding agent or a new session needs to keep working on the project without the original conversation.

## Read first

| File                    | What it covers                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `docs/knowledge/README.md` | Knowledge base: concepts, options, inventories (sounds, presets, keys), recipes for the usual tasks, checks map, pitfalls (start here) |
| `docs/CONTEXT.md`       | Project story, owner preferences and feedback, decisions, references, backlog status |
| `docs/ARCHITECTURE.md`  | Modules, data flow, player and transport, visuals, persistence                       |
| `docs/MUSIC-ENGINE.md`  | Scene model, compiler, presets, how to write tracks, Strudel gotchas                 |
| `docs/SONG-FORMAT.md`   | JSON song format v2: sections, tracks, patterns, clips (reference)                   |
| `docs/COMPOSING.md`     | Guide to composing songs as code, with validated examples in `songs/examples/`        |
| `docs/VOCALS.md`        | Vocals research (`#3`): local models, licenses, recording, effects, channel design   |
| `docs/ENDLESS.md`       | Endless director (`#18`, `#21`): sessions, energy shapes, moves, rules, checks        |
| `docs/ARTISTS.md`       | Artists (`#35`): profile, taste with variety, quirks, built-in artists in `artists/`   |
| `docs/STYLES.md`        | Style recipes in `styles/`: fields, mixing styles with chaos, adding a style          |
| `docs/STRUDEL-FUNCTIONS.md` | Catalog of the installed Strudel's functions, what the app writes, notes for variety (`#69`) |
| `docs/PLAN-TRACKS.md`   | Plan for tracks, per-instrument patterns and a timeline (proposal)                   |
| `openspec/`             | OpenSpec specs and changes (spec-driven development, used for `#18` endless mode)     |
| `docs/DESIGN-SYSTEM.md` | Themes, tokens, fonts, components, visuals, hardware theme                           |
| `DEVLOG.md`             | Chronological log of every change (Italian)                                          |
| `docs/PROVE-v0.6.0.md`  | The owner's test checklist before `v0.6.0` (Italian)                                 |
| `README.md`             | Public description (English), `README.it.md` in Italian                              |

## Rules

- **Log every action.** After each meaningful change, append a dated entry to `DEVLOG.md`: what changed, why, and anything learned (bugs, gotchas, measurements). Keep `docs/` in sync when architecture, model, design or decisions change.
- **Talk to the owner in Italian.** Repository docs, issues, commits and README are in English (Italian copies where they exist). `DEVLOG.md` is in Italian.
- **Git flow.** `main` is stable, `develop` collects work in progress. One branch per issue from `develop` (`feat/<issue>-<slug>`, `fix/<issue>-<slug>`), merged back into `develop`. Merge `develop` into `main` only when the owner confirms. Never force push `main`.
- **Commits.** Conventional Commits (`feat(scope): …`, `fix: …`, `docs: …`). Reference issues with a trailer: `Closes: alessandrodevecchi/coding-misk#N` (or `Refs:`).
- **Verify before claiming.** Run the app, play every section you touched, check `evalError`, and measure per-instrument levels (see Tooling). You cannot hear: say so, and report measured levels instead.
- **Regression checks.** Before merging a change to the compiler, presets or built-in tracks, run `npm run check:code` (generated code, no browser), `npm run check:songs` and `node tools/snapshot-levels.cjs check` (levels, dev server running). Do not edit files under `src/` while the level check runs: Vite reloads the page and the rest of the run measures silence. When a change is intended, update the snapshots (`npm run snapshot:code`, `node tools/snapshot-levels.cjs write [track-id]`) in the same commit and say why.
- **Private plans stay local.** Plans about where the project's output goes live in the git-ignored `notes/` (read them before planning that kind of work). Issues, commits, docs, specs and app texts describe features generically and name no platform.
- **Issues and backlog.** Well-defined work lives in GitHub issues, the single source of truth. Rough ideas still under discussion live in the git-ignored `notes/backlog-idee.md`, each with a status. When an idea is defined, propose an issue to the owner; once opened, replace the backlog entry with a pointer to the issue, so nothing lives in two places. Private matters stay in the backlog or become neutrally worded issues.
- **Spec first.** Every feature starts with an OpenSpec change (proposal, specs, design, tasks) shown to the owner; code only after the owner says go.
- **Keep the Guide current.** Every user-facing feature adds or updates its card in `src/guide.js`, in English and Italian, in the same change (`#48`). `npm run check:guide` fails when a tab or a console command has no card or line, a text misses a language, or an interface string exists in one language only; a part that needs no card goes in `GUIDE_EXEMPT` with a reason.
- **Keep the knowledge base true.** `docs/knowledge/` explains the concepts; `AGENTS.md` says how to work. A change that adds a concept, an option, a console command, a style or a helper updates its note in the same change: run `npm run knowledge` (rewrites only the generated blocks), describe by hand what has no help text in the app, then `npm run check:knowledge`. Add important decisions and rejected attempts to `docs/knowledge/decisions.md`, and remove lines that no longer hold. A change that adds a kind of task adds its recipe and a row in the Tasks table. A stale Strudel catalog is a warning in `npm run check:knowledge`, not a failure: rebuild it with `npm run catalog:strudel` when Strudel, the generator or the app functions change, and before a merge to main.
- **Director version.** When an intended change to the director changes the endless fixtures (`npm run check:endless -- --write-fixtures`), bump `DIRECTOR_VERSION` in `src/endless/director.js` in the same commit: radio sessions saved in playlists use it to warn that they may sound different (`#38`).
- **Shapes version.** When an intended change to the growth shapes moves the Live coder fixtures (`node tools/check-crescendo.mjs --write-fixtures`), raise `SHAPES_VERSION` in `src/song/shapes.js` in the same commit; the Crescendo fixtures (`--write`, `CRESCENDO_VERSION`) must not move with it. A change to a built-in song, the growth or either version needs `npm run durations` (the song cards' grown lengths) in the same commit.
- **Check levels.** When a slow check fails, fix it and rerun only what failed (`npm run check:crescendo -- --only <check> --songs <a,b>`), then the quick level (`npm run check:crescendo`) before a normal commit. Run the full level (`npm run check:crescendo -- --full`) after a change to growth rules, shapes or typing, and before a merge to main, together with `npm run catalog:strudel`. Slow checks run in worker processes at low priority (4 on weekdays 08:00-20:00, 6 by day at the weekend, all cores but one at night; `CHECK_WORKERS=n` overrides; a number in `.check-workers` at the repo root wins and is read again before each song). Generated code and results are cached in `.cache/checks/` (git-ignored); `--no-cache` ignores it. See `docs/knowledge/checks.md`.
- **Fewer layers, more rhythm.** The owner prefers tracks with at most 4 to 5 layers per section, dark or tense melodic material, and variety between tracks. See `docs/CONTEXT.md`.

## Run

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # sanity check, output in dist/ (not committed)
```

Requires Node.js 20+. Samples load from GitHub at runtime, so a network connection is needed.

## Tooling

Scripts in `tools/` drive the running dev server with Playwright and Google Chrome (headless, `channel: 'chrome'`). They need `playwright-core`; on the owner's machine it ships with `playwright-cli`:

```sh
export PLAYWRIGHT_CORE=/opt/homebrew/opt/playwright-cli/libexec/lib/node_modules/@playwright/cli/node_modules/playwright-core
node tools/check-levels.cjs luci-rosse insert-coin    # play every scene, print errors and peak levels per instrument
node tools/screenshot-visual.cjs edgerunners luci-rosse 3 /tmp/edge   # stage screenshots of one visual
node tools/screenshots.cjs /tmp/shots                 # README screenshots
node tools/record-demo.cjs /tmp/demo                  # scripted demo video + audio from Strudel's master
node tools/test-hardware-theme.cjs /tmp/hw            # hardware theme: knob drag, LEDs, screenshots
node tools/export-audio.cjs /tmp/wav luci-rosse        # export tracks to WAV through the app (real time, one after another)
node tools/snapshot-levels.cjs check                  # compare levels per scene and instrument with tests/snapshots/levels.json
node --no-warnings tools/song.mjs validate songs/my-song.json   # check a v2 song (errors and warnings with JSON paths)
node --no-warnings tools/song.mjs compile songs/my-song.json    # print its Strudel code
node --no-warnings tools/song.mjs list                          # songs in songs/
npm run check:songs                                    # validate every song in songs/
npm run voices                                         # spoken comments for live builds (macOS say + ffmpeg)
npm run endless -- --styles berlin-techno,jazz --chaos 0.5 --minutes 20 --seed aurora --join   # endless session in songs/endless/ (git-ignored), with a report
npm run check:styles                                   # validate the style recipes in styles/
node --no-warnings tools/artist.mjs validate|list      # artists in artists/; npm run endless -- --artist night-owl
npm run check:endless                                  # recipes, director rules, determinism (seed fixtures), command line
node tools/check-style-sounds.cjs                      # every sound and drum machine a recipe names is loaded (dev server)
node tools/check-endless-play.cjs [songs/endless]     # evaluate every live build step of generated songs and open each from the song menu (dev server)
node tools/check-library.cjs [shots-dir]               # Styles and Artists tabs, radio artist picker, new song from artist (dev server)
npm run check:song-filter                              # song tags, search, filters and sorting of the Songs tab (no browser)
PORT=5173 node tools/check-songs-tab.cjs [shots-dir]   # Songs tab in the browser: search, filters, favourites, tags, previous and next, delete, trash, Test chip (dev server on PORT, default 5173)
PORT=5173 node tools/check-startup.cjs                 # startup: Songs tab ready within 3 s, no long task over 1.5 s, also with the Live build switch on (Live coder, Crescendo) and 60 songs of the user's; card lengths and the song in Compose grow in the background (dev server on PORT, default 5173)
npm run durations                                      # grown lengths of the built-in songs for the song cards (src/library/song-durations.json); npm run check:durations fails when stale (no browser, ~20 s)
npm run check:random                                   # random tools: random artists valid and repeatable, styles and knobs in their limits, the sounds die (no browser)
node tools/check-random.cjs [shots-dir]                # random tools in the browser: radio dice, Keep, Artists tab, random style and genre (dev server)
npm run check:compilation                              # radio compilation: repeatable, segment lengths, setup limits, journey between neighbours, random artists (no browser)
node tools/check-compilation.cjs [shots-dir]           # compilation in the browser: button and lamps, setup and presets, tag, Replay (dev server)
npm run check:soul                                     # song soul data: same song same soul, radio souls follow the director, every built-in song drawable (no browser)
node tools/check-soul-display.cjs [shots-dir]          # Soul display: hidden screw and "soul", display keys, shell selector, override with the SCART cable and dragging, power off (dev server)
node tools/check-soul.cjs [shots-dir]                  # soul scene in the browser: dropdown, every view draws, HW amber, analyzing, recalibrating, lock, full screen (dev server)
npm run check:playlists                                # playlist store, play queue (shuffle, repeat), export and import (no browser)
node tools/check-playlists.cjs [shots-dir]             # playlists in the browser: favourites migration, + Playlist, tab, auto-advance, shuffle, repeat, export and import (dev server)
npm run check:trash                                    # song trash: move, restore, delete for good, purge after 30 days, merge (no browser)
node tools/check-transitions.cjs [kind,kind…]          # radio through each transition (mix, morph, echo, break, interlude): no errors, below clipping (dev server)
node tools/check-steering.cjs [shots-dir]              # radio console: queue, cancel, curve drag, mixer, scope, shortcuts, end, replay (dev server)
node --no-warnings tools/check-backup.mjs            # backup of everything in the browser: export and merge on import (no browser)
node tools/check-settings.cjs [shots-dir]              # settings page: gear, theme, language, radio defaults, Opus export, backup, reset (dev server)
npm run check:video                                    # session video: layout areas, soul panel, MP4 or WebM, title card (no browser)
node tools/check-video.cjs [shots-dir]                 # session video in the browser: song, code layout, cancel, radio, soul panel, whole tab, fast video and its direction, the radio gear; files checked with ffprobe (dev server)
npm run check:export                                   # fast export: tempo map, live build segments, timeline, formats (no browser)
node tools/check-export.cjs [song,song…]                # fast export in the browser: faster than real time, same sound as real time, FLAC lossless, MP3 and Opus, cancel, saved session; needs ffmpeg (dev server)
npm run check:clips                                    # fragments: vertical layouts, picker, label, glitch messages, texts for sharing (no browser)
node tools/check-clips.cjs [shots-dir]                 # fragments in the browser: random and timed, 1080×1920 with sound, same sound as the long song, recipe source, menu and texts panel, visuals in each layout (dev server, ffmpeg)
npm run check:live                                     # live output: preset areas and transitions, beat, OBS client against a fake OBS (no browser)
node tools/check-live.cjs [shots-dir]                  # live output in the browser: broadcast window, control room, TAKE and transition, app loop stopped, reload, close (dev server)
node tools/check-recording.cjs                         # radio recording: pause without gaps, track list, downloads, record from the start (dev server)
node tools/check-modes.cjs [shots-dir]                 # the two modes: tabs, memory per mode, old remembered tab, link across modes, phone (dev server)
node tools/check-player.cjs                            # player bar and global volume: modes, previous and next, volume after the master, layout (dev server)
node tools/check-hand.cjs                              # hand live coding in Compose: take over, steps held, resume, last code (dev server)
node --no-warnings tools/check-radio.cjs [--long 30]  # radio in the browser: controls, same songs as the director, skip, history, save, open in Compose (dev server)
node --no-warnings tools/endless-recap.mjs [songs/endless] [--lang it|en]   # Markdown recap of generated sessions, with space for listening notes
npm run catalog:strudel                                # rebuild the Strudel function catalog and coverage (docs/strudel/, docs/STRUDEL-FUNCTIONS.md); run when Strudel, the generator or app functions change, and before a merge to main (check:knowledge warns while it is stale); cached in .cache/checks/
npm run check:strudel                                  # generated code calls only catalog functions and app helpers, catalog matches the installed Strudel (no browser, cached)
npm run check:crescendo [-- --full] [-- --only <check> --songs <a,b>]   # Crescendo and growth shapes: quick level by default, --full for every song, targeted reruns (no browser, workers, cached)
npm run check:workers                                  # worker pool: control file changed during a run, worker rules (no browser)
npm run knowledge                                      # rewrite the generated blocks of docs/knowledge/ from the code, the help texts and the example songs
npm run check:knowledge                                # knowledge base: notes, links, generated blocks up to date, every style, command, option and helper covered, examples compile (no browser)
npm run check:ideas                                    # idea writer: shortest exact forms, every kind of idea, ladders, variant steps (no browser)
npm run check:functions                                # song functions: every Live coder step expands back to the line written out, % shorter, names, presets, update of saved code (no browser)
npm run check:mixer [-- --full] [-- --only <profile|preset> --songs <a,b>]   # hidden mixer: every hap of every step with the short, mixer and compact presets has the gain, orbit, analyze, postgain and velocity of the code in full, in Classic, Crescendo and Live coder (Strudel in Node, workers, cached)
npm run check:material                                 # material generator: rules, determinism, variety, key, chord tones, families, energy, varied presets, FM ranges, session sources (no browser)
npm run check:spoken                                   # voice instrument: format, the four ways, narrator yields, poetic narrator, texts, speakers, growth, director (no browser)
node tools/check-spoken-play.cjs [shots-dir]           # voice instrument in the browser: example song heard below clipping, silent and error free without samples (dev server)
npm run check:patterns                                 # Patterns tab data: every preset once, styles that use it, store, Save as pattern, loop song, Add to song, previews, radio pool, backup (no browser)
node tools/check-patterns.cjs [shots-dir]              # Patterns tab in the browser: loop, key change, beat, New and Save, Compose listen and Save as pattern, rename, delete, Add to song, links (dev server)
PORT=5173 node tools/check-compact-code.cjs            # same events for compact code, short patterns, line breaks and every technical functions preset in Live coder, Classic and Crescendo (dev server on PORT, default 5173)
node tools/check-ideas.cjs [song,song…]                # same events as the code before idea-model, every song and Crescendo states (dev server, ~8 min)
```

Video recording needs Playwright's ffmpeg (`node $PLAYWRIGHT_CORE/cli.js install ffmpeg`). The demo script writes `video.webm`, `audio.webm` and `offset.txt`; merge with system ffmpeg (see `docs/ARCHITECTURE.md`).

Audio analysis of reference tracks: `tools/analyze-audio.py` and `tools/zoom-audio.py` need `numpy`, `librosa`, `matplotlib` (for example `uv venv && uv pip install numpy scipy librosa matplotlib soundfile`).

## Where things are

- `src/main.js`: app shell, track library, arranger, controls, transport, export.
- `src/music.js`: musical data, presets, channel state (`DEFAULT`), per-instrument code generator (`sceneLayers`).
- `songs/*.json`: built-in songs (order in `songs/index.json`); `songs/examples/`: songs used by the guide.
- `src/sounds/`: sound browser (catalogue from the loaded sounds, pixel art drawings, free photos with credits in `public/sounds/photos/CREDITS.md`).
- `src/song/`: song format v2 (format, converter from older scene saves, compiler, validator).
- `src/endless/`: endless director (seeded random, recipes, mixing, shapes, energy, mutation, phrases, director, join). `styles/`: style recipes.
- `src/material/`: material generator (melodies, basslines, arpeggios, chords, grooves, sounds composed as ideas from a seed, a style and an energy; `docs/ENDLESS.md`, Material).
- `src/visuals.js`: canvas visuals. `src/hardware.js`: knobs and LEDs for the hardware theme.
- `src/songs.js`: reads `SECTIONS` and `TEMPO` from track code. `src/i18n.js`: strings. `src/content.js`: lessons, sounds, references, hand-written tracks.
- `patterns/`: hand-written Strudel files. `public/samples/`: custom samples. `docs/media/`: README media. `demo/`: local demo videos (git-ignored).
