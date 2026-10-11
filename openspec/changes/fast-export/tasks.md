# Tasks

## 1. Render

- [ ] 1.1 Hidden render page with its own Strudel, the app's sample banks and custom samples; messages to start, report progress, cancel.
- [ ] 1.2 Offline render of a song: code segments for live build steps, tempo map, tail, high polyphony; returns the audio.

## 2. Export

- [ ] 2.1 Export flow: fast by default, progress and cancel on the button, real time fallback and setting.
- [ ] 2.2 Encoders: WAV, FLAC, MP3, Opus (lazy loaded); format in the settings and on the Export display.
- [ ] 2.4 Timeline JSON next to fast exports.
- [ ] 2.3 Saved sessions: export as one joined file from the playlist row.

## 3. Checks and docs

- [ ] 3.1 Check: fast and real time export of built-in songs agree (length, per instrument levels); FLAC decodes to the WAV samples; files open with ffprobe.
- [ ] 3.2 i18n, Guide card lines, DEVLOG, `docs/ARCHITECTURE.md`, `docs/PROVE-v0.6.0.md`.
