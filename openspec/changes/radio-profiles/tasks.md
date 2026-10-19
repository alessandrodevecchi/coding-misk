Each stage ends with its checks green before the next starts. "Verify" names the check that closes the task. Leave owner listening tests open and say so.

## 1. Baseline and guards (no change heard)

- [x] 1.1 Confirm which controls the radio's `playable()` uses today (the window song has no `profile`); give the window song explicit Classic controls so the Compose pick never reaches the radio; verify `node --no-warnings tools/check-radio.cjs` and `node tools/check-steering.cjs` pass unchanged
- [x] 1.2 New `npm run check:radio-profiles` (Node, `tools/check-radio-profiles.mjs`) with radio fixtures `tests/snapshots/radio-growth.json`: hashes of the radio items of three seeds in Classic; verify it passes on the current code and `npm run check:endless` fixtures do not move

## 2. Profile resolution (pure, Node only)

- [x] 2.1 `src/endless/profile.js`: `songProfileOnAir` with the order of D1 (session control, compilation, artist, style, Classic), stream `profile/<n>`, `entry.profile` only when not Classic; verify `check:radio-profiles` covers each row of the D1 table and determinism, and `npm run check:endless` fixtures are unchanged (if they move, raise `DIRECTOR_VERSION` in the same commit)
- [x] 2.2 Saved songs (D2): the resolution for song 0, frozen songs and the Mix; verify cases in `check:radio-profiles` (declared profile wins; undeclared takes the forced profile in the radio, the player default in the Mix)
- [x] 2.3 Artist fields `profiles` and `growth` in `src/endless/artist.js`, validator with paths, `ARTIST_DEFAULTS` without them; verify `node --no-warnings tools/artist.mjs validate` and a broken artist case in `check:radio-profiles`
- [x] 2.4 Random artists draw `profiles` from stream `artist-profile`; verify `npm run check:random` (every field made before stays the same for the same seed)
- [x] 2.5 Compilation setup `profiles` and the built-in "Live coder" preset in `src/endless/compilation.js`; verify `npm run check:compilation` (old setups unchanged, the preset gives Live coder songs)
- [x] 2.6 Session option `profile` (`artist` default) in `OPTION_DEFAULTS`, recipe `changes`, Settings → Radio default; a recipe without it replays as `classic`; verify `check:radio-profiles` (old recipe replays identical to the 1.2 fixtures) and `node tools/check-settings.cjs`

## 3. Growth of a radio song (pure, Node only)

- [x] 3.1 `src/endless/growth.js`: written form of a director song (D5 step 1); verify in `check:radio-profiles` that the written form gives the same events as the director's song in blocks for 50 seeds over all styles
- [x] 3.2 Growth with Crescendo and Live coder rules from the written form, seeded by the song id; verify every step of 50 grown songs compiles (`stateAt` per step) and Classic items still match the 1.2 fixtures
- [x] 3.3 Shapes on air (D6): artist `growth` weights between the song and the style, metamorphosis off, typed opening only after `cut` or `interlude`, voice opening only with a spoken opening line; verify cases in `check:radio-profiles`
- [x] 3.4 Duration: fitted by default, free from the artist; free songs longer, next song's start moved; verify fitted songs end within one phrase of their plan and the stream starts stay contiguous
- [x] 3.5 Typing: `pasteRule` and the "typing never rushes" fallback per radio song; verify `rushedSteps` on 50 radio Live coder songs is no higher than on the Compose Live coder songs of `npm run check:crescendo`, and that the sound does not change between 40 and 110 columns
- [x] 3.6 Write the grown items into the radio fixtures; verify `npm run check:crescendo` (Crescendo and Live coder fixtures unchanged; if Live coder fixtures move, raise `SHAPES_VERSION`)

## 4. Code on air (browser)

