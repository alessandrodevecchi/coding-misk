# Proposal

## Why

The owner tested the Decode tab on 8 November (checklist items dc4, dc6, dc9, dc16, dc17, dc18). Five problems came out:

- The decoded code does not sound like the original, in Live and in Full, even on the app's own exports such as "Luci Rosse". Open in Compose works, but the music is not similar.
- In Live the code changes almost every bar by a few characters, so a line is nearly always marked as edited.
- A song with vocals ends with a bare `// vox: …` comment, which does not suggest that the voice is being read.
- Tap tempo uses the space bar, which also presses the focused button.
- "Recent tracks" is not visible, and "Another file" opens the system file picker directly.

The measurements in `design.md` show that the analysis gets tempo and key right on every test file. The distance comes mostly from what the writer leaves out (the top line), from the sounds it picks, and from drums lost under a loud bass.

## What Changes

- **Closer to the original (similarity).** A render-based similarity check that compares the code's sound with the original bar by bar, and targets for it. A new **Lead** part writes the top line (the hook, arp or sung melody) as a code track in Full. Sounds by measure are calibrated against the track itself: drum machine, bass wave and filter movement, distortion, chord sound and level, with the app's existing effects. Drums keep the kick under a loud bass, eighth-note hats and fewer false claps. Chords keep their quality inside a section, and the bass stays in one octave range. Level A relocks its beat phase when the drums enter.
- **Balanced code changes.** An edit needs a minimum musical difference and a minimum number of bars since the last edit of that line, except for a part that enters or stops. Section and energy changes always get their edit. A check measures edits per minute, the share of bars with an edited line and the average size of an edit.
- **Vocal lines.** The `// vox: …` comment becomes a few lines that look like code and stand for the voice, such as `$: vox("reading from track")`, varied by track and section. They use a no-op app helper that evaluates to silence. They show only where the model hears a top line. `check:strudel` scans the decoded code.
- **Tap tempo key.** The **T** key taps the tempo and a **Tap** button sits next to ½× and 2×. The space bar keeps play and pause only.
- **Recent tracks.** "Another file" opens a small panel with the recent tracks and "Choose a file…". Reopening a track with a stored full analysis opens in Full without analysing again. The tab says when the browser keeps no storage.

Out of scope: machine-learning transcription or stem separation (level C), tempo changes, meters other than 4/4, the vocals as audio.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `decode/analysis`: drums under a loud bass, hats, claps, chord quality per section, bass octave range, the top line, level A phase relock, tap tempo key.
- `decode/code-writing`: the Lead part, sounds by measure, the edit balance rule, the vocal lines.
- `decode/track-input`: the recent tracks while a track is open, reopening in Full, storage unavailable.
- `decode/playback`: the Lead track in Full, the Tap button.

These capabilities are defined in the change `track-to-code`, which is not archived yet. This change is applied after `track-to-code` is archived, so its deltas apply to the archived specs.

## Impact

- `src/decode/`: `misk-analyzer.js`, `full.js`, `sections.js` (drums, chords, bass, top line, phase relock), `writer.js` (Lead part, sounds, edit rule, vocal lines), `tab.js` (Tap, T key, recent panel, reopen), `store.js`.
- `src/main.js` (key handler), `src/song/writer.js` (the `vox` helper and its prelude), `src/i18n.js`, `src/guide.js`.
- Tools: `tools/decode-similarity.cjs` (new, browser), `tools/decode-measure.mjs`, `tools/decode-songs.mjs` (richer test songs), `tools/check-decode.mjs`, `tools/check-decode.cjs`, `tools/strudel-code.mjs` (decoded code in `check:strudel`).
- `ANALYSIS_VERSION` goes up: stored analyses are made again on the next open.
- Docs: `docs/knowledge/` (decode note, decisions, checks), `AGENTS.md` tooling lines, `DEVLOG.md`.
