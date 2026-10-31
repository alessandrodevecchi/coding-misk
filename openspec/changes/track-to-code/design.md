# Design

## Context

See proposal.md for the motivation. The reference app's analysis (private notes, `notes/riferimenti-video/code-on-visual/analisi-repo.md`) describes the techniques this design reuses in its own way: spectral flux per band with an adaptive threshold, a tempo estimate from autocorrelation with priors, YIN for the bass, a chromagram from tonal peaks, chord templates with overtones, key profiles, 16-step grids with hysteresis. The reference analyses live audio only; this design also analyses a decoded file ahead of time.

The app already has most of the parts the tab needs. Pointers checked on `develop` at 7fedf3e:

| What | Where |
| --- | --- |
| Listen mode tabs | `index.html:70-73`; tab switch `src/main.js:4199` `showTab`; mode subtitle `src/i18n.js:114`, `:517` `modeListenSub` |
| Mute and solo buttons of a track row | `src/main.js:2201-2204` `rowClass`, `trkHead`; clicks `:2300-2303` |
| Play a song from a bar | `src/main.js:1035` `playSong` |
| Master level, limiter and global volume | `src/main.js:4591` `applyMaster`, `:4599` `applyVolume`; `src/sounds/limiter.js:86` `installMaster` |
| Module workers built by Vite | `src/main.js:285`, `:332` (`grow-worker.js`) |
| Growing mark | `src/icons.js:55` `GROWING`, `src/style.css:233-237` |
| IndexedDB store with a cap and a version hash | `src/live/growth-store.js` |
| Profiles, growth values, display controls | `src/live/profiles.js:12` (growth), `:60` (`switch`, the Live coder), `:67` `DISPLAY_CONTROLS` |
| Written part typing, lines typed ahead | `src/live/written-plan.js:13` `AHEAD`, `:24` `planWritten` |
| Typing plan between two codes | `src/song/typing.js:368` `typingPlan` |
| Code of the moment | `src/live/live-code.js:79` `liveCode` |
| Title line | `src/music.js:629` `songHeader`; kept by `src/song/comments.js:22` |
| Texts for sharing | `src/video/texts.js:55` `textsFor` |
| Fragments, fast export, render page | `src/video/fragments.js`, `src/export/fast.js`, `src/render/page.js` |
| Song format: section keys and progressions | `docs/SONG-FORMAT.md` (Sections: 8 keys, named progressions; `code` tracks) |
| Media reader already in the dependencies | `mediabunny` 1.61.3 (`getMetadataTags`, audio tracks of video containers) |

## Goals / Non-Goals

**Goals:**

- One analyser and one song model for both levels; level B as an extension of level A.
- The original and the code on one audio clock, so the sync convinces.
- Reuse of the existing compiler, Live coder typing, mixer, export and Options.
- Testable without a browser: the analyser, the writer and the mix rules run in Node.

**Non-Goals:**

- Tempo changes, meters other than 4/4, swing detection.
- Melody or vocal transcription; the vocals stay a placeholder line.
- Sound matching beyond the measures listed in D10.
- The original audio in Compose, playlists or the radio.

## Decisions

### D1. A new module and a tab in the Listen mode

All Decode code lives in `src/decode/`: `tab.js` (UI), `input.js` (file, tags, fingerprint, decoding), `store.js` (IndexedDB), `worker.js` (analysis), `engine-light.js` and `engine-essentia.js` (D5), `model.js` (D6), `writer.js` (D9), `mix.js` (D11), `sync.js` (D12). `index.html` gets the tab button between Songs and Playlists (`data-mode-of="ascolta" data-tab="decode"`) and a `#tab-decode` section. `src/main.js` only wires the tab, the transport and the master bus. `tools/check-modes.cjs` learns the new order.

The tab uses the app's layout as every other tab does (`index.html`): the shared stage `#stagewrap` on top with its HUD (looks, renders, Code over, full screen); below it `.work`, with the modes, the tabs and the `#tab-decode` panel on the left and the code column `#codecol` on the right. The decoded track plays on the shared stage; its code is written in `#codecol` like a Compose song's code (typist, lit notes, hidden code, Copy, full screen and collapse), and shows over the stage only when Code over is on. The `#tab-decode` panel holds only the controls. On phones the page stacks as today: stage, modes and tabs, the Decode panel, then the code column. The mockup follows this layout.

### D2. Reading the file

