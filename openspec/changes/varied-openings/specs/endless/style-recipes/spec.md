## ADDED Requirements

### Requirement: Opening weights in every style
Every built-in style recipe SHALL give opening weights in `growthShapes.openings` and kick-start weights in `growthShapes.kicks`. Dance styles with a four-on-the-floor kick SHALL keep the kick-led openings as their largest share. Styles that usually open without a kick (ambient, lo-fi, jazz, country, dreamy and dark cyberpunk) SHALL give the non-kick openings the larger share.

#### Scenario: Every style weighs its openings
- **WHEN** the recipe check runs on `styles/`
- **THEN** every built-in recipe has `growthShapes.openings` and `growthShapes.kicks`, and all of them pass validation

#### Scenario: Ambient opens without the kick
- **WHEN** the opening probe grows ambient songs in the Crescendo and Live coder profiles
- **THEN** most of them open on a pad, a melody, a chord or a typed line, not on the kick

#### Scenario: House keeps a kick start
- **WHEN** the opening probe grows house songs
- **THEN** most of them open on the kick, and more than one kick pattern appears among those openings

### Requirement: Kick-start weights validation
The recipe validator SHALL reject an unknown opening or kick-start id, and a weight that is not a number from 0, with the JSON path of the entry.

#### Scenario: Unknown kick start
- **WHEN** a recipe sets `growthShapes.kicks.gallop` to 2
- **THEN** validation fails at `growthShapes.kicks.gallop` and names the valid kick starts

### Requirement: Instruments that fit each style
Every built-in style SHALL offer more than one drum machine when its genre is played on more than one, and a choice of sounds per role that fits the genre. Every added drum machine and sound SHALL already exist among the banks and sounds the app loads; no recipe SHALL name a sound the app does not load. Every drum machine a style lists SHALL have samples for the drum rows its grooves play. Recipe text SHALL NOT name brands beyond the existing bank ids.

#### Scenario: More than one drum machine for house
- **WHEN** the director makes many house songs
- **THEN** their kick lines use more than one drum machine

#### Scenario: Added sounds exist
- **WHEN** the style sounds check runs with the app's sounds loaded
- **THEN** every drum machine and sound named by a built-in recipe is present, and every drum row its grooves play has a sample in each of its drum machines
