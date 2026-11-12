# Design

## Context

Decode (`track-to-code`, `decode-refine`, `decode-library`) opens a file, decodes it to a mono 44.1 kHz copy for the analysis, and plays the original and the code on one clock. Level A analyses up to the playhead plus a look ahead; level B analyses the whole file first. The original is used only in the Decode tab and in exports the user starts. Nothing of the audio is stored; the analysis is stored by the file's fingerprint.

A tab's sound has no file, no length, no seek, no title, and it arrives as it plays. The browser API is the Screen Capture API (`navigator.mediaDevices.getDisplayMedia`) with audio. The user picks the tab in the browser's own picker.

## What was verified and what comes from documentation

Verified on 12 November 2026 on this Mac (Apple M4, macOS), Google Chrome launched by Playwright, with the probe in `probe/` (two local pages: one plays, the other captures). One run per case.

| Case | Result |
| --- | --- |
| A tab picked by title, `video: true`, `audio` constraints | One audio and one video track, `displaySurface: "browser"`. The video track's label is an internal id: **the page gets no title of the other tab**. |
| Default audio settings of a tab's sound | `echoCancellation`, `noiseSuppression` and `autoGainControl` on, **mono** (`channelCount` 1), 48 kHz. Asking for them off and `channelCount: 2` gives stereo at 44.1 kHz with processing off. |
| Headless Chrome | The audio track exists but stays silent (headless renders no audio). A browser check needs a headed Chrome or a stand-in stream. |
| Delay of the captured sound | Clicks every 0.5 s in the playing tab: the capture's onset minus the time the playing tab reported the click at its output, 191 to 200 ms, median 195 ms (28 of 40 clicks matched). Read as: about 0.2 s, steady within a few ms. |
| Video track stopped right after the start | The audio goes on. |
| Pause in the other tab, then play | The capture is silent (RMS 0) during the pause and comes back. No event tells the capturing page. |
| The other tab closed | The audio track's `ended` event fires within 3 ms. |
| Sound protected with a key system (Clear Key, `cenc`, played through Media Source Extensions) | Captured the same as the unprotected file (spectral peaks 445 and 1008 Hz, RMS 0.035 in both). |
| A commercial key system | Not offered in the automated browser's fresh profile, so **players protected with a commercial or hardware-backed key system were not tested**. |
| `suppressLocalAudioPlayback: true` | Reported in the track's settings; not checked by ear (no one listening). |

The probe's test files (not committed):

```sh
ffmpeg -f lavfi -i "sine=frequency=440:duration=20" -f lavfi -i "sine=frequency=1000:duration=20" -filter_complex "[0][1]amix=inputs=2,volume=0.8" -ar 44100 -ac 2 -c:a aac -b:a 128k plain.mp4
ffmpeg -i plain.mp4 -c copy -movflags frag_keyframe+empty_moov+default_base_moof plainf.mp4
ffmpeg -i plain.mp4 -c copy -movflags frag_keyframe+empty_moov+default_base_moof -encryption_scheme cenc-aes-ctr -encryption_key 00112233445566778899aabbccddeeff -encryption_kid 0102030405060708090a0b0c0d0e0f10 enc.mp4
```

From documentation (not verified here):

