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
"+" on an instrument SHALL bring in one more track of that instrument from the next phrase, even when a track of it already plays: first a silent track of that instrument the song already holds, else a new one. "−" SHALL remove one track of that instrument: the last one the listener added, else the one that came in last. "−" SHALL be disabled when no track of the instrument plays or when it would leave the song with no track playing. A lock SHALL NOT disable "+" or "−". When the song has no track of an instrument, "+" SHALL create one from the song's style.

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
Generated songs SHALL keep the style's usual and maximum track counts as their defaults, and "More complex" and "Simpler" SHALL keep moving the usual count by one. Tracks added with "+" SHALL be allowed past the style's maximum, up to 12 tracks playing at once in a song; at 12, every "+" SHALL be disabled with the reason. There SHALL be no cap per instrument. When "+" brings an instrument past its recommended count (kick 1, beat 2, bass 2, the others 3), the track SHALL come in and the console SHALL show a warning naming the instrument's count and the recommended values; the "+" tooltip SHALL say it before the press. The console SHALL show how many tracks play, the style's usual maximum and the cap of 12.

#### Scenario: Past the style's maximum
- **WHEN** a song of a style with a maximum of 6 tracks plays 6 and the listener presses "+ pad"
- **THEN** a seventh track starts at the next phrase

#### Scenario: Two kicks
- **WHEN** one kick plays and the listener presses "+ cassa"
- **THEN** a second kick with another groove starts at the next phrase, the count badge reads "×2" in the warning colour, and a line says that one kick is usually enough, with the recommended values

#### Scenario: The safety cap
- **WHEN** 12 tracks play
- **THEN** every "+" button is disabled and its tooltip says the song plays as many tracks as it can

### Requirement: Tracks the listener adds stay
The director SHALL NOT remove for good a track the listener added before the song's final outro, whether its instrument is locked or not; only the listener SHALL remove it, with "−" or the mixer. An unlocked listener track MAY sit out a break or the charge before a drop and SHALL come back at the phrase after it; the director MAY change its pattern, filter, drive and effects.

#### Scenario: Still there a few seconds later
- **WHEN** the listener presses "+ pad" and the director's plan for the next phrases would strip a pad
- **THEN** the added pad plays from the next phrase and still plays two phrases later, and in every later phrase up to the outro except during a break or a charge

#### Scenario: Back after a break
- **WHEN** an unlocked listener arp sits out a break
- **THEN** it plays again from the phrase after the break

### Requirement: A lock per instrument
Each instrument in the Arrangement group SHALL have a lock next to its "+" and "−", open by default. A closed lock SHALL keep the director from changing that instrument for the rest of the song: it SHALL NOT add, remove, vary or reshape any of its tracks, including tracks the listener adds later, and a locked instrument that plays SHALL keep playing through breaks and the charge before a drop. The listener's own commands SHALL still act on a locked instrument. The console lock and the mixer's per-track locks SHALL stay in sync: locking an instrument SHALL lock every one of its tracks in the mixer, and when only some of its tracks are locked the console lock SHALL show a half state that locks them all on a click. Lock icons SHALL be drawn icons, in the console and in the mixer.

#### Scenario: Locked bass
- **WHEN** the listener closes the bass lock and the director's plan would strip the bass at the next break
- **THEN** the bass keeps playing with its pattern and sound until the song ends, and the bass row in the mixer shows a closed lock

#### Scenario: Listener still in charge
- **WHEN** the bass is locked and the listener presses "+ basso"
- **THEN** a second bass comes in at the next phrase, locked as well

#### Scenario: Mixer and console in sync
- **WHEN** two arps play, the instrument is locked, and the listener opens the lock of "Arp 2" in the mixer
- **THEN** "Arp 2" is unlocked and the console's arp lock shows the half state

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

### Requirement: Riser row
The Arrangement group SHALL have a Riser row with a button "+ Riser before the next change" ("+ Riser al prossimo cambio"), a length menu (Auto, 2, 4, 8 bars), a direction menu (up, down) and a lock for the director's risers. The button SHALL place one riser that ends on the next phrase where the song's part changes (or the next double phrase when no change is left before the outro), with the chosen length and direction, replacing a riser the director placed on that change. A closed riser lock SHALL keep the director from placing risers in the song; the listener's risers SHALL still play. The row SHALL have a tooltip that says what a riser is. The riser SHALL NOT count toward the 12-track cap.

#### Scenario: A riser into the drop
- **WHEN** the next part change is a drop 6 bars ahead and the listener picks 4 bars, up, and presses the button
- **THEN** a noise sweep rises over the 4 bars before the drop and ends on its first bar

#### Scenario: No risers from the director
- **WHEN** the listener closes the riser lock
- **THEN** the director places no riser in the rest of the song

### Requirement: Song harmony menu
Song harmony SHALL offer a menu for the progression (Auto or one of the style's progressions) and for the key (Auto, a fifth up, a fifth down, the relative key), with Auto as the default. With Auto, "Change chords" and "Change key" SHALL pick as they do today; with a choice, the next press SHALL apply that progression or key.

#### Scenario: A chosen progression
- **WHEN** the listener picks a named progression in the menu and presses "Change chords"
- **THEN** from the next double phrase every part with notes follows that progression

### Requirement: Arrangement commands follow the scope
Every command of this change SHALL follow the console scope switch. With "This song only" it SHALL change the song on air. With "The whole session" it SHALL also apply to every later song of the session where it can: "+" and "−" of an instrument SHALL add or remove a track of that instrument in later songs whose style has it, a saved pattern SHALL join later songs where it fits as a new track, and a Part harmony treatment SHALL apply to that part in later songs. An instrument lock given in session scope SHALL lock that instrument in later songs from the moment it first plays there. Vary, Swap and the riser SHALL act on the song on air only, whatever the scope, and their tooltip SHALL say so in session scope. The scope SHALL decide how long a choice lasts and the lock whether the director may change it: an unlocked session choice SHALL apply in each later song and leave the director free there; a locked one SHALL apply and stay as set.

#### Scenario: More arps for the session
- **WHEN** the scope is "The whole session" and the listener presses "+ arp"
- **THEN** the song on air gains an arp, and the following songs whose style has an arp play one arp more than the director would give them

#### Scenario: A saved pattern for the session, unlocked
- **WHEN** the scope is "The whole session", the bass lock is open and the listener adds a saved bassline as a new track
- **THEN** later songs where it fits play the bassline as a new bass track, and the director may vary its filter or effects there but does not remove it before the outro

#### Scenario: A lock for the session
- **WHEN** the scope is "The whole session" and the listener locks the pad
- **THEN** in each later song, once a pad plays, the director leaves the pad tracks as they are until that song ends

### Requirement: Arrangement commands replay the same
Every command of this change SHALL be recorded with the session's console commands, with its instrument, target track, treatment, lock, riser length and direction, scope and, for a saved pattern, the copied pattern. Replay, saved radio sessions and playlists SHALL rebuild the same songs from them. Sessions recorded before this change, with the coarse drums and lead commands, SHALL replay as they were heard. The director version SHALL be raised once in this change.

#### Scenario: Replay with two arps and a saved pattern
- **WHEN** a session where the listener added a second arp and a saved bassline is replayed from a playlist
- **THEN** the replayed songs play the second arp and the bassline at the same bars with the same notes

#### Scenario: An old session
- **WHEN** a playlist holds a session saved with "− lead"
- **THEN** it replays with the lead removed as it was heard
