# Design

## Context

See `proposal.md`, Why. The current state that shapes the approach:

- `SPEAKERS` in `src/song/build.js` is one flat list, used by the director (`voiceFor`, the voice instrument draw in `src/endless/director.js`), `speakerOf` in `src/song/spoken.js`, the steering's typed lines (`src/endless/steering.js`, `SPEAKERS.find(x => x !== nar)`), the radio (`lineSpeaker` in `src/radio/radio.js`), recipe validation (`src/endless/recipe.js`), song validation (`src/song/validate.js`), the radio voice options (`cleanSound` in `src/endless/voice-sound.js`), and four pickers: `src/main.js` (`CONTROLS.voice`, `CONTROLS.spoken`), `src/endless/voice-sound.js`, `src/voices/voices-tab.js` (cards and test bench) and `src/library/styles-tab.js`.
- `sayBank(lang, speaker)` gives `say_<lang>_<speaker>`. `lineSample` already falls back to `say_<lang>` when the speaker's bank has no sample of a line, and logs it once.
- `tools/voice-sample.mjs` repeats `saySlug` and `sayBank`, because `vite.config.js` loads it and must not import `src/`. `check:spoken` asserts they match. `vite.config.js` has its own `SPEAKER_IDS` list.
- `systemVoice(lang, speaker)` matches the `say -v '?'` listing by `name.toLowerCase().startsWith(speaker)`. The listing on the owner's Mac shows `Reed (Inglese (USA))` and the others, but `say` speaks them with the system voice. Albert, Fred, Junior and Kathy are listed as plain names with `en_US` only. Samantha (`en_US`) and Alice (`it_IT`) are the defaults.
- `npm run voices -- --list` today lists about 323 lines for `say_en`, 329 for `say_it`, and 270 to 286 for each full speaker bank.
- The endless fixtures keep two hashes per seed: `hash` (the whole session) and `music` (the session without its voice tracks). `--write-fixtures` refuses to move `music` without `--force-music`.

## Goals / Non-Goals

**Goals:**

- Only voices that really sound different can be chosen.
- The same seed gives the same song in English and in Italian; only the bank a line plays from depends on the language.
- Old saved data sounds exactly as it did.

**Non-Goals:**

- No new Italian voices. Adding one later is one entry in the speaker table and a `npm run voices` run.
- No change to the voice styles, the voice characters or the effects.
- No rewrite of data in the browser storage.

## Decisions

### D1. One speaker list with languages

`src/song/build.js` keeps `SPEAKERS` as a flat list of ids and adds the languages each speaks:

```js
export const SPEAKER_LANGS = { albert: ['en'], fred: ['en'], junior: ['en'], kathy: ['en'] };
export const SPEAKERS = Object.keys(SPEAKER_LANGS);
// removed by real-voices: they were never installed (#63); read as the default voice
export const REMOVED_SPEAKERS = ['eddy', 'flo', 'grandma', 'grandpa', 'reed', 'rocko', 'sandy', 'shelley'];
export const speakerId = s => (SPEAKERS.includes(s) ? s : '');
export const speaks = (lang, s) => (SPEAKER_LANGS[s] || []).includes(lang);
```

Alternative considered: one list per language (`{ en: [...], it: [] }`). Rejected: the director would draw a different speaker in each language, so a seed would give a different song in Italian and in English. The songs are bilingual, and the language is an app setting the listener can switch while a song plays.

### D2. The language fallback lives in `sayBank`

`sayBank(lang, speaker)` returns `say_<lang>` when the speaker does not speak `lang` or is not in the list, and `say_<lang>_<speaker>` otherwise. The same rule goes into the copy in `tools/voice-sample.mjs`, with its own copy of `SPEAKER_LANGS`; `check:spoken` asserts that both tables and both `sayBank` functions give the same results.

`vite.config.js` drops `SPEAKER_IDS` and imports the speaker table from `tools/voice-sample.mjs`, so there are two copies (app and tools), not three.

Alternative considered: keep `sayBank` as it is and rely on `lineSample`'s fallback. Rejected: the radio's speaker requests for my phrases (`radio-phrase-speaker`) would ask the voice helper for `say_it_kathy` on every song, the helper would answer 404 each time, and the dev console would log a fallback for every Italian line. With the fallback in `sayBank`, an Italian line with Kathy is a normal `say_it` line. The generated Strudel code in Italian names `say_it` for that track.

