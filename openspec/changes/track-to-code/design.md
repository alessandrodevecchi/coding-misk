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

All Decode code lives in `src/decode/`: `tab.js` (UI), `input.js` (file, tags, fingerprint, decoding), `store.js` (IndexedDB), `worker.js` (analysis), `misk-analyzer.js` and `engine-essentia.js` (D5), `model.js` (D6), `writer.js` (D9), `mix.js` (D11), `sync.js` (D12). `index.html` gets the tab button between Songs and Playlists (`data-mode-of="ascolta" data-tab="decode"`) and a `#tab-decode` section. `src/main.js` only wires the tab, the transport and the master bus. `tools/check-modes.cjs` learns the new order.

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

Both levels read the decoded PCM, not an `AnalyserNode`. Level A posts "analyse up to time t" to the worker as the playhead moves; t is the playhead plus the look ahead (D8). Level B posts "analyse everything". The worker runs misk-analyzer (D5) in both cases, frame by frame, and level B adds whole-file steps on top.

Why not `AnalyserNode` as the reference app does: the file is decoded anyway; PCM frames give exact, repeatable results; the same code runs in Node for the bench; and an `AnalyserNode` cannot look ahead.

### D5. misk-analyzer, with Essentia.js for three measures in level B

**misk-analyzer** is the app's own analyser (`src/decode/misk-analyzer.js`), written anew and modelled on the reference app's approach. It is the frame both levels use, and it owns every step from the audio to the song model:

- decoding (D2) and the frames: STFT at 1024, 4096 and 16384 points on the mono PCM;
- drum hits per band: kick 40-130 Hz, snare or clap 1.1-5.2 kHz, hat 7-15 kHz, by positive spectral flux with a median and interquartile threshold and a refractory time; kick or bass by the pitch drop after 90 ms; closed or open hat by decay; 16-step grids with hysteresis (D9);
- bass notes by YIN on a low-passed signal, one note per step;
- levels per band per bar, brightness and low-end weight;
- sections, section kinds and the ending, by novelty on chroma and levels;
- its own simpler tempo and beats (autocorrelation with priors, D7), key (chord tones against key profiles) and chords (chroma from tonal peaks, 24 major and minor templates with overtones);
- the song model (D6).

**Essentia.js** is the browser build (WebAssembly) of the Essentia C++ library; the C++ library itself cannot run in the browser. In level B, misk-analyzer calls it for three measures only, where it is stronger:

1. whole-track tempo and beats: `RhythmExtractor2013` (multifeature);
2. key: `KeyExtractor`, with the mode (relative major or minor) settled by misk-analyzer's chord evidence;
3. chords: `HPCP` and `ChordsDetectionBeats` on the beat ticks.

**Fallback:** if Essentia.js fails to load or to run, misk-analyzer computes the three measures with its own code, so level B always finishes. The model records which engine gave each measure.

**Level A uses misk-analyzer only,** even when Essentia.js is already loaded after a level B run. Level A must start at once, stay light and give the same result every time; a stored level B result is used through the level switch, not mixed into level A.

An engine is `{ id, version, incremental, analyse(frames | pcm, { onProgress, signal }) → partial model }`, so the three measures can move to another engine later without touching the rest. Essentia.js is loaded only when level B runs, by a dynamic import inside the worker, so other tabs never download it.

**Verified on 2026-10-31** (npm registry, the package unpacked in a scratch folder, a test page built with the project's Vite 8 and run in the headless browser of the project's tools):

