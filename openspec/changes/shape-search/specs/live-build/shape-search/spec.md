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
A growth SHALL try at most 8 shapes. It SHALL keep the first that meets the target, else the one whose growth steps are rushed least.

#### Scenario: More shapes later
- **WHEN** new openings, paces or developments are added
- **THEN** a growth still tries at most 8 shapes

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
