## Context

See proposal.md, Why. The relevant code today (line numbers checked on `develop` at the start of this change):

- `captionSchedule` in `src/song/build.js` (431-468) turns `spokenSchedule` into captions. A spoken line holds `len === null ? 2 : Math.min(4, Math.max(2, len + 1.5) / bs)` bars (452) and is cut by the next caption of the same kind (458). Each caption's `step` is `stepAt(x.at)` (435, 444, 453): the latest step with `say` whose 4-bar window covers the caption's bar. The step lines are then pushed as separate entries of kind `step`, 4 bars each, `heard` when a narrator caption says the same words (460-466).
- `captionFrame` in `src/captions/captions.js` (59-73) takes the tag from the latest live `step` entry (67, 70), independent of the narrator caption on screen.
- `spokenSchedule` (362-392) already gives each narrator line its `step` object (374): the entering step for an entry image (309), the step itself for a movement image or an explaining line (294, 317).
- `playLate` in `src/main.js` (3247-3264) plays the lines of a batch the voice helper just made (`askSamples`, 3304, after `refreshSamples()`), on the next beat of their bar or the next bar, and pushes a caption to `lateCaps` with the old 2-second rule (3261). The batch comes from `prepLines`/`missingNeeds`, which also lists a phrase of mine whose speaker has no sample while the default voice's sample exists and speaks it meanwhile (phrase-any-voice D7). So that phrase is heard twice.
- `playSong` (1176-1211) warms every sample of `voiceSamples` at once with gain 0 and does not wait (1201). The radio passes `opts.voices` and `voicesFirst` (5344-5349) waits at most 100 ms for the first 4 bars, then queues the rest in bar order. superdough drops a hit whose sample is still loading when its time has passed (`node_modules/superdough/sampler.mjs` 296-302, "loading sound … took too long").

Measured with the investigation scripts (luci-rosse, Crescendo, poetic, English, the samples of this machine): without Narrated growth the image "a low tide rising" on bar 12 shows under "more hats" (bar 9's step) and "need bass" shows only from bar 13, after the image has gone at 13.36; with Narrated growth "a low tide rising" on bar 6 shows under "more hats", and "bass in" appears on bar 7. Every poetic caption leaves 1.5 to 2.5 bars before its tag.

## Goals / Non-Goals

**Goals:**
- The tag is the step line of the step the shown narrator line speaks for, and both leave together.
- A caption is readable: at least 3 seconds unless the next line replaces it.
- No line is heard twice because a better sample arrived.
- The first lines are heard on a cold start in Compose.

**Non-Goals:**
- Which lines the narrator says, or when (poetic-narrator).
- The radio's wait (100 ms, tied to the window's timing) and its preload order (check-voice-preload).
- The caption look, marks, placement and fit.

## Decisions

### D1. Pairing from the schedule (supersedes poetic-narrator D6 on the tag)

A narrator caption's `step` becomes `stepText(s, x.step, lang)` from the schedule line's own step, instead of `stepAt(x.at)`. A voice-track caption keeps `stepAt(x.at)`. Each `step` entry gets `paired: true` when a narrator caption in the final list (after `applyExclusive`) speaks for it, matched by the step's bar and its step line (the two `buildSteps` calls do not share objects). `heard` stays as today (a paired line with the same words).

Considered: pick the tag by bar and shorten the step entries to the caption's `until`. Rejected: an entry image is spoken a bar before its step, so a bar rule would still show the previous step's line under it.

The "Claude" look reads `row.step` as the prompt line (`src/visuals/glyph-looks.js` 339), so for an entry image the prompt becomes the entering step's line. This is the same pairing and is intended.

### D2. The tag in the frame

`captionFrame` takes the tag in this order:

1. the latest narrator caption live in the schedule, if its `step` is not empty and differs from its text;
2. else, with the explaining style only, the latest live `step` entry that is not `heard` (an explaining line with no sample, 4 bars from its bar, as today).

