# Design

## Context

`real-voices` (on `develop`, being implemented on `feat/82-real-voices`) fixes the speakers: Samantha as the English default (`''`), Albert, Fred, Junior and Kathy (English only), and Alice as the only Italian voice. A speaker that does not speak the language plays as the default voice of that language.

Automatic draws that pick a style or character today (all in `src/endless/` unless noted):

1. `voiceFor` (`director.js`, ~line 317-320): draws the speaker, then a character (`opts.voiceCharacters` weighted by the artist, else `rng.pick(Object.keys(VOICE_CHARACTERS))`) and `Object.assign`s its values. This is the radio and Compose "growth" voice for the narrator track. Crescendo and Live coder growth reuse the voice `voiceFor` already drew (`growth.js` only places the voice instrument), so they have no draw of their own.
2. The voice instrument draw (`director.js`, ~line 408): `VOICE_CHARACTERS[rng.pick(...)]` from a fixed list per way (`chop` or the others), on a speaker drawn from `sp.speakers`.
3. Artists: `voice.characters` weights in `artists/*.json`, read through `opts.voiceCharacters` in `voiceFor`. `artist-maker.js` (~line 110) picks the weighted character names of a made artist; it does not know a speaker.
4. New song (`new-song.js`, ~line 82): `narratorSound = cleanSound({ style: r.pick(['auto', ...VOICE_STYLE_IDS]) })`. A chosen style goes over the drawn narrator in the director (~line 252, `soundPatch(opts.narratorSound)`), after the speaker draw. With no fixed speaker, any drawn speaker can meet any style.
5. Style recipes and invented styles: a recipe's `voice` part holds numeric ranges and speaker lists, not style names. `style-maker.js` copies that part. They draw no named style, so the combos file reaches them only through the speaker lists they name (D6).
6. Voice options presets (`voice-options.js`): they set phrases, kinds, ways and where, not a style, so they draw no style.

Manual sources, which this change does not touch: the track panel style select (`main.js`, `data-vstyle`), the narrator and voice instrument pickers (`voice-sound.js`), the radio steering commands (`steering.js`, `voice-sound` command, `clear` on a voice swap at ~line 836), the radio panel selects (`radio.js`) and the Voices tab bench.

## Goals / Non-Goals

**Goals**
- One committed JSON file the owner edits by hand to list allowed styles per speaker and language.
- Every automatic draw above respects it, with a safe fallback.
- Manual choices stay free, with a small hint.
- A check that catches a typo in the file.

**Non-Goals**
- Filtering numeric draws: the style recipe ranges (`voice.pitch` and the others) and the wild knob values of `voiceFor` (the "free" knobs) are not named styles, so they are not listed. A bad pair that comes from them is not solved here (open question 4).
- Choosing the initial content: it is all allowed until the owner listens.
- A UI to edit the file.
- Changing samples, speakers or the sound of a style.

## Decisions

### D1. Location and format: `src/voices/combos.json`

`src/voices/` already holds the Voices tab (`voices-tab.js`), so the file sits with the voice code and the bundler imports it like the artists and styles JSON. Not inside `src/song/format.js` (code, not an owner-edited list) and not in `styles/` (those are per style).

```json
{
  "format": 1,
  "en": {
    "default": ["clear", "radio", "distant", "robot", "deep", "bright", "cathedral", "echo", "dirty", "slow"],
    "albert": ["clear", "radio", "deep"]
  },
  "it": {
    "default": ["clear", "radio", "distant"]
  }
}
```

- The top keys are the language ids with speakers (`en`, `it`). The inner key is a speaker id, or `default` for the default voice of that language (Samantha in English, Alice in Italian).
- The value is the list of allowed style ids (`VOICE_STYLE_IDS`). The characters of `VOICE_CHARACTERS` use the style of the same name (the code already asserts that a style and a character with that name sound the same), so one list covers both. `distant` and `clear` exist only as styles and `clear` is not a character.
- No entry for a speaker, a language or the whole file means all styles allowed.
- `clear` is always allowed, even when the list leaves it out: it is the fallback (D4) and the neutral sound.
- The file ships with every style listed for every speaker and for `default` in each language (a template that is easy to edit by hand). The check treats a full list and a missing entry the same. The owner removes the styles he does not want after listening.

### D2. One module: `src/voices/combos.js`

Pure functions, no browser or audio:

- `allowedStyles(speaker, lang)`: the styles allowed for the voice that is heard for `speaker` in `lang` (the speaker if it speaks `lang`, else the default voice of `lang`). Always includes `clear`.
- `allowedForDraw(speaker)`: the intersection of `allowedStyles(speaker, lang)` over every app language. A draw is language-independent (a song is built once and played in either language), so a pair must be allowed wherever it can be heard. A speaker that does not speak Italian is heard as Alice there, so its draw list is also bound by `it.default`.
- `isAllowed(speaker, style, lang)` for the hint.
- `combosErrors(json)` for the check.

### D3. How the draws filter

Rule: filter the candidate list, then pick. A pick takes one value from the random stream whatever the length of the list, so the number of draws and the music stay the same; only the picked value can change.

1. `voiceFor`: the speaker is drawn as before. The character list is `Object.keys(VOICE_CHARACTERS)` filtered by `allowedForDraw(base.speaker)`. For an artist's weights, the weighted pick runs over the weights of the allowed names only. If the list is empty, or the draw would use no character, the voice gets no character (the `clear` base); the chance roll is not changed.
2. Voice instrument draw: the fixed list per way is filtered by `allowedForDraw(speaker)`. If it is empty the track keeps the plain voice (`clear`). The "character now and then" roll stays.
3. New song: `r.pick(['auto', ...VOICE_STYLE_IDS])` stays a free draw over all styles, because the narrator speaker is drawn later and may differ. The pair is checked where the speaker is known: in the director's narrator step (D5).
4. Artists and the artist maker are unchanged: their weights are tastes. The filter acts at draw time in `voiceFor`, where the speaker is known. An artist whose characters are all disallowed for the drawn speaker gets `clear` that time.

