Estimate: about 1.5 agent hours, plus about 15 minutes of machine time to make the samples.

## 1. Samples for every narrator speaker (0.25 h)

- [ ] 1.1 `tools/voice.mjs`: replace the POOL and interlude speaker set (`voice.speaker` of the styles) with `narratorSpeakers = ['', ...SPEAKERS]` (D1), and use it for the poetic images too. Update the header comment. Verify: `node tools/voice.mjs --list | cut -d/ -f1 | sort | uniq -c` compared with the baseline in design.md gives albert +95, fred +86, junior +247 and kathy +85; `say_en` and `say_it` (384) are unchanged.
- [ ] 1.2 Confirm D2: no filter by `combos.json`. Verify: `npm run check:voice-combos` passes unchanged.

## 2. On-demand narrator lines in the radio (0.25 h)

- [ ] 2.1 `src/song/build.js` `missingNeeds`: add an options argument `{ narrator }`. With `narrator: true`, also keep a line with `voice === 'N'`, a speaker, and `!x.has` (D3). Keep the `MAX_WORDS` limit. Without the option, the result is the same as today.
- [ ] 2.2 `src/radio/radio.js` `needs()`: pass `{ narrator: true }`. Do not send again a request that gave no speaker sample in the same session (design Risks). `src/main.js` `needsOf` stays as is.
- [ ] 2.3 Verify `samplesArrived()` preloads the new samples for the next song (radio-phrase-speaker D3); no code change expected.

## 3. Checks (0.75 h)

- [ ] 3.1 `tools/check-phrases.mjs`: a radio song with narrator speaker X and a POOL phrase. With a manifest holding only `say_en/<slug>.wav`, assert that `missingNeeds(..., { narrator: true })` keeps the narrator line for `say_en_X`, drops a voice-track line and a vocabulary entry the default voice has, and that without the option the result equals the old filter. Verify: `npm run check:phrases`.
- [ ] 3.2 `tools/check-samples.mjs`: add `--speaker <id>` to limit the report to `say_<lang>_<id>` banks (D5), and print the size of each bank's missing files when the default voice has them. Verify: `npm run check:samples -- --speaker junior` before `node tools/voice.mjs` reports 247 missing, after it 0.
- [ ] 3.3 `tools/check-voice-preload.cjs --speaker`: add a narrator step. Delete (or move aside in a temporary root) one `say_en_<X>` sample of a built-in narrator line of the next song, with X the next song's narrator speaker. Assert that the radio asks the helper for it, fetches it before the next song's first bar, and plays it from `say_en_<X>`, not `say_en`. Without the helper, print a skip note. In Italian, assert no speaker bank is asked. Verify: `PORT=5173 node tools/check-voice-preload.cjs --speaker`.
- [ ] 3.4 Run `npm run check:endless` (fixtures unchanged, no `--write-fixtures`, `DIRECTOR_VERSION` stays 17), `npm run check:spoken` and `PORT=5173 node tools/check-voice-preload.cjs`.

## 4. Make the samples (0.15 h)

- [ ] 4.1 Run `node tools/voice.mjs --jobs 4` (macOS `say`, ffmpeg), writing the output to a temp log. Verify: `npm run check:samples -- --speaker <id>` reports 0 missing for albert, fred, junior and kathy, and the added size is close to 48 MB (`du -sh public/samples/say_en_*`).
- [ ] 4.2 Listen check in the radio: a seed with a junior narrator plays POOL phrases in junior's voice. Report the seed in the DEVLOG.

## 5. Docs (0.1 h)

- [ ] 5.1 `docs/knowledge/radio.md`: narrator lines use the drawn speaker's sample, made ahead or asked on demand, with the default voice as fallback. `docs/knowledge/checks.md` and `AGENTS.md`: the `check:samples --speaker` and `check-voice-preload --speaker` lines. Verify: `npm run check:knowledge`.
- [ ] 5.2 Add the `DEVLOG.md` entry in Italian.