The file's tags and duration come from `mediabunny` (`Input` over a `BlobSource`, `ALL_FORMATS`, `getMetadataTags()`), which reads only the parts of the file it needs. The duration check (10 minutes) runs before decoding. Audio files decode with `AudioContext.decodeAudioData` on the file's bytes. Video containers, and audio files that `decodeAudioData` refuses, decode through `mediabunny`'s audio sample sink (WebCodecs). Title and artist fall back to the file name (`Artist - Title`).

Alternative: a tag library. Rejected: `mediabunny` is already a dependency (MPL-2.0) and also reads the audio of video files.

The decoded audio stays in memory only: an `AudioBuffer` for playback and one mono `Float32Array` at 44.1 kHz transferred to the analysis worker. Ten minutes take about 230 MB (stereo, 48 kHz, float) plus 106 MB (mono analysis copy).

### D3. Fingerprint and store

The fingerprint is the size in bytes, the duration in milliseconds and a SHA-256 of three 64 KB slices at 10 %, 50 % and 90 % of the file (`crypto.subtle`). It ignores the name, so a renamed file matches.

IndexedDB `coding-misk-decodes`, one record per fingerprint: title, artist, attribution, the level A model of the bars heard, the level B model when done, the tempo the user picked or tapped, the tab's settings (level, look ahead, sounds, Options, mix state), the file name, a `FileSystemFileHandle` when the browser gives one (`showOpenFilePicker`, or `DataTransferItem.getAsFileSystemHandle()` on drop), `used` and `created`. At most 50 records, least recently used dropped first, as `growth-store.js` does. `ANALYSIS_VERSION` in `src/decode/model.js` marks old models (spec: Stored analysis). Every read and write fails quietly. The settings backup carries the records without handles. A model of 10 minutes at 128 BPM (320 bars) takes well under 200 KB.

Reopen: a stored handle asks `queryPermission({ mode: 'read' })`, then `requestPermission` inside the click. Without a handle the tab opens the picker and names the expected file.

### D4. One analyser over PCM frames, in a worker, for both levels

Both levels read the decoded PCM, not an `AnalyserNode`. Level A posts "analyse up to time t" to the worker as the playhead moves; t is the playhead plus the look ahead (D8). Level B posts "analyse everything". The worker runs the same light analyser in both cases, frame by frame, and level B adds whole-file steps on top.

Why not `AnalyserNode` as the reference app does: the file is decoded anyway; PCM frames give exact, repeatable results; the same code runs in Node for the bench; and an `AnalyserNode` cannot look ahead.

### D5. Analysis engines: our light engine for A, plus Essentia.js for B

An engine is `{ id, version, incremental, analyse(frames | pcm, { onProgress, signal }) → partial model }`. Two engines in this change:

- **light** (ours, incremental): STFT at 1024, 4096 and 16384 points on the mono PCM; per-band onsets (kick 40-130 Hz, snare or clap 1.1-5.2 kHz, hat 7-15 kHz) by positive spectral flux with a median and interquartile threshold and a refractory time; kick or bass by the pitch drop after 90 ms; closed or open hat by decay; tempo by autocorrelation with priors (D7); downbeat votes from kick, snare and chord changes; bass notes by YIN on a low-passed signal, one note per step; chroma from tonal peaks; chord per bar from 24 major and minor templates with overtones; key from chord tones against key profiles; level per band per bar. Modelled on the reference analysis, written anew.
- **essentia** (level B only): Essentia.js `RhythmExtractor2013` (multifeature) for the global tempo and beat ticks, `KeyExtractor` for the key, `HPCP` and `ChordsDetectionBeats` on the beat ticks for chords. The light engine still gives the drum grids, the bass notes, the levels and the sections (Essentia.js has no per-band drum grid, and its build has no segmentation algorithm). When the two disagree on key, the chord evidence decides the mode (relative major or minor).

Essentia.js is loaded only when level B runs, by a dynamic import inside the worker, so other tabs never download it.

**Verified on 2026-10-31** (npm registry, the package unpacked in a scratch folder, a test page built with the project's Vite 8 and run in the headless browser of the project's tools):

