Estimate: about 24 agent hours (design, Estimate). Phases 1 to 3 alone, Monitor and Rullo without the layer, are about 12 hours.

## 0. Owner

- [ ] 0.1 Owner answers the open questions in the design (base, looks, layer, mapping, counts, duplicates, colours, silent instruments, fast video, defaults, names). Verify: answers in the design; proposal, spec and tasks updated
- [ ] 0.2 Owner says go. Verify: answers and go in the DEVLOG

## 1. Painters (3 h)

- [ ] 1.1 Shared painters module (`roll`, `wheel`, `spiral`, `scope`, `spectrum`) drawing in a box with given colours, from `src/video/widget-frames.js` and `src/live/widgets.js`. Verify: `npm run check:export` and `node tools/check-export.cjs` give the same code widget frames as before (pixel compare of a few frames)
- [ ] 1.2 Colour maps per instrument for neon and hardware, and from a look's palette. Verify: `check:stage-widgets` case

## 2. Stage feed (4 h)

- [ ] 2.1 `readAudio` keeps a wave per instrument (no extra analyser). Verify: level snapshots unchanged (`node tools/snapshot-levels.cjs check` same result as before)
- [ ] 2.2 Notes per instrument from the playing pattern, queried once per cycle and cached, filtered as "Widget notes". Verify: browser check, one song note by note against the fast video's notes
- [ ] 2.3 Spectrum columns rebuilt from the frame's time. Verify: `check:stage-widgets`, same frame alone and in a sequence

## 3. Looks (5 h)

- [ ] 3.1 Monitor: grid by proportions, panels per section by D5, level bar, onset flash, dimmed silent panels, fade at boundaries. Verify: `check:stage-widgets` (panels per section, layouts 16:9, 9:16, 1:1); screenshots
- [ ] 3.2 Rullo: one pitch axis for the melodic instruments, legend, drum lanes, playhead. Verify: screenshots on two songs
- [ ] 3.3 Entries in `LOOKS` with English and Italian names. Verify: `npm run knowledge`, `npm run check:knowledge`

## 4. Layer (2.5 h)

- [ ] 4.1 Strip and Palco screen drawn after the look in `paint`; not on widget looks and soul. Verify: screenshots of each look with the strip; Palco with the screen
- [ ] 4.2 Off by default leaves every look identical. Verify: `node tools/screenshot-visual.cjs` before and after on every look

## 5. Fast video (3 h)

- [ ] 5.1 Render page sends notes per instrument per block. Verify: `npm run check:export`
- [ ] 5.2 Per-instrument renders reused for stage scope and spectrum; fallback scaled by level, said in the log. Verify: `node tools/check-export.cjs` with Monitor, both `realScope` values; time against the Palco look within 10%

## 6. Settings (2.5 h)

- [ ] 6.1 Card "Stage widgets" with sections, defaults, backup, reset. Verify: `check-settings.cjs`, `check-backup.mjs`
- [ ] 6.2 Texts in English and Italian; Guide card. Verify: `npm run check:guide`

## 7. Checks and docs (4 h)

- [ ] 7.1 `npm run check:stage-widgets` (no browser) and a browser check with frame times (budget of D10) and screenshots. Verify: both pass; times in the DEVLOG
- [ ] 7.2 `check:video`, `check:clips`, `check:live`, `node tools/check-video.cjs`, `node tools/check-clips.cjs`, `node tools/check-live.cjs` with a widget look. Verify: all pass
- [ ] 7.3 With the layer off and no widget look: `npm run check:code`, `npm run check:mixer`, level snapshots, fixtures unchanged
- [ ] 7.4 Knowledge base (`visuals.md`, `code-widgets.md`, `decisions.md`, `settings.md`), `docs/DESIGN-SYSTEM.md`, DEVLOG with screenshots shown to the owner. Verify: `npm run check:knowledge`
