Estimates in agent hours. Total: about 5 (4 to 6).

## 1. Marks (1 h)

- [x] 1.1 `narratorMarks(song, C, lang, files)` from `spokenSchedule` (narrator only, forced on for a switched-off narrator), cached per compiled build
- [x] 1.2 Cases in `npm run check:spoken`: explain and poetic styles, a line where the voice instrument speaks, a muted narrator, the same marks before and after the first edit

## 2. Row (1.5 h)

- [x] 2.1 Ghost row in `renderCells` and `renderTimeline`: when shown (D3), last row, head without Mute and Solo, section counts, lane marks, growth and ending ticks
- [x] 2.2 The real narrator row uses the same marks (D2, after Q1)
- [x] 2.3 CSS: neon, hardware theme, dimmed when off, phone width
- [x] 2.4 Tooltips in Italian and English (`src/i18n.js`)

## 3. Clicks and the switch (1 h)

- [x] 3.1 Cell and mark clicks seek to the nearest line, no track selected; empty lane adds nothing; keys
- [x] 3.2 Name click: Voice: narrator in view, Sound unfolded, focus
- [x] 3.3 First sound edit: the real row replaces the ghost and flashes; Undo brings the ghost back

## 4. Checks and docs (1.5 h)

- [x] 4.1 `tools/check-timeline.cjs`: ghost row in both views, aligned growth cell, ticks, tooltip, seek, no track selected, hidden with the Live build off, dimmed when off, hardware theme, 400 px
- [x] 4.2 `tools/check-voices.cjs`: first edit replaces the ghost, Undo brings it back
- [x] 4.3 `check:code` and `check:songs` unchanged (nothing in the song moves)
- [x] 4.4 Guide card of the Compose timeline (IT/EN), `npm run check:guide`; knowledge note, `npm run check:knowledge`; DEVLOG

## 5. Voice: narrator with the Live build off (owner request, 0.5 h)

- [x] 5.1 A note in the narrator block (IT/EN, the app's wording for In divenire and the Live build), shown only with the Live build off
- [x] 5.2 Sound and Narrator lines folded while the Live build is off (also when a song opens that way), the user's state kept and restored when it is turned on
- [x] 5.3 `tools/check-voices.cjs`: note, fold, restore, a song opened with it off, the Italian note; Guide card Two voices