- `essentia.js` 0.1.3 is the latest npm version (published 2021-06-24; no npm release since). License AGPL-3.0, compatible with the project's AGPL-3.0-or-later. Core reports `2.1-beta6-dev`.
- The projects are active: the Essentia.js source repository was updated in December 2025 and the Essentia C++ repository in October 2026 (checked by the owner).
- The npm package is 10.1 MB unpacked because it ships every build variant. The browser needs one: the ES module with the WebAssembly inlined (`essentia-wasm.es.js`, 2.56 MB, 0.80 MB gzip) plus the core API (`essentia.js-core.es.js`, 0.32 MB). The separate `.wasm` build is 1.99 MB (0.54 MB gzip).
- The algorithms needed exist: `RhythmExtractor2013`, `BeatTrackerMultiFeature`, `PercivalBpmEstimator`, `KeyExtractor`, `HPCP`, `ChordsDetection`, `ChordsDetectionBeats`, `OnsetDetection`, `SuperFluxExtractor`, `PitchYin`, `PitchYinFFT`, `PredominantPitchMelodia`, `NoveltyCurve`, `Danceability`. `SBic` (segmentation) is not exposed, so misk-analyzer finds the sections.
- It runs in a module Web Worker under Vite, both in `vite build` and in the dev server, with no Vite configuration.
- Measures on a synthetic 180-second track (124 BPM, kick, offbeat hat, chords Am F C G per bar, bass), on the owner's machine: `RhythmExtractor2013` degara 0.65 s (124.0 BPM), multifeature 3.2 s (123.4 BPM); `KeyExtractor` 0.17 s (C major: the relative major of A minor, an expected confusion that D7 settles with chord evidence); HPCP plus `ChordsDetection` over the whole track 0.85 s (right on most bars, F read as Dm on some); `PitchYin` found the bass F1 (43.6 Hz) on its bar. Level B on a 10-minute file is expected under 20 s.

No blocker found. The risks are the age of the npm build (pinned version, behind the engine interface, misk-analyzer as fallback) and its size (lazy-loaded). If the npm build breaks in a future browser or bundler, the WebAssembly can be built from the current source repository (a few agent hours; a task only if needed, task 6.5).

**Other libraries (checked 2026-10-31).** No recent library does all of it:

| Library | License | Last update | What it does | Use here |
| --- | --- | --- | --- | --- |
| web-audio-beat-detector | MIT | 2026-08 | tempo only | second opinion on tempo in the bench (dev dependency of the bench only, unless it wins) |
| realtime-bpm-analyzer | Apache-2.0 | 2026-10 | tempo only | not used |
| tonal | MIT | 2026-10 | names chords and scales from notes; no audio | not used (misk-analyzer names its own chords) |
| Meyda | MIT | 2024 | basic per-frame features (RMS, centroid, chroma, MFCC); no tempo, beat, key or chords | rejected: misk-analyzer computes the features it needs |

Alternatives:

- **misk-analyzer alone for level B.** Kept as the fallback. If the bench (group 9) shows it as good as Essentia.js on the three measures, level B may drop Essentia.js later. A Settings choice of engine may follow; not in this change.
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

misk-analyzer estimates the tempo from the onset envelope of the last 8 seconds (or the whole file in B) by autocorrelation between 60 and 200 BPM, weighted by a prior centred on 120 BPM and by how well kick and snare fall on the beats. The two strongest of half, single and double become `bpmCandidates`; the tab shows ½× and 2× to switch. When the pulse is weak, the best candidate is kept and marked uncertain. Level B takes Essentia.js's tempo when its confidence is high, else misk-analyzer's (D5).

Tap tempo: the space bar in the Decode tab (no focused field). Four taps or more give the tempo (median interval) and the phase (first tap is a downbeat). The tapped tempo replaces the analysed one and is stored.

### D8. Look ahead

Values: Off, 2 s, 4 s, 2 bars, 4 bars, in one select (five buttons are too wide for the panel); default 2 bars. Four seconds and four bars give slow tracks and long lines more time. Two bars give the typist time for a line of about 40 characters at the human pace at 120 BPM, and land the change on its bar.

The analysis horizon is the playhead plus the look ahead. The writer (D9) runs once per bar on the model up to the horizon and gives the code that bar should have; the typing aims to finish 0.2 bar before that bar starts. With Off, the horizon is the playhead, so a change is seen only after its bar has played and lands 1 to 2 bars late, as in the reference app. At Play, the first window up to the horizon is analysed before the sound starts; misk-analyzer does that in tens of milliseconds, so Play still feels immediate.

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
- **Level B:** the song grows with the growth value `follow` (D18).

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

