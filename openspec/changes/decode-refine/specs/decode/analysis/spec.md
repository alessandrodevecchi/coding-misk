# Spec Delta

## Purpose

The analysis of a decoded track, refined so the model holds what makes the original recognisable: the kick under a loud bass, the hats, clean claps, steady chord qualities, a bass in one octave range and the top line.

## ADDED Requirements

### Requirement: Drums on dense mixes

misk-analyzer SHALL tell a kick from a bass note by a broadband click or a pitch fall in the kick's first milliseconds, and SHALL count a low onset that repeats on every beat for a bar as a kick. Hat and clap thresholds SHALL follow the section's own hat band. In level B a section's main drum grid SHALL be the per-step majority over the section.

#### Scenario: Kick under an acid bass

- **WHEN** the acid test song (a 909 kick on every beat under a distorted saw bass on A1) is analysed
- **THEN** the kick F1 is at least 0.8 in both levels

#### Scenario: Luci Rosse

- **WHEN** the app's export of `luci-rosse` is analysed and compared with its timeline
- **THEN** the kick F1 is at least 0.8, the hat F1 at least 0.8 and the clap F1 at least 0.75 in level B (today 0.42, 0.64, 0.64)

#### Scenario: Fewer grids

- **WHEN** the app's export of the fixed radio seed is analysed in level B
- **THEN** the drum track has at most 2 patterns per section plus repeated variations, and the clap has at most 40 false hits (today 257)

### Requirement: Steady chords and bass

Inside a section a chord's quality SHALL follow the section's majority for its root unless the other quality wins with confidence above 0.8 in at least two bars. The bass SHALL stay within its section's median note plus or minus 7 semitones, moved by octaves; a bar whose bass level is below 20 % of the section's loudest SHALL have no bass notes.

#### Scenario: No third flips

- **WHEN** the radio song (truth `Dm Dm C C`) is analysed in level B
- **THEN** at least 90 % of its bars with chords have the right quality (today the `D` and `Dm` flip)

#### Scenario: Bass that follows the voice

- **WHEN** a track has a quiet bass under a loud voice
- **THEN** the bass notes of a section span at most 15 semitones

### Requirement: The top line

Level B SHALL find the top line (the hook, arp or sung melody) as one note per 16th step with a voicing confidence, from Essentia.js's predominant pitch, or from misk-analyzer's YIN on the 200-2000 Hz band when Essentia.js is not available. Notes within 40 cents of the key's scale SHALL snap to it.

#### Scenario: A hook

- **WHEN** the arp-and-lead test song is analysed in level B
- **THEN** at least 70 % of the lead's note steps have the right pitch class

#### Scenario: Without Essentia.js

- **WHEN** Essentia.js fails to load
- **THEN** level B still gives a top line from misk-analyzer and records the engine

### Requirement: Level A relocks the beat phase

When the first kicks arrive after an intro without them, level A SHALL check the beat phase again over the first 8 bars with kicks and SHALL move the downbeat by half a beat when the kicks fall on the off steps. The code SHALL restart from the next bar on the new grid.

#### Scenario: Offbeat intro

- **WHEN** Luci Rosse plays in level A
- **THEN** the downbeat is within 30 ms of a true downbeat by the end of bar 12 (today 1.718 s, half a beat off)

### Requirement: Similarity check

`tools/decode-similarity.cjs` SHALL render a decoded track's level B code by the fast export and compare it with the original per band, chroma, brightness, band shares and loudness arc. Scores SHALL be stored and a later run SHALL fail when one drops by more than 0.05.

#### Scenario: The owner's files

- **WHEN** `DECODE_OWNER_DIR` points to a folder of audio files
- **THEN** the check prints the same measures for each file and stores nothing

### Requirement: Similarity targets

On the app's own songs and the bench's test songs the level B code SHALL meet: low-band rhythm at least 0.5, high-band rhythm at least 0.5, chroma at least 0.85, bass chroma at least 0.8, brightness ratio between 0.75 and 1.33, each band's share within 0.10 of the original's.

#### Scenario: Luci Rosse

- **WHEN** the similarity check runs on the app's export of `luci-rosse`
- **THEN** low-band rhythm is at least 0.5 (today 0.14), brightness ratio at least 0.75 (today 0.57) and the mid band's share within 0.10 (today 0.25 against 0.13)

## MODIFIED Requirements

### Requirement: Tap tempo

While the Decode tab is shown and a track plays, the **T** key with no modifier and the focus outside text fields and the code editor SHALL tap the tempo, and a **Tap** button next to ½× and 2× SHALL tap it on each press. Four taps or more SHALL set the tempo and the beat phase; the first tap of the series SHALL mark a downbeat. A tapped tempo SHALL replace the analysed one for the track and be stored with it. The space bar SHALL only play and pause.

#### Scenario: Four taps

- **WHEN** the user presses T four times on the beat, starting on a downbeat
- **THEN** the tempo shows the tapped value and the code's bars start on the tapped downbeat

#### Scenario: A button has focus

- **WHEN** the user clicked a mute button and then presses T four times
- **THEN** the tempo is tapped and the mute button does not toggle

#### Scenario: Tap button

- **WHEN** the user presses the Tap button four times on the beat
- **THEN** the button shows the count of taps and the fourth sets the tempo

### Requirement: Stored analysis

A finished level B analysis and the level A model of the bars heard SHALL be stored with the track. Reopening a matching file SHALL reuse them. A change to the analysis code that changes results SHALL mark stored analyses as old, analyse again on the next open and say so in the tab.

#### Scenario: Analysis version

- **WHEN** the analysis version goes up and the user reopens a stored track
- **THEN** the track is analysed again, the new result replaces the old one and the tab says the analysis was made again
