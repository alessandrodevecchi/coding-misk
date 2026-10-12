## ADDED Requirements

### Requirement: Tagline pool and random mode
The tagline setting SHALL offer a die next to the text. The die SHALL switch random mode on and off; in random mode each fragment SHALL take one phrase from the approved pool, the same phrase for the same fragment, and the menu SHALL show an example phrase from the pool. With random mode off the fixed tagline SHALL be used, as before. The pool SHALL hold the approved short phrases (code and rhythm, human and machine, soul and signal, night, ironic, devotion), never "faith in the four-on-the-floor".

#### Scenario: Random taglines
- **WHEN** three fragments are made with random mode on
- **THEN** each carries a phrase from the pool, and making them again gives the same phrases

#### Scenario: Fixed tagline
- **WHEN** random mode is off and the tagline is "music by coding"
- **THEN** every fragment carries "music by coding"

### Requirement: Typed tagline
The tagline SHALL appear typed, one character at a time after the opening glitch, with a blinking block cursor, and SHALL glitch briefly now and then while it stays on screen. Frames SHALL depend only on the fragment time, so a fragment renders the same every time.

#### Scenario: Start of a fragment
- **WHEN** a fragment starts
- **THEN** the tagline is empty, types itself in within about two seconds with a blinking block, and then stays readable
