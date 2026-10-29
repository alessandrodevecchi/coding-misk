## 1. Played map

- [x] 1.1 `playMap()` for growth, waypoint sections and ending; `growBars`, `arrSec`, `sceneStart`, readout and playing highlight use it

## 2. Columns

- [x] 2.1 Growth and ending columns in the strip and the grid, sections view and timeline view, outside `.arr-scene-btn`
- [x] 2.2 Growth cells per track: spans where the track plays, step ticks, click to the step and select the track
- [x] 2.3 Growth view toggle (hidden, compact, open), SVG eyes, tooltip IT/EN, remembered

## 3. One scale

- [x] 3.1 Ruler geometry over every column, ticks (bars, minutes, steps), snap to steps in the growth
- [x] 3.2 Knob, time, click, drag, keys (arrows, Page Up/Down, Home, End), strip clicks, playheads

## 4. Checks and docs

- [x] 4.1 `tools/check-timeline.cjs`: alignment, three modes, seek mapping, ending, keys, waypoints in Classic
- [x] 4.2 Guide card IT/EN, knowledge notes, DEVLOG

## 5. Follow the knob (follow-up)

- [ ] 5.1 Page follow of the arranger while playing (Follow playback on), smooth or a jump with reduced motion, held by user scrolling or a knob drag, cleared by play and seek, resumed after 3 s idle
- [ ] 5.2 `tools/check-timeline.cjs`: follow cases (open view, user scroll held, idle and seek resume, Follow playback off, reduced motion, compact never scrolls, timeline view)
- [ ] 5.3 Guide card IT/EN, knowledge note, DEVLOG
