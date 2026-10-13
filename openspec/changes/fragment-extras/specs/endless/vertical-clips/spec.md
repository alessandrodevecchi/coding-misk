## ADDED Requirements

### Requirement: Tagline die
The tagline setting, in Settings and in the fragments menu, SHALL offer a die next to the text. Each click SHALL put another phrase from the approved pool into the field, so the user sees the phrase the video will carry. When the field differs from the default phrase, an arrow next to the die SHALL bring the default back. The pool SHALL hold the approved short phrases (code and rhythm, human and machine, soul and signal, night, ironic, devotion), never "faith in the four-on-the-floor".

#### Scenario: Another phrase
- **WHEN** the user clicks the die twice
- **THEN** the field shows a new phrase from the pool each time, and the next fragment carries the phrase shown

#### Scenario: Back to the default
- **WHEN** the user clicks the arrow
- **THEN** the field shows the default phrase again and the arrow hides

### Requirement: One phrase per fragment for agents
The fragments call SHALL accept a random tagline mode, in which each fragment takes its own phrase from the pool, the same for the same fragment.

#### Scenario: Random mode by call
- **WHEN** an agent asks for three fragments in random tagline mode
- **THEN** each carries a phrase from the pool, and asking again gives the same phrases

### Requirement: Typed tagline
The tagline SHALL appear typed, one character at a time after the opening glitch, with a blinking block cursor, and SHALL glitch briefly now and then while it stays on screen. Frames SHALL depend only on the fragment time, so a fragment renders the same every time.

#### Scenario: Start of a fragment
- **WHEN** a fragment starts
- **THEN** the tagline is empty, types itself in within about two seconds with a blinking block, and then stays readable
