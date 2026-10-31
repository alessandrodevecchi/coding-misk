# Tasks

Estimate: about 70 agent hours (58 to 88), in the order below. Level A and its shared base first (groups 1 to 5, about 33 h), then level B (groups 6 and 7, about 15 h), export (group 8, about 6 h), then the bench, the checks and the docs (groups 9 to 11, about 15 h). The owner wants to build first and test after: each group ends with a short run in the app (dev server in the worktree: `BROWSER=none npm run dev -- --port 5251 --strictPort`), and the bench and the check scripts come after the build.

## 1. Tab shell and file input (about 6 h)

- [ ] 1.1 Add the Decode tab between Songs and Playlists (`index.html`, `showTab` in `src/main.js`), the `#tab-decode` panel, the page heading "Track to code" / "Da brano a codice", the tab name "Decode" / "Decodifica", and the new tab in `modeListenSub` (en and it); verify in the app that the tab order is Compose, Songs, Decode, Playlists, Radio and the tab is remembered after a reload.
- [ ] 1.2 `src/decode/input.js`: file picker and drop area, `mediabunny` tags and duration, the 10-minute refusal before decoding, decoding with `decodeAudioData` and the `mediabunny` sample sink for video files, title and artist from tags or the file name; verify with a WAV, an MP3, an MP4 video, a video without sound, a 12-minute file and an unreadable file in the app.
- [ ] 1.3 Fingerprint (size, duration, SHA-256 of three slices) and `src/decode/store.js` (IndexedDB `coding-misk-decodes`, cap 50, `ANALYSIS_VERSION`, quiet failures, file handle where available); verify that a renamed file matches, a same-size different file does not, and a reload leaves no audio in storage (DevTools storage view or a small page script).
- [ ] 1.4 Empty state with the recent list (title, artist, length, Full done), one-click reopen with the stored handle and permission, "pick the file again" naming the expected file, remove from the list; verify by hand in the app.

## 2. Light analyser and song model (about 10 h)

- [ ] 2.1 `src/decode/model.js`: the model shape of design D6 and `ANALYSIS_VERSION`; `src/decode/worker.js`: holds the mono PCM, answers "analyse up to t" and "analyse all", with progress and cancel; verify the worker loads in the dev server and in `npm run build`.
- [ ] 2.2 `src/decode/engine-light.js` frames and onsets: STFT at three sizes, per-band spectral flux with the adaptive threshold, kick or bass, closed or open hat; verify on a generated click track in Node (onset times within 10 ms).
- [ ] 2.3 Tempo and downbeat (design D7): autocorrelation with priors, half and double candidates, uncertainty flag, downbeat votes; verify on generated tracks at 90, 124 and 174 BPM in Node.
- [ ] 2.4 Grids, bass, chords, key, levels: 16-step grids with the hysteresis of D9, YIN bass per step, chroma and chord templates, key from chords, levels per band per bar; verify on a generated track with known chords and bass in Node.

## 3. Writer and sounds (about 5 h)

- [ ] 3.1 `src/decode/writer.js`: model to v2 song (D9): sections, a `drums` track from the grids, `code` tracks for bass and chords, clips from levels, nearest format key; verify that `node --no-warnings tools/song.mjs validate` accepts the songs written from the Node test models.
- [ ] 3.2 Header and placeholder (D14): the title line with and without Attribution, `// vox: …`; the `cover` song field in the validator and `docs/SONG-FORMAT.md`; verify with `npm run check:songs` and a compile of a written song.
- [ ] 3.3 Sound presets (D10): "Our sounds" by measure from the generator's tables, "Simple kit" fixed; verify that two models with different brightness give different sounds with "Our sounds" and the same with "Simple kit".

## 4. Two tracks, mix and one clock (about 6 h)

- [ ] 4.1 `src/decode/sync.js` (D12): the original's source on Strudel's clock, start on the first downbeat, seek, stop; the player bar (Play, Stop, timeline, time, bar counter, Previous and Next disabled, other players stopped on Play); verify by rendering a decoded click track and measuring the offset between the original's and the code's kicks (under 10 ms).
- [ ] 4.2 `src/decode/mix.js` (D11): the `orig` gain into the master stage before the limiter, the loudness trim, equal-power slider, per-track buses, mute and solo as listening controls; verify that mute and solo never change the code text and the levels follow the slider (peak levels read in the page).
- [ ] 4.3 The consistency rules of D11 as a pure state function with Node cases for every scenario of the playback spec (default, unmute code, user mute kept, solo the original, solo a code track).
- [ ] 4.4 Muted code tracks at zero gain still light their notes; measure long tasks and audio underruns with 8 code lines muted for 2 minutes; if the cost is high, switch to querying the pattern for lit notes (D11 risk) and record the measure in the DEVLOG.

## 5. Level A live (about 6 h)

- [ ] 5.1 Level A loop: per bar, the model up to the horizon, the writer, `typingPlan` with the bar as deadline, evaluation on the bar; a full start pastes lines; dropped drums mute with `_$:`; verify by playing a generated track whose drums stop at bar 33.
- [ ] 5.2 Look ahead (D8): one select with Off, 2 s, 4 s, 2 bars, 4 bars, default 2 bars, stored with the track; first window analysed before the sound starts; verify that with 2 bars the drums mute on bar 33 and with Off on bar 34 or 35.
- [ ] 5.3 Tempo controls (D7): tempo readout with "uncertain", ½× and 2×, tap tempo with the space bar (no focused field), stored; verify by tapping in the app and by a page script that sends four key presses.
- [ ] 5.4 The code column and the shared stage (D1): the decoded code typing in `#codecol` with its source line, Code over showing it over the stage only when on, Live coder display controls, narrator off, the folded Options group (comments, technical functions, code view) stored per track, title and artist fields and the Attribution toggle updating the header; verify each option changes the code and not the sound.

