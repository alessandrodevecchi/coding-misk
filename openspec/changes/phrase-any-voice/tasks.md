Estimate: about 1.25 agent hours.

## 1. Store, load and pick (0.4 h)

- [ ] 1.1 `src/voices/phrases.js`: `kinds` list in `normalize`, `KIND_SETS` (the five lists), `validTag` only for one kind, `groupsOf` for lists
- [ ] 1.2 `src/voices/phrases.js`: `readStore` reads `kind` as `[kind]` and saves `kinds`; the backup reads through it
- [ ] 1.3 `src/voices/mine.js`: `candidates()` keeps phrases whose `kinds` include the kind; `mineSnapshot` copies `kinds`
- [ ] 1.4 `src/voices/phrases.js`: merge on `editPhrase` when widening (older id, uses summed, styles and kinds united, `merged` ids); reuse on `addPhrase`; `find` by included kind; `mergePhrases` by id then by included kind

## 2. Form and labels (0.3 h)

- [ ] 2.1 `src/voices/voices-tab.js`: five options, tag select hidden for several kinds, tag cleared on choosing them, row icons and "Any" tag, kind chips and filters, Undo toast after a merge
- [ ] 2.2 `src/i18n.js`: EN and IT labels and hints

## 3. Samples per speaker (0.25 h)

- [ ] 3.1 `src/main.js` (`lineSamples`, sample preparation): one need per distinct speaker bank of the phrase's roles
- [ ] 3.2 `src/voices/samples.js`: `phraseFiles` and the usage and protect lists count every speaker's bank

## 4. Checks (0.3 h)

- [ ] 4.1 `tools/check-phrases.mjs`: pick for the five lists, tag rules, old phrases and old backups, merge, reuse, snapshot
- [ ] 4.2 `tools/check-voices-tab.cjs`: form, row, merge with Undo, delete count with two speakers
- [ ] 4.3 Run `check:phrases`, `check-voices-tab.cjs`, `check:samples`; add the DEVLOG entry
