## MODIFIED Requirements

### Requirement: Caption timing

A caption SHALL appear on the bar its line is spoken. Its time on screen SHALL be the length of its sample plus 1.5 seconds, never less than 3 seconds and at most 4 bars. When the next line of the same speaker starts earlier, it SHALL replace the caption at once, also before 3 seconds. The last line of a run SHALL follow the same rule. A line without a measured length SHALL stay 2 bars, at least 3 seconds. The rule SHALL hold for every speaker and for a line spoken late.

#### Scenario: Short line

- **WHEN** the narrator says a line whose sample lasts 1.3 seconds at 124 BPM and no other narrator line follows within 3 seconds
- **THEN** the caption shows for 3 seconds, not for 2.8 seconds and not for 4 bars

#### Scenario: Longer line

- **WHEN** the narrator says a line whose sample lasts 2 seconds at 124 BPM and the next narrator line is 4 bars later
- **THEN** the caption shows for 3.5 seconds, the sample plus 1.5 seconds

#### Scenario: The next line comes first

- **WHEN** a narrator line starts on bar 5 and the next narrator line starts on bar 6, 1.94 seconds later at 124 BPM
- **THEN** the first caption shows until bar 6 and the second replaces it there, before 3 seconds, with no gap and no overlap

#### Scenario: The last line of a run

- **WHEN** a narrator line whose sample lasts 1 second is followed by no other narrator line for 8 bars
- **THEN** its caption shows for 3 seconds and then leaves

#### Scenario: The voice track

- **WHEN** a voice-track line whose sample lasts 0.8 seconds starts and no other voice-track line follows within 3 seconds
- **THEN** its caption shows for 3 seconds

#### Scenario: A line spoken late

- **WHEN** a narrator line with no sample at all gets its sample from the voice helper and is spoken on the next beat of its bar
- **THEN** its caption shows from that beat for its sample plus 1.5 seconds, at least 3 seconds and at most 4 bars

### Requirement: Step line tag

When a narrator line is shown, the step line of the step it speaks for SHALL show as a small secondary tag below it, in the same box, unless the setting hides it: for an entry image the entering step's line, for a movement image the line of the step on its bar. The tag SHALL appear and leave with its narrator line. With the poetic style, a tag SHALL NOT show without its narrator line, and a step that no narrator line speaks for SHALL show no tag. An entry whose step has no step line SHALL show its image with no tag. With the explaining style the behaviour SHALL stay as before this change.

#### Scenario: Explaining style

- **WHEN** luci-rosse plays with the explaining style
- **THEN** each step line shows once, as the caption, and no tag

#### Scenario: A movement image

- **WHEN** the poetic narrator says a movement image on bar 9, whose step line is "more hats", and the image's caption ends at bar 10.74
- **THEN** "more hats" shows as the tag from bar 9 to bar 10.74 and not after it

#### Scenario: An entry image

- **WHEN** the poetic narrator says the bass's image on bar 12, the bar before the step "need bass" brings the bass in on bar 13
- **THEN** the tag under the image is "need bass" from bar 12, not the line of the step before, and it leaves with the image

#### Scenario: An entry with no step line

- **WHEN** the pad enters on bar 24 from a step with no step line and the poetic narrator says the pad's image on bar 23
- **THEN** the image shows with no tag

#### Scenario: A step no line speaks for

- **WHEN** a step with the step line "more hats" on bar 6 says nothing with the poetic style, because an entry image takes its bar
- **THEN** "more hats" never shows as a tag, neither under the image nor after it

#### Scenario: Explaining line with no sample

- **WHEN** an explaining line has no sample in any bank and no voice helper runs
- **THEN** no caption shows it and its step line shows alone as the tag for 4 bars from its bar, as before this change

#### Scenario: Old behaviour unchanged

- **WHEN** the user picks "al posto del parlato" for the step line
- **THEN** every step line shows as the caption for 4 bars from its step's bar, as before this change

### Requirement: Fallback chain for a missing sample

At play time a line SHALL use, in order: the speaker's own sample, the default voice's sample of the same line with the speaker's sound settings, a sample made on the fly by the voice helper and then spoken as soon as it is ready, and only when all fail no sound, its text shown as the step tag and never as a spoken caption. A line already heard on its bar, from any bank, SHALL NOT be played again when a sample for it arrives later; the next time that text comes up it SHALL use the best sample then present. Only a line that had no sample at all SHALL be spoken late, and no other line SHALL be chosen in its place.

#### Scenario: Sample made on the fly

- **WHEN** a narrator line has no sample in any bank and the voice helper runs
- **THEN** the helper makes the sample, the line is spoken when it is ready, and it is captioned when it is spoken

#### Scenario: Speaker variant missing

- **WHEN** a narrator line has a sample in the default voice but not in the song's speaker
- **THEN** the default voice's sample plays with the speaker's settings, and the line is captioned

#### Scenario: The speaker's sample arrives after the default voice spoke

- **WHEN** a phrase of mine is spoken on bar 9 by the default voice, and the voice helper delivers the speaker's own sample of it during bar 9
- **THEN** the phrase is not heard a second time on bar 9 or bar 10
- **AND** the next time the song says that phrase, it uses the speaker's own sample

#### Scenario: Nothing else in its place

- **WHEN** a line with no sample at all misses its bar and its sample does not arrive within two bars
- **THEN** the line stays silent and no other phrase is spoken in its place

## ADDED Requirements

### Requirement: First lines heard on a cold start

Play in Compose, and a seek while playing, SHALL wait for the voice samples of the first 4 bars from the play position before the song starts, at most about 400 ms; the other voice samples of the song SHALL load in the background, in bar order. A line on the first bar SHALL be heard on a start with no voice sample loaded yet.

#### Scenario: Cold start

- **WHEN** the page is opened, luci-rosse is grown in Crescendo with the poetic style, and Play is pressed for the first time
- **THEN** the narrator's line on bar 1 is heard on bar 1
- **AND** the audio engine reports no "took too long" for a voice sample of the first 4 bars

#### Scenario: Seek

- **WHEN** the song is playing and the user seeks to bar 40, where a narrator line starts
- **THEN** the song resumes on bar 40 once that line's sample is loaded or the wait is over, and with the sample loaded within the wait the line is heard on bar 40

#### Scenario: A slow sample

- **WHEN** a sample of the first 4 bars does not load within the wait
- **THEN** the song starts after the wait anyway, and that sample keeps loading in the background
