---
id: checks
related: [pitfalls, sound-and-levels, recipes-app, decisions, status]
code: [tools, package.json, tests/snapshots, tools/fixtures]
checks: [npm run check:knowledge]
---

# Checks

Which checks cover which part, what they need, how long they take, and which fixtures they guard. Run the checks of the area you touched before you say a change is done.

Node checks need nothing but `npm install`. Browser checks need the dev server (`npm run dev`, `http://localhost:5173`), Google Chrome and `PLAYWRIGHT_CORE` (see `AGENTS.md`). Some also need ffmpeg. Stop the dev server when you are done.

## Which checks to run

| You changed | Node checks | Browser checks (dev server) |
| --- | --- | --- |
| A song or `songs/index.json` | `check:songs`, `check:code`, `check:crescendo`, `check:strudel` | `check-levels.cjs <id>`, `snapshot-levels.cjs check` |
| The compiler, presets, ideas, `src/music.js` | `check:code`, `check:songs`, `check:ideas`, `check:patterns`, `check:crescendo`, `check:live-code` | `check-ideas.cjs`, `check-compact-code.cjs`, `snapshot-levels.cjs check` |
| A style or an artist | `check:styles`, `check:endless`, `check:random` | `check-style-sounds.cjs`, `check-endless-play.cjs`, `check-library.cjs` |
| The director, steering, transitions | `check:endless`, `check:compilation` | `check-radio.cjs`, `check-steering.cjs`, `check-transitions.cjs` |
| Profiles and growth on air, the code on air, commands as waypoints (`src/endless/growth.js`, `src/endless/items.js`, `src/endless/waypoints.js`, `src/live/air-code.js`) | `check:radio-profiles`, `check:endless`, `check:live-code` | `check-radio.cjs`, `check-compact-code.cjs` (radio window), `check-transitions.cjs` (Live coder runs), `check-steering.cjs` (Live coder steering at its end) |
| The material generator | `check:material`, `check:endless`, `check:patterns` | `check-patterns.cjs` |
| Growth shapes, Crescendo, profiles, typing | `check:crescendo -- --full`, `check:profiles`, `check:live-code`, `check:typing`, `check:functions` | `check-crescendo-play.cjs`, `check-hand.cjs` |
| App functions, the writer | `check:functions`, `check:strudel`, `check:live-code` | `check-compact-code.cjs` |
| The voice | `check:spoken`, `check:endless` | `check-spoken-play.cjs` |
| Export, video, fragments | `check:export`, `check:video`, `check:clips` | `check-export.cjs`, `check-video.cjs`, `check-clips.cjs` |
| Library, playlists, trash, settings | `check:song-filter`, `check:playlists`, `check:trash`, `check-backup.mjs` | `check-songs-tab.cjs`, `check-playlists.cjs`, `check-settings.cjs` |
| Interface text or the Guide | `check:guide` | `check-modes.cjs` |
| Anything a note or a recipe describes | `check:knowledge` | |
| Strudel version, sounds | `catalog:strudel`, `check:strudel`, `check:sound-guard` | `check-sounds.cjs`, `check-style-sounds.cjs` |
| The generator, app functions, the writer (Strudel the app writes) | `catalog:strudel`, then `knowledge` | |
| The check tools themselves (`tools/check-pool.mjs`, `tools/code-cache.mjs`) | `check:workers` | |
| Before a merge to main | `check:crescendo -- --full`, `catalog:strudel`, `knowledge`, `check:knowledge`, and the checks of every area the branch touched | the browser checks of those areas |

Always run `npm run build` before handing over a change to the app.

