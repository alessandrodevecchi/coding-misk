# Tasks

## 1. Artists in the director

- [x] 1.1 Define the artist format (format version, profile, taste, quirks) with a validator and `tools/artist.mjs validate`; verify in `check:endless` that a valid artist passes, and that an unknown style, a reversed range and an unknown quirk are errors with their paths.
- [x] 1.2 Make `createSession` accept an artist and draw each song's options from its taste (styles by weight with `explore`, ranges, shapes by weight, pace, move weights, voice characters); verify in `check:endless` that sessions without an artist are unchanged (seed fixtures) and that with an artist songs differ in their values and mostly use the favourite styles.
- [x] 1.3 Implement the quirks in `src/endless/quirks.js`; verify each in `check:endless` with chance 1 (for example no guitar track with `no-guitars`, a second drop with `two-drops`, everything stopped at the last boundary with `hard-endings`).
- [x] 1.4 Record the artist in the session data and the report, add `--artist` to `tools/endless.mjs`; verify that a replay from the recorded session gives the same songs after the artist file changes.

## 2. Built-in artists and progressive house

- [x] 2.1 Add `styles/progressive-house.json` (uplifting progressions already in the app, see design decision 7); verify `npm run check:styles` and the browser sound check.
- [x] 2.2 Write the six artists in `artists/` (night owl, hype, dreamer, jukebox, purist, Avicii-inspired) with bios in English and Italian; verify in `check:endless` that they are valid, generate valid songs, and differ from each other (styles used, average energy, shapes).
- [x] 2.3 Document artists in `docs/ARTISTS.md` (format, taste, quirks, how songs are drawn, versions) and update `docs/ENDLESS.md` and `docs/STYLES.md`; verify the documented fields match the validator.

## 3. Styles tab

- [ ] 3.1 Add the Styles tab: list and readable sheet for every style; verify in the browser that each of the 16 styles opens with its tempo, progressions and instruments.
- [ ] 3.2 Add duplicate, new, the edit form and the JSON view with errors in place, user styles in browser storage, export and import; verify in the browser that a duplicated and edited style appears in the radio chips, an invalid edit shows its error, and export then import gives the same style.

## 4. Artists tab

- [ ] 4.1 Add the pixel-art portrait from a seed and palette; verify that the same seed always gives the same picture and different seeds give different faces.
- [ ] 4.2 Add the Artists tab: cards and the character sheet; duplicate, new, edit form and JSON view, user artists in browser storage, export and import; verify in the browser.

## 5. Radio and Compose

- [ ] 5.1 Add the artist picker to the radio (sets styles and sliders, "custom" after a change, artist in the now playing card, recorded in the session recipe); verify in `tools/check-radio.cjs`.
- [ ] 5.2 Add "New song from artist" in Compose; verify in the browser that it opens an unsaved live build song that plays and can be saved.
- [ ] 5.3 Update README (both languages), `docs/ARCHITECTURE.md`, `docs/CONTEXT.md`, `AGENTS.md`, `DEVLOG.md`; run every check and `npm run build`; hand it to the owner.
