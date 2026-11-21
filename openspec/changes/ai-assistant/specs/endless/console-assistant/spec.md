# Spec Delta

## ADDED Requirements

### Requirement: One command registry

Every console command the assistant may use SHALL have one registry entry: a description, a JSON Schema for its arguments, the console's validation and the button's apply path. The prompt, the answer schema, the online tool definitions, the MCP tools and `docs/AGENT-API.md` SHALL be generated from it. A check SHALL fail when the document is stale or an entry is incomplete.

#### Scenario: The document follows the registry

- **WHEN** a registry entry's description changes and `docs/AGENT-API.md` is not written again
- **THEN** `npm run check:agent-api` fails and names the stale file

#### Scenario: Apply is the button's path

- **WHEN** a request's answer holds "+ Arp"
- **THEN** the registry applies it through the same function as the console's "+" of the arp, with the same batch and boundary

### Requirement: Typed requests become console commands

The Radio console SHALL have a request field. An English request (Italian not guaranteed) SHALL be sent to the area's engine with a prompt and schema generated from the registry and the song on air, and the answer SHALL be read as at most four console commands of the MVP set, saved patterns by name included, in the order asked. The assistant SHALL NOT produce Strudel code or commands outside `COMMANDS`.

#### Scenario: Several commands in one request

- **WHEN** the listener types "darker, less energy and one more arp" while a song plays
- **THEN** the console queues Darker, Less energy and "+ Arp", in that order, each on its usual boundary

#### Scenario: Nothing fits

- **WHEN** the listener asks for something no command does, such as "play it in 7/8"
- **THEN** no command is queued and the answer row shows the engine's short note

#### Scenario: A saved pattern by name

- **WHEN** the listener has a saved pattern called "Rolling bass" that fits the song and types "put my rolling bass in place of the bass"
- **THEN** the console queues that saved pattern in place of the playing bass track, as the Saved patterns panel would

#### Scenario: An unclear pattern name

- **WHEN** an answer names a saved pattern that matches none or two of the fitting patterns equally
- **THEN** that command is shown struck through with "no saved pattern called …" or "which one: A or B?" and nothing is queued for it

### Requirement: Pattern names matched by the app

The answer schema SHALL take a saved pattern's name as free text, never as a list of names. The app SHALL match it against the names of the saved patterns that fit the song, normalised (case, accents, punctuation, filler words), exact first, then by a fuzzy score with a threshold. No match and an ambiguous match SHALL be rejected with a clear message.

#### Scenario: A near name

- **WHEN** the listener has a fitting pattern "Dusty Breaks" and the answer names "Dusty Break"
- **THEN** the console queues "Dusty Breaks"

#### Scenario: An unknown name

- **WHEN** the answer names "Sunset Lead" and no fitting pattern is close to it
- **THEN** the chip says there is no saved pattern called "Sunset Lead" and nothing is queued for it

### Requirement: A "cannot" path always present

The answer schema SHALL always allow an answer with no commands and a short note, with the note required. Requests about what the console never does (tempo, time signature, playing backwards) SHALL be answered "cannot" without asking the engine.

#### Scenario: Tempo

- **WHEN** the listener types "change the tempo to 140 bpm"
- **THEN** nothing is queued and the row says the console cannot change the tempo

### Requirement: Vague requests asked first

A request that names no command word, instrument, playing track or saved pattern SHALL be flagged as vague, and its answer SHALL be shown as a proposal with Apply and Dismiss even in "Apply at once", with a line saying why.

#### Scenario: A mood

- **WHEN** the mode is "Apply at once" and the listener types "it is getting boring"
- **THEN** the answer row shows the commands as a proposal with "A vague request: check before applying", and nothing is queued until Apply

### Requirement: Apply at once or ask first

The assistant SHALL offer two modes per area, chosen in its menu and in Settings: "Apply at once" (the default) applies the valid commands as soon as they are validated; "Ask before applying" shows them as a proposal and applies nothing until the listener accepts it. On acceptance the commands SHALL be checked again against the song as it is then.

#### Scenario: Ask before applying

- **WHEN** the mode is "Ask before applying" and a request returns two valid commands
- **THEN** the answer row shows them as a proposal with Apply and Dismiss, and nothing is queued until Apply

#### Scenario: A proposal that went stale

- **WHEN** the listener presses Apply on a proposal after its "− Bass" boundary has passed with no bass playing
- **THEN** that chip shows the console's reason and the other commands apply

#### Scenario: Apply at once

- **WHEN** the mode is "Apply at once" and a request returns valid commands
- **THEN** they are queued at once and shown as applied

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

### Requirement: Compact placement in the console

The request field SHALL sit inside the existing Radio console area as one compact row, with one menu icon, and SHALL add no new panel or command group. The answer SHALL take one line under the field, wrapping only when its chips do not fit.

#### Scenario: Compact on a phone

- **WHEN** the console is shown at 400 px wide
- **THEN** the request field and its menu icon take one line and the command groups below keep their layout

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
- **THEN** it stays under 2000 tokens (about 800 measured for the system text and examples, in a window of 9216) and holds every kind of the MVP set

#### Scenario: Each request starts clean

- **WHEN** the listener sends ten requests in a row on the built-in engine
- **THEN** each runs on a fresh copy of the base session, so earlier requests never fill the context
