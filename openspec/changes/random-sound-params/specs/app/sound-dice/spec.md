# Spec Delta

## ADDED Requirements

### Requirement: Sound dice
The track panel of Compose SHALL show a dice button with a number for drum, bass, arp, hook, pad and guitar tracks. A press SHALL draw a new sound for that track only, within the ranges of the song's style (its first style tag, else the nearest style), from the seed `<song id>:<track id>:sound:<n>`, and then raise the number by one. The same seed, style and locks SHALL always give the same sound. When no style recipe is available, the button SHALL be disabled with a tooltip that says why.

#### Scenario: A new sound for a bass
- **WHEN** the user presses the dice of a bass track whose style names sound kinds
- **THEN** the track gets a composed sound kind (wave and FM device) and filter and effect values inside the style's ranges, the toast shows "New sound #1", and the number shows 2

#### Scenario: Same number, same sound
- **WHEN** the user types 2 in the number and presses the dice, with the same locks as an earlier roll number 2
- **THEN** the track gets the same sound as that earlier roll

#### Scenario: Other tracks unchanged
- **WHEN** the user presses the dice of one track
- **THEN** no other track's settings, rack or patterns change

### Requirement: What the dice never changes
The dice SHALL NOT change a track's level, octave, mode, patterns, clips or the rack devices the user added. It SHALL change only the `fm` device it composes, and remove that device when a later roll draws a plain wave.

#### Scenario: User effects kept
- **WHEN** a hook track has a Delay device and gain 0.3 and the user presses the dice
- **THEN** the Delay device and the gain 0.3 stay

### Requirement: Synth and drum tracks
For synth tracks the dice SHALL draw a sound kind from the style's `material.sounds` when it names any, else a wave from the style's `waves` other than the current one. For guitar tracks it SHALL draw a guitar type from the style's `types`. For drum tracks it SHALL draw a kit from the style's `kits` and a tone per kit piece group (`endless/drum-tones`).

#### Scenario: Drum dice
- **WHEN** the user presses the dice of a drum track
- **THEN** the kit is one of the style's kits and the track's `tone` holds kick, snare and hats values inside the safe ranges

#### Scenario: Synth without sound kinds
- **WHEN** the style of an arp names no sound kinds and the user presses the dice
- **THEN** the arp gets one of the style's waves other than its current one

### Requirement: Variation in the dice
For every track type the dice SHALL also draw a variation (`endless/sound-variation`) at the Compose energy value. An amount of 0 SHALL clear the track's variation.

#### Scenario: Variation drawn
- **WHEN** the user presses the dice of a hook in a style whose variation targets are `lpf` and `pan`
- **THEN** the hook's `vary` holds entries for those targets only

### Requirement: Locks
The dice SHALL offer lock chips for groups of parameters: Sound, Filter, Effects and Variation for synth tracks; Sound, Effects and Variation for guitar tracks; Kit, Kick, Snare and clap, Hats and Variation for drum tracks. A locked group SHALL keep its values across rolls. Each group SHALL draw from its own stream of the seed, so locking a group SHALL NOT change what the other groups draw. Locks SHALL be remembered per song and track in the browser.

#### Scenario: Filter locked
- **WHEN** the Filter group of a pad is locked and the user presses the dice
- **THEN** the cutoff and resonance stay, and the Sound group draws the same as it would without the lock

#### Scenario: Locks after a reload
- **WHEN** the user locks Kit on a drum track and reloads the page
- **THEN** Kit is still locked on that track

### Requirement: Undo
Each roll SHALL show a toast with an Undo action. Undo SHALL restore the track's settings and rack exactly as they were before that roll, hand edits included.

#### Scenario: Undo a roll
- **WHEN** the user edits the cutoff by hand, presses the dice, then presses Undo
- **THEN** the track has the hand-edited cutoff and the sound it had before the roll

### Requirement: Dice while playing
A roll SHALL reach the playing song at its next evaluation, without stopping it, and SHALL be heard in the pattern preview when the preview plays that track.

#### Scenario: Rolling while the song plays
- **WHEN** the song plays and the user presses the dice of the playing bass
- **THEN** the song keeps playing and the bass sounds with the new sound from the next evaluation

### Requirement: Labels and guide
The dice, its number, the lock chips, the toast and the tooltips SHALL exist in Italian and English, and the Compose card of the Guide SHALL describe them in both languages.

#### Scenario: Italian labels
- **WHEN** the app is in Italian
- **THEN** the toast reads "Nuovo suono #n" and the lock chips have Italian names
