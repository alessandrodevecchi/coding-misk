## ADDED Requirements

### Requirement: Editable styles of a saved pattern
A saved pattern SHALL show its styles and let the owner add or remove them. New SHALL link the style chosen; Save as pattern SHALL link the song's styles.

#### Scenario: Add a style
- **WHEN** the owner adds drum and bass to a saved riff
- **THEN** the riff shows in the drum and bass list and in the radio pool of that style

### Requirement: New parts are kept until discarded
Parts made with New SHALL stay at the top of the list under "New, not saved" until saved or discarded, across tab changes and reloads. A selected new part SHALL have Discard, and the section SHALL have Discard all, with a confirmation strip.

#### Scenario: Reload
- **WHEN** the owner makes two new basslines and reloads the page
- **THEN** both are still under "New, not saved"

### Requirement: Guitar riffs
New on riffs SHALL offer a guitar riff and a bass riff; the guitar riff SHALL come from the guitar generator and always be a riff. "Compose a part" on a guitar track SHALL offer riff or chords.

#### Scenario: Guitar riff
- **WHEN** the owner presses New on riffs with guitar riff chosen
- **THEN** the part plays power chord riffs on a distorted guitar, not a bassline
