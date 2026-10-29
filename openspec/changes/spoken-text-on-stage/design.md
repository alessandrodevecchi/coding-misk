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

The step line is still the clearest account of what the coder does. It shows as a small tag (`ritmo più fitto`) below the spoken line, in the same box (owner, rounds 2 and 5), only when it differs from the caption heard on the same bar, so the explaining style shows a single line as today. A step line that is still unspoken after D10 (no sample could be made, or the narrator yields to the voice track) shows only as this small tag, never as a spoken caption. The setting can hide the tag or bring back the old behaviour (step line as the caption).

### D3. Three designs considered

**A. One lane, what is heard, labelled by speaker** (`proposta-A1`, `proposta-A2`). The caption lane at the bottom of the stage, as today, with a speaker chip: NARRATORE (cyan, mono) or VOCE (magenta, display face, in quotes); the chips became the per-voice mark of D12 in round 2 and round 5. One line at a time; when two speakers overlap (a long voice-track passage across a narrator line, rare because the narrator yields), the second stacks above. Smallest change, one place to read.

**B. Two lanes** (`proposta-B`). The narrator as a lower third on the left, the voice track as subtitles at the bottom centre (karaoke later), the step line as the tag. Clearer roles, but two places to look, and a lower third covers the left instruments of Palco and the panes of Monitor.

**C. Placement per look** (`proposta-C1`, `proposta-C2`, `proposta-E`). The looks that are text interfaces place the words in their own idiom: "Claude" in its transcript, the Studio monitor in its screen; the others use lane A.

**Decided (owner, round 5): A for every look, C for "Claude" and Studio.** A gives one rule and one renderer for the stage and the videos; C lets the two text looks speak in their own idiom, which is what the owner asked for "Claude".

### D4. The "Claude" look as a conversation (C1 by default, C2 as an option)

The owner chose both C1 and C2 (round 5). They coexist: C1 is always on, C2 is an option of the look that adds the history.

**C1, the reply block (default).**

- The prompt box types the step line (or the section-change line) as the user's input, as today, over the step's first bar.
- When the line is spoken, the prompt clears (`> ▌`) and a block appears above it: the user's line on a highlighted background (`> ritmo più fitto`), then `● la città respira` with the ● in orange, typed at speech speed (the characters spread over the sample's length), then a dim `⎿ narratore · battuta 8`.
- A voice-track line is a tool-output line: the voice track's icon (D11) and `«le torri non dormono mai»` in magenta.
- The block keeps the last two exchanges and takes rows from the lower panes (the large pane keeps its size).
- The page caption `#say` (the pink caption above the scene) is hidden on this look (today it draws the same line a second time).

**C2, the transcript pane (option of the look).**

- A pane on the right of the look, about 28 % of its width, holds the session's history: every exchange older than the two in the reply block, newest at the bottom, each with its bar number and speaker mark (D12). Nothing shows twice: an exchange moves from the block to the pane when a third one arrives.
- The pane takes its width from the lower panes; the large pane and the prompt keep their size.
- **Option**, `Trascrizione` in the look's own settings (the look menu, with the render), off by default, stored with the look's settings and in the backup.
- **Hidden in 9:16** (fragments, phone portrait, 9:16 videos), where a third column reads too small: the look draws C1 alone there, whatever the option says. 16:9 videos and the live output follow the option.

**Prompt lines invented by the look.** When no step line exists, the look writes its own prompt from the section change (`bring in…`, `drop…`, `keep the groove`), as today. These lines are the user's side of the conversation: they are never spoken, never captioned on the stage, and get no reply block of their own; a spoken line that follows them is the reply.

Rejected: **C3**, reply on the prompt's own line (`> ritmo più fitto  ● la città respira`): cheapest, cramped with long lines.

### D5. Timing and language

- A caption appears on the bar the line starts, with a 0.2 s fade, and types its characters over the sample's length (the Studio and "Claude" looks) or shows whole (the lane).
- The text is the language the line is spoken in, which is the app language, as today.
- Captions follow the transport: a seek or a resume shows the line of that moment if it is still within `until`.

### D6. Videos and live output