- **Browsers.** Audio from `getDisplayMedia` works in Chrome 74+, Edge 79+ and Opera on desktop. Firefox, Safari (macOS and iOS) and Chrome on Android give no audio. Developer reports say Firefox and Safari return no audio track and raise no error, so audio support cannot be detected without calling the API (MDN, caniuse, Chrome's screen sharing pages).
- **Surfaces.** Chrome offers audio with a tab on every desktop system. Audio for a whole screen is system audio, offered only on some systems. The options `systemAudio`, `displaySurface`, `selfBrowserSurface` (default `"exclude"`), `surfaceSwitching` and `monitorTypeSurfaces` shape the picker (Chrome 105 to 119). `suppressLocalAudioPlayback` stops the captured tab's own sound reaching the speakers (default off, marked experimental by MDN).
- **Rules of the API.** The call needs a user gesture and `video` cannot be false. The browser shows its own "sharing this tab" bar with a Stop button. Permission is asked on every call and is not remembered.
- **Protected players.** A Chromium graphics thread says video protected by hardware (the highest protection level) turns black on screen and in the capture while a tab capture runs, and that the behaviour is platform dependent. Software-protected video is captured. Nothing reliable was found about the audio of protected players. Expect some players to give a silent capture, and handle that case (D4).

## Decisions

### D1. Tab only, sound only

The call asks for a tab: `displaySurface: "browser"`, `monitorTypeSurfaces: "exclude"`, `systemAudio: "exclude"`, `selfBrowserSurface: "exclude"`, `surfaceSwitching: "include"` (the user can switch to another tab from the browser's bar). Audio constraints: `echoCancellation`, `noiseSuppression` and `autoGainControl` false, `channelCount` 2. `video: true` is required by the API; the app stops the video track as soon as the stream arrives (verified: the sound goes on), so no picture is kept or drawn.

Rejected: whole screen or window with system audio. It works only on some systems and also captures the app's own code sound.

### D2. Start, stop and permission

- The button "Listen to another tab" (it: "Ascolta un'altra scheda") sits in the "Another file" panel and in the empty tab, next to "Choose a file…".
- A press opens a short panel before the browser's picker:
  - Pick the tab that plays the music, and keep "Share tab audio" on.
  - The app only hears that tab's sound. It does not see the page, and it never stores the sound.
  - Stop here or with the browser's "Stop sharing" bar.
  - Buttons: "Choose the tab" (calls the API on this click, so the gesture counts) and "Cancel".
- A "Don't show this again" choice is kept per browser.
- While listening, the track row shows a red dot and "Listening to a tab", with a Stop button. Stop, the browser's bar or a closed tab end the session (the `ended` event). Leaving the track, opening a file or reloading the page stops the capture too.
- Results of the call:
  - The user cancels (`NotAllowedError`): nothing happens, no message.
  - No audio track (the user turned "Share tab audio" off, or a browser without tab audio): a message says how to fix it ("Choose the tab again and keep Share tab audio on"), and the stream is stopped.
  - Any other error: one line with the browser's message.
- Supported browsers: the button is enabled in Chromium browsers on a computer (User-Agent Client Hints brands and `mobile: false`). Elsewhere it is disabled, with the reason "Needs Chrome or Edge on a computer". A Chromium browser that still gives no audio track gets the message above.

### D3. The captured sound is the Original track

With `suppressLocalAudioPlayback: true`, the other tab is no longer heard directly. Its sound reaches the speakers only through Decode's mix, as the Original track: mute, solo, the Original ↔ Code slider and the volume work as with a file, and the code and the sound share one clock. The cost is the capture delay (about 0.2 s, verified): the other tab's own picture runs that much ahead of its sound. For music this does not matter. For a video page, lips can look a little early.

The code is scheduled on the beat grid found in the captured sound, on the same clock as the sound played from the capture, so a code hit lands on the captured beat within the 10 ms of the file case.

Rejected as the default: leaving the other tab's sound on its own and playing only the code. The two sounds would meet at the speakers with an unknown offset (the capture delay plus both output paths), the slider would have nothing to mix, and a mute in Decode would not mute the music. It stays possible as the answer to open question 2.

### D4. Level A on a stream

- An AudioWorklet takes the captured stereo, makes the mono analysis copy (as the file path does) and posts blocks of about 100 ms to the analysis worker. The worker's PCM grows instead of being whole; "analyse up to t" reads only what has arrived.
- Look ahead: a file has the future, a stream does not. Look ahead Off is the default: the code follows what was heard 1 to 2 bars later, as the file spec already says for Off. A look ahead of 2 or 4 s, or 2 or 4 bars, works by holding the sound back by that amount before the Original track plays it (a delay line in the mix). The analysis then reads that far "ahead" of what the user hears. The panel says that the sound plays that much later than the other tab's picture.
- Silence: when the captured level stays under the noise floor for 2 s, the code pauses and the row says "Paused in the other tab". When sound comes back, level A relocks the tempo and the downbeat (the relock of `decode-refine` group 7).
- A jump (seek or next track in the other tab) shows as a break in the onset grid or a sudden change of the chroma and the level. Level A relocks and starts a new section at that bar. It does not try to tell a seek from a new song.
- A capture that stays silent for 10 s from the start: "This tab gives no sound to share. Some players protect their sound." (D2's message for a missing audio track covers the other case.)
- The 10-minute length limit of files does not apply to Live: level A keeps its model by bars, and older raw audio is dropped (see D5 for Full).

### D5. Level B on what was heard

- While listening, the mono analysis copy is also kept in a recording buffer in memory: 44.1 kHz float, 10.6 MB per minute, at most 10 minutes (about 106 MB). That is the length limit of files and fits the 120 MB budget the library's Autoplay uses. Past 10 minutes the oldest minute is dropped, and the row says that Full covers the last 10 minutes.
- "Full on what was heard" is offered on Stop, and during listening as a button on the row once 30 s have been heard. It runs the existing level B (`full.js`, Essentia.js loaded only for Full) on the recording, away from the main thread, with the growing mark.
- Playing the result: the level B song plays with the recording as the Original, from memory, with seek, until the user leaves the track or closes the tab. The other tab is not needed any more. The recording is never written to storage.
- "Open in Compose" gives the code without any audio, as for files.
- Rejected for now: replaying the track in the other tab from its start and aligning the level B code to the new capture. It needs a fingerprint alignment (chroma cross-correlation) and the user's exact replay. A later change could add it.

### D6. What is stored

- Never the captured sound, at any level, by default.
- The analysis (level A bars heard, the level B model when run) is kept in memory while the track is open. It is stored in the decode store only when the user presses "Save analysis" and types a name: a record of kind "tab", with the name, the date and the model, without fingerprint or audio. The library list shows it with a tab icon. Opening it shows the code and Open in Compose. It cannot play the original, because there is none.
- Rejected: an automatic fingerprint of the captured sound to match a later capture of the same track. It would mean keeping features of the sound, and a capture never starts at the same point.

### D7. A name

The other tab gives no title (verified: the track's label is an internal id), and the app does not read the other page. The track is called "Tab · 21:04" (time of the start) until the user types a title and, optionally, an artist in the row's name field. The Attribution header and the rights line use what was typed. Without a typed title, the rights line is the one for Attribution off. Rejected: reading the title of the other tab's page (not exposed, and the user did not share it).

### D8. Exports

- Code only (the default): every export Decode has today, without the captured sound.
- With the captured sound: only during the session, from the recording in memory (D5), after a one-time confirmation per session: "The export holds the music of the other tab. Use it for your own listening; the recording belongs to its rights holders." The rights line of `track-to-code` goes into the texts for sharing as for files: with the typed title and artist when Attribution is on, else the generic line. The app sets no other limit, as for files.
- Fragments and videos follow the same rule.

### D9. Checks

- Node: the stream path of the worker (blocks in order, "up to t" on a growing buffer, relock after a silence and a jump), the recording buffer's cap and drop, the "tab" record (no audio, no fingerprint), the rights line with and without a typed title.
- Browser (headless, dev server): a stand-in capture stream made from the app's own test song in a second AudioContext (`MediaStreamAudioDestinationNode`), injected in place of `getDisplayMedia`. It checks the panel, the messages (cancel, no audio track, unsupported browser), Live typing, pause and resume, the end, Full on what was heard, Save analysis, exports with and without the captured sound, and that nothing of the audio reaches IndexedDB or storage.
- Headed probe (`probe/`, by hand or before a release): the real tab capture, the delay, the end event.

### D10. Separated parts (stems)

**Options for the browser** (from their pages, not verified here unless stated):

| Model | Parts | Download | Speed | Licence |
| --- | --- | --- | --- | --- |
| HT Demucs v4, ONNX with fp16 weights | drums, bass, other, vocals | 158 MB (measured) | **measured here**, see below | MIT |
| HT Demucs v4, ONNX in 21 pieces, mixed precision, for the browser | same | 126 MB | about 2.7 to 7.5 s per minute of audio with WebGPU on a desktop GPU (one author's figure) | MIT |
| HT Demucs v4, Rust port for WebAssembly and WebGPU | same | 84 MB | WebAssembly "much slower than native" | not checked |
| HT Demucs v4 in ONNX Runtime Web on WebAssembly (one tool) | same | not given | 3 to 5 minutes for a 4-minute song on a laptop | not given |
| HT Demucs 6 parts | adds guitar and piano | larger | slower | MIT |
| Real-time research models (for example a band-split model with 2.6 M parameters, 92 ms latency, 2025) | 4 | small | real time | no browser build or licence found |

**Measured here** (`probe/bench.mjs`, 12 November, Apple M4 with 16 GB, other checks running, load average 5 to 10):

- HT Demucs ONNX (fp16 weights, 158 MB) in onnxruntime-node, CPU, 4 threads: 1.07 to 1.73 s per 7.8 s segment, real-time factor 0.16 (about 10 s per minute of audio). Session load 1.3 s. Peak memory 5.0 GB. On a generated test song (drums, bass and chords), drums took 92 % of the energy and bass 4 %.
- The same model in onnxruntime-web (WebAssembly) in Node: the session fails to load (`std::bad_alloc`), because WebAssembly memory stops at 4 GB. A browser needs a build cut into pieces or another runtime (the 126 MB and 84 MB builds above).

**What separation would improve:**

- Drums and bass: cleaner hits and notes on dense mixes, where `decode-refine` groups 7 and 8 already improved a lot.
- A sung top line: the vocals part isolates it, which would help the Lead track on songs with a voice.
- The weak spot task 9.1 measured, an instrumental top line under a louder pad and arp (13 % with Essentia.js): **4-part models put lead, pads and arps together in "other"**, so they would not separate it. The 6-part model adds only guitar and piano.

**Recommendation: not now. Measure first, later.**

- The gain for the measured weak spot is unlikely, as shown above.
- The cost goes against the owner's principle that the browser stays light and loads only when needed. Even on demand, the download is 84 to 160 MB, a full-quality run needs WebGPU (WebAssembly: minutes per song), and memory is high (5 GB natively here).
- It fits Full only. Live on a stream cannot wait for a separation of 7.8 s segments.
- First step when the owner wants it: a Node probe on the bench, outside the app. Separate the bench songs and the owner's vocal tracks, run misk-analyzer on the parts, and compare drum F1, bass and the top line with today's numbers (task 7.1, about 4 agent hours). Then decide on an on-demand "Separate parts" button in Full: WebGPU only, with the download size shown before it starts, and the model kept in the browser cache.

## Risks

- Some players may give a silent or blocked capture. The silent-capture message (D4) says so without naming anything.
- The capture delay can change on other machines or with Bluetooth output. The code clock follows the captured sound (D3), so the sync with the Original track does not depend on it.
- A long session keeps up to 106 MB in memory for Full. Stop or leaving the track frees it.

## Open questions for the owner

Each with the recommended answer.

1. **Where does "Listen to another tab" go?** Recommended: in the "Another file" panel and in the empty Decode tab, next to "Choose a file…".
2. **Should the other tab's own sound be muted, so the music plays through Decode?** Recommended: yes (D3). Mute, solo, the slider and the sync then work as with a file. The cost is a sound about 0.2 s behind the other tab's picture.
3. **Look ahead on a stream: offer it as a delay of the sound?** Recommended: yes, with Off as the default, and the delay written next to the choice.
4. **Record while listening for Full: in memory, at most 10 minutes?** Recommended: yes, never stored. Full is offered on Stop and after 30 s of listening.
5. **Save the analysis of a tab under a typed name, without any audio?** Recommended: yes, only when the user presses "Save analysis". Otherwise it is forgotten when the track is left.
6. **Exports with the captured sound?** Recommended: allowed only during the session, off by default, with a one-time confirmation and the rights line.
7. **Firefox and Safari?** Recommended: show the button disabled with the reason, no workaround.
8. **Separated parts?** Recommended: not in this change. If wanted, first the Node probe on the bench (task 7.1), then a decision.
9. **Phones?** Recommended: not supported (no browser gives tab audio there). The button is hidden at phone width.
