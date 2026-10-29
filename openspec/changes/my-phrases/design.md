## Context

Read in the code on 2026-10-29 (local `develop`, `a1fd108`), with the in-progress change `spoken-text-on-stage`.

### Where spoken texts come from today

| Speaker | Source, in order | Where in the code |
| --- | --- | --- |
| Voice track | the song's own text, else the style's `spoken.lines` for the way, else a vocabulary entry (`vocab:<group>` or written out) | `VOCABULARY` (dark, calm, machine, night; 48 entries) in `src/song/vocabulary.js`; draws in `src/endless/director.js` (`spoken`, `morePhrases`) and `src/endless/voice-track.js` (`rewriteSpoken`, "Fill with") |
| Narrator, explaining (Compose growth) | the song's own steps, else `PHRASES` by step kind (14 kinds) | `src/song/build.js` |
| Narrator, explaining (radio) | `POOL` by move kind (18 kinds, 46 phrases) | `src/endless/phrases.js` |
| Narrator, poetic | the song's `narrator.lines`, the style's, else `POETIC` by entering track type (11 types, 25 images), `POETIC.move` (12 movement images) | `src/song/vocabulary.js`, `src/song/spoken.js` |

### What happens to a line the user writes

- **Radio console** (`sayLine` in `src/radio/radio.js`): `POST /voice/say`, then a `say-live` steering command; the text lives in the session plan and the song on air.
- **Compose phrase list** and **the narrator lines of the user's own songs** (`lineSamples`, `askSamples` in `src/main.js`): the text is written in the song; its sample is asked from the helper.
- **The voice helper** (`vite.config.js`, dev server only, macOS `say` + ffmpeg, about 0.5 s a line, one at a time) writes `public/samples/say_<lang>[_<speaker>]/<slug>.wav` (`saySlug`, 48 characters) and adds its length to `say_lengths.json`.
- The line is not added to any collection, not in the backup, and never drawn again.

### Samples on disk

3,559 WAV files, about 260 MB, in 18 banks (`say_it`, `say_en` and one per speaker and language). A bank holds a file per slug; the same slug serves every text with that slug (two texts can share one file). The app picks a sample by its index in the sorted file list of the manifest (`sampleIndex` in `src/song/build.js`): **deleting a file shifts the indices of the files after it**, so the manifest must be read again and the playing song recompiled after any deletion (today `reloadSamples` does both after a new sample).

### What `spoken-text-on-stage` brings (in progress, not duplicated here)

- `spokenNeeds(song, C, lang)`: every line a song would speak, with bank and text.
- Samples prepared ahead through the helper, and the per-line fallback chain (speaker, default voice, on the fly, silent with the text as the tag).
- `npm run check:samples`: lines without a sample over built-in songs, styles and vocabularies.
- `SPEAKER_KINDS` in `src/song/speakers.js`: narrator (microphone icon), voice (wave icon).

This change relies on all four: a deleted sample of a line still in use is made again by the preparation, or falls back, so deletion never breaks a song.

## Goals / Non-Goals

**Goals**

- Every line the user writes can be kept, browsed, edited, deleted and reused by the director.
- The user adds narrator phrases without touching the code.
- Unsaved lines do not fill the disk; the space is visible; orphan samples can be cleaned safely.
- One place in the Groove Lab for voices, phrases, vocabularies and samples.
- With "Mai" or an empty collection, everything sounds and draws exactly as today.

**Non-Goals**

- No new speakers, no new voice generator, no singing voice.
- No editing of the built-in vocabularies in place (copy into mine instead).
- No change to a song's own written lines, ever.
- No sample management outside the dev server (a built app reads only).

## Decisions

### D1. The collection: one store, in the backup

`coding-misk-phrases` in the browser storage:

```js
{ format: 1, items: [{
  id: 'ph_k3x9',                       // stable id
  text: 'le torri non dormono mai',     // as typed (at most 12 words, 160 characters, the helper's limits)
  lang: 'it',                           // the language it was written in
  alt: { en: 'the towers never sleep' },// optional translation, used when the app speaks English
  kind: 'voice' | 'explain' | 'poetic',
  tag: 'night' | 'bass' | 'move' | …,   // mood (voice), moment (explain), entering track or 'move' (poetic); null = any
  styles: ['synthwave'],                // optional; empty = every style
  on: true,                             // the director may use it
  source: 'radio' | 'compose' | 'narrator' | 'tab' | 'copy',
  from: { song: 'luci-rosse', style: 'synthwave' }, // where it was first written (shown, not used for draws)
  created: '2026-10-29T21:04:00Z', uses: 6, last: '2026-10-29T22:10:00Z'
}] }
```