The bench (`tools/decode-bench.mjs`, Node, no browser): built-in songs exported to WAV with the existing export are the ground truth (tempo, key, chords per bar, drum grids and bass notes from the compiled song's haps). It runs both levels and prints tempo error and octave errors, downbeat error, key (exact, relative, fifth), chord accuracy per bar, drum grid F1 per band, bass note accuracy per step. A few owner files, kept outside the repository, are measured without ground truth. The bench also runs web-audio-beat-detector as a second opinion on tempo (a dev dependency of the bench only, unless it beats both engines). Scores go to `tests/snapshots/decode-bench.json`; a later run fails when a score drops by more than a set margin.

### D18. "Follow the song", a growth value for every song

`follow` ("Follow the song", it "Segue il brano") is a value of the Live coder's growth control, next to `crescendo`, `gradual` and `natural`. It is not a new profile. The Compose growth menu offers it for every song. Decoded songs default to it; the default growth of every existing profile stays as it is, so no fixture and no `SHAPES_VERSION` moves.

On any song it means:

- no build-up from zero: there is no growth phase, the written song plays from bar 1;
- the code of each section or clip change is typed by hand, with the Live coder's typist and mistakes, so each line lands just before the bar where its part enters or changes (`planWritten`, the lines-ahead rules of `written-plan.js`);
- a song that starts full has its first lines pasted at bar 1, as a typist could not write them in time;
- the code view, short patterns and lit notes are the profile's, as for any Live coder song.

How it differs from Classic with the Live build on: Classic builds in blocks, each track enters whole at the start of its section and the code jumps there; `follow` types line by line like a person, before the bar, with the code of the moment, and changes inside a section (a clip that starts or changes mid-section) are typed too.

Why: a decoded song opened in Compose must keep exactly the same code, so the growth it uses must exist in Compose; and the owner wants the option for any song.

Alternative: offer `follow` only for decoded songs. Rejected by the owner (it was the first draft's choice).

## Risks / Trade-offs

- [Memory on phones: about 340 MB for a 10-minute file] → Decode the analysis copy at 44.1 kHz mono only; free the buffers when the track closes; a decoding failure shows a message, not a crash. Open question 3.
- [Essentia.js npm build unchanged since 2021] → Pinned version, behind the engine interface, misk-analyzer as fallback (D5); the source repository is active, so the WebAssembly can be rebuilt if needed (task 6.5).
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
6. **"Follow the song" for every song in Compose**, as a value of the Live coder growth control (D18). This replaces the first answer (decoded songs only).
7. **`// vox: …` is always shown.** Confirmed.

The owner also corrected the layout of the first mockup, which drew a stage inside the tab panel. D1 now places the tab in the app's real layout.

## Implementation notes

Phase 1 of 4 (groups 1 to 5, level A), `feat/91-decode-live`, 2026-10-31.

- **Frames (D5).** misk-analyzer uses STFTs of 1024 points (onsets, levels) and 4096 points (chroma); no 16384-point STFT. The bass comes from YIN on the signal low-passed at 320 Hz and decimated by 8, which resolves 30 to 260 Hz without it.
- **Tempo lock (D7).** The tempo locks once, on the first 8 seconds of music (at most 12), when the file opens, whatever the look ahead; the look ahead applies to the bars (grids, chords, bass, levels). A lock on 4 seconds drifted by up to 0.6 BPM, which moves the code 0.1 s off over half a minute. Among half, double, two thirds and three halves the tempo whose strong snares fall two beats apart wins (the backbeat); the beat phase comes from the onsets with kicks weighing most, so an offbeat bass or offbeat hats never shift the beat; a tempo within 0.65 BPM of a whole number snaps to it when the comb scores almost as well.
- **Drum classes.** A clap or snare is told from a hat and from a kick's click by the rise of the snare band (1.1 to 5.2 kHz) against the hat band (7 to 15 kHz), compared with the same ratio for this track's own hats; a kick by its pitch falling in its first 50 ms. Measured on the app's 909 and 808 exports and on the generated tracks.
- **Chords and key.** The chord comes from the whole chroma; the chroma without the bass's 5th, 7th, 9th, 10th, 11th and 13th harmonics only turns a major chord minor when the minor third clearly wins (a low bass's 5th harmonic is a major third). The key comes from the chords heard (their triads against the key profiles); between relative major and minor the tonic chord heard more often wins, the first chord counting three bars.
- **Level A writer (D9, D13).** Level A writes a song of the moment at each bar: one section as long as the longest loop; each part plays the loop it holds at that bar, aligned to the bar number (`<…>` takes element `cycle mod L`); a part heard before and silent now stays as a muted line (`_$:`). It goes through `liveCode` with a growth of length 0 (`crescendo: { growth: 0 }`), so the Options' code view keeps its meaning. Two bars of bass are the same line when 13 of 16 steps agree. "A grid held for one bar" reads as the same new grid in two bars in a row; one or two steps of difference need three.
- **Parts heard.** Drums: two hits or more, with a kick, a hat or two claps. Bass: two notes or more. Chords: chord confidence 0.5 or more and a chord level of at least 15 % of the loudest bar so far.
- **Mix (D11).** Level A has one code track, so the code's bus is one gain between Strudel's merger and the master stage's level node; the original joins the same level node, before the limiter. The track meters show peaks after the gains.
- **Clock (D12).** The original starts at the audio time of its cycle read from the scheduler's anchor after its first tick (`num_cycles_at_cps_change`, `seconds_at_cps_change`, `latency`). A restart (seek, a new tempo, the tempo locked while the original already plays) hands over to a new source at the exact time the old one stops. Measured: the code's kick within 0.3 to 2.2 ms (median) of the original's.
- **Look ahead (D8).** One analysis request is in flight at a time, half a second past the horizon. The next change is typed towards the earliest bar after the playing one whose code differs, using only the bars complete before the horizon (a model stored or analysed further never leaks into Off); the typing ends 0.2 s before the bar, as the Live build's. Measured on the 124 BPM test song: 2 bars, 4 bars and 4 s land on bar 33, 2 s on bar 34, Off on bar 35.
- **Tap tempo.** Taps count while the track plays (they need the file time); a tapped tempo restarts the playback at the same file time with the new grid.
- **Muted code (task 4.4).** Muted code runs at zero gain. Two minutes with the code muted gave no long task and no drift of the audio clock, so the code keeps sounding at zero gain and the pattern-query fallback was not needed.
- **Not in this phase.** Level B (the Full switch) and Open in Compose are shown disabled with the tooltip "Coming in a next version". The recent list's "Full ready" badge reads a stored level B model (none yet). The stored record keeps the level A model of the bars heard (`modelA`).

Phase 2 of 4 (groups 6 and 7, level B, "Follow the song", Open in Compose), `feat/91-decode-full`, 2026-10-31.

- **Engine interface (D5).** `src/decode/engine-essentia.js` exposes the three measures as three calls, `{ id, version, incremental: false, rhythm(pcm), key(pcm), chords(pcm, ticks) }`, instead of one `analyse(…) → partial model`: the chords need the beat grid, which comes after the tempo. `src/decode/full.js` (`analyseFull`) is level B: misk-analyzer's frames, bars, grids, bass and levels, the three measures from Essentia.js, then sections, kinds, the ending and the variations. In Node the checks load the package's UMD build (`tools/essentia-node.mjs`); the browser loads the ES build.
- **Its own worker, its own chunk.** Level B runs in a second instance of `worker.js`, so Cancel ends that worker and level A goes on. Vite's default worker format inlined the dynamic imports into the worker file (Essentia.js in the level A worker, 2.8 MB); `worker: { format: 'es' }` in `vite.config.js` keeps them as chunks: the level A worker is 20 KB, Essentia.js is `essentia-wasm.es` (2.5 MB), `essentia.js-core.es` (43 KB) and `engine-essentia` (2 KB), downloaded only when Full runs.
- **Tempo (D7).** Essentia.js's whole-track tempo is taken when its confidence is 2.5 or more, in misk-analyzer's octave when the two are half or double. Its value is 0.1 to 0.9 BPM off on the test songs (123.9 for 124, 128.9 for 128) and its beats 10 to 60 ms late, which would drift the code by up to 1.7 s over four minutes. So Essentia.js sets the tempo's region and octave, and the grid the code plays on is misk-analyzer's: a comb over the whole file's onsets within 1.5 % (`wholeTempo`), the beat phase from every onset with kicks weighing most (`wholePhase`), a weighted line through the onsets on the 16th grid growing from 20 seconds to the whole file (`fitGrid`, a whole tempo when it fits as well), then the downbeat. The model records `essentia.js` as the tempo's engine. The whole-file phase also fixes level A's half-beat lock on an intro of offbeat hats alone (decode-test-long: downbeat 0.236 s in level A, 0.002 s in level B).
- **Chords and key (D5).** `ChordsDetectionBeats` runs on the bars' starts as ticks, one HPCP median and one chord per bar. On the beats, with a vote per bar, the chords flipped between relatives more often (decode-test-124: 0.94 against 0.98 per bar) and the sections split on the noise. The key's mode is settled by the chord evidence, a bar that opens a four-bar phrase counting twice (a loop of Am F C G opens on Am); level B settles misk-analyzer's own key the same way when Essentia.js is not used.
- **Sections (D6, 6.3).** Novelty over 8-bar windows of the parts heard, their levels (bass and the high band at half weight), the drum density, the chroma and the chords played; peaks of at least 0.6 that stand 0.5 above the lowest novelty within 8 bars, at least 4 bars apart, each moved within a bar to the strongest two-bar contrast; then neighbouring sections that sound alike are merged. Kinds: intro and outro for a first or last section quieter or with fewer parts than the fullest, break for few drums (heard or level), drop for a loud section after a break or a build, build before a drop, else verse. The ending is the bar after the last one with music.
- **Writer (D9, D10).** `writeFull` writes the model's sections named by kind (Intro, Verse, Verse 2, Break, Drop, Outro), a drums track with each section's main grid, bass and chords code tracks with one loop per section (the smallest period of 1, 2, 4 or 8 bars that holds on 80 % of the bars, aligned to the bar number), sounds by measure per section. A part plays where it is heard, one-bar gaps filled and one-bar islands left out. A section whose chords fall mostly outside the key is no chord part: a drums-only outro reads as Bb, Gm, F#… in the chord band. Drum variations are clips of a pattern of their own (the format's drum rows are one bar long); a grid within three steps of the main one, or one that only misses some of its hits, counts as the main one. Bass and chord variations live inside the section's loop. No part beyond drums, bass and chords is written: "other" stays a level.
- **Several code tracks (D11).** Each decoded part has its own bus, as the compiler gives it (drums on orbit 1, bass 9, chords 10, read from the compiled song). Mute and solo set the gain of that orbit's output in superdough (1 or 0); the code's bus keeps the slider's gain. The stage's analysers sit before the orbit's output, so a muted part still moves the stage and lights its notes. The meters read the orbits' outputs.
- **Level switch (playback spec).** Full is a chip next to Live. Without a stored analysis, Full runs level B: the growing mark on the chip, "Analysing N % · stage" and Cancel beside it; the original keeps playing. When it ends, the level B code takes over at the next bar with that bar's code whole (`app.swap`, `decodeSwapTick` in `main.js`); the same when switching back to Live, and when an Option, the sounds or the title change in Full (level A takes them from its next edit). Look ahead is disabled in Full. A new tempo (½×, 2×, tapped) clears the stored level B model and runs Full again with it.
- **Playing level B (D13).** The player's song is the level B song grown with `follow` in the Decode controls (Live coder, narrator off, the tab's Options); `main.js` runs the player's live build for it (`liveBuild`, its typing plan, lines typed ahead) instead of level A's reactive typing. Before the first downbeat the code shows the title and the tempo and `$: silence`.
- **"Follow the song" (D18).** `followSong` (`src/song/crescendo.js`) makes a step at bar 0 and at every clip start and end inside the song (the section changes are steps of the code of the moment already; the clip changes inside a section are typed with every code option, also without Sections). Growth 0, no ending; `src/live/live-code.js` and `src/live/written-plan.js` needed no change, since a growth of 0 bars with `coder` already plans the written part from bar 0 (lines typed ahead, muted lines kept for later). It is offered in the Compose growth menu for every song and never in the radio's song controls (its songs grow on air). `npm run check:live-code` plays the 38 built-in songs with it: the same notes as the song as written at every step (257 steps, 13 330 notes), no evaluation error; `check:crescendo` and its fixtures, `SHAPES_VERSION` and `CRESCENDO_VERSION` do not move.
- **Open in Compose (D15).** The song is saved with `config: { profile: 'switch', live: true, options }`, the options the cleaned overrides of the Decode controls (`narrator: false`, `growth: 'follow'`, and the tab's code options when they differ from the Live coder's). Its code at every step is the code of Decode without the `// vox: …` line, which stays a Decode placeholder (the song format has no free comment after the parts). Checked in Node at every step and in the browser at 8 bars.
- **Measured (Node, the owner's machine).** Level B on the 4-minute test song: 7.8 s with Essentia.js, 2.5 s with misk-analyzer alone; in the browser 9.4 s, no long task. Sections within one bar on the generated track (8, 24, 40, 48) and on the test songs (decode-test-long 16, 48, 64, 111 for 16, 48, 64, 112; decode-test-124 9, 32, 40 for 8, 32, 40), no extra bound with Essentia.js.
- **Not in this phase.** Task 6.5 was not needed: the npm build of Essentia.js 0.1.3 runs in the browser worker and in Node. Exports with the original (group 8) and the bench (group 9) come next.

Phase 3 of 4 (group 8, export with the original), `feat/91-decode-export`, 2026-10-31.

- **One export path.** The Decode tab's Export and Fragments buttons call the app's own `exportFast`, `exportVideoFast`, `makeFragments` and the real time recorder; a decoded track adds a `dec` option (job fields, timeline cover, texts cover). The tab builds the source (`exportSource` in `src/decode/tab.js`, pure helpers in `src/decode/export.js`): the level B song as the player plays it, the mix as heard when the export starts, and the original's samples for any window.
- **Export always writes Full.** The fast export needs the whole track's code, which only level B has, so Export and Fragments run Full first when it is missing (the growing mark and "Analysing for the export…" show) and then go on by themselves. A real time export plays the Full code too: the tab switches to Full, with level A's code-track mute and solo given to every part (`mixForParts`). The tab stays in Full afterwards.
- **The file is the whole file.** The export starts at the original's second 0, not at the first downbeat: `job.start` is negative (`-downbeat`) and the render window opens that long before bar 0, where only the original sounds (`renderInBlocks` floor, `renderVideo` waits on cycle 0). It ends where the original ends (`cut`), so fast and real time files have the same length. The timeline moves its times by the lead-in and carries `cover` and `firstBar`.
- **Mix in the render page (D16).** `origAt(from, to)` cuts the original's span of each block, moved to the page (transferred, cut again for each retry). The page puts it through a gain of cos(x·π/2) times the loudness trim into the master level node, and sets the code bus gain with `codeBus`, the same graph as the tab, so the master limiter sees the sum. A code track that is not heard has its orbit's output at zero from the moment the orbit is made (`getOrbit` wrapped). Scope renders of one instrument (`only`) get no original.
- **Measured (task 8.1 to 8.3).** On a 31.5 s file (1.5 s tone, then the 124 BPM test song): slider in the middle, the weight of the original in the file is 0.82 (0.795 expected: cos 45° × trim × master) with the code's RMS 0.075; fully on Code 0.04; fully on Original 1.12 (1.12 expected) with a residual of 0.003; the lead-in is the original alone; peak 0.915. Fast and real time: loudness 0.01 dB, low 0.01 dB, high 0.29 dB, envelope r=0.998 (tolerance of `check-export`: 1.5, 2, 2.5, 0.85). A fragment of 8 s to 20 s: the original's same 12 s at weight 0.82, lag 0 ms, 1080×1920. Muting Bass in Full lowers the code's low band by about a third. Opened in Compose, the export holds only the code (weight 0.04).
- **Fragments.** `fragmentSource('decode')` gives the picker the level B song's shape: its sections are named by kind, so `sectionWeight` already weighs drop above verse above intro and no new weights exist. The fragment job is `{ origAt, mix }` over the fragment's own `start` and `cut`.
- **Texts for sharing (D16).** `textsFor` takes `cover` and writes `rightsLine` after the inspiration: Attribution on, `Cover of "<title>" by <artist>. The original recording belongs to its rights holders.`; off, `Contains a recording that belongs to its rights holders.`; off and no original in the mix, `Code written over a recording that belongs to its rights holders.`; each in Italian too, in the app's language (the rest of the text stays English as before). The wording is D16's: the brief's paraphrase ("original track by third parties, rights of their respective authors") is not in the spec. With Attribution off the texts' title is "Track to code" / "Da brano a codice", the seed is the file's fingerprint, and neither the title nor the artist appears. The file names keep the track's title (the owner's own files, and the code header names it with Attribution off, D14); the timeline carries `cover` whatever Attribution says.
- **Real time.** A real time export plays the track from its start and records the master stage (the original passes it before the limiter), saves the file by the format setting, and saves no texts (as the existing real time exports). Stopping the track before its end cancels it; the Export button shows the recording and a tap cancels. The real time video of the whole tab is the app's `startVideoCapture`, which needs the tab share: not testable headless.
- **Not in this phase.** Level A has no fast export: the Live level is the bars heard, so Full is the export's code.
