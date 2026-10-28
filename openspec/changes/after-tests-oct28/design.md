## Context

The owner tested the radio and Compose on 2026-10-28. This change fixes what the tests found. The owner's answers to the first proposal are folded in: the voice track may speak during the growth, the lock change is for drums only, poetic movement lines are a later change, and the pattern row of Compose (pp1, #84) and a growth duration label join this change. The measurements come from scratch scripts in Node (radio sessions built with `sessionItems`, windows with `windowSong` and `windowPart`, code with `liveCode` and `voiceCode`) and from a browser probe on a dev server. The probe recorded every evaluation of the radio's code and the peak of the `fx` analyser (narrator and voice track) per bar.

| Item | Finding |
| --- | --- |
| nr2, voice track | Five pure-trance Live coder songs: first voice-track line at 65% to 71% of the song (bars 100 to 152). Classic: bar 5. Samples present. In the browser both voices were heard (narrator `fx` 0.30 at bars 8 and 18, voice track 0.29 at bar 132). The silence was the narrator's few Live coder lines plus a voice track that waits until two thirds of the song. |
| vo15 | Say now at bar 10.8: clip at bar 11, no step from bar 7 to bar 15, no evaluation in between, no `fx` peak at bars 11 and 12. At the right moment: clip at bar 112, a director step at 112, heard (`fx` 0.31). |
| vo1 | Custom profile, poetic. Compose, luci-rosse Crescendo with Narrated growth: 5 images, 31 step lines, entries at 56 and 78 lost (section boundaries). Radio, Live coder with Narrated growth: 0 to 7 images, 18 to 28 step lines per song. Crescendo: 5 to 8 images, 32 to 37 step lines. The window loses the first image of every song but the first. A mid-set opening (all tracks added at bar 0, brought in by `unsolo`) has one image. |
| ar4 | "+" every two bars, Classic, three styles: 13 to 16 tracks at some bars, inside one song. |
| pp1 | Code read on `develop` 83f16bb, Luci Rosse, Bass track, section Scontro (plays B). Three rows: the song's row (`In "Scontro" suona`, or `Clip` in Free timeline, chips only after a clip is clicked), "Song patterns" (picks the pattern to edit and preview, the song does not change) and "Make patterns". Both chosen chips are pink. Pressing C in "Song patterns" leaves B in the song. Mockups in the owner's local notes. |

## Goals / Non-Goals

**Goals:** fix the ten items in the proposal, each with a check that fails today (the label change of D10 has its string checks).

