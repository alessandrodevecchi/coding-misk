## Context

Today one text goes over the stage: the step line. Where it comes from and where it goes, read in the code and measured in the browser on 2026-10-29 (dev server, Chrome headless, Italian interface):

- **Stage caption.** `#say` in `index.html`, filled in the main loop of `src/main.js` from `sayAt(song.build, bar, lang)`: the latest step with `say` of the last 4 bars, prefixed by `> ` in CSS (`.say`, bottom 14% of the stage). Hidden with the narrator off (`quietSong`), while the user types by hand, while a resume waits, and when the stage shows the soul.
- **Looks.** `stageInfo` (Compose) and `radio.info` (radio) give `say` and `sayAt` from the same step lines. The Studio monitor types the line in quotes (`src/visuals.js`). The "Claude" look types it in its prompt over its first bar and keeps it for 8 bars (`termInfo`, `promptLine` in `src/visuals/glyph-looks.js`), else a line from the section change. The page caption `#say` is drawn over the "Claude" look as well, so the line shows twice.
- **Videos.** The session video and the live output copy `#say` (`getSay`, `drawSay` in `src/video/video.js`). The fast video and fragments build their own list from the step lines (`sayList` in `src/main.js`), 4 bars each. The timeline layout draws `> step line` beside its playhead for 4 bars (`src/live/timeline.js`).
- **What is heard** is another list: `spokenSchedule` in `src/song/build.js` (narrator lines `N` after the code's filters, voice-track lines `T`), used by the radio's Coming next and the Compose narrator marks.

### Every text source today

| Text | Spoken? | On the stage? | How long | Videos, live output | "Claude" look |
| --- | --- | --- | --- | --- | --- |
| Step line, explaining narrator | yes, when it has a sample, the narrator is on, no voice-track line sounds on its bar and the step does not bring in the voice track | yes, `> line` | 4 bars from the step | yes, 4 bars | typed as the user's prompt, up to 8 bars |
| Step line, poetic narrator | no (an image is said instead, or nothing) | yes, the same as above | 4 bars | yes | prompt, as above |
| Entry image (poetic, `poeticLine`) | yes, the bar before the entry | no | | no | no |
| Movement image (poetic with Narrated growth, `POETIC.move`) | yes, instead of the step line | no: the step line shows | | no | no |
| Step line without a sample | no | yes | 4 bars | yes | yes |
| Step line on a bar where the voice track speaks | no (the narrator yields) | yes | 4 bars | yes | yes |
| Voice-track line (Voce: traccia, all four ways) | yes | no | | no | no |
| Line typed in the radio console (Say now, At the right moment) | yes, by the voice track | no | | no | no |
| Radio director comment | as the step line of the song's narrator style | as the step line | 4 bars | yes | prompt |
| Interlude transition comment (`INTERLUDE_SAY`) | as a step line | yes | 4 bars | yes | prompt |
| Any line, narrator switched off | narrator: no; voice track: yes | nothing at all | | nothing | section-change line |
| Listener's console change (`// you: …`) | no | no (code panel only) | | code panel | no |

### Measured (full song, stage caption per bar against `spokenSchedule`)

| Case | Captions | Narrator lines heard | Heard and captioned the same | Heard under another caption | Heard, nothing shown | Voice-track lines heard (shown) | Captions never heard |
| --- | --- | --- | --- | --- | --- | --- | --- |
| luci-rosse, Live coder, explain | 19 | 19 | 19 | 0 | 0 | 0 | 0 |
| luci-rosse, Live coder, explain, Narrated growth | 33 | 33 | 33 | 0 | 0 | 0 | 0 |
| luci-rosse, Live coder, poetic | 19 | 6 | 0 | 1 | 5 | 0 | 19 |
| luci-rosse, Live coder, poetic, Narrated growth | 33 | 38 | 5 | 28 | 5 | 0 | 28 |
| luci-rosse, narrator off | 0 shown | 0 | | | | 0 | |
| prova-voce-notte, Live coder, explain | 18 | 16 | 16 | 0 | 0 | 4 (0) | 2 |
| prova-voce-notte, Live coder, poetic, Narrated growth | 21 | 24 | 5 | 16 | 3 | 4 (0) | 16 |
| prova-voce-taglio, Crescendo | 17 | 15 | 15 | 0 | 0 | 18 (0) | 2 |
| Radio, about 90 s of the first song | 3 | 3 | 3 | 0 | 0 | 0 | 0 |

Examples: luci-rosse poetic, bar 1 the narrator says "un battito sotto la città" under "riempio la batteria"; bar 8 "la città respira" under "ritmo più fitto"; bar 17 "qualcosa di profondo si sveglia" over an empty stage. prova-voce-notte, bar 8 the voice track says "le torri non dormono mai" and nothing shows; "qualcuno parla" shows on bars 1-4 and is never said (the step brings in the voice track); "apro il filtro" shows on bar 116 while the voice track speaks there instead.

Samples last 0.8 to 1.4 s; a 4-bar caption at 124 BPM stays about 7.7 s.

Pictures: `notes/prove-2026-10-29/testi-sul-palco/oggi-*.png` (git-ignored).

## Goals / Non-Goals

**Goals**

- Every line that is heard shows, when it is heard, with its speaker.
- A line that is not heard does not show as if it were.
- One source for the stage, the looks, every kind of video and the live output.
- The "Claude" look reads as a conversation: the coder's change as the prompt, the spoken line as Claude's reply.

**Non-Goals**

- No change to what is said, when, or how it sounds; the code and the growth stay the same.
- No word timing from the audio (no forced alignment); timing is per line.
- No new speakers or voices.

## Decisions

### D1. One caption schedule, from what is heard

`captionSchedule(song, C, lang, files, lengths)` in `src/song/build.js` returns `[{ at, until, who: 'narrator' | 'voice', text, step }]` from `spokenSchedule`: the narrator lines `N` and every start of the voice track's lines `T`. `until` is `at` plus the sample's length (`say_lengths.json`, already fetched by the app) plus 1.5 s, at least 2 s, at most 4 bars, cut by the next caption of the same speaker. The schedule is kept per compiled build, language and samples manifest, like `nMarks()`.

Lines typed in the radio console are voice-track clips of the song on air (steering `say-live`), so they come through `T` when the song is rebuilt; task 1.3 checks it and adds them by hand if a gap shows.

A chopped line (`chop`) shows its whole text once per clip, held for the clip, not once per slice. A refrain shows at each repeat.

Why: `spokenSchedule` already makes the code and Coming next agree; the captions then cannot disagree with the sound either.

### D2. The step line becomes a tag

The step line is still the clearest account of what the coder does. It shows as a small tag (`passo · ritmo più fitto`) at the top right of the stage, only when it differs from the caption heard on the same bar, so the explaining style shows a single line as today. A step line with no sample or skipped by the narrator shows only as a tag. The setting can hide the tag or bring back the old behaviour (step line as the caption).

### D3. Three designs considered

**A. One lane, what is heard, labelled by speaker** (`proposta-A1`, `proposta-A2`). The caption lane at the bottom of the stage, as today, with a speaker chip: NARRATORE (cyan, mono) or VOCE (magenta, display face, in quotes). One line at a time; when two speakers overlap (a long voice-track passage across a narrator line, rare because the narrator yields), the second stacks above. Smallest change, one place to read.

**B. Two lanes** (`proposta-B`). The narrator as a lower third on the left, the voice track as subtitles at the bottom centre (karaoke later), the step line as the tag. Clearer roles, but two places to look, and a lower third covers the left instruments of Palco and the panes of Monitor.

**C. Placement per look** (`proposta-C1`, `proposta-C2`, `proposta-E`). The looks that are text interfaces place the words in their own idiom: "Claude" in its transcript, the Studio monitor in its screen; the others use lane A.

**Recommendation: A for every look, C for "Claude" and Studio.** A gives one rule and one renderer for the stage and the videos; C lets the two text looks speak in their own idiom, which is what the owner asked for "Claude".

### D4. The "Claude" look as a conversation (C1, recommended)

- The prompt box types the step line (or the section-change line) as the user's input, as today, over the step's first bar.
- When the line is spoken, the prompt clears (`> ▌`) and a block appears above it: the user's line on a highlighted background (`> ritmo più fitto`), then `● la città respira` with the ● in orange, typed at speech speed (the characters spread over the sample's length), then a dim `⎿ narratore · battuta 8`.
- A voice-track line is a tool-output line: `♪ voce «le torri non dormono mai»` in magenta.
- The block keeps the last two exchanges and takes rows from the lower panes (the large pane keeps its size).
- The page caption `#say` is hidden on this look (today it draws the same line a second time).

