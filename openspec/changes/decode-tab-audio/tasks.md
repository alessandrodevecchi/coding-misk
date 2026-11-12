# Tasks

Spec only for now: no task starts before the owner answers the open questions in `design.md` and says go. Estimates are in agent hours. The code lives in `src/decode/`: start after the Decode group 10 work has merged.

## 0. Before

- [x] 0.1 Probe the tab capture in Chrome on this Mac (`probe/run.cjs`, `probe/run2.cjs`): tracks and settings, delay, pause, end, a Clear Key protected stream (`design.md`, verified table).
- [x] 0.2 Measure a separation model in Node (`probe/bench.mjs`): speed, memory, and whether it loads in WebAssembly (`design.md` D10).

## 1. Capture (D1, D2), about 2 h

- [ ] 1.1 `src/decode/tab-capture.js`: the call with the tab-only options and the audio constraints off, the video track stopped at once, the `ended` event, Stop; the results (cancel, no audio track, other error). Verify: a Node check with a fake `mediaDevices`.
- [ ] 1.2 The panel before the picker (en, it), "Don't show this again", the button in the "Another file" panel and the empty tab, disabled with the reason outside Chromium on a computer, hidden at phone width.

## 2. Level A on a stream (D3, D4), about 3.5 h

- [ ] 2.1 AudioWorklet to the analysis worker: the mono copy in blocks of about 100 ms, a growing PCM, "up to t" on what arrived. Verify: Node, blocks in order and the same model as the file path on the same audio.
- [ ] 2.2 The captured sound as the Original track (mix, mute, solo, slider, volume), the other tab's own sound muted, the code on the captured grid. Verify: the code's hits within 10 ms of the captured beats with a stand-in stream.
- [ ] 2.3 Look ahead as a delay line on the Original track, with the note in the panel.
- [ ] 2.4 Silence (pause and resume with relock), a jump (new section after relock), a silent share (the message after 10 s).

## 3. Full on what was heard (D5), about 2.5 h

- [ ] 3.1 The recording buffer (mono, 10 minutes, oldest minute dropped, the row's note). Verify: Node, cap and drop.
- [ ] 3.2 Full on Stop and after 30 s; playback of the result from memory with seek; the memory freed when the track is left.

## 4. Name, store, library (D6, D7), about 1.5 h

- [ ] 4.1 The default name "Tab · HH:MM", the title and artist fields, Attribution and the rights line from them.
- [ ] 4.2 "Save analysis": a record of kind "tab" without audio or fingerprint; the tab icon in the list; opening it as code only. Verify: Node on the fake IndexedDB; nothing else written.

## 5. Exports (D8), about 1.5 h

- [ ] 5.1 Code only by default; the captured sound from the recording, during the session only, with the one-time confirmation; fragments and videos the same; the rights line.

## 6. Guide, knowledge, checks (D9), about 3 h

- [ ] 6.1 Guide card "Listen to another tab" (en, it); `docs/knowledge/decode.md`; a row in the checks map; `npm run check:guide` and `npm run check:knowledge`.
- [ ] 6.2 `tools/check-decode-tab.cjs` (headless, dev server): a stand-in stream from a second AudioContext in place of `getDisplayMedia`; the panel, messages, Live typing, pause and resume, end, Full, Save analysis, exports, and no audio in IndexedDB, local storage or the backup.
- [ ] 6.3 Run the headed probe before the merge; write the delay and the results in the DEVLOG.

Total for groups 1 to 6: about 14 agent hours.

## 7. Separated parts (D10), later, only if the owner asks

- [ ] 7.1 Node probe on the bench, outside the app: separate the bench songs and the owner's vocal tracks with HT Demucs (ONNX), run misk-analyzer on the parts, and compare drum F1, bass and the top line with today's numbers. About 4 h.
- [ ] 7.2 Depending on 7.1: a proposal for an on-demand "Separate parts" in Full (WebGPU only, the download size shown first, the model in the browser cache). Not estimated yet.