One canvas renderer, `drawCaptions(g, area, captions, palette, scale)`, used by the session video, the live output (both through the stage caption of the moment), the fast video and fragments (from `captionSchedule` of the exported song, replacing `sayList`), and the timeline layout (the heard line beside the playhead, the step line no longer). 9:16 fragments place the lane in the lower third above the safe area, two lines at most, the speaker mark above the text (`proposta-D`).

### D7. Settings

A "Testi sul palco" card in Settings → Appearance (`proposta-F`), stored in `coding-misk-captions`, in the backup. One switch on top, with the choices of what to show under it (owner, round 5):

- **Testi sul palco**: on (default) or off. Off hides every text below on the stage, in the looks and in every video; the choices under it stay as set and come back when it is on again. Under the switch, folded while it is off:
  - **What to show**, each on by default: Narrator; Voice: track; Lines typed in the console; Step lines; Replies in the "Claude" look (off: the "Claude" look keeps its prompt and draws no reply block or transcript pane, and the lane of D3 shows the spoken line instead).
  - **Step line**: small tag below the spoken line (default), instead of the spoken line (the old behaviour). Turning Step lines off above hides it.
  - **How each voice is marked** (D12), one row per speaker kind.
  - **Where**: as the look says (default), bottom, top.
  - **In videos too**: on (default). On, the session video, the fast video, fragments, the timeline layout and the live output show the same choices as the stage; off, they show no text at all.
- The fast video and fragment export panels show the switch's state with a link to the card, and can turn texts off for that one export.

The narrator switch keeps its meaning: off, the narrator is silent, so its lines do not show; the voice track still shows because it is still heard.

### D8. Hardware theme and phone

HW: the lane is an amber display with one light per speaker that glows while it speaks (`proposta-E`). Phone (400 px): font 17 px, speaker mark above, two lines, no ellipsis cut mid-word.

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
3. a sample made on the fly by the dev voice helper (about 1 s a line), then spoken (owner, round 5): the line waits for its sample instead of being dropped, plays as soon as the sample is there (on the next beat of its bar, else on the next bar, while no line of a higher rank sounds), and is captioned when it plays;
4. only if all fail (no helper, or the helper fails): no sound, and the text shows only as the small step tag (D2), never as a spoken caption.

Step 2 already happens for voice-track lines (`voiceSamples` tries the speaker's bank then `sayBank(lang)`); narrator lines today use `bankFor`, which falls back only when the speaker has no bank at all, not per line. D10 makes it per line for both. Known issue `#63`: speaker variants that were not downloaded fall back silently at generation, so variants sound the same; the chain makes the fallback visible (a dev-console note and a count in `check:samples`) without fixing `#63` itself.

### D11. Speakers registry, groundwork for a singing voice (owner decision, round 3)

A singing voice is in the backlog, not built. To avoid reworking captions and precedence later, the speakers become a registry, `SPEAKER_KINDS` in `src/song/speakers.js`:

```js
{ narrator: { rank: 1, icon: 'mic', style: 'italic', colour: 'cyan', mark: 'icon+style', perBar: 1 },
  voice:    { rank: 2, icon: 'wave', style: 'quoted', colour: 'magenta', mark: 'icon+style' },
  singing:  { rank: 3, icon: 'note', style: 'sung', colour: 'amber', mark: 'icon+style', future: true,
              exclusive: false, multiCaption: false } }
```

- **Rank** decides who yields. Precedence, confirmed in round 5: the voice track beats the narrator on its bars (the narrator yields); the narrator says at most one line per bar; the step's `say` line comes after both (it is the narrator's explaining line when nothing outranks it, else only the small tag of D2). These are today's rules, read from the registry instead of written in the code.
- **Groundwork for a future singing voice, no singing now.** The `singing` entry is marked `future` and nothing plays it. Two flags are built and tested with a fake kind, so a singing track later needs no rework:
  - **`exclusive`**, "when singing is on, the other voices go quiet": off by default. When on for a kind, lower ranks go silent while it sounds. When off, voices overlap and the singing is mixed louder.
  - **`multiCaption`**, "several texts at once": one caption row per active speaker, ordered by rank, at most three; off means the highest rank's line only.
