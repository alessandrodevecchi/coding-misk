## MODIFIED Requirements

### Requirement: A lock per instrument
Each instrument in the Arrangement group SHALL have a lock next to its "+" and "−", open by default. A closed lock SHALL keep the director from changing that instrument for the rest of the song: it SHALL NOT add, remove for good, vary or reshape any of its tracks, including tracks the listener adds later. A locked instrument that plays SHALL keep playing through breaks and the charge before a drop, except drums: a locked drum track SHALL sit out a break and the charge before a drop and come back at the drop, as an unlocked drum does, with its sound and pattern unchanged. The listener's own commands SHALL still act on a locked instrument. The console lock and the mixer's per-track locks SHALL stay in sync: locking an instrument SHALL lock every one of its tracks in the mixer, and when only some of its tracks are locked the console lock SHALL show a half state that locks them all on a click. Lock icons SHALL be drawn icons, in the console and in the mixer.

#### Scenario: Locked bass
- **WHEN** the listener closes the bass lock and the director's plan would strip the bass at the next break
- **THEN** the bass keeps playing with its pattern and sound until the song ends, and the bass row in the mixer shows a closed lock

#### Scenario: Locked kick in a break
- **WHEN** the listener closes the kick lock and the song reaches a break, then a drop
- **THEN** the kick is silent in the break and in the charge, comes back at the drop with the same pattern and sound, and no director variation or effect move touches it

#### Scenario: Listener still in charge
- **WHEN** the bass is locked and the listener presses "+ basso"
- **THEN** a second bass comes in at the next phrase, locked as well

#### Scenario: Mixer and console in sync
- **WHEN** two arps play, the instrument is locked, and the listener opens the lock of "Arp 2" in the mixer
- **THEN** "Arp 2" is unlocked and the console's arp lock shows the half state

## ADDED Requirements

### Requirement: Twelve tracks at every bar
A steered song SHALL play at most 12 tracks at every bar, the riser and the voices left out. The director SHALL NOT bring a track in, nor bring back a listener track or a drum after a break, when 12 already play at that bar. "+" SHALL be disabled with the reason when the steered song would go past 12 at any bar from the command on. The console count SHALL never show more than 12.

#### Scenario: "+" again and again
- **WHEN** the listener presses "+" on the instruments in turn every two bars until the console stops it
- **THEN** at no bar of the song does the console count read more than 12