## 6. Level B analysis (about 7 h)

- [ ] 6.1 Add `essentia.js` 0.1.3 (exact version) and `src/decode/engine-essentia.js`, loaded by a dynamic import inside the worker only for level B; verify that `npm run build` puts it in its own chunk and that no other tab requests it (network log of a page script).
- [ ] 6.2 Whole-file steps: Essentia tempo and beats, key, HPCP and `ChordsDetectionBeats` on the beats, merged with the light engine's grids, bass and levels; key mode settled by chord evidence; fallback to the light engine alone when Essentia fails; verify on the Node test tracks and with Essentia blocked.
- [ ] 6.3 Sections, variations, ending: novelty on chroma and levels for section bounds, section kinds, variant patterns that repeat, the ending bar; verify on a generated track with known sections (bounds within one bar).
- [ ] 6.4 The growing mark and progress text in the level switch, cancel, the result stored; verify that a 4-minute file finishes in less than its length and the page stays responsive (no long task over 200 ms).

## 7. Level B code and Open in Compose (about 8 h)

- [ ] 7.1 Growth value `follow` (D13) in `src/live/profiles.js`, `src/live/live-code.js` and `src/live/written-plan.js`, offered only for songs with a `cover` field; verify that `node tools/check-crescendo.mjs` fixtures and `SHAPES_VERSION` do not move and `npm run check:crescendo` passes.
- [ ] 7.2 Level B playback: several code tracks in the track list, each with mute and solo; the level switch (Live, Full), Full by default when stored; switching while playing takes over at the next bar with the code of that bar whole; verify in the app.
- [ ] 7.3 Open in Compose (D15): runs level B when missing, saves a user song with the Live coder profile, `growth: 'follow'`, narrator off and `cover`; Compose plays it as in Decode and switches to Classic and Crescendo; verify in the app and with `node --no-warnings tools/song.mjs validate` on the saved song.

## 8. Export with the original (about 6 h)

- [ ] 8.1 Real-time export and recording of the mix as heard (the original through the master stage); verify a WAV export with the slider in the middle holds both and one fully on Code holds only the code.
- [ ] 8.2 Fast export and fast video: the original's PCM span and the mix state passed to the render page, mixed before its limiter; timeline with title and artist; verify fast and real-time exports match within the tolerance of `node tools/check-export.cjs`.
- [ ] 8.3 Fragments with the original's span, weights from section kinds; verify a 30-second 9:16 fragment's sound lines up with the original within one frame.
- [ ] 8.4 Texts for sharing (D16): the rights line with Attribution on and off and for code only, in `textsFor`; verify with `npm run check:clips` extended with the three cases.

## 9. Bench (about 7 h)

- [ ] 9.1 `tools/decode-bench.mjs` (Node, no browser): ground truth from built-in songs (tempo, key, chords per bar, grids and bass from the compiled song's haps) and their WAV exports from `node tools/export-audio.cjs`; runs both levels and prints tempo and octave errors, downbeat error, key (exact, relative, fifth), chord accuracy, grid F1 per band, bass accuracy.
- [ ] 9.2 Pick about 10 built-in songs across styles and tempos; measure, tune thresholds where a score is clearly low, and record the scores in `tests/snapshots/decode-bench.json` with a margin; `npm run check:decode-bench` fails when a score drops below it.
- [ ] 9.3 Owner files: read a git-ignored folder of the owner's audio, print the measures without ground truth, and write a short listening note template in `notes/`; compare the light engine alone with the light engine plus Essentia and record in `docs/knowledge/decisions.md` whether a Settings engine choice is worth a later change.

## 10. Check scripts (about 5 h)

- [ ] 10.1 `npm run check:decode` (no browser): fingerprint, store cap and version, file name fallback, writer output (header, Attribution, `// vox: …`, presets, clips from levels, hysteresis), mix consistency rules, look-ahead horizons, rights lines.
- [ ] 10.2 `PORT=5251 node tools/check-decode.cjs [shots-dir]` (dev server): tab order and names in both languages, a generated WAV dropped, level A playing with each look-ahead value, the code typing in the code column, Code over on and off, mute, solo and slider, tap tempo, level B with the growing mark and cancel, reopen with a matching file, Open in Compose, an export with the original, 400 px with no sideways scroll; update `tools/check-modes.cjs` for the new tab.
- [ ] 10.3 Run `npm run check:code`, `npm run check:songs`, `npm run check:crescendo`, `npm run check:export`, `npm run check:clips`, `node tools/check-backup.mjs` and `node tools/snapshot-levels.cjs check` (dev server on 5251, no edits under `src/` while it runs); all green.

## 11. Guide, knowledge and docs (about 3 h)

- [ ] 11.1 Guide card for the Decode tab in `src/guide.js`, English and Italian (what, how, good to know: the file stays local, levels, look ahead, the two tracks, Open in Compose, exports and the rights line); verify with `npm run check:guide`.
- [ ] 11.2 Knowledge note `docs/knowledge/decode.md` (concepts, options, engines, model, checks), glossary entries, decisions (engine choice, Meyda rejected, PCM over `AnalyserNode`, `code` tracks for free chords, `follow` only for decoded songs), a recipe row "Decode a track"; `npm run knowledge` then `npm run check:knowledge`.
- [ ] 11.3 `docs/ARCHITECTURE.md` (the Decode module, worker, master stage), `AGENTS.md` tooling lines for the new checks, `DEVLOG.md` entry in Italian with the bench scores and what the owner should listen for.

## Workflow follow-up

- Show the change to the owner; open the GitHub issue and add its `Refs:` trailer to the next commits.
- Archive the change after the owner's tests.