- `essentia.js` 0.1.3 is the latest version (published 2021-06-24; no release since). License AGPL-3.0, compatible with the project's AGPL-3.0-or-later. Core reports `2.1-beta6-dev`.
- The npm package is 10.1 MB unpacked because it ships every build variant. The browser needs one: the ES module with the WebAssembly inlined (`essentia-wasm.es.js`, 2.56 MB, 0.80 MB gzip) plus the core API (`essentia.js-core.es.js`, 0.32 MB). The separate `.wasm` build is 1.99 MB (0.54 MB gzip).
- The algorithms needed exist: `RhythmExtractor2013`, `BeatTrackerMultiFeature`, `PercivalBpmEstimator`, `KeyExtractor`, `HPCP`, `ChordsDetection`, `ChordsDetectionBeats`, `OnsetDetection`, `SuperFluxExtractor`, `PitchYin`, `PitchYinFFT`, `PredominantPitchMelodia`, `NoveltyCurve`, `Danceability`. `SBic` (segmentation) is not exposed.
- It runs in a module Web Worker under Vite, both in `vite build` and in the dev server, with no Vite configuration.
- Measures on a synthetic 180-second track (124 BPM, kick, offbeat hat, chords Am F C G per bar, bass), on the owner's machine: `RhythmExtractor2013` degara 0.65 s (124.0 BPM), multifeature 3.2 s (123.4 BPM); `KeyExtractor` 0.17 s (C major: the relative major of A minor, an expected confusion that D7 settles with chord evidence); HPCP plus `ChordsDetection` over the whole track 0.85 s (right on most bars, F read as Dm on some); `PitchYin` found the bass F1 (43.6 Hz) on its bar. Level B on a 10-minute file is expected under 20 s.

No blocker found. The risks are the age of the package (D5 keeps it behind the engine interface and pins the version) and its size (lazy-loaded).

Alternatives:

- **Meyda** (MIT, 5.6.3): rejected. It gives per-frame features (RMS, spectral centroid, chroma, MFCC) and no tempo, beat, key or chord estimation. The light engine computes the features it needs; Meyda would add a dependency without replacing any step.
- **Only the light engine for B.** Kept as the fallback: if Essentia.js fails to load or the bench (group 9 of the tasks) shows it worse on a genre, the light engine alone runs level B. A Settings choice of engine may follow; not in this change.
- **Machine-learning transcription or stem separation.** Out of scope (level C).

### D6. The song model

```text
{ version, engine, duration, bpm, bpmCandidates: [half, x, double], confidence,
  downbeat: seconds, barSeconds, bars: [{ start, chord, chordConf, bass: [16 steps of midi or null],
  drums: { bd, cp, hh, oh: 16-step strings }, level: { drums, bass, chords, other }, bright, low }],
  key: { root, mode, conf }, sections: [{ start, bars, kind }], ending: bar }
```

Level A fills `bars` up to the analysis horizon and `sections` with one open section. Level B fills everything. `kind` is intro, verse, build, drop, break or outro, from level and density, for comments and fragment weights.

### D7. Tempo lock

The light engine estimates the tempo from the onset envelope of the last 8 seconds (or the whole file in B) by autocorrelation between 60 and 200 BPM, weighted by a prior centred on 120 BPM and by how well kick and snare fall on the beats. The two strongest of half, single and double become `bpmCandidates`; the tab shows ½× and 2× to switch. When the pulse is weak, the best candidate is kept and marked uncertain. Level B takes Essentia's tempo when its confidence is high, else the light engine's.

Tap tempo: the space bar in the Decode tab (no focused field). Four taps or more give the tempo (median interval) and the phase (first tap is a downbeat). The tapped tempo replaces the analysed one and is stored.

### D8. Look ahead

Values: Off, 2 s, 4 s, 2 bars, 4 bars, in one select (five buttons are too wide for the panel); default 2 bars. Four seconds and four bars give slow tracks and long lines more time. Two bars give the typist time for a line of about 40 characters at the human pace at 120 BPM, and land the change on its bar.

The analysis horizon is the playhead plus the look ahead. The writer (D9) runs once per bar on the model up to the horizon and gives the code that bar should have; the typing aims to finish 0.2 bar before that bar starts. With Off, the horizon is the playhead, so a change is seen only after its bar has played and lands 1 to 2 bars late, as in the reference app. At Play, the first window up to the horizon is analysed before the sound starts; the light engine does that in tens of milliseconds, so Play still feels immediate.

Look ahead applies to level A only. Level B knows the whole file.

### D9. One writer: model to a v2 song

The writer turns the model into a v2 song; the app's compiler, code of the moment and typing do the rest. This keeps one path for both levels and makes Open in Compose a save.

