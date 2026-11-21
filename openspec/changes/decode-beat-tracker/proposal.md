# Proposal

**Status (round 12, 18 November 2026): shipped as an option of Settings, off by default.** The round 10 verdict rule failed on the owner's files and the real tracks (see design, "Verdict"), so the tracker is not the default: Full runs as before unless the user turns "Deep beat analysis" on and downloads the model. The owner's own dev server starts with the option on through a local build flag (`VITE_DECODE_BEAT_TRACKER`, set in the git-excluded `vite.local.config.mjs`; the published build never sets it). Security checked again in round 12 (design, "Round 12").

**Status (round 10, 15 November 2026): specified, built and measured; the in-app part not shipped.** The pure parts stayed as a bench option (`decode-bench.cjs --beat-this`); the Settings card, the download, the storage and the worker's wiring were built and checked, then left out (a patch in the private round 10 notes).

## Why

Level B of the Decode tab places one beat grid over the whole track. Its tempo comes from the app's own analyser, Essentia.js and a vote of three tempo estimates; its grid is a line fitted through the onsets. Three errors stay after round 9: a long real track whose grid fits 111.17 BPM instead of 111 and drifts by about half a second over six minutes, a breakbeat song whose grid sits half a beat off, and a drum and bass song read at 116 instead of 174. On the bench a learned beat tracker, Beat This! (ISMIR 2024, code and weights MIT), finds all three. The owner decided on 15 November that third-party models reach the app only as opt-in downloads in Settings, with a clear disclaimer, like Demucs and Essentia.js Full; Beat This! follows that pattern.

## What Changes

- **Settings: "Deep beat analysis".** A card in Settings with an on/off option, off by default; turned on, it offers to download Beat This! (about 88 MB with its front end). The card says what it is, that it is a third-party model under the MIT licence with training data that include copyrighted recordings, its size, where it is downloaded from, and that it runs on this device only. The download shows its progress, can be cancelled, and is checked against SHA-256 pins; a file that does not match is refused. Once downloaded the card shows the size on disk and a Remove button.
- **Level B uses it when present.** With the model downloaded, Full runs it on the whole file in the level B worker, after Essentia.js. Its grid gives the exact tempo, the beat phase and the downbeat; the tempo picked by the free engines keeps its octave (the model reads some half-time grooves at half). Without the model, Full runs as today.
- **The runtime.** ONNX Runtime Web, pinned to an exact version in `package.json`, served by the app itself (no CDN), WebAssembly backend with one thread. No new response headers.
- **Stored analyses.** A full analysis made with the model records it. `ANALYSIS_VERSION` rises only when the default analysis (model off) changes in this round.
- **The Decode panel** names the engine of the grid next to the tempo ("grid: Beat This!").
- Guide card, knowledge notes, English and Italian strings, checks in Node and in the browser.

Round 10 asked the measurements to meet a verdict rule written before them (better on the real and owner sets, no file worse by more than 0.5 dB band error, no file with a worse tempo) for the tracker to ship. It did not; round 12 ships it anyway as an option off by default, so the default analysis does not change and the user chooses.
- **Local override (round 12).** A build-time flag, `import.meta.env.VITE_DECODE_BEAT_TRACKER` with the value `on`, makes the option start on. Only a git-excluded local Vite config sets it (`define`); no `.env` file is used.

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