With the poetic style there is no step 2 (owner, 2026-11-04): a tag shows only with its narrator line, and a step no narrator line speaks for shows no tag, neither 4 bars nor 3 seconds. An entry whose step has no step line shows its image with no tag (owner, Q2). The style is the song's narrator style (`withNarratorStyle`), so `captionSchedule` can mark the step entries of a poetic song `tagless` and the frame needs no style input.

Step 1 reads the schedule, not the rows shown, so with narrator captions hidden in Settings the tag still keeps the narrator's timing. The tag stays off while typing by hand and with Step lines off, as today. The "instead" form is unchanged: every step entry, paired or not, shows as the caption for 4 bars and the narrator rows stay hidden.

A late caption (`lateCaps`) carries the step line of its schedule line (D5), so it pairs the same way.

### D3. One hold rule

A helper `captionHold(len, barSec)` in `src/song/build.js` gives the hold in bars: `len === null` gives `Math.min(4, Math.max(2, 3 / barSec))`, else `Math.min(4, Math.max(3, len + 1.5) / barSec)`. The next caption of the same kind still cuts it (458, unchanged). `captionSchedule` and `playLate` use it, so a late line and a scheduled one cannot differ. The rule applies to every speaker, narrator and voice track (owner, Q1); a chopped voice-track line still holds for its clip.

At 124 BPM (1.94 s a bar) the 2-bar default is 3.9 s, so songs at that tempo do not change without lengths; from 160 BPM up the 3-second floor lengthens it.

### D4. No replay of a line already heard

Before `askSamples` calls `refreshSamples()` for a batch, it splits the batch with a pure helper `lateLines(got, files, lang)` (in `src/song/build.js`): a line whose text already had a sample in the bank `lineSample` would pick (the speaker's, else the default voice's) in the files of that moment was in the code and was heard; it is dropped. Only the lines with no sample at all go to `playLate`. After the refresh the song is written again with the speaker's sample, so the next time the text comes up it uses that voice (`refreshSamples` evaluates the new code on the next bar; a line's mask covers its own bar only, so the code does not replay it either).

What `playLate` does today for a line with no sample at all, kept as is: the code left it out (`narratorLines` drops `n < 0`), so it was not heard and not captioned, and its step line showed alone as the tag (after this change only with the explaining style, D2). When the sample arrives and the transport is within two bars of the line's bar, it plays on the next quarter of a beat in its bar, else on the next bar, not while a voice-track caption is shown on that position, from the speaker's bank or the default voice's, with the voice track's gain and tempo on orbit 15; a line past its two bars stays silent. No other phrase is chosen. Only the caption hold changes (D3) and the caption gains its step line (D5).

Considered: remember every text played since Play and refuse any second play. Rejected: a refrain or a repeated movement image legitimately comes back later.

### D5. Late lines carry their step line

`spokenNeeds` adds `sub`, the step line of the schedule line's step (D1), to each entry. `lateCaps` entries use it as `step`, so a late line pairs with its tag (D2).

### D6. Cold start and seek in Compose

A helper `voicesAt(song, C, lang, files)` in `src/song/build.js` lists `[{ s, n, at }]` from `spokenNeeds`: for each line the sample `lineSample` would pick, deduplicated, in bar order. It replaces the radio's `voicesOf` body (`src/radio/radio.js` 696-711, which adds the item's `start`), so both players read one list; the radio's behaviour does not change.

`playSong` without `opts.voices` calls `voicesFirst(voicesAt(sg.build, ctl, lang, customFiles), bar, COLD_WAIT)` with `COLD_WAIT = 400` ms (owner: at most about 300 to 500 ms), in place of the warm-all loop (1201). `ctl` is the same as `capsOf` uses (`sg.segmentAt ? { narrator: true } : sg.ctl || {}`, 469). `voicesFirst` waits for the first 4 bars from `bar`, then queues the rest in bar order (one at a time, 3 s cap each, `pumpVoices`); the samples before `bar` are queued after them, for a later seek back. A seek while playing goes through `playSong` (`seekTo`, 2756-2759), so it waits the same way. A sample already loaded (`voiceDone`) does not wait. `seeking` stays true during the wait, so a second Play is ignored as today.

