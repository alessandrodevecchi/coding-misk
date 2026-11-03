## Context

`narration(song, upTo, lang)` in `src/song/build.js` returns what the narrator says in the code of one state. `narratorLines` filters it (narrator track muted, voice-track bars, no sample), `voiceCode` writes it, `spokenSchedule` lists it for the whole song, and `captionSchedule`, `narratorMarks` and the radio's Coming next read that schedule. `voiceSamples` lists the texts to warm up on its own and repeats the rule.

Today, by style:

| Narrator | Narrated growth off | Narrated growth on |
| --- | --- | --- |
| explain | step line on every step with `say` | the same, more steps have `say` |
| poetic | entry images only (after-tests-oct28 D5) | entry images; on a step with `say`: the step line on an entry's bar, a movement image elsewhere (D11, poetic-steps) |

`say` comes from the growth (`src/song/crescendo.js`): every step with Narrated growth, else the key steps and about 30% of the others. Songs with their own written steps and radio songs carry the `say` their author or the director wrote.

Measured (Crescendo, English, all samples assumed present):

| Song | Explain, off | Poetic, off | Explain, on | Poetic, on |
| --- | --- | --- | --- | --- |
| luci-rosse | 15 | 7 images | 35 | 38: 7 images, 25 moves, 6 step lines |
| kellerlicht | 21 | 10 images | 44 | 50: 10 images, 31 moves, 9 step lines |
| settimo-cielo | 19 | 7 images | 41 | 44: 7 images, 31 moves, 6 step lines |

Expected after this change, from the same steps:

| Song | Poetic, off | Poetic, on |
| --- | --- | --- |
| luci-rosse | 15: 7 images, 8 moves | 32: 7 images, 25 moves |
| kellerlicht | 21: 10 images, 11 moves | 41: 10 images, 31 moves |
| settimo-cielo | 19: 7 images, 12 moves | 38: 7 images, 31 moves |

Without Narrated growth the poetic narrator then says as many lines as the explaining one. With it, about 3 fewer: an entry step's line moves to the bar before, where another step may already speak.

## Goals / Non-Goals

**Goals:**
- One rule for when the narrator speaks (the steps with `say`), the same for both styles.
- One rule for what the poetic narrator says (images only), the same with Narrated growth on or off.
- No line the poetic narrator says today is lost; the stage keeps showing what is heard.

**Non-Goals:**
- Changing the growth, the steps, which steps get `say`, the explaining narrator or the voice track.
- Growing the image vocabularies in this change. The owner approved new phrases (more movement images, more `any` images, more entry images per track, more director lines); they are added in a separate change (`feat/82-new-phrases`, `src/song/vocabulary.js` and `src/endless/phrases.js`). The logic of this change must not depend on the size of any list: D4's ordinal and its wrap-around hold for any list length.
- Changing the timing of entry images.

## Decisions

### D1. When the poetic narrator speaks

The poetic narrator speaks on the bars of the steps with `say` (`sayStep`, the latest step with `say` on the bar), the same occasions as the explaining narrator, plus the entry images (D2). `narratedGrowth(song)` is no longer read by `narration`, `stepSaid` or `voiceSamples`. A step that brings the voice track in stays unnarrated (`bringsSpoken`), as with the explaining style.

### D2. Entries always get their image (recommended)

Every entry keeps its image with today's timing (after-tests-oct28 D5): the bar before the entry, or the entry's bar on the song's first bar or the radio window's first bar, also when no step on the entry's bar has `say`.

Considered: image only for entries whose step has `say`. Without Narrated growth an entry step without `say` would then go silent, so the poetic narrator would lose images it says today (luci-rosse: some of its 7). Rejected: the owner's rule is "nothing the poetic narrator says now is lost".

So the poetic narrator may speak on a few bars where the explaining one is quiet (an entry whose step has no `say`). This is the one difference from the explaining occasions, and it is intended.

### D3. What is said on each bar

- An entry's image bar: the image. The per-bar cap (`perBar('narrator')`, 1) still applies, and the images are pushed first, so an image wins a bar shared with a movement image.
- An entry's own bar (not the first bar): nothing more. The step line said there today with Narrated growth goes.
- A bar with a step with `say` and no entry on it: a movement image (`stepSaid` without the Narrated growth test).
- A bar where the voice track sounds: nothing (`narratorLines`, unchanged).

### D4. Movement images in turn

`movementLine(song, k)` today takes `k` = the step's index in the build. With every step spoken this is nearly consecutive; with few steps spoken the index jumps, so with 12 lines two spoken steps 12 indices apart repeat a line early. `k` becomes the ordinal of the step among the steps that say a movement image (the steps with `say` whose bar has no entry and is not taken by an image), counted in the same order as `buildSteps`. It is computed once per song per language in `narration` (memoised per song object, as `releasedMemo`). The start stays drawn from the song's seed on the `poetic-move` stream, so the music's streams do not move. The index is taken modulo the list's length at the time it is read, so the rule holds whatever the size of the movement list (the vocabulary grows in a separate change).

This also changes which image a narrated poetic song says on a given step: the code changes anyway (D7). The key of a phrase of mine (`m:${k}`, my-phrases) follows the new `k`; `check:phrases` is updated.

### D5. Fallback to the step line (owner, 2026-11-02)

When the image for a moment is empty, the poetic narrator says the step line instead:

- movement image empty: the step line of the step on that bar (`stepText`);
- entry image empty: the step line of the entry's bar, on that bar, when a step there has `say` (`sayStep` on that bar); else nothing.

