# Architecture

Vanilla JavaScript ES modules served by Vite 8. No framework. Strudel runs inside the page through the `<strudel-editor>` web component from `@strudel/repl` 1.3.0.

## Modules

| Module            | Role                                                                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/main.js`     | Entry point. Track library, draft persistence, arranger UI, channel controls, sequencer, tabs, transport, WAV export, language and theme switches, custom samples loading |
| `src/music.js`    | Musical data (keys, chords, progressions, presets), `DEFAULT` scene state, `normalizeState`, `sceneLayers` (per-instrument code generator), `compileTrackV1` (reference), `makeScene`, demo track |
| `src/song/`       | Song format v2: `format.js` (types, `fromScenes` converter, `normalizeSong`, `clipState`), `compile.js` (`compileSong`), `validate.js` (`validateSong`), `rack.js` (rack devices: `DEVICES`, `rackCode`) |
| `src/endless/`    | Endless director (`docs/ENDLESS.md`): `random.js` (seeded streams), `recipe.js` (style recipes, validator), `mix.js` (parts per style, chaos), `shapes.js`, `energy.js`, `mutate.js`, `phrases.js`, `director.js` (`generateSession`), `join.js`. Pure modules: they run in Node (`tools/endless.mjs`) and in the browser |
| `src/radio/`      | Radio tab (`radio.js`, `createRadio`): controls, now playing card, history, and the stream of songs (window moved at each song end, next song generated at 40 % of the song on air). The player in `main.js` gives it `start`, `swap`, `jump`, `stop` |
| `src/songs.js`    | `parseSong(code)`: reads `SECTIONS` and `TEMPO` lines into per-bar BPM, section map, `secondsAt`, `sectionAt`                                                             |
| `src/sounds/`     | Sound browser: `catalog.js` (catalogue from superdough's `soundMap`, categories, audition code), `art.js` (SVG drawings rendered as pixel art), `photos.js` (free photos, credits in `public/sounds/photos/CREDITS.md`), `machines.js` (71 canonical drum machines), `browser.js` (UI) |
| `src/visuals.js`  | Canvas visuals, per-instrument levels and onsets from Strudel analysers                                                                                                   |
| `src/hardware.js` | Hardware theme: knobs bound to range inputs, activity LEDs                                                                                                                |
| `src/i18n.js`     | Italian and English strings, `t()` and `tx()`                                                                                                                             |
| `src/content.js`  | Lessons, sound library, references, hand-written tracks                                                                                                                   |
| `vite.config.js`  | Plugin serving `/samples/strudel.json` built from `public/samples/`                                                                                                       |

## Data flow

1. The library merges built-in tracks with the owner's saved tracks (`localStorage` key `coding-misk-library`). Saved copies of built-ins override them by id.
2. Built-in songs are the JSON files in `songs/` (loaded with `import.meta.glob`, validated, ordered by `songs/index.json`). Saved songs from older versions (scenes) are converted with `fromScenes` by `prepare()`.
3. The song being edited (`T`, format v2), the selected section `sel` and the selected track `tk` live in `coding-misk-draft`. The arranger shows one row per track, in two views of the same data: sections (a cell is a clip covering that section) and free timeline (clips positioned by bar, created, moved and resized with the pointer or the keyboard; `selClip` is the selected clip). The track panel is built per track (`panelHtml(i)` inside a `[data-ptrk]` host, element ids prefixed `p<i>_`), so the full view can show many at once; any action inside a panel first selects that track. It edits the selected track: its settings (for the whole track, or only the selected section through the clip's `set`), its patterns and which pattern plays in the selected section.
4. Any change calls `changed()`: mark dirty, recompile with `compileSong`, `ed.setCode`, re-evaluate if playing (without stopping). Muted tracks, and non-solo tracks when any track is soloed, are left out of the code.
5. `playSong(sg, bar, mode)` stops, sets the editor code (with `setcpm` replaced by the start bar tempo), sets `scheduler.lastEnd = bar` to start from any bar, then evaluates.
6. The `transport()` loop runs every animation frame: applies the per-bar tempo with `scheduler.setCps`, handles section loop and end of track, follows the playing section in the arranger (not while a field of the song is being edited), updates buttons, timelines and the master gain (0.6).

Modes: `track` (song from the arranger) and `free` (lessons, sounds, hand-written tracks).

## Strudel integration notes

- Audio worklets load on the first real mouse down. `initAudioOnce()` calls `initAudio()` inside the Play gesture so keyboard and scripted starts work.
- The REPL preloads only part of dirt-samples; the app calls `samples('github:tidalcycles/dirt-samples')` and custom samples from `/samples/strudel.json`.
- Globals used after load: `getAudioContext`, `getSuperdoughAudioController`, `getAnalyzerData`, `analysers`, `samples`, `initAudio`, `soundMap`.
- Master output node: `getSuperdoughAudioController().output.destinationGain`. Used for the master gain, WAV export (MediaRecorder on a MediaStreamDestination) and demo recording.

## Visuals

`startVisuals` reads every analyser in `window.analysers`, sums them into the waveform, and keeps a normalised level and onset detector per instrument id: `kick`, `snare`, `hats`, `fx`, `bass`, `guitar`, `arp`, `pad`, `hook`, `riser` (plus `1` for untagged code). Each scene function in `SCENE_DRAW` draws one theme; see `docs/DESIGN-SYSTEM.md`.

## Persistence keys

`coding-misk-library`, `coding-misk-draft`, `coding-misk-look`, `coding-misk-ui`, `coding-misk-lang`, `coding-misk-tab`, `coding-misk-code-w` (code panel width), `coding-misk-code-collapsed`, `coding-misk-panel` (track panel view: `one`, `all` summary or `full`), `coding-misk-arr-mode` (arranger view: `sections` or `timeline`), `coding-misk-snd-view` (sound browser view), `coding-misk-favs` (favourite sounds), `coding-misk-live` (live build switch for songs without steps).

## Recording a demo

`tools/record-demo.cjs` warms up samples, then records a scripted tour with a fake cursor overlay, capturing audio from the master node. Merge:

```sh
OFF=$(cat out/offset.txt)
ffmpeg -ss $OFF -i out/video.webm -i out/audio.webm -map 0:v -map 1:a -c:v libx264 -crf 20 -pix_fmt yuv420p \
  -af "alimiter=limit=0.89:level=false" -c:a aac -b:a 192k -shortest -movflags +faststart demo.mp4
