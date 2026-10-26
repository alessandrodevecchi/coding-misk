## 1. Measure

- [x] 1.1 `growth:probe` reports reused lines (new pattern line, no like line among the lines it replaces, a line at least 0.8 alike shown earlier and gone): count, identical, growth or written part, typing ratio; `--json` field `reused`. Verify: on `develop` the totals over the built-in songs are 45 reused, 28 identical, 39 in the written part (design, Context)
- [x] 1.2 Record before numbers in the DEVLOG: reused totals, section-change typing of luci-rosse, settimo-cielo, kellerlicht, kellerlicht's written steps (274.5 s, 11 rushed). Verify: DEVLOG entry

## 2. Mute or delete on the code shown (D1)

- [x] 2.1 `compileNow` takes the shown-text transform; `muteOrDelete` costs on it and compares the line's own share with `CLOSE`. Verify: kellerlicht acid line muted from bar 280, bar 320 edits it (probe, code at bars 280 and 320)
- [x] 2.2 `check:mixer -- --full`, `check-compact-code.cjs` (dev server on its own port), `check:code` (Classic unchanged), `check:live-code`, `check:typing`

## 3. Replaced lines keep a place (D2)

- [x] 3.1 A line replaced by an unlike line of the same track that returns in the written part stays muted above its replacement when D1 says so; on return it is unmuted. Verify: kellerlicht bar 360 unmutes the rolling bass, bar 392 the floor kick; probe count
- [x] 3.2 `check:mixer -- --full`, `check-compact-code.cjs`, `check:live-code`

## 4. Copy from earlier code (D3)

- [x] 4.1 `typingPlan` option `earlier`: a new line of 40 characters or more with no like line above it is pasted from the most alike earlier line and edited; `makeTyping`, `typingLoad`, `growth:probe` pass the lines shown up to the step. Verify: a case in `check:typing` (an identical line comes back: paste, no keys typed for it; a near copy: paste and edit of the difference)
- [x] 4.2 `check:typing`, `check:crescendo -- --full` (Live coder fixtures rewritten with the reason, Crescendo fixtures unchanged), list the songs whose kept shape changed

## 5. Edit while muted (D4)

- [x] 5.1 A muted returning line that returns changed shows its return form from the step of its silence with the most spare time. Verify: kellerlicht acid line in its bar-320 form from bar 312 (Körper), the step at bar 320 only unmutes it
- [x] 5.2 `check:mixer -- --full`, `check-compact-code.cjs`, `check:live-code`, `check:typing`

## 6. New lines typed ahead, muted (D8)

- [x] 6.1 After D1 to D4, plan lines ahead in the written part: a step with spare time of at least the line's typing plus 2 s takes one new line of a coming step (up to the next section change, at most 32 bars ahead), rushed target steps first; limits 2 ahead at once, 1 per step, 1 per track, none with 4 or more muted lines shown. The line is muted in its final form in its own place; its step only unmutes it. Verify: `growth:probe` reports lines ahead, rushed steps and most muted lines shown per song, before and after; screenshots of a song with lines ahead for the owner before tuning the limits
- [x] 6.2 Check: a case in `check:live-code` (or `check-compact-code.cjs`) on a built-in song the probe picks (a rushed section change after a step with spare time): the code shows the line muted from the earlier step, the section change only deletes its `_`, and no moment of any built-in song shows more than 2 lines ahead or adds one with 4 muted lines shown. The case fails on the code before D8
- [x] 6.3 `check:mixer -- --full`, `check-compact-code.cjs`, `check:typing`, `check:live-code`; screenshots for the owner of a song with lines ahead at the step that types them and at the section change

## 7. Versions and after numbers (D7)

- [x] 7.1 `SHAPES_VERSION` 8 with the Live coder fixtures, `npm run durations`, `check:durations`. Verify: `check:crescendo -- --full` passes
- [x] 7.2 After numbers in the DEVLOG (task 1.2 measures again) and screenshots of kellerlicht at Körper and Druck for the owner. Verify: reused lines fewer than 45 and none on kellerlicht's written part that was muted or shown earlier unchanged

## 8. Radio shape settings (D5, D6)

- [ ] 8.1 Session start stores the non-default shape settings (shapes tried, try all with Keep, random order off) in the recipe; "Long song from" stays at its default on air; `growOnAir` passes them to the growth. Verify: `check:radio-profiles` with the radio fixtures unchanged, and new cases (a recipe with `shapeSearch` grows with it, one with random order off tries the fixed order, one without grows as before)
- [ ] 8.2 Worker: default growth first, wider growth after; the wider one replaces the default one before the song's limit when the song has no commands; `growNow`, steering and the page fallback use the default; the choice is recorded per song and replays and exports follow it. Verify: `check:radio-profiles` case with a forced late wider growth (recorded `default`, replayed the same)
- [ ] 8.3 Settings hints in English and Italian say the radio follows the shapes tried, try all and random order, and that "Long song from" is Compose only; Guide card and `check:guide`; `tools/check-settings.cjs` and `tools/check-radio.cjs` on their own dev server port
- [ ] 8.4 Measure in the browser worker the time of the default and of the try-all growth on a few radio songs (`check-radio.cjs` or a probe), DEVLOG

## 9. Docs

- [ ] 9.1 Knowledge notes: `growth-shapes.md` (radio and settings, copy from earlier code), `live-build.md` (typing), `comments-and-functions.md` if muted lines are named there, `radio.md`, `settings.md`, `decisions.md` (D1, D2, D6, D8 and the rejected time budget), the "Long song from" radio follow-up in `status.md` or the backlog; `npm run knowledge`, `check:knowledge`
- [ ] 9.2 DEVLOG entry in Italian for each stage; `npm run check:crescendo` quick level before each commit
