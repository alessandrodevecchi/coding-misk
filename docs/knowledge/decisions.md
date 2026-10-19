---
id: decisions
related: [strudel, ideas, comments-and-functions, live-build, growth-shapes, material, radio-commands, export]
code: [DEVLOG.md, docs/CONTEXT.md, docs/VARIETY.md]
checks: [npm run check:knowledge]
---

# Decisions and lessons

Important choices, and attempts that were tried and dropped. Each line has its reason and where it comes from. Read this before changing one of these areas. Remove a line when it no longer holds; do not keep history here.

## Decisions

| Decision | Why | Source |
| --- | --- | --- |
| Strudel, from npm, never forked | It runs in the browser with no install. A fork only if the audio engine itself must change. | DEVLOG 2026-10-03, [CONTEXT](../CONTEXT.md#key-decisions) |
| Tempo is set by the player at bar lines, never inside a pattern | `.cps()` in a pattern recomputes queued events with a stale reference and drops notes. | [MUSIC-ENGINE](../MUSIC-ENGINE.md#strudel-gotchas-learned-the-hard-way) |
| Strudel's master stays at 0.6 | All layers together go above 1 and clip. | [CONTEXT](../CONTEXT.md#key-decisions) |
| Guitar level after the distortion (`postgain`) | Before heavy drive, `gain` only changes the saturation. | [CONTEXT](../CONTEXT.md#key-decisions) |
| The output peak is the level limit, a track line is a warning | A line passes the master before the output, and browser audio is floating point: only the output and files clip. Loud styles may set `headroom` (up to 1.5) for single lines (level-headroom). | [sound-and-levels](sound-and-levels.md) |
| A look-ahead limiter worklet on the master, ceiling 0.95, in the app and every export | 11 of 26 songs clipped in exports with every line below 1.0. The worklet keeps every sample at the ceiling at most and leaves the sound bit for bit below it (measured: 1.2e-7 difference, from the guard's curve). Rejected: `DynamicsCompressorNode`, it adds a makeup gain (+0.86 dB below the threshold, so not transparent) and overshoots on transients (1.07 on a click). The style's `headroom` sets the push into it. | [sound-and-levels](sound-and-levels.md), DEVLOG 2026-10-19 |
| Built-in songs are song files, not hand code | Every song must open and be edited in Compose. | [CONTEXT](../CONTEXT.md#key-decisions) |
| Parts are stored as ideas, written in their shortest exact form | Short code like a live coder's, growth from an idea, variation instead of replacement. 1,071,662 events compared: no difference. | [DEVLOG](../../DEVLOG.md#2026-10-18-parti-come-idee-idea-model-70), [VARIETY](../VARIETY.md#one-root) |
| Randomness is always seeded | The same song sounds the same in the app, exports and checks. | [VARIETY](../VARIETY.md#one-root) |
| The generator picks rules, never free notes | Parts stay in key and on chord tones; melodies are not random. | [ENDLESS](../ENDLESS.md#material) |
| No app function takes a Strudel name or synonym | `o`, `drive` and `voice` hid Strudel's own (`o` is `orbit`, `drive` a filter overdrive). They became `chan`, `crunch` and song functions. `env` is Strudel's, so the envelope is `plk`. `grit` is a track setting, so distortion is `crunch`. | [DEVLOG](../../DEVLOG.md#2026-10-19-funzioni-del-brano-song-functions-73) |
| Classic and Crescendo keep their sound and steps | New growth only in the Live coder profile; fixtures guard the old ones. `CRESCENDO_VERSION` 2 keeps the random seed name `crescendo-1`. | [VARIETY](../VARIETY.md), [DEVLOG](../../DEVLOG.md#2026-10-18-parti-come-idee-idea-model-70) |
| The Live coder keeps the id `switch` | Songs, recipes and storage name it; only the label changed. | [profiles.md](profiles.md) |
| Typing never rushes | A step waits for its typing, or a new line is pasted whole after a pause. Typing faster than a person looked fake. | [DEVLOG](../../DEVLOG.md#2026-10-19-forme-di-crescita-growth-shapes-64) |
| Section lanes of the Live coder play from the hidden mixer | Lines were duplicated per section with `.mask(sectionN)`; now one line is edited in place. | [DEVLOG](../../DEVLOG.md#2026-10-19-live-coder-righe-modificate-sul-posto-niente-incolla-forzato-con-durata-libera-durata) |
| Complexity 0 and the source `patterns` give the old songs | Saved sessions and fixtures must not move. | [DEVLOG](../../DEVLOG.md#2026-10-19-generatore-di-materiale-material-generator-71) |
| Vary always composes, Swap never composes | Two clear buttons: new notes, or another ready part. | [DEVLOG](../../DEVLOG.md#2026-10-19-varia-e-scambia-nella-console-materiale-accanto-alle-manopole-radio-variation-3-41-62-7-24) |
| Raise `DIRECTOR_VERSION` or `SHAPES_VERSION` when fixtures move on purpose | Saved sessions warn that they may sound different; shapes draw anew. | `AGENTS.md` |
| At most 4 to 5 layers, dark or tense melodies, fades over cuts | The owner's taste after listening. | [CONTEXT](../CONTEXT.md#owner-preferences-and-feedback-keep-applying-these) |
| Material rules written from general techniques | No passage of a course is reused, so no credit line is needed. | [ENDLESS](../ENDLESS.md#material) |
| A fast export uses a fresh render page each time | Strudel's audio layer keeps one context and pools nodes. | [ARCHITECTURE](../ARCHITECTURE.md#fast-export-8) |

## Rejected attempts

| Attempt | Why it was dropped | Source |
| --- | --- | --- |
| Hosting the app as a web artifact | Its sandbox blocks Strudel's audio worklets loaded from `data:` URLs: no sound. | DEVLOG 2026-10-04 |
| App helpers named after Strudel functions (`o`, `drive`, `voice`) | They shadowed Strudel's functions in the app and in code opened in Strudel. | [DEVLOG](../../DEVLOG.md#2026-10-19-funzioni-del-brano-song-functions-73) |
| Typing faster to keep up with a step | It looked like a machine. Paste the line, or let the step wait. | [DEVLOG](../../DEVLOG.md#2026-10-19-forme-di-crescita-growth-shapes-64) |
| Forced paste with free duration | A pasted line at the start of a build broke the illusion. With free duration the step waits. | [DEVLOG](../../DEVLOG.md#2026-10-19-live-coder-righe-modificate-sul-posto-niente-incolla-forzato-con-durata-libera-durata) |
| Typing mistakes with a chance per character | Most edits change 1 to 7 characters, so a mistake almost never happened. A short edit now counts as 20 characters. | [DEVLOG](../../DEVLOG.md#2026-10-18-errori-di-battitura-visibili-typing-mistakes-64) |
| `*n` around an alternation in the idea writer | Under `*n` the alternation counts its cycles faster and the notes change. | [DEVLOG](../../DEVLOG.md#2026-10-18-parti-come-idee-idea-model-70) |
| `!` whenever it repeats | `[~ x!3]` is harder to read than `[~ x x x]`. Use `!` only when it saves 3 characters or more. | [DEVLOG](../../DEVLOG.md#2026-10-18-parti-come-idee-idea-model-70) |
| `Fmaj7` and `n("0 2").add("4")` in ideas | `voicing()` knows `F^7`, not `Fmaj7`. An `add` outside the string does nothing on `n`: degrees come first, notes after. | [DEVLOG](../../DEVLOG.md#2026-10-18-parti-come-idee-idea-model-70) |
| Converting between Strudel code and tracker modules | They do not map well. Import as code, export to the module format and a second audio engine were dropped. | DEVLOG 2026-10-05 |
| Patterns shared across tracks at song level | Not now: per-track patterns are enough. Shared progressions (`shared`) cover the common case. | [CONTEXT](../CONTEXT.md#ideas-to-re-evaluate-lowest-priority) |
| The words "composition" and "scene" in the interface | Too close to the Compose tab; sections replaced scenes. | [CONTEXT](../CONTEXT.md#vocabulary-decided-2026-10-06) |
| A sound with `stretch` in the first tenth of a second of a render | It stayed silent. Fast export now starts 0.1 s later. | [DEVLOG](../../DEVLOG.md#2026-10-19-voce-strumento-voice-instrument-39) |
