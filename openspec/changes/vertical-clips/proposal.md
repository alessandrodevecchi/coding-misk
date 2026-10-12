# Proposal

## Why

A long video of a song or a radio session is hard to share in pieces. The owner wants short vertical videos (9:16) cut from it, each pointing back to the full video, made in a few clicks or asked of an agent (#57). Songs and saved sessions can be rebuilt exactly from their saved settings and seed, so any stretch can be rendered again with the fast video pipeline (#53). Every shared video also needs a title and a description in the app's voice.

## What Changes

- **Fragments** ("Frammenti"): short vertical videos cut from a song or a saved session.
  - **Formats and content:** 9:16, 4:5, 1:1 or 16:9; showing visual, visual and code, visual and soul, soul, or code; the visual's proportions inside the format (for example a 16:9 visual in a 9:16 frame), the rest going to a band above (the coding-misk logo) and a band below (a tagline and a line pointing to the full video), or a strip in landscape. No artist names; the song title only when turned on.
  - **Turned by 90°:** a landscape composition turned inside a vertical file, for viewers who turn the phone.
  - **Code:** focus on the part playing (lit at every bar), scroll through all of it, or follow the edits.
  - **Preview** of the composition in the menu and in the settings, before making.
  - **Fragment label:** an old CRT terminal line typed on the picture, in the mood of science-fiction computers, for example `FRAGMENT S0UL·7QX2 #014`: a code from the source and its seed, and a number that grows with every fragment made.
  - **Glitch frames:** the fragment opens and closes with the soul's glitch and "reading" screens (#46), with messages like "reading soul…", "signal found", "fragment recovered", drawn from a pool in the same mood.
  - **N random fragments** of a chosen length (15, 30, 60 s or any), seeded, not overlapping, starting on bar lines and preferring the lively parts; or **from a time to a time**, exact, matching the long video of the same source.
  - Rendered faster than real time, starting a few seconds early so notes and effects already sound, with a short fade in and out; one MP4 per fragment and a list of what was cut.
  - **Sources:** built-in and saved songs, playlist sessions, the recipe file saved with a radio export. Live sessions are cut after saving.
- **Texts for sharing:** the app proposes a title and a description for every fragment and for every long video or recording it saves: song list with times, genres, length, seed, and a few lines from a pool in the app's mood. They are saved next to the video and shown in a small panel to copy, edit and draw again.
- **Where:** a Fragments action on song cards and on saved sessions; the vertical layout, bands, label and default length in Settings → Video next to the direction it already holds.
- **Agents:** the same functions from the browser console (`codingMiskClips`), so an agent driving the app can ask for "5 fragments of 30 s" or "from 12:40 to 13:10", and for the texts.

## Capabilities

### New Capabilities

- `endless/vertical-clips`: vertical fragments of a song or a saved session, random or by time, with vertical layouts, label and glitch frames, rendered faster than real time.
- `endless/share-texts`: titles and descriptions proposed for fragments, long videos and recordings.

### Modified Capabilities

None. The fast video (`fast-video` change, not yet archived) is reused; its block render gains a start time, an implementation detail.

## Impact

- Video layouts (vertical areas, bands, label), frame composer, soul glitch frames reused in the composer, fast block render (start offset, fade in), fast video and recording exports (texts next to the file), a pure picker for random fragments, a pure text generator, song card and playlist session actions, Settings → Video, console API, i18n, Guide, new checks (`check:clips` pure, `check-clips.cjs` in the browser).