- Sections: level B's sections; level A one section that grows. Tempo from the model. Section `key` is the nearest of the format's eight keys, used only by the app's own instruments.
- Drums: a `drums` track, `rows` `bd`, `cp`, `hh`, `oh` from the grids.
- Bass, chords and other parts: `code` tracks with plain Strudel (`note("<a1 …>")`, `chord("<Am F C G>").voicing()`), because the format's named progressions and eight keys cannot hold arbitrary chords. Extending the format with free chords is left for later.
- A part's clips follow the model's levels: a part below its threshold for a bar or more has no clip there, so the code mutes or removes its line as the Live coder does.
- Hysteresis (level A): a drum grid changes after it held for one bar; a difference of one or two steps must hold two bars; a step turns on above 50 % of the strongest step and off below 30 %.
- Level B variations: a bar whose grid or bass differs from its section's main pattern and repeats at least twice becomes a variant pattern in the clip; a one-off fill stays out.

Alternative: write code text directly from the model, as the reference does. Rejected: it would duplicate the compiler, lit notes, mixer and Options, and Open in Compose would need a second converter.

### D10. Sounds by measure

"Our sounds" picks per section from the generator's existing tables: the drum kit by the kick's low-end weight and the hats' brightness, the bass wave and filter by the bass band's brightness and attack, the chord sound by the chord band's level and brightness. "Simple kit" uses one fixed set: one drum machine, a sawtooth bass, a supersaw chord sound. In level A the measures come from the bars heard so far and change only at a section change of the model.

### D11. Two kinds of tracks and the mix

Audio graph: the original plays from an `AudioBufferSourceNode` into a gain node `orig`, connected to the app's master stage before the limiter, so it reaches the global volume, recordings and exports like the code. Code tracks play through Strudel as usual; each decoded part has its own bus in the hidden mixer, as Compose tracks do.

Gains: the slider position x from 0 (Original) to 1 (Code) sets the original to cos(x·π/2) and the code to sin(x·π/2), equal power, so the middle sounds as loud as the ends. The original's gain is also trimmed once per track: its RMS over the loudest 30 seconds against the app's reference song level, so moving the slider does not jump in loudness.

Mute and solo in Decode are listening controls: they set the bus gains in the hidden tail and never the code shown (Compose's mute writes `_$:`; here `_$:` belongs to the original's arrangement, D9). Muted code tracks keep running at zero gain, so lit notes and widgets still follow their notes; group 4 of the tasks measures the cost.

Consistency rules (spec: Slider and mute stay consistent), with the slider's own mutes kept apart from the user's:

1. Slider reaches 0: the slider mutes every code track not already muted by the user. Reaches 1: it mutes the original.
2. Slider leaves an end: only the slider's own mutes are cleared.
3. The user mutes every code track, or solos the original: the slider moves to 0. The user mutes the original, or solos a code track: the slider moves to 1.
4. The user unmutes a side while the slider sits at the other end: the slider moves to 0.5.

Default: slider at 0, code muted by the slider (so dragging the slider is enough to hear the code).

Alternative: slider only, no mute and solo. Rejected by the owner, who wants both.

### D12. One clock

The original and the code share Strudel's `AudioContext`. A play from file time f starts the scheduler at cycle c = (f − downbeat) / barSeconds (one cycle per bar, `setcpm(bpm/4)`) and the source at the audio time the scheduler plays cycle c, offset f. Seeking stops both and starts both again from the new f. Before the first downbeat the code is silent. The check in group 4 renders a decoded click track and measures the offset between the original's and the code's kicks (target under 10 ms).

### D13. Profile and typing

Decoded songs use the Live coder profile's display controls (short patterns, human typist, lit notes, code of the moment, title only) with the narrator off: the narrator would talk over the original.

- **Level A:** each bar, the writer's new song gives the code for the coming bar; `typingPlan` types from the code shown to it, with the bar as deadline, and the code is evaluated on the bar. A line that does not fit is pasted, as everywhere.
- **Level B:** the song grows with a new growth value `follow` ("Follow the song", it "Segue il brano"): no growth phase, the written part from bar 1, `planWritten` typing each change ahead and landing it on its bar. A full start pastes several lines at bar 1. `follow` is offered only for songs with a `cover` field (D15), so the Live coder fixtures and `SHAPES_VERSION` of other songs do not move.

Alternative for B: the natural growth. Rejected by the owner: the code must follow the original's arrangement.

### D14. Header, attribution, vocals placeholder