```

Lessons from recording: clicking a native `<select>` opens a popup that swallows the next click (set the value programmatically and draw the click ripple yourself); controls below the 900 px fold cannot be clicked by coordinates; start playback with the top Play button.

## Live build

A song with `build` steps (`src/song/build.js`) is played by state: `stateAt(song, bar)` applies the steps up to that bar, and the playable object gets `codeAt(bar)` (compiled state with the latest comment as `// > …`). `playSong` loads the code of the starting bar. During playback `transport()` calls `liveBuild()`: during the bar before the next step it animates the editor from the current code to the next one (`src/song/typing.js`: unchanged lines stay, changed lines are edited in place, new lines typed), keeps the edit in view, then evaluates just before the step's bar so the change sounds on the beat. The comment of the latest step shows over the stage (`#say`). Track buses are assigned before muted tracks are skipped, so a track coming in later does not move the others.

The "Live build" switch (`coding-misk-live`) gives songs without steps a derived build (`deriveBuild`): add and remove only at clip edges, removals delayed past a section's fade, so the audio does not change. `buildMap` gives the timeline the silent spans and the step marks of each track.

Pinned settings: `stateAt` restores a track's own value for every key in `track.pinned` after applying the steps. In the panel, a pin next to a knob shows when steps change that value; changing it pins it (`setSetting`), clicking the pin releases it. Voice pitch and tempo are independent: `speed` sets the length and `stretch` (Strudel's phase vocoder) corrects the pitch.

Spoken comments: `tools/voice.mjs` writes `public/samples/say_<lang>/<slug>.wav` with macOS `say` (git-ignored). The custom samples manifest maps them to `s("say_en").n(k)`; `voiceCode` adds a one-shot layer masked to the step's bar with the settings and rack of the step's voice track (taken from the state at that bar; `compileSong` skips voice tracks), and `playSong` loads every voice sample silently first. A step is evaluated when the scheduler's `lastEnd` is about to reach its bar, so the first hit of the bar already comes from the new code.

## Endless director

`generateSession(recipes, options)` returns `{ session, songs }`: plain v2 songs with `build` steps, so the player, the live build engine, the voice track and the exporter play them unchanged. For each song the director plans parts, tempo, key, sections and candidate tracks, then walks phrase boundaries: it applies candidate moves to a copy of the steps, measures the result with `stateAt` and `energyOf`, and keeps the move closest to the target energy. All randomness comes from named seeded streams, never `Math.random`. `tools/endless.mjs` writes songs to `songs/endless/` (git-ignored); the library picks them up through the `songs/**` glob, which skips `session.json`. The radio view (`#22`) will call the same functions in the browser.

