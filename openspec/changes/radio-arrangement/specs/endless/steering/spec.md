## ADDED Requirements

### Requirement: One Add and one Remove per instrument
The console's Arrangement group SHALL offer a "+" and a "−" button for each instrument: kick, beat, bass, arp, melody, guitar, pad and texture. It SHALL show only the instruments the song's style can play or the song already holds, laid out in two rows (rhythm and low end on the first, melodic and colour parts on the second), with "More complex" and "Simpler" kept in the group. Labels SHALL exist in Italian and English. The coarse buttons for drums and lead SHALL no longer show. Each button SHALL have a tooltip and, when disabled, the reason.

#### Scenario: A style without guitar
- **WHEN** the song on air comes from a style with no guitar part and holds no guitar track
- **THEN** the Arrangement group shows no guitar buttons

#### Scenario: Italian labels
- **WHEN** the interface language is Italian
- **THEN** the buttons read "+ cassa", "− cassa", "+ ritmica", "+ basso", "+ arpeggio", "+ melodia", "+ chitarra", "+ pad", "+ texture" and their "−" pairs

### Requirement: Several tracks of one instrument
"+" on an instrument SHALL bring in one more track of that instrument from the next phrase, even when a track of it already plays: first a silent track of that instrument the song already holds, else a new one. "−" SHALL remove one track of that instrument: the last one the listener added, else the one that came in last. "−" SHALL be disabled when no track of the instrument plays, when every playing one is locked, or when it would leave the song with no track playing. When the song has no track of an instrument, "+" SHALL create one from the song's style.

#### Scenario: A second arp
- **WHEN** one arp plays and the listener presses "+ arp"
- **THEN** from the next phrase two arp tracks play, named "Arp" and "Arp 2"

#### Scenario: Remove the last one added
- **WHEN** three pads play, the third added by the listener, and the listener presses "− pad"
- **THEN** from the next phrase the third pad stops and the other two keep playing

#### Scenario: An instrument the song lacks
- **WHEN** a song has no guitar, its style has one, and the listener presses "+ guitar"
- **THEN** a guitar with the style's sound and material starts at the next phrase

### Requirement: A new track sounds different and fits
A track added beside tracks of the same instrument SHALL take a sound and a pattern from the song's style that differ from those of the tracks of that instrument already in the song, while the style offers another one. Its register SHALL be offset from theirs (another octave or range) where the instrument allows it, and its level SHALL be set below the existing tracks of that instrument. A track of an instrument with notes SHALL play in the song's key and chords.

#### Scenario: Two arps apart
- **WHEN** the listener adds a second arp
- **THEN** the second arp uses another wave or sound and another pattern than the first, an octave away from it, at a lower gain

### Requirement: Track limits from the console
Generated songs SHALL keep the style's usual and maximum track counts as their defaults, and "More complex" and "Simpler" SHALL keep moving the usual count by one. Tracks added with "+" SHALL be allowed past the style's maximum, up to 12 tracks playing at once in a song; at 12, every "+" SHALL be disabled with the reason. Each instrument SHALL have its own cap on tracks of that instrument (one kick; see the design), and "+" SHALL be disabled with the reason when it is reached. The director SHALL not remove a track the listener added before the song's last part, unless the listener removes it.

#### Scenario: Past the style's maximum
- **WHEN** a song of a style with a maximum of 6 tracks plays 6 and the listener presses "+ pad"
- **THEN** a seventh track starts at the next phrase

#### Scenario: The safety cap
- **WHEN** 12 tracks play
- **THEN** every "+" button is disabled and its tooltip says the song plays as many tracks as it can

### Requirement: Headroom as tracks add up
When more tracks play than the song's usual count, the song SHALL lower the levels of the tracks the listener did not set by hand, so the level into the output limiter stays near what the song had at its usual count. The output SHALL stay below clipping with 12 tracks playing. A volume the listener set in the mixer SHALL be kept as set.

#### Scenario: Twelve tracks
- **WHEN** the listener adds tracks until 12 play
- **THEN** the measured output stays below 1.0 and no single track line rises above its level before the additions

### Requirement: Add a saved pattern
The console SHALL offer an "Add a saved pattern" panel listing the user's saved patterns that fit the song on air: a pattern fits when the song's style can play its instrument type (or the song holds a track of that type) and its meter has the song's number of steps per bar. The panel SHALL be collapsed by default to a compact list (name, type and a small preview drawing per pattern) and SHALL expand to a fuller view with larger cards (preview drawing, type, key, tempo and styles of the pattern). Each pattern SHALL have a preview listen, played alone in the song's key and tempo with the radio lowered, and stopped by a second press or by another preview. The listener SHALL choose to bring the pattern in as a new track or to replace one playing track of the same type, from the next phrase. When no saved pattern fits, the panel SHALL say why (no saved patterns, or none in this meter or type).

