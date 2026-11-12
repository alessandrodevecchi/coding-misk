## ADDED Requirements

### Requirement: Instrument name option
The code options SHALL include "Instrument name" with three choices: Random per song (default), `$:` (anonymous) and Name at line start. A second choice, "Names from", SHALL name a line after its instrument (`kick`, `snare`, `hats`, default) or after its track (`drums`, `drums2`, `drums3`). Both choices SHALL be part of the song's configuration and of every profile, SHALL be offered in Compose's code options, in the radio's Custom section and in the Decode tab's Options, and SHALL change only how the code looks.

#### Scenario: Name at line start
- **WHEN** luci-rosse plays in Crescendo with Instrument name "Name at line start"
- **THEN** its pattern lines start with the instrument's name (`kick:`, `snare:`, `texture:`) and no line starts with `$:` except an empty code's `$: silence`

#### Scenario: Track names
- **WHEN** the same song plays with names from the track
- **THEN** the lines of its drum track are `drums:`, `drums2:`, `drums3:`, whether or not the code shows the track headers

#### Scenario: Anonymous
- **WHEN** the same song plays with `$:`
- **THEN** its code is the code before this change

### Requirement: Safe names
Names SHALL never start with a capital letter (owner's rule): one word in lower case, several words in camelCase (`openHat`, `synthBass`), letters and digits only, starting with a letter, never a JavaScript reserved word, and unique in the code shown, numbered in order (`kick`, `kick2`, `openHat2`). A muted line SHALL be written `_name:` and a line played alone `Sname:`. The songs off air in a radio window SHALL be written with `$:`.

#### Scenario: Two lines of one instrument
- **WHEN** a drum track has two kick lines in the code shown
- **THEN** they are `kick:` and `kick2:`, and both play

#### Scenario: A snare
- **WHEN** a line plays a snare
- **THEN** its name is `snare` in lower case, so it never plays alone by Strudel's capital-S rule

### Requirement: Random per song
Random SHALL draw the form from the song's id, so the same song looks the same every time it is opened, played or replayed. A song that carries its own `lineNames` SHALL use it. In the Decode tab Random SHALL be drawn from the file's fingerprint, and Open in Compose SHALL write the form drawn into the new song's configuration.

#### Scenario: Decode to Compose
- **WHEN** a decoded track shows named lines and is opened in Compose
- **THEN** the song in Compose shows named lines too, its Lead `lead:` (or `_lead:` when muted)

#### Scenario: Replay
- **WHEN** a radio session is replayed
- **THEN** each song shows the same form as the first time

### Requirement: The same song in every form
A song SHALL grow and play the same events with `$:`, with instrument names and with track names: the growth, the radio steering and the written part's plan SHALL be measured on `$:`, and at every step the named code SHALL be the `$:` code with other labels.

#### Scenario: Check
- **WHEN** `npm run check:line-names` runs
- **THEN** built-in and generated songs in Classic (Live build on and off), Crescendo and Live coder give the same haps over two bars at every step in all three forms, the named code turned back to `$:` equals the `$:` code, and the plan of the written part is the same

### Requirement: Readers accept both forms
Mute and solo marks, the typing, the code widgets, Code over, the video, the code themes' dimmed lines and the Decode line count SHALL read pattern lines written with `$:` or with a name.

#### Scenario: Muted line dimmed
- **WHEN** a named line is muted (`_bass2:`) with dimmed muted lines on
- **THEN** it is dimmed like a muted `_$:` line
