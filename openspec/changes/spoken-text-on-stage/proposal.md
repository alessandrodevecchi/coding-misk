## Why

The stage shows a line of text over the visual while a song builds live, but it is not clear whose words they are (`#82`, owner request of 2026-10-29). Measured in the browser:

- The caption is always the step line (`step.say`), held for 4 bars. It is the narrator's words only with the explaining style.
- With the poetic style the narrator says images, and the stage shows step lines nobody says. In luci-rosse (Live coder, poetic, Narrated growth), 5 of the 38 lines heard match the caption, 28 play under another text and 5 play over an empty stage.
- The voice track (Voce: traccia) and the lines typed in the radio console are never shown: in prova-voce-taglio 18 voice-track lines are heard and none appears.
- Some captions are never heard: a step line without a sample, a line the narrator skips because the voice track speaks, the step that brings in the voice track.
- In the "Claude" look the step line is typed in the prompt as if the user wrote it, and the page caption is drawn over it a second time.

The owner wants every spoken text on the visual, whatever the settings, with the speaker clear, and in the "Claude" look as Claude's reply rather than the user's prompt.

## What Changes

- **Captions from what is heard.** The stage text comes from one schedule of spoken lines: the narrator's lines as the code speaks them (`spokenSchedule`, explain lines, poetic images, movement images), the voice track's lines, and the lines typed in the radio console. A line shows when it is spoken and for about as long as its sample, never when it is not heard.
- **Who speaks.** Each caption carries its speaker, Narrator or Voice, with its own style: the narrator in the app's mono face, the voice track in quotes in the display face.
- **The step line stays, as a small tag** in a corner, and only when it differs from what is heard (poetic style). With the explaining style the two are the same line, so only the caption shows.
- **Per look.** A caption lane at the bottom of the stage for most looks. The Studio monitor types the heard line. The "Claude" look shows the step line as the user's prompt and the spoken line as Claude's reply (● marker, typed at speech speed), with the voice track as a tool-output line, and no page caption over it.
- **Everywhere the stage goes.** The same captions in the session video, the fast video, fragments (9:16), the live output and the timeline layout of videos.
- **Settings.** A "Testi sul palco" card under Appearance: on or off, which speakers, the step tag, the placement, in videos too. On by default.
- **No line dropped for a missing sample.** When a song is prepared (Compose open, Generate, regrowth; the next radio song), every line it would speak is listed and the dev-server voice helper makes the missing samples before they play, then the song is compiled again. At play time a missing sample falls back to the default voice's sample of the same line, then to a sample made on the fly, and only then to silence with the text as the tag. `npm run check:samples` lists the lines without a sample over all songs, styles and vocabularies (`--strict` for CI-like runs).
- **Speaker registry.** Narrator and voice track become kinds with a precedence rank, an icon, a style and two flags (`exclusive`, off by default; `multiCaption`), so a future singing voice needs only a new entry. Today's rules stay: the voice track wins over the narrator on its bars, one narrator line per bar.
- Hardware theme: an amber display with a light per speaker. Phone and 9:16: two lines, speaker above the text.

## Capabilities

### New Capabilities

- `app/stage-captions`: spoken text over the stage, in the looks and in videos.

### Modified Capabilities

None in `openspec/specs/` (the stage caption has no requirement yet; `narrator.md` and `visuals.md` in `docs/knowledge/` describe it).

## Impact

- `src/song/build.js` (a caption schedule from `spokenSchedule`, with sample lengths), `src/main.js` (the stage caption, `stageInfo`, the fast video's `sayList`), `src/radio/radio.js` (`info`), `src/visuals.js` (Studio monitor, `termInfo`), `src/visuals/glyph-looks.js` (the "Claude" look), `src/video/video.js` (`drawSay`), `src/live/timeline.js`, `src/style.css`, `src/settings/settings.js`, `src/i18n.js`, `src/guide.js`.
- Growth and the radio director do not change, and the captions only read the schedule. Code and sound change only where a line had no sample and now gets one.
- Samples: `src/song/build.js` (`spokenNeeds`, per-line fallback), `src/song/speakers.js` (new), the voice helper in `vite.config.js` (called more often, unchanged), `tools/check-samples.mjs` (new). The sound changes only where a line was silent before for a missing file.
- Sample lengths come from `public/samples/say_lengths.json` (git-ignored, made by `npm run voices`); without it a line holds for 2 bars.
