# Tasks

Two rounds (owner, 8 November). **Part 1** is done now: about 14 agent hours (11 to 17). **Part 2** waits: about 32 agent hours (26 to 40). The recent tracks (the old group 9) moved to the change `decode-library`. Each group ends with a short run in the app (dev server in the worktree on a free port), and the owner's checklist gets one item per group.

## Part 1

### 1. Edit measures (about 2 h)

- [x] 1.1 `tools/decode-edits.mjs`: the code the tab shows at each bar of any audio file (ffmpeg), level A as it plays with the look ahead and level B with "Follow the song"; share of bars edited, edits per minute, mutes, average size, small edits, section changes covered; `--rule` to try other numbers.
- [x] 1.2 Baseline with the code before part 1 on the owner's four files (Luci Rosse and the radio song exported by the app, two third-party tracks with a voice), in the design (D7).

### 2. Balanced code changes (about 4 h)

- [x] 2.1 `EDIT_RULE` and `differsEnough` in `src/decode/writer.js` (design D7).
- [x] 2.2 Level A: `planA`, a plan for every bar (enter on two bars heard, stop on two bars not heard, sounds only when a part enters, a change held two bars, the waits, loops that stop growing); `momentSong` reads it.
- [x] 2.3 Level B: `steady` for the bars heard inside a section (fixes the flicker of the old one-bar smoothing), drum variants that wait.
- [x] 2.4 `check:decode` cases: 2 of 16 bass steps, a relative chord, one drum step, a flickering part, a four-bar loop that stays, the targets on a generated song in both levels, the drums still muted on bar 33 with each look ahead.
- [x] 2.5 Measure after on the owner's files; numbers in the DEVLOG and the design.

### 3. Top line lines (about 3 h)

- [x] 3.1 misk-analyzer's `top.up` per bar; `ANALYSIS_VERSION` 2; the test songs of `tools/decode-audio.mjs` can hold a melody.
- [x] 3.2 `topPlan` and `voxGroup` in the writer (`TOP_RULE`, `vox` or `melody`, labels and methods by seed, `$:` and `_$:`), `withVox`, `withoutVox` (also the old comment), `voxOf`, `VOX_PRELUDE`.
- [x] 3.3 `vox` and `melody` as app helpers (`HELPERS`, `installHelpers`); the tab shows the group in both levels, plays the code without it, and Copy keeps it with its helpers.
- [x] 3.4 Decoded code of a generated song with a hook in `check:strudel` (`tools/strudel-code.mjs`); `check:decode` cases (the group in the hook only, none without a top line, `vox` for a top line through the track, same seed same lines, Strudel in Node evaluates the copied code and plays only the parts).

### 4. Tap tempo, Auto, Full (about 2.5 h)

- [x] 4.1 T taps the tempo (no modifier, focus outside fields and the editor, track playing); Space only plays and pauses; the Tap button on `pointerdown` with its count, also before the tempo is found; Auto after a tapped or picked tempo (the worker's `auto`, misk-analyzer's `resetTempo`); en and it.
- [x] 4.2 Full before Play: check that it works (design D10); the proposal after 8 bars in Live; the stored analysis note.
- [x] 4.3 `tools/check-decode.cjs`: four T presses with a mute button focused, the Tap count, Auto, Full before Play, the proposal, the group in the code column and not in the evaluated code.

### 5. Guide, knowledge and docs (about 1.5 h)

- [x] 5.1 The Decode card of `src/guide.js` (T and Tap, Auto, the top line lines, Full before Play), en and it; `npm run check:guide`.
- [x] 5.2 `docs/knowledge/` (the Decode note, decisions: the edit rule, `vox` and `melody` as app helpers, T for tap), `npm run knowledge`, `npm run check:knowledge`, `npm run catalog:strudel`; `AGENTS.md` tooling line for `decode-edits.mjs`; `DEVLOG.md`; `CHANGELOG.md`.

## Part 2 (on hold)

### 6. Bench and similarity check (about 7 h)

- [x] 6.1 Two new test songs in `tools/decode-songs.mjs`: an acid track (909 kick with `crunch` on every beat under a distorted saw bass on A1 with a resonant sweep, a square hook, a crash) and an arp-and-lead track over syncopated drums (kick `0,4,7,8,10,12`), with their truth including the lead notes; export them with `tools/decode-export.cjs`.
- [x] 6.2 Truth from the app's timelines: drum hits per row and section starts from a `.timeline.json` (as for `luci-rosse` and one fixed radio seed exported by the app), read by `tools/decode-measure.mjs`; print kick, clap and hat F1 and recall, distinct grids, chord quality per bar, bass octave errors.
- [x] 6.3 `tools/decode-similarity.cjs`: fast-export the level B song of each file, compare with the original (rhythm per band, chroma, bass chroma, brightness ratio, band shares, arc, and a floor pair); scores in `tests/snapshots/decode-similarity.json` with a 0.05 margin; `DECODE_OWNER_DIR` prints the owner's files without storing.
- [x] 6.4 Is Essentia.js worth keeping (owner, 11 November): on the bench of 6.1 to 6.3 and the owner's files, measure level B with and without Essentia.js (tempo, key, chords, time, download size), and the borderline confidence cases. Then a listening round by the owner: the same files decoded with and without Essentia.js, labelled A and B in random order, one checklist item per file. Keep it only where the numbers and the owner's ears agree that it helps; record the result in `docs/knowledge/decisions.md`. Result (owner, 11 November): kept for now; neither version sounds like the original yet and the owner has no preference, so the question returns in 11.2.

