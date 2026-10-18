## Why

Today a voice in a song only narrates: a voice track speaks the comment of a build step, once, on the step's bar (#39). Reference live coders also use speech as music: a line spoken just before an instrument enters, a spoken refrain repeated in the quiet parts while the code hardly changes, a word chopped and repeated in time, a spoken opening over a drone. Live builds cannot open with a voice today because voice tracks stay out of the growth (`docs/VARIETY.md`).

## What Changes

- **Voice instrument.** A new kind of track whose spoken lines are part of the music. It is separate from the narrator: the narrator keeps explaining build steps; the voice instrument plays in the normal song, in exports and in the live build.
- **Four ways to speak:**
  - **entry line:** a line that ends just before an instrument comes in;
  - **refrain:** a short line repeated in the quiet parts of the song;
  - **chop:** a phrase cut into slices and repeated in time, as a rhythmic part;
  - **opening:** a spoken line that opens the song (used by the `voice` opening of `growth-shapes`).
- **Effects.** The voice instrument uses the voice settings and characters the narrator already has (pitch, tempo, filters, drive, reverb, delay, rack devices), plus slicing for chops.
- **Texts.** Written by the song, given by the style, or generated from a small vocabulary of words and short phrases. Only public domain or our own texts.
- **Offline samples.** Lines are spoken by the existing speakers in English and Italian and made in advance with `npm run voices`; nothing is generated or fetched at play time.
- **The director may add one.** A style may give the voice instrument a weight; the director then adds it to some songs.
- **Sung vocals stay in #3.**

## Capabilities

### New Capabilities

- `song/voice-instrument`: the voice instrument track, its four ways to speak, texts and vocabulary, effects, samples made offline, its place in the live build and in the director, and how it stays apart from the narrator.

### Modified Capabilities

None in their requirements. The narrator (`endless/radio-voice`) keeps its behaviour; the rule that it yields to the voice instrument on the same bar is stated in the new capability.

## Impact

- **Code:** song format and validator (`src/song/format.js`, `src/song/build.js`) for the new track type and its lines; the compiler (sample lines with mask lanes, slicing, effects, an orbit apart from the narrator); `tools/voice.mjs` (collect the lines of songs, styles and the vocabulary); `src/endless/director.js` and recipes (a `spoken` part with weight and texts); the growth (the voice instrument may enter as a track).
- **Data:** `styles/*.json` (optional texts and weights), a vocabulary file in English and Italian, an example song in `songs/examples/`.
- **Checks:** `npm run check:songs`, `npm run check:endless` (fixtures and `DIRECTOR_VERSION` when styles get weights), a Node check for placement, browser level checks.
- **Docs:** `docs/SONG-FORMAT.md`, `docs/COMPOSING.md`, `docs/VOCALS.md`, `docs/ENDLESS.md`, Guide card, `DEVLOG.md`.