- **One phrase per text, language and kind**: the key is `kind + lang + saySlug(text)`. Writing the same line again adds a use, never a copy.
- **Backup** (`src/settings/backup.js`): merged by id like patterns; the use count keeps the larger value and the newer `last` (as `mergeUses`). A phrase deleted here and present in an older backup comes back on import, as songs do; the trash is not needed for a list this small.
- **Cap**: 1,000 phrases; past it, the oldest unused phrases with `uses: 0` are proposed for deletion in the tab, never removed silently.

Alternatives: one store per kind (rejected, three merges for one concept); phrases inside styles (rejected: a style is a recipe, and a phrase typed on air belongs to no style the user owns).

### D2. Capture and classification

| Where the user writes | Kind | Tag | Styles |
| --- | --- | --- | --- |
| Radio console, Say now or At the right moment | voice | the vocabulary group of the song's style (`spoken.vocab`), else none | the song's style |
| Compose, voice track phrase list (a row edited or added) | voice | the track's vocabulary group, else the song style's | the song's styles |
| Compose, narrator lines of the user's own song (explaining) | explain | the step's moment: the track type it adds (`drums`, `bass`, …), `less`, `breakdown`, `start`, `end`; else none | none |
| Compose, narrator lines of the user's own song (poetic) | poetic | the entering track type, else `move` | none |
| Voci tab, Nuova frase or Copia nelle mie | chosen | chosen | chosen |

The tag is a guess the user can change. "Moments" of the explaining narrator unify the two pools: the 14 kinds of `PHRASES` and the 18 move kinds of `POOL` map onto one list of 21 moments (`start`, `end`, `drums`, `bass`, `lead`, `pad`, `guitar`, `arp`, `texture`, `riser`, `code`, `voice`, `less`, `variation`, `brighter`, `darker`, `dirtier`, `cleaner`, `space`, `breakdown`, `drop`), so one phrase serves both Compose and the radio. The map lives next to the pools and `check:phrases` asserts every pool key maps to a moment.

**Open point (owner, round 5): one list or several.** The owner approved the single shared list but is not sure, and may later want several lists, kept the same between Compose and the radio. The design allows it without a change to the store: a phrase's tag stays a moment, and "several lists" become groups of moments over the same shared map (for example tracks that come in, changes of energy or colour, structure), so Compose and the radio still read the same lists. Recommended: build the one list of 21 moments now, and show it in the tab grouped in those three families; split only if listening shows that a phrase written for a Compose step sounds wrong on a radio move. To confirm with the owner before task 1.2.

Lines of built-in songs, lines the director wrote, and lines the user did not type are never captured.

### D3. Save policy

A global setting, `coding-misk-phrase-settings.save`:

- **Salva sempre** (default). The line is saved at once; a toast says "Salvata nelle tue frasi" with **Annulla** (the same toast slot the app uses for Undo). In Compose, where an edit already shows Undo, the save rides on that toast: Undo of the edit also removes a phrase the edit created.
- **Chiedi ogni volta.** A toast "Salvare «…» nelle tue frasi?" with **Salva**, **No** and **Sempre** (switches the setting to Salva sempre). It never blocks: the line plays whatever the answer; no answer in 10 seconds counts as No. In the radio console the line keeps a small save button in its row until the song ends, for a late Salva.
- **Non salvare mai.** Nothing is saved. The line still plays; its sample is temporary (D6).

A line already in the collection only adds a use, with no toast, whatever the policy.

**Considered, not recommended now:** "Salva quelle che riusi" (save a line the second time it is written). It keeps the collection clean with no question, but a line typed once on air, the most common case, would be lost, which is what the owner wants to avoid. It can come later as a fourth option without changing the store.

### D4. The director uses them

A phrase of mine can take the place of a line that comes from a **built-in pool**, never of a song's own written line or a style's own line:

