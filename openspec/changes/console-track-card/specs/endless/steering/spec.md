# Spec Delta

## ADDED Requirements

### Requirement: Track card in the Mixer
The name of each Mixer row of the console SHALL open a card for that track under its row; at most one card SHALL be open at a time, and pressing the name again or Escape SHALL close it. The card SHALL stay open while the console redraws and the track stays in the Mixer, and SHALL close when the song changes. The name of a locked track (its own lock or its instrument's) SHALL be disabled, its tooltip saying the track is locked. Voice and riser tracks SHALL have no card. The card SHALL fit a 400 px wide screen without horizontal scrolling.

#### Scenario: One card at a time
- **WHEN** the card of the bass is open and the listener presses the name of the arp
- **THEN** the bass's card closes and the arp's card opens under the arp's row

#### Scenario: Locked track
- **WHEN** the listener locks the pad in the Mixer
- **THEN** the pad's name is disabled, its tooltip says it is locked, and its card closes if it was open

### Requirement: New sound for one track
The card's Sound row SHALL offer «New sound», which rolls a sound for that track with the Compose sound dice in the style of the song on air, keeping the groups the listener locked. The new sound SHALL enter at the next phrase start in the same batch as the «+» pressed for that boundary, SHALL show in the Queue with a ✕ until a third of a bar before it enters, and SHALL have its sounds loaded before it enters. The Sound row SHALL list the track's sounds of this song as chips (the original and each roll), mark the one on air and the one waiting, bring a chip's sound back at the next phrase start, and offer «Undo», which takes a waiting sound back or returns to the sound before. The same commands SHALL give the same song in a replay.

#### Scenario: A new bass sound
- **WHEN** the bass card is open and the listener presses «New sound» 6 seconds before a phrase start
- **THEN** the Queue shows "Bass · sound #1" with ✕, chip #1 is marked as coming, and from that phrase start the bass plays the new sound while chip #1 is lit

#### Scenario: Back to the original
- **WHEN** the bass plays sound #2 and the listener presses the «Original» chip
- **THEN** from the next phrase start the bass plays the sound it had before the first roll

#### Scenario: Undo a waiting sound
- **WHEN** sound #3 is waiting in the Queue and the listener presses «Undo»
- **THEN** sound #3 leaves the Queue and the track keeps the sound on air

#### Scenario: The code comment of a new sound
- **WHEN** a new drum sound with a tone and a per-hit variation enters, and later the original without them
- **THEN** the code comments read like "// you: set beat kit RolandTR909 tone kick/snare/hats vary decay+gain+pan" and "// you: set beat kit OberheimDMX -tone -vary", never with "[object Object]" or "null"

### Requirement: Movement in the sound roll
For melodic tracks the roll SHALL also draw at most one movement device (Sweep, LFO, Pump or Gate) or none, inside the device's argument ranges, never past two movement devices on the track, and never one the rack validator rejects. A «Movement» lock SHALL keep the track's movement devices out of the roll. Path SHALL NOT be rolled in the radio.

#### Scenario: Movement locked
- **WHEN** the «Movement» lock is on and the listener rolls a new pad sound
- **THEN** the pad's movement devices stay exactly as they were

### Requirement: New pattern for one track
The card's Pattern row SHALL offer «New pattern», which makes a pattern for that track with the radio's generator, in the key, chords and energy of the next phrase. «Listen» SHALL play it in the listener's headphones alone, in the song's key and tempo, without putting it on air, and a second press SHALL stop it. «Use» SHALL put it on that track from the next phrase start, in the batch of that boundary, shown in the Queue with a ✕. «Save» SHALL add it to the pattern library. «From the library» SHALL list the saved patterns of the track's instrument that fit the song, and its «Replace» SHALL put the chosen one on that track from the next phrase start, counting one use. Texture tracks SHALL have no Pattern row.

#### Scenario: Listen, then use
- **WHEN** the listener presses «New pattern» on the arp card, then «Listen», then «Use»
- **THEN** the pattern plays in the headphones only, and from the next phrase start the arp plays it on air

#### Scenario: Replace from the library
- **WHEN** the library holds two saved basslines and a melody, and the listener opens «From the library» on the bass card
- **THEN** the menu lists the two basslines only, and «Replace» puts the chosen one on the bass from the next phrase start

### Requirement: Movement row reserved for live knobs
The card SHALL reserve a Movement row for the live knobs of the track's movement devices (sound-modulation). Until those knobs exist the row SHALL NOT be shown.

#### Scenario: No knobs yet
- **WHEN** the listener opens the card of a pad that plays an LFO
- **THEN** the card shows the Sound and Pattern rows and no Movement row

### Requirement: Console order with the track card
The Sound group SHALL hold Darker, Brighter, Dirtier, Cleaner and More space; «Instrument» SHALL NOT be in it and the Mixer rows SHALL NOT have the instrument key, while recorded sessions that used them replay the same. The I key SHALL roll a new sound in the open card, or open the card of the lead track playing when no card is open. The «Add a saved pattern» panel SHALL follow the Mixer and SHALL be hidden by default; a listener's earlier choice to show it SHALL be kept, and the P key SHALL still show it and focus its search.

#### Scenario: Saved patterns below the Mixer
- **WHEN** a listener who never opened the saved patterns panel starts the radio
- **THEN** the panel's title row shows after the Mixer, with its body hidden

#### Scenario: I key
- **WHEN** no card is open, the song plays a hook and a bass, and the listener presses I
- **THEN** the hook's card opens
