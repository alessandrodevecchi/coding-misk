## 1. Measure

- [ ] 1.1 `growth:probe` reports reused lines (new pattern line, no like line among the lines it replaces, a line at least 0.8 alike shown earlier and gone): count, identical, growth or written part, typing ratio; `--json` field `reused`. Verify: on `develop` the totals over the built-in songs are 45 reused, 28 identical, 39 in the written part (design, Context)
- [ ] 1.2 Record before numbers in the DEVLOG: reused totals, section-change typing of luci-rosse, settimo-cielo, kellerlicht, kellerlicht's written steps (274.5 s, 11 rushed). Verify: DEVLOG entry

## 2. Mute or delete on the code shown (D1)

- [ ] 2.1 `compileNow` takes the shown-text transform; `muteOrDelete` costs on it and compares the line's own share with `CLOSE`. Verify: kellerlicht acid line muted from bar 280, bar 320 edits it (probe, code at bars 280 and 320)
- [ ] 2.2 `check:mixer -- --full`, `check-compact-code.cjs` (dev server on its own port), `check:code` (Classic unchanged), `check:live-code`, `check:typing`

## 3. Replaced lines keep a place (D2)

- [ ] 3.1 A line replaced by an unlike line of the same track that returns in the written part stays muted above its replacement when D1 says so; on return it is unmuted. Verify: kellerlicht bar 360 unmutes the rolling bass, bar 392 the floor kick; probe count
- [ ] 3.2 `check:mixer -- --full`, `check-compact-code.cjs`, `check:live-code`

## 4. Copy from earlier code (D3)

- [ ] 4.1 `typingPlan` option `earlier`: a new line of 40 characters or more with no like line above it is pasted from the most alike earlier line and edited; `makeTyping`, `typingLoad`, `growth:probe` pass the lines shown up to the step. Verify: a case in `check:typing` (an identical line comes back: paste, no keys typed for it; a near copy: paste and edit of the difference)
- [ ] 4.2 `check:typing`, `check:crescendo -- --full` (Live coder fixtures rewritten with the reason, Crescendo fixtures unchanged), list the songs whose kept shape changed

## 5. Edit while muted (D4)

- [ ] 5.1 A muted returning line that returns changed shows its return form from the step of its silence with the most spare time. Verify: kellerlicht acid line in its bar-320 form from bar 312 (Körper), the step at bar 320 only unmutes it
- [ ] 5.2 `check:mixer -- --full`, `check-compact-code.cjs`, `check:live-code`, `check:typing`

## 6. Versions and after numbers (D7)

- [ ] 6.1 `SHAPES_VERSION` 8 with the Live coder fixtures, `npm run durations`, `check:durations`. Verify: `check:crescendo -- --full` passes
- [ ] 6.2 After numbers in the DEVLOG (task 1.2 measures again) and screenshots of kellerlicht at Körper and Druck for the owner. Verify: reused lines fewer than 45 and none on kellerlicht's written part that was muted or shown earlier unchanged

## 7. Radio shape settings (D5, D6)

- [ ] 7.1 Session start stores the non-default shape settings in the recipe; `growOnAir` passes them to the growth. Verify: `check:radio-profiles` with the radio fixtures unchanged, and a new case (a recipe with `shapeSearch` grows with it, one without grows as before)
- [ ] 7.2 Worker: default growth first, wider growth after; the wider one replaces the default one before the song's limit when the song has no commands; `growNow`, steering and the page fallback use the default; the choice is recorded per song and replays and exports follow it. Verify: `check:radio-profiles` case with a forced late wider growth (recorded `default`, replayed the same)
- [ ] 7.3 Settings hints in English and Italian say the radio follows the settings; Guide card and `check:guide`; `tools/check-settings.cjs` and `tools/check-radio.cjs` on their own dev server port
- [ ] 7.4 Measure in the browser worker the time of the default and of the try-all growth on a few radio songs (`check-radio.cjs` or a probe), DEVLOG

## 8. Docs

- [ ] 8.1 Knowledge notes: `growth-shapes.md` (radio and settings, copy from earlier code), `live-build.md` (typing), `comments-and-functions.md` if muted lines are named there, `radio.md`, `settings.md`, `decisions.md` (D1, D2, D6 and the rejected time budget); `npm run knowledge`, `check:knowledge`
- [ ] 8.2 DEVLOG entry in Italian for each stage; `npm run check:crescendo` quick level before each commit