#### Scenario: Add as a new track
- **WHEN** the listener expands the panel, listens to a saved bassline and presses "Add as new track"
- **THEN** from the next phrase a new bass track plays that bassline in the song's key and tempo

#### Scenario: Replace a part
- **WHEN** the listener picks a saved melody and "Replace Lead"
- **THEN** from the next phrase the lead track plays the saved melody with its own sound, and the rest of the song is unchanged

#### Scenario: Another meter
- **WHEN** the song on air is in 7/8 and every saved pattern is in 4/4
- **THEN** the panel lists none and says no saved pattern is in this meter

### Requirement: Saved patterns follow the song's key and tempo
A saved pattern brought into a song SHALL play at the song's tempo, in the song's key: a pattern written as scale degrees or chords SHALL follow the song's key and chords, and a pattern written as fixed notes SHALL be moved from its own key to the song's key by the smallest interval. A melody written in its own chromatic mode SHALL keep its mode and move by key only. A pattern added as a new track SHALL play its own saved sound when that sound is loaded, else a sound of its type from the song's style; a pattern replacing a track SHALL keep that track's sound. The command SHALL record a copy of the pattern, so a later change to the library does not change the replayed session.

#### Scenario: Key change
- **WHEN** a bassline saved in A minor is added to a song in D minor
- **THEN** the bassline plays in D minor

#### Scenario: The library changes later
- **WHEN** the listener deletes the saved pattern after adding it and replays the session
- **THEN** the replayed song plays the pattern as it was heard

### Requirement: Target of Vary and Swap
Vary and Swap SHALL offer a target selector next to the part picker: "Auto" (the default) or one of the playing tracks of the chosen part by name ("Arp", "Arp 2"). With "Auto", Vary and Swap SHALL rewrite one playing, unlocked track of the part, chosen by a rule that favours the track rewritten least recently and is seeded by the command, so the result replays the same. With a named track, they SHALL rewrite that track only. The part picker SHALL list lead, bass, arp, pad and guitar. The queue SHALL name the target track.

#### Scenario: Auto with two arps
- **WHEN** two arps play and the listener presses Vary on arp with the target "Auto" twice, on two phrases
- **THEN** each press rewrites one arp, the second press the arp the first one did not rewrite

#### Scenario: A named track
- **WHEN** the listener picks the target "Pad 2" and presses Swap
- **THEN** only "Pad 2" changes from the next phrase

### Requirement: Part harmony
The console SHALL offer a "Part harmony" command for one part with notes (lead, bass, arp, pad, guitar), with the same target selector as Vary and a treatment selector: "Auto" (the default), "In thirds" (the line moved a third up in the song's scale), "Octave" (the line an octave up or down, within the instrument's range), "Chord colour" (chords voiced with added sevenths, ninths or suspensions; pads and guitars only) and "Inversion" (chords or arpeggios on another inversion). With "Auto" the command SHALL pick a treatment that suits the part and differs from its current one, seeded by the command. The part SHALL stay in the song's key and chords; Song harmony keeps changing chords and key for every part.

#### Scenario: Pad colour
- **WHEN** the listener picks pad, the treatment "Chord colour" and presses Part harmony
- **THEN** from the next phrase the pad plays the same chords with added colour notes, and no other part changes

#### Scenario: Auto on the lead
- **WHEN** the listener presses Part harmony on the lead with "Auto"
- **THEN** from the next phrase the lead plays a treated line in the song's key, and the queue names the treatment chosen

### Requirement: Arrangement commands follow the scope
Every command of this change SHALL follow the console scope switch. With "This song only" it SHALL change the song on air. With "The whole session" it SHALL also apply to every later song of the session where it can: "+" and "−" of an instrument SHALL add or remove a track of that instrument in later songs whose style has it, a saved pattern SHALL join later songs where it fits as a new track, and a Part harmony treatment SHALL apply to that part in later songs. Vary and Swap SHALL act on the song on air only, whatever the scope, and their tooltip SHALL say so in session scope.

#### Scenario: More arps for the session
- **WHEN** the scope is "The whole session" and the listener presses "+ arp"
- **THEN** the song on air gains an arp, and the following songs whose style has an arp play one arp more than the director would give them

### Requirement: Arrangement commands replay the same
Every command of this change SHALL be recorded with the session's console commands, with its instrument, target track, treatment, scope and, for a saved pattern, the copied pattern. Replay, saved radio sessions and playlists SHALL rebuild the same songs from them. Sessions recorded before this change, with the coarse drums and lead commands, SHALL replay as they were heard. The director version SHALL be raised once in this change.

#### Scenario: Replay with two arps and a saved pattern
- **WHEN** a session where the listener added a second arp and a saved bassline is replayed from a playlist
- **THEN** the replayed songs play the second arp and the bassline at the same bars with the same notes

#### Scenario: An old session
- **WHEN** a playlist holds a session saved with "− lead"
- **THEN** it replays with the lead removed as it was heard
