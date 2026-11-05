## Context

The narrator of a radio song gets its speaker from `voiceFor` (`src/endless/director.js`):

- `own` is the style's `voice.speakers` list (or the old single `voice.speaker`), and `base.speaker` is picked from it.
- With chance `0.15 + 0.3 * chaos`, the speaker is picked from `['', ...SPEAKERS]` instead, whatever the style.
- voice-style-combos D5: a chosen narrator style that the drawn speaker does not allow draws the speaker again among all of `['', ...SPEAKERS]` that allow it.
- A fixed narrator speaker (`opts.narratorSound.speaker`) can be any speaker.

So every speaker in `SPEAKERS` can narrate any style. `src/voices/combos.json` limits the characters (sound styles) a speaker allows, not the speakers a style allows. Today every English speaker allows all 10 characters.

`tools/voice.mjs` collects the narrator's built-in texts per speaker as follows:

- POOL phrases (`allPhrases()`) and interlude comments (`INTERLUDE_SAY`): for `''` and each style's `voice.speaker`. No style has `voice.speaker`; all 20 have `voice.speakers`. Result: the default voice only.
- Poetic images (`poeticTexts()`, the styles' and songs' `narrator.lines`): for `narrators` = the speakers of the songs' voice tracks plus the set above. albert, fred and kathy are used by songs in `songs/`; junior is not.
- Vocabulary and the styles' spoken lines: for `spoken.speakers` (all `SPEAKERS` when a style has none). These are complete.

In the radio, `needs()` (`src/radio/radio.js`) asks the voice helper through `missingNeeds` (`src/song/build.js`, radio-phrase-speaker D1). A line is kept when its speaker has no sample and either its text is a phrase of mine or no bank of its language has it. A built-in narrator line always has a default-voice sample, so it is never asked for a speaker. `lineSample` then plays it from `say_<lang>`.

## Measurements

`node tools/voice.mjs --list --root ../../../public/samples` and the local banks on 2026-11-05 (English; Italian is unchanged because no speaker speaks it):

| Bank | Listed now | Narrator texts missing | Avg size | Added size |
| --- | ---: | ---: | ---: | ---: |
| `say_en` | 321 | 0 | 79 KB | 0 |
| `say_en_albert` | 271 | 95 | 128 KB | 12.1 MB |
| `say_en_fred` | 280 | 86 | 98 KB | 8.4 MB |
| `say_en_junior` | 50 | 247 | 78 KB | 19.3 MB |
| `say_en_kathy` | 280 | 85 | 101 KB | 8.6 MB |
| Total | | 513 | | about 48 MB |

Narrator texts: 248 unique (112 POOL phrases, 6 interlude comments, 132 poetic images). albert, fred and kathy already have the poetic images (songs use them) and a few POOL texts that are also spoken lines, so they miss 85 to 95. junior has none of them. The local banks total about 159 MB today, so the change adds about 30 %. One `say` plus `ffmpeg` sample took about 6.8 s sequentially in a quick timing (5 samples, Junior). With `--jobs 4`, the 513 samples take roughly 15 minutes, once.

## Goals / Non-Goals

**Goals**

- A built-in narrator line drawn for speaker X plays with X's sample when X speaks the language.
- The full set is made ahead by `tools/voice.mjs`; the radio closes any remaining gap through the voice helper before the line plays.

**Non-Goals**

- No change to the director's draws, the songs of a seed, `DIRECTOR_VERSION` or the endless fixtures.
- No change to `combos.json` or its rules.
- No Italian speaker banks.
- No samples made without the voice helper or `tools/voice.mjs`.

## Decisions

### D1. Narrator speakers are all speakers

`tools/voice.mjs` uses one set, `narratorSpeakers = ['', ...SPEAKERS]`, for the POOL phrases, the interlude comments and the poetic images. `addSay` already sends a speaker that does not speak a language to the default bank, so Italian does not grow. Alternative: the union of the styles' `voice.speakers` lists. Rejected because the chaos draw and the combos redraw (D5 of voice-style-combos) pick from all speakers, so the union misses lines that can play. Today the union is all four speakers anyway.