An image is empty when `poeticLine` or `movementLine` gives nothing, or when the image has no text in the current language. The second test is new: `sayText` falls back to English for a missing language, which would put an English image into an Italian song; for images it counts as missing, so the Italian step line is said instead. A small helper `imageText(line, lang)` returns `line[lang]` (or the string) and `''` otherwise.

With the built-in vocabulary an image always exists: `poeticLine` falls back to the track type's list, then `any`, then `POETIC.any`; `movementLine` falls back to `POETIC.move`; every built-in image in `POETIC` has `en` and `it` (a new assertion in `check:spoken` keeps it so, task 4.4). So the fallback is a safety net for a song or a style that replaces a list with an empty one, or writes an image in one language only. A missing sample keeps today's rule (`lineSample`, spoken-text-on-stage D10): the speaker's sample, else the default voice's, else silent (and, in the browser, the voice helper may make it, D9).

### D6. Captions, marks, lists

`captionSchedule` reads `spokenSchedule`, so the caption is the image heard. Its step entries (`kind: 'step'`) are built from every step with `say` and marked `heard` when a narrator caption says the same words; with images they are not heard, so they show as the small tag (spoken-text-on-stage D2). This already holds today for movement images; it now holds on entry bars too, where the step line is no longer said: the tag shows the step line on the entry's bar after the image caption of the bar before. The Narrator row in Compose (`narratorMarks`) and the read-only Narrator lines list count the lines heard, so they follow without code changes. The radio's Coming next (V:N rows) reads the same schedule.

### D7. Versions, fixtures and snapshots

- `CRESCENDO_VERSION` stays: the Crescendo fixtures fingerprint the steps (with their `say`), which do not change.
- `SHAPES_VERSION` stays: the Live coder fixtures fingerprint the grown steps, which do not change.
- `DIRECTOR_VERSION` stays: the endless fixtures fingerprint the director's songs, which do not change; the rule in AGENTS.md bumps it only when they move.
- `npm run durations` is not needed: the lengths do not change.
- `npm run check:code` should stay green: the snapshots are `compileSong` of the written songs, which writes no narrator lines (no `spoken on bar` in `tests/snapshots/code/`). If it moves anyway, update with `npm run snapshot:code` in the same commit and say why.
- What changes is the live code of poetic songs (the narrator's `$: s("say_…")` lines and their `// "…", spoken on bar N` comments): the code of every state of a poetic Crescendo or Live coder song, and of poetic songs with their own steps (for example `prova-voce-notte`) in the live build. `check:spoken` checks it.

### D8. Saved radio sessions

A saved radio session replays its songs from the director with the current code, so a session with a poetic narrator (the profile's `narratorStyle`, or a style or song that is poetic) says more lines when it is played again: the music, the steps and the length are the same. Raising `DIRECTOR_VERSION` would show the "may sound different" warning on every saved session, also the explaining ones, and break the rule that ties it to the fixtures. No bump; a line in DEVLOG and in the release notes. The owner accepted this compromise (Q1, 2026-11-03).

### D9. Samples

No new texts in this change (the new phrases come in a separate change, which brings its own samples): entry images and movement images are already in `poeticTexts()`, so `npm run voices` and `check:samples` already cover them for every narrator speaker in both languages (poetic-steps D5). Songs without Narrated growth now use movement images too, so a machine with missing movement samples hears fewer lines: `npm run check:samples -- --strict` must pass before the merge, and `--make` fills the gaps. Step lines stay needed for the explaining narrator and the fallback.

### D10. Texts

- Guide card `voices` (en, it): the poetic style says an image before each track comes in and a short image of movement at the other steps the narrator speaks on; Narrated growth makes more steps speak, for both styles. Remove "the step that brings a track in keeps its line".
- `narratorStyleHint` (en, it): "Poetic: a short image before each track comes in and an image of movement at the other steps" (drop "nothing at the other steps (with Narrated growth, …)").
- `liveNarratedHint` (en, it): "Crescendo: the steps get denser and the narrator speaks at every one of them, in its style" (it: "Crescendo: i passi diventano più fitti e il narratore parla a ognuno, nel suo stile").
- `docs/knowledge/narrator.md`: rewrite "Poetic narrator with Narrated growth (D11, poetic-steps)" and the `poetic` option line; `docs/knowledge/voice.md` has no contradicting line (it says the narrator yields), checked; `docs/knowledge/decisions.md`: replace the row "Poetic narrator with Narrated growth: … entry steps keep theirs (poetic-steps D1, D2)" with this change's row.

## Risks / Trade-offs

- [More lines without Narrated growth] The poetic narrator goes from 7 to 15 lines on luci-rosse. This is the owner's rule; Narrated growth off still gives fewer lines than on.
- [Entry step lines disappear from narrated poetic songs] About 6 to 9 step lines per song are no longer said; the tag still shows them on stage.
- [Movement images repeat on long songs] 12 movement images for 25 to 31 moves: each comes back about twice, as today. The separate vocabulary change (40 movement images) removes most repeats without touching this logic.
- [Saved sessions sound different] Poetic sessions only; see D8.
- [English image in an Italian song] Today possible via `sayText`'s fallback; now the step line is said instead (D5).

## Effort

About 3 to 4 agent hours: code 1 h, checks (`check:spoken` cases, `check-captions.cjs`, `check:phrases`) 1.5 h, texts and docs 0.5 h, full check run 0.5 to 1 h.

## Open Questions

- Q1. Saved radio sessions with a poetic narrator: a DEVLOG and release note only, or bump `DIRECTOR_VERSION`? Answered by the owner (2026-11-03): note only in DEVLOG and the release notes, no `DIRECTOR_VERSION` bump, accepted as a compromise.
