## 1. Generator core

- [ ] 1.1 Create `src/material/index.js` with `compose(kind, opts)`, the named `material:` streams and the `why` list, plus `tools/check-material.mjs` and the `check:material` script; verify same inputs give the same part and 50 seeds give at least 45 different parts
- [ ] 1.2 Melodies (design D2): cells, polymeter 5 and 7 over 16, tail A A A A', call and response, summed progression, one prepared variant; verify in `check:material` that every note is a degree of the mode and no melody uses a random source
- [ ] 1.3 Basslines (D3): from the chords, from a shared progression, octaves as rhythm; verify every bass note is a tone of its bar's chord
- [ ] 1.4 Arpeggios and progressions (D4): index cells, seeded random indices, progressions on the mode's degrees with 1 to 4 chords per phrase; verify random sources carry a seed and every arp note is a chord tone
- [ ] 1.5 Drum grooves (D5): the five families as sequencer steps; verify each family keeps its fixed hits over 50 seeds
- [ ] 1.6 Energy mapping (D6) for every kind; verify onsets per bar and range grow from energy 0.2 to 0.9 for the same seed
- [ ] 1.7 Varying a preset (D8): keep rhythm or keep pitches; verify `rolling` keeps its onsets with new pitches
- [ ] 1.8 Verify every generated part of every kind, in 4/4 and 7/8, passes the song validator and compiles (Node), and document the rules in a "Material" section of `docs/ENDLESS.md`

## 2. Sounds

- [ ] 2.1 Sound kinds and the range table (D9), FM with at most two operators; verify 100 seeds stay in range in `check:material`
- [ ] 2.2 Browser level check of generated patches on a test phrase (`tools/check-levels.cjs` on a test song in `songs/examples/`); verify every patch peaks below clipping at default gain and record the measures in DEVLOG

## 3. Recipes and director

- [ ] 3.1 Add the `material` field to `src/endless/recipe.js` (default presets only) with JSON-path errors; document it in `docs/STYLES.md`; verify `npm run check:styles` and `npm run check:endless` pass with unchanged fixtures
- [ ] 3.2 Use `compose` in `candidateTracks` for `generated` and `mix`, with seeds from session, song and track; verify in `check:endless` that complexity 0 keeps presets only and a mixed recipe gives non-preset leads in most of ten songs
- [ ] 3.3 Set `material` in the built-in recipes by listening (design open question 1), rewrite fixtures with `npm run check:endless -- --write-fixtures`, bump `DIRECTOR_VERSION` to 3 in the same commit, and verify the playlist warning for an old saved session
- [ ] 3.4 Verify a generated session plays: `node tools/check-endless-play.cjs` on a fresh `npm run endless` session, no evaluation error, and `node --no-warnings tools/check-radio.cjs` passes

## 4. Compose a part

- [ ] 4.1 Pattern panel action [Compose a part] with number and energy (D11), new pattern on the next letter; verify by hand and with a screenshot that the same number gives the same part
- [ ] 4.2 [Keep rhythm] and [Keep notes] on a preset pattern; verify a new pattern appears and the old ones are unchanged
- [ ] 4.3 Interface strings in `src/i18n.js` in both languages and a `compose` Guide card update (or a new card) in `src/guide.js`, English and Italian; verify `npm run check:guide`

## 5. Integration

- [ ] 5.1 Run `npm run check:material`, `npm run check:endless`, `npm run check:styles`, `npm run check:songs`, `npm run check:code`, `node tools/snapshot-levels.cjs check` and `npm run build`; verify all pass and built-in songs keep their levels
- [ ] 5.2 Add a DEVLOG entry in Italian (rules, recipe choices, measured levels, version bump)
- [ ] 5.3 Owner's listening test (`docs/VARIETY.md`, step 4, with `pattern-library`): a listening session in the Patterns tab, with the owner's votes noted by hand until votes exist, and 4-5 new songs from the radio; record which rules stay in DEVLOG

## 6. Material source

- [ ] 6.1 Session material source `patterns`, `varied`, `composed`, `mix` (default), stored with the session recipe; verify in `npm run check:material` and `npm run check:endless` that "patterns" applies no mutation and that a replay matches
- [ ] 6.2 The user's saved patterns drawn only where they fit (kind, style tag or any style, key); verify with a case where a pattern of another style is never drawn