### D2. Allowed pairs stay as they are

`combos.json` (voice-style-combos) limits the characters a speaker gets (`allowedCharacters`, `allowedForDraw`), not the speakers that narrate. A speaker with no allowed character still narrates with its plain voice. So the narrator set of D1 is not filtered by `combos.json`, and the sound a line gets does not depend on which sample exists. The change only makes the sample of the speaker already drawn. Alternative: drop a speaker with no allowed style from the set. Rejected because the director still draws it, and its lines would fall back to the default voice again.

### D3. On-demand narrator lines in the radio

`missingNeeds(list, files, mineSlugs, { narrator: true })` also keeps a line when `x.voice === 'N'`, its speaker has no sample (`!x.has`) and the speaker is not the default voice. `needs()` in the radio passes `{ narrator: true }`. Compose's `needsOf` does not, so Compose asks for the same lines as before. The existing queue (one at a time, batches of up to 6, next song first) and `samplesArrived()` preload (radio-phrase-speaker D3) handle the new requests. This supersedes the radio-phrase-speaker scenario "Built-in line" for narrator lines only; voice-track lines and vocabulary keep that rule.

Alternative: only D1 (no on-demand). Rejected as the only fix because banks made before this change, user styles and a later speaker would keep the gap until someone runs `tools/voice.mjs` again. Alternative: only D3. Rejected because a run without the voice helper (a build, a phone, a recording) would keep the default voice, and the helper would make up to 513 samples during play.

### D4. Fallback and determinism

`lineSample` and the fallback note do not change. Only which samples exist, are asked for and are loaded changes. `npm run check:endless` fixtures stay, and `DIRECTOR_VERSION` stays 17.

### D5. Checks per speaker

`tools/check-samples.mjs --speaker <id>` limits the report to `say_<lang>_<id>` banks, so a run after `tools/voice.mjs` shows `0 missing` for that speaker. `tools/check-voice-preload.cjs --speaker` adds a step: a session whose next song has a narrator speaker X and a built-in narrator line with no X sample. With the helper, the sample is fetched before the next song's first bar and the line plays from `say_en_X`.

## Risks / Trade-offs

- [Risk] 48 MB more local samples → Mitigation: git-ignored; `--prune` and `--default-only` still work; the size is measured and printed by `check:samples`.
- [Risk] About 15 minutes to make the samples once → Mitigation: `--jobs`; existing samples are kept, so later runs only make new ones.
- [Risk] More helper calls in the radio when banks are old → Mitigation: next song first, bounded by the narrator lines one song says; after `tools/voice.mjs` there are none.
- [Risk] A speaker sample that comes out as the default voice (D5 of real-voices copy guard) is deleted, and D3 would ask for it again in every song → Mitigation: a request that does not give the speaker's sample is not sent again in the same session (use the existing queue's memory if it has one, else a per-session set in `needs()`).

## Estimate

About 1.5 agent hours: `voice.mjs` narrator set and combos rule 0.25, `missingNeeds` narrator option and radio caller 0.25, Node checks 0.25, `check-samples --speaker` 0.15, `check-voice-preload --speaker` narrator step 0.35, making the samples and running the checks 0.15 (plus about 15 minutes of machine time), docs and DEVLOG 0.1.

## Open Questions

1. Make the samples ahead (D1), ask on demand (D3), or both? Recommendation: both. D1 covers runs without the helper; D3 covers old banks and user styles.
2. Should D3 also ask for a voice-track line or vocabulary entry with no speaker sample? Recommendation: no. `tools/voice.mjs` already makes them for every listed speaker, and the measured gaps are 0.
3. Should junior's 247 samples (19.3 MB) wait until a style or song uses junior more? Recommendation: no. Eight styles name junior in `voice.speakers`, and the chaos draw can pick it in any style.
4. Should `check:samples` fail (`--strict`) on narrator gaps in CI-like runs? Recommendation: no change; it stays a report, because samples are local and git-ignored.
