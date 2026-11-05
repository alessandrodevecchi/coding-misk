## ADDED Requirements

### Requirement: Narrator samples for every speaker

`tools/voice.mjs` SHALL make the narrator's built-in lines (the director's POOL phrases, the interlude comments and the poetic images) for the default voice and for every speaker in `SPEAKERS` that speaks the language. A speaker that does not speak a language SHALL use the default voice's bank for it, as before. The allowed speaker and style pairs of `src/voices/combos.json` SHALL NOT remove a speaker from this set.

#### Scenario: Speaker drawn from a style's list

- **WHEN** `node tools/voice.mjs --list` runs and a style names `voice.speakers: ["fred", "junior"]`
- **THEN** the list has `say_en_fred/<slug>.wav` and `say_en_junior/<slug>.wav` for every POOL phrase, interlude comment and poetic image

#### Scenario: Speaker outside the style's list

- **WHEN** `node tools/voice.mjs --list` runs, and a style (berlin-techno) does not name kathy in `voice.speakers`
- **THEN** the list still has `say_en_kathy/<slug>.wav` for every narrator line, because the director's chaos draw and the combos redraw can pick any speaker for any style

#### Scenario: Italian

- **WHEN** `node tools/voice.mjs --list` runs
- **THEN** no `say_it_<speaker>` bank is listed, and the Italian narrator lines are listed once, in `say_it`

#### Scenario: Speaker report

- **WHEN** `npm run check:samples -- --speaker junior` runs after `node tools/voice.mjs`
- **THEN** it reports only the `say_en_junior` bank, with 0 missing narrator lines

#### Scenario: Strict run with narrator gaps

- **WHEN** `npm run check:samples -- --strict` runs and the only missing samples are speakers' samples of narrator lines
- **THEN** it reports them and exits 0

### Requirement: Narrator lines spoken by the drawn speaker

A built-in narrator line in a radio song SHALL be spoken with the sample of the speaker drawn for the song's narrator. Until that sample exists, the default voice SHALL say the line, with the existing fallback note. The songs of a seed SHALL NOT change.

#### Scenario: Speaker sample exists

- **WHEN** the radio plays a song whose narrator speaker is junior and `say_en_junior/<slug>.wav` exists for a POOL phrase the narrator says
- **THEN** the phrase is heard from `say_en_junior`, with the narrator's drawn sound

#### Scenario: Speaker sample missing, no helper

- **WHEN** a built-in narrator line has no sample of its speaker X and the voice helper is not running
- **THEN** the default voice says the line and the console notes `[voice] "<text>": no sample in say_<lang>_X, the default voice speaks it`

#### Scenario: Default speaker

- **WHEN** the narrator's speaker is the default voice
- **THEN** the radio asks for and plays the same samples as before this change

#### Scenario: Same songs

- **WHEN** the same seed is generated before and after this change
- **THEN** the songs, their lines, their speakers and their sounds are the same, and `npm run check:endless` passes without new fixtures

### Requirement: Speaker samples asked ahead in the radio

When the speaker's sample of a built-in line (a narrator line, a voice-track line or a vocabulary entry) is missing and the voice helper runs, the radio SHALL ask the helper for it, also when the default voice has the text, the next song first. A sample that arrives after the next song was preloaded SHALL be loaded before that song's first bar. A sample asked once SHALL NOT be asked again in the same page. Compose SHALL keep its current rule.

#### Scenario: Speaker sample missing, helper on

- **WHEN** the next song's narrator speaker is fred, a built-in narrator line has no `say_en_fred` sample and `say_en` has it, and the voice helper runs
- **THEN** the radio asks the helper for fred's sample, loads it before the next song's first bar, and the line plays from `say_en_fred`

#### Scenario: Voice-track line and vocabulary

- **WHEN** a built-in voice-track line or vocabulary entry said by speaker X has no X sample, the default voice has it and the voice helper runs
- **THEN** the radio asks the helper for X's sample, and the default voice says the line until the sample arrives

#### Scenario: Asked once

- **WHEN** the helper was asked for a speaker's sample and the sample still does not exist (the copy guard deleted it)
- **THEN** the radio does not ask for it again in the same page

#### Scenario: Compose unchanged

- **WHEN** Compose plays a song with a narrator speaker
- **THEN** Compose asks the voice helper for the same lines as before this change
