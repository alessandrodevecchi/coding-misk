## Why

In the radio, most built-in narrator lines play in the default voice (Samantha) with the style's sound, even when the director drew a real speaker for the song (`#82`, finding of the real-voices work). `tools/voice.mjs` makes the director's phrases (POOL) and the interlude comments only for the default voice and for each style's single `voice.speaker`. No style has that field any more: all 20 styles name a `voice.speakers` list. The director's draw (`voiceFor` in `src/endless/director.js`) picks from that list, and sometimes from all speakers. The radio does not ask the voice helper for a built-in line that the default voice already has, so the gap never closes.

Measured on 2026-11-05 (`node tools/voice.mjs --list`, English): the narrator's built-in texts are 248 (112 POOL phrases, 6 interlude comments, 132 poetic images, with overlaps). The speaker banks miss 513 of them: albert 95, fred 86, junior 247, kathy 85.

## What Changes

- **Every narrator speaker in the samples.** `tools/voice.mjs` makes the narrator's built-in lines (POOL phrases, interlude comments, poetic images) for the default voice and every speaker the director can draw for the narrator: all of `SPEAKERS`, limited by the languages each speaks. This adds 513 English samples, about 48 MB, git-ignored.
- **On-demand safety net.** In the radio, a built-in line whose speaker sample is missing (a narrator line, a voice-track line or a vocabulary entry) is asked from the voice helper ahead of time, like phrases of mine (radio-phrase-speaker). This covers banks made before this change, a user style, and a speaker added later. The sample is preloaded for the next song.
- **Fallback unchanged.** Without the speaker's sample, the default voice says the line with the existing `[voice] … no sample in …, the default voice speaks it` note.
- **Checks.** `npm run check:samples -- --speaker <id>` reports one speaker's bank. `tools/check-voice-preload.cjs --speaker` also asserts that a built-in narrator line of the next song plays from the speaker's bank.
- **Unchanged.** The director's draws, the songs of a seed, `DIRECTOR_VERSION`, the allowed speaker/style pairs of `src/voices/combos.json`, Italian banks (the speakers speak English only), and the lines Compose asks for.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `endless/radio-voice`: built-in narrator lines are spoken with the drawn speaker's sample, made ahead by `tools/voice.mjs`; in the radio, every built-in line with no sample of its speaker is asked from the voice helper, with the default voice as the fallback.

## Impact

- Changed: `tools/voice.mjs` (narrator speaker set), `src/song/build.js` (`missingNeeds` keeps a line with no speaker sample), `src/radio/radio.js` (`needs()` passes the rule; no other change), `tools/check-samples.mjs` (`--speaker`), `tools/check-voice-preload.cjs` (`--speaker` narrator step), `tools/check-phrases.mjs` (Node assertions).
- Data: about 48 MB of local samples (git-ignored), made with `node tools/voice.mjs`. Director draws, session recipes and endless fixtures do not change.
- Docs: `docs/knowledge/radio.md`, `docs/knowledge/checks.md`, `AGENTS.md` check lines, `DEVLOG.md`.
