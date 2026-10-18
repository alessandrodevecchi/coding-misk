## Context

A track of type `voice` holds the narrator's settings (`VOICE_DEFAULT` in `src/song/format.js`: gain, pitch, tempo, cutoff, hpf, drive, room, delay, speaker) and rack. `voiceCode` in `src/song/build.js` writes one line per build step comment: `s("<bank>").n(<index>).mask("<lane>")` plus effects, on orbit 15 and up, played once on the step's bar. Samples live in `public/samples/say_<lang>[_<speaker>]/<slug>.wav`, made by `tools/voice.mjs` (`npm run voices`) with macOS `say` and ffmpeg from every phrase it can collect. The folder is git-ignored because the system voices may not be shared, so a machine without the samples plays the songs without speech. `SPEAKERS` lists eight speakers that speak both English and Italian; the director draws a voice per song with `VOICE_CHARACTERS` and `VOICE_LIMITS` on the `voice` stream. Growths leave `voice` tracks out.

Strudel 1.2.6 has what the four ways to speak need on samples: `mask`, `slice`, `splice`, `chop`, `begin`, `end`, `speed`, `stretch`, filters, `delay`, `room` (see `docs/VOCALS.md`).

## Goals / Non-Goals

**Goals:**
- One new track type that plays spoken lines as music, built on the narrator's sample pipeline and effects.
- Four ways to speak, simple first versions.
- Texts from song, style or vocabulary, all known in advance so `npm run voices` can make every sample.

**Non-Goals:**
- Sung vocals, pitch tracking, autotune (#3).
- Speech made in the browser or fetched at play time.
- Recording the owner's voice (a later step of #3).
- A shipped set of samples (see Open Questions).

## Decisions

### D1. New track type `spoken`

A new type `spoken`, not a role on `voice`. The narrator logic (`voiceOf` takes the first `voice` track) stays untouched, the growth's exclusion of `voice` stays true, and the validator can check each type's fields. Settings are the same as `VOICE_DEFAULT`; the rack accepts the voice devices.

Alternative rejected: a `role` field on `voice` tracks. Every place that reads voice tracks would need a filter, and old songs could change meaning.

### D2. Lines as patterns

A `spoken` track's patterns hold lines: `{ text: { en, it } | "vocab:<id>", way: "entry" | "refrain" | "chop" | "opening", bind?: trackId, once?: true, every?: bars, slices?: n, rhythm?: "0 1 0 1 2 2 3 ~" }`. Clips place them like any pattern. The compiler resolves each clip to bars:

- **entry:** the line's length in beats (from the sample duration, measured by `tools/voice.mjs` and stored in the samples manifest) is placed so it ends one beat before each start of the bound track's clips; `once` keeps only the first.
- **refrain:** the line repeats every `every` bars (default 4) in sections where the number of playing tracks is at most half the song's most, or whose energy role is intro, break or outro.
- **chop:** `s(bank).n(i).slice(slices, "<rhythm>")` on every bar of the clip, with `.clip(1)` so slices do not overlap.
- **opening:** the line from bar 0 of its clip, once.

Each resolved line is a sample line with a mask lane, like the narrator's, on orbits 13 and 14 (two spoken tracks at most), so they never share the narrator's orbit 15.

### D3. Texts and vocabulary

Resolution: the pattern's own text, else the style's `spoken.lines` for that way, else the vocabulary. The vocabulary is a file `src/song/vocabulary.js` with words and short phrases in English and Italian, grouped by mood (dark, calm, machine, night), all written for the project. A generated line picks 1 to 4 entries with the song's seed on its own stream (`spoken`), so it never changes the music of a seed. A chop uses one word or a two-word phrase. Because generated lines are combinations, `tools/voice.mjs` makes one sample per vocabulary entry, and a generated line plays as a sequence of entry samples placed in time (one per beat or half beat). Lines written by songs and styles get their own whole sample.

### D4. Speakers and language

The track's `speaker` setting, else a draw from the style's speakers, else from `SPEAKERS` without the narrator's speaker. Language follows the app; a line with one language plays in it. The samples are made for both languages when both texts exist.

### D5. Narrator yields

`voiceCode` checks the resolved spoken bars of the song state; when a step comment falls inside a spoken line's bars, it returns nothing for that step. The narrator's comment is lost, not delayed, so build timing stays as it is.

### D6. Live build and growth

`crescendoSong` treats `spoken` as a track type after `texture` in `ORDER`, entering at its first line. It is not thinned: its steps are enter, settings, rack, leave. The `voice` opening of `growth-shapes` puts it first. Classic and Crescendo builds of existing songs do not change because no existing song has a `spoken` track.

### D7. Director

Recipes gain an optional `spoken: { weight, ways: { entry, refrain, chop, opening }, lines?, speakers? }`. With a weight the director adds a `spoken` candidate track; its moves are add and remove like a texture, and its entry lines bind to the next track that enters. Styles without the field add nothing, so their fixtures do not move. The first version gives weights to two or three styles (for example dark cyberpunk, ambient, one live coder style), which changes the endless fixtures: `DIRECTOR_VERSION` goes up in the same commit. Density and energy measures leave `spoken` out, like `voice` and the riser; only chops count as a layer for the 4 to 5 layer rule.

## Risks / Trade-offs

- **[Samples not in the repository]** → as for the narrator, lines stay silent without samples; the Guide card says to run `npm run voices`. See Open Questions.
- **[Sample length differs per speaker and language]** → entry lines are placed from the measured length of the sample in use; the manifest stores lengths per file.
- **[Words lost under a full mix]** → refrains only in quiet parts; entry lines get a small duck of the other tracks only if the level check shows they are masked (later, not in this version).
- **[Generated lines sound mechanical]** → accepted for a first version; it suits the dark and machine styles; the listening test decides the vocabulary's future.

## Migration Plan

No migration: existing songs have no `spoken` tracks. Endless fixtures are rewritten once with the version bump.

## Open Questions

- **Shipping samples.** The macOS voices may not be shared, so other machines hear no lines. Recommended: keep them git-ignored in this change, and plan a later step that makes the vocabulary and style lines with a local text to speech model under a permissive licence (see `docs/VOCALS.md`), whose files can be committed.
- **Which styles get a weight first.** Recommended: dark cyberpunk and ambient (refrain and entry) and one live coder style (opening and chop), weight 0.3 each, adjusted after the listening test.
