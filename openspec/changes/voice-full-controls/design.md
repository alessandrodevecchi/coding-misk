## Context

See proposal.md for the why. Current state (develop 72698b5):

- **Sound controls.** `CONTROLS.voice` and `CONTROLS.spoken` in `src/main.js` (speaker, volume, pitch 0.5-2, tempo 0.25-2, cutoff, low cut 0-2000, drive, reverb, delay) exist only in the track panel. The Compose Voices group (`#live-voices`, `index.html` 111) has narrator on/off, style and Narrated growth, plus the voice instrument phrase options (`voicePanel`, `src/endless/voice-panel.js`).
- **Narrator sound.** `voiceCode` (`src/song/build.js`) speaks with `{ ...VOICE_DEFAULT, ...track.settings }` of the step's narrator track (`voiceOf`), so a song without a `voice` track (30 of 41 built-in songs) always uses `VOICE_DEFAULT`. In the radio, `voiceFor` (`src/endless/director.js`) draws the narrator sound per song from the style's ranges, a character (`VOICE_CHARACTERS`) and rack devices; `directSong` writes it as track `voice` named "Voice" (director.js ~435). `spokenFor` gives the voice instrument its own draw.
- **Characters.** `VOICE_CHARACTERS` (`src/song/format.js`): radio, robot, deep, bright, cathedral, echo, dirty, slow, each a partial override. `VOICE_LIMITS` bounds the drawn values.
- **Placement.** `quietParts` and `rewriteSpoken` (`src/endless/voice-track.js`) and the director's `spokenParts` use quiet parts only; `rewriteSpoken` reports "n of asked (no more quiet parts)".
- **Samples.** `npm run voices` (`tools/voice.mjs`, macOS `say` + ffmpeg) reads `songs/`, styles, the vocabulary and the director's phrase pool; songs the owner keeps only in the browser are not covered. The Vite dev server already serves `/samples/strudel.json` from a plugin (`vite.config.js`).
- **Radio.** `voicesGroup` (`src/radio/radio.js` ~830) mixes knob, chips, select, presets, phrase options, the Apply to the song on air button and a long hint. The console has a "Narrator" group (Talk more, Talk less) and a scope switch (`opts.scope`) that, for the whole session, nudges the knobs (`talk`, energy, complexity) except with an artist.
- **Build steps.** A `set` step changes a track's settings from its bar (`applyStep`, build.js 39) and the validator accepts `VOICE_DEFAULT` keys for `voice` and `spoken` tracks.

## Goals / Non-Goals

**Goals:** one value per control in Compose; a narrator sound for every song; one style list for both voices; lines visible and editable with their bars in every build; more places to speak; a cleaner radio group; the song on air changed only from the console; live typed lines with honest limits.

**Non-Goals:** a "Voce: live" microphone voice; a voice instrument curve (backlog); rack devices in the Sound part (they stay in the track panel); new speakers or languages; changing the director's draws for the default options; sung vocals.

## Decisions

### D1. Single source of truth: the voice track's settings
In Compose the value of every voice sound control is `track.settings[key]` of that voice's track in the open song (`S.song` in main.js); there is no other store. The Voices group, the track panel and the style pickers render from it and write through one function (`setVoiceSetting(trackId, patch)`) that records one song edit (the same undo path as the panel today) and re-renders every open view of that track. Rendering from the song after each edit is what keeps the places equal; no listener per control is needed.
- *Alternative rejected:* a song-level `narrator.settings` field next to `narrator.style`. It would create a second place for the same values whenever a song also has a narrator track, which is the divergence the owner forbids.

### D2. A song with no narrator track
The group shows `VOICE_DEFAULT` (what `voiceCode` uses) and the default speaker. The first edit inserts a track `{ id: 'narrator', name: 'Narrator', type: 'voice', settings: { ...VOICE_DEFAULT, ...patch } }` (no clips: narrator tracks are not compiled, `compile.js` 70) and applies the edit in the same undo step; the toast says "Voce: narratore added to the song" with Undo. Opening Sound without editing adds nothing. With several narrator tracks the group edits `voiceOf(song)` (the track used by steps without `voice`), named in the block subtitle; the others stay in their panels.
- *Alternative:* create the track when the song opens. Rejected: it would mark every song as changed.

### D3. Voice styles table
`VOICE_STYLES` in `src/song/format.js`, full sets of the seven sound keys (no speaker, no gain), all inside `VOICE_LIMITS`:

| Style (it) | pitch | tempo | cutoff | hpf | drive | room | delay |
| --- | --- | --- | --- | --- | --- | --- | --- |
| clear (chiara) | 1 | 1 | 18000 | 0 | 0 | 0.2 | 0 |
| radio (radio) | 1 | 1 | 3200 | 900 | 1.2 | 0.15 | 0 |
| distant (lontana) | 0.95 | 0.9 | 4500 | 300 | 0 | 0.8 | 0.3 |
| robot (robot) | 0.7 | 1 | 18000 | 400 | 3.5 | 0.2 | 0.1 |
| deep (profonda) | 0.55 | 0.75 | 6000 | 0 | 0 | 0.4 | 0 |
| bright (luminosa) | 1.35 | 1 | 18000 | 500 | 0 | 0.35 | 0 |
| cathedral (cattedrale) | 1 | 0.7 | 9000 | 0 | 0 | 0.95 | 0.25 |
| echo (eco) | 1 | 1 | 18000 | 0 | 0 | 0.5 | 0.6 |
| dirty (sporca) | 0.8 | 1 | 18000 | 700 | 4.5 | 0.2 | 0 |
| slow (lenta) | 0.85 | 0.55 | 18000 | 0 | 0 | 0.6 | 0 |

Each is `VOICE_DEFAULT` with the existing character on top, plus the new "distant", so a style and a drawn character with the same name sound the same. `VOICE_CHARACTERS` stays as it is (the director's draws must not move); a check asserts that each character applied on `VOICE_DEFAULT` equals its style. `styleOf(settings)` returns the style whose seven values match (to 0.01), else `custom`.

### D4. Radio: sound for the next songs
New radio options `narratorSound` and `voice.sound`, each `{ style: 'auto' | <style> | 'custom', settings?, speaker? }`, default `auto`. `auto` changes nothing. Otherwise the director still runs `voiceFor` and the voice instrument draw (same random streams, so later draws do not move), then overwrites the seven keys with the chosen values, and the speaker when one is set; the rack the draw picked is kept. The session recipe carries them only when not `auto`, like `voice`.

### D5. Phrase list rows
Rows come from `placeSpoken(song)` (the bars where each line is really said: refrain repeats, chop bars, opening bound to its entry), grouped per clip. The text cell edits the pattern (`text` becomes an own text `{ [lang]: value }`, the other language kept; an empty other language speaks the edited text and shows a mark). The bar cells edit `clip.start` and `clip.bars`. Each edit is one song edit; `voiceOptions` is kept, and the next New phrases may rewrite hand edits (the toast's Undo covers it, as in voice-placement).

### D6. Bars in every build
Rows are computed on the song as it plays in the current build (the grown song in Crescendo and Live coder, with the offset `G` and the spoken entry rules of `crescendo.js` ~975). Each grown spoken clip is matched to its written clip by order and pattern. A typed bar is converted with the same offset (`written = heard − G`); a bar below `G` is refused with the first heard bar of the written part. Bars are stored only in the written clip, so a Classic/Crescendo switch never changes them. Live coder growths compute in the background (growth-in-background): until the growth is ready the rows show written bars with a "growing" mark.

### D7. Where: quiet, medium, busy
`where: ['quiet'] | subset of ['quiet','medium','busy']` in voice options (`voiceOptions.where` on a track, `opts.voice.where` in the radio). `partsOf(song)` classifies each 8-bar part by the count of playing tracks (not `voice`, `spoken`, `code`, `riser`) against the song's most: quiet ≤ max(2, most/2) or role intro/break/outro (the current rule); busy ≥ 3/4 of most or role drop/peak; medium otherwise. `quietParts` becomes `partsOf(song, from, where)` ordered by kind (quiet, medium, busy) then spread as today. With `where` absent or `['quiet']` the code path and the draws are identical to today, so the endless fixtures stay. A refrain's quiet-section rule in `spoken.js` reads the same kinds. The UI shows three chips under Where (Dove parla): "parti tranquille", "parti medie", "parti piene"; the last chip on cannot be turned off.

### D8. Samples: a dev-server voice helper
A Vite plugin (`configureServer`, dev only, like the samples manifest) answers `POST /voice/say { text, lang, speaker }`: it runs the same per-line function as `tools/voice.mjs` (extracted as `makeSample(text, lang, speaker)`), writes the WAV into `public/samples/say_<lang>[_<speaker>]/<slug>.wav`, updates `say_lengths.json`, and answers with the bank, index and length. The app reloads the sample map for that bank (`samples()` on the manifest) and the line plays from its next occurrence. A queue serialises requests; text is passed as an argument (never through a shell), at most 12 words, and the helper only listens on the dev server's own host. `GET /voice/status` tells the app whether the helper exists (it is absent in a build and on systems without `say`); another local generator can replace `makeSample` behind the same endpoint. `npm run voices` also learns `--song <file>` for songs exported from the browser.

### D9. Typed lines at runtime: options compared
- **Web Speech API (`speechSynthesis`).** Works in the browser with no server, and on macOS Chrome exposes the same system voices. But it plays straight to the system output, outside Web Audio: no pitch/filter/drive/reverb from the voice's sound, not in the master, the limiter, the analysers, the recording, the export or the session video, and its timing is not on the beat. Not recorded means Replay cannot say it either.
- **Local helper (D8).** Real samples, played by Strudel like every other line: same sound chain, recorded, exported, replayable. Needs the dev server on macOS (or another local generator). Latency: one `say` + ffmpeg run per line, expected around one to two seconds for a short line on the owner's machine (not measured yet: task 6.2 measures it).
- **Pre-generated words.** Joining vocabulary word samples: works offline in a build, but only for known words, and the joins sound choppy. Rejected as the main path.

Decision: the helper is the path for both "Say now" and "At the right moment"; without it the field is disabled with the reason. Say now therefore means "the first bar after the sample is ready", which the console shows. A `speechSynthesis` preview is left as an open question for the owner, off by default.

### D10. Console commands
- `voice-sound { voice: 'narrator' | 'spoken', settings }`: a `set` step on that track at the next phrase (`applyBar`). `spokenCode` is changed to read each line's settings from the state at its bar (today it reads the track's settings once), so a `set` on a spoken track takes effect from its bar; the narrator already reads the state at its step.
- The phrase preset reuses the voice-placement `voice` command (from the next quiet part, `P.voiceAir`). Apply queues both as one entry in the queue (one Cancel).
- `say-live { text, lang, speaker, at, mode: 'now' | 'moment' }`: adds a clip and an own-text pattern to the song on air's spoken track (a `Words` track is added when there is none, muted until the line), at `at`. `now` sets `at` when the sample answer arrives; `moment` picks the next part of the allowed kinds from the next phrase. Recorded in `S.recipe.steering` with the final `at`, rebuilt by `steerSong` like `voiceAir`.
- Scope "The whole session" for Apply copies preset and style into `opts.voice` and `opts.voice.sound` (then `saveOpts`, `render`), also with an artist (unlike the knob nudges, these values are not artist traits).

### D11. Poetic narrator with Narrated growth
In `narration` (build.js ~185): when the style is poetic and the build is narrated, return the explain lines plus the poetic images; on a shared bar the image wins and the step keeps its `say` on stage. More lines need more samples: the poetic images already have samples (vocabulary poetic group); the step lines are the Crescendo phrase pool, already generated. A fully poetic narrated growth (every step an image) was considered: the poetic pool would repeat within one song and need many more lines and samples; kept for later if the owner finds the mix thin.

### D12. Radio Voices group layout (variant B)
Two blocks stacked (the radio's settings column is about 400 px wide; the mockup showed side by side does not fit), the sound knobs two per row. Each block: a subtitle, one main row of at most four controls, then `<details>` parts (Phrases, Sound) closed by default, their open state kept in `localStorage` per part (try/catch). One hint line under the group: "Valgono dai prossimi brani. Il brano in onda si cambia dalla Console." The long `radioVoicesHint` and the Apply to the song on air button go; their texts move to the console tooltips. Mockups: `notes/prove-2026-10-26/voci-spec/` (local).

### D13. Labels
Applied from `notes/etichette-voci-v2.md` (scheme A, choices 1A and 2A) with the owner's two changes: the Guide card is "Due voci" / "Two voices" (choice 3B), and the English sentence form of the voice instrument is "voice track" (not "track voice"). The new key for block titles in Library (`voiceTitle`) separates them from the track type key. `tools/check-voices.cjs` and `check:guide` follow the new strings.

## Risks / Trade-offs

- [A line in a busy part can be masked by the music] → quiet stays first and default; `check-spoken-play.cjs` measures the voice peak in a busy part; the owner listens. A later "voice lift" option is out of scope.
- [The helper writes into `public/samples/` while Vite watches it] → the samples folder is not a module dependency; the manifest is read per request, so no page reload; verified in task 6.2.
- [Say now is not instant] → the console shows "sample on its way" and the bar when known; the owner can pick At the right moment instead.
- [Editing a line, then New phrases, loses the edit] → the toast's Undo, and the row edit marks the track options as Custom.
- [Renaming built-in narrator tracks moves code snapshots] → `npm run snapshot:code` in the same commit, levels unchanged.
- [`spokenCode` reading settings per bar could change generated code] → only when a `set` targets a spoken track, which no built-in song or fixture has; `check:code` and `check:endless` must not move.

## Migration Plan

No stored data changes shape. Missing `narratorSound`, `voice.sound` and `where` read as `auto` and quiet only. Songs gain a narrator track only on an edit. Built-in narrator tracks renamed in one commit with the code snapshots.

## Open Questions

Each has the option the specs assume:

1. **System speech preview for typed lines** without the helper: recommended no (not recorded, not in the mix); alternative: an opt-in "anteprima di sistema" clearly marked as not recorded.
2. **Voice style in the console narrator row**: recommended no for now, as the owner described the row; alternative: the same style picker as the voice instrument row.
3. **Fully poetic Narrated growth** as a third style: recommended later, after listening to D11.
4. **Narrator lines of derived builds** editable through per-song overrides: recommended later; this change lists them read-only.
