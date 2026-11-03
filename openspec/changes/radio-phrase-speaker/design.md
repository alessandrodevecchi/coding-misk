## Context

The speaker of a line is already right in the radio. `spokenNeeds` (`src/song/build.js`) gives each line the bank of the voice that says it (`say_<lang>_<speaker>`: the narrator's from `voiceOf`, the voice track's from `speakerOf`). `lineSample` and `sampleOf` (`src/song/spoken.js`) play the speaker's bank first and fall back to `say_<lang>`. The radio's preload, `voicesOf` in `src/radio/radio.js`, also tries `x.bank` before `say_<lang>`.

The speaker is lost where samples are asked for. Compose's `needsOf` in `src/main.js` keeps a line with no speaker sample when its text is a phrase of mine (phrase-any-voice D7). The radio's `needs()` in `src/radio/radio.js` drops every line whose text exists in any bank of the same language: `any(x.bank, …)` also tests `x.bank` without its speaker suffix. A phrase of mine usually has a default-voice sample (made by the Voices tab or by Say now), so the speaker's sample is never asked for in the radio. The default voice then says the line every time.

Samples are made on demand by the dev server's voice helper (`POST /voice/say { text, lang, speaker }`, `vite.config.js`, macOS `say`). This is the same path as Compose and Say now. Without the helper, no sample is made, and the default-voice fallback stays the safety net.

## Goals / Non-Goals

**Goals**

- One rule, shared by Compose and the radio, for the lines to ask the helper for.
- A speaker sample made during play is loaded before the next song.

**Non-Goals**

- No speaker stored on a phrase. The speaker stays the speaker of the role in that song.
- No change to the director, the window code, `lineSample` or the fallback note.
- No samples made without the voice helper.

## Decisions

### D1. One pure rule for missing samples

Add `missingNeeds(list, files, mineSlugs)` next to `spokenNeeds` in `src/song/build.js`. It keeps a line when its speaker has no sample (`!x.has`) and either its text is in `mineSlugs` or no bank of its language has it. It also keeps the `MAX_WORDS` limit. `needsOf` (`src/main.js`) and `needs()` (`src/radio/radio.js`) both call it. Alternative: copy Compose's filter into `radio.js`. Rejected because the two copies would drift again, which is how this bug started.

### D2. The phrases of mine in the radio come from the session

`needs()` builds `mineSlugs` from the session's snapshot (`S.recipe.mine.list`, the texts in the current language). These are exactly the phrases its songs can draw, Replay and saved sessions included. With no snapshot (Never), the set is empty and the radio asks for the same lines as today. Alternative: the live collection (`mine()`). Rejected because a replayed session draws from its own snapshot, not from the live collection.

### D3. Preload after a sample arrives

`samplesArrived()` in `radio.js` also calls `player.preloadVoices(voicesOf(next))` when the next song is made. `queueVoices` already skips samples that are loaded or queued, so only the new speaker sample is fetched. `voicesOf` already prefers the speaker's bank, so it needs no change.

### D4. Determinism

Only which samples are asked for and loaded changes. Draws, songs and session recipes are the same, so `npm run check:endless` fixtures do not move and `DIRECTOR_VERSION` stays.

## Risks / Trade-offs

- [Risk] More helper calls in the radio, one per phrase of mine per speaker → Mitigation: the existing queue makes them one at a time, in batches of up to 6, next song first. The count is at most the phrases a song says.
- [Risk] A speaker sample of a phrase deleted after the session started is still made → Mitigation: it is a temporary sample, removed by the existing sweep.
- [Risk] The default voice still says the first lines while the speaker's sample is made → Mitigation: this is accepted. It is the existing fallback, and the next window uses the new sample.

## Estimate

About 0.75 agent hours: shared rule and the two callers 0.2, preload after arrival 0.1, checks 0.35, docs and DEVLOG 0.1.
