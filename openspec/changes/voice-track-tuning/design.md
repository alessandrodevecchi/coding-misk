# Design

## Context

The voice track (type `spoken`) is drawn in two places that share helpers:

- the director, for radio songs: `spokenFor` (first line A), `morePhrases` (the other phrases), `spokenPlace` (one phrase) and `spokenParts` (several phrases) in `src/endless/director.js`;
- `rewriteSpoken` in `src/endless/voice-track.js`, for Compose ("New phrases", "Fill with") and the radio's voice steering commands, and `placeGrownSpoken` for songs grown on air.

The compiler (`src/song/spoken.js`) turns patterns into starts (`placeSpoken`) and code (`spokenCode`). A pattern text `vocab:<group>` is resolved when the song compiles (`lineOf`, seeded by the song id). The schedule and captions (`spokenSchedule`, `captionSchedule` in `src/song/build.js`, `nextRows` in `src/radio/next-changes.js`) read what plays through `lineEntries`.

Pointers checked on `develop` at 57a5335:

| What | Where |
| --- | --- |
| Chop rhythms (dense, 6 or 7 slices of 8 steps) | `src/endless/director.js:323` `CHOP_RHYTHMS` |
| First line: style lines first | `src/endless/director.js:350`, `src/endless/voice-track.js:124` |
| Refrain `every` drawn from `[2, 4]`, chop `slices` and `rhythm` | `src/endless/director.js:356`, `:396`, `src/endless/voice-track.js:49` `extrasOf` |
| New line: style lines first, then the vocabulary pool | `src/endless/director.js:383` |
| Mixed: A on every even phrase | `src/endless/director.js:392` |
| One refrain: a clip over the whole song | `src/endless/director.js:409`, `src/endless/voice-track.js:133` |
| One chop: a clip over a whole section | `src/endless/director.js:423` |
| Several phrases: a clip per 8-bar part | `src/endless/director.js:464`, `src/endless/voice-track.js:136`, `:265` |
| `lineOf` draws vocabulary entries with no regard to the track's other lines | `src/song/spoken.js:45-59` (draw at `:56-57`) |
| Refrain starts every `every` bars (default 4) in the allowed sections | `src/song/spoken.js:185-191` |
| Chop starts on every bar of its clip | `src/song/spoken.js:195` |
| Head of a line of several entries: `s(bank).n("a b c ~")` | `src/song/spoken.js:251` |
| Captions take the first entry only | `src/song/spoken.js:93-101` `lineEntries` |
| My phrases: least used first, counts from the snapshot | `src/voices/mine.js:20-27`, `:48-64`; the snapshot taken once per session: `src/radio/radio.js:86`, used in `src/endless/director.js:751` |
| Code of the moment keeps lines without a lane constant | `src/song/compile-compact.js:205` |
| Narrator code hidden in the tail | `src/live/live-code.js:168-171`, `src/song/writer.js:330-344` `splitVoice` |
| Code-of-the-moment steps | `src/live/live-code.js:29-50` `momentOf` |
| Voice effects folding needs `s("say_…")` as the first call | `src/song/writer.js:183` `voiceCall` |
| Forced pastes of the typing | `src/live/typing-load.js:16-30` `pasteRule` |
| Comment options | `src/song/comments.js:6`, `src/radio/song-controls.js:23`, `src/live/profiles.js:64`, `src/main.js:2054`, `:2471` |
| Director version | `src/endless/director.js:46` (13) |

## Goals / Non-Goals

**Goals:**

- Fewer repeats inside a song (chop, refrain, mixed A) and across the songs of a radio session.
- Every word of a written line heard; captions true to what plays.
- Voice-track lines in the code of the moment of grown songs only around when they speak, with the same sound.
- An option to hide the voice-track code, as the narrator's.
- No new option in the voice controls; older songs keep their sound where the format allows it.

**Non-Goals:**

