# Tasks

Estimate: about 9 agent hours: research and measurements (about 3 h), pipeline and grid (about 2 h), Settings card and storage (about 1.5 h), bench with the tracker on and off (about 1.5 h), checks and docs (about 1 h). Round 10: the in-app part ships only if the verdict rule holds (proposal). Round 12: it ships as an option off by default (section 6).

## 1. Research

- [x] 1.1 Licence of code and weights from the official repository (MIT; the training-data caveat).
- [x] 1.2 The checkpoint's provenance (official host down; three mirrors with one SHA-256), loaded with the restricted unpickler, converted to ONNX; the hub's ONNX and the Rust port's compared with it (weights and outputs).
- [x] 1.3 Runtime: `onnxruntime-web` pinned, install scripts, `eval`/`new Function`, external URLs, `npm audit`, OSV.
- [x] 1.4 Browser measurements: big and small, WebAssembly and WebGPU, headless and headed Chrome, load and run time on a 4-minute file, memory over 5 runs (round 10 notes).

## 2. Pipeline and grid

- [x] 2.1 `src/decode/beat-this.js`: pins, resampling, chunks, join, peaks, `beatGrid`, `phaseOn`.
- [x] 2.2 `src/decode/engine-beat-this.js` (runtime passed in), `engine-beat-this-browser.js` (the worker's runtime and files), `tools/beat-this-node.mjs` (Node, cached results).
- [x] 2.3 `full.js`: `beatTracker` option, `trackerGrid`, `BEAT_RULE`, `engines.grid`, `beatTracker` in the model, the failure note.
- [x] (left out after the verdict) 2.4 The worker's `beats` flag, the tab's flag, stale level B analyses with the tracker installed, the grid's engine in the panel, the progress stage.

## 3. Settings

- [x] (left out after the verdict) 3.1 `src/decode/beat-this-store.js`: download with integrity and SHA-256, progress, cancel, remove, status, load.
- [x] (left out after the verdict) 3.2 The "Deep beat analysis" card in English and Italian: what, third party, licence, training data, size, host, on this device; Download, Cancel, Remove with confirmation.
- [x] (left out after the verdict) 3.3 Guide text in the Decode card.

## 4. Measures and checks

- [x] 4.1 `npm run check:decode`: pins, chunks, peaks, a 6-minute grid, an unsteady pad, relations, off by default, a generated track with the model (skipped without its files), a failing tracker.
- [x] 4.2 Bench every set, owner and real with the tracker off and on (big and small): tempo, drift, downbeat, band error, rhythm, bass recall; the verdict rule. Result: failed (design, Verdict).
- [x] 4.3 Browser: the Settings card (download from a local copy, progress, a bad file refused, Remove) and Full with the tracker on a 4-minute file (passed before the in-app part was left out).

## 5. After the verdict

- [x] 5.1 Leave out the in-app part: the Settings card, the storage, the worker's and the tab's wiring, the strings, the Guide text, the browser check; `onnxruntime-web` moved to the dev dependencies (the bench runs it in Node).
- [ ] 5.2 A later round: a gate that the real tracks pass (see design, Verdict), before the tracker can be on by default.

## 6. Round 12: an option off by default

- [x] 6.1 The patch's in-app parts ported onto the current code: the worker's `beats` flag, the tab's flag and stale level B analyses, the grid's engine in the panel, the progress stage (2.4); `beat-this-store.js` (3.1); the card (3.2) with an on/off option, off by default (the cache not even opened while off), Remove also while off, the files removed by Reset everything, the downloaded flag left out of backups; the Guide text (3.3).
- [x] 6.2 The local build flag `VITE_DECODE_BEAT_TRACKER` (`on`): the option starts on; set only by the git-excluded `vite.local.config.mjs` with `define`.
- [x] 6.3 `onnxruntime-web` 1.31.1 back in the app's dependencies (exact version, `--ignore-scripts`).
- [x] 6.4 Security checked again (design, "Round 12").
- [x] 6.5 Checks: `check:decode` (the option off by default, the runtime imported only by the worker's dynamic import, the pin in `package.json`), `tools/check-beat-tracker.cjs` (off by default with nothing requested through a Full analysis, on, a changed file refused, download, Full with the tracker, off again, Remove; `--flag`).
