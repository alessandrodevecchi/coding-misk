Delivery in five phases; each phase ends usable and checked, and can be merged into `develop` alone. Effort is agent working time including checks, not counting the owner's listening tests.

| Phase | Content | Effort |
| --- | --- | --- |
| 1 | Track instances, limits, locks per instrument, riser command, headroom, buses (engine only) | 2 to 2.5 days |
| 2 | Console: one + and − per instrument, instrument locks, warning, Riser row | 1.5 days |
| 3 | Target selector for Vary and Swap | 0.5 day |
| 4 | Add a saved pattern | 2 days |
| 5 | Part harmony and the Song harmony menu | 1.5 days |
| 6 | Session scope for arrangement commands | 1 day |
| 7 | Docs, Guide, knowledge, listening test | 0.5 day |

Total about 9 to 10 days. Phases 3 and 5 depend on 1; 4 depends on 1 and 2; 6 depends on 2, 4 and 5.

## 1. Track instances, limits and headroom (engine)

- [x] 1.1 `INSTRUMENTS`, command kinds `more` and `less` with `part` (D1); old `add` and `remove` kept for replay; verify in `tools/check-endless.mjs` that a recorded session with `add lead` and `remove drums` gives the same song as before
- [x] 1.2 Track instances `<base>-<k>` with `by: 'listener'` and command index; `less` removes the last one added (D2); verify: three `more pad` then one `less pad` leaves `pad`, `pad-2` playing
- [x] 1.3 `trackFor` variety: sound, pattern, register, level, pan (D3); verify over 50 seeds that a second arp differs from the first in sound or pattern and sits an octave away, every note in the section's scale
- [x] 1.4 Limits: console cap 12, no per-instrument cap, recommended counts returned as a warning (not a `whyNot` reason), `hardMax` raised by `more`, director strips skip listener tracks until the outro, unlocked listener tracks may sit out a break or charge and come back (D4); verify in the check, and two kicks take different grooves over 50 seeds
- [x] 1.4b Owner's test, automated: over 50 seeds and every style, press `more` on each instrument at a random phrase; the added track plays at the next phrase, two phrases later, and in every phrase up to the outro except break and charge phrases, where it is back at the phrase after (`tools/check-endless.mjs`)
- [x] 1.4c Lock per instrument: `lock-part`/`unlock-part`, `plan.lockedParts`, locked ids include tracks added later (D12); verify: a locked bass is never stripped, varied or reshaped by the director, plays through breaks, and `more bass` on a locked bass gives a locked second bass
- [x] 1.4d Riser command `riser { bars, dir, sound }` ending on the next part change, replacing the director's riser there, riser track created when the style has none, late rule; riser lock keeps the director's risers out (D11); verify in `tools/check-endless.mjs` over 20 seeds: the clip ends on the change bar, one riser per change, replay same
- [x] 1.5 Headroom scaling past `usualHigh`, pinned gains kept (D5); verify with `node tools/check-levels.cjs` on a steered song with 12 tracks in three styles: `in=` at most 1.2, output below 1.0
- [x] 1.6 Extra buses skip orbits 13 and 14 (D6); verify `npm run check:code` (snapshots unchanged) and a 12-track song with a voice track compiles with distinct orbits
- [x] 1.7 Crescendo and Live coder growth on a song with two drums and two pads; verify `npm run check:radio-profiles` and `npm run check:crescendo`
- [x] 1.8 CPU at 12 tracks: radio plays a 12-track song for 2 minutes without scheduler underruns; lower the cap if it fails
- [x] 1.9 `DIRECTOR_VERSION` to 9; verify `npm run check:endless` (seed fixtures unchanged)

## 2. Console: one + and − per instrument