How long they take on the owner's machine (measured 2026-10-19, partly while another heavy job ran): most Node checks finish in under 2 seconds. `check:endless` about 15 s, `check:knowledge` about 13 s, `check:live-code` 2 s. Slow ones, before faster-checks (one process, normal priority): `check:strudel` and `catalog:strudel` about 6 minutes, `check:functions` about 10 minutes, `check:crescendo` about 45 minutes. Since faster-checks (2026-10-20, 4 workers at `taskpolicy -b`, the Mac busy with other work): with nothing changed they read the cache in under a second (`catalog:strudel` 0.5 s, `check:strudel` 0.3 s, `check:functions` 0.4 s, `check:crescendo` 0.5 s). After a change to the code they import: `catalog:strudel` or `check:strudel` about 7 to 8 minutes, `check:functions` about 18 minutes, `check:crescendo` quick level about 10 minutes, full level about 45 minutes (the Live coder fixture alone, on every song, is most of the quick level). Run the slow ones when you touched their area, not on every edit. Browser checks take one to a few minutes each; `check-ideas.cjs` about 8 minutes, `check-sounds.cjs` much longer (thousands of files).

### Levels, cache and workers

The rule for the slow checks:

1. A slow check fails: fix it, then rerun only what failed: `npm run check:crescendo -- --only <part of the check name> --songs <a,b>` (or `ONLY=` and `SONGS=`). A targeted run proves the fix, not the commit.
2. A normal commit: the quick level, `npm run check:crescendo`. It runs the Classic, Crescendo and Live coder fixtures on every song and every other check on a fixed sample of songs (`QUICK_SONGS` in `tools/check-crescendo.mjs`). Counts and medians over the corpus (for example "more than 500 builds") are printed, not checked.
3. After a change to growth rules, shapes or typing, and before a merge to main: the full level, `npm run check:crescendo -- --full`.
4. When Strudel, the generator or the app functions change, and before a merge to main: `npm run catalog:strudel`, then `npm run knowledge`. A stale catalog is only a warning in `check:knowledge`.

`catalog:strudel`, `check:strudel`, `check:functions` and `check:crescendo` keep what they generate in `.cache/checks/` (git-ignored, `tools/code-cache.mjs`). An item is a song with its live builds, a style's radio session, or a check's work on one song. Its key is a hash of its inputs (the song file or the recipes, the profile and options) and of the app code the tool imports, followed as `docs/strudel/inputs.json` does, plus the Strudel package versions. An edited song is generated again alone; any change to `src/` code a tool imports regenerates all of that tool's items. `--no-cache` (or `CHECK_CACHE=off`) neither reads nor writes the cache and gives the same result. Entries unused for 14 days are deleted.