- [x] 4.1 Per-song controls in the window: `liveCode` per song, the shown code is the song on air (D7, D8); verify `node --no-warnings tools/check-radio.cjs` with a Live coder session (no evaluation errors, the panel holds only ids of the song on air) and screenshots
- [x] 4.2 Hidden tail: incoming and outgoing songs in full form on their own orbits, option `radio-incoming` with defaults by profile; verify `node tools/check-transitions.cjs` for mix, morph, echo, break, interlude and cut into and out of a Live coder song (no errors, below clipping, orbit count per window reported)
- [x] 4.3 Same events: shown plus hidden code against the full form of the window at every step of one transition; verify with a new case in `node tools/check-compact-code.cjs`
- [x] 4.4 Views on air: code of the moment with lanes, compact and song functions (no name clash with hidden songs), lit notes, line breaks, human typing with mistakes; verify `npm run check:functions`, `npm run check:typing`, `npm run check:live-code`, and a browser screenshot set of one Live coder song on air
- [x] 4.5 Console: Profile control, now playing profile and shape, strings in English and Italian, Guide card of the Radio; verify `node tools/check-steering.cjs` (control applies from the next song, recorded for replay) and `npm run check:guide`
- [x] 4.6 Custom profile in the radio console: same controls as Compose in a collapsible section with a summary, saved with the session and replayed; strings in English and Italian; screenshot desktop and phone

## 5. Commands as waypoints

- [ ] 5.1 Steering on grown songs (D9): past steps kept, a new growth from `stateAt(grown, bar)` to the steered song, `coderPath` with a given start and destination; verify in `check:radio-profiles` that steps before the boundary never change, cancel and replay give the same steps
- [ ] 5.2 Boundary that waits for typing, queue bar, `late` when nothing fits; verify in `check:radio-profiles` and `node tools/check-steering.cjs`
- [ ] 5.3 Energy, sound, arrangement, curve, Extend and End as waypoints; mute as `_$:`, volume on the line; verify `check:radio-profiles` and `node tools/check-steering.cjs` on a Live coder song
- [ ] 5.4 Vary and Swap typed as small notes edits; verify `node tools/check-steering.cjs` on a Live coder song, then tick `radio-variation` task 5.1
- [ ] 5.5 Chooser on air (D10): listener moves first, lanes toward the coming targets; verify a case in `check:radio-profiles` where a curve point is reached sooner than with the default chooser

## 6. Saved songs, playlists and versions

- [ ] 6.1 Song 0 keeps its profile and overrides; the Mix plays each saved song with its resolved profile; verify `node --no-warnings tools/check-radio.cjs` (continue in radio) and `node tools/check-playlists.cjs` (Mix of a Live coder and a Classic song)
- [ ] 6.2 Session items record `shapes` and `growth` versions when they hold a grown song, warn when any differs; Freeze stores grown builds marked as grown; verify `npm run check:playlists` and `node tools/check-playlists.cjs`

## 7. Exports

- [ ] 7.1 `rebuild` and the render page with growth, steering and the hidden tail; verify `npm run check:export` and `node tools/check-export.cjs` on a saved session with Live coder songs (fast and real time sound the same)
- [ ] 7.2 Radio fast export of a one-hour Live coder session; verify it completes and report the speed in `DEVLOG.md`
- [ ] 7.3 Session video and fast video show only the song on air, typed with the video's width; fragments start after a lead-in; verify `npm run check:video`, `node tools/check-video.cjs`, `npm run check:clips`

## 8. Artist, docs and listening

- [ ] 8.1 Built-in Live coder artist in `artists/` (invented name and bio, the four live coder styles, `profiles: { switch: 1 }`, `growth` weights); verify `node --no-warnings tools/artist.mjs validate` and `node tools/check-library.cjs`
- [ ] 8.2 Knowledge notes of D14, `npm run knowledge`, decisions added; verify `npm run check:knowledge`
- [ ] 8.3 `docs/ENDLESS.md`, `docs/ARTISTS.md`, `DEVLOG.md` entry in Italian
- [ ] 8.4 Owner's listening test: a session with Profile set to Live coder, one with the new artist, one compilation; steer with Vary, Swap, a curve and End; notes in `DEVLOG.md`
