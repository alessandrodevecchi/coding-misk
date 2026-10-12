# Tasks

## 1. Pure parts

- [x] 1.1 Vertical layouts in `layoutAreas` (`v-code`, `v-soul`, `v-bands`, `v-soul-bands`) and a 1080×1920 quality; checked in `check:video`.
- [x] 1.2 Fragment picker: bar scores from tracks playing and section kind, seeded non-overlapping windows on bar lines, "as many as fit"; times for "from a time to a time" with range checks.
- [x] 1.3 Fragment label code and number; glitch message pool and pick by seed.
- [x] 1.4 Text generator: title and description from timeline, recipe and seed; song list with times, genres, length, seed, mood lines; no artist names. New `npm run check:clips` for 1.2 to 1.4.

## 2. Render

- [x] 2.1 `renderInBlocks` start time (`job.start`): first block from `start - LEAD`, output shifted to 0, fade in; check that a 30 s fragment matches the same stretch of the full render (levels and correlation, as `check-export` does).
- [x] 2.2 Fast video with a source time offset: frames, code typing, voice lines and soul follow `start + t`.
- [x] 2.3 Composer: vertical layouts and bands (coding-misk logo with the equaliser above; tagline, full-video line and optional song title below; no artist names); the CRT fragment label; the glitch frames at start and end.

## 3. Fragments and texts

- [x] 3.1 `fragments()` for songs, playlist sessions and recipe files: one file per fragment, the fragments list and the texts; progress and cancel; `globalThis.codingMiskClips` (fragments and texts).
- [x] 3.2 Fragments menu on song cards and playlist sessions (count and length, or from and to; seed; Start), and a recipe file picker.
- [x] 3.3 Settings → Video, Vertical part: layout, tagline, full-video line, song title on or off, label on or off and next number, glitch frames on or off, default length; live preview in the vertical frame.
- [x] 3.4 Texts next to every fast export, video and recording; panel after the save with copy and draw again; texts on demand for songs and saved sessions.

## 4. Docs and checks

- [x] 4.1 i18n (EN and IT), Guide card, DEVLOG, ARCHITECTURE, AGENTS tooling lines.
- [x] 4.2 Browser check `tools/check-clips.cjs`: random and timed fragments from a song and a saved session, 1080×1920 files with sound (ffprobe), match with the long video, label numbers, glitch frames, every visual in each vertical layout (screenshots), texts saved, console API.

## 5. Formats and content (second step)

- [x] 5.1 Formats (9:16, 4:5, 1:1, 16:9), what to show, the visual's proportions, bands; areas for portrait and landscape; old layout names mapped.
- [x] 5.2 Turned picture (composition at the swapped size, drawn rotated).
- [x] 5.3 Code modes: focus on the part playing, scroll, follow.
- [x] 5.4 Menu and settings: the new choices and a live preview of the composition.