Considered: keep warming all at once and only delay the first evaluation. Rejected: the bar-0 sample still queues behind the others in the browser's fetches.

### D7. Checks

- `check:spoken`, new case "caption sync": luci-rosse in Crescendo, poetic, Narrated growth off and on, English and Italian, every sample present (`ANY`), lengths from `public/samples/say_lengths.json` when present, else a fixed length per text (0.06 s per character, so short lines hit the 3-second floor). The frame is read every 1/8 bar over the whole song. It asserts: the tag under a narrator row is the paired step's line (for an entry image, the entering step's); the tag set by a narrator caption ends on the same 1/8 frame as the caption; in the poetic style no tag ever shows without its narrator line (no frame has a tag and no narrator row); an entry with no step line shows no tag; every narrator caption with a length lasts at least 3 s or ends where the next narrator caption starts; no caption lasts over 4 bars. The investigation's output (pn1 and pn2) is quoted in the case's comment as the before state.
- `check:spoken`, the spoken-text-on-stage and poetic-narrator caption cases: bar 18's assertion becomes "the tag of bar 17's image is bar 18's step line"; the timing case uses 3 s.
- `check:spoken`, new case "no replay": `lateLines` drops a line with the default voice's sample, keeps a line with no sample, and keeps none of a batch spoken by the speaker already.
- `tools/check-captions.cjs`: the two bar-18 checks (147-149, 159-161) move to bar 17 (the tag under the image).
- New browser check `tools/check-voice-coldstart.cjs`, modelled on `tools/check-voice-preload.cjs` (its init script that follows each `say_` sample from fetch to decode to the first buffer started with gain above 0): a fresh browser context with the HTTP cache off, the CPU slowed 4 times, luci-rosse in Compose grown in Crescendo with the poetic style; Play from bar 0: the bar-1 line starts on bar 1, every sample of the first 4 bars is decoded before its bar, no "took too long" for a `say_` sample; then a seek to a bar with a line: started on that bar; the delay from the click to the first bar, reported (at most COLD_WAIT plus 150 ms). With `--repeat` and the voice helper: a new phrase of mine (Sempre) with only the default voice's sample; the phrase starts once on its bar, the speaker's sample is made, and the next time the phrase comes up it plays from the speaker's bank (skip note without the helper).

### D8. Versions and fixtures

No change to the steps, the narrator's lines, the code written or the music: `CRESCENDO_VERSION`, `SHAPES_VERSION`, `DIRECTOR_VERSION` stay, `npm run durations` is not needed, `check:code` snapshots stay. Only caption timing and pairing in check expectations change.

## Risks / Trade-offs

- [Some step lines never show in the poetic style] With Narrated growth, bar 6's "more hats" (its bar taken by the entry image) shows nowhere. → The owner's rule (2026-11-04): the subline exists only with its line. The step line is still in the code comments and the Compose step list.
- [Play starts up to 400 ms later on a cold start] → Only when the first 4 bars' samples are not loaded; a warm start does not wait. The cold-start check reports the delay.
- [Longer captions at fast tempos] → The 4-bar cap and the cut by the next line keep them bounded.
- [A line heard from the default voice keeps that voice for this pass] → Intended (owner): the speaker's voice is used from the next time.

## Migration Plan

No data migration. The change is in the caption schedule, the frame and the player; saved songs, sessions and settings are read as before. Rollback: revert the commit.

## Effort

About 4 to 5 agent hours: schedule, frame and hold 1 h; no-replay and late captions 0.5 h; cold start 0.5 h; `check:spoken` cases 1 h; the cold-start browser check 1 h; texts, docs and the full check run 0.5 to 1 h.

## Owner answers (2026-11-04)

- Q1. The 3-second minimum applies to every speaker, narrator and voice track.
- Q2. An entry whose step has no step line shows its image with no tag.
- Q3. In the poetic style a tag shows only together with its narrator line; a step no narrator line speaks for shows no tag. The explaining style is unchanged.
