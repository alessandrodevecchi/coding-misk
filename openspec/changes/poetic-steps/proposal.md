## Why

With the poetic narrator and Narrated growth on, the narrator says an image in the bar before each track comes in, and the technical step line at every other step ("open the filter", "more grit") (voice-full-controls D11). Images arrive only at the entries, most of them at the start, so the rest of the song sounds like the explaining narrator. The owner listened to D11 (2026-10-28) and asked for the fully poetic narrated growth that voice-full-controls kept for later (answer 82-3).

## What Changes

- **A poetic line of movement for the steps without an entry.** With the poetic style and Narrated growth, a step that brings no track in and would say its step line says a short image of movement instead ("the light shifts", "la luce si sposta"). Entry steps keep what D11 says today: the image in the bar before, the step line on the entry's bar.
- **A new group `move` in the poetic vocabulary** (`POETIC.move` in `src/song/vocabulary.js`), in English and Italian. A song's `narrator.lines.move` or its style's take its place, like the other poetic groups.
- **Samples with `npm run voices`.** The new lines are poetic texts, so `tools/voice.mjs` makes them for every narrator speaker; the samples stay git-ignored like the others.
- **One schedule.** The line goes through `narration()`, so the code, the radio's Coming next (V:N) and the sample warm-up (`voiceSamples`) say the same words. The stage keeps the step line, which says what the code does.
- Without Narrated growth, or with the explaining style, nothing changes.

Out of scope: poetic lines on the entry steps' own bar (they keep the step line); the narrator lines list of Compose (it still lists the step lines).

## Capabilities

### Modified Capabilities

- `live-build/voice-phrases`: what the poetic narrator says with Narrated growth (refines "Poetic narrator with Narrated growth" of voice-full-controls).

## Impact

- `src/song/vocabulary.js`, `src/song/spoken.js` (`movementLine`), `src/song/build.js` (`narration`, `voiceSamples`).
- `tools/check-spoken.mjs` (D11 case updated, a new case), the Guide card of the two voices, `docs/knowledge/narrator.md`.
- New samples in `public/samples/say_*` (git-ignored, made by `npm run voices`). No change to the growth, the music, the fixtures or the versions.
