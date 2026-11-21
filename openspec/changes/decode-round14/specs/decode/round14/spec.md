# Spec Delta

## Purpose

What level B of the Decode tab does when the beat grid sits a sixteenth off the kick, where a pad fades out under the chord level's rounding, and where a pad fades in before it is heard.

## ADDED Requirements

### Requirement: The grid on the kick

Level B SHALL measure, per section with at least `GRID_ROTATE.min` drum bars, the step p of the beat whose weakest beat's mean `kickShape` rise is highest; a section is clear when that rise is at least `GRID_ROTATE.low` dB and at least `GRID_ROTATE.margin` dB over every other step. When every clear section has the same p, p is 1 or 3, the clear sections hold at least `GRID_ROTATE.cover` of the song's drum bars and the claps do not already play a backbeat on the present grid, level B SHALL move the downbeat by one sixteenth (later for p = 1, earlier for p = 3) and rotate every bar's step rows (drums, bass, lead, the bass's hold, the chord's hits and the step measures) across the bar lines, after the kick's click and full kick corrections of the present grid.

#### Scenario: A kick a sixteenth after the grid

- **WHEN** both clear sections of a track read the kick's attack on step 1 of every beat (8.8 and 8.7 dB) and the claps are the sidechained bass's rise on every step
- **THEN** the downbeat moves a sixteenth later and the kick is written `x...x...x...x...`

#### Scenario: A kick on the grid

- **WHEN** the clear sections read the kick's attack on step 0, or disagree
- **THEN** the grid does not move

### Requirement: A fade under the chord level's rounding

After the bars that continue the song past the model's ending (`TAIL_RULE`), level B SHALL continue it over the bars with no drums heard whose chord reads with a confidence of at least `TAIL_RULE.conf` and a tonal share of at least `TAIL_RULE.fade`, whatever their chord level, with gaps of at most `TAIL_RULE.gap` bars.

#### Scenario: A pad fading to -35 dB

- **WHEN** a pad's last bars read a chord level of 0.00 with a tonal share of 0.2 to 0.68 and no drums
- **THEN** the chords play on to the last such bar

### Requirement: A pad that fades in

Level B SHALL write the chord on up to `LEAD_IN.bars` bars just before a run of heard chords when each has no drums heard, a chord with the same root as the run's first bar, a confidence of at least `LEAD_IN.conf`, a tonal share of at least `LEAD_IN.tonal` and a chord level of at least `LEAD_IN.level`.

#### Scenario: A pad on E entering quietly

- **WHEN** three bars without drums read E at a tonal share of 0.05 to 0.13 before a pad on E is heard
- **THEN** those three bars play the E chord