**Non-Goals:**
- Poetic "movement" lines at steps without an entry, with Narrated growth on. The owner moved them to a separate later change (see Follow-ups).
- A preview that silences the track's own line while it plays. The track keeps playing its song pattern under the preview, as today.
- A narrator track always shown on the timeline (an idea in the owner's backlog).

## Decisions

### D1. Step labels for every build action

`stepText(s)` in `src/radio/radio.js` gets a label for each of `BUILD_ACTIONS` (`src/song/build.js:16`), from interface strings in both languages:

| Action | Label (en) | Label (it) |
| --- | --- | --- |
| add / remove | `+ kick` / `− kick` | same |
| set | `kick: cutoff 2000` | same |
| pattern `to` | `kick → B` | same |
| pattern `level` | `kick: variant 1`, level 0 `kick: as written` | `kick: variante 1`, `kick: come scritto` |
| rack / unrack | `kick + degrade` / `kick − degrade` | same |
| hide / reveal | `kick: hide cutoff` / `kick: show cutoff` | `kick: nascondi cutoff` / `kick: mostra cutoff` |
| clone | `pad-2 from pad` | `pad-2 da pad` |
| comment | `kick: comment cutoff` (keys commented out) | `kick: commenta cutoff` |
| notes | `bass: new notes` | `bass: note nuove` |
| variant | `hook: variant 2`, `null` `hook: variant off` | `hook: variante 2`, `hook: variante spenta` |
| mute / unmute | `kick: muted` / `kick: on` | `kick: muto` / `kick: acceso` |
| solo / unsolo | `kick: alone` / `kick: with the others` | `kick: da solo` / `kick: con gli altri` |
| mask | `kick: mask <1 1 0 1>`, `null` `kick: no mask` | `kick: maschera …`, `kick: senza maschera` |

Track ids are shown by their track names when the song has them. A step with no action and no spoken line is not listed (code-of-the-moment section steps `{ at }`). A step with only words shows the words.

### D2. One spoken schedule: V:N and V:T

A new pure function `spokenSchedule(song, C, lang, files)` in `src/song/build.js` returns what each voice says and where: `[{ at, voice: 'N' | 'T', text, step?, track? }]`.
- **N:** the narrator, from the same `narration()` that `voiceCode` uses, after the same filters: narrator off (`C.narrator === false`), narrator track muted, a bar where the voice track sounds (D6), no sample. A step line that loses its bar to an image (voice-full-controls D11) is not in the schedule.
- **T:** every start of every voice-track line (`placeSpoken`), with its texts joined by " · ", when the line has a sample and its track is not muted.

`voiceCode` is rewritten on top of `spokenSchedule`, so the code and the list cannot disagree. `renderNow` builds "Next changes" from the steps and the schedule together. A row shows the step label (D1), then `V:N “…”` or `V:T “…”` in italics. A voice-track line with no step on its bar gets a row of its own with only its tag and text. V:N and V:T stay the same in both languages. Their tooltips name the voice with the voice-full-controls labels ("Voce: narratore", "Voce: traccia").

Alternative rejected: a speaker icon per row. The owner asked for the two tags, and they read well in narrow rows.

### D3. The voice track in grown songs

In `growOnAir`, once the growth `c` is chosen, each spoken track of the written form is placed again over the whole grown song:
- the same patterns (texts, ways, extras) and the same number of clips as the director's song;
- placed with the helpers of `voice-track.js` (`wherePartsOf` with the track's `where`, then `pickParts`), on the grown song's sections, the growth included. The voice track may speak during the growth, in its quiet parts only: a growth part counts as quiet where few tracks play, by the state of the build at each part (`stateAt`), not only by clips. A busy growth part gets no line;
- an entry line (`before`) keeps its bound track and is placed before that track's first entry in the grown song;
- an add step brings the track in at its first clip when the song builds live, as `rewriteSpoken` does.

The rule of `tailOf` that moves a lone first clip to the start of the tail goes away: D3 covers it. Compose is unchanged: `crescendoSong` grows from bar 0 and keeps the clips.

Alternative rejected: keep the clips before `from` in the growth's bars, shifted. The growth's bars do not match the written bars, and a passage could land on the growth's busiest step.

### D4. Typed lines get a code step

`sayAir` (`src/endless/steering.js`) always writes a step `{ at, add: <spoken id>, by: 'listener' }` on the line's bar, also when the voice track already plays. `add` on a playing track changes nothing in the sound, and it is a real build step, so the radio player evaluates the code on that bar. Say now picks the first bar that starts at least half a bar after the sample is ready, so the step is not already past when the command lands.

Alternative rejected: evaluating the code on air again in `player.swap` after `reloadSamples`. That changes the code on air outside a step, which the radio avoids on purpose: it would restart lines typed by hand and break the typing.

### D5. Poetic images at every entry

`narration()` in `src/song/build.js`:
- the image goes before the **next entering step after the current bar**, found among all later steps, not only `steps[upTo]`;
- in the bar before the entry when that bar still plays the code of the step before (as today); else **on the entry's bar**, for every bar, not only bar 0. A shared bar with a step line follows D11 (image said, line on stage);
- the first bar of a song in the radio window counts as its start: an entry there gets its image on that bar (`windowPart` passes the song's start; `narration` reads `song.start` or 0);
- `enteringTrack` also returns a track for the step that makes silent lines sound: `unsolo` of the last solo line brings in every playing track that was muted by the solo. The image is for the first of them in the entry order.

Narrated growth stays as decided in D11: step lines plus images.

### D6. The narrator yields only to lines that sound

`spokenBars` checks each line's samples with `sampleOf`. With `spokenContext.files === null` (Node checks) every sample exists, as today. A line whose samples are all missing (`missing` in `spokenCode`) adds no bar. A muted track adds no bar (as today).

### D7. Locked drums in breaks (updates radio-arrangement D12)

The break and the charge in `directSong` drop every playing drum track, locked or not, except the drums the listener brought in on that boundary. The drop brings them back (`brokeDrums`, as for unlocked drums). The lock still keeps the director away from the instrument: no add of a silent locked track, no strip for good, no variation, filter, drive or effect move, no reshaping by the outro. Only drums change: a locked bass, pad or arp still plays through breaks.

The owner confirmed the scope: the change applies to drums only. A locked bass, pad, arp, lead or any other non-drum instrument keeps playing through breaks and the charge, as radio-arrangement D12 says today.

radio-arrangement D12 now reads: "on one that plays, it keeps it playing as it is until the song ends, past the outro's strips; a locked drum still sits out a break and the charge before a drop and comes back at the drop". Its spec scenario "Locked bass" is kept. A scenario for a locked kick is added. The endless fixtures move: `DIRECTOR_VERSION` goes up (AGENTS.md rule).

### D8. The cap at every bar (low priority)

`TRACK_CAP` (12) holds at every bar of a steered song:
- `candidateMoves` adds a track only when fewer than `min(hardMax, TRACK_CAP)` tracks play;
- the return of listener tracks after a break (`back`) and the drop's return (`brokeDrums`) bring back only as many tracks as fit under the cap, in entry order. The ones left wait for the next boundary where they fit;
- `whyNot` for `more` and `pattern` checks the most tracks the steered song would play from the command's bar to the song's end, not only at that bar.

The console count uses the same rule as the cap: tracks of the song on air at the next bar, without the riser and the voice track.

### D9. One pattern row in the Compose track panel (pp1, #84)

The song's row and "Song patterns" become one compact row in the track panel. It updates pattern-preview's requirement "Two named pattern rows".

**Layout.** One row titled "Pattern disponibili nel brano" ("Patterns in this song"), with the hint "Modifica e ascolta i pattern inclusi in questo brano" ("Edit and listen to the patterns in this song"). The chips are Niente (first, silences the track in the chosen section or clip), then every pattern of the track, then + Nuovo and Elimina. The rest of "Crea pattern" (Save as pattern, Compose a part with its number, Energy, Keep rhythm, Keep notes) stays below in a row titled "Crea" ("Make"). A short legend line under the status line explains the marks.

**Marks on the chips:**

| Mark | Meaning |
| --- | --- |
| Filled cyan badge "NEL BRANO" ("IN THE SONG") | The pattern plays in the chosen section, or in the chosen clip in Free timeline |
| Hollow cyan circle | The pattern is used in other sections or clips |
| No mark | The pattern is used nowhere: a trial that can be deleted |
| Headphones | The pattern in preview |
| Pink border | The pattern being edited |

**No section or clip chosen.** When the whole track is selected, in Free timeline with no clip chosen and no section, the row shows no "NEL BRANO" badge and says how to choose one: click a clip in the timeline or a section in the arranger. The hollow circles still show where patterns are used.

**Status line.** Under the row, one line in plain words says what the user edits and what the song plays:
- editing a pattern in the song: "Stai modificando B, quello che suona nel brano: ogni modifica si sente dove è usato";
- editing a pattern used nowhere: "Stai modificando D: lo senti solo in anteprima. Il brano suona ancora B", with the button "Usa D in «sezione»" ("Use D in «section»"), «sezione» being the chosen section or clip. A click puts D there, with Undo in the notice.

**Editing stays live.** No Save button. An edit to a pattern applies everywhere the pattern is used, from the next bar, as today.

**"Prova su una copia" ("Try on a copy").** Shown on the status line when the edited pattern is used in the song. It copies the pattern to the next free letter (B → D), used nowhere, and switches editing to the copy. The status line then offers two buttons:
- "Usa D in «sezione»": D takes B's place in the chosen section or clip only;
- "Sostituisci B con D" ("Replace B with D"): every section and clip that uses B uses D instead. B stays in the list, used nowhere, and can be deleted.

**"Ripristina B" ("Restore B").** Shown on the status line once B has changed since the user started editing it (chose its chip). It brings B back to how it was at that moment: an undo per pattern, kept while the song stays open in Compose. Restore is itself undoable from the notice.

**Delete.** Disabled on a pattern that is in use, in the song or in the chosen clip, with a tooltip that says where it is used. Enabled on a pattern used nowhere.

**Preview.** Unchanged from pattern-preview: the headphones button plays the edited pattern, and the track keeps playing its song pattern under the preview. The status line does not mute the track. The tooltip keeps "M mutes it".

**Strings** in Italian and English in `src/i18n.js`, CSS for both themes (neon and hardware). Alternative rejected: two rows with different names and colours ("In the song" and "On trial"). It keeps two lists with the same letters, which is what confused the owner.

### D10. Growth duration label

The Compose value `dur:fitted` reads "Al massimo quanto il brano scritto" ("At most as long as the written song") in place of "Nella lunghezza del brano" ("Within the song length"). `durHint` uses the same words. Label only: the option's id, its behaviour and saved songs do not change. Every other place that quotes the label (Guide, knowledge notes) follows.

## Risks / Trade-offs

- **[D3 moves the voice track of saved grown songs]** A frozen session stores its songs as heard, so it does not move. A replayed session grows again and gets the new places. That is wanted.
- **[D7 moves the director fixtures]** `DIRECTOR_VERSION` goes up, and saved sessions warn that they may sound different (#38).
- **[D4 adds steps to the build]** The step's comment is empty and the code shows no change. `check:endless` and the replay check confirm that a replayed line gives the same song.
- **[D5 says more images]** A song gets one image per entry, as the style promised. With Narrated growth the step lines still outnumber the images (Follow-ups).
- **[D3 speaks during the growth]** A line could land in a growth part that later fills up. The quiet test uses the build state at the part's own bars, so a part counts by what plays there.
- **[D9 Replace B with D]** It changes several sections at once. It is one undoable action, and B stays in the list until deleted.
- **[D9 changes the panel the preview checks read]** `check-preview.cjs` and `check-patterns.cjs` look for the two rows today, so they move with the change.

## Follow-ups

- **Poetic movement lines (separate later change).** The poetic narrator with Narrated growth could say a short "movement" line at steps without an entry, instead of the plain step line. This needs a new POETIC group and its samples (`npm run voices`). Measured today: about 5 images against 25 step lines per Live coder song. Out of scope here, by the owner's choice.
