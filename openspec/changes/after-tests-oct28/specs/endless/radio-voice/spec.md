## ADDED Requirements

### Requirement: The voice track in songs grown on air
A Crescendo or Live coder song grown on air SHALL keep its voice track's lines and their number, placed over the whole grown song on parts of the kinds the track may speak in, the growth included. During the growth, the voice track SHALL speak only in quiet parts, where few tracks play at those bars. An entry line SHALL stay before its bound track's first entry. When the song builds live, the voice track SHALL come in at its first line.

#### Scenario: Live coder song with a voice track
- **WHEN** a pure-trance Live coder song grows on air and its director's song has one voice-track line
- **THEN** the grown song has one line too, and it sounds in the first third of the song when a part of the allowed kinds is there

#### Scenario: A line in the growth
- **WHEN** the growth of a Live coder song has a quiet part with two tracks and a busy part with eight, and the voice track may speak in quiet parts
- **THEN** a line may fall in the quiet part, and no line falls in the busy part

#### Scenario: Same lines
- **WHEN** the director's song has a refrain "stay with me" and a passage
- **THEN** the grown song speaks the same two texts

### Requirement: Typed lines always sound
A line typed in the console SHALL sound on its bar, with Say now and with At the right moment, whether the voice track already plays or not. The radio SHALL evaluate the code on the line's bar. Say now SHALL pick the first bar that starts at least half a bar after the sample is ready.

#### Scenario: Voice track already playing
- **WHEN** the voice track already plays, no other step falls near bar 11, and the owner presses Say now at bar 10.2 with the sample ready at once
- **THEN** the line sounds at bar 11 without a seek

#### Scenario: At the right moment
- **WHEN** At the right moment places a line at bar 64 and no director step falls on bar 64
- **THEN** the line sounds at bar 64

### Requirement: Poetic images at every entry
With the poetic narrator style, the narrator SHALL say an image for every track entry: an add, a clone, an unmute, or the release of the last solo line that brings silent tracks in. The image SHALL be said in the bar before the entry when that bar belongs to an earlier step, else on the entry's bar, on any bar of the song. In the radio, a song's first bar SHALL count as its start. With Narrated growth on, the step lines SHALL stay as they are, with the images in addition.

#### Scenario: Entry on a section boundary
- **WHEN** a track comes in on bar 56, where a new section starts
- **THEN** the narrator says an image on bar 55 or bar 56

#### Scenario: Second song of the radio
- **WHEN** the second song of a radio session starts with a kick
- **THEN** the narrator says an image at its start, as in the first song

#### Scenario: A mid-set opening
- **WHEN** a Live coder opening adds every track at bar 0 alone and releases them with the last unsolo at bar 35
- **THEN** the narrator says an image at bar 34 or 35

### Requirement: The narrator yields only to lines that sound
The narrator SHALL yield only on bars where a voice-track line sounds: a line with no sample, or on a muted track, SHALL NOT silence the narrator.

#### Scenario: A line without a sample
- **WHEN** a voice-track line has no sample on this machine and a narrator line falls on its bar
- **THEN** the narrator says its line
