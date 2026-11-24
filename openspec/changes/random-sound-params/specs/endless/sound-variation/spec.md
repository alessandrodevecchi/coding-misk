# Spec Delta

## ADDED Requirements

### Requirement: Variation setting
A drum, bass, arp, hook, pad or guitar track MAY hold a `vary` setting: a list of at most three entries, each with `on` (one of `lpf`, `hpf`, `pan`, `gain`, `delay`, `room`, `decay`, `distort`, `crush`, `vowel`), `amount` (from 0 to the target's cap), `seed` (a whole number from 0), `cycles` (1 to 8 bars), an optional `fn` (`rand` or `perlin`) and, on drum tracks only, an optional `row`. A track without `vary` SHALL compile exactly as before.

#### Scenario: No variation
- **WHEN** a built-in song without `vary` is compiled
- **THEN** its code equals the code snapshot

### Requirement: Variation validation
The validator SHALL report an unknown target, an amount above the target's cap (design D4), a missing seed or cycles, two entries for one target and row, `row` on a melodic track, `distort` on a bass track, and a live build `set` step that sets `vary`. It SHALL warn when the target is automated or written later on the line by a rack device, and when an idea's `random` targets the same control.

#### Scenario: Automated target
- **WHEN** a pad with `cutoffEnd` set varies `lpf`
- **THEN** the validator warns at `tracks[n].settings.vary[0]` that the variation is left out

#### Scenario: Cap
- **WHEN** a song has a `vary` entry with `on` "gain" and `amount` 0.5
- **THEN** the validator reports `tracks[n].settings.vary[0].amount` with the cap 0.3

### Requirement: Variation code
The writer SHALL turn each entry into a seeded random value per hit, `<fn>.range(lo, hi).rib(seed, cycles)`, with the range computed from the track's own value and the amount (design D4). It SHALL never make a track louder than its gain, nor brighter than its cutoff. A control the line already writes SHALL be replaced in place, so a line holds one call per control. An automated or rack-written target SHALL be left out.

#### Scenario: Filter variation
- **WHEN** a hook with cutoff 4000 has `{ "on": "lpf", "amount": 0.4, "seed": 41, "cycles": 4 }`
- **THEN** its line holds one `.lpf(rand.range(2400, 4000).rib(41, 4))` and no other `lpf`

#### Scenario: Never louder
- **WHEN** a hat row with gain 0.45 varies `gain` by 0.2
- **THEN** every hit's gain is between 0.36 and 0.45

### Requirement: Vowel variation
`vowel` SHALL choose among the first `round(amount × 4) + 1` vowels of `a e i o u`, written as `irand(n).rib(seed, cycles).pick([...])`.

#### Scenario: Two vowels
- **WHEN** an arp varies `vowel` with amount 0.25
- **THEN** its line chooses between "a" and "e" only

### Requirement: Seeded and repeatable
The values SHALL depend only on the song: the same song SHALL give the same value on the same hit in the app, in fast and real-time exports, in videos and in the Node checks, and the values SHALL repeat every `cycles` bars. No code path of this change SHALL use `Math.random`.

#### Scenario: Same haps
- **WHEN** the code of a song with variation is queried twice in Node over 16 bars
- **THEN** both queries give the same values, and bars 1 to 4 equal bars 5 to 8 for `cycles` 4

### Requirement: Generated variation
At session option `sound` 1 or more, the director SHALL give each drum and melodic track a `vary` drawn from its own stream, with one to three targets from the style's `material.variation.targets` and an amount of `style amount × (0.5 + energy)`, clamped to each cap and drawn between 60 and 100 % of it. At `sound` 0 no variation SHALL be drawn, and drawing it SHALL NOT change any other draw of the session.

#### Scenario: Soft style varies less
- **WHEN** a style declares variation amount 0.1 and another 0.4, at the same energy
- **THEN** the tracks of the first style get amounts no higher than those of the second

### Requirement: Variation defaults
Without style fields the generator SHALL use amount 0.2, with `lpf` and `pan` for melodic tracks and `decay` and `pan` on hats for drums. It SHALL never vary the kick's gain nor a bass's distortion.

#### Scenario: Style without variation
- **WHEN** a style has no `variation` field
- **THEN** its hooks vary only `lpf` and `pan`, and no kick row varies its gain

### Requirement: Existing songs and sessions
Built-in songs, saved songs, Classic and Crescendo playback, the Crescendo and Live coder fixtures, the level snapshots and every session recipe without a `sound` value SHALL play as before this change. New sessions, compilations and songs made with the New song panel SHALL record `sound` with the current `SOUND_VERSION`. The command line SHALL keep `sound` 0 unless `--sound` is given. Crescendo SHALL NOT ramp `tone` or `vary`.

#### Scenario: Saved session
- **WHEN** a radio session saved before this change is played from a playlist
- **THEN** its songs have no `tone` or `vary` and no version warning shows

#### Scenario: Endless fixtures
- **WHEN** `npm run check:endless` runs after this change
- **THEN** the existing fixtures match without being rewritten