## Artists and styles tabs

`src/library/styles-tab.js` and `src/library/artists-tab.js` (shared helpers in `src/library/library.js`) list built-ins (`styles/*.json`, `artists/*.json`, read-only, loaded with `import.meta.glob`) and the user's items (browser storage `coding-misk-styles`, `coding-misk-artists`), show sheets, and edit with a form and a JSON view validated by `validateRecipe` and `validateArtist`. The radio's `RECIPES` array is refilled in place with the built-ins plus the user's valid styles whenever they change. The radio's artist picker sends the whole artist to the director (`next({ artist })`), which draws each song's options from it; Compose's "New song from artist" calls `createSession(RECIPES).next({ artist })` and opens the song unsaved. Portraits come from `src/endless/portrait.js` (16x16 from a seed and a palette).

The Songs tab (`#34`) shows every song in one list. `src/library/song-filter.js` is pure (search with accents folded in both languages, chip groups combined with OR inside a group and AND between groups, sorting, kind labels, genres from styles) and is checked in Node by `npm run check:song-filter`. `src/library/songs-view.js` draws the search bar and chips, hides and reorders the existing cards instead of rebuilding them, and keeps the view (`coding-misk-songs-view`) and the favourites (`coding-misk-favourites`, a list of song ids) in browser storage. Style tags store recipe ids and take their names from the current style list; renaming a user style's id updates the tags of the user's songs. The player bar's previous and next follow the visible order. Browser check: `tools/check-songs-tab.cjs`.

