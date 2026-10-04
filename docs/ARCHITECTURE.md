# Architecture

Vanilla JavaScript ES modules served by Vite 8. No framework. Strudel runs inside the page through the `<strudel-editor>` web component from `@strudel/repl` 1.3.0.

## Modules

| Module            | Role                                                                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/main.js`     | Entry point. Track library, draft persistence, arranger UI, channel controls, sequencer, tabs, transport, WAV export, language and theme switches, custom samples loading |
| `src/music.js`    | Musical data (keys, chords, progressions, presets), `DEFAULT` scene state, `normalizeState`, `compileTrack`, `makeScene`, demo track                                      |
| `src/tracks.js`   | Built-in scene tracks and `reelFrom` (reel excerpts from a full track)                                                                                                    |
| `src/songs.js`    | `parseSong(code)`: reads `SECTIONS` and `TEMPO` lines into per-bar BPM, section map, `secondsAt`, `sectionAt`                                                             |
| `src/visuals.js`  | Canvas visuals, per-instrument levels and onsets from Strudel analysers                                                                                                   |
| `src/hardware.js` | Hardware theme: knobs bound to range inputs, activity LEDs                                                                                                                |
| `src/i18n.js`     | Italian and English strings, `t()` and `tx()`                                                                                                                             |
| `src/content.js`  | Lessons, sound library, references, hand-written tracks                                                                                                                   |
| `vite.config.js`  | Plugin serving `/samples/strudel.json` built from `public/samples/`                                                                                                       |

## Data flow

1. The library merges built-in tracks with the owner's saved tracks (`localStorage` key `coding-misk-library`). Saved copies of built-ins override them by id.
2. The track being edited (`T`) and the selected scene live in `coding-misk-draft`. `S` always points to the selected scene's state; every control reads and writes `S` through `data-path` attributes.
3. Any change calls `changed()`: mark dirty, recompile with `compileTrack`, `ed.setCode`, re-evaluate if playing (without stopping).
4. `playSong(sg, bar, mode)` stops, sets the editor code (with `setcpm` replaced by the start bar tempo), sets `scheduler.lastEnd = bar` to start from any bar, then evaluates.
5. The `transport()` loop runs every animation frame: applies the per-bar tempo with `scheduler.setCps`, handles section loop and end of track, follows the playing scene in the arranger, updates buttons, timelines and the master gain (0.6).

Modes: `track` (scene track from the arranger) and `free` (lessons, sounds, hand-written tracks).

## Strudel integration notes

- Audio worklets load on the first real mouse down. `initAudioOnce()` calls `initAudio()` inside the Play gesture so keyboard and scripted starts work.
- The REPL preloads only part of dirt-samples; the app calls `samples('github:tidalcycles/dirt-samples')` and custom samples from `/samples/strudel.json`.
- Globals used after load: `getAudioContext`, `getSuperdoughAudioController`, `getAnalyzerData`, `analysers`, `samples`, `initAudio`, `soundMap`.
- Master output node: `getSuperdoughAudioController().output.destinationGain`. Used for the master gain, WAV export (MediaRecorder on a MediaStreamDestination) and demo recording.

## Visuals

`startVisuals` reads every analyser in `window.analysers`, sums them into the waveform, and keeps a normalised level and onset detector per instrument id: `kick`, `snare`, `hats`, `fx`, `bass`, `guitar`, `arp`, `pad`, `hook`, `riser` (plus `1` for untagged code). Each scene function in `SCENE_DRAW` draws one theme; see `docs/DESIGN-SYSTEM.md`.

## Persistence keys

`coding-misk-library`, `coding-misk-draft`, `coding-misk-look`, `coding-misk-ui`, `coding-misk-lang`, `coding-misk-tab`.

## Recording a demo

`tools/record-demo.cjs` warms up samples, then records a scripted tour with a fake cursor overlay, capturing audio from the master node. Merge:

```sh
OFF=$(cat out/offset.txt)
ffmpeg -ss $OFF -i out/video.webm -i out/audio.webm -map 0:v -map 1:a -c:v libx264 -crf 20 -pix_fmt yuv420p \
  -af "alimiter=limit=0.89:level=false" -c:a aac -b:a 192k -shortest -movflags +faststart demo.mp4
```

Lessons from recording: clicking a native `<select>` opens a popup that swallows the next click (set the value programmatically and draw the click ripple yourself); controls below the 900 px fold cannot be clicked by coordinates; start playback with the top Play button.
