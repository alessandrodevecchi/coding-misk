# Spec Delta

## ADDED Requirements

### Requirement: Sound dice
The track panel of Compose SHALL show a dice button («New sound») with a number for drum, bass, arp, hook, pad and guitar tracks. A press SHALL draw a new sound for that track only, within the ranges of the song's style (its first style tag, else the nearest style), from the seed `<song id>:<track id>:sound:<n>`. The number `n` of a press SHALL be one above the highest number in the track's sound history (1 when the history is empty), so a press never gives back or overwrites an earlier sound of the history. The same seed, style, locks and starting sound SHALL always give the same sound. When no style recipe is available, the button SHALL be disabled with a tooltip that says why.

#### Scenario: A new sound for a bass
- **WHEN** the user presses the dice of a bass track whose style names sound kinds, with an empty sound history
- **THEN** the track gets a composed sound kind (wave and FM device) and filter and effect values inside the style's ranges, the toast shows "New sound #1", a lit chip "#1" appears and the number shows 1

#### Scenario: New sound after going back
- **WHEN** the history holds #1, #2 and #3 and the user clicks chip #1, then presses the dice
- **THEN** the new sound is #4, and #1, #2 and #3 keep their sounds

#### Scenario: Same number, same sound
- **WHEN** the user presses the dice (sound #2), presses Undo, and presses the dice again with the same locks
- **THEN** the track gets sound #2 again, the same as before the Undo

#### Scenario: Other tracks unchanged
- **WHEN** the user presses the dice of one track
- **THEN** no other track's settings, rack or patterns change

### Requirement: Sound history
Each roll SHALL add a chip "#n" to a row above the dice row, one per sound in the track's sound history, in number order. The chip of the sound the track has now SHALL be lit. Each history entry SHALL hold the track's full sound: the settings the dice may change and the whole rack. When the track leaves a sound (a new roll, a click on another chip or a number applied in the field), that sound's entry SHALL first be updated with the track's current sound, so hand edits made on it are kept. A click on a chip SHALL restore exactly that entry. The history SHALL be saved with the song, on the track, and SHALL keep at most the 12 most recently added sounds; the lit one is never dropped.

#### Scenario: Back to an earlier sound
- **WHEN** the user rolls #1, #2 and #3 and clicks chip #1
- **THEN** the track has exactly sound #1 and chip #1 is lit

#### Scenario: Hand edits kept
- **WHEN** the user rolls #1, changes the cutoff by hand, rolls #2, then clicks chip #1
- **THEN** the track has sound #1 with the hand-edited cutoff

#### Scenario: History after a reload
- **WHEN** the user rolls three sounds, saves the song and opens it again
- **THEN** the chips #1, #2 and #3 are there and the lit chip is the sound the track has

#### Scenario: Capped history
- **WHEN** the user rolls 13 sounds on one track
- **THEN** the row shows chips #2 to #13

### Requirement: Number field applies by itself
The number field SHALL show the number of the lit sound (empty when the history is empty) and SHALL apply a number by itself, with no press of the dice: on change (Enter, blur, the arrows) or about one second after the last keystroke. A number that has a chip SHALL restore that entry, like a click on the chip. A number without a chip SHALL roll that number (seed `<song id>:<track id>:sound:<n>`) and add its chip. The number of the lit sound SHALL do nothing.

#### Scenario: Typing a number with a chip
- **WHEN** the history holds #1, #2 and #3, #3 is lit, and the user types 2 in the number
- **THEN** after about a second, with no other press, the track has sound #2 and chip #2 is lit

#### Scenario: Typing a new number
- **WHEN** the history holds #1 and #2 and the user types 7 and presses Enter
- **THEN** the track gets roll number 7, chip #7 appears lit, and the next press of the dice gives #8

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
Each roll, chip click and applied number SHALL show a toast with an Undo action. Undo SHALL restore the track's settings and rack exactly as they were before that action, hand edits included, and the sound history as it was (a chip the action added goes, the chip lit before is lit again).

#### Scenario: Undo a roll
- **WHEN** the user edits the cutoff by hand, presses the dice, then presses Undo
- **THEN** the track has the hand-edited cutoff and the sound it had before the roll, and the chip of that roll is gone

#### Scenario: Undo a chip click
- **WHEN** #3 is lit and the user clicks chip #1, then presses Undo
- **THEN** the track has sound #3 again and chip #3 is lit

### Requirement: Dice while playing
A roll SHALL reach the playing song at its next evaluation, without stopping it, and SHALL be heard in the pattern preview when the preview plays that track.

#### Scenario: Rolling while the song plays
- **WHEN** the song plays and the user presses the dice of the playing bass
- **THEN** the song keeps playing and the bass sounds with the new sound from the next evaluation

### Requirement: Labels and guide
The dice, its number, the history chips, the lock chips, the toasts and the tooltips SHALL exist in Italian and English, and the Compose card of the Guide SHALL describe them in both languages.

#### Scenario: Italian labels
- **WHEN** the app is in Italian
- **THEN** the toast reads "Nuovo suono #n" and the lock chips have Italian names
