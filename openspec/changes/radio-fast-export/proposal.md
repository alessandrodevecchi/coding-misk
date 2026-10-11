# Proposal

## Why

The fast export (#8) covers songs and sessions saved in playlists. The radio itself only records in real time. The owner wants to export the radio fast too, and to choose how much: up to now, the next N songs, or a target length in minutes (60, 178…). Long targets do not fit in memory as one render.

## What Changes

- **Export from the radio panel:** a button beside Record opens a small panel with the range: "Up to now" (from the first song to the one on air), "Next N songs" (from the song on air), "Length" (from the song on air, until a number of minutes; the song that crosses the target plays to its end). With the radio off, the ranges start from the first song of a new session with the panel's seed and options.
- **Audio now, video with #53:** the panel follows the AUDIO / VIDEO display; video comes with the fast video.
- **Long exports in blocks:** every fast export renders in blocks of a few minutes, each with a few seconds of lead in so notes and tails cross the cut, and encodes block by block. Memory stays flat for any length.
- The track list and the recipe are saved with the radio export, as with the radio recording.

## Capabilities

### New Capabilities

- `endless/radio-fast-export`: export the radio faster than real time over a range of songs or minutes.

## Impact

- Radio panel and its export panel, the radio's rebuild (songs until a count or a length), the fast export's render job (time windows) and encoder (streaming), i18n, Guide.