- [x] 2.1 Two-row Arrangement group with `[− name +]` pairs and count badges, only the instruments the style or the song has, More complex and Simpler kept (D1); strings in English and Italian in `src/i18n.js`
- [x] 2.2 Shortcuts 1 to 8 and Shift+digit; tooltips with the reasons `cap`, `no-type`, `last-track`, and the warning past the recommended count
- [x] 2.2b Locks in the console next to each instrument, half state, sync with the mixer both ways; drawn lock icons (closed `LOCK`, a new open lock in `src/icons.js`) in the console and the mixer, emoji removed (D12); warning line and badge colour past the recommended count (D4)
- [x] 2.2c Riser row: button, length and direction menus, Suono dropdown shown from the start with its one option (Fruscio), row in every style, riser lock, tooltip explaining the riser (D11); strings in English and Italian
- [x] 2.3 Queue labels "+ arp (Arp 2)", "basso: bloccato", "riser 4 battute, sale", mixer rows for the new tracks; verify with `node tools/check-steering.cjs` (buttons per style, add twice, remove the last one, two kicks with the warning, cap at 12, cancel, lock and unlock in sync with the mixer, riser placed) and screenshots in Italian and English. Browser version of the owner's test: press "+ pad", seek two phrases on, the pad still plays and its mixer row is there
- [x] 2.4 `node --no-warnings tools/check-radio.cjs` and `node tools/check-transitions.cjs` with steered songs: no evaluation errors, below clipping

## 3. Target of Vary and Swap

- [x] 3.1 `target` on vary and swap, `auto` rule (least recently rewritten, seeded), old commands rewrite every track (D7); guitar in the part picker; verify in `tools/check-endless.mjs` (two arps, two Auto varies rewrite both in turn; replay same notes)
- [x] 3.2 Target dropdown in the console, reset to Auto when its track stops; queue names the track; verify with `node tools/check-steering.cjs`

## 4. Add a saved pattern

- [x] 4.1 `forRadio` with `sound`, `settings`, meter; `fitsAir` (type and meter, no style tag needed) (D9); verify in `npm run check:patterns`
- [x] 4.2 Command `pattern` with a copied item, `new` and `replace`, key moves (degrees follow, fixed notes by the smallest interval, chromatic hooks keep their mode), sound rule; verify in `tools/check-endless.mjs` (an A minor bassline in D minor plays D minor notes; replay after deleting the saved pattern gives the same song)
- [x] 4.3 Console panel: collapsed list with mini previews, expanded cards like the Patterns tab, Add as new track, Replace with a track dropdown, the count of patterns that do not fit; strings in English and Italian
- [x] 4.4 Preview listen through the loop player at the song's key and tempo, radio ducked by 12 dB and never paused; verify with `node tools/check-steering.cjs` (preview starts and stops, the radio keeps its position, the recording has no gap) and screenshots

## 5. Part harmony

- [x] 5.1 Command `voicing` with treatments thirds, octave, colour, inversion and `auto` (D8); `H<k>` pattern and step; verify in `tools/check-endless.mjs`: every note in the song's scale, colour only on pad and guitar, Auto never repeats the current treatment, replay same notes
- [x] 5.2 Console: Part harmony button in the Parts group with a treatment dropdown, sharing part and target; queue names the treatment; verify with `node tools/check-steering.cjs`
- [x] 5.3 Song harmony menu (progression and key, default Auto), confirmed by the owner (D8); verify in `tools/check-endless.mjs` (a chosen progression applies, Auto unchanged) and `node tools/check-steering.cjs`

## 6. Session scope

- [x] 6.1 `S.recipe.arrange` and `arrangeBias` for `more`, `less`, `pattern`, `voicing`, `lock-part`, `unlock-part` in session scope, a session lock starting at the instrument's first entry (D10); Vary, Swap and the riser song-only with the tooltip; verify the four scope and lock combinations of D10; verify in `tools/check-endless.mjs` that a session with "+ arp" for the session gives later songs one arp more, and that song by song equals a whole session
- [x] 6.2 Queue items "for the session", cancellable until the next song; saved sessions and playlists replay them; verify with `node tools/check-playlists.cjs` and `node tools/check-steering.cjs`

## 7. Docs, Guide and listening test

- [ ] 7.1 Guide cards for the per-instrument buttons and locks, the Riser row, Add a saved pattern, the target and Part harmony, the Song harmony menu, scope and lock together, English and Italian in `src/guide.js`; verify `npm run check:guide`
- [ ] 7.2 `docs/ENDLESS.md` Steering table, `docs/knowledge/radio-commands.md` and `decisions.md` (per-part key rejected, per-instrument caps rejected for warnings, riser as a row and not an instrument, scope and lock as two separate controls); `npm run knowledge` and `npm run check:knowledge`; `DEVLOG.md` in Italian
- [ ] 7.3 Owner's listening test: a session with two arps, three pads, two kicks, a locked bass, a riser into a drop, a saved bassline and Part harmony on the pad; check that an added instrument is still there a few seconds later; notes in `DEVLOG.md`
