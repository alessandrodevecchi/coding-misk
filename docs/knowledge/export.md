---
id: export
related: [radio, library, settings, live-build, profiles]
code: [src/export/fast.js, src/export/encode.js, src/export/fast-video.js, src/render/page.js, src/video/layout.js, src/video/fragments.js]
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