- **Icon, style and default mark** come from the registry (D12), so a new kind gets its caption look by adding one entry.
- `spokenSchedule` keeps its output (`voice: 'N' | 'T'`), and the registry maps `N` and `T` to kinds. A future singing track adds `S` and an entry, not a new caption path.

**Personal vocabulary.** The user's own phrases, which the director may say in place of built-in lines, are the `my-phrases` change. It builds on this change (`spokenNeeds`, D9, D10, `check:samples`, this registry) and adds nothing to the captions: a phrase of mine is captioned like any other line of its speaker.

### D12. How each voice is marked (owner, round 5)

The owner approved the icon per voice with a style (narrator in italics, voice track in quotes, the voice's name only on hover), and asked for it to be a setting per voice. Each speaker kind of the registry (D11) gets one choice in the card:

| Choice | On the stage |
| --- | --- |
| Niente | the text alone, no icon, upright, no quotes |
| Solo formattazione | the kind's style only (narrator italic, voice track in quotes) |
| Etichetta | a short text label before the line (`Narratore`, `Voce`), in the app language, upright text |
| Icona | the kind's drawn icon before the line, upright text |
| Icona e formattazione (default) | the icon and the style |

- The kind's colour stays with every choice except Niente, where the text takes the lane's ink.
- The voice's name (Reed, Flo) shows on hover with every choice, and in the Guide.
- The "Claude" look applies the same choice to its reply block and pane; its ● reply marker stays whatever the choice, because it marks the reply, not the speaker.
- 1-bit, LED and the amber hardware display lose colour: with Niente the speakers can no longer be told apart there, and the card says so under the choice.
- The defaults come from the registry (`mark: 'icon+style'`), so a future kind gets its default by its entry.

## Risks / Trade-offs

- **Preparation time.** A poetic song with Narrated growth has about 40 lines; with no samples, about 40 s of helper work. The next radio song is prepared minutes ahead, so it is in time; in Compose, Play does not wait (D9).
- **Disk.** Generated samples go to the git-ignored `public/samples/say_*`, as the helper does today.

- **Fewer captions with the poetic style.** Lines never heard disappear; the tag keeps the step visible. If the stage feels empty, the setting brings back the old caption.
- **Samples missing on a machine.** D9 and D10 make them first, then fall back; only a line that fails every step plays silent, shown as the tag. Without `say_lengths.json` a caption holds 2 bars.
- **Fast video cost.** The schedule is computed once per export; drawing is the same cost as `drawSay` today.
- **Two speakers overlapping** are rare (the narrator yields to the voice track by bar); a passage longer than a bar can still meet the next narrator line, so the lane stacks two rows.

## Owner answers, round 5 (2026-10-30)

Every recommended answer was approved. Notes where the owner added something:

- **tp1, the step line:** a small tag below the spoken line, not repeated when equal (D2).
- **tp2, step lines that are never spoken** (from the chat): a missing sample is made on the fly by the dev voice helper (about 1 s) and then spoken (D10, step 3); a line still unspoken shows only as the small tag (D2). Precedence: the voice track beats the narrator, the narrator says at most one line per bar, the step's `say` line comes after them (D11). Groundwork for a future singing voice: the flags "when singing is on, the other voices go quiet" (`exclusive`) and "several texts at once" (`multiCaption`), no singing now (D11). The "Claude" look's prompt lines invented from the section change are never spoken (D4). The personal vocabulary is the `my-phrases` change (D11).
- **tp3, other looks:** A, one lane; a second row only when two voices overlap (D3).
- **tp4, the "Claude" look:** both C1 and C2. C1 by default; C2 is an option of the look, hidden in 9:16 (D4).
- **tp5, karaoke:** not now; the line is typed while it is heard (D5).
- **tp6, who is speaking:** icon per voice plus style, name on hover, as a setting per voice: Niente, Solo formattazione, Etichetta, Icona, Icona e formattazione (default) (D12).
- **tp7, while the user types by hand:** the voice track's lines still show.
- **tp8, one switch for stage and videos:** one switch with the choices under it, videos included (D7).
- **tp9, default:** on.
- **tp10, the speaker registry** and **tp11, samples prepared ahead and the fallback chain:** confirmed as written (D9 to D11).

No open questions remain.