- Larger vocabularies or new samples (later, with the owner's phrases and generated ones).
- Memory between radio sessions or between Compose songs.
- Counting the narrator's phrases of mine said by a song into the session's counts (they are drawn when the song plays, see D6).
- Changing the narrator.

## Decisions

### D1. Chop: generation rules plus a format field

A generated chop gets a clip of at most 4 bars (`spokenPlace`, `spokenParts`, `rewriteSpoken`, `placeGrownSpoken`: `bars: Math.min(4, …)` for a chop), `every: 2`, and a rhythm from a new sparser `CHOP_RHYTHMS`:

```
'0 ~ ~ 1 ~ ~ 2 ~', '0 ~ 1 ~ ~ ~ 2 ~', '~ ~ 0 ~ 1 ~ ~ 2', '0 ~ ~ ~ 1 ~ 2 ~'
```

(3 slices each, no two on neighbouring steps; today's rhythms have 6 or 7.) The clip starts at the start of the part it gets (or of the section, with one phrase), so a chop sits at the head of a quiet part.

`every` becomes valid on chops (`placeSpoken`: `for (let b = clip.start; b < end; b += every)`, default 1). The validator (`spoken.js:356`) stops warning "every is for refrains" for chops.

Alternative: a compile rule "every chop plays every other bar". Rejected: it would change hand-written songs (`prova-voce-taglio`'s chop on bars 33-48) and leave Compose users no way back. With the field, a hand-written chop keeps its sound and a user can write `every`.

### D2. Refrain: `every` 4 or 8, and `times`

The draws `[2, 4]` become `[4, 8]` (director `:356`, `:396`, `extrasOf`). A new optional field `times` (1 to 64, refrains only) caps the starts of one clip: `placeSpoken` collects the candidate starts as today, then keeps `times` of them at indices `round(j * (m - 1) / (times - 1))`, so the first and the last stay. A one-phrase refrain (whole-song clip) gets `times: 3`.

"At most 3 returns" is read as "heard at most 3 times in the song" (the owner's figure counted every time the line is heard: "8 to 24 times a song"). Owner to confirm; 1 + 3 is the other reading (`times: 4`).

### D3. Mixed: A at most 3 times, spread

`morePhrases` (`:392`): the count of A phrases is `kA = n <= 2 ? 1 : n <= 5 ? 2 : 3`, at slots `round(i * n / kA)` (n = 12: 0, 4, 8; n = 3: 0, 2; n = 5: 0, 3; n = 6: 0, 2, 4). Since `n / kA >= 2`, two A phrases are never adjacent. The other slots draw new lines; when lines run out the song speaks fewer phrases, as today. "Repeated" stays A every time (an explicit choice of the listener).

### D4. Vocabulary lines written out as a list of entries

A pattern text may be an array of vocabulary entries, `[{ "en": "after hours", "it": "…" }, …]`, 2 to 4 entries; `lineOf` returns `{ parts: text }` for it. The director and `rewriteSpoken` write every vocabulary line out at generation: a chop one entry (an object, as today for a chop of A), a refrain or an opening 2 or 3, a passage 3 or 4 (the counts `lineOf` uses, `spoken.js:56`). Entries are drawn from the group without the entries already used in the song (and, in the radio, in the 5 songs before, D5).

Why: the memory between songs needs to know what a song says at generation, and `lineOf` resolves `vocab:` at compile time with the style recipes of `spokenContext`, which the director in Node does not see the same way. Written out, the song is self-describing: Replay, a saved song and another language say the same entries.

`lineOf` still draws for a hand-written `vocab:<group>`, now leaving out the entries other patterns of the track write out (fallback: the whole group when fewer than needed remain). This fixes requirement 6 for both paths.

`vocabGroupOf` (`mine.js:41`) reads an array as the group of its entries, so a phrase of mine can still take the place of a vocabulary line. The phrase list in Compose shows the entries joined with " · ", as the code comment does.

Alternative: keep `vocab:` for A and store an exclusion list on the track for `lineOf`. Rejected: a field that only steers a random draw is opaque in the format and still depends on `spokenContext`.

### D5. Memory between songs in a radio session

`createSession` keeps, for each entry, the lines its voice track says: `entry.said = [...]` with keys `en:<English text>` for a style line or a vocabulary entry and `mine:<id>` for a phrase of mine (from the final song's spoken patterns). `makeSong` gets `recent`: a map key → index of the last song that said it, over the 5 entries before.

Every draw of a line (`spokenFor`'s A, `morePhrases`'s `newLine`, the vocabulary entries of D4, `mineSpokenTrack`) takes candidates not in `recent`; when none is left, the candidate with the lowest last index (never said = −1, ties by the stream). The style weight: when fresh style lines exist for the way, `rng.chance(0.5)` picks a style line, else the vocabulary; with no fresh style line, the vocabulary. The same chance applies in Compose (no memory there, only the song's own lines are left out).

The session's 5 songs are by index, so a steering command that rewrites the voice track of song k (`rewriteSpoken` with `from`) uses the same `recent` of songs k−5 to k−1, and Replay rebuilds it identically. The lead song from Compose (`lead`) is not counted.

5 songs and one half are constants (`RECENT_SONGS`, `STYLE_LINE_SHARE`) in `director.js`.

### D6. My phrases: session counts

`makeSong` passes `mineSpokenTrack` a snapshot whose `uses` are `snapshot.uses + times written into the songs before in this session` (from `entry.mineUsed` of every earlier entry, not only 5), and leaves out the ids in `recent` while others are free. The `song.mine` list written for the narrator (`director.js:770-773`) gets the same overlaid counts. The narrator's own picks happen when the song plays and are not counted into the session's overlay; the real collection still counts them when heard (`service.countPlayed`).

### D7. Every entry plays: `n(...).s(...)`

`spokenCode` (`spoken.js:251`) writes a line of several entries as `n("0 6 1 ~").s("say_en_x")`: the structure comes from `n`, so each entry plays on its quarter of the bar. A whole line keeps `s("say_en_x").n(3)`. `lineEntries` returns every entry with a sample, each with `late + k / slots` (slots = `max(4, entries)`), so the schedule, captions, videos and Coming next show each entry on its quarter. The estimate `beats` (`spoken.js:162`) already treats entries as one beat apart, so `spokenBars` (the narrator yielding) does not change.

`voiceCall` (`writer.js:183`) looks for `s("say_…")` in the first call only; it must also accept `n(…)` followed by `.s("say_…")`, or the effects of those lines would stop folding.

Sound change: the code snapshots `example-voices` (line 70), `prova-voce-notte` (line 68) and `prova-voce-taglio` (line 70) change from one entry a bar to all entries; their level snapshots may move. Updated with `npm run snapshot:code` and `node tools/snapshot-levels.cjs write <id>` in the same commit, with the reason.

### D8. Just-in-time voice-track lines

Option C of the analysis. In `liveCode.codeWith` (`live-code.js:151-185`), when the build is grown (`build.crescendo`) and the view is the code of the moment, the spoken block of the compiled code is split by line (each `$:` with its quoting comment, as `spokenCode` writes them): a line is due at bar `b` when `showFrom <= b < leaveAt`; lines not due join `w.voice`, the hidden tail the narrator's lines use with "Narrator voice code" off; the track header shows when at least one of its lines does. The lines keep their `.mask("…")`, so the sound and the folding of voice effects are unchanged by construction.

- `showFrom`: the last code step (build step or code-of-the-moment step) in `[first − 4, first − 1]`; when none, a display step `{ at: first − 1 }` is added in `momentOf` (`live-code.js:42-48`), which only changes the code shown. A first start on bar 0 or 1 shows from bar 0.
- `leaveAt`: the first code step after the last start. The line moves back to the hidden tail; it keeps playing out (an evaluation does not cut a sample already started).
- Classic (with or without Sections) keeps every line in the code: owner's direction, and Classic shows the song as written.

A line's span comes from `placeSpoken` of the grown song (the same starts the compiler masks), computed once per song and language.

### D9. Voice lines never take typing time (owner input)

A voice-track line coming in at its step is pasted whole by default. It is typed at a person's pace only when the typing plan has a free gap before the step long enough for the whole line, computed after every other edit is planned: the other edits keep their times and speeds. It is not a forced paste (`pasteRule` does not count it) and the typing load (`typing-load.js`) that drives the shape search ignores voice-track lines, so the growth shapes, the Live coder fixtures and `SHAPES_VERSION` do not move.

### D10. Determinism, versions and replay

The director's draws change (sparser chops, refrain spacing, written-out lines, memory, weights): the endless seed fixtures move. `DIRECTOR_VERSION` goes from 13 to 14 with a comment line. Replay of a radio session saved before: the session is marked outdated ("may sound different", `sessionOutdated`); Replay regenerates it with the new director, so the music is the same and the voice track says other lines, placed and spaced by the new rules. A frozen session plays its stored songs unchanged, voice lines included, but those songs compile with D7, so their lines of several entries now say every entry. A song saved before keeps its clips, `every` and texts: chops and refrains sound as before; only D7 changes it.

`SHAPES_VERSION` and `CRESCENDO_VERSION` do not change (D9: display only).

### D11. "V:N code" and "V:T code" in Options (owner input)

The two hide-the-code toggles sit together in the Options group (Compose: the chips row with `#live-title`, `#live-hl`, `#live-wrap`, `#live-human`, `#live-mistakes`, `index.html:110-125`; radio Custom section: the `liveOptions` row, `src/radio/song-controls.js:113`).

- "V:N code": the existing control key `voice` (label "Narrator voice code" today), moved from the Comments chips (`#live-c-voice`, `COMMENT_KEYS` at `song-controls.js:23`) to Options. The key and its stored values do not change, so there is nothing to convert in songs, profiles or saved settings; only the place and the label change. `voice` was never part of the comment presets (`COMMENT_OPTIONS`, `src/song/comments.js:6`), so the presets do not change. Its profile defaults stay as today: on in Classic and Crescendo, off in Live coder (`src/live/profiles.js:53-57`).
- "V:T code": a new control key `spoken`, on in every profile, in `DISPLAY_CONTROLS` (`profiles.js:64`). Off: `splitSpoken` (like `splitVoice`, matching the `· spoken` headers) moves every voice-track line to the hidden tail, in every profile. Off wins over D8.
- Both are independent of Technical functions → "Voice effects" (`fnVoice`). The split happens on the code as written, before `writeCode` folds the shown part, so the hidden lines would keep their effects written out; to keep them folded, the hidden voice code goes through `voiceCall` with the same song functions context (`ctx.voices`), so a hidden line calls the same function name as when shown. The function's definition is in the hidden prelude in both cases.
- Strings: "V:N code" / "Codice V:N" and "V:T code" / "Codice V:T", matching the V:N and V:T tags of Coming next, with tooltips that name them in full ("Voice: narrator: show its code in the panel; off: it still speaks, the code goes to the hidden code", and the same for "Voice: track"; Italian alike), in `src/i18n.js`; the Guide card of the code options in `src/guide.js`.

### D12. Voice effects folding check

A `say_` line without `.mask` is the only form that stays unfolded and no generator path writes one. `check:functions` gets a case: every voice line of the built-in songs and of 20 radio songs (fixed seeds, every profile) shows a folded call with "Voice effects" on, including the `n(...).s(...)` lines of D7.

## Checks

- `check:spoken`: chop clip length, `every`, rhythms; refrain `every` and `times`; mixed A slots; array texts (format, validator, `lineOf` de-duplication); every entry heard (Strudel in Node: each quarter plays its entry, captions and Coming next match); the synthwave case of d2a7911 updated to all entries.
- `check:endless`: seed fixtures rewritten (`--write-fixtures`), memory over 20 songs, Replay equality.
- `check:phrases`: session counts, the 5-song exclusion, Mai and an empty collection unchanged.
- `check:radio-profiles`: voice-track lines of grown songs just in time (seed `f7zvee`), sound equal to all lines shown, typed lines in the console still on their bar.
- `check:code`: the three voice snapshots, nothing else.
- `tools/check-compact-code.cjs`, `check:mixer`: same events with D7 and D8 (hidden tail lines keep their gain, orbit and analyze).
- `check:functions`: D12.
- `check-captions.cjs`: `prova-voce-notte`'s voice track shows each entry.
- `check:live-code` and `check:crescendo` (quick): no shape or growth fixture moves.
- A new measurement script (`tools/voice-repeats.mjs`, no browser) prints per song: voice bars, starts per line, most starts of one line, share of the song with voice, and per session the lines repeated within 5 songs.

## Risks / Trade-offs

- [Fewer voice moments overall] → the measurement compares voice coverage before and after; if songs feel empty the spacing constants are the first knob.
- [Array texts are a format addition] → old songs still load (`vocab:` keeps working); `docs/SONG-FORMAT.md` documents it; the validator checks 2 to 4 entries of one group.
- [A display step in a dense growth] → it changes only the shown code and never types (D9).
- [The analysis's 120-song run did not record its seeds] → the measurement fixes a seed list (with `f7zvee`) and runs it on `develop` before any code change, so before and after use the same seeds.

## Open Questions for the owner

1. Refrain with one phrase: heard at most 3 times in total (chosen), or the first time plus 3 returns?
2. Style line share one half (chosen), or lower so the vocabulary and your phrases come up more?
3. A just-in-time line shows from a step up to 4 bars before it speaks (chosen); shorter (2 bars) means more display steps.
4. "V:N code" keeps today's profile defaults (off in Live coder, D11). Should Live coder show the narrator's code too, now that it sits in Options?
5. The toggles' texts never say a bare "Narrator". Other app texts still do (the narrator track is named "Narrator" since director version 9): rename them in a separate change?