### 7. Drums on dense mixes (about 6 h)

- [x] 7.1 Kick against bass note by the broadband click or pitch fall, and the every-beat rule (design D4); verify kick F1 at least 0.8 on the acid test song and on `luci-rosse`.
- [x] 7.2 Hat and clap thresholds per section; verify hat F1 at least 0.8 on `luci-rosse` and at most 40 false claps on the radio seed.
- [x] 7.3 Level B main grid by per-step majority; verify at most 2 patterns per section plus repeated variations on the radio seed.
- [x] 7.4 Level A phase and tempo relock when the kicks enter; verify `luci-rosse`'s downbeat within 30 ms by bar 12 and the radio song at 176 BPM by bar 16, in Node and in the browser.

### 8. Harmony and bass (about 3 h)

- [x] 8.1 Chord quality per section and root (design D5); verify at least 90 % right qualities on the radio seed.
- [x] 8.2 Bass octave range and the quiet-bass rule; verify the radio seed's bass in its own octave (G1 to B1, written `g1 a1 b1`) and a 15-semitone span at most per section on the owner's vocal tracks (printed).

### 9. Top line and Lead part (about 7 h)

- [x] 9.1 Top line in level B with Essentia.js's predominant pitch and the YIN fallback, snapped to the scale; verify at least 70 % of the lead steps on a generated hook over drums, with and without Essentia.js; its voicing replaces part 1's `top.up` for the top line lines. Target changed (owner, 11 November): a line under a louder pad and arp is a known limit (arp-and-lead song: 13 % with Essentia.js, 0 % without; hook over drums: 89 % and 75 %); separating the parts first would need a large download.
- [x] 9.2 The `lead` code track in `writeFull` with one loop per section and no Lead below 30 % voiced, a sung melody muted by default; the Lead track in the Full track list with mute and solo; Open in Compose keeps it.
- [x] 9.3 `check:decode` cases (Lead written, no Lead on an instrumental test song, the same code in Decode and Compose); `check:strudel` passes.

### 10. Sounds by measure (about 6 h)

A first round is on `feat/91-decode-part-2` (commit 86fcef0), not merged (owner, 11 November): the kit choice is right on 5 of 8 bench files, the bass filter and the brightness of `luci-rosse` and the acid song improve, but the 909 replacing the 808 lowers the mid-band rhythm of two test songs, and distortion, chord and Lead sounds and part levels are not done. A second round fixes these before the merge.

- [ ] 10.1 Measure the app's drum machines once from their samples (kick decay and centroid, hat brightness) into a small table in `src/decode/`; the nearest machine wins, with `crunch` or `distort` when the original's kick is distorted.
- [ ] 10.2 Bass wave, cutoff and moving resonance; chord and Lead sound by brightness and decay; part levels to match band shares.
- [ ] 10.3 Verify with the similarity check: the 909 with distortion on `luci-rosse`, the 909 without distortion on the radio seed (its source drives no drums: `drive 0`, so "with distortion" holds for `luci-rosse` only), brightness ratio and band shares inside the targets on the app songs and test songs; "Simple kit" unchanged.

### 11. Guide, knowledge and docs for part 2 (about 3 h)

- [ ] 11.1 Guide card (the Lead), `docs/knowledge/` (the similarity check and its targets), `AGENTS.md` tooling line for `decode-similarity.cjs`, `DEVLOG.md` with the scores before and after; retune `EDIT_RULE` against the new parts.
  Done for groups 6 to 9 (11 November, `docs/91-docs-refresh`): the Decode card's Lead (en, it), `docs/knowledge/decode.md` (the rules of groups 7 to 9, the similarity check and its targets, the edit targets) and six rows in `decisions.md`; the `AGENTS.md` tooling lines were already there for `decode-similarity.cjs`, `decode-measure.mjs` and `check-stage-switch.cjs`; `EDIT_RULE` measured after groups 7 to 9 and with six other rules (design D7): kept as it is. Open: group 10's part (sounds by measure, its docs and its similarity scores before and after in the DEVLOG).
- [x] 11.3 Similarity check noise: the arc score changes between exports of flat songs (it fails on the base commit too); make it stable before the snapshot is updated. Done (12 November): two causes, the fast export of a song with a supersaw was not repeatable (the render page now seeds each worklet voice by its start and pitch) and the arc of a flat song was a correlation of noise (each curve's variance now has a 1 dB floor); two runs from an empty cache match the snapshot.
- [ ] 11.2 Essentia.js again: the A/B listening round of 6.4 repeated after groups 7 to 10 (same files, new random labels); keep, drop or limit it, recorded in `docs/knowledge/decisions.md`.