Alternatives: **C2**, a transcript pane on the right with the history (`proposta-C2`): richer, but it narrows the panes and reads small in 9:16. **C3**, reply on the prompt's own line (`> ritmo più fitto  ● la città respira`): cheapest, cramped with long lines.

### D5. Timing and language

- A caption appears on the bar the line starts, with a 0.2 s fade, and types its characters over the sample's length (the Studio and "Claude" looks) or shows whole (the lane).
- The text is the language the line is spoken in, which is the app language, as today.
- Captions follow the transport: a seek or a resume shows the line of that moment if it is still within `until`.

### D6. Videos and live output

One canvas renderer, `drawCaptions(g, area, captions, palette, scale)`, used by the session video, the live output (both through the stage caption of the moment), the fast video and fragments (from `captionSchedule` of the exported song, replacing `sayList`), and the timeline layout (the heard line beside the playhead, the step line no longer). 9:16 fragments place the lane in the lower third above the safe area, two lines at most, the chip above the text (`proposta-D`).

### D7. Settings

A "Testi sul palco" card in Settings → Appearance (`proposta-F`), stored in `coding-misk-captions`, in the backup:

- Show spoken texts (on).
- Who: Narrator, Voice: track, Lines typed in the console (all on).
- Step line: hidden, small tag (default), instead of the spoken line (the old behaviour).
- Where: as the look says (default), bottom, top.
- In videos: on; the videos follow the stage.

