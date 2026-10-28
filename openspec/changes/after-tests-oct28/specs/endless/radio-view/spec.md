## ADDED Requirements

### Requirement: Step labels in Next changes
The radio's "Next changes" list SHALL show a label for every build action a step can carry (add, remove, set, pattern, rack, unrack, hide, reveal, clone, comment, notes, variant, mute, unmute, solo, unsolo, mask), in Italian and English, naming the track by its name. No label SHALL read "undefined" or be empty. A step with no action and no spoken line SHALL NOT be listed.

#### Scenario: A pattern level
- **WHEN** the next step of a grown song is `{ "pattern": { "track": "kick", "level": 1 } }`
- **THEN** the row reads "kick: variant 1" in English and "kick: variante 1" in Italian

#### Scenario: A section step
- **WHEN** a code-of-the-moment step `{ "at": 88 }` with no words comes next
- **THEN** it has no row in the list

### Requirement: Which voice speaks, and what
Each row of "Next changes" with a spoken line SHALL carry the tag V:N (the narrator) or V:T (the voice track), followed in italics by the words heard there. The words SHALL come from the same schedule the code is built from. Each line of the voice track SHALL have a row at its bar, also where no step falls. Each tag SHALL have a tooltip naming the voice ("Voce: narratore", "Voce: traccia").

#### Scenario: A poetic image
- **WHEN** the narrator is poetic and says "a low tide rising" before the bass comes in at bar 46
- **THEN** the row of bar 45 or 46 shows `V:N “a low tide rising”`, not the step's own line

#### Scenario: A voice-track line alone
- **WHEN** the voice track says "the night goes on" at bar 57 and no step falls on bar 57
- **THEN** the list has a row for bar 57 with `V:T “the night goes on”`

#### Scenario: The narrator yields
- **WHEN** a step line falls on a bar where the voice track speaks
- **THEN** the row shows the step label and `V:T` with the voice track's words, and no `V:N`