What is not in the cache runs in worker processes (`tools/check-pool.mjs`), one song or one fixed-song check per task, longest first, results in song order: the same result on any number of workers. Workers run at low priority. By day at most 2 are "fast" (`nice -n 10`: any core, below the owner's apps) and the others run in the background (`taskpolicy -b` on macOS: efficiency cores only); at night all are fast. How many: 4 on weekdays 08:00-20:00 (2 fast), 6 by day on Saturday and Sunday (2 fast), all cores but one at night. `CHECK_PRIORITY=background|nice|normal` gives every worker the same priority. `CHECK_WORKERS=n` overrides the time rules. A number in `.check-workers` at the repo root (git-ignored) wins over both and is read again before each task: lower it and busy workers finish their song, then stop; raise it and new workers start; delete it to go back to the rules. `node tools/check-pool.mjs` prints the number a check would use now; `npm run check:workers` tests a control file changed during a run.

On the owner's Mac (Apple M4: 4 performance and 6 efficiency cores) `taskpolicy -b` keeps the workers on the efficiency cores, about 3x slower; the 2 fast workers are why a cold quick `check:crescendo` takes about 70 s (2026-10-20). The quick level runs the Live coder fixtures on the quick songs only; `--full` runs them on every song.

## Every check

Generated from the `tools/` folder: the header comment of each tool and whether it drives a browser.

<!-- generated:checks -->
| Tool | npm script | Needs | What it covers |
| --- | --- | --- | --- |
| `tools/check-backup.mjs` |  | Node | Checks for the backup of everything in the browser (#31). No browser. |
| `tools/check-clips.cjs` |  | dev server, Chrome | Browser checks for fragments (#57): random and timed fragments from a song and from a radio recipe, 1080×1920 files with sound, a timed fragment that sounds as the same stretch of the full song, label numbers that grow,… |
| `tools/check-clips.mjs` | `npm run check:clips` | Node | Checks for fragments (#57): vertical layouts, the fragment picker (lively parts, no overlap, bar lines, repeatable), times, label and glitch messages, and the texts for sharing. No browser. |
| `tools/check-compact-code.cjs` |  | dev server, Chrome | Browser check for the compact code of Crescendo songs (#64, crescendo-code): for states of a few songs, the events Strudel makes (onset time and every value) are the same with the standard code, the joined lines and one… |
| `tools/check-compilation.cjs` |  | dev server, Chrome | Browser checks for the radio compilation (#49): the button and its lamps, the setup (preset, genres, ranges, saved presets), songs drawn within the setup, the now playing tag, Keep for a random artist, Replay gives the… |
| `tools/check-compilation.mjs` | `npm run check:compilation` | Node | Checks for the radio compilation (#49): repeatable, segment lengths, setup limits, journey between neighbours, random artists valid, songs play. No browser. |
| `tools/check-continue.cjs` |  | dev server, Chrome | Browser checks for "Continue in radio" (#29): from Compose and from a song card, the song is song 0 of a new session, steering waits for song 1, song 1 follows in the styles near the song, Replay plays song 0 again. |
| `tools/check-crescendo-play.cjs` |  | dev server, Chrome | Browser checks for Crescendo (#64) in Compose: the build style control, a Crescendo build that starts from one sound and grows without evaluation errors, seeking into the growth, hand takeover and resume, a song that… |
| `tools/check-crescendo.mjs` | `npm run check:crescendo` | Node | Checks for Crescendo (#64), the live build that grows a song in small steps. No browser. Every song in songs/ is built in crescendo and checked: same seed same build, every growth step on one track, one track per bar,… |
| `tools/check-endless-play.cjs` |  | dev server, Chrome | Evaluates generated endless songs in the app: the code of every live build step, as the player builds it, and reports Strudel evaluation errors; it also opens each song from the song menu and reports page errors. For… |
| `tools/check-endless.mjs` | `npm run check:endless` | Node | Checks for the endless director and style recipes (docs/ENDLESS.md, docs/STYLES.md). |
| `tools/check-export.cjs` |  | dev server, Chrome | Browser checks for the fast export (#8): songs export faster than real time with the timeline next to them, the fast and the real time files of the same song agree (length, loudness, low and high bands, loudness over… |
| `tools/check-export.mjs` | `npm run check:export` | Node | Checks for the fast export (#8): time from the tempo map, code segments of live build songs, the timeline, formats and the Export display. No browser. |
| `tools/check-functions.mjs` | `npm run check:functions` | Node | Checks for song functions (song-functions). No browser. |
| `tools/check-guide.mjs` | `npm run check:guide` | Node | Checks that the Guide (#48, src/guide.js) covers the app: every tab in the page has a card (or an exemption with a reason), every console command is named in the Radio card, every guide text has English and Italian, and… |
| `tools/check-hand.cjs` |  | dev server, Chrome | Browser checks for hand live coding (#20) in Compose, on Primo Segnale (a song with its own steps). |
| `tools/check-idea-errors.mjs` |  | Node | Small bad songs for the idea validator (idea-model, #70): each one must fail with an error at the expected JSON path and a message that names the problem. Run by npm run check:songs after the songs. No browser. |
| `tools/check-idea-writer.mjs` | `npm run check:ideas` | Node | Unit cases for the idea writer (idea-model, #70): writeIdea, expandIdea, ideaLadder and the shortest exact forms, for every kind of idea, in 4/4 and 7/8. No browser (the events themselves: tools/check-ideas.cjs). |
| `tools/check-ideas.cjs` |  | dev server, Chrome | Event-equivalence check of the idea model (idea-model, #70, design D8): for every song in songs/ and songs/examples/, the code saved before the change (tests/snapshots/code-before-ideas/.strudel) and the code the… |
| `tools/check-knowledge.mjs` | `npm run check:knowledge` | Node | Checks the knowledge base in docs/knowledge/ (knowledge-base, #74, design D5). No browser. |
| `tools/check-levels.cjs` |  | dev server, Chrome | Plays every scene of the given tracks and prints errors, per-instrument peak levels and the peak of the master output. The output peak (out=) is the hard limit: above 1.0 it clips and the run fails. in= is the level… |
| `tools/check-library.cjs` |  | dev server, Chrome | Browser checks for the Styles and Artists tabs (#35). |
| `tools/check-live-code.mjs` | `npm run check:live-code` | Node | Checks for the code a live build shows (code-writing): Classic and Crescendo keep their code (a fingerprint of the code at every step of some songs, per profile), comment options and presets. No browser. |
| `tools/check-live.cjs` |  | dev server, Chrome | Browser checks for the live output (#52): the broadcast window draws the picture of the radio playing in the app, the control room sees the app and the window (state, beat, pictures), presets with TAKE move the picture… |
| `tools/check-live.mjs` | `npm run check:live` | Node | Checks for the live output (#52): preset areas inside the picture without overlap, transitions between views, the beat's staleness, and the OBS client (challenge answer, identify, requests, errors) against a fake OBS.… |
| `tools/check-material.mjs` | `npm run check:material` | Node | Checks for the material generator (material-generator, #71; docs/ENDLESS.md "Material"). No browser. |
| `tools/check-modes.cjs` |  | dev server, Chrome | Browser checks for the two modes (#42): Listen and Groove Lab, their tabs, memory per mode, the old remembered tab, a link across modes, code and settings in both modes, phone width. |
| `tools/check-patterns.cjs` |  | dev server, Chrome | Browser checks for the Patterns tab (pattern-library, #72): the tab and its groups, play and stop, a key change that keeps the loop going, the beat, styles that use a pattern, New and Save, Save as pattern from Compose,… |
| `tools/check-patterns.mjs` | `npm run check:patterns` | Node | Checks for the patterns store and catalogue (pattern-library, #72). No browser. |
| `tools/check-player.cjs` |  | dev server, Chrome | Browser checks for the player bar and the global volume (#32). |
| `tools/check-playlists.cjs` |  | dev server, Chrome | Browser checks for playlists (#36): favourites migration, "+ Playlist", the Playlists tab, auto-advance, shuffle, repeat one, export and import, phone width. |
| `tools/check-playlists.mjs` | `npm run check:playlists` | Node | Checks for playlists (#36): store, migration of the old favourites, play queue, export and import. No browser. |
| `tools/check-pool.mjs` | `npm run check:workers` | Node | Worker processes for the slow checks (faster-checks). No browser. runPool(module, tasks) hands tasks (one song, one check) to worker processes that import the module once and call its runTask(task); the results come… |
| `tools/check-profiles.mjs` | `npm run check:profiles` | Node | Checks for performance profiles and code comments (performance-profiles). No browser. |
| `tools/check-radio-profiles.mjs` | `npm run check:radio-profiles` | Node | Checks for profiles in the radio (radio-profiles). No browser. Radio fixtures (tests/snapshots/radio-growth.json): hashes of the radio items of three sessions in Classic (styles, an artist, a compilation), as the radio… |
| `tools/check-radio.cjs` |  | dev server, Chrome | Browser checks for the radio (#22): tab, controls, determinism against the director, song changes, options from the next song, exclusive playback, history, save, open in Compose, replay. |
| `tools/check-random.cjs` |  | dev server, Chrome | Browser checks for the random tools (#50): radio dice (artist with Keep, styles, genre, knobs in range, sounds), the random artist in the Artists tab (Keep, Again, Discard), random style and genre in the radio. |
| `tools/check-random.mjs` | `npm run check:random` | Node | Checks for the random tools (#50): random artists are valid and repeatable, random styles and knobs stay in their limits, the sounds die changes the instruments and nothing else. No browser. |
| `tools/check-recording.cjs` |  | dev server, Chrome | Browser checks for recording the radio (#30): record, pause without gaps, skip into the track list, stop and download audio, track list and recipe; record a session again from its start. |
| `tools/check-sessions.cjs` |  | dev server, Chrome | Browser checks for radio sessions in playlists (#38): add the session on air, the warning for an older director, play a session in a playlist and move on, freeze, export with the session. |
| `tools/check-settings.cjs` |  | dev server, Chrome | Browser checks for the settings page (#31): gear, theme and language, radio defaults, export format (Opus export of a short song), backup export and import, reset. |
| `tools/check-song-filter.mjs` | `npm run check:song-filter` | Node | Checks for song tags, search, filters and sorting of the Songs tab (#34), without a browser. |
| `tools/check-song-pages.cjs` |  | dev server, Chrome | Browser check of the Songs tab pages and filters (#67): pages of 20 after filtering, search across pages, build style filter, never played, the counter. Usage: PLAYWRIGHT_CORE=... node tools/check-song-pages.cjs… |
| `tools/check-songs-tab.cjs` |  | dev server, Chrome | Browser checks for the Songs tab (#34): search, filters, favourites, sorting, tag editing, previous and next, delete, the trash and the Test chip (#68), the trash icon on every card and hidden built-in songs (D3b). |
| `tools/check-soul-display.cjs` |  | dev server, Chrome | Browser checks for the Soul display (#46, phase 2): hidden screw and "soul" show the tab, OPEN and the question, the display's controls, shell selector, override with the SCART cable (the stage shows the soul), cable… |
| `tools/check-soul.cjs` |  | dev server, Chrome | Browser checks for the song soul scene (#46): the visual dropdown, the soul of the song on air, every view draws and moves, HW amber, analyzing on a new song, recalibrating on steering, lock, full screen. |
| `tools/check-soul.mjs` | `npm run check:soul` | Node | Checks for the song soul data (#46): same song, same soul; radio souls follow the director; every built-in song gives a soul the views can draw; steering changes the soul. No browser. |
| `tools/check-sound-guard.mjs` | `npm run check:sound-guard` | Node | Checks for the sound guard (#54): the register of broken sounds and its stand-ins, the error kinds it learns, zone learning from a font file, the sound wrapper and the decode guard. No browser. |
| `tools/check-sound-names.cjs` |  | dev server, Chrome | Checks every sound the app's songs can call by name (#54): the built-in songs, and songs generated for every style recipe and every artist, are compiled to Strudel code; every sound, drum machine hit (bank + hit) and… |
| `tools/check-sounds.cjs` |  | dev server, Chrome | Checks every sound the app can call (#54): every zone of every General MIDI soundfont font, and every sample of every sample bank in the app's sound map, fetched and decoded in the browser. A broken part is "covered"… |
| `tools/check-spoken-play.cjs` |  | dev server, Chrome | Voice instrument in the browser (voice-instrument, #39): the example song plays every section without an evaluation error, its spoken lines are heard on the fx analyser, the master output stays below clipping… |
| `tools/check-spoken.mjs` | `npm run check:spoken` | Node | Checks for the voice instrument (voice-instrument, #39): spoken tracks and their lines, the four ways to speak, the narrator that yields, the poetic narrator, texts and speakers, the growth and the director. No browser. |
| `tools/check-steering.cjs` |  | dev server, Chrome | Browser checks for radio steering (#24): console commands queue and apply at their bar, cancel, the energy curve drag, the mixer, the scope switch, shortcuts, length commands and replay with steering; Vary and Swap with… |
| `tools/check-strudel.mjs` | `npm run check:strudel` | Node | Checks the code the app generates against the catalog of the installed Strudel (strudel-catalog, #69, design D5). No browser. |
| `tools/check-style-sounds.cjs` |  | dev server, Chrome | Checks that every sound and drum machine named by the style recipes is in the app's loaded sound map. |
| `tools/check-transitions.cjs` |  | dev server, Chrome | Browser checks for transitions in the radio (#23): for each kind, the radio plays through the end of a song into the next one without evaluation or page errors, with the master output below clipping (level-headroom: a… |
| `tools/check-trash.mjs` | `npm run check:trash` | Node | Checks for the song trash (#68): move to the trash, restore, delete for good, empty, purge after 30 days, days left, merge of two trashes, hidden built-in songs (D3b). No browser, fixed dates. |
| `tools/check-typing.mjs` | `npm run check:typing` | Node | Checks for the typing of the code that types itself (live-typing): only the words that change are touched, a person's speed for small edits and faster for long ones, the last frame is the new code, a deadline is kept;… |
| `tools/check-video.cjs` |  | dev server, Chrome | Browser checks for the session video (#27): a song records a file with a video and an audio track at the chosen size, the code layout draws the code beside the stage, cancel saves nothing, the radio records a video with… |
| `tools/check-video.mjs` | `npm run check:video` | Node | Checks for the session video (#27): layout areas fill the frame without overlap, the soul panel keeps the soul screen's proportions, the recording format falls back to WebM, the title card modes. No browser. |
| `tools/check-worker.mjs` |  | Node | A worker process of tools/check-pool.mjs (faster-checks): imports the module named on the command line once, then runs each task it is sent with the module's runTask(task) and sends the result back. Not run by hand. |
| `tools/snapshot-code.mjs` | `npm run snapshot:code` | Node | Saves or checks the Strudel code generated for every song in songs/ (no browser needed). |
| `tools/snapshot-levels.cjs` |  | dev server, Chrome | Saves or checks peak levels per instrument for every scene of every built-in track (dev server on :5173). |
<!-- /generated -->

## Fixtures and versions

<!-- generated:fixtures -->
Fixtures and snapshots in the repo: `tools/fixtures/crescendo.json`, `tools/fixtures/live-code.json`, `tools/fixtures/live-coder.json`, `tests/snapshots/code`, `tests/snapshots/code-before-ideas`, `tests/snapshots/endless.json`, `tests/snapshots/levels.json`, `tests/snapshots/radio-growth.json`.
<!-- /generated -->

| Fixture | Guards | Rewrite only when | Then |
| --- | --- | --- | --- |
| `tests/snapshots/code/` | code of every built-in song | the code is meant to change | `npm run snapshot:code`, reason in the commit |
| `tests/snapshots/code-before-ideas/` | the reference of `check-ideas.cjs` | never | |
| `tests/snapshots/levels.json` | peaks per section and instrument | levels are meant to change | `node tools/snapshot-levels.cjs write <id>` |
| `tests/snapshots/endless.json` | radio songs per seed | the director is meant to change | `npm run check:endless -- --write-fixtures`, raise `DIRECTOR_VERSION` |
| `tools/fixtures/crescendo.json` | Classic and Crescendo steps | almost never | `npm run check:crescendo -- --write`, raise `CRESCENDO_VERSION` |
| `tools/fixtures/live-coder.json` | Live coder growth | growth shapes are meant to change | `npm run check:crescendo -- --write-fixtures`, raise `SHAPES_VERSION` |
| `tools/fixtures/live-code.json` | code shown by Classic and Crescendo | that code is meant to change | `npm run check:live-code -- --write` |
| `docs/strudel/coverage.json`, `inputs.json` | which Strudel functions the app writes | any input changed | `npm run catalog:strudel`, then `npm run knowledge` |

Example: you change the radio director. Run `npm run check:endless` (Node). If the seed fixtures move and the change is intended, rewrite them with `--write-fixtures` and raise `DIRECTOR_VERSION` in the same commit. Then start the dev server and run `node tools/check-radio.cjs` and `node tools/check-steering.cjs`.
