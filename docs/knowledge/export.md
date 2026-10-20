---
id: export
related: [radio, library, settings, live-build, profiles]
code: [src/export/fast.js, src/export/encode.js, src/sounds/limiter.js, src/export/fast-video.js, src/render/page.js, src/video/layout.js, src/video/fragments.js]
checks: [npm run check:export, npm run check:video, npm run check:clips]
---

# Export

## What it is

The app turns songs and radio sessions into files: audio, video, short vertical fragments and a timeline.

- **Real time.** The song plays while it records.
- **Fast export.** A hidden page renders the song offline, much faster than real time, with the same sound. It also writes `<title>.timeline.json`: bars, tempo, sections, code per step, phrases and levels per instrument.
- **Video.** The stage, the code typing itself, the song card and the soul panel, drawn into a canvas. The fast video draws its frames from the timeline instead of the live player.
- **Fragments.** Vertical clips of a song or session, random or between two times, each with a label, a glitch and texts for sharing.
- **Recording.** The radio records from now until stopped, with a track list and the recipe.

## How it connects

- **Live build.** An export of a live build plays its steps; the code in a video types as in the app ([live-build.md](live-build.md)). The profile decides what the code shows ([profiles.md](profiles.md)).
- **Radio.** A session exports up to now, the next songs or a length ([radio.md](radio.md)).
- **Library.** Playlists and saved sessions export from the Songs tab and the Playlists tab ([library.md](library.md)).
- **Settings.** Format, speed, video layout, quality, card, visual and the fragment layout are set once in Settings ([settings.md](settings.md)).

Every export passes the master limiter, as the app does: the master level, the push of the song's style and the limiter are the same in the render page, so a file never clips and sounds as the song does live ([sound-and-levels.md](sound-and-levels.md)). The render removes the limiter's 5 ms delay, so the file and its timeline line up as before.

**Radio sessions with grown songs (radio-profiles D12).** A radio range, a saved session, a frozen session and a fragment of either rebuild the songs as the radio played them: profile, growth, steering, the Custom controls (`rebuild`, `radio.airSongs`). A session of Classic songs exports as before, one joined song with Classic controls. With a grown song the file plays window by window, as the radio moves its window (`sessionPlayable` in `src/main.js`): the song on air in its own view, the next one shown or hidden as the radio shows it, its code appearing whole when the song goes on air. The timeline and the video show only the code shown; the render page evaluates it with the hidden tail, and each segment carries the buses and functions of its song on air (`segmentAt`). The video types each song with its own typist at the video's column width. Fragments of such a session start on a step, and the first steps of a grown song only when nothing else fits. An export started with the radio off records the growth marker in its recipe only when one of its songs grows. Measured on a one-hour Live coder session: see `DEVLOG.md` (2026-10-20).

Long exports (over 10 minutes) are written to disk while they render, so memory stays flat. A sound that fails to load is skipped and named, instead of stopping the export.

## Options

- Audio format: `wav` (full quality), `flac` (lossless, about half the size), `mp3` (320 or 192 kbps), `opus`.
- Export speed: fast, or real time.
- Video layouts: visual, visual and code, the whole tab, and timeline layouts. Qualities: 1080p30, 1080p60, 720p30.
- Fragments: format (9:16, 4:5, 1:1, 16:9), what to show (visual, code, soul), aspect, bands, rotation, code mode, files (video, audio, texts).

Every option has its help text in Settings. The lists live in `src/export/encode.js` and `src/video/layout.js`.

## Example

The fast export of the Voices example, in the browser check:

```sh
node tools/check-export.cjs example-voices
```

It renders the song fast and in real time and compares them. They must sound the same.

## Where to read more

- [docs/ARCHITECTURE.md](../ARCHITECTURE.md#fast-export-8): fast export, timeline, long exports, sound guard.
- [docs/ARCHITECTURE.md](../ARCHITECTURE.md#video-27), [fast video](../ARCHITECTURE.md#fast-video-53), [fragments](../ARCHITECTURE.md#fragments-and-texts-for-sharing-57).
