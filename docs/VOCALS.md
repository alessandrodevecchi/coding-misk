# Vocals research (issue #3)

Research done on 2026-10-04 for sung vocals in tracks: local, free, usable for company reels. Target machine: Apple M4, 16 GB RAM, no NVIDIA GPU. Nothing is implemented yet. Items marked "unverified" were not confirmed by a source or a test.

## Recommended pipeline

1. **Generate sung material with ACE-Step 1.5 (turbo, 2B).** MIT license, commercial use allowed, runs on MPS/MLX with 16 GB. Input: style prompt plus lyrics. Its `extract` task isolates the vocal (confirmed on the base model, unverified on turbo); otherwise use `audio-separator` with BS-RoFormer.
2. **Turn it into the owner's voice with Seed-VC (singing model).** Zero-shot from a 1 to 30 s reference clip, keeps pitch and timing of the input. Code is GPL-3 (no restriction on the audio produced). Repo archived in 2025-11, still usable.
3. **Shape it into chops and effects offline** (`pedalboard`, `pyworld`, ffmpeg, sox) with a `tools/vocal-fx.py` script, then save WAV files in `public/samples/<bank>/`.
4. **Play it in Strudel** through a new `vocal` channel in the scene model (see the design sketch below).

For exact notes on a melody, OpenUtau with a DiffSinger voicebank is the alternative to step 1, but rendering happens in its GUI and every voicebank has its own license.

Later, for better quality of the owner's voice: train an RVC model with Applio from 10 to 30 minutes of clean, dry singing (training time on MPS unverified; a free cloud GPU is the fallback).

## Options compared

### Singing from lyrics plus notes

