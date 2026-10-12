# Proposal

## Why

A long video of a song or a radio session is hard to share in pieces. The owner wants short vertical clips (9:16) cut from it, each pointing back to the full video, made in a few clicks or asked of an agent (#57). Songs and saved sessions can be rebuilt exactly from their saved settings and seed, so any stretch can be rendered again as a clip with the fast video pipeline (#53).

## What Changes

- **Vertical layouts** for a 1080×1920 picture, built from the same parts as the horizontal video (stage, code, soul, song card): stage above and code below; stage above and soul below; stage in the middle with a text band above and below (title, tagline, a line pointing to the full video); soul in the middle with the bands.
- **Extracts** from a song or a saved session (playlist session, or the recipe file saved with a radio export):
  - **N random extracts** of a chosen length (15, 30, 60 s or any), seeded, not overlapping, preferring the lively parts;
  - **from a time to a time**, exact, matching the times of the long video of the same song or session.
- Each extract renders faster than real time with the fast video pipeline, starting a few seconds early so notes and effects are already sounding, with a short fade in and out, and saves one MP4 per extract plus a small list of what was cut (source, times, titles).
- **Where:** an Extracts action on song cards and on saved sessions; the vertical layout, text bands and length in Settings → Video next to the direction it already holds.
- **Agents:** the same functions from the browser console (`codingMiskClips`), so an agent driving the app can ask for "5 extracts of 30 s" or "from 12:40 to 13:10".
- **Live sessions:** cut after saving the session (the radio's + Playlist), not while live.
- **Naming:** the radio export already has "Clip" (#5, a new song composed to an exact length); these are called **Extracts** to keep the two apart.

## Capabilities

### New Capabilities

- `endless/vertical-clips`: vertical extracts of a song or a saved session, random or by time, rendered faster than real time with vertical layouts and text bands.

### Modified Capabilities

None. The fast video (`fast-video` change, not yet archived) is reused as it is; its block render gains a start time, an implementation detail.

## Impact

- Video layouts (vertical areas, text bands), frame composer, fast block render (start offset, fade in), fast video export, a pure picker for random extracts, song card and playlist session actions, Settings → Video, console API, i18n, Guide, new checks (`check:clips` pure, `check-clips.cjs` in the browser).
