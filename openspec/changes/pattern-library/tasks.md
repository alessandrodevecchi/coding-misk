## 1. Catalogue and store

- [x] 1.1 Build the built-in catalogue by kind from the preset tables (design D1) and the "styles that use it" map from the recipes (D4) in `src/library/patterns.js`; verify in `npm run check:patterns` (new script) that every preset appears once and every recipe preset maps to its style
- [x] 1.2 User pattern store under `coding-misk-patterns` (add, rename, remove, list) and its merge by id in `src/settings/backup.js`; verify in `npm run check:patterns` and `node --no-warnings tools/check-backup.mjs` that patterns survive export and import

## 2. Patterns tab

- [x] 2.1 Add the `pattern` tab after `suoni` in `index.html`, its section and the tab module `src/library/patterns-tab.js` (search, kind and source chips, cards, detail); update `tools/check-modes.cjs` with the new Groove Lab list and verify it passes
- [x] 2.2 Loop player through a temporary song (D2): sound, key, progression, tempo, simple beat, changes at the next bar, one pattern at a time, song or radio stopped first; verify by hand that no `evalError` occurs and that changing the key keeps the loop going
- [x] 2.3 Mini preview (D3) for notes and grids with the current step lit; verify with screenshots in both themes and at phone width
- [x] 2.4 Styles that use a pattern, with links to the Styles tab; verify `rolling` lists its styles and opens one
- [x] 2.5 "Compose new" per kind through the material generator, listed as unsaved; verify a saved generated pattern keeps `seed` and `why`

## 3. Saving and links

- [x] 3.1 [Save as pattern] in the Compose pattern panel with the section context (D7); verify the saved pattern plays in the tab with the track's sound, key and tempo
- [x] 3.2 Rename and delete with a second press to confirm; built-in patterns protected; verify after a reload
- [x] 3.3 [Add to song] from the tab into the song open in Compose; verify the new pattern letter and that existing patterns are unchanged
- [x] 3.4 Listen button next to a track's preset menu in Compose, preset links in style cards, [Try on a pattern] in the Sounds inspector (D5); verify each lands on the right pattern with the right sound
- [x] 3.5 Write `tools/check-patterns.cjs` (dev server): tab, play and stop, key change, save from Compose, delete, add to song, the three links; verify it passes and saves screenshots

## 4. Guide, docs and log

- [x] 4.1 Interface strings in `src/i18n.js` in both languages; a `patterns` Guide card in `src/guide.js` (tab `pattern`, mode `lab`, English and Italian), and the `modes` card text listing the new tab; verify `npm run check:guide`
- [x] 4.2 Document the tab and the store in `docs/ARCHITECTURE.md`, with the place kept for favourites and votes (D8); add a DEVLOG entry in Italian

## 5. Integration

- [x] 5.1 Run `npm run check:patterns`, `npm run check:guide`, `node tools/check-modes.cjs`, `node tools/check-patterns.cjs`, `node --no-warnings tools/check-backup.mjs`, `node tools/check-library.cjs` and `npm run build`; verify all pass
- [ ] 5.2 Owner's listening test (`docs/VARIETY.md`, step 4, with `material-generator`): a listening session in the Patterns tab with votes noted by hand until votes exist; record the outcome in DEVLOG
