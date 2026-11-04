# Spec Delta

## Purpose

Defines which voices can speak the app's lines in each language, how the app shows them, and how speakers that no longer exist are read from saved songs and sessions.

## ADDED Requirements

### Requirement: Speaker list per language
The app SHALL offer the speakers `albert`, `fred`, `junior` and `kathy`, each with the list of languages it speaks. All four SHALL speak English only. The default voice SHALL be Samantha in English and Alice in Italian. Italian SHALL have no speaker other than the default voice.

#### Scenario: English speakers
- **WHEN** a speaker picker lists the speakers
- **THEN** it offers the default voice, Albert, Fred, Junior and Kathy, and none of eddy, flo, grandma, grandpa, reed, rocko, sandy or shelley

#### Scenario: Italian speakers
- **WHEN** the app asks which speakers speak Italian
- **THEN** the answer is the default voice (Alice) alone

### Requirement: Language fallback to the default voice
A line in a language its speaker does not speak SHALL use the default voice's sample bank of that language. The app SHALL NOT look for, ask the voice helper for, or load a speaker bank in that language.

#### Scenario: Italian line with Kathy
- **WHEN** a voice track with speaker `kathy` speaks a line and the app language is Italian
- **THEN** the line plays from `say_it`, with the track's sound settings, and no request names `say_it_kathy`

#### Scenario: English line with Kathy
- **WHEN** the same track speaks the same line in English
- **THEN** the line plays from `say_en_kathy`, or from `say_en` when that sample does not exist yet

### Requirement: Pickers show the language fallback
Every speaker picker (the narrator and voice track Sound parts, the track panel, the Voices tab test bench, the Styles tab speaker chips) SHALL keep every speaker selectable in every app language. In Italian, a speaker that does not speak Italian SHALL show that Alice speaks for it.

#### Scenario: Picker in Italian
- **WHEN** the app language is Italian and the user opens the narrator's speaker picker
- **THEN** Kathy is listed with a note that she speaks English only and Alice speaks in Italian, and choosing her keeps `kathy` in the song

#### Scenario: Voices tab cards
- **WHEN** the Voices tab shows the speaker cards
- **THEN** each English-only speaker shows its system voice for English and, for Italian, that Alice speaks instead, with no "not installed" warning

### Requirement: Removed speakers read as the default voice
A speaker name that is not in the list, including the eight removed ones, found in saved data (a song in the browser, a song file, a saved or frozen radio session, a radio voice option, a user style, a typed radio line) SHALL be read as the default voice. The saved data SHALL load without errors and SHALL NOT be rewritten in storage.

#### Scenario: Old saved song
- **WHEN** a song saved before this change with a narrator speaker `reed` is opened in Compose and played
- **THEN** it loads without errors, its narrator plays from `say_<lang>`, and its picker shows the default voice

#### Scenario: Frozen radio session
- **WHEN** a frozen radio session whose songs name `flo` and `grandpa` is played
- **THEN** every line plays from the default voice bank and the session plays as before

#### Scenario: User style with a removed speaker
- **WHEN** a user style names `voice.speakers: ["rocko", "kathy"]`
- **THEN** the style loads without errors and the director draws from `["", "kathy"]`

#### Scenario: Validation note
- **WHEN** a song file names a removed speaker and is validated
- **THEN** validation gives a warning that the speaker was removed and the default voice speaks, not an error

### Requirement: Built-in songs and styles name only listed speakers
Every built-in song (`songs/`, `songs/examples/`) and style recipe (`styles/`) SHALL name only speakers in the list or the default voice. A song's voice instrument SHALL NOT have the narrator's speaker.

#### Scenario: Check of built-in data
- **WHEN** the built-in songs and styles are validated
- **THEN** none names a removed speaker, and no song's spoken track has the same non-default speaker as its narrator
