## 1. Generator

- [x] 1.1 Drum forms: repeat, off-beat, short cell, full row; joined rows of one kit
- [x] 1.2 Note forms: repeated cells and groups (`*`, `!`); the progression on top as `.add()` with MIDI roots when the line is the same on every chord (scale degrees later)
- [x] 1.3 Unrecognised patterns stay as they are; text pass `idiomatic(code)` (`src/song/idiom.js`)

## 2. Wiring

- [x] 2.1 Setting `coding-misk-live-gen` in Compose next to the code view; Crescendo first
- [x] 2.2 Typing and growth steps with the short forms

## 3. Checks and docs

- [x] 3.1 Browser check (`tools/check-compact-code.cjs`): events compared as pitches, durations too except drum machines, on Crescendo states of five songs
- [ ] 3.2 Snapshots of the idiomatic code for the test songs
- [ ] 3.3 Short video for the owner; Guide, docs, DEVLOG