### D3. Removed speakers read as the default voice

Every place that reads a speaker from data goes through `speakerId`: `narratorSpeaker` and `speakerOf` (`src/song/spoken.js`), `lineSample` and `voiceSamples` (through `sayBank`), `voiceFor` (the style's `own` list: removed ids become `''`, duplicates dropped), the voice instrument draw (`sp.speakers`: removed ids dropped; an empty list falls back to every speaker, as today), the steering's typed lines (`e.speaker`), the radio's `lineSpeaker`, `cleanSound` (it already drops unknown ids), and the pickers (a stored removed id shows as the default option).

Validation: `src/song/validate.js` gives a warning for a removed speaker ("removed speaker: the default voice speaks"), as it does today for an unknown one. `src/endless/recipe.js` changes the error for `voice.speaker`, `voice.speakers` and `spoken.speakers` into a warning when the id is in `REMOVED_SPEAKERS`; any other unknown id stays an error. The built-in recipes must pass with no warning (`check:styles`).

Alternative considered: map each removed speaker to a new one by character (grandpa to Albert, and so on) at read time. Rejected for saved data: the removed speakers always sounded like the default voice, so the default keeps every saved song and frozen session sounding as it did, which is what frozen sessions promise. The character map is used only for the built-in files (D4), where the owner reviews the result.

### D4. Built-in data, rewritten by hand

Songs (narrator is the `voice` track; spoken tracks by id):

| File | Before | After |
| --- | --- | --- |
| `songs/prova-solo-synth.json` | voice `flo` | `kathy` |
| `songs/prova-voce-notte.json` | voice `rocko`, words `reed` | voice `albert`, words `fred` |
| `songs/prova-voce-taglio.json` | chop `eddy`, story `flo` | chop `fred`, story `kathy` |
| `songs/switch-acid-prova.json` | voice `reed` | `fred` |
| `songs/switch-house-prova.json` | voice `shelley` | `kathy` |
| `songs/switch-tappe.json` | voice `flo` | `kathy` |
| `songs/switch-test-acido.json` | voice `grandpa` | `albert` |
| `songs/switch-test-breve.json` | voice `flo` | `kathy` |
| `songs/switch-test-onda.json` | voice `flo` | `kathy` |
| `songs/switch-test-stanza.json` | voice `sandy` | `kathy` |
| `songs/switch-trance-prova.json` | voice `flo` | `kathy` |
| `songs/examples/06-voices.json` | voice `shelley`, words `reed`, story `flo` | voice `kathy`, words `fred`, story `junior` |

Styles (`voice.speakers`; `spoken.speakers` where present). The rule: older male voices to Albert, deep or hard male voices to Fred, young or bright male voices to Junior, female voices to Kathy or the default (Samantha), and two different entries per style where it had two.

| Style | voice.speakers | spoken.speakers |
| --- | --- | --- |
| acid | `fred`, `junior` | |
| ambient | `kathy`, `""` | `albert` |
| berlin-techno | `fred`, `junior` | |
| classic-rock | `junior`, `fred` | |
| country | `albert`, `kathy` | |
| dark-cyberpunk | `fred`, `junior` | `albert`, `kathy` |
| darksynth | `fred`, `albert` | |
| dreamy-cyberpunk | `kathy`, `""` | |
| drum-and-bass | `junior`, `kathy` | |
| gated-trance | `kathy`, `""` | |
| house | `""`, `kathy` | |
| industrial | `fred`, `junior` | |
| jazz | `""`, `kathy` | |
| lo-fi | `kathy`, `""` | |
| melodic-metal | `fred`, `junior` | |
| phonk | `albert`, `fred` | |
| progressive-house | `kathy`, `""` | |
| pure-trance | `kathy`, `""` | `junior`, `fred` |
| synthwave | `""`, `junior` | |
| trance | `kathy`, `""` | |

The examples in `docs/knowledge/voice.md` and `docs/SONG-FORMAT.md` change `reed` to `fred`. The old hand-coded code in `tools/check-functions.mjs` (`miskVoices`, `say_it_flo`) is a saved-code fixture for `upgradeCode`, not a speaker list, and stays as it is. The archived HTML and JSON in `docs/soul/` stay as they are.

### D5. "Not installed" guard in the generator

`tools/voice-sample.mjs`:

- `systemVoice(lang, speaker)` returns `null` when the speaker does not speak `lang` (D1). It matches the listed name exactly (`Kathy`) or as `Kathy (`, so an id cannot match a longer name by prefix.
- A new `realVoice(lang, speaker)` makes one probe line with the speaker's voice and with the default voice into a temporary folder, converts both with the same ffmpeg filter as the samples, and compares the audio data (the WAV `data` chunk, not the header). Identical data means "not installed". The result is cached for the process, so `npm run voices` and the dev server pay it once per speaker and language. `makeSample` and `makeSampleAsync` return `null` for a speaker that is not real, the same as for one that is not listed. `npm run voices` then prints it in "speakers not installed, left out", and the voice helper answers 404 `speaker not installed`, as it does today for an unlisted voice.
- After a speaker sample is made, when `say_<lang>/` has the sample of the same text, its audio data is compared too. Identical data: the new file is deleted, the line is counted as a copy and the run warns. This guards a voice that falls back only for some text.

The owner checked with md5 that the fallback output is byte-identical, so an exact comparison is enough; no audio similarity measure is needed.

### D6. Parallel generation

`tools/voice.mjs` gets `--jobs N` (default 4, at most the number of cores). It runs `makeSampleAsync` through a small pool, then writes `say_lengths.json` once at the end. The probe of D5 runs before the pool starts, so each speaker is probed once. About 1,120 new samples (four English banks of about 280 lines) are expected; at about one second per sample this is about 5 minutes with 4 jobs. The default banks are not made again (`--force` is not needed and not used).

### D7. Prune on request

`node tools/voice.mjs --prune` lists every `say_<lang>_<id>` folder in `public/samples/` whose id is not in `SPEAKERS`, or whose speaker does not speak `lang`, with file count and size, and deletes nothing. `node tools/voice.mjs --prune --yes` deletes exactly those folders, rewrites `say_lengths.json` (`writeLengths`) and drops their files from the temporary-sample ledger (`say_temp.json`). It never touches `say_en`, `say_it` or a listed speaker's bank. No check calls it. The owner runs it, or confirms before an agent runs it.

### D8. `npm run check:speakers`

A new `tools/check-speakers.mjs` (no browser, macOS):

- skips with a note when `say` or ffmpeg is missing;
- fails when a speaker is not listed by `say -v '?'` for a language it speaks, or when `realVoice` says it speaks like the default (D5), and names the voice to install (System Settings, Accessibility, Spoken Content);
- fails when a file in a listed speaker's bank has the same audio data as the default voice's file of the same name;
- warns, without failing, for every bank the prune of D7 would list, and prints the prune command;
- deletes nothing and writes only to a temporary folder.

The existing checks change as follows:

- `check:spoken`: the speakers test (narrator and voice instrument never share a speaker) runs over the new list; the example asserts `say_it` for Italian and `say_en_fred` for English; new tests for `sayBank`'s language rule, the equality of the two speaker tables, and a removed speaker read as the default; the known-speakers test over the recipes uses the new names.
- `check:phrases`: the `radio-phrase-speaker` test runs in English (an Italian bank is now always `say_it`), with a second assertion that in Italian no speaker bank is asked; the fake usage lists use `say_en_fred` instead of `say_it_reed` and `say_it_flo`.
- `check:samples`: follows the `tools/voice.mjs` listing, so it expects the four English banks and no Italian speaker bank.
- `tools/check-voices.cjs`: picks `fred` instead of `reed` and checks the Italian note on an English-only speaker.
- `tools/check-voices-tab.cjs`: the delete test copies its file into `say_en_kathy` instead of `say_it_reed`; the cards show the Italian note, not "not installed".
- `tools/check-voice-preload.cjs --speaker`: runs the English radio for the speaker part and expects no speaker request in Italian.

### D9. Versions and fixtures

The director draws `rng.pick(['', ...SPEAKERS])` and picks from the styles' lists, and `speakerOf` picks from `SPEAKERS`. A pick takes one value from the random stream whatever the list length, so the number of draws does not change and the music stays the same; the drawn speaker changes. Expected moves:

- endless seed fixtures (`tests/snapshots/endless.json`): `hash` moves, `music` must not;
- radio fixtures (`tests/snapshots/radio-growth.json`): move (they hash the whole songs);
- invented-style fixtures (`tests/snapshots/invented-styles.json`): may move, because the style maker copies a style's voice part;
- code snapshots `tests/snapshots/code/prova-voce-notte.strudel`, `prova-voce-taglio.strudel`, `example-voices.strudel`: move (bank names in the code);
- song card durations (`npm run durations`): required by the rule for built-in song changes, likely unchanged;
- Crescendo and Live coder fixtures: not expected to move (the speaker is not part of the growth). If they move, stop and find out why before writing them.

Versions this change bumps: `DIRECTOR_VERSION` by one, and `STYLE_MAKER_VERSION` by one only if the invented-style fixtures move. It does not touch `SHAPES_VERSION` or `CRESCENDO_VERSION`.

Coordination with `varied-openings` (branch `docs/82-varied-openings`), which bumps `DIRECTOR_VERSION` 16 to 17, `CRESCENDO_VERSION` 2 to 3, `SHAPES_VERSION` 8 to 9 and `STYLE_MAKER_VERSION` 1 to 2 if its invent fixtures move:

- Each change bumps its versions by one over what `develop` has when it merges. If `varied-openings` merges first, this change takes `DIRECTOR_VERSION` 17 to 18 (and `STYLE_MAKER_VERSION` 2 to 3 if needed). If this change merges first, it takes 16 to 17, and `varied-openings` takes 17 to 18.
- The shared fixtures (endless, radio, invented styles, code snapshots, Crescendo and Live coder, durations) are regenerated once, by whichever change merges last, in one commit after both changes are in.
- Before that, this change proves on its own branch that only voices moved: `npm run check:endless` without `--write-fixtures` must fail only on `hash`, never on `music`, and `node tools/snapshot-code.mjs check` must differ only in `say_*` bank names. The change that merges first does not commit fixture files, so the fixture checks fail on `develop` between the two merges.

## Risks / Trade-offs

- [In Italian, every voice is Alice: the narrator and the voice instrument differ only by their sound settings] → the voice instrument usually gets a character or a style range, so they rarely sound the same; see Open Questions.
- [Albert, Fred and Junior are old synthetic voices; lines are longer or shorter than Samantha's] → line placement already reads each sample's length from `say_lengths.json`; `check:voice-heard` and `check-voice-heard.cjs` run after the banks are made.
- [Another Mac may not have the four voices] → the guard of D5 skips them with a warning and the default voice speaks; `check:speakers` names the voice to install.
- [The probe takes two renders per speaker and language] → cached per process; about 2 seconds per run of `npm run voices` and once per dev server start.
- [Both changes edit every `styles/*.json`] → they edit different keys (`growthShapes`, kits and sounds against `voice.speakers` and `spoken.speakers`), so the merge conflicts are local.
- [Fixture checks fail on `develop` between the two merges] → owner decision; the window is the time between the two merges.

## Migration Plan

1. Merge the code and data changes (D1 to D8). Old songs, sessions and options read removed speakers as the default voice (D3).
2. The owner runs `npm run voices -- --jobs 4` on the Mac (new English banks), then `npm run check:speakers`.
3. The owner runs `node tools/voice.mjs --prune` to see the 16 old banks (about 307 MB), then `node tools/voice.mjs --prune --yes`, or confirms that an agent runs it.
4. Fixtures are regenerated as D9 says.

Rollback: revert the commits. The new banks are git-ignored and harmless. Deleted old banks were copies of the default voice; `npm run voices` on the old code would make them again.

## Open Questions

- Should the voice instrument in Italian always get a voice character, so it never sounds like the narrator? Recommendation: no for now. Listen to a few Italian radio songs after the change and decide; it is a draw rule that can come later.
- `--jobs` default: recommendation 4, the same as the weekday check workers; the owner can pass a higher number at night.
- Close `#63` with this change? Recommendation: yes, with `Closes:` in the merge commit, since the cause of "speaker variants sound the same" is fixed.
