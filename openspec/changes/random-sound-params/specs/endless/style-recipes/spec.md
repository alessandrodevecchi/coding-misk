# Spec Delta

## ADDED Requirements

### Requirement: Sound ranges in recipes
A recipe's `drums.material` MAY give `tones`: per group (`kick`, `snare`, `hats`), ranges `[low, high]` for `decay`, `tune`, `drive` and `cutoff`. A recipe's drum or melodic instrument `material` MAY give `variation`: `{ "amount": 0 to 1, "targets": [...] }` with targets from the variation targets. A recipe without these fields SHALL be valid and SHALL use the defaults.

#### Scenario: Recipe with tones
- **WHEN** a recipe gives `drums.material.tones.kick.decay` as `[0.2, 0.5]`
- **THEN** it validates

### Requirement: Sound range validation
The recipe validator SHALL report a tone range outside the drum tone safe table, an unknown group, value or target, and a variation amount outside 0 to 1.

#### Scenario: Tone range outside the safe table
- **WHEN** a recipe gives `drums.material.tones.hats.decay` as `[0.01, 0.5]`
- **THEN** `npm run check:styles` reports the path and the safe range 0.03 to 0.3

#### Scenario: Recipe without the fields
- **WHEN** a recipe has no `tones` and no `variation`
- **THEN** it validates, and generated songs use the default amount and targets
