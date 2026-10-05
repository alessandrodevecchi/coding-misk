# Agent guide for coding-misk

Start here. This file and `docs/` hold everything a coding agent or a new session needs to keep working on the project without the original conversation.

## Read first

| File                    | What it covers                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `docs/CONTEXT.md`       | Project story, owner preferences and feedback, decisions, references, backlog status |
| `docs/ARCHITECTURE.md`  | Modules, data flow, player and transport, visuals, persistence                       |
| `docs/MUSIC-ENGINE.md`  | Scene model, compiler, presets, how to write tracks, Strudel gotchas                 |
| `docs/VOCALS.md`        | Vocals research (`#3`): local models, licenses, recording, effects, channel design   |
| `docs/PLAN-TRACKS.md`   | Plan for tracks, per-instrument patterns and a timeline (proposal)                   |
| `docs/DESIGN-SYSTEM.md` | Themes, tokens, fonts, components, visuals, hardware theme                           |
| `DEVLOG.md`             | Chronological log of every change (Italian)                                          |
| `README.md`             | Public description (English), `README.it.md` in Italian                              |

## Rules

- **Log every action.** After each meaningful change, append a dated entry to `DEVLOG.md`: what changed, why, and anything learned (bugs, gotchas, measurements). Keep `docs/` in sync when architecture, model, design or decisions change.
- **Talk to the owner in Italian.** Repository docs, issues, commits and README are in English (Italian copies where they exist). `DEVLOG.md` is in Italian.
- **Git flow.** `main` is stable, `develop` collects work in progress. One branch per issue from `develop` (`feat/<issue>-<slug>`, `fix/<issue>-<slug>`), merged back into `develop`. Merge `develop` into `main` only when the owner confirms. Never force push `main`.
- **Commits.** Conventional Commits (`feat(scope): …`, `fix: …`, `docs: …`). Reference issues with a trailer: `Closes: alessandrodevecchi/coding-misk#N` (or `Refs:`).
- **Verify before claiming.** Run the app, play every scene you touched, check `evalError`, and measure per-instrument levels (see Tooling). You cannot hear: say so, and report measured levels instead.
- **Regression checks.** Before merging a change to the compiler, presets or built-in tracks, run `npm run check:code` (generated code, no browser) and `node tools/snapshot-levels.cjs check` (levels, dev server running). When a change is intended, update the snapshots (`npm run snapshot:code`, `node tools/snapshot-levels.cjs write [track-id]`) in the same commit and say why.
- **Fewer layers, more rhythm.** The owner prefers tracks with at most 4 to 5 layers per scene, dark or tense melodic material, and variety between tracks. See `docs/CONTEXT.md`.

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
```

Video recording needs Playwright's ffmpeg (`node $PLAYWRIGHT_CORE/cli.js install ffmpeg`). The demo script writes `video.webm`, `audio.webm` and `offset.txt`; merge with system ffmpeg (see `docs/ARCHITECTURE.md`).

Audio analysis of reference tracks: `tools/analyze-audio.py` and `tools/zoom-audio.py` need `numpy`, `librosa`, `matplotlib` (for example `uv venv && uv pip install numpy scipy librosa matplotlib soundfile`).

## Where things are

- `src/main.js`: app shell, track library, arranger, controls, transport, export.
- `src/music.js`: musical data, presets, scene state, scene-to-code compiler.
- `src/tracks.js`: built-in scene tracks.
- `src/visuals.js`: canvas visuals. `src/hardware.js`: knobs and LEDs for the hardware theme.
- `src/songs.js`: reads `SECTIONS` and `TEMPO` from track code. `src/i18n.js`: strings. `src/content.js`: lessons, sounds, references, hand-written tracks.
- `patterns/`: hand-written Strudel files. `public/samples/`: custom samples. `docs/media/`: README media. `demo/`: local demo videos (git-ignored).
