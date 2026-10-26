## 1. Shared options

- [ ] 1.1 `src/endless/song-options.js` (D1): `createSongOptions(store)` with the read and migration moved from `createRadio`, `set`, `on`, `directorOptions({ use })`; `createRadio` takes it instead of its own `opts`; `npm run check:song-options` (new, no browser): old saved options read the same, radio director options equal to today's for a set of saved states, `length` only with `use: 'new-song'`
- [ ] 1.2 `src/radio/song-controls.js` (D2): artist chips and select, style chips, genre chips, knobs with dice, sounds die, material seg, Profile select, `customPanel`, `voicesGroup`, `songControlEvent`, all with `prefix`; the radio draws them from there with no visible change; `tools/check-radio.cjs`, `check-steering.cjs`, `check-voices.cjs`, `check-random.cjs`, `check-compilation.cjs` pass before any panel code

## 2. Director length

- [ ] 2.1 `length` in `planSong` (D8): ranges, exact minutes, the draw kept, `fit` first, recipe only when not `style`; `check:endless` cases (ranges, exact 3 minutes at 120 bpm, earlier draws equal) with fixtures unchanged and `DIRECTOR_VERSION` unchanged

## 3. Panel

- [ ] 3.1 `#tr-new` with chevron and `aria-expanded`, `#new-song` card, close button and Esc, open state remembered; `#tr-artist` removed (D3)
- [ ] 3.2 Quick row (D4): Artista with die and random artist, Preset, Seme, Genera, Brano vuoto, press twice with unsaved changes
- [ ] 3.3 Sections (D5): five folds with summaries and remembered state; genre chips; shape controls with any profile switching to Custom; Generator disabled in blocks with the reason; Durata chips and minutes; footer line
- [ ] 3.4 Re-render on store changes when shown; range drag kept (D2)
- [ ] 3.5 Hardware faders and phone layout (D10); icons PLUS and SAVE in `src/icons.js` (D11)

## 4. Presets

- [ ] 4.1 `src/endless/song-presets.js` with the built-in presets (D6), the owner's presets in `coding-misk-song-presets`, save and delete, Personalizzato after a change; backup export and merge (`tools/check-backup.mjs` case)

## 5. Generation

- [ ] 5.1 Genera (D7): one director call with `directorOptions({ use: 'new-song' })`, profile and Custom controls as the song's own configuration, no trial mark, seed shown, toast; `newSongFromArtist` through the store; Artists tab button opens the panel
- [ ] 5.2 Remove the "In the next song" row and `coding-misk-artist-voice` (D9); update `tools/check-voices.cjs` and `tools/check-library.cjs`

## 6. Texts, Guide, knowledge

- [ ] 6.1 Italian and English strings in `src/i18n.js`; Guide card "Nuovo brano" in `src/guide.js`; `npm run check:guide`
- [ ] 6.2 Knowledge notes (`library.md` or the Compose part of `live-build.md`, `radio.md` for the shared options, `artists.md`, `settings.md` for backup), `decisions.md` (D1, D8, rejected `fit`), `npm run knowledge`, `npm run check:knowledge`; `AGENTS.md` Tooling line for the new checks

## 7. Checks and owner review

- [ ] 7.1 `tools/check-new-song.cjs` (dev server on PORT): open and close, quick row, each section, panel to radio and radio to panel, radio on air unchanged, presets, Genera with an artist, with Custom Live coder and an opening, with composed material, with Breve, voice track off, Brano vuoto, Artists tab, hardware faders, 400 px without sideways scroll; Italian screenshots in the notes folder
- [ ] 7.2 `npm run check:endless`, `npm run check:spoken`, `npm run check:random`, `npm run check:compilation` and the radio browser checks green; DEVLOG entry
- [ ] 7.3 Owner tries the panel in both themes and on a phone (listening test, left open for the owner)
