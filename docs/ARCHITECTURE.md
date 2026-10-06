# Architecture

Vanilla JavaScript ES modules served by Vite 8. No framework. Strudel runs inside the page through the `<strudel-editor>` web component from `@strudel/repl` 1.3.0.

## Modules

| Module            | Role                                                                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/main.js`     | Entry point. Track library, draft persistence, arranger UI, channel controls, sequencer, tabs, transport, WAV export, language and theme switches, custom samples loading |
| `src/music.js`    | Musical data (keys, chords, progressions, presets), `DEFAULT` scene state, `normalizeState`, `sceneLayers` (per-instrument code generator), `compileTrackV1` (reference), `makeScene`, demo track |
| `src/song/`       | Song format v2: `format.js` (types, `fromScenes` converter, `normalizeSong`, `clipState`), `compile.js` (`compileSong`), `validate.js` (`validateSong`), `rack.js` (rack devices: `DEVICES`, `rackCode`) |
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

`coding-misk-library`, `coding-misk-draft`, `coding-misk-look`, `coding-misk-ui`, `coding-misk-lang`, `coding-misk-tab`, `coding-misk-code-w` (code panel width), `coding-misk-code-collapsed`, `coding-misk-panel` (track panel view: `one`, `all` summary or `full`), `coding-misk-arr-mode` (arranger view: `sections` or `timeline`), `coding-misk-snd-view` (sound browser view), `coding-misk-favs` (favourite sounds).

## Recording a demo

`tools/record-demo.cjs` warms up samples, then records a scripted tour with a fake cursor overlay, capturing audio from the master node. Merge:

```sh
OFF=$(cat out/offset.txt)
ffmpeg -ss $OFF -i out/video.webm -i out/audio.webm -map 0:v -map 1:a -c:v libx264 -crf 20 -pix_fmt yuv420p \
  -af "alimiter=limit=0.89:level=false" -c:a aac -b:a 192k -shortest -movflags +faststart demo.mp4
```

Lessons from recording: clicking a native `<select>` opens a popup that swallows the next click (set the value programmatically and draw the click ripple yourself); controls below the 900 px fold cannot be clicked by coordinates; start playback with the top Play button.

## Sound browser

`buildCatalog(soundMap, customBanks)` reads every loaded sound. Keys in `soundMap` are lowercase and drum machines also have aliases (`tr909_bd` next to `rolandtr909_bd`): only the 71 canonical machines of `machines.js` are kept. Sample banks keep loading after start-up (the full dirt-samples archive arrives a few seconds later), so the browser re-reads the catalogue every second until it stops growing. Pads play one shot through `superdough()`; cards and lists play a looping audition through the editor. "Use" sets the kit of a drums track, the sound of a bass, arp, hook or pad track, or the sample of a texture track (the selected track first, otherwise the first suitable one).

"Machine groove" (`grooveCode`) plays every sound of a drum machine in 4 bars: bars 1-2 the basic beat (kick, snare or clap, hats), bars 3-4 every other sound in its usual role (crash, ride, clap, tambourine, rimshot, cowbell, percussion, shaker, misc, effects), and a tom fill from high to low at the end of bar 4. Each line of the code carries a comment with its role. Variants are left out; the browser loads every sound of the machine before it starts, so the one-shot crash and fill are not skipped as late.
