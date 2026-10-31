# Proposal

## Why

The app writes code for its own songs only. The owner wants to open a real track and watch the code of that track being written while it plays: the original stays the sound, and the code follows its tempo, harmony, groove and arrangement. A reference live-captioning app shows that the effect convinces when the code is in sync with the audio, even if the code's own sound differs. The analysis of 30 October (`notes/riferimenti-video/code-on-visual/analisi-repo.md`, private) measured how it works; the owner answered the open points on 31 October.

## What Changes

A new tab **Decode** (it: Decodifica) in the Listen mode, third after Compose and Songs: Compose, Songs, Decode, Playlists, Radio. Its page heading reads "Track to code" (it: "Da brano a codice"). The track plays on the app's shared stage, the tab panel holds the controls, and the code is written in the existing code column, as in Compose.

- **Open a file.** One audio file at a time: MP3, WAV, FLAC, M4A/AAC, OGG/Opus, anything the browser decodes. A video file is accepted for its audio only. At most about 10 minutes. Title and artist come from the file's tags, else from its name, and stay editable. The file is never copied or stored.
- **Reopen.** The analysis, the code and the tab's settings are stored (small). In browsers with the File System Access API the app remembers a handle to the file, with the user's permission, so a recent track reopens in one click. Elsewhere the user picks the file again and the analysis is skipped when the file matches.
- **Two kinds of tracks.** The tab plays the **Original** (the user's file) and the **Code** (the generated Strudel code; in level B one code track per part: drums, bass, chords and others). Original on and Code muted by default. Each track has mute and solo, and a slider **Original ↔ Code** sets the balance; the two stay consistent.
- **Level A, live.** Press Play: the file plays and the code is written while it plays, approximate and never blocking. **Look ahead** (Off, 2 s, 4 s, 2 bars, 4 bars; default 2 bars) analyses the audio ahead of the playhead, so a change lands in the code on its bar. Off, the code lags 1 to 2 bars like the reference app.
- **Level B, full.** The whole file is analysed first, faster than real time and away from the page, with the app's growing mark. Then the code plays in sync and richer: sections, global tempo, variations, the ending, sounds chosen by measure, several code tracks.
- **Shared base.** One analyser reads audio frames: level A feeds them as the file plays (or ahead), level B all at once. Both fill the same song model (tempo, bars, downbeats, key, chord per bar, drum grid per band, bass notes, levels, sections), and one writer turns the model into code. Level B extends level A.
- **Written like the Live coder.** The code follows the original's arrangement, not the app's growth shapes. A track that starts full grows its code fast, lines may appear at once as pasted. When the original drops the drums, the code mutes them. Level A types reactively; level B types each change just before its bar.
- **Open in Compose.** The code becomes a normal v2 song with the Live coder profile, switchable to Classic or Crescendo like any song. The original file does not go with it.
- **Follow the song.** A new value of the Live coder growth, offered in Compose for every song: no build-up from zero, each line typed just before the bar where its part enters or changes. Decoded songs use it, so they keep the same code in Compose. Existing defaults do not change.
- **Sounds.** Two presets: **Our sounds** (the generator picks sounds by measure, default) and **Simple kit** (fixed sounds). The code options (comments, technical functions, code view) are the existing Options, not new settings.
- **Tempo.** Always locked, at least approximately, with half and double candidates. Space bar taps the tempo as a fallback. This change supports a steady tempo in 4/4 only.
- **Header.** The title line names the title and artist with "cover of" when **Attribution** is on (default). A placeholder line `// vox: …` stands for the vocals.
- **Export.** Audio, video and fragments, with the original audio as heard. The texts for sharing carry a rights line. The user is responsible for the use of an export. The app plays the original only in the tab and in the user's own exports.
- **Engine.** Classical analysis, no machine learning. **misk-analyzer**, the app's own analyser, is the frame for both levels: decoding, frames, drum hits per band, bass notes, levels, sections and the song model. In level B it calls Essentia.js (AGPL-3.0, the browser build of the Essentia library), loaded only then, for whole-track tempo and beats, key and chords; if Essentia.js fails, misk-analyzer computes them itself. Level A uses misk-analyzer only.
- **Checks after the build.** A bench measures both levels against the app's own songs exported to WAV, whose tempo, key, chords and grids are known, plus a few files of the owner.

Out of scope, for later:

- the video's picture as the stage visual, with renders and effects;
- a queue of files, like a playlist;
- separate stem files;
- audio from another browser tab or the system;
- the microphone;
- the vocals as a third voice track;
- level C: transcription or stem separation with machine-learning models;
- a choice of analysis engine in Settings;
- tempo changes and meters other than 4/4;
- files longer than 10 minutes.

## Capabilities

### New Capabilities

- `decode/track-input`: opening a file in the Decode tab, its limits, title and artist, the stored analysis and reopening.
- `decode/analysis`: the shared analyser, the song model, levels A and B, look ahead, tempo lock and tap tempo.
- `decode/code-writing`: code from the song model, written like the Live coder; sound presets, options, header, attribution and the vocals placeholder; Open in Compose.
- `decode/playback`: the Decode tab, the Original and Code tracks, mute, solo and the Original ↔ Code slider, the level switch, the player bar.
- `decode/export`: audio, video and fragments with the original audio, and the rights line of the texts for sharing.

### Modified Capabilities

None. The tab order of the Listen mode and the new Live coder growth value are specified under `decode/`.

## Impact

- New module `src/decode/` (tab, input, analysis worker, engines, model, writer, mixer, store).
- `index.html` (tab button and panel), `src/main.js` (tab wiring, transport and master bus for the original, Open in Compose), `src/i18n.js` (en and it, mode subtitle lists the new tab), `src/guide.js` (Decode card).
- Live coder: a growth value `follow` for every song (`src/live/profiles.js`, `src/live/live-code.js`, `src/live/written-plan.js`, the Compose growth menu in `index.html` and `src/main.js`), with no change to the default growths or the fixtures.
- Export: the render page and the fragment path mix the original audio (`src/export/`, `src/render/page.js`, `src/video/`), texts for sharing (`src/video/texts.js`).
- Dependencies: `essentia.js` 0.1.3 (AGPL-3.0), lazy-loaded; `web-audio-beat-detector` (MIT) as a dev dependency of the bench. `mediabunny`, already a dependency, reads tags and the audio of video files.
- Storage: a new IndexedDB store for decodes; the settings backup carries the analyses, not the files.
- Tools: `tools/decode-bench.mjs`, `tools/check-decode.cjs`, `npm run check:decode`; `tools/check-modes.cjs` learns the new tab.
- Docs: `docs/knowledge/decode.md`, `docs/knowledge/decisions.md`, glossary, `docs/ARCHITECTURE.md`, `AGENTS.md` tooling lines, `DEVLOG.md`.