| Tool | License | Mac | Notes |
| --- | --- | --- | --- |
| [OpenUtau](https://github.com/openutau/OpenUtau) + [DiffSinger](https://github.com/openvpi/DiffSinger) | MIT, Apache-2.0; voicebanks vary | Native app | Most mature free singing synth. MIDI or UST plus lyrics. Headless CLI unverified. |
| [SoulX-Singer](https://github.com/Soul-AILab/SoulX-Singer) | Apache-2.0 | Unverified, about 30 GB download | Zero-shot timbre from a clip, lyrics + MIDI, Python. Mandarin, English, Cantonese. |
| [YingMusic-Singer-Plus](https://github.com/ASLP-lab/YingMusic-Singer-Plus) | CC-BY-4.0, VAE under Stability Community License | Unverified | Rewrites the lyrics of an existing sung melody. Revenue cap on commercial use. |
| Synthesizer V Studio Basic | Free, closed | Yes | Free "Lite" voices reportedly forbid selling works. |
| VOICEVOX | LGPL-3, per character terms | Yes | Japanese only, commercial use with credit. |

### Full songs with vocals

| Model | License | Mac | Notes |
| --- | --- | --- | --- |
| [ACE-Step 1.5](https://github.com/ACE-Step/ACE-Step-1.5) | MIT | Yes (MPS, MLX); 16 GB for 2B turbo | Extract, repaint, cover, LoRA. Two 100 s songs in about 58 s on an M1 Max. |
| [YuE](https://github.com/multimodal-art-projection/YuE) | Apache-2.0, credit required | Community forks only | Separate vocal and instrumental tracks, 7B, slow without NVIDIA. |
| [DiffRhythm](https://github.com/ASLP-lab/DiffRhythm) | Apache-2.0 | Unverified | Full mix only. |
| HeartMuLa | Code Apache-2.0, weights unverified | CUDA only | Full mix only. |
| SongGeneration / LeVo 2, SongBloom (Tencent) | Non-commercial (reported) | | Do not use for company content. |

Separation afterwards: [python-audio-separator](https://github.com/nomadkaraoke/python-audio-separator) (MIT, CoreML on Apple Silicon) with BS-RoFormer, MDX or Demucs models.

### Voice conversion (the owner's voice)

| Tool | License | Data | Notes |
| --- | --- | --- | --- |
| [Seed-VC](https://github.com/Plachtaa/seed-vc) | GPL-3 | 1 to 30 s, zero-shot | Singing model at 44.1 kHz, Mac requirements file. Archived. |
| [Applio](https://github.com/IAHispano/Applio) (RVC) | MIT | 10 to 30 min | Best quality once trained. Maintenance mode. |
| [DDSP-SVC](https://github.com/yxlllc/DDSP-SVC) | MIT | Like RVC | Lighter, less tooling. |

Voice conversion keeps the input's pitch and timing: the input must be in tune.

### Speech for chants and rap chops

[Kokoro](https://github.com/hexgrad/kokoro) (Apache-2.0, fast on CPU) and [Chatterbox](https://github.com/resemble-ai/chatterbox) (MIT, voice cloning). Snap the pitch to a melody with [pyworld](https://github.com/JeremyCCHsu/Python-Wrapper-for-World-Vocoder) (MIT): the result sounds synthetic, which suits robotic vocals.

### Licenses that block company use

- Non-commercial: SongGeneration / LeVo 2, probably SongBloom, F5-TTS weights, XTTS-v2 (Coqui CPML), MusicGen weights, free Synthesizer V Lite voices, some UTAU/DiffSinger voicebanks.
- Revenue cap: Stability AI Community License (YingMusic VAE, Stable Audio Open).
- Credit required: YuE, VOICEVOX.

## In the app

### Recording the owner's voice

- `http://localhost` is a secure context, so `getUserMedia` works on the dev server.
- Request `{ echoCancellation: false, noiseSuppression: false, autoGainControl: false }`: call-oriented defaults gate and pump a sung voice.
- Capture raw PCM (AudioWorklet or buffer accumulation) and reuse `wavBlob` from `src/main.js`. `MediaRecorder` works too but encodes lossy Opus first.
- Save through a dev-only middleware in `vite.config.js` (for example `POST /api/samples/<bank>`) that writes `public/samples/<bank>/<NN>.wav`. The manifest is rebuilt per request; the app calls `samples('/samples/strudel.json')` again. Use new zero-padded file names: superdough caches buffers by URL and indexes files in sorted order. Unverified: whether Vite reloads the page on writes to `public/`.
- Count-in and takes start at bar boundaries computed from the scheduler. Compensate latency with a one-time loopback calibration (click recorded through the mic), stored in `localStorage`. Headphones are required.

### What Strudel 1.3.0 already offers on samples

Checked in `node_modules/superdough`: `stretch` (phase-vocoder pitch shift without speed change; `stretch(1)` is an octave up, negative values are scaled by 0.25, metallic sound, no formant preservation), `speed`/`note`/`transpose` (rate), `vib`, `penv`, `vowel`, `lpf`/`hpf`/`bandf`, `coarse`, `crush`, `shape`, `distort`, `tremolo`, `compressor`, `phaser`, `delay`, `room`, `ir`, `duckorbit`, plus `chop`, `striate`, `slice`, `splice`, `fit`, `loopAt`, `scrub`, `begin`/`end`. No vocoder, ring modulator, formant shifter or autotune. `speak` uses `speechSynthesis` outside the audio graph, so it cannot be processed or exported.

### Browser libraries if needed

[signalsmith-stretch](https://www.npmjs.com/package/signalsmith-stretch) (MIT, WASM, clean pitch shift), [pitchy](https://www.npmjs.com/package/pitchy) (MIT, pitch detection, base for a simple autotune), Tone.js `PitchShift` (MIT). A channel vocoder (filter bank with the hook or pad as carrier) is a small custom AudioWorklet.

### Design sketch for a `vocal` channel

- State: `vocal: { on, bank, n, pattern, chop, pitch, preset, gain, gainEnd, room, delay }` in `DEFAULT`, filled by `normalizeState`.
- Compiler: `s(bank).n(pattern)` with `chop`/`slice`/`splice`, the preset chain, scene lane mask and `postgain`, then `.analyze("vocal")`. Pitch follows the scene key with `transpose`, or `stretch` when the length must stay.
- Presets from existing controls: robot (`stretch` + `crush` + `coarse` + `vowel`), telephone (`hpf(500).lpf(3000).shape(.4)`), choir (stacked copies at 0, +7, +12 with `room`), glitch (`striate` + random `begin` + reverse `speed`), cyber (`distort` + `phaser` + `delay`).
- Record panel: bank name, count-in, take length in bars, arm, record while the scene loops, trim by latency, preview, save, select the new `n`, calibrate.
- The vocal replaces a layer (usually the hook) to stay within 4 to 5 layers per scene.
- Dev only; decide whether recordings in `public/samples/` stay out of git.

## Suggested steps

1. Spike: install ACE-Step 1.5 turbo and audio-separator in a uv venv outside the repo, generate one dark club vocal, extract it, cut 4 chops into `public/samples/vox/`.
2. Add the `vocal` channel with presets and a test track.
3. Seed-VC conversion of a generated vocal into the owner's voice.
4. Record panel in the browser.
