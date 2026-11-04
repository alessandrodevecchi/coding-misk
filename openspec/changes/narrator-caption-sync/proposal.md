## Why

The owner found three faults in the poetic narrator on stage and in sound (luci-rosse, Crescendo, poetic, with and without Narrated growth):

- The caption and its small step line drift apart. The narrator's line leaves after its sample plus 1.5 s, at least 2 s, while the step line under it stays 4 bars. The step line is picked by bar, so an entry image (spoken the bar before its track enters) sits under the previous step's line, and the right step line shows only after the image has gone.
- A line can be heard twice. When the speaker's own sample arrives late, the app plays the line again on the next beat or bar, also when the default voice already spoke it (the owner heard "just google it" twice).
- On a cold start in Compose the first line is lost. Play warms every narrator sample at once without waiting, and the audio engine drops the bar-0 hit whose sample is still loading.

## What Changes

- **The step line belongs to its narrator line.** A narrator caption carries the step line of the step it speaks for: the entering step for an entry image, the step itself for a movement image or an explaining line. The step line appears and leaves with that caption. A step with a step line that no narrator line speaks for keeps today's step line alone, 4 bars from its bar. The explaining style looks the same as today (its line is the step line, so no tag).
- **A caption stays at least 3 seconds** (today 2 s): the sample's length plus 1.5 s, at least 3 s, at most 4 bars. The next line of the same speaker replaces it at once. The same rule holds for a line played late. Videos, fragments, the timeline layout and the live output draw the same frame.
- **A line already heard is not played again.** When a speaker's sample arrives after the default voice already spoke the line, the line is not replayed; the next time that text comes up it uses the speaker's sample. A line that had no sample at all is still spoken late, on the next beat of its bar or the next bar, as today. No other phrase is chosen in its place.
- **The first lines are heard on a cold start.** Play in Compose, and a seek while playing, waits briefly (at most about 400 ms) for the voice samples of the first 4 bars from the play position, as the radio does; the other samples load in the background in bar order.
- **Texts follow.** The Guide card `captions` (en, it) says "at least 3 seconds"; the knowledge notes on the narrator and the voices describe the pairing, the no-repeat rule and the wait at Play.

Not in scope: what the narrator says or when (poetic-narrator), the explaining style's texts, the caption look and marks, the voice track's timing rules beyond the shared 3-second minimum, the radio's wait (already about 100 ms).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app/stage-captions`: caption timing (3 s minimum), the step line tag paired with its narrator line, the fallback chain (no replay of a line already heard), and a new requirement for the first lines on a cold start. The capability is not yet in `openspec/specs/`: its requirements are in the unarchived change `spoken-text-on-stage`, which must be archived first.
- `live-build/voice-phrases`: the requirement "Stage captions of the poetic narrator" (poetic-narrator) changes its entry-bar scenario: the entering step's line shows under the image on the bar before, not alone on the entry's bar. This supersedes poetic-narrator design D6 on that point. Its base is the unarchived change `poetic-narrator`.

## Impact

- Code: `src/song/build.js` (`captionSchedule`: hold rule, pairing from the schedule's `step`, step entries marked as paired; a shared hold helper; a list of voice samples with their bars, from `spokenNeeds`, shared with the radio), `src/captions/captions.js` (`captionFrame`: the tag from the narrator caption on screen, else a lone step line), `src/main.js` (`playLate`: skip lines already heard; `playSong`: wait for the first 4 bars' samples; `lateCaps` hold), `src/radio/radio.js` (`voicesOf` uses the shared list, behaviour unchanged).
- Looks: the "Claude" look's prompt line for an entry image becomes the entering step's line (it reads the caption's `step`).
- Texts: `src/guide.js` card `captions` (en, it). Docs: `docs/knowledge/narrator.md`, `docs/knowledge/voice.md`, `docs/knowledge/checks.md`, `docs/knowledge/decisions.md`, `DEVLOG.md`.
- Checks: `check:spoken` (the caption cases of spoken-text-on-stage and poetic-narrator updated, a new frame-by-frame case), a no-repeat check, a new cold-start browser check, `tools/check-captions.cjs` (bar 18 cases), `check-voice-preload.cjs` and `check-voice-heard.cjs` re-run.
- No change to the music, the steps, the narrator's lines or the code written: `CRESCENDO_VERSION`, `SHAPES_VERSION`, `DIRECTOR_VERSION` stay, no fixture or code snapshot changes.
