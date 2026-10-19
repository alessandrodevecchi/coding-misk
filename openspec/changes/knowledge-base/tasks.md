## 1. Structure

- [x] 1.1 `docs/knowledge/README.md` (index, reading order) and the note template (D1, D2)
- [x] 1.2 `strudel.md`: basics, links to the official docs, the catalog and the in-app lessons, what the app adds
- [x] 1.3 One note per concept (D1), with connections, code paths, checks and options

## 2. Generated parts

- [x] 2.1 `tools/knowledge.mjs` (`npm run knowledge`): generated blocks for styles, commands, profile controls and presets, technical functions, growth shapes, helpers and library, option descriptions from `src/i18n.js`
- [x] 2.2 Code examples from the example songs (D4)

## 3. Decisions

- [x] 3.1 `decisions.md` seeded from the DEVLOG and `docs/VARIETY.md`

## 4. Check and rules

- [x] 4.1 `tools/check-knowledge.mjs` (`npm run check:knowledge`), no browser (D5)
- [x] 4.2 `AGENTS.md`: pointer to the index and the rule to update notes in the same change; DEVLOG entry in Italian

## 5. Ready for a task

- [x] 5.1 Audit: list the tasks an external agent may be given (at least the ones in the spec, plus any found in DEVLOG, issues and changes); for each, check what is missing in the knowledge base (35 tasks in `audit.md`)
- [x] 5.2 Recipes note(s) with files, steps, checks and mistakes for every task; index lists the tasks
- [x] 5.3 Inventories: sounds and instruments (with missing sounds), presets, keys, modes, scales, progressions, meters, generated
- [x] 5.4 Notes: sound and levels, music engine, visuals, checks map, pitfalls, glossary (generated from `src/i18n.js`), status
- [x] 5.5 Catalog freshness in `check:knowledge`; style descriptions back in the styles note
- [x] 5.6 Note "from a reference": inputs to ask for, measures, tools in the repo and on the machine, worked examples from existing styles and songs, ideas not built yet (score reading, MIDI import, stem separation, key and tempo detection), where named references are kept
- [x] 5.7 Coverage of the new notes in `check:knowledge` (every task has a recipe, every inventory block is current)
