---
id: voice
related: [narrator, songs, growth-shapes, styles, live-build]
code: [src/song/spoken.js, src/song/vocabulary.js, src/endless/director.js, src/endless/voice-options.js, src/endless/voice-panel.js, src/endless/voice-track.js, src/endless/voice-sound.js, src/endless/phrase-list.js, tools/voice.mjs, tools/voice-sample.mjs]
checks: [npm run check:spoken, node tools/check-voices.cjs, node tools/check-steering.cjs]
---

# Voice: track (voice instrument)

## What it is

The voice instrument, labelled "Voice: track" (it: "Voce: traccia"; "voice track" in sentences, voice-full-controls), is a track of type `spoken`: spoken lines that are part of the music. It is not the narrator. The narrator explains the steps of a build; the voice instrument plays in the song as written, in exports and in every build.

Lines are samples made on macOS by `npm run voices`. Without them the track stays silent and the song plays on.

## How it connects

- **Songs.** A spoken track's patterns are lines, and its clips place them ([songs.md](songs.md)).
- **Narrator.** The narrator yields: it stays quiet on bars where a line sounds and never announces a spoken track ([narrator.md](narrator.md)).
- **On the stage (spoken-text-on-stage, #82).** Every start of a voice-track line shows as a caption in quotes, magenta, while it is heard (a chop once per clip, a refrain at each repeat), also while the user codes by hand; the lines typed in the radio console are voice-track lines marked `typed` (their own choice in Settings → Texts on stage) ([visuals.md](visuals.md)).
- **Growth shapes.** The `voice` opening starts a Live coder build with the first opening line ([growth-shapes.md](growth-shapes.md)).
- **Styles.** A recipe's `spoken` field gives the chance, the ways, lines, speakers and a vocabulary group ([styles.md](styles.md)).
- **Live build.** A spoken track is never thinned. It enters on the bar of its first line ([live-build.md](live-build.md)).
- **Grown on air (#81, after-tests-oct28 D3).** A radio song in Crescendo or Live coder grows from a bar of its written form (`growOnAir`). Its spoken tracks are then placed again over the whole grown song (`placeGrownSpoken` in `src/endless/voice-track.js`): the director's patterns and number of clips, entry lines (`before`) before their bound track first sounds, the others on parts of the kinds the track may speak in (`grownParts`), quiet first and spread (`pickParts`). The growth counts too: a phrase of the growth is quiet when at most half the most tracks play there and at least one does, by the build's state at its bars (its clips run under its steps, so its sections look busy by clips). With too few parts of the kinds allowed, the quietest others take the rest, so the number of lines stays. A refrain placed in the growth repeats there (`placeSpoken` reads `crescendo.growth` of a song with `onAir`). The add step moves to the first clip. Compose is unchanged. Measured: pure-trance Live coder songs speak their first line at 4% to 23% of the song (were 65% to 71%).
- **Generated songs (voice-controls).** The director gives a song at most one spoken track (`words`). The voice instrument options (`voice` in the director options, `src/endless/voice-options.js`) set how often, the ways and how many phrases; the radio and the new song from an artist show them ([radio.md](radio.md)).
- **The song being edited (voice-placement).** The Compose Voices group and the panel of a spoken track show the same controls for that track (no How often: the track exists), with New phrases. A change rewrites the track with `rewriteSpoken` (`src/endless/voice-track.js`): lines drawn like the director's from the song's styles and written out, one clip per quiet part (an 8-bar phrase of a quiet section), never two in one part, the count a ceiling, the settings and speaker kept; the options stay on the track as `voiceOptions` (`draw` counts New phrases). A track without them shows options read from its clips. The toast offers Undo. A song with no spoken track offers Add a voice instrument.
- **The song on air (voice-placement).** In the radio a voice instrument change also queues a `voice` steering command on the song on air: from the first quiet part after the next phrase, the clips before it kept; the plan keeps it (`voiceAir`) so later commands, Replay and saved sessions rebuild the same song ([radio-commands.md](radio-commands.md)).

- **Sound (voice-full-controls).** The Voices group shows a folded Sound part per voice: the voice style, the speaker and eight controls (volume, pitch, tempo, filter, low cut, drive, reverb, delay), with the ranges of the track panel. Every place writes one value, the voice track's `settings` (`setVoiceSetting` in `src/main.js`), so the group and the panel always agree. Voice styles (`VOICE_STYLES` in `src/song/format.js`): `clear`, `radio`, `distant`, `robot`, `deep`, `bright`, `cathedral`, `echo`, `dirty`, `slow`; each sets the seven sound keys and never the speaker or the volume; `styleOf` gives the style the values match, else `custom`. Each drawn character on the default voice equals its style (check:spoken). In the hardware theme the Sound controls are faders (`data-fader`, `src/hardware.js`).
- **Phrase list (voice-full-controls D5, D6, D16).** In the Phrases part of the Voice: track block and in the track panel: one row per clip, sorted by bar (`phraseRows`, `src/endless/phrase-list.js`), with the bars where it is said, the way, the text and its sample. Text, bars and way change in place; every edit is one song edit with Undo. In Crescendo and Live coder the rows show the bar heard (written + the growth `G`); a bar typed there is stored as written, a bar inside the growth is refused. "Fill with" gives each row an unused entry of a vocabulary (dark, calm, machine, night), "+ Add line" adds a clip in the next free part Where allows, the bin removes one (the track stays, also empty).
- **Where (D7).** `voiceOptions.where` (Compose) and `voice.where` (radio): quiet, medium and busy parts, any combination, quiet only by default. Sections are classified in `sectionFacts` (`kinds`): quiet as before, busy with three quarters of the most tracks or named drop or peak, medium the rest. Lines go to the kinds allowed, quiet first, each kind spread (`wherePartsOf`, `pickParts`); refrains repeat in those kinds. The default places lines exactly as before.
- **Samples of new lines (D8).** On the dev server a helper (`vite.config.js`, `/voice/status`, `/voice/say`) makes the sample of a line written or edited in the page with `makeSample` (`tools/voice-sample.mjs`, `say` + ffmpeg, about half a second a line); the page reads the samples again without a reload. Elsewhere the row says how to make it (`npm run voices`, which also takes `--song <file>`).
- **Every style (D14).** Every recipe has a `spoken` block: 0.3 for ambient, dark-cyberpunk and pure-trance, 0.15, 0.1 or 0.05 for the others, 0 for country. The draw stays on its own stream: the music never moves. In the radio How often is As the style says, Often or Always (Sempre: every next song, whatever the weight, the complexity or the artist); the Voice: track switch is the one way to silence it (a saved Never reads as the switch off).

**Texts.** The song's own text, else the style's lines for that way, else a line from the vocabulary (`src/song/vocabulary.js`), drawn with the song's seed. At most 12 words.

**Speakers.** The track's `speaker`, else one of the style's speakers, else any speaker. Never the narrator's.

## Options

<!-- generated:spoken-ways -->
| Way | Name |
| --- | --- |
| `passage` | spoken passage (it: passaggio parlato) |
| `refrain` | refrain (it: ritornello) |
| `chop` | chop (it: taglio) |
| `opening` | opening (it: apertura) |
<!-- /generated -->

- `opening`: the line once, from the clip's first bar. With `before`, it ends one beat before a track comes in.
- `passage`: a longer text, once, at the start of the quietest section of the clip, lightly treated.
- `refrain`: the line every `every` bars, only in quiet sections, only when it ends before the section does.
- `chop`: the line cut in `slices` and played on the steps of `rhythm`, every bar of the clip.

A quiet section has at most half the tracks of the fullest one, or a name like intro, break or outro. Spoken lines play on orbits 13 and 14.

### Options for generated songs

`voice: { phrases, kind, ways, presence }` in the director options. `voiceOption` gives `null` for the default, and the session recipe carries the options only when they are not the default, so a replay sounds the same.

| Option | Values | What it does |
| --- | --- | --- |
| `phrases` | `1`, `2-3`, `4-5`, `6-8`, `many` (9 to 12) | How many phrases at most, drawn in the range |
| `kind` | `different`, `repeated`, `mixed` | A new line each time; line A every time (a refrain); A, a new line, A, another one… |
| `ways` | `null` (the style's ways and weights) or a list of `opening`, `refrain`, `chop`, `passage` | The ways a phrase may use, each as likely |
| `presence` | `never`, `style` (the style's weight), `often` (twice the weight, at most 0.9), `always` | How often a song gets one. `always` is a single song with the voice instrument on: a style without one gets every way, a vocabulary line and a speaker of the styles that have one (their vocabulary samples exist) |

Presets (`VOICE_PRESETS`): As the style (`1`, `different`, the style's ways, `style`: the default, the director's draws before voice-controls), Discreet (`1`, `different`, all four ways, `style`), Present (`2-3`, `mixed`, `often`), Obsessive (`6-8`, `repeated`, refrain and chop, `often`). A single song keeps its own on/off (`style`, `always`, `never`); the radio offers `style`, `often` and `always`, and a preset never replaces `always`. Changing a control makes it Custom (`presetOf`).

Several phrases: one pattern per line (A, B, C…) and one clip per phrase, each in a quiet part: a phrase of the plan (8 bars or so) with the role intro, break or outro, or with few tracks playing (at most half the song's usual most, at least 2). Never two phrases in one part; the parts are spread over the song; a refrain only goes to an intro, a break or an outro. A phrase that finds no part is dropped: the count is a ceiling. New lines are the style's lines for their way not used yet, else vocabulary entries written out, so two lines are never the same. The draws for the extra phrases come from their own stream (`spoken-more/<index>`): the default draws exactly as before.

## Example

A spoken track with a chopped word:

```json
{"id": "words", "type": "spoken", "settings": {"speaker": "reed", "gain": 0.55}, "patterns": {"chop": {"way": "chop", "text": {"en": "signal", "it": "segnale"}, "slices": 8, "rhythm": "0 ~ 1 ~ 2 3 ~ 3"}}, "clips": [{"start": 16, "bars": 8, "pattern": "chop"}]}
```

It plays the word in eight slices on that rhythm, every bar from bar 17 to 24. The Voices example (`songs/examples/06-voices.json`) uses all four ways.

## Where to read more

- [docs/SONG-FORMAT.md](../SONG-FORMAT.md#voice-instrument): every field, the code, samples, speakers.
- [docs/ENDLESS.md](../ENDLESS.md#voice-instrument): the voice instrument in generated songs.
- [docs/VOCALS.md](../VOCALS.md): research on sung vocals, for later.
- The Guide cards `voice-instrument` ("Voice: track") and `voices` ("Two voices") in `src/guide.js`.
