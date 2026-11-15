# Proposal

**Status (round 10, 15 November 2026): specified, built and measured; the in-app part not shipped.** The verdict rule below failed on the owner's files and the real tracks (see design, "Verdict"). The pure parts stay as a bench option (`decode-bench.cjs --beat-this`); the Settings card, the download, the storage and the worker's wiring were built and checked, then left out (a patch in the private round 10 notes). Apply the rest of this change only after a later bench passes the rule.

## Why

Level B of the Decode tab places one beat grid over the whole track. Its tempo comes from the app's own analyser, Essentia.js and a vote of three tempo estimates; its grid is a line fitted through the onsets. Three errors stay after round 9: a long real track whose grid fits 111.17 BPM instead of 111 and drifts by about half a second over six minutes, a breakbeat song whose grid sits half a beat off, and a drum and bass song read at 116 instead of 174. On the bench a learned beat tracker, Beat This! (ISMIR 2024, code and weights MIT), finds all three. The owner decided on 15 November that third-party models reach the app only as opt-in downloads in Settings, with a clear disclaimer, like Demucs and Essentia.js Full; Beat This! follows that pattern.

## What Changes

- **Settings: "Deep beat analysis".** A card in Settings, off by default, offers to download Beat This! (about 88 MB with its front end). The card says what it is, that it is a third-party model under the MIT licence with training data that include copyrighted recordings, its size, where it is downloaded from, and that it runs on this device only. The download shows its progress, can be cancelled, and is checked against SHA-256 pins; a file that does not match is refused. Once downloaded the card shows the size on disk and a Remove button.
- **Level B uses it when present.** With the model downloaded, Full runs it on the whole file in the level B worker, after Essentia.js. Its grid gives the exact tempo, the beat phase and the downbeat; the tempo picked by the free engines keeps its octave (the model reads some half-time grooves at half). Without the model, Full runs as today.
- **The runtime.** ONNX Runtime Web, pinned to an exact version in `package.json`, served by the app itself (no CDN), WebAssembly backend with one thread. No new response headers.
- **Stored analyses.** A full analysis made with the model records it. `ANALYSIS_VERSION` rises only when the default analysis (model off) changes in this round.
- **The Decode panel** names the engine of the grid next to the tempo ("grid: Beat This!").
- Guide card, knowledge notes, English and Italian strings, checks in Node and in the browser.

Ships only when the round 10 measurements meet the verdict rule written before them (decode round 10 plan): better on the real and owner sets, no file worse by more than 0.5 dB band error, no file with a worse tempo. Otherwise the research and this change stay, the in-app part does not ship.

Out of scope:

- the small model (10 MB): weaker on driven drums on the bench;
- WebGPU: measured, not offered (see design);
- Demucs and the opt-in download of Essentia.js Full (same pattern, other changes);
- Live level A: the model needs the whole file.

## Capabilities

### New Capabilities

- `decode/beat-tracker`: the opt-in download in Settings, the pinned files and their checks, the model in level B, the fallback.

### Modified Capabilities

- `decode/analysis`: level B's grid can come from the beat tracker.
