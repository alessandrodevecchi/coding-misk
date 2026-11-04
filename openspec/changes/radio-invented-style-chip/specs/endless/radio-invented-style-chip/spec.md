# Spec Delta

## Purpose

Show a style the radio invented in the same way everywhere, with its definition and an explicit Keep.

## ADDED Requirements

### Requirement: One chip for an invented style
A style invented by the compilation for the song on air SHALL show in "Now playing" as the same chip and hint that the Invent die uses for its trial style: name, "invented", genre, description and an explicit Keep button. The seed SHALL be in the tooltip as for Invent.

#### Scenario: Compilation on, invented style plays
- **WHEN** the compilation is on with "invented styles" and the song on air uses a style the compilation invented
- **THEN** Now playing shows the chip with the style name, its genre, its description and a visible Keep button

### Requirement: The style also shows in the left column
While a compilation-invented style plays, the STYLES block of the On air column SHALL show the same chip and hint above the style chips, so the column looks the same with and without the compilation. The chip SHALL have no Again and no discard action. It SHALL be a normal full-colour chip: not greyed, not disabled, and outside the dimming of the set-aside style chips. Only its Keep button SHALL save the style, with the same action as Keep in Now playing; clicking the name SHALL do nothing and SHALL NOT toggle the style.

#### Scenario: Chip in both places
- **WHEN** an invented style plays with the compilation on
- **THEN** the same chip shows in Now playing and in On air, STYLES, with the same name and the same Keep

#### Scenario: Left-column chip is live
- **WHEN** the compilation is on and the listener clicks Keep on the chip in On air, STYLES
- **THEN** the style is kept as with Keep in Now playing, and the chip looks as active as any normal chip before the click

### Requirement: Keep saves like Invent's Keep
Keep on a compilation-invented style SHALL save it among the user's styles exactly as Keep on the Invent trial style does (Styles tab, same recipe, toast "kept"). One click SHALL be enough, also while Now playing is redrawn (the Keep button acts on pointer down). After Keep the chip SHALL no longer show in either place. There SHALL be no double-click action.

#### Scenario: Keep with one click
- **WHEN** the listener clicks Keep once on the chip in Now playing or in the left column
- **THEN** the style appears in the Styles tab as a user style and the chip is gone from both places

### Requirement: The chip follows the song
The chips SHALL follow the song on air: when the next song plays another invented style, both chips SHALL show that style; when it plays no invented style, both SHALL go.

#### Scenario: Next song, different style
- **WHEN** the on-air song changes from an invented style A to an invented style B
- **THEN** both chips show B

### Requirement: Nothing else changes
With the compilation off, the Invent die, its trial chip, Keep, Again and discard, the saved session recipe and the replay SHALL behave as before.

#### Scenario: Compilation off
- **WHEN** the compilation is off and a style is on trial with the Invent die
- **THEN** the trial chip and hint in the left column are as before and Now playing shows no extra chip
