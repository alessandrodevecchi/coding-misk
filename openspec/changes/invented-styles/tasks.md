# Tasks

Estimates in agent hours. Total: about 25 (20 to 30). Phase 1 (sections 1 to 5 and 7) about 21; phase 2 (section 6) about 4.

## 1. Style maker (about 6)

- [ ] 1.1 `src/endless/style-maker.js`: pool of built-ins in `recipeOrder`, base, donors, parts, trim, tracks rule (D2)
- [ ] 1.2 Pair table from the built-in styles and `styleCoherence`: groove and tempo, kit and groove, swing, modes, guitar, shapes, meter; redraw and fallback (D3)
- [ ] 1.3 `similarity`, closest style and genre, asked genre, generated description (D4, D5)
- [ ] 1.4 Names: bilingual word lists, forbidden names, id (D6)
- [ ] 1.5 `invented` field in `TOP_FIELDS` and `validateRecipe` (D7)

## 2. Node checks (about 3)

- [ ] 2.1 `npm run check:invent`: 300 seeds, rules, similarity, names, asked genre, determinism, tries (D13)
- [ ] 2.2 Seed fixtures `tests/snapshots/invented-styles.json` and `STYLE_MAKER_VERSION` (D12)
- [ ] 2.3 `check:endless` with unchanged fixtures, `check:random`, `check:styles`

## 3. Radio trial (about 5)

- [ ] 3.1 `invent` die in `throwDice`, `opts.tempStyle` and `opts.trialBefore`, recipes with the trial at the end and skipped by other draws (D8, D9)
- [ ] 3.2 Trial chip with Tieni, Ancora, ×; "stile in prova" in the now playing tag and Coming next; toast
- [ ] 3.3 Session item embeds the trial recipe; Replay uses it (D10)

## 4. Styles and Genres tabs (about 3)

- [ ] 4.1 "Inventa uno stile" and the trial card (sheet, origin chips, genre, closest style, Ascolta in radio, Ancora, Tieni, Scarta)
- [ ] 4.2 "Inventato" badge and origin in the sheet; `edited` on save
- [ ] 4.3 Genres card button "Inventa uno stile di questo genere"; the genre, style, artist line in the Styles intro (D1)
- [ ] 4.4 New song panel: the invent die in its Styles row, the trial chip in the panel's own store, Genera with the trial style (owner's answer to Open question 4)

## 5. Browser checks (about 2)

- [ ] 5.1 `tools/check-invented.cjs` (D13): radio, three seeds played with levels, keep, discard, reload, edit, session replay, backup, Genres card, New song panel, both languages, 400 px
- [ ] 5.2 `check-random.cjs`, `check-library.cjs`, `check-style-sounds.cjs` with kept styles, `tools/check-backup.mjs`

## 6. Compilation, phase 2 (about 4)

- [ ] 6.1 Setup switch "Stili inventati" and segment kind `invented` in `drawSegment` (D11)
- [ ] 6.2 Tieni on the now playing tag; `check:compilation` and `check-compilation.cjs`

## 7. Docs (about 2)

- [ ] 7.1 Guide cards (Radio, Styles, Genres) in English and Italian; `check:guide`
- [ ] 7.2 `docs/STYLES.md` (Inventing a style, the `invented` field), `docs/knowledge/` (styles, glossary: genre, style, artist), `decisions.md`; `npm run knowledge`, `check:knowledge`
- [ ] 7.3 DEVLOG (Italian); owner listening test of 10 seeds before the merge
