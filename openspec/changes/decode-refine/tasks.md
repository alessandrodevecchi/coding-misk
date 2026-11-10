# Tasks

Estimate: about 44 agent hours (36 to 56). The bench comes first, so every later group is measured against it. Each group ends with a short run in the app (dev server in the worktree on a free port) and the owner's checklist gets one item per group.

## 1. Bench and similarity check (about 7 h)

- [ ] 1.1 Two new test songs in `tools/decode-songs.mjs`: an acid track (909 kick with `crunch` on every beat under a distorted saw bass on A1 with a resonant sweep, a square hook, a crash) and an arp-and-lead track over syncopated drums (kick `0,4,7,8,10,12`), with their truth including the lead notes; export them with `tools/decode-export.cjs`.
- [ ] 1.2 Truth from the app's timelines: drum hits per row and section starts from a `.timeline.json` (as for `luci-rosse` and one fixed radio seed exported by the app), read by `tools/decode-measure.mjs`; print kick, clap and hat F1 and recall, distinct grids, chord quality per bar, bass octave errors.
- [ ] 1.3 `tools/decode-similarity.cjs`: fast-export the level B song of each file, compare with the original (rhythm per band, chroma, bass chroma, brightness ratio, band shares, arc, and a floor pair); scores in `tests/snapshots/decode-similarity.json` with a 0.05 margin; `DECODE_OWNER_DIR` prints the owner's files without storing.
- [ ] 1.4 Edit measures in `npm run check:decode` for both levels: share of bars edited, edits per minute, average size, small edits, section changes covered; print today's values as the baseline of design D7.

## 2. Drums on dense mixes (about 6 h)

- [ ] 2.1 Kick against bass note by the broadband click or pitch fall, and the every-beat rule (design D4); verify kick F1 at least 0.8 on the acid test song and on `luci-rosse`.
- [ ] 2.2 Hat and clap thresholds per section; verify hat F1 at least 0.8 on `luci-rosse` and at most 40 false claps on the radio seed.
- [ ] 2.3 Level B main grid by per-step majority; verify at most 2 patterns per section plus repeated variations on the radio seed.
- [ ] 2.4 Level A phase relock when the kicks enter; verify `luci-rosse`'s downbeat within 30 ms by bar 12 in Node and in the browser.

## 3. Harmony and bass (about 3 h)

- [ ] 3.1 Chord quality per section and root (design D5); verify at least 90 % right qualities on the radio seed.
- [ ] 3.2 Bass octave range and the quiet-bass rule; verify the radio seed's bass in octave 2 and a 15-semitone span at most per section on the owner's vocal tracks (printed).

## 4. Top line and Lead part (about 7 h)

- [ ] 4.1 Top line in level B with Essentia.js's predominant pitch and the YIN fallback, snapped to the scale; verify at least 70 % of the lead steps on the arp-and-lead song, with and without Essentia.js.
- [ ] 4.2 The `lead` code track in `writeFull` with one loop per section and no Lead below 30 % voiced; the Lead track in the Full track list with mute and solo; Open in Compose keeps it.
- [ ] 4.3 `check:decode` cases (Lead written, no Lead on an instrumental test song, the same code in Decode and Compose); `check:strudel` passes.

## 5. Sounds by measure (about 6 h)

- [ ] 5.1 Measure the app's drum machines once from their samples (kick decay and centroid, hat brightness) into a small table in `src/decode/`; the nearest machine wins, with `crunch` or `distort` when the original's kick is distorted.
- [ ] 5.2 Bass wave, cutoff and moving resonance; chord and Lead sound by brightness and decay; part levels to match band shares.
- [ ] 5.3 Verify with the similarity check: the 909 with distortion on `luci-rosse` and the radio seed, brightness ratio and band shares inside the targets on the app songs and test songs; "Simple kit" unchanged.

## 6. Balanced code changes (about 5 h)

- [ ] 6.1 The edit rule of design D7 in the writer for both levels (always on parts entering or stopping and on section changes; minimum difference; 4 bars per line, 2 bars overall; sounds only at section changes; level A loops that stop growing).
- [ ] 6.2 Verify the targets with the measures of 1.4 on every test file; the drums still mute on bar 33 with each look ahead; `check:live-code` and `check:crescendo` fixtures unchanged.

## 7. Vocal lines (about 3 h)

- [ ] 7.1 The `vox` helper in `src/song/writer.js` (returns silence) and in the standalone prelude; `check:strudel`'s clash rule and catalog coverage accept it.
- [ ] 7.2 The `vox` group in the writer: about 20 labels, seed from fingerprint and section, `$:` where the top line is heard, `_$:` elsewhere, none without a top line; `withoutVox` removes the whole group; never in Open in Compose.
- [ ] 7.3 Decoded code of the test songs in the scan of `tools/strudel-code.mjs`; verify `npm run check:strudel` and a Copy evaluated in a plain Strudel page with the prelude.

## 8. Tap tempo key (about 1.5 h)

- [ ] 8.1 T taps the tempo (no modifier, focus outside fields and the editor, track playing); Space only plays and pauses; the Tap button on `pointerdown` with its count and tooltip, en and it; verify in `tools/check-decode.cjs` with a focused mute button and four T presses.

## 9. Recent tracks and reopening (about 3 h)

- [ ] 9.1 "Another file" opens the panel with "Choose a file…", the recent tracks and Close; the open track keeps playing; the no-storage text; en and it.
- [ ] 9.2 Open asks the permission first in the click from the record in memory; a current level B model opens in Full; an old model says the analysis was made again.
- [ ] 9.3 Verify in `tools/check-decode.cjs`: the panel with a track open, Remove, reopen in Full with a stubbed file handle, the no-storage text; leave the real permission dialog to the owner's checklist (dc9, dc17).

## 10. Guide, knowledge and docs (about 2.5 h)

- [ ] 10.1 Guide card of the Decode tab updated in `src/guide.js` (Lead, Tap and T, recent panel, vocal lines), en and it; `npm run check:guide`.
- [ ] 10.2 `docs/knowledge/` (the Decode note, decisions: the similarity check and its targets, the edit rule, `vox` as an app helper, T for tap), `npm run knowledge` and `npm run check:knowledge`; `AGENTS.md` tooling lines for `decode-similarity.cjs`; `DEVLOG.md` entry with the scores before and after.
