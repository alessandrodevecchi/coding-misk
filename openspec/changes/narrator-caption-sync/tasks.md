## 1. Caption schedule and frame

- [ ] 1.1 Re-check the line numbers of design.md Context on the branch (`captionSchedule`, `captionFrame`, `playLate`, `playSong`, `voicesFirst`, `voicesOf`) and fix the design if they moved; verify by grepping each function
- [ ] 1.2 `captionHold(len, barSec)` in `src/song/build.js` (D3) used by `captionSchedule`; verify the `check:spoken` timing case passes with 3 s (a 1.3 s line at 124 BPM holds 3 s, a 2 s line 3.5 s, no lengths 2 bars)
- [ ] 1.3 Pairing in `captionSchedule` (D1): a narrator caption's `step` from the schedule line's own step, step entries marked `paired` by bar and step line, voice-track captions unchanged; verify with a `check:spoken` assertion that every poetic entry image carries the entering step's line
- [ ] 1.4 `captionFrame` tag order (D2): the live narrator caption's own step line; with the explaining style only, else the latest live step entry not heard; with the poetic style no tag without its line; "instead" form unchanged; tag kept with narrator captions hidden; verify `check:spoken` "old behaviour" and "narrator only" cases and `tools/check-captions.cjs` "narrator only"
- [ ] 1.5 `check:spoken` new case "caption sync" (D7): luci-rosse in Crescendo, poetic, Narrated growth off and on, en and it, frame every 1/8 bar over the whole song; asserts the tag is the paired step's line (the entering step's for an entry image), it ends on the same frame as its caption, in the poetic style no frame shows a tag without a narrator row, an entry with no step line has no tag, every caption with a length at least 3 s unless cut by the next caption of its speaker (the last of a run included), none over 4 bars; the same timing for the voice track on prova-voce-notte; the pn1/pn2 output quoted in a comment as the before state; verify `npm run check:spoken` passes and the case fails on the old code (run it once against `develop`)
- [ ] 1.6 Update the spoken-text-on-stage and poetic-narrator caption cases in `tools/check-spoken.mjs` (bar 18 becomes the tag under bar 17's image; timing at 3 s); verify `npm run check:spoken` passes

## 2. No replay of a line already heard

- [ ] 2.1 `lateLines(got, files, lang)` in `src/song/build.js` (D4): drops a line whose text already had a sample `lineSample` would pick; verify with a `check:spoken` case "no replay" (default voice's sample present: dropped; no sample: kept)
- [ ] 2.2 `askSamples` in `src/main.js` splits the batch with `lateLines` before `refreshSamples()` and passes only the kept lines to `playLate`; `playLate`'s timing kept as is; verify in the browser with `tools/check-voice-coldstart.cjs --repeat` (task 4.2) that the phrase starts once
- [ ] 2.3 `spokenNeeds` carries `sub` (D5) and `lateCaps` use it as `step` and `captionHold` for `until`; verify a `check:spoken` assertion on `spokenNeeds` (`sub` equals the paired step's line) and that `check:phrases` still passes

## 3. Cold start and seek

- [ ] 3.1 `voicesAt(song, C, lang, files)` in `src/song/build.js` (D6); the radio's `voicesOf` uses it with the item's `start`; verify `npm run check:spoken` (a case: the list equals what the radio's `voicesOf` gave before, on two radio songs) and `node tools/check-voice-preload.cjs` unchanged
- [ ] 3.2 `playSong` without `opts.voices`: `voicesFirst(voicesAt(...), bar, COLD_WAIT)` with `COLD_WAIT = 400`, the samples before `bar` queued last, in place of the warm-all loop; verify with task 4.2

## 4. Browser checks

- [ ] 4.1 `tools/check-captions.cjs`: the bar-18 checks (poetic with and without Narrated growth) move to bar 17's image and its tag; verify the script passes on the dev server
- [ ] 4.2 New `tools/check-voice-coldstart.cjs` modelled on `tools/check-voice-preload.cjs` (D7): fresh context with the HTTP cache off, CPU slowed 4 times, luci-rosse Crescendo poetic in Compose; Play from bar 0 (bar-1 line started on bar 1, first 4 bars' samples decoded before their bars, no "took too long" for a `say_` sample, the start delay reported); a seek to a bar with a line (started on that bar); `--repeat` with the voice helper (a new phrase of mine, Sempre, only the default voice's sample: started once on its bar, then from the speaker's bank the next time; a skip note without the helper); verify it passes, and fails on `develop` for the cold start
- [ ] 4.3 Add the new check to the Tooling list in `AGENTS.md` and to `docs/knowledge/checks.md`; verify `npm run check:knowledge`
- [ ] 4.4 Re-run `node tools/check-voice-heard.cjs`, `node tools/check-voice-preload.cjs`, `node tools/check-voices.cjs`, `node tools/check-timeline.cjs` (narrator marks) and `node --no-warnings tools/check-radio.cjs` (Coming next); verify all pass

## 5. Texts and docs

- [ ] 5.1 Guide card `captions` in `src/guide.js` (en, it): "at least 3 seconds", the small line goes with the line it belongs to; verify `npm run check:guide`
- [ ] 5.2 `docs/knowledge/narrator.md` (captions paragraph: pairing, 3 s, late lines, no replay, the wait at Play), `docs/knowledge/voice.md` (3 s for voice-track captions), `docs/knowledge/decisions.md` (a row replacing poetic-narrator D6 on the tag; a row for no replay and the cold-start wait); `npm run knowledge`; verify `npm run check:knowledge`
- [ ] 5.3 `DEVLOG.md` entry (Italian): what changed, the before and after of the frame case, the cold-start delay measured

## 6. Integration

- [ ] 6.1 `npm run check:code` (unchanged), `npm run check:crescendo`, `npm run check:endless` (fixtures unchanged, no version bump), `npm run check:phrases`, `npm run check:samples`, `npm run check:voice-heard`, `npm run check:spoken`, `vite build`; verify all pass
- [ ] 6.2 Owner listening and viewing: luci-rosse poetic in Crescendo, Narrated growth off and on, from a cold page; a fast video fragment with captions

## Workflow follow-up

- Archive `spoken-text-on-stage` and `poetic-narrator` before this change, so `app/stage-captions` and `live-build/voice-phrases` exist in `openspec/specs/` and the MODIFIED requirements apply.
- Archive this change after the owner's review.