Playlists (`#36`): `src/library/playlists.js` holds the store (`coding-misk-playlists`; Favourites is the fixed first list, the star writes to it, and the `#34` key `coding-misk-favourites` is migrated once), the play queue (`createQueue`: order, shuffle with every song once, repeat off, all or one, skipping songs no longer in the library) and the export file (`coding-misk/playlist`, with copies of the user's songs). `npm run check:playlists` checks it in Node. `src/library/playlists-tab.js` is the Playlists tab (reorder by drag or up and down, rename, delete with a second press, export and import). In `src/main.js` the transport's end of song calls `advance()`: the queue's next song, the same song with repeat one, or a stop; previous and next use the queue while it plays; shuffle and repeat sit in the player bar and are kept as `coding-misk-shuffle` and `coding-misk-repeat`. Browser check: `tools/check-playlists.cjs`.

Transitions (`#23`): `src/endless/transitions.js` plans a transition per pair of songs (`planTransition`, with the director's `transition` random stream and the artist's `transitions` weights, or the radio's override) and writes it where two songs meet (`transitionParts`: sections of the overlap or interlude, extra tracks, build steps). `windowSong` and `joinSession` (`src/endless/join.js`) apply it; `layout` places songs on the stream (overlaps start the next song early, interludes lengthen the current one, a skip cuts). The radio has "Transitions" and "Harmony" menus. Playlists with the player bar's "Mix" switch play saved songs through the same window: `absoluteClips` places section clips by bars, `playlistTransition` makes an 8-bar mix (or a cut over a big tempo jump), and `mixTick` moves the window when the next song comes on air; code songs cut. Browser check: `tools/check-transitions.cjs`.

Steering (`#24`): `session.next()` also returns the song's plan and options; the radio keeps them on each stream item with the commands given to that song. `src/endless/steering.js` (`steerSong`) rebuilds the song from the original plan plus every command, in order, through `directSong`'s `keep`, `from`, `forced` and `locked` inputs, with named random streams per command; `applyBar` and `canApply` drive the console. The radio's console (groups of commands, queue with cancel, scope switch, mixer strip, shortcuts) and the draggable energy curve live in `src/radio/radio.js`; every command rewrites the song on air and swaps the window, and is recorded in `recipe.steering` for replay. Steps from the listener carry `by: "listener"` and show as `// you:` in the code. Browser check: `tools/check-steering.cjs`.

Versions written by hand (`#33`): "Save as a new version" (in the code column while coding by hand, and under the last code by hand) stores the editor's code in `user.codeSongs` as a code song (`{ id: "v-…", title: "Song · v2", code, from, fromTitle, version, style, tags, look }`); `codedTracks()` lists them after the built-in code songs, the original's card links its versions, and a version can be deleted. In the radio the code is cropped to the song on air with `src/song/crop.js` (`cropCode`: sections, tempo map and every section lane keep only the song's bars).

Settings (`#31`): the gear in the top bar opens `#tab-impostazioni` (`src/settings/settings.js`): theme and language (also still in the top bar), the radio's visual (`coding-misk-radio-look`), volume, export format (`coding-misk-export-format`: WAV decoded after recording, or Opus straight from `MediaRecorder`), the radio's defaults (through `radio.setOption`) and the data: "Export everything" writes every `coding-misk-*` key except working state into one backup file (`src/settings/backup.js`), "Import" merges it (songs, versions, playlists, styles, artists added or replaced by id, settings taken from the file) and reloads, "Reset everything" clears the keys after a second press. Checks: `node --no-warnings tools/check-backup.mjs`, `tools/check-settings.cjs`.

## Player bar and volume

The bottom bar (`#pbar`) holds `#play` and `#stop` (moved from the top bar with their handlers), previous and next, title and position, ON AIR, volume and mute. `renderPlayerBar()` runs in `transport()` and redraws only when its text changes. Previous and next walk the Songs tab order (`libraryCards()`) and play the neighbour if music was playing; in the radio they call `radio.restart()` and `radio.skip()`.

The volume is a `GainNode` inserted once between superdough's `destinationGain` and the audio destination (`applyVolume`, checked every frame like `MASTER`). The WAV recorder taps `destinationGain`, before the volume, so exports keep their level. Keys: `coding-misk-volume` (0 to 100), `coding-misk-muted`.

## Hand live coding

A keystroke that edits (or a paste, cut or drop) in `#edhost` during a live build sets `hand` (`takeOver`). By hand `transport()` skips `liveBuild()`, the comment overlay, the stop at the end and `radio.tick()`; the tempo map goes on. `changed()` recompiles the song without touching the editor. Resume (`resumeHand`) keeps the editor code in `lastHand` (session storage, "Your last code" block). With "from where I was" (`coding-misk-hand-from`, default on) `resumeBuild()` types back to the song's code at `handFrom`, the bar of the takeover, and on the next bar plays the song from there (`playSong`); otherwise it types back to `codeFor(song, bar)` and evaluates on the next bar, and past the end of a song in Compose plays from the top; in the radio `radio.afterHand(bar)` starts the next song when the song on air ended. Pause and resume keep the hand code (`playSong(..., { keepHand: true })`); any other playback, skip or stop leaves the hand mode.

## Radio

The radio is a third player mode, `radio`, next to `track` and `free`. It plays a window song (`windowSong`: the song on air and the next one, on absolute stream bars), so the scheduler never restarts. `transport()` calls `radio.tick(cyc)` every frame and, in radio mode, does not stop at the end of the window. The radio:

- generates the next song in an idle callback once the song on air has played 40 % of it, then hands the player a new window (`swap`: steps already played are not repeated);
- moves the window when a song ends, and adds the new song to the history;
- on skip, cuts the song on air at the next bar and evaluates the new window at once (`jump`).

Starting any other playback, the header pause or stop, or "open in Compose" stops the radio: they share one editor and scheduler. Recipes reach the browser through `import.meta.glob('../styles/*.json')`; invalid ones are left out. Browser storage keys: `coding-misk-radio` (controls), `coding-misk-radio-history` (last 50 songs with their JSON and session recipe).

## Sound browser

`buildCatalog(soundMap, customBanks)` reads every loaded sound. Keys in `soundMap` are lowercase and drum machines also have aliases (`tr909_bd` next to `rolandtr909_bd`): only the 71 canonical machines of `machines.js` are kept. Sample banks keep loading after start-up (the full dirt-samples archive arrives a few seconds later), so the browser re-reads the catalogue every second until it stops growing. Pads play one shot through `superdough()`; cards and lists play a looping audition through the editor. "Use" sets the kit of a drums track, the sound of a bass, arp, hook or pad track, or the sample of a texture track (the selected track first, otherwise the first suitable one).

"Machine groove" (`grooveCode`) plays every sound of a drum machine in 4 bars: bars 1-2 the basic beat (kick, snare or clap, hats), bars 3-4 every other sound in its usual role (crash, ride, clap, tambourine, rimshot, cowbell, percussion, shaker, misc, effects), and a tom fill from high to low at the end of bar 4. Each line of the code carries a comment with its role. Variants are left out; the browser loads every sound of the machine before it starts, so the one-shot crash and fill are not skipped as late. While anything plays, the chip, card, row or pad of each sound lights up on every hit: each animation frame queries the scheduler's pattern for the hits since the previous frame.
