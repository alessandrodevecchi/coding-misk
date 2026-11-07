## ADDED Requirements

<!-- This amends "Drum grooves from style rules" of the material-generator change, which is not archived yet: the
     four-on-the-floor kick no longer plays every beat in every groove. -->

### Requirement: Four-on-the-floor defining hits
A four-on-the-floor groove SHALL keep the kick on step 0 with a row that is one of the meter's kick variants, and the clap on the back beats. It SHALL no longer require the kick on every beat.

#### Scenario: Broken variant
- **WHEN** a four-on-the-floor groove in 4/4 draws the `broken` variant
- **THEN** the kick row is `x...x...x.....x.` and the clap plays on steps 4 and 12

### Requirement: Four-on-the-floor kick variants
A four-on-the-floor groove SHALL draw its kick from five variants defined on the meter's beats: `straight` (every beat), `pickup` (every beat and the bar's last 16th), `push` (every beat and the step two 16ths before the bar's end), `rolling` (every beat and the 16th before each back beat) and `broken` (the last beat moved to its off-beat 8th, or left out past the bar). A variant equal to an earlier one in the same meter SHALL be left out of that meter.

#### Scenario: Variants in 4/4
- **WHEN** four-on-the-floor grooves are generated in 4/4 over many seeds at mid energy
- **THEN** the kick rows are `x...x...x...x...`, `x...x...x...x..x`, `x...x...x...x.x.`, `x..xx...x..xx...` and `x...x...x.....x.`, each at least once

#### Scenario: Every meter
- **WHEN** the variants are built in 3/4, 4/4, 5/4 and 7/8
- **THEN** every row starts on step 0, has at least 3 hits inside the bar, and the rows of one meter are distinct (four in 7/8, five in the others)

### Requirement: Variant draw by energy
The variant SHALL be drawn with weights per energy band, with `push` never at low energy. The other families SHALL draw as before for the same seed.

#### Scenario: Low energy
- **WHEN** four-on-the-floor grooves are generated at energy 0.2 over 300 seeds
- **THEN** none uses `push`

#### Scenario: Other families unchanged
- **WHEN** a breakbeat groove is generated with the same seed, style and energy before and after this change
- **THEN** the rows are the same

### Requirement: Avoid kicks already playing
The generator SHALL accept a list of kick rows to avoid (`avoidKicks`) and leave those variants out of the draw, unless the list holds all of them.

#### Scenario: One variant left
- **WHEN** a four-on-the-floor groove in 4/4 is generated with `avoidKicks` listing the `straight`, `pickup`, `push` and `rolling` rows
- **THEN** the kick row is `x...x...x.....x.`
