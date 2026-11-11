## Why

Every pattern line of the code the app writes starts with `$:`, Strudel's anonymous label. Strudel also accepts a name as the label (`kick: s("bd*4")`), which reads like a live coder's own code and tells the listener which instrument a line plays. The owner wants that form as an option next to the comments, and wants the code to stay varied: `$:` as today or the instrument's name, chosen at random per song, and configurable.

## What Changes

- **New code option "Instrument name"** next to Comments: Random per song (default), `$:` (anonymous), Name at line start. It is part of the song's configuration and of every profile; it changes only how the code looks.
- **Names.** A line takes the name of the visual it lights (`kick`, `snare`, `hats`, `bass`, `pad`, `arp`, `hook`, `guitar`), `crash` for a crash, the track's type for other `fx` lines (`texture`, `riser`), `voice` for spoken samples, else the track's header. Names are lower case and unique in the code shown (`kick`, `kick2`), never a reserved word. A muted line is `_kick:`, a line alone is `Skick:`.
- **Random per song.** The form is drawn from the song's id, so the same song always looks the same, in Compose, in the radio and on replay. A song may carry its own `lineNames`.
- **Same song.** The growth, the radio steering and the written part's plan are measured on `$:`, so both forms grow and play the same notes.
- **Readers.** Every place that reads pattern lines (mute and solo marks, typing, code widgets, Code over, video, code themes, the Decode line count, the radio's songs off air) reads both forms through one module, `src/song/line-names.js`.

## Capabilities

### New Capabilities

- `live-build/line-names`: the Instrument name option, the names, Random per song, the same events in both forms.

### Modified Capabilities

None in `openspec/specs/`.

## Impact

- **Code:** new `src/song/line-names.js`; `src/live/live-code.js` (names the code shown), `src/main.js` (the song as written, the option), `src/live/profiles.js` (control `names`), `src/live/air-code.js` (songs off air keep `$:`), `src/song/crescendo.js` and `src/endless/waypoints.js` (measured on `$:`), the readers in `src/song/`, `src/live/`, `src/widgets/`, `src/video/`, `src/code-themes/`, `src/decode/tab.js`, `src/music.js`; `index.html`, i18n, Guide.
- **Checks:** new `check:line-names` (Node) and `tools/check-line-names.cjs` (browser). Fixtures that fingerprint the code shown move for the songs Random names (`check:live-code`); the sound fixtures do not.
- **Prototype:** on `feat/82-line-names`, not merged until the owner reviews it.
