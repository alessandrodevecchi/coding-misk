# Spec Delta

## ADDED Requirements

### Requirement: Short, sparse chops
A chop the director or a voice-track rewrite generates SHALL have a clip of at most 4 bars and SHALL play every other bar of its clip. Its rhythm SHALL be one of `"0 ~ ~ 1 ~ ~ 2 ~"`, `"0 ~ 1 ~ ~ ~ 2 ~"`, `"~ ~ 0 ~ 1 ~ ~ 2"` and `"0 ~ ~ ~ 1 ~ 2 ~"`. A song with one phrase SHALL NOT chop a whole section.

#### Scenario: One-phrase chop
- **WHEN** the radio generates a song whose voice track is one chop
- **THEN** the chop clip covers at most 4 bars and the chopped word is heard on at most 2 of them

### Requirement: Chop spacing in the song format
A chop pattern MAY carry `every`, the bars between two chops, a whole number from 1 to 64. Without it a chop SHALL play on every bar of its clip, so songs written before keep their sound.

#### Scenario: Every other bar
- **WHEN** a chop with `every` 2 has a clip of 4 bars starting on bar 33
- **THEN** it plays on bars 33 and 35

#### Scenario: Older song unchanged
- **WHEN** a song saved before this change has a chop clip of 16 bars with no `every`
- **THEN** the chop plays on each of the 16 bars as before

### Requirement: Refrain spacing and the most returns
A refrain the director or a voice-track rewrite generates SHALL return every 4 or 8 bars. A refrain pattern MAY carry `times`, the most starts it has in one clip, from 1 to 64; when its clip has more possible starts, the starts kept SHALL be spread over the clip, the first and the last included. A song whose voice track is one refrain SHALL get `times` 3, so the line is heard at most 3 times in the song.

#### Scenario: One-phrase refrain
- **WHEN** the radio generates a song of 152 bars whose voice track is one refrain, with an intro, two breaks and an outro
- **THEN** the refrain line is heard at most 3 times, at least 4 bars apart

#### Scenario: Refrain among several phrases
- **WHEN** a generated song has a refrain in one 8-bar quiet part
- **THEN** the line starts every 4 or every 8 bars of that part, never every 2

### Requirement: Line A in mixed lines
With "mixed" lines, line A SHALL be heard in at most 3 of the song's phrases: one phrase for 2 phrases or fewer, 2 for 3 to 5 phrases, 3 for 6 or more. Its phrases SHALL be spread over the song, the first phrase included, and never two in a row; the other phrases SHALL each get a new line. When the new lines run out the song SHALL speak fewer phrases (the count is a ceiling).

#### Scenario: Many phrases
- **WHEN** a song is generated with "mixed" lines and 12 phrases
- **THEN** line A is in phrases 1, 5 and 9 and the 9 other phrases each say a line not said elsewhere in the song

#### Scenario: Three phrases
- **WHEN** a song is generated with "mixed" lines and 3 phrases
- **THEN** the phrases say A, B, A

### Requirement: Vocabulary lines without repeats in a song
A vocabulary line the director or a voice-track rewrite generates SHALL be written into the song as its list of entries (a chop one entry; a refrain or an opening 2 or 3; a passage 3 or 4), so the song says the same words wherever it plays. No entry SHALL appear in two lines of the same voice track while the vocabulary group has unused entries. A line written as `vocab:<group>` SHALL still draw its entries when the song compiles, leaving out the entries the track's other lines write out.

#### Scenario: Line A and line B
- **WHEN** a song has line A from the vocabulary and line B "wide awake" from the same group
- **THEN** line A's entries do not include "wide awake"

#### Scenario: Written out
- **WHEN** a generated song with a vocabulary refrain is saved and opened in another language
- **THEN** the refrain says the same entries, translated

### Requirement: Every entry of a line heard
A voice-track line of several entries SHALL play all its entries in turn in each bar it starts on, one per quarter of the bar, in the order written. The stage captions, the videos and the radio's Coming next SHALL show, at each moment, the entry heard then.

#### Scenario: Three entries
- **WHEN** the line "after hours · wide awake · awake" starts on a bar
- **THEN** "after hours", "wide awake" and "awake" are heard one after another in that bar, and the caption shows each one while it is heard

#### Scenario: Entry without a sample
- **WHEN** the second entry of a line has no sample on this machine
- **THEN** the other entries play on their quarters, the second quarter is silent and no caption shows the missing entry

### Requirement: Generated voice lines fold their effects
With "Voice effects" on, every voice line the app generates (narrator lines and voice-track lines, in Classic, Crescendo and Live coder) SHALL show its effects folded into one song function call.

#### Scenario: Radio session
- **WHEN** 20 radio songs with a voice track are shown with "Voice effects" on
- **THEN** no voice line shows its effects written out
