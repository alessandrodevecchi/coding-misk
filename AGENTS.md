# Agent guide for coding-misk

Start here. This file and `docs/` hold everything a coding agent or a new session needs to keep working on the project without the original conversation.

## Read first

| File                    | What it covers                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `docs/CONTEXT.md`       | Project story, owner preferences and feedback, decisions, references, backlog status |
| `docs/ARCHITECTURE.md`  | Modules, data flow, player and transport, visuals, persistence                       |
| `docs/MUSIC-ENGINE.md`  | Scene model, compiler, presets, how to write tracks, Strudel gotchas                 |
| `docs/SONG-FORMAT.md`   | JSON song format v2: sections, tracks, patterns, clips (reference)                   |
| `docs/COMPOSING.md`     | Guide to composing songs as code, with validated examples in `songs/examples/`        |
| `docs/VOCALS.md`        | Vocals research (`#3`): local models, licenses, recording, effects, channel design   |
| `docs/ENDLESS.md`       | Endless director (`#18`, `#21`): sessions, energy shapes, moves, rules, checks        |
| `docs/ARTISTS.md`       | Artists (`#35`): profile, taste with variety, quirks, built-in artists in `artists/`   |
| `docs/STYLES.md`        | Style recipes in `styles/`: fields, mixing styles with chaos, adding a style          |
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
export PLAYWRIGHT_CORE=/opt/homebrew/Cellar/playwright-cli/0.1.21/libexec/lib/node_modules/@playwright/cli/node_modules/playwright-core
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
node tools/check-songs-tab.cjs [shots-dir]             # Songs tab in the browser: search, filters, favourites, tags, previous and next (dev server)
npm run check:playlists                                # playlist store, play queue (shuffle, repeat), export and import (no browser)
node tools/check-playlists.cjs [shots-dir]             # playlists in the browser: favourites migration, + Playlist, tab, auto-advance, shuffle, repeat, export and import (dev server)
node tools/check-transitions.cjs [kind,kind…]          # radio through each transition (mix, morph, echo, break, interlude): no errors, below clipping (dev server)
node tools/check-steering.cjs [shots-dir]              # radio console: queue, cancel, curve drag, mixer, scope, shortcuts, end, replay (dev server)
node --no-warnings tools/check-backup.mjs            # backup of everything in the browser: export and merge on import (no browser)
node tools/check-settings.cjs [shots-dir]              # settings page: gear, theme, language, radio defaults, Opus export, backup, reset (dev server)
node tools/check-recording.cjs                         # radio recording: pause without gaps, track list, downloads, record from the start (dev server)
node tools/check-modes.cjs [shots-dir]                 # the two modes: tabs, memory per mode, old remembered tab, link across modes, phone (dev server)
node tools/check-player.cjs                            # player bar and global volume: modes, previous and next, volume after the master, layout (dev server)
node tools/check-hand.cjs                              # hand live coding in Compose: take over, steps held, resume, last code (dev server)
node --no-warnings tools/check-radio.cjs [--long 30]  # radio in the browser: controls, same songs as the director, skip, history, save, open in Compose (dev server)
node --no-warnings tools/endless-recap.mjs [songs/endless] [--lang it|en]   # Markdown recap of generated sessions, with space for listening notes
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
- `src/visuals.js`: canvas visuals. `src/hardware.js`: knobs and LEDs for the hardware theme.
- `src/songs.js`: reads `SECTIONS` and `TEMPO` from track code. `src/i18n.js`: strings. `src/content.js`: lessons, sounds, references, hand-written tracks.
- `patterns/`: hand-written Strudel files. `public/samples/`: custom samples. `docs/media/`: README media. `demo/`: local demo videos (git-ignored).
