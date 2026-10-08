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
