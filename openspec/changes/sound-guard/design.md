## Context

Strudel's soundfont loader decodes each zone with a success callback only. A decode failure leaves the promise pending: live, the note is silent; in the render page, the scheduler awaits it and the fast export stalls. The render page already has an 8 s time limit per sound (a backstop) and a static list of two broken parts. Sounds are registered in superdough's sound map (a nanostores map), which both the app and the render page use.

## Goals / Non-Goals

**Goals:** no stall and no hang from a broken sound; automatic stand-ins; a register that learns; an export that lists replaced sounds; a check tool for the whole library.

**Non-Goals:** sibling drum machine fallbacks and drum panel notes (rest of `#54`); patching Strudel itself (a report upstream is planned separately).

## Decisions

- **Decode guard.** A wrapper on `decodeAudioData` turns a failure into a normal error when the caller gave no error callback (the soundfont loader's case). The loader then rejects with "no soundfont buffer". This is generic and needs no copy of Strudel's loader.
- **Sound wrapper.** Every registered soundfont and sample sound is wrapped once (a listener on the sound map wraps new entries): before playing, the value is mapped through the register (font or sample index); when playing rejects with a load error (decode, unreadable font file), the part is learned and the note is tried once more with the stand-in. For a soundfont the wrapper reads the font file (from the browser cache) to learn the broken zone's key range, so one failure covers the whole zone.
- **Register.** Static list (today's two parts) plus learned entries in `localStorage`, keyed by the soundfonts package version. The render page runs in the same origin and reads the same register.
- **Pre-flight.** The render page collects distinct values (sound, bank, index, and MIDI note for soundfonts) from the block's haps and plays each one at a time past the block's end (never heard), several in parallel, with a time limit. Learned stand-ins and the skipped list come before the render.
- **Preload.** When the radio has the next song, every zone of the first font of each soundfont in its code gets one silent note, one at a time with a short pause. A first try in the hidden render page held the main thread for 1.7 s (late notes live), so the preload stays in the page and lets decoding run off the main thread. Samples are not preloaded: a broken sample is learned at its first note.
- **Check tool.** `tools/check-sounds.cjs` in the browser: every soundfont zone decoded, every sample URL fetched and decoded; prints a summary and exits non-zero on uncovered breaks. It is long but runs unattended.

## Risks / Trade-offs

- A first broken note live is late by its load time when replayed with the stand-in; it is skipped if its time has passed.
- Wrapping sounds changes `onTrigger` for all of them; the wrapper must be transparent (same return value) and cheap.
- A slow network is not a broken sound: only decode and parse errors are learned.
