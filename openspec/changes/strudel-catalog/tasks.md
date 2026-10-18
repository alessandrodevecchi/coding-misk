## 1. Catalog

- [ ] 1.1 Catalog writer in `tools/`: walk the listed packages, parse JSDoc blocks (name, synonyms, description, params, examples), add registered names with no block as undocumented, stable sort and key order; verify that two runs give identical files
- [ ] 1.2 `docs/strudel/functions.json` and the attribution header (packages and versions, licence, source, authors); verify the header and a sample of entries by hand (`voicing`, `seg`, `ply`, `lpf`)
- [ ] 1.3 `npm run catalog:strudel` in `package.json`; verify it rebuilds all files in one run

## 2. Coverage

- [ ] 2.1 Code set: every song, every live build in each profile and `functions` option, one radio session per style with fixed seeds, the prelude; verify the run is repeatable and report its time
- [ ] 2.2 Call scanner (skips strings, template strings, comments, local names, JavaScript built-ins) and the app helper list exported by `src/song/writer.js`; verify with small cases in the check (a call in a string is ignored, `.o(` is a helper)
- [ ] 2.3 `docs/strudel/coverage.json` and `docs/strudel/variety.json` (first pass from design.md D2, `S$:` and `_$:` listed as labels); verify every name in `variety.json` exists in the catalog or carries the "not in the installed version" note
- [ ] 2.4 `docs/STRUDEL-FUNCTIONS.md`: header, summary counts, coverage table, one section per function; verify it renders and lists `rib` as never written

## 3. Check

- [ ] 3.1 `tools/check-strudel.mjs` and `npm run check:strudel`: fails on an unknown function and on a version mismatch, warns on stale coverage and on undocumented functions the app writes; verify by adding a fake `.fooBar(` to a copy of a song in the check's own cases
- [ ] 3.2 Run `npm run check:strudel` on the current code; it passes, or every failure is reported to the owner before any fix

## 4. Docs and log

- [ ] 4.1 AGENTS.md: Read first row for `docs/STRUDEL-FUNCTIONS.md`, tooling lines for `npm run catalog:strudel` and `npm run check:strudel`; `docs/MUSIC-ENGINE.md`: look up a function in the catalog before a generator writes it, and rebuild the catalog after updating Strudel
- [ ] 4.2 No Guide card: the catalog has no part in the app; verify `npm run check:guide` still passes
- [ ] 4.3 Run `npm run catalog:strudel` twice (no diff), `npm run check:strudel`, `npm run check:code`, `npm run build`
- [ ] 4.4 DEVLOG entry in Italian: counts (documented, undocumented, written, never written), functions found without docs, anything learned
