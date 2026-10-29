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

### D9. Samples prepared ahead (owner decision, round 3)

Today a line without a sample is left out of the code (`narratorLines` returns nothing when `sampleIndex` fails; `spokenSchedule` keeps a voice-track line only when `lineSounds`). It is never heard and, with this change, never captioned. The owner wants no line dropped for a missing file.

- **What is collected.** `spokenNeeds(song, C, lang)` in `src/song/build.js`: the lines `spokenSchedule` would list if every sample existed. It covers narrator lines (explaining lines, poetic entry images, movement images), voice-track lines of every way, and lines typed in the radio console. Each line comes with its bank (`say_<lang>[_<speaker>]`) and its text. It is `spokenSchedule` without the sample filter, so the two lists cannot drift: one function with a `needSamples` switch.
- **When.** When a song is prepared: Compose open, Generate, a regrowth (profile, narrator style, Narrated growth, voice-track edits), and in the radio when the next song is prepared (the same moment its Coming next list is built), before it goes on air.
- **How.** The missing lines go to the dev-server voice helper (`POST /voice/say`, about 1 s a line, one at a time, the next song's first lines first). The manifest is read again after each batch and the song is recompiled, so the code and the captions include the new lines. A small "voci in preparazione 3/7" note shows in the Voices group and the radio's Coming next while it runs. A song plays before its samples are ready if the user presses Play: the lines that are not ready yet follow D10.
- **Without the helper** (a build without the dev server, or a non-macOS machine): nothing is generated, D10 applies, and the Voices group says which lines have no sample and how to make them (`npm run voices`).
- **Check.** `npm run check:samples` (`tools/check-samples.mjs`, no browser) lists every line without a sample over the built-in songs, the example songs, the style recipes' lines and the vocabularies, in both languages and for every speaker the songs and styles name. It reports per bank and exits non-zero in `--strict` mode for CI-like runs; `--make` calls `tools/voice-sample.mjs` for the missing ones (macOS only).

### D10. Fallback chain at play time (owner decision, round 3)

For each line, in order:

1. the speaker's own sample (`say_<lang>_<speaker>/<slug>.wav`);
2. the default voice's sample of the same line (`say_<lang>/<slug>.wav`), with the speaker's sound settings still applied;
3. a sample made on the fly by the voice helper, if there is time before the line's bar (the line plays from its next repeat or is skipped this time);
4. only if all fail: no sound, and the text shows as the step tag (D2), never as a spoken caption.

Step 2 already happens for voice-track lines (`voiceSamples` tries the speaker's bank then `sayBank(lang)`); narrator lines today use `bankFor`, which falls back only when the speaker has no bank at all, not per line. D10 makes it per line for both. Known issue `#63`: speaker variants that were not downloaded fall back silently at generation, so variants sound the same; the chain makes the fallback visible (a dev-console note and a count in `check:samples`) without fixing `#63` itself.

### D11. Speakers registry, groundwork for a singing voice (owner decision, round 3)

A singing voice is in the backlog, not built. To avoid reworking captions and precedence later, the speakers become a registry, `SPEAKER_KINDS` in `src/song/speakers.js`:

```js
{ narrator: { rank: 1, icon: 'mic', style: 'italic', colour: 'cyan', perBar: 1 },
  voice:    { rank: 2, icon: 'wave', style: 'quoted', colour: 'magenta' },
  singing:  { rank: 3, icon: 'note', style: 'sung', colour: 'amber', future: true } }
```

- **Rank** decides who yields. Today's rules stay as they are: the voice track wins over the narrator on its bars (the narrator yields), and the narrator says one line per bar.
- **Flag `exclusive`** (singing takes precedence): off by default. When on for a kind, lower ranks go silent while it sounds. When off, the default, voices overlap and the singing is mixed louder.
- **Flag `multiCaption`** (several captions at once): one caption row per active speaker, ordered by rank, at most three; off means the highest rank's line only.
- **Icon and style** come from the registry (D3 and question 6), so a new kind gets its caption look by adding one entry.
- `spokenSchedule` keeps its output (`voice: 'N' | 'T'`), and the registry maps `N` and `T` to kinds. A future singing track adds `S` and an entry, not a new caption path.

## Risks / Trade-offs

- **Preparation time.** A poetic song with Narrated growth has about 40 lines; with no samples, about 40 s of helper work. The next radio song is prepared minutes ahead, so it is in time; in Compose, Play does not wait (D9).
- **Disk.** Generated samples go to the git-ignored `public/samples/say_*`, as the helper does today.

- **Fewer captions with the poetic style.** Lines never heard disappear; the tag keeps the step visible. If the stage feels empty, the setting brings back the old caption.
- **Samples missing on a machine.** D9 and D10 make them first, then fall back; only a line that fails every step plays silent, shown as the tag. Without `say_lengths.json` a caption holds 2 bars.
- **Fast video cost.** The schedule is computed once per export; drawing is the same cost as `drawSay` today.
- **Two speakers overlapping** are rare (the narrator yields to the voice track by bar); a passage longer than a bar can still meet the next narrator line, so the lane stacks two rows.

## Open questions for the owner (each with a recommendation)

1. **The step line:** hidden, small tag only when it differs, or kept as the caption? Recommended: small tag only when it differs.
   - **1b. Where the tag goes (owner, round 2):** beside the spoken line (after a thin divider) or below it, in the same box (`giro2-tp1-accanto-16x9`, `giro2-tp1-sotto-16x9`, `giro2-tp1-accanto-9x16`, `giro2-tp1-sotto-9x16`). Recommended: below. It keeps the spoken line centred and alone on its row, it does not make the box wider, and it is the only layout that holds in 9:16, where "beside" wraps below anyway. This replaces the top-right tag of D2.
2. **A line with no sample** (silent): show it? Decided (round 3): samples are made ahead (D9) and fall back (D10); a line that fails every step shows only as the tag.
3. **Design for the other looks:** A (one lane) or B (two lanes)? Recommended: A.
4. **The "Claude" look:** C1 reply block, C2 transcript pane, or C3 same line? Recommended: C1, keeping the last two exchanges.
5. **Karaoke for the voice track** (words lit as they are said)? Recommended: not now; the typed reveal over the sample length gives most of it without word timing.
6. **How the speaker is marked (owner, round 2: text labels on the stage do not convince).** Four ways on the same scene and the same two lines (`giro2-voci-a-icone`, `giro2-voci-b-stile`, `giro2-voci-c-colore`, `giro2-voci-d-etichette`):
   - a) a drawn line icon per voice: a microphone for the narrator, a wave for the voice track, a wave in a circle or a square for a second or third voice, with each voice in its own colour;
   - b) style only: the narrator in italics, the voice track upright and in quotes;
   - c) colour only: the narrator in cyan, the voice track in magenta;
   - d) the text labels of round 1, for comparison.

   Recommended: a with b (`giro2-voci-consigliata`). The icon tells the speaker apart without words and works for N voices. Italics and quotes still work where colour is lost: the 1-bit and LED renders, the amber hardware theme and colour-blind viewers. Colour alone is not enough, and labels cost width, take a language, and read as an interface rather than a voice. The speaker's voice name (Reed, Flo) shows only in the tooltip and the Guide. The same icons go in the "Claude" look, where ● remains the narrator's reply and the wave icon replaces ♪ for the voice track. This replaces the chips of D3 A.
7. **While the user types by hand:** show the voice-track lines that still play? Recommended: yes; the narrator is silent then, so nothing of it shows.
8. **Videos:** one setting with the stage, or a separate switch per video kind? Recommended: one setting; a fragment that needs no text can turn it off in the card for that export.
9. **Default:** on for everyone, or off until chosen? Recommended: on.
