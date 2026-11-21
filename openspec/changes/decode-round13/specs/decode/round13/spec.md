# Spec Delta

## Purpose

What level B of the Decode tab writes where a pad fades out past the model's ending, where a quiet section holds one root, where a kick plays on every beat that the kick test misses, and where chords enter inside a section.

## ADDED Requirements

### Requirement: The song goes on over a fading pad

Level B SHALL write the song past the model's ending over the bars whose chord reads with a confidence of at least `TAIL_RULE.conf`, a tonal share of at least `TAIL_RULE.tonal` and a chord level of at least `TAIL_RULE.level`, with gaps of at most `TAIL_RULE.gap` bars, when at least `TAIL_RULE.bars` such bars follow the ending; the last section grows to the new end.

#### Scenario: A pad fading out after the drums stop

- **WHEN** a pad fades from -15 to -35 dB over the last 18 bars and the model's ending falls at -13 dB
- **THEN** the chords play on to the last bar whose chord level is not nil

#### Scenario: A drums-only outro

- **WHEN** the bars after the ending read chords with a tonal share under `TAIL_RULE.tonal`
- **THEN** the song ends at the model's ending

### Requirement: A quiet drone

In a section where no bar's chord is heard and drums are heard on at most `DRONE_RULE.drums` of the bars, when one root in the key's scale is read with a confidence of at least `DRONE_RULE.conf` on at least `DRONE_RULE.share` of the bars and those bars' mean tonal share is at least `DRONE_RULE.tonal`, level B SHALL write a power chord on that root on those bars, at the quiet gain of `QUIET_RULE`.

#### Scenario: An outro on the tonic

- **WHEN** an outro without drums reads E on 6 of its 8 bars in E minor, with a mean tonal share of 0.13
- **THEN** the outro writes `chord("E5")` at a reduced gain

### Requirement: Chords that enter inside a section

Level B SHALL write no chords on a section's first bars (at least `LATE_RULE.min`, a multiple of 4) when their mean `chordHeld` is under `LATE_RULE.held`, the bars after hold at least `LATE_RULE.ratio` times more and the first bars' chord level is at most `LATE_RULE.level` of the later bars'.

#### Scenario: A pad entering at bar 16 of one section

- **WHEN** a section of 32 bars has distorted drums from the start and a pad from bar 16, the drums' noise reading Gm with held 0.04 before bar 16 and 0.14 after
- **THEN** the chords start at bar 16

### Requirement: A kick on every beat

Level B SHALL measure per bar with drums the rise of the 90-250 Hz band at each sixteenth step (`kickShape`). In a section whose drum bars' mean drums level is at least `FULL_KICK.level` and whose weakest beat's mean rise on one step p of the beat is at least `FULL_KICK.low` dB and at least `FULL_KICK.margin` dB over the other steps, when another section of the song has a kick row with at least `FULL_KICK.beats` hits a bar on the steps p, and this section's kick row has fewer, level B SHALL write the kick on the four steps p of every drum bar and no other kick, and drop the claps a sixteenth before those kicks where they fall on at least `FULL_KICK.beats` beats.

#### Scenario: A drop under a loud sidechained bass

- **WHEN** a drop has a kick on every beat in its code, the kick test reads about one a bar, and the band rises 8.7 dB on the kick's step and 2.6 dB at most elsewhere
- **THEN** the drop writes four kicks a bar on that step

#### Scenario: A break with a bass on the beat

- **WHEN** a quiet break's band rises on every beat under a bass or a piano, its drums' level under `FULL_KICK.level`
- **THEN** no kicks are added
