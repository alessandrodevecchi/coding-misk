# Spec Delta

## ADDED Requirements

### Requirement: Typed requests become console commands

The Radio console SHALL have a request field. A request in English SHALL be sent to the area's engine with a generated prompt (the console's command kinds and help texts, the song on air, the kinds disabled now) and a JSON schema, and the answer SHALL be read as at most four console commands from the MVP set, in the order asked. The assistant SHALL NOT produce Strudel code or commands outside `COMMANDS`.

#### Scenario: Several commands in one request

- **WHEN** the listener types "darker, less energy and one more arp" while a song plays
- **THEN** the console queues Darker, Less energy and "+ Arp", in that order, each on its usual boundary

#### Scenario: Nothing fits

- **WHEN** the listener asks for something no command does, such as "play it in 7/8"
- **THEN** no command is queued and the answer row shows the engine's short note

### Requirement: Every answer validated like a press

Each command from an answer SHALL be mapped to the object the matching button sends and checked with the console's own rules for the song on air, including the commands before it in the same answer. Invalid JSON SHALL apply nothing. Unknown kinds, unknown words, tracks not on air and values out of range SHALL be dropped with a reason. A command the console would disable SHALL be shown with the console's usual reason and not applied.

#### Scenario: Invalid answer

- **WHEN** the engine returns text that is not valid against the schema
- **THEN** nothing is queued and the row says the answer was not understood, with Retry

#### Scenario: A track not on air

- **WHEN** an answer mutes a track id that the song on air does not have
- **THEN** that command is shown struck through with its reason and the other commands still apply

#### Scenario: A disabled command

- **WHEN** an answer asks for "− Bass" and no bass plays at the boundary
- **THEN** that chip shows the console's "not playing" reason and nothing is queued for it

### Requirement: Applied the way a press is

Valid commands SHALL be applied through the same paths as the console buttons: the Arrangement "+" and "−" as pending changes prepared ahead, every other command as a queued command. They SHALL keep the same boundaries, appear in the queue, be cancellable with ✕, and be recorded in the steering with a mark that they came from a request, so replay gives the same song as the same presses.

#### Scenario: Cancel a requested command

- **WHEN** a request queued "Change chords" and the listener presses ✕ on its queue row before its boundary
- **THEN** the command is cancelled exactly as if it had been pressed

#### Scenario: Replay

- **WHEN** a radio session with requested commands is replayed
- **THEN** the songs are the same as in a session where those commands were pressed on the same bars

### Requirement: What the console shows for a request

While the engine works the field SHALL show progress and a Cancel button. After it, an answer row SHALL show the request and one chip per command with its button label, marked applied or struck through with its reason, plus the engine's note if any. The field SHALL show the engine and model in use. On the built-in engine with the app in Italian, the field SHALL say that requests are understood in English only.

#### Scenario: Answer row

- **WHEN** a request returns three commands of which one is disabled
- **THEN** the row shows two applied chips and one struck-through chip with its reason

#### Scenario: Cancel while waiting

- **WHEN** the listener presses Cancel before the engine answers
- **THEN** the request is aborted and nothing is queued

### Requirement: The prompt fits the built-in model

The generated prompt with the song state SHALL stay under 2000 tokens (counted as characters divided by four). When the built-in engine reports a smaller context window than the prompt needs, the builder SHALL shorten the examples, then leave out disabled kinds, then the help texts, before sending.

#### Scenario: Normal song

- **WHEN** the prompt is built for a Live coder song with eight playing tracks
- **THEN** it stays under 2000 tokens and holds every enabled kind of the MVP set

#### Scenario: Each request starts clean

- **WHEN** the listener sends ten requests in a row on the built-in engine
- **THEN** each runs on a fresh copy of the base session, so earlier requests never fill the context
