## 1. Shared options

- [ ] 1.1 `src/endless/song-options.js` (D1): `createSongOptions(store, key)` with the read and migration moved from `createRadio`, `set`, `on`, `directorOptions({ use })`; two instances, the radio's on `coding-misk-radio` and the panel's on `coding-misk-new-song`, started from a copy of the radio's song values on first open; `takeFrom(radio)` for "Prendi dalla radio"; `createRadio` takes its instance instead of its own `opts`; `npm run check:song-options` (new, no browser): old saved options read the same, radio director options equal to today's for a set of saved states, a panel change leaves the radio's store alone, the first-open copy and `takeFrom` skip session-only fields, `length` only with `use: 'new-song'`
- [ ] 1.2 `src/radio/song-controls.js` (D2): artist chips and select, style chips, genre chips, knobs with dice, sounds die, material seg, Profile select, `customPanel`, `voicesGroup`, `songControlEvent`, all with `prefix`; the radio draws them from there with no visible change; `tools/check-radio.cjs`, `check-steering.cjs`, `check-voices.cjs`, `check-random.cjs`, `check-compilation.cjs` pass before any panel code

## 2. Director length

- [ ] 2.1 `length` in `planSong` (D8): ranges, exact minutes, the draw kept, `fit` first, recipe only when not `style`, one phrase shorter with a Durata, in every profile; `check:endless` cases (ranges, exact 3 minutes at 120 bpm, earlier draws equal) with fixtures unchanged and `DIRECTOR_VERSION` unchanged
- [ ] 2.2 Growth duration `planned` (D12): one function shared with `growOnAir`'s fitted path; used by the Compose worker, the card length worker and the exports; part of the growth hash; fallback to fitted when the song cannot be planned; "Nella durata scelta" in Compose's select only on songs that carry it; `check:song-options` case: a generated Media Live coder song grows to the same bars in each place and lands in 3 to 4 minutes; `npm run check:durations` and `check:crescendo` unchanged for the built-in songs
- [ ] 2.3 Length target (D12): `config.controls.durationTarget` kept by the song; Crescendo and Live coder resolve their growth duration to `planned` while it holds, Classic plays the written song; Libera in the panel or in the Compose live panel removes it and shows the muted line; songs without it untouched
- [ ] 2.4 `check:song-options` cases for the target: every profile switch (Classic, Crescendo, Live coder, Custom, in both directions) keeps the heard length within one phrase of the target, with the written music unchanged; Libera clears the target; songs without a target (the built-in songs and a set of saved songs) grow to the same bars as before in every profile

## 3. Panel

- [ ] 3.1 `#tr-new` with chevron and `aria-expanded`, `#new-song` card, close button and Esc, open state remembered; `#tr-artist` removed (D3)
- [ ] 3.2 Quick row (D4): Da zero first (the empty song of today, behind a divider), Artista with die and random artist, Preset, Seme, Genera, Sorprendimi; press twice with unsaved changes
- [ ] 3.3 Sections (D5): five folds with summaries and remembered state; genre chips; shape controls with any profile switching to Custom; Generator disabled in blocks with the reason; Durata chips and minutes with Durata della crescita beside them, the summary with the length heard for the current profile, the line per profile, the exclusion of a Durata and the free growth with its line (D12); footer with "Prendi dalla radio" and the preset name
- [ ] 3.4 Re-render on store changes when shown; range drag kept (D2)
- [ ] 3.5 Hardware faders and phone layout (D10); icons PLUS and SAVE in `src/icons.js` (D11)

## 4. Presets

- [ ] 4.1 `src/endless/song-presets.js` with the five built-in presets as a guide (D6), the owner's presets in `coding-misk-song-presets`: save with length, overwrite his own after confirming, a built-in name saves a new one, delete his own only, Personalizzato after a change; backup export and merge (`tools/check-backup.mjs` case)

## 5. Generation

- [ ] 5.1 Genera (D7): one director call with the panel's `directorOptions({ use: 'new-song' })`, profile and Custom controls as the song's own configuration (the length target with a Durata, and `planned` with a growing profile), no trial mark, seed shown, toast; `newSongFromArtist` through the panel's store; Artists tab button opens the panel
- [ ] 5.2 Sorprendimi (D13): every value drawn from a new seed with the random tools, written into the panel's store in one `set`, then Genera with that seed; the radio's store unchanged; same seed, same values and song (`check:song-options` case)
- [ ] 5.3 Remove the "In the next song" row and `coding-misk-artist-voice` (D9); update `tools/check-voices.cjs` and `tools/check-library.cjs`

## 6. Texts, Guide, knowledge

- [ ] 6.1 Italian and English strings in `src/i18n.js`; Guide card "Nuovo brano" in `src/guide.js`; `npm run check:guide`
- [ ] 6.2 Knowledge notes (`library.md` or the Compose part of `live-build.md`, `radio.md` for the shared options, `artists.md`, `settings.md` for backup), `decisions.md` (D1, D8, rejected `fit`), `npm run knowledge`, `npm run check:knowledge`; `AGENTS.md` Tooling line for the new checks

## 7. Checks and owner review

- [ ] 7.1 `tools/check-new-song.cjs` (dev server on PORT): open and close, quick row, each section, panel and radio values apart, Prendi dalla radio, radio on air unchanged, presets (save, overwrite, built-in kept), Genera with an artist, with Custom Live coder and an opening, with composed material, with Breve in Classic, with Media in Live coder (heard length 3 to 4 minutes, card and Compose agree), the profile switched in Compose both ways keeping the length within one phrase, Libera in Compose clearing the target with its line, an old song switched to Live coder unchanged, Durata and free growth excluding each other, Sorprendimi twice with the same seed, voice track off, Da zero, Artists tab, hardware faders, 400 px without sideways scroll; Italian screenshots in the notes folder
- [ ] 7.2 `npm run check:endless`, `npm run check:spoken`, `npm run check:random`, `npm run check:compilation` and the radio browser checks green; DEVLOG entry
- [ ] 7.3 Owner tries the panel in both themes and on a phone (listening test, left open for the owner)

## 8. Durata in the radio (optional, only if the owner confirms design Q3)

- [ ] 8.1 A Durata row in the radio for its next songs (the radio's own store), `length` sent with `use: 'radio'` only when set; the exclusion with an artist's or the Custom profile's free growth (D12); `check:endless` fixtures unchanged without it; `tools/check-radio.cjs` case