The narrator switch keeps its meaning: off, the narrator is silent, so its lines do not show; the voice track still shows because it is still heard.

### D8. Hardware theme and phone

HW: the lane is an amber display with one light per speaker that glows while it speaks (`proposta-E`). Phone (400 px): font 17 px, chip above, two lines, no ellipsis cut mid-word.

## Risks / Trade-offs

- **Fewer captions with the poetic style.** Lines never heard disappear; the tag keeps the step visible. If the stage feels empty, the setting brings back the old caption.
- **Samples missing on a machine.** No sample, no sound, no caption: the same rule as the code. Without `say_lengths.json` a caption holds 2 bars.
- **Fast video cost.** The schedule is computed once per export; drawing is the same cost as `drawSay` today.
- **Two speakers overlapping** are rare (the narrator yields to the voice track by bar); a passage longer than a bar can still meet the next narrator line, so the lane stacks two rows.

## Open questions for the owner (each with a recommendation)

1. **The step line:** hidden, small tag only when it differs, or kept as the caption? Recommended: small tag only when it differs.
2. **A line with no sample** (silent): show it? Recommended: only as the tag, never as a spoken caption.
3. **Design for the other looks:** A (one lane) or B (two lanes)? Recommended: A.
4. **The "Claude" look:** C1 reply block, C2 transcript pane, or C3 same line? Recommended: C1, keeping the last two exchanges.
5. **Karaoke for the voice track** (words lit as they are said)? Recommended: not now; the typed reveal over the sample length gives most of it without word timing.
6. **Speaker names:** roles (Narratore, Voce) or the speaker's voice name (Reed, Flo)? Recommended: roles.
7. **While the user types by hand:** show the voice-track lines that still play? Recommended: yes; the narrator is silent then, so nothing of it shows.
8. **Videos:** one setting with the stage, or a separate switch per video kind? Recommended: one setting; a fragment that needs no text can turn it off in the card for that export.
9. **Default:** on for everyone, or off until chosen? Recommended: on.
