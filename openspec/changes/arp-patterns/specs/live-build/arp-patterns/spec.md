## ADDED Requirements

### Requirement: Arpeggio with arp
With the short patterns generator, an arpeggio whose chords all play the same order of their notes SHALL be written with the chords once and `.arp()` with the order once, and SHALL give the same notes as the written form.

#### Scenario: Four chords
- **WHEN** an arpeggio plays Am F C G with the order 0 1 2 3 2 1 0 2
- **THEN** its code is `note("<[…] […] […] […]>").arp("[0 1 2 3 2 1 0 2]*2")` and its notes are the same

#### Scenario: Different orders
- **WHEN** two chords play different orders
- **THEN** the arpeggio keeps its written form

### Requirement: Arpeggio growth
In the gradual and natural growth, an arpeggio SHALL grow in small moves of several kinds: its order string (from one note to the written order), its chords (from two notes to the full chord), its harmony (one held chord, then the progression) and its functions, like any track.

#### Scenario: First notes
- **WHEN** an arpeggio enters
- **THEN** its order starts from one note and grows in later steps

#### Scenario: Chord fills up
- **WHEN** the arpeggio has grown its order
- **THEN** a later step adds the missing notes to its chords

### Requirement: Pure Switch style
The Switch family SHALL include Switch · trance pure, without arpeggio, with one or two chords and a lead written with scale degrees; Switch · trance SHALL stay as the rich style.

#### Scenario: Pure song
- **WHEN** the director makes a song from Switch · trance pure
- **THEN** it has no arpeggio and at most two chords
