## ADDED Requirements

### Requirement: Compose answers at once while a song grows
A change in Compose that needs a new growth (profile, build style, growth, duration, opening, pace, development, Fully narrated) SHALL show the new choice at once and SHALL NOT block the page while the song grows. Until the growth is ready the song SHALL stay as written, and a drawn "growing" mark with a tooltip in English and Italian SHALL show next to the profiles.

#### Scenario: Live coder on luci-rosse
- **WHEN** the owner turns the Live build on for luci-rosse and picks Live coder
- **THEN** Live coder is selected within a frame, the page keeps answering, the growing mark shows, and the song switches to its grown version when the growth is ready

#### Scenario: Shape menus
- **WHEN** the owner changes the opening and then the pace while a growth is running
- **THEN** each menu answers at once, the first growth is dropped, and only the last choice is grown

### Requirement: Play waits for the growth
Play pressed while the song grows SHALL start the grown song as soon as it is ready, with the growing mark on the Play button meanwhile. A growth that fails SHALL leave the song as written and SHALL say so.

#### Scenario: Play during the growth
- **WHEN** the owner presses Play two seconds after picking Live coder on settimo-cielo
- **THEN** the mark shows on Play, and the grown song starts from its first bar when ready

### Requirement: Same growth as before
A song grown in the background SHALL be identical to the same song grown in the page before this change, for every profile and shape.

#### Scenario: Fixtures
- **WHEN** `check:crescendo` runs after this change
- **THEN** the Crescendo and Live coder fixtures do not move

### Requirement: Growth counters on demand
The growth SHALL be able to report, when asked, the shapes it tried, the free-duration rounds, the rushed steps of each shape and the time spent, and SHALL cost nothing when not asked. A command SHALL print them for a song and a growth shape.

#### Scenario: Probe
- **WHEN** an agent runs `npm run growth:probe -- luci-rosse --opening typed`
- **THEN** it prints each shape tried with its rushed steps and time, the shape kept and the total time

### Requirement: Growths kept across reloads
Growths made in Compose SHALL be stored in the browser and reused after a reload. The store SHALL hold at most a fixed number of growths, drop the least recently used first, and drop every stored growth when the growth code changes.

#### Scenario: Reload
- **WHEN** the owner grows kellerlicht as Live coder and reloads the page
- **THEN** kellerlicht opens grown at once, without the growing mark

#### Scenario: Cap
- **WHEN** more growths than the cap have been made
- **THEN** the store keeps only the most recently used ones