### D4. Empty list falls back to `clear`

`allowedStyles` always contains `clear`, so a list is never empty. A draw that filters down to nothing but `clear` uses `clear` (no character applied). The check warns for a speaker whose list is empty or only `clear`.

### D5. Narrator style chosen by hand or drawn by New song, with a drawn speaker

When `narratorSound` carries a style and no speaker, the director keeps the speaker draw, then, if the drawn speaker does not allow that style, picks the speaker again among the speakers (and the default voice) that do. This uses one extra pick from the voice stream only in that case, so with all combinations allowed nothing moves. If no speaker allows the style, the speaker stays as drawn (a hand choice wins over the file: D6). The style is never changed: a style chosen in the options is a hand choice.

### D6. Manual choices and the hint

- No manual path is blocked or rewritten. A saved song, a radio command or a Compose track with a not-allowed pair plays as saved.
- A radio option with a style and no speaker is a hand choice of the style; D5 only steers the drawn speaker.
- A speaker named by a style recipe's `voice.speakers` stays as written; the combos filter its character at draw time. The recipe does not list styles, so `check:styles` has nothing to validate here.
- The style `select` in the track panel (`main.js`, `vstyleHtml`) and in `voice-sound.js` show an option that is not allowed for the current speaker with a trailing mark and a title ("not in the allowed set for this voice"). The option stays selectable. The mark updates when the speaker changes. Recommended: a plain text suffix ` ·` and the title, no new colours.

### D7. Validation: `npm run check:voice-combos`

`tools/check-voice-combos.mjs` (no browser):

- the file is valid JSON with `format: 1`;
- every language key is a known language, every speaker key is `default` or a speaker that speaks that language (per `real-voices`' table), every style id is in `VOICE_STYLE_IDS`, with no duplicates, and each value is an array;
- warns for an empty list or a list with only `clear`;
- tests of `combos.js`: a missing entry allows all; `clear` is always allowed; `allowedForDraw` of an English-only speaker includes `it.default`; a filtered `voiceFor` over 300 seeds never returns a character outside the list; an empty-list case gives no character; filtering an all-allowed file gives byte-identical songs to no filter.
- Add it to `check:spoken`'s neighbours in `AGENTS.md` and `docs/knowledge/checks.md`.

Unknown speaker or style ids are errors (not warnings), as the owner asked. A speaker removed by `real-voices` in the file is also an error; it is a hand-edited file, not saved user data.

### D8. Determinism and versions

- With the initial all-allowed file nothing changes: `voiceFor` filters nothing, and the endless, radio and code fixtures stay.
- When the owner narrows the file, the filtered pick lists differ, so draws move: `hash` of the endless fixtures, the radio fixtures, the code snapshots of voiced songs, and possibly the invented-style fixtures.
- Version: `DIRECTOR_VERSION` goes up by one in this change because the change introduces filtered draws. Order with the other changes: `varied-openings` (16 to 17) and `real-voices` bump the same constant; each bumps by one over what `develop` has when it merges. The shared fixtures are regenerated once, by whichever of the three merges last, in one commit; the others do not commit fixture files. The music hash must not move (the draws keep their count): `check:endless` without `--write-fixtures` fails only on voice parts.
- A saved radio session records `director`, so a session started before the bump keeps its recorded draws as the app already handles for other bumps.
- Order matters for the content: the owner fills the file after `real-voices` merges, so that the file and the fixtures are generated once from the final list.

### D9. Voices tab (small, optional)

The bench of `voices-tab.js` shows a one-line status under the speaker and style selects: "Allowed for Albert" or "Not in the allowed set for Albert (still playable)", from `isAllowed`. The speaker cards stay as they are. If it grows, drop it; nothing else depends on it. Recommended: do it, it is about 20 lines and lets the owner hear a pair and see whether it is listed in the same place where he listens.

## Risks / Trade-offs

- **Narrow file, same speaker every time.** A narrow list can make a style never heard for some speaker; that is the intent. Mitigation: the check warns for lists with only `clear`.
- **Recipe numeric draws can still sound bad.** Ranges and wild knob values bypass the file (Non-Goals). Mitigation: open question 4.
- **Language intersection narrows the draw.** An English-only speaker is bound by `it.default` as well, because its song may play in Italian. If the owner prefers per-language draws, songs would need the language at build time, which they do not have. Recommended: keep the intersection.
- **A second pick for the narrator speaker (D5)** only runs on a conflict, so it cannot move an all-allowed session.
- **Fixture churn.** Three changes bump the same version; regenerate once at the last merge.

## Migration Plan

1. Implement after `real-voices` merges (or on its branch), with the all-allowed file, so no fixture moves in this change.
2. The owner listens and edits `src/voices/combos.json`; `npm run check:voice-combos` validates it.
3. Regenerate the shared fixtures once after the last of `varied-openings`, `real-voices` and this change merges.
4. Rollback: delete the file's entries, or the file; every pair is allowed again. No saved data is touched.

## Open Questions

1. Does the owner want the hint in pickers (D6) and the bench line (D9)? Recommended: yes, both, plain text.
2. Should `clear` be implicitly always allowed (D1)? Recommended: yes.
3. Should a draw be bound by `it.default` for English-only speakers (D2)? Recommended: yes, intersection.
4. Should the numeric recipe ranges and wild knobs be bounded too (for example a pitch window per speaker)? Recommended: not now; add a `pitch` window per speaker later if a bad sound comes from there.
