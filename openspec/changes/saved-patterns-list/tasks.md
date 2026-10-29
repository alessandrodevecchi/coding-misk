# Tasks

Option C of the design. Estimates in agent hours. Total: about 8 (7 to 10). Option A alone would be sections 3.1, 3.3, 3.4 and part of 5, about 3.

## 1. Data (about 1.5)

- [x] 1.1 `uses` and `lastUsed` on saved patterns: raise them from the console's Aggiungi come traccia nuova and Sostituisci and from Compose's Add to song; not from previews or replays (D5)
- [x] 1.2 `forRadio` passes `created`, `uses`, `lastUsed`; the director's pool ignores them (done as `forRadio(list, { meta: true })` for the console only, so the director's pool and session recipes carry no counters; the console's command strips them too)
- [x] 1.3 Backup merge keeps the larger `uses` and the newer `lastUsed` for the same pattern id; `tools/check-backup.mjs` case

## 2. Filter and sort (about 1.5)

- [x] 2.1 `src/radio/saved-view.js`: search with folded words, instrument, fit (style or none, tempo within 1.5 times), style, the five sorts (saved order by default, as the Patterns tab; owner's answer to Q3), groups in the console's instrument order (D2)
- [x] 2.2 Node checks in `npm run check:patterns`: search with accents, fit chip, each sort, groups with 4 and "Mostra tutti", threshold of 8 (D3)

## 3. Panel (about 3)

- [x] 3.1 Panel state in the radio closure, remembered in `coding-misk-radio-saved-view`; a chip, a menu or the search re-renders only the panel body (D1)
- [x] 3.2 Toolbar, instrument chips with counts, groups with headers and "Mostra tutti (n)", the "6 di 97" line, no-match note with "Togli i filtri", the use line on cards (D6)
- [x] 3.3 Scroll area with fixed height (closed, open, phone) and the bottom fade; restore scroll, search text, caret and focus after a console rebuild (D1, D4)
- [x] 3.4 Paint previews only in view, and only again when the patterns change (D4)
- [x] 3.5 Keys: P to the search, Escape twice, down arrow to the first pattern, Enter on group headers
- [x] 3.6 CSS for neon and hardware themes and 400 px

## 4. Texts and docs (about 0.5)

- [x] 4.1 `src/i18n.js` strings in Italian and English (D7)
- [x] 4.2 Guide card line for the panel search and P; `npm run check:guide`
- [x] 4.3 Knowledge note for the radio console; `npm run knowledge`, `npm run check:knowledge`; DEVLOG

## 5. Browser checks (about 1.5)

- [x] 5.1 `tools/check-steering.cjs`: 120 seeded patterns, panel height bounded closed and open, search kept across a phrase change, groups and "Mostra tutti", sort by Più usati after two adds, no match and Togli i filtri, 6 patterns look as before
- [x] 5.2 Same at 400 px and in the hardware theme with screenshots; console render time with 120 patterns below 60 ms (205 ms today)
- [x] 5.3 `npm run check:patterns`, `npm run check:endless` (fixtures unchanged), `PORT=... node tools/check-patterns.cjs` (Add to song of a saved pattern counts a use)
