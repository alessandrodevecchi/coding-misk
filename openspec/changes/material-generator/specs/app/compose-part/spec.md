## Purpose

Compose can ask the material generator for a new part on a track, so a user gets fresh material that fits the song without writing it note by note.

## ADDED Requirements

### Requirement: Compose a part on a track
The pattern panel of a bass, arp, hook, pad, guitar or drums track SHALL offer a "Compose a part" action. It SHALL add a new pattern to the track, composed for the track's type from the song's sections (key, chords, meter), the song's style tags and an energy value the user sets, and SHALL select it in the panel. The patterns the track already had SHALL NOT change.

#### Scenario: New bass pattern
- **WHEN** the user presses Compose a part on a bass track with patterns A and B
- **THEN** a pattern C appears, holds a generated bassline idea, and plays in the selected clip after the user picks it

#### Scenario: Song without style tags
- **WHEN** the song has no style tags
- **THEN** the part is composed with the style closest to the song's tempo and meter

### Requirement: Repeatable and shown
Each composed part SHALL come from a seed made of the song id, the track id and a number shown next to the action. Pressing the action again SHALL use the next number; typing a number SHALL compose that part again.

#### Scenario: Same number, same part
- **WHEN** the user composes a part with number 7, deletes it and composes again with number 7
- **THEN** both parts are identical

### Requirement: Compose from a preset
When the selected pattern names a preset, the panel SHALL also offer to vary it: keep its rhythm with new notes, or keep its notes with a new rhythm. The result SHALL be a new pattern.

#### Scenario: Keep the rhythm
- **WHEN** the selected pattern uses the arp preset `pulsar` and the user picks "keep the rhythm"
- **THEN** a new pattern plays the onsets of `pulsar` with new chord indices
