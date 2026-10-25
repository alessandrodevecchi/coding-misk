## ADDED Requirements

### Requirement: A shape is judged on its growth
A Live coder growth SHALL judge a candidate shape only on the steps of its growth, before the written part begins. Rushed steps of the written part SHALL NOT count toward the target or toward the choice of a fallback.

#### Scenario: luci-rosse
- **WHEN** luci-rosse grows as Live coder with every shape part automatic
- **THEN** its section changes after bar 140 do not count, and the search stops at the first shape with no rushed growth step

### Requirement: Same song, same shape, no fixed favourites
The shape drawn for the song SHALL be tried first. The other candidates SHALL follow in an order drawn from the song's seed and weighted by its style's or artist's shape weights, so the same song always gets the same shape and no candidate is always tried before the others.

#### Scenario: Repeatable
- **WHEN** the same song grows twice with the same controls
- **THEN** it gets the same shape both times

### Requirement: A cap on the shapes tried
A growth SHALL try at most 8 shapes by default. When none meets the target it SHALL go on up to twice the cap, then keep the one whose growth steps are rushed least. The cap SHALL be a setting with a hint in English and Italian; the radio and the checks SHALL use the default.

#### Scenario: More shapes later
- **WHEN** new openings, paces or developments are added
- **THEN** a growth still tries at most 8 shapes, or 16 when none of the first 8 meets the target

### Requirement: Free duration fixes rushed growth steps
With the free duration, a rushed step of the growth SHALL get the bars it needs before it, unless the counters report why it cannot.

#### Scenario: settimo-cielo
- **WHEN** settimo-cielo grows as Live coder with the free duration
- **THEN** no growth step is rushed, or the counters name each one that stays and why

### Requirement: Crescendo unchanged
Crescendo growths, which do not use shapes, SHALL not change.

#### Scenario: Fixtures
- **WHEN** `check:crescendo -- --full` runs
- **THEN** the Crescendo fixtures do not move

### Requirement: Try all shapes and random order
Settings, advanced, SHALL offer "Try all growth shapes" (off by default) and "Random order" (on by default), each with a hint in English and Italian. With "Try all growth shapes" on, a Compose growth SHALL measure every candidate shape, whatever their number, and keep the one that gives the shortest whole song among those that meet the target, else the one rushed least. With "Random order" off, the candidates SHALL be tried in the fixed order used before `SHAPES_VERSION` 4. Default values SHALL NOT be stored; both settings SHALL be part of the Compose growth key; the radio and the checks SHALL use the defaults.

#### Scenario: All shapes
- **WHEN** "Try all growth shapes" is on and luci-rosse grows as Live coder in Compose
- **THEN** every candidate (28 today) is measured, and a growth stored with the setting off is not reused

#### Scenario: Fixed order
- **WHEN** "Random order" is off
- **THEN** the candidates follow the fixed order (drawn development, other developments by weight, by type last, other paces, then the less detailed variants), and the same song gets the same shape

### Requirement: Long songs keep the shortest shape
When the whole grown song (growth and written part) with the kept shape is longer than 15 minutes, the growth SHALL measure every candidate shape and keep the one that gives the shortest whole song among those that meet the target, in Compose and in the radio.

#### Scenario: kellerlicht
- **WHEN** kellerlicht grows as Live coder with the defaults
- **THEN** if the first shape kept gives more than 15 minutes, every shape is measured and the shortest whole song that meets the target is kept

### Requirement: Long linear lists written as ramps
In the code of a Live coder growth, a mini-notation list of 16 or more numeric values (repeats expanded) that moves linearly per bar SHALL be written as a stepped ramp with Strudel signals (`saw.range(a, b).slow(n).segment(1)`, with `.late(r)` when rotated) that gives every bar the same value as the list, up to the list's rounding. Lists of levels (gain, postgain, velocity, mask) and lists that are not linear SHALL stay as written. Classic and Crescendo code SHALL NOT change.

#### Scenario: kellerlicht's acid
- **WHEN** a step of kellerlicht's growth would type `res("<708.84 712.24 …>", 12)` with over 100 values
- **THEN** it types a ramp of a few dozen characters, and every bar plays the same cutoff as the list within 0.01
