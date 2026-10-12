# Tasks

## 1. Pure parts

- [ ] 1.1 Vertical layouts in `layoutAreas` (`v-code`, `v-soul`, `v-bands`, `v-soul-bands`) and a 1080×1920 quality; checked in `check:video`.
- [ ] 1.2 Fragment picker: bar scores from tracks playing and section kind, seeded non-overlapping windows on bar lines, "as many as fit"; times for "from a time to a time" with range checks.
- [ ] 1.3 Fragment label code and number; glitch message pool and pick by seed.
- [ ] 1.4 Text generator: title and description from timeline, recipe and seed; song list with times, genres, length, seed, mood lines; no artist names. New `npm run check:clips` for 1.2 to 1.4.

## 2. Render

- [ ] 2.1 `renderInBlocks` start time (`job.start`): first block from `start - LEAD`, output shifted to 0, fade in; check that a 30 s fragment matches the same stretch of the full render (levels and correlation, as `check-export` does).
- [ ] 2.2 Fast video with a source time offset: frames, code typing, voice lines and soul follow `start + t`.
- [ ] 2.3 Composer: vertical layouts and bands (coding-misk logo with the equaliser above; tagline, full-video line and optional song title below; no artist names); the CRT fragment label; the glitch frames at start and end.

## 3. Fragments and texts

- [ ] 3.1 `fragments()` for songs, playlist sessions and recipe files: one file per fragment, the fragments list and the texts; progress and cancel; `globalThis.codingMiskClips` (fragments and texts).
- [ ] 3.2 Fragments menu on song cards and playlist sessions (count and length, or from and to; seed; Start), and a recipe file picker.
- [ ] 3.3 Settings → Video, Vertical part: layout, tagline, full-video line, song title on or off, label on or off and next number, glitch frames on or off, default length; live preview in the vertical frame.
- [ ] 3.4 Texts next to every fast export, video and recording; panel after the save with copy and draw again; texts on demand for songs and saved sessions.

## 4. Docs and checks

- [ ] 4.1 i18n (EN and IT), Guide card, DEVLOG, ARCHITECTURE, AGENTS tooling lines.
- [ ] 4.2 Browser check `tools/check-clips.cjs`: random and timed fragments from a song and a saved session, 1080×1920 files with sound (ffprobe), match with the long video, label numbers, glitch frames, every visual in each vertical layout (screenshots), texts saved, console API.
