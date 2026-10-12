# Tasks

## 1. Pure parts

- [ ] 1.1 Vertical layouts in `layoutAreas` (`v-code`, `v-soul`, `v-bands`, `v-soul-bands`) and a 1080×1920 quality; checked in `check:video`.
- [ ] 1.2 Extract picker: bar scores from tracks playing and section kind, seeded non-overlapping windows on bar lines, "as many as fit"; times for "from a time to a time" with range checks. New `npm run check:clips`.

## 2. Render

- [ ] 2.1 `renderInBlocks` start time (`job.start`): first block from `start - LEAD`, output shifted to 0, fade in; check that a 30 s extract matches the same stretch of the full render (levels and correlation, as `check-export` does).
- [ ] 2.2 Fast video with a source time offset: frames, code typing, voice lines, song card and soul follow `start + t`.
- [ ] 2.3 Composer: vertical layouts and text bands (title and artist, tagline, full-video line).

## 3. Extracts

- [ ] 3.1 `extract()` for songs, playlist sessions and recipe files: one file per extract and the extracts list; progress and cancel; `globalThis.codingMiskClips`.
- [ ] 3.2 Extracts menu on song cards and playlist sessions (count and length, or from and to; seed; Start), and a recipe file picker.
- [ ] 3.3 Settings → Video, Vertical part: layout, tagline, full-video line, default length; live preview in the vertical frame.

## 4. Docs and checks

- [ ] 4.1 i18n (EN and IT), Guide card, DEVLOG, ARCHITECTURE, AGENTS tooling lines.
- [ ] 4.2 Browser check `tools/check-clips.cjs`: random and timed extracts from a song and a saved session, 1080×1920 files with sound (ffprobe), match with the long video, every visual in each vertical layout (screenshots), console API.
