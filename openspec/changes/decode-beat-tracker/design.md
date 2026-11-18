# Design

## Context

Level B (`src/decode/full.js`) picks a tempo from misk-analyzer, Essentia.js's RhythmExtractor2013 and a vote of three Essentia.js estimates, then fits one beat grid through the onsets (`fitGrid`) and checks the phase on the claps (round 9). Round 8 measured Beat This! with a Rust command-line port: the big model alone gets 33 of 35 bench tempos with a 0.25 s minimum beat interval, the small one 32 to 33 and fails on driven drums. Round 9 left three grid errors that only the learned tracker finds (decode round 9 notes).

## Goals / Non-Goals

Goals: the exact tempo, phase and downbeat from the tracker when the user has opted in; no change when not; no third-party request before the opt-in; files and runtime pinned and checked.

Non-goals: the tracker's tempo octave (it reads some half-time grooves at half); level A; WebGPU; the small model; Demucs and the Essentia.js opt-in.

## Decisions

### D1. Model and files

- **Model:** the official `final0` checkpoint (all data but GTZAN, seed 0), the one the reference code uses by default. Code and weights MIT (`LICENSE` and README of the official repository, checked again on 15 November 2026). The README warns that some training data are copyrighted or under limited Creative Commons terms and leaves the judgement to the user; the Settings card says so.
- **Format:** ONNX, a protobuf graph with the weights as tensors: no code runs when it loads. The official files are PyTorch Lightning checkpoints (Python pickle); they are never loaded in the browser.
- **Source:** the official host (the institute's cloud share) answered HTTP 500 ("maximum delay reached") on every try on 15 November, as in round 8. Three independent mirrors of `final0.ckpt` on a model hub (published July to October 2026 by three accounts) have the same SHA-256 (`8c328b45…8331`, 81,058,141 bytes); that checkpoint was loaded with `torch.load(weights_only=True)` (the restricted unpickler) in an isolated environment and converted with `torch.onnx.export` (opset 17, the conversion script of the Rust port). Three ONNX files exist: our own conversion, the Rust port's release asset (on a code host that sends no CORS headers, so a page cannot fetch it) and a hub conversion pinned at revision `0d66b58…`. All three have the same 20,251,488 weights, and each one's output on a bench song equals the checkpoint run in PyTorch within 7.5 × 10⁻⁵ (logits from −13.6 to 10.8; the same 97 beat peaks). The app downloads the hub files, which serve CORS: `beat_this_final0.onnx` (83,162,700 bytes, `a7e2c68b…4c14`) and its front end `logmel.onnx` (4,468,830 bytes, `f5afa499…bb43`), which equals the reference `LogMelSpect` within 2 × 10⁻⁴ and uses only `Conv` and matrix operators (no `STFT`).
- **Not committed:** 88 MB is too large for the repository, and the opt-in decision says the files reach a user only on request. Our own conversion is kept as a fallback recipe in the notes, not hosted.

### D2. Runtime

`onnxruntime-web` 1.31.1 (MIT, released 2026-10-26), exact version in `package.json`, installed with `--ignore-scripts` (its package has no install script). The level B worker imports its WebAssembly build (`onnxruntime-web/wasm`, 77 kB of JavaScript) and points it at `ort-wasm-simd-threaded.wasm` (14.2 MB) imported with Vite's `?url`, so the app serves it from its own origin. One thread, no proxy worker: the app is not cross-origin isolated, so no `SharedArrayBuffer`, no COOP/COEP headers. The app has no Content-Security-Policy today; a future one needs `'wasm-unsafe-eval'` (Essentia.js needs it already) and `connect-src` for the model host. The WebAssembly build and its glue contain no `eval` or `new Function` (checked by search; the WebGPU build, `asyncify`, has one `new Function` and is not used). `npm audit` reports nothing new for the package and its dependencies.

### D3. Download and storage

`beat-this-store.js`: `fetch` with `integrity: sha256-…` (the browser refuses a file that does not match), the bytes and SHA-256 checked again, stored in the Cache Storage `coding-misk-models-v1` keyed by the pinned URL; a localStorage flag says it is installed. The worker reads the files back and checks their SHA-256 before each load (about 0.2 s for 88 MB). Cancel aborts the fetch; any failure removes what was stored. Remove deletes the entries and the flag.

### D4. Pipeline (`engine-beat-this.js`, pure but for the runtime passed in)

Mono 44.1 kHz analysis copy → 22,050 Hz (windowed-sinc low-pass, every second sample) → the front end a minute at a time with two frames of context (the seams equal the whole) → 128-band log-mel frames at 50 per second → the model on chunks of 1,500 frames with 6-frame borders, the first chunk winning overlaps (as the reference `split_predict_aggregate`) → peaks: the maximum of 7 frames above 0, adjacent peaks merged, downbeats moved to the nearest beat (the reference "minimal" post-processing). On three bench files the beats equal the reference Python run (soxr and PyTorch) on 197 of 197, 477 of 477 and 265 of 270 beats within one frame; the Rust port matches 192, 473 and 253.

### D5. The grid (`beatGrid`, `trackerGrid`, `BEAT_RULE`)

Beats closer than 0.25 s to the last kept one dropped; steady when at least 1 beat a second and the intervals' coefficient of variation under 0.6; the period that the beats lock to best (the length of the mean of e^(2πi·t/p), searched within 4 % of the median interval), then a straight line through the beats within 15 % of a period of the grid: the exact tempo and phase over the whole file. A tempo within 0.06 BPM of a whole number is taken whole (the 20 ms frames read 124.02 for 124), as misk-analyzer's own line fit does. The tracker's tempo against the picked one: the same within 2 % → its grid; half or double → its beats on the picked octave; 3:2 → its tempo; otherwise nothing. The tempo is misk-analyzer's line fit when that is whole and within 0.3 BPM of the tracker's (a 30-second song at 138 read 137.83 by the tracker), else the tracker's; misk-analyzer's stays when the tracker's lies more than 0.2 BPM away at the same octave (`move`, a gate measured on one real track). The phase is misk-analyzer's onset phase unless the tracker's beats lie at least 3/8 of a beat from it (a breakbeat song half a beat off; on two of the owner's files the tracker sits a sixteenth after the kicks), then the claps' check of round 9. The downbeat: the beat of four that holds at least 40 % of the tracker's downbeats, else misk-analyzer's on the new grid.

### D6. Stored analyses and versions

The model records `beatTracker` (its tempo, lock, rate, spread, time, the relation used) and `engines.grid`. With the tracker installed, a stored level B analysis made without it is not opened in Full; Full makes it again. `ANALYSIS_VERSION` rises in round 10 for the whole-tempo rule of the default analysis (spec `decode/analysis`), not for the tracker.

### D7. Speed and memory (4-minute file, M4, Chrome, 5 runs each)

| Case | Load | Run | Memory (Chrome processes) |
| --- | --- | --- | --- |
| big, WebAssembly, headless / headed | 0.75 / 0.67 s | 29.1-30.0 / 28.8-29.6 s | +0.5 GB with the model, up to +0.6 GB in a run, back after release; no growth over 5 runs |
| small, WebAssembly | 0.6 s | 14.7-16.4 s | similar |
| big, WebGPU | 1.1-1.4 s | 4.0-5.2 s | lower |
| small, WebGPU | 0.9 s | 3.1-4.1 s | |

The same beats in every case; no long task on the main thread. Download from the hub: 1.3 s for the big model here (520 Mbit/s), about 14 s at 50 Mbit/s. WebAssembly was chosen (one build, no `new Function`); WebGPU is 6 times faster and can come later.

## Verdict (round 10 bench, 15 November 2026)

The rule, written before measuring: better on the real tracks and the owner's files, no file worse by more than 0.5 dB of band error, no worse tempo. Big model, final `BEAT_RULE`, against the tracker off:

| Set | Tempo right (2 %) | Downbeat right | Band error dB | Low/mid/high rhythm |
| --- | --- | --- | --- | --- |
| tuning (14) | 13 → 14 | 10 → 14 | 2.23 → 2.08 | 0.571/0.632/0.829 → 0.628/0.705/0.877 |
| validation (14) | 12 → 12 | 10 → 12 | 2.67 → 2.49 | 0.542/0.593/0.847 → 0.565/0.615/0.857 |
| fresh (9) | 9 → 9 | 9 → 9 | 1.60 → 1.60 | equal |
| owner (7) | 6 → 6 | no truth | 2.55 → 2.58 | 0.309/0.170/0.419 → 0.316/0.173/0.417 |
| real (26) | 21 → 21 of 21 | no truth | 3.02 → 3.07 | 0.308/0.240/0.444 → 0.305/0.245/0.469 |

Worse by more than 0.5 dB: three real tracks, two of them with their grid moved to the reference tempo (180 and 109) and one by the downbeat. The small model: real 3.16 dB. A gate on the tempo kept one of them at its old tempo but its downbeat still cost 1.0 dB. Not shipped. Where it helps: a tempo read at 3:2, a phase half a beat off on syncopated drums, a long track whose line fit drifts. A later round can try the tracker only where the free engines disagree, never for the downbeat, and first find why a grid nearer the reference raises the band error.

## Risks / Trade-offs

- The hub account can delete the files: the pins stop a changed file, not a missing one. Mitigation: the conversion recipe in the notes; a mirror under the project's control later.
- The training-data caveat is the authors' own; the card repeats it and leaves the choice to the user.
- 30 s more for Full on a 4-minute file with WebAssembly.
- A track with a real tempo change: one grid for the whole file, as today.
