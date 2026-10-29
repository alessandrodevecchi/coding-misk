# Spec Delta

## Purpose

Rack devices that give an FM-like colour to any track, samples, drums and voices included: Fold, and a Ring device on trial.

## ADDED Requirements

### Requirement: Fold device
The rack SHALL offer a sound device "Fold" (Italian "Piega") on every track type, voice tracks included, with two settings: Amount from 0.1 to 3 (default 1) and Curve, Sharp or Soft (default Sharp). Its code SHALL be Strudel's distortion with the fold curve (`fold` for Sharp, `sinefold` for Soft) and a level after the fold.

#### Scenario: Fold on a drum track
- **WHEN** the user adds Fold to a drums track in Compose and plays
- **THEN** the track's line carries `.distort(1).distorttype("fold").distortvol(…)` and the drums sound folded, with no evaluation error

#### Scenario: Fold on a voice
- **WHEN** the user adds Fold to a voice track
- **THEN** the voice line carries the Fold code and the voice plays folded

### Requirement: Fold never raises the level
The level after the fold SHALL be set so that the output of the device is never above its input, for every amount and both curves.

#### Scenario: A quiet pad
- **WHEN** a pad peaking at 0.15 gets Fold at amount 3
- **THEN** its line peaks at most 0.15 plus measurement noise (0.02)

### Requirement: Fold and Distortion on one track
A track with both Fold and Distortion on SHALL validate with a warning that the later of the two is the one heard.

#### Scenario: Both devices
- **WHEN** a song's track has Distortion then Fold in its rack
- **THEN** `node tools/song.mjs validate` prints a warning at that rack and no error

### Requirement: Ring device on trial
The rack SHALL offer a sound device "Ring (trial)" (Italian "Ring (prova)") on every track type, voice tracks included, with two settings: Frequency from 30 to 2000 Hz (default 220) and Amount from 0 to 1 (default 0.8). Its code SHALL multiply the sound by `1 − amount + amount · sin(2π · frequency · t)` through Strudel's `K` effect, so the output is never above the input.

#### Scenario: Ring on a sample in the page
- **WHEN** the user adds Ring to a drums track and plays the song
- **THEN** the drums sound ring modulated, the line peaks at most its peak without Ring plus 0.02, and there is no evaluation or page error

#### Scenario: Ring in the fast export
- **WHEN** a song with Ring on a track is exported with the fast export
- **THEN** the file holds the ring modulated sound (it differs from the same song without Ring) and stays below full scale

### Requirement: Ring trial measurements
The project SHALL have a browser check that measures, on a radio song with 12 tracks, the cost of Ring and Fold on every track against the plain song: the fast export's render time per second of audio, and in real time the long tasks, the audio underruns and the main-thread time spent preparing the Ring notes. The numbers SHALL be recorded in the DEVLOG and the knowledge base.

#### Scenario: Running the measurement
- **WHEN** the developer runs `PORT=5201 node tools/check-fm-effects.cjs berlin-techno`
- **THEN** it prints, for the plain song, Ring on 12 tracks and Fold on 12 tracks, the render speed, the slowdown, the long tasks, the underruns and the per-note preparation time, and fails only on errors or an output at or above 1.0

### Requirement: Translated choice values
A rack device's choice values SHALL show in the interface language when the device defines labels for them; the song SHALL store the value, not the label.

#### Scenario: Curve in Italian
- **WHEN** the interface is in Italian and a track has Fold
- **THEN** the Curve menu shows "Spigolosa" and "Morbida", and the song stores `sharp` or `soft`

### Requirement: Fold on radio voices
The director SHALL be able to pick Fold, with an amount from 0.3 to 1.2 and either curve, among the effects of a radio voice. It SHALL NOT pick Ring while Ring is on trial.

#### Scenario: A radio voice with Fold
- **WHEN** the director makes the voices of a session with high chaos
- **THEN** some voices carry Fold with an amount from 0.3 to 1.2, and no voice carries Ring