| Pool line | Candidates |
| --- | --- |
| Voice track vocabulary entry (director, "New phrases", "Fill with") | kind `voice`, same language (or a translation in it), tag equal to the group or null, style empty or matching |
| Explaining narrator, `PHRASES` (Compose growth) or `POOL` (radio move) | kind `explain`, tag equal to the moment or null |
| Poetic image, `POETIC[type]` or `POETIC.move` | kind `poetic`, tag equal to the type, `move`, or null |

- **How often.** `coding-misk-phrase-settings.share`: Mai 0, Ogni tanto 0.25 (default), Spesso 0.5, Molto 0.8, Sempre 1 (owner, round 5). For each pool line with at least one candidate, a draw on its own stream (`mine/<kind>/<n>`, seeded by the song's seed) decides whether a phrase of mine replaces it, and which one (least used first among ties, so the collection rotates).
- **Sempre** replaces every replaceable line: every line from a built-in pool that has at least one candidate. It still never touches a song's or a style's own lines (D4 table), and a pool line with no candidate (other kind, tag, language or style) stays the built-in one.
- **Determinism.** The pool draw happens first and unchanged; the substitution is a second draw on another stream. With Mai, or no candidate, the stream is not even read: director fixtures, growth fixtures, `check:spoken` and `check:endless` stay as they are, with no `DIRECTOR_VERSION` or `SHAPES_VERSION` bump.
- **Radio.** The substitution is written into the song the director makes (texts written out, as `morePhrases` already does), so the song on air, Replay and a session saved in a playlist play the same lines even after the collection changes. The session recipe records `mine: share` only when not Mai.
- **Compose.** Explaining and poetic lines are substituted in the narration layer (`narration()`, `narratorLines` in `src/song/spoken.js`), not in the growth: the growth, its cache and its fixtures do not change, only what the narrator says. The voice track gets mine through "Fill with" (a new entry, "Le mie frasi") and "New phrases" (the same share). A song's own steps and its written phrase list are never touched.
- **Uses.** A phrase counts a use when a song that says it is played (radio: on air; Compose: Play), not when it is drawn.
- **Language.** A phrase is a candidate only when it has a text in the app's language (its own or its translation).

Alternatives: mixing my phrases into the pools as equal entries (rejected: changes every draw and every fixture as soon as one phrase exists); a per-kind share (rejected for now: one setting is enough, and each phrase has its own on/off).

### D5. Samples: who owns a file

A sample file is classified at read time, not tagged on disk:

1. **Built-in**: its slug is a text of the vocabularies, pools, poetic images, style lines, or a built-in or example song (the text set of `check:samples`, computed in the page from the same modules).
2. **Mine**: its slug is a phrase of the collection (text or translation) in that language.
3. **Song**: its slug is a line of a saved song, a code song, a playlist session or the trash (the user's library).
4. **Temporary**: listed in `public/samples/say_temp.json` and not in 1 to 3.
5. **Orphan**: none of the above.

The page computes 1 to 3 (only the page sees the browser storage) and sends the protected slugs with every request that deletes. The helper deletes only files under `public/samples/say_*`, never a slug the request did not name, and never one the page protected.

### D6. Temporary samples

- When the helper **makes** a sample for a line that is not saved (`made: true`, the file did not exist), the page asks it to list the file in `say_temp.json` with an expiry: `{ "say_it_reed/chi_guida_stanotte.wav": { "expires": "…", "song": "radio:…" } }`. A sample that already existed (a built-in, a phrase of mine) is never listed.
- **Lifetime** (`coding-misk-phrase-settings.temp`): A fine brano, Dopo 24 ore (default), Dopo 7 giorni. "A fine brano" means after the song it was made for leaves the air or is closed in Compose, and at least one hour (a Replay right after still finds it).
- **Sweep**: at dev-server start and once an hour, the helper deletes the expired files, except those whose song the page reports as playing (`/voice/keep` with the song on air). After a sweep that deleted something, the page reads the manifest again and recompiles (D5's index shift).
- **Saved later**: saving a phrase calls `/voice/keep` with its files, which removes them from the ledger. On load, the page sends the slugs of every phrase of mine and every saved song, so a file that became used is never swept.
- **Needed again**: a line whose sample was swept is made again by the preparation of `spoken-text-on-stage` (D9 there), or falls back (D10 there). No line is silent for long, and none is lost from a song.

### D7. Deleting and editing a phrase

- **Delete** removes the phrase and asks the helper to delete its files in every bank, minus the slugs that D5 protects (built-in, another phrase, a saved song). The confirmation says how many files and how much space, and how many saved songs keep the text (their sample is made again when they play). Undo restores the phrase; the samples come back with the next preparation.
- **Edit text** makes a new sample (D3's policy does not apply: an edit of a saved phrase is saved). The old file becomes temporary if nothing else uses it.
- **Edit kind, tag, styles, translation, on/off**: no sample work, except a new translation (its sample is made in the background).
- Songs that already contain a phrase keep their text: the collection is a source, not a link.

### D8. Space and orphan cleanup

- `GET /voice/usage` answers every `say_*` bank with its files and sizes (no content). The page classifies them (D5) and shows totals by class, by bank, and the missing samples (from `spokenNeeds` over the collection and `check:samples`' set for the built-ins).
- **Cleanup is manual**: "Pulisci gli orfani" shows the list first (slug, bank, size, total), then deletes with one confirmation. Never automatic: an orphan may be a sample the owner made by hand with `npm run voices --song`.
- **Prepara i mancanti** sends the missing lines of the collection and the built-ins to the helper, one at a time, mine first; progress "3/31".
- Without the helper (a built app, another system): the tab shows status from the manifest (present or missing, no sizes), and says how to make samples (`npm run voices`). Nothing is deleted.

### D9. The Voci tab

A new Groove Lab tab, **Voci**, after Suoni (sounds, then voices). Four sections as chips, remembered per visit (`coding-misk-voices-sub`, not in the backup):

1. **Le mie frasi** (`mie-frasi-1`, `-2`, `-7`). Search, kind chips with counts, "Quanto usarle" (the same setting as D4, mirrored), groups by kind and tag; each row: icon of the speaker kind (wave for the voice track, microphone for the explaining narrator, quill for the poetic one), the text, where it came from, uses, sample status (pronta, in preparazione, da rifare), headphones (hear it with the voice it would use), edit, delete. "+ Nuova frase" and Modifica open one form: text, language and translation, kind, tag, styles, on/off in the director, sample status per bank, where it is used, delete with what it costs.
2. **Vocabolari inclusi** (`mie-frasi-3`). Read-only, with a lock badge, as the built-in styles: Voce traccia (dark, calm, machine, night), Narratore spiega (Compose moments, radio moves), Narratore poetico (entries, movement), Dagli stili (each style's lines). Each row: the text in both languages, headphones, a dot per speaker bank (ready or missing), and **Copia nelle mie frasi**.
3. **Voci e suoni** (`mie-frasi-4`). The speakers (default and the eight `SPEAKERS`), their system voice per language, sample counts per bank, "not installed" with the fallback; headphones on a fixed test line per speaker. The ten voice styles (`VOICE_STYLES`) as chips with headphones (a fixed line through the style's settings, on the preview player). A **test bench**: a line, a speaker, a style, Ascolta, and "Salva nelle mie frasi"; its sample is temporary until saved.
4. **Campioni** (`mie-frasi-5`). Space by class, Prepara i mancanti, Pulisci gli orfani with its list, the temporary samples with their expiry, Salva nelle mie and Cancella ora.

**What moves and what stays.** The per-song controls stay where the song is made: the Voices groups of Compose and the radio (switches, How often, Sound, Where, phrase list) do not move, because they act on one song. What is new here was nowhere before: the speakers overview, hearing the voice styles without a song, the vocabularies (only in the code), sample status and space. Links: the "Fill with" menu and the radio's vocabulary choice get "Le mie frasi" and a "Sfoglia…" link to section 2; a missing-sample row in Compose and the radio links to section 4; the Voices groups' info icon links to section 3. The settings of D3, D4, D6 live in Settings (`mie-frasi-6`), as the owner asked, and section 1 mirrors only "Quanto usarle".

Alternatives: a Voci page inside Settings (rejected: it is a place to browse and hear, as Suoni and Pattern are); moving the Voices groups into the tab (rejected: they would be one tab away from the song they change).

### D10. Look

- Icons drawn in `src/icons.js` (wave, microphone, quill, headphones `LISTEN`, pencil, bin, copy, disk, broom, spark, clock, lock); the speaker icons follow the registry of `spoken-text-on-stage` (D11 there).
- Hardware theme (`mie-frasi-5`, `-7`): status lights use `--led`, the space total is an LCD (`--lcd-bg`, `--lcd-fg`), Quanto usarle is a segmented switch like the others.
- Light theme (`mie-frasi-8`): tokens only; `check:light-theme` and `check-light-theme.cjs` cover the tab and the toast.
- Phone, 400 px (`mie-frasi-7`, `-8`): the section chips wrap, rows put the actions on the first line and the meta under the text, the vocabulary list goes above as a scrolling row.
- Italian and English for every string; the Guide gets a `voices-tab` card and a `my-phrases` card; the radio console and Compose cards mention the save.

## Risks / Trade-offs

- **Index shift on deletion** (D5). Every deletion is followed by `reloadSamples` and a recompile; the helper deletes in one batch, and the sweep waits while a song is in its first bar. A missed reload plays the wrong word for one bar at most; `check-voices-tab.cjs` deletes during playback and checks the code's sample numbers against the new manifest.
- **The page computes protection.** A song stored only in another browser is not protected; its sample is made again when it plays there (the samples are per machine anyway).
- **Shared slugs.** Two texts with the same slug share a file (`saySlug` keeps 48 characters, letters and digits). Protection is by slug, so a shared file is kept if any user of it remains.
- **Disk.** My phrases are small (about 80 KB a sample, so 100 phrases over 3 voices and 2 languages are about 50 MB at most); the built-in banks hold nearly all of the space and are not touched by the cleanup.
- **Privacy of typed lines.** They stay in the browser and in the backup file; nothing leaves the machine.
- **A collection that sounds samey.** "Least used first" and the share keep variety; Molto at 0.8 and Sempre can still repeat a short collection, which the hint says.

## Owner answers, round 5 (2026-10-30)

The owner approved every recommended answer below. Two notes: question 4 gains a fifth level, Sempre (D4), and question 7 stays open (D2). The list keeps each question with its answer.

1. **Save policy and default.** Salva sempre, Chiedi ogni volta, Non salvare mai, with Salva sempre as default and a toast with Annulla? Recommended: yes, and Chiedi as a toast that never blocks (No after 10 s).
2. **A fourth option, "Salva quelle che riusi"?** Recommended: not now (D3); a line typed once on air would be lost.
3. **Lifetime of unsaved samples:** A fine brano, Dopo 24 ore, Dopo 7 giorni, default Dopo 24 ore? Recommended: Dopo 24 ore, so a Replay or a reopened session the same evening still finds them.
4. **How often the director uses my phrases:** Mai, Ogni tanto (1 in 4), Spesso (1 in 2), Molto (4 in 5), Sempre (every replaceable line, added by the owner in round 5), default Ogni tanto? Decided: Ogni tanto by default, with Sempre as a fifth level.
5. **Which lines my phrases may replace:** only lines from built-in pools (vocabulary, explaining pools, poetic images), never a song's or a style's own lines? Recommended: yes. This includes the generated narrator lines of built-in songs in Live coder and Crescendo; Mai turns it off.
6. **Grouping:** by kind, then by tag (mood, moment, entering track), with styles as an optional filter rather than a group? Recommended: yes; styles as groups would split a small collection into many one-line groups.
7. **One list of moments for the explaining narrator** (21 moments covering Compose steps and radio moves)? Approved, with a doubt: "maybe still several lists, but the same between Compose and the radio". Still open (D2): recommended one list now, shown in three groups, split later only if listening asks for it; the lists stay identical between Compose and the radio either way.
8. **Built-in vocabularies:** read-only with "Copia nelle mie frasi", or editable in place? Recommended: read-only and copy, as built-in styles; editing in place would change every user's fixtures.
9. **Orphan cleanup:** manual with a list first, or automatic? Recommended: manual; an orphan may be a sample made by hand.
10. **Tab position:** Voci after Suoni in the Groove Lab, Settings card in Settings, the Voices groups unchanged? Recommended: yes.
11. **Translations:** optional second language per phrase, used when the app speaks it? Recommended: yes, optional; without it the phrase is used only in its own language.
12. **Uses count:** on play, not on draw? Recommended: on play (radio on air, Compose Play).
13. **Order of work:** after `spoken-text-on-stage` (it gives the preparation, the fallback and the missing-sample list)? Recommended: yes; before it, add about 1.5 agent hours for a minimal fallback.
