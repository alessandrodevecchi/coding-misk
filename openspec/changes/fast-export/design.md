# Design

## Context

The audio export records the master output with `MediaRecorder` while the song plays (#30, #31). Strudel 1.3 ships `renderPatternAudio`, which renders a pattern into an `OfflineAudioContext`, but it closes the live audio context and keeps one global context, node pools and caches in superdough: offline nodes could leak into live playback. The app changes tempo from outside the pattern (scheduler `setCps` at bar boundaries, from the song's tempo map) and swaps code at live build steps.

## Goals / Non-Goals

**Goals:** exports in seconds, same sound, four formats, playback untouched, safe fallback.

**Non-Goals:** offline video, encoder options.

## Decisions

- **Render in a hidden iframe.** A small render page (a second Vite entry) loads its own copy of Strudel (prebake: the same sample banks and soundfonts, plus the app's custom samples). Its superdough state and audio context are separate, so the live app is untouched and can keep playing. The page is created on the first export and kept for the next ones; sample files come from the browser cache.
- **Our own render loop, modelled on `renderPatternAudio`.** For each code segment (the whole song, or each live build step from its bar to the next step), evaluate the code with a Strudel `repl` that never starts, query the haps of the segment's bars, and call `superdough` in onset order. Time comes from the tempo map: a hap at cycle c starts at `secondsAt(c)`, lasts `secondsAt(end) − secondsAt(c)`, with `cps = bpm[bar] / 240`. Length: the song plus a 3 second tail. Polyphony is set high, since every voice is scheduled before rendering.
- **Progress** with `OfflineAudioContext.suspend()` every few seconds of audio while rendering; scheduling progress counts too. Cancel throws away the context.
- **Encoding:** WAV with the existing writer; FLAC, MP3 and Opus through Mediabunny (MPL-2.0) with its LAME and libFLAC encoder extensions and WebCodecs for Opus (Ogg). Loaded with a dynamic import only for those formats, so the app bundle does not grow.
- **Sessions:** a saved session is joined into one song with the existing join (the same as Mix), then rendered like a song.
- **Fallback:** any error in the iframe, or a missing feature (`OfflineAudioContext`, WebCodecs for Opus), falls back to the real time export with a toast. Real time also encodes to the chosen format, from the recorded WAV.
- **Settings:** format (WAV, FLAC, MP3, Opus) and speed (fast, real time). The old `opus` value of the format setting keeps working.

## Risks / Trade-offs

- [Offline and live sound differ (effects that depend on the clock, voice limits, the `cut` group)] → a check renders a few built-in songs both ways and compares length and per instrument levels; songs that differ go to real time until fixed.
- [First export is slow while samples decode in the iframe] → keep the iframe; show "Loading sounds" in the progress.
- [Long sessions use memory (about 23 MB per stereo minute while rendering)] → acceptable for sessions under an hour; warn above.
- [Mediabunny encoders add download size] → loaded only when used.
