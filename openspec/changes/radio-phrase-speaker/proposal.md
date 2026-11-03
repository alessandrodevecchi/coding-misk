## Why

A phrase of mine said by a voice with its own speaker (phrase-any-voice) gets that speaker's sample in Compose. In the radio it keeps the default voice's sample, because the radio never asks for the speaker's sample when the default voice already has the text (`#82`, owner request of 2026-11-04).

## What Changes

- **Samples asked in the radio.** The radio's next song and the song on air ask the voice helper for the speaker's sample of every phrase of mine they say, also when the default voice's sample exists, as Compose does. Built-in lines keep the current rule: a sample is asked only when no voice has the line.
- **Spoken with the speaker.** Once the speaker's sample exists, the radio plays the phrase with it. This already happens when the sample exists: the window's code and the preload take the speaker's bank first.
- **Preload.** A speaker's sample that arrives after the next song was preloaded is queued for it at once, so it is loaded before the next song's first bar.
- **Fallback unchanged.** Without the speaker's sample (no voice helper, the helper failed, or the sample is not made yet) the default voice says the phrase, with the existing `[voice] … no sample in …, the default voice speaks it` note.
- **Unchanged.** The speaker of a role (the narrator's, the voice track's), the director's draws, a phrase with one kind spoken by the default speaker, typed lines, built-in lines.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `endless/radio-voice`: phrases of mine are spoken in the radio with the speaker of the voice that says them, with the default voice as the fallback, and their samples are loaded ahead.

## Impact

- Changed: `src/radio/radio.js` (`needs`, `samplesArrived`), `src/main.js` (`needsOf` uses the shared rule), `src/song/build.js` or `src/voices/samples.js` (one pure rule for which missing lines to ask).
- Checks: `tools/check-phrases.mjs` (Node), `tools/check-voice-preload.cjs` (browser, optional speaker step).
- Data: none. Director draws, session recipes and endless fixtures do not change; `DIRECTOR_VERSION` stays.
