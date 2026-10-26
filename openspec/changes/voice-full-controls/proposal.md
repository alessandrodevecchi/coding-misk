## Why

After voice-placement (#77) the two voices still have half their controls. The sound of a voice (speaker, volume, pitch, tempo, filter, low cut, drive, reverb, delay) can only be changed in the track panel of Compose, and the narrator track exists in 11 of 41 songs, so most songs cannot change the narrator's sound at all; the radio has no sound control for either voice. The owner cannot see or edit the lines the voice instrument says without opening each clip, the voice instrument only speaks in quiet parts ("4 phrases of 12, no more quiet parts"), the poetic narrator drops the step lines of Narrated growth, the radio Voices group is a jumble, and the console cannot add a line live. Issue #82, follow-up to #77.

## What Changes

- **Sound controls for both voices** (speaker, volume, pitch, tempo, filter, low cut, drive, reverb, delay) in the Compose Voices group and in the radio Voices group, in a folded "Sound" part (closed by default). In Compose the group, the track panel and any other place that shows the same control read and write one value: the voice track's settings. A song with no narrator track shows the default sound and creates a narrator track on the first edit.
- **Voice styles**: named sets of the sound knobs (Clear, Radio, Distant, Robot, Deep, Bright, Cathedral, Echo, Dirty, Slow), the same list for both voices, in Compose, in the radio Voices group and in the console. A style never changes the speaker or the volume. Any knob moved by hand makes the style Custom.
- **Phrase list** of the voice instrument: every line with its bar(s), sorted by bar, folded, text and bars editable in place, in every build mode (Classic, Live build, Crescendo, Live coder), with the bar heard in that build shown next to the written bar. A proposed narrator line list, read-only for derived growths.
- **Samples for new lines**: a local voice helper on the dev server makes the sample of a new or edited line (today macOS `say` + ffmpeg, replaceable by another local generator); until it exists the line is shown and written but silent, marked "no sample".
- **Where the voice instrument speaks**: a new option with three flags, quiet, medium and busy parts, any combination, quiet first. Default quiet only (as today).
- **Poetic narrator with Narrated growth**: the step lines stay and the poetic images come in addition.
- **Radio Voices group redesigned** (variant B): settings for the next songs only, two blocks "Voce: narratore" and "Voce: traccia", each with a short main row and folded parts. The "Apply to the song on air" button leaves the group.
- **Console Voice group**: "Voce: narratore" (Talk more, Talk less) and "Voce: traccia" (phrase preset, voice style, Apply), both following the console scope switch; "Aggiungi frase": a typed line said now or placed at the next good moment.
- **Voice track in every style and "Sempre"**: every style recipe gets a voice track chance (some very low, country zero); the radio How often reads Come dice lo stile, Spesso, Sempre: Sempre gives every next song a voice track whatever the style or other settings, and Mai leaves the menu (the Voce: traccia switch silences the voice track; a saved Mai reads as the switch off).
- **Quick on/off per voice** in the title row of each Voices block (Compose and radio); off greys the block and keeps every value.
- **Vocabularies fill the phrase list**: a "Riempi con" select, "+ Aggiungi frase" under the list and a trash button per row.
- **Faders in the hardware theme** for the Sound parts, where knobs cost height.
- **Labels** "Voce: narratore" / "Voce: traccia" (notes scheme v2) across Compose, radio, console, curves, Library and Guide; Guide card "Due voci".

## Capabilities

### New Capabilities

- `live-build/voice-sound`: the sound controls of both voices, the single source of truth, the voice styles.
- `live-build/voice-phrases`: the phrase list, where the voice instrument speaks, how a line gets its sample, the poetic narrator with Narrated growth.
- `live-build/voice-radio`: the radio Voices group for the next songs, the console Voice group, lines added live.
- `live-build/voice-labels`: the "Voce: …" label scheme and the Guide card.

### Modified Capabilities

None in `openspec/specs/` (voice-controls and voice-placement are not archived; this change builds on them and replaces the radio "Apply to the song on air" button of voice-placement D5b with the console).

## Impact

- **Code:** `src/main.js` (Voices group, track panel, phrase list), `index.html`, `src/endless/voice-panel.js`, `src/endless/voice-track.js` (placement flags), `src/endless/director.js` (voice options for the next songs, placement flags), `src/endless/steering.js` (voice style and live line commands), `src/radio/radio.js` (Voices group, console), `src/song/format.js` (voice styles table), `src/song/build.js` and `src/song/spoken.js` (poetic narrator with Narrated growth, settings per bar), `vite.config.js` (dev-only voice helper), `tools/voice.mjs` (one line on request), `src/hardware.js` (faders), `src/endless/voice-options.js` (Sempre in the radio, vocabulary), `styles/*.json` (a `spoken` block in every style), `src/i18n.js`, `src/guide.js`, `src/style.css`.
- **Format:** `voiceOptions.where` on a spoken track; radio options `narratorSound` and `voice.sound`, `voice.where`, `voice.vocab`, `voices.narrator`, `voices.track`, `voice.presence: 'always'`; a `spoken` block in every style recipe; steering commands `voice-sound` and `say-live`; a song may gain a narrator track (`Narrator`, type `voice`) when its narrator sound is edited.
- **Sound:** unchanged for every song and session until the owner changes a voice: default flags (quiet only), default narrator sound ("as the style" in the radio). The voice track chance of 17 more styles adds Words tracks to some radio songs: the endless fixtures of those styles move on the voice tracks only, with `DIRECTOR_VERSION` raised; the music of every song is unchanged. Narrated growth with the poetic style changes (more lines).
- **Checks:** `check:spoken`, `tools/check-voices.cjs`, `check:guide`, `check:knowledge`, `check:endless` (fixtures must not move).
