# Proposal

## Why

The owner tested the Decode tab on 8 November (checklist items dc4, dc6, dc9, dc16, dc17, dc18). Five problems came out:

- The decoded code does not sound like the original, in Live and in Full, even on the app's own exports such as "Luci Rosse". Open in Compose works, but the music is not similar.
- In Live the code changes almost every bar by a few characters, so a line is nearly always marked as edited.
- A song with vocals ends with a bare `// vox: …` comment, which does not suggest that the voice is being read.
- Tap tempo uses the space bar, which also presses the focused button.
- "Recent tracks" is not visible, and "Another file" opens the system file picker directly.

The measurements in `design.md` show that the analysis gets tempo and key right on every test file in Full. The distance comes mostly from what the writer leaves out (the top line), from the sounds it picks, and from drums lost under a loud bass.

## Two rounds

The owner split the change in two rounds (8 November). **Part 1** is done now. **Part 2** waits: it is written here so the work is not lost, and it is not implemented in part 1.

| Part | What                                                                                                                                                            | Estimate                        |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 1    | Balanced code changes, top line lines (`vox(…)` and `melody(…)`), Tap tempo with the T key and back to the automatic tempo, Full selectable by hand before Play | about 14 agent hours (11 to 17) |
| 2    | Similarity: render-based similarity check, the Lead part, sounds by measure, drums, chords and bass fidelity, level A phase relock                              | about 32 agent hours (26 to 40) |

"Recent tracks" (the "Another file" panel, reopening in Full, the note when the browser keeps no storage) moved to a separate change, `decode-library`. It is not part of this change any more.

## What Changes

### Part 1

- **Balanced code changes.** A line changes when its part enters or stops, or when its new pattern differs enough, has held for two bars, and enough bars passed since that line's last edit and since any edit. In level B a part enters or stops only when it holds for two bars inside a section, and a drum variant waits like any edit. Level A loops stop growing inside a section. The numbers sit in one place (`EDIT_RULE` in `src/decode/writer.js`) so they can be tuned after the owner listens. `tools/decode-edits.mjs` measures edits per minute, the share of bars with an edited line, the average edit size and the section changes covered, on any audio file; `npm run check:decode` checks the targets on a generated song.
- **Top line lines.** The `// vox: …` comment becomes a group of one to three lines that look like code, such as `$: vox("reading from track").gain(0.8)` or `$: melody("tracing the hook").room(0.3)`. `vox` and `melody` are app helpers that evaluate to silence, also in the code copied out of the app. A line is `$:` where the analysis hears a top line (a hook, an arp, a melody or a voice) and `_$:` elsewhere; a track with no top line has no group. Part 1 measures the top line with a simple per-bar measure (the share of tonal energy between 400 and 2000 Hz), which cannot tell a voice from a synth: a track whose top line runs through the whole track gets `vox` lines, another one `melody` lines. `npm run check:strudel` scans decoded code with its group.
- **Tap tempo key.** The **T** key taps the tempo and a **Tap** button sits next to ½× and 2×, with the count of taps. A small **Auto** button next to them goes back to the tempo the analysis found, after a tapped, halved or doubled tempo. The space bar plays and pauses only.
- **Full by hand, also before Play.** The level switch already lets the user pick Full before pressing Play: the analysis runs and Play then starts in Full (checked in the code: `tab.js` `runFull`; task 4.2 checks it in the browser). Part 1 keeps Live as the default and adds the proposal: after 8 bars in Live the tab suggests Full once per track.
- `ANALYSIS_VERSION` goes from 1 to 2 (the bars carry the top line measure); a stored analysis is made again on the next open, and the tab says so.

### Part 2 (on hold)

- **Closer to the original (similarity).** A render-based similarity check that compares the code's sound with the original bar by bar, and targets for it. A new **Lead** part writes the top line (the hook, arp or sung melody) as a code track in Full, muted by default for a sung melody (owner's answer). Sounds by measure are calibrated against the track itself: drum machine, bass wave and filter movement, distortion, chord sound and level. Drums keep the kick under a loud bass, eighth-note hats and fewer false claps. Chords keep their quality inside a section, and the bass stays in one octave range. Level A relocks its beat phase and its tempo when the drums enter.
- The top line of part 2 (Essentia.js's predominant pitch) replaces part 1's measure for the `vox` and `melody` lines.

Out of scope: machine-learning transcription or stem separation (level C), tempo changes, meters other than 4/4, the vocals as audio, the recent tracks (`decode-library`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `decode/analysis`: the top line measure, the tap tempo key and the Auto button, the stored analysis message (part 1); drums under a loud bass, hats, claps, chord quality per section, bass octave range, the top line by predominant pitch, level A phase relock, the similarity check (part 2).
- `decode/code-writing`: the edit balance rule, loops that settle, the targets, the top line lines (part 1); the Lead part and sounds by measure (part 2).
- `decode/playback`: the Tap and Auto buttons, Full before Play and the proposal after 8 bars (part 1); the Lead track in Full (part 2).

These capabilities are defined in the change `track-to-code`, which is **not archived yet** (11 tasks open on 10 November). The deltas here are written against its specs; this change is archived after `track-to-code`.

## Impact

Part 1:

- `src/decode/writer.js` (the edit rule, `planA`, `steady`, the top line group), `src/decode/misk-analyzer.js` (the `top` measure, back to the automatic tempo), `src/decode/worker.js`, `src/decode/model.js` (`ANALYSIS_VERSION`), `src/decode/tab.js` (Tap, Auto, the Full proposal, the group in the shown and copied code, the stored analysis message).
- `src/main.js` (the T key; Space only plays and pauses), `src/song/writer.js` (`vox` and `melody` as app helpers), `src/i18n.js`, `src/guide.js`.
- Tools: `tools/decode-edits.mjs` (new), `tools/decode-audio.mjs` (a melody in the test songs), `tools/check-decode.mjs`, `tools/check-decode.cjs`, `tools/strudel-code.mjs` (decoded code in `check:strudel`).
- Docs: `docs/knowledge/` (decode note, decisions), `AGENTS.md` tooling lines, `DEVLOG.md`, `CHANGELOG.md`.

Part 2: `src/decode/full.js`, `sections.js`, `misk-analyzer.js`, `writer.js`, `engine-essentia.js`; `tools/decode-similarity.cjs` (new), `tools/decode-measure.mjs`, `tools/decode-songs.mjs`; `ANALYSIS_VERSION` goes up again.