The title line keeps its prefix (`// coding-misk · `), so `comments.js` keeps treating it as the title. Attribution on: `// coding-misk · cover of "<title>" by <artist>`; off: `// coding-misk · <title>`. The vocals placeholder `// vox: …` is a comment line after the parts, always present while a decoded track plays, written with the other code so it types once at the start.

### D15. Open in Compose

The writer's level B song is saved as a user song with `config: { profile: 'switch', growth: 'follow', narrator: false }` and a new optional song field `cover: { title, artist, attribution }` (validator and `docs/SONG-FORMAT.md`). No audio, handle or fingerprint goes with it. Without level B, the button runs it first. The song then behaves like any user song: profile switch, edits, Save, export (code only).

### D16. Export with the original

- **Real time:** the original passes the master stage (D11), so the existing recorder records the mix as heard.
- **Fast export and fast video:** the render page receives the original's PCM for the exported span (transferred, not stored) and the mix state, and mixes the original into its offline output before the limiter, with the same gains as the tab. The timeline file gains the decoded track's title and artist.
- **Fragments:** the fragment's span of the original goes with its render; fragment picking uses the model's section kinds as weights.
- **Texts for sharing:** `textsFor` takes `cover: { title, artist, attribution, original }`. With original audio or decoded code in the export it adds one line: attribution on, `Cover of "<title>" by <artist>. The original recording belongs to its rights holders.`; off, `Contains a recording that belongs to its rights holders.` (code only: `Code written over a recording that belongs to its rights holders.`).

### D17. Checks after the build

The owner wants to build first and test after. The tasks follow that order: levels A and B, then the bench and checks. Each group still ends with a short run in the app (dev server on 5251) so later failures stay small.

The bench (`tools/decode-bench.mjs`, Node, no browser): built-in songs exported to WAV with the existing export are the ground truth (tempo, key, chords per bar, drum grids and bass notes from the compiled song's haps). It runs both levels and prints tempo error and octave errors, downbeat error, key (exact, relative, fifth), chord accuracy per bar, drum grid F1 per band, bass note accuracy per step. A few owner files, kept outside the repository, are measured without ground truth. Scores go to `tests/snapshots/decode-bench.json`; a later run fails when a score drops by more than a set margin.

## Risks / Trade-offs

- [Memory on phones: about 340 MB for a 10-minute file] → Decode the analysis copy at 44.1 kHz mono only; free the buffers when the track closes; a decoding failure shows a message, not a crash. Open question 3.
- [Essentia.js unmaintained since 2021] → Pinned version, behind the engine interface, light engine as fallback (D5).
- [Real tracks drift from a steady tempo (live drummers, rubato)] → Steady tempo only in this change; the bench measures drift; tempo maps later.
- [Analysis wrong on dense mixes (kick lost under compression, relative major and minor swapped)] → The code is a cover, approximate by design; the bench guides the thresholds; tap tempo and ½× and 2× fix the worst case.
- [Muted code tracks still cost CPU] → Measured in group 4; if the cost is high, muted code tracks stop sound generation and lit notes come from querying the pattern instead.
- [Loudness: a mastered original is louder than the app's songs] → Gain trim per track (D11) and the master limiter.
- [Rights] → The app keeps the file local, plays it only in the tab and in the user's exports, and puts a rights line in the texts. The user is responsible for the use.

## Migration Plan

No migration: a new tab, a new store and a new optional song field. Removing the tab leaves the store unused. Songs opened in Compose stay valid without the tab (the `cover` field is optional, `follow` falls back to the natural growth if removed).

## Owner answers (2026-10-31)

The owner answered the open questions of the first draft. The specs follow these answers.

1. **A track with a stored level B analysis opens in Full.** Confirmed.
2. **Look ahead:** default 2 bars, with 4 seconds and 4 bars added. The values are Off, 2 s, 4 s, 2 bars and 4 bars, in one select (D8).
3. **Phones:** the same 10-minute limit, with a clear message if the browser runs out of memory. Confirmed.
4. **Files over 10 minutes are refused** in this change; longer files go to the later list in the proposal.
5. **Attribution off keeps the generic rights line** in the texts for sharing. Confirmed.
6. **"Follow the song" only for decoded songs** for now. Confirmed.
7. **`// vox: …` is always shown.** Confirmed.

The owner also corrected the layout of the first mockup, which drew a stage inside the tab panel. D1 now places the tab in the app's real layout.
