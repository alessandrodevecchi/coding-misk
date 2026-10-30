# Spec Delta

## ADDED Requirements

### Requirement: Hide-the-code toggles in Options
The Options group, in Compose and in the radio's Custom section, SHALL offer "V:N code" and "V:T code" next to Title, Lit notes, Line breaks, Human typing and Typing mistakes. "V:N code" SHALL be today's "Narrator voice code", moved out of Comments with the same behaviour and stored setting. "V:T code" SHALL be on by default in every profile. Neither SHALL be part of the comment presets.

#### Scenario: Moved toggle keeps its value
- **WHEN** a song saved with "Narrator voice code" off opens after this change
- **THEN** "V:N code" in Options is off and the narrator's lines are not shown

#### Scenario: Default
- **WHEN** a song opens with the Classic profile
- **THEN** "V:N code" and "V:T code" are both on and both kinds of voice lines show

### Requirement: Toggle labels name the voices
The toggles SHALL be labelled "V:N code" and "V:T code" (Italian "Codice V:N", "Codice V:T"), matching the V:N and V:T tags of Coming next. Their tooltips SHALL name the voices in full: "Voice: narrator: show its code in the panel; off: it still speaks, the code goes to the hidden code", and the same for "Voice: track". Their texts SHALL say "Voice: narrator" and "Voice: track", never a bare "Narrator".

#### Scenario: Tooltip
- **WHEN** the listener hovers "V:T code"
- **THEN** the tooltip reads "Voice: track: show its code in the panel; off: it still speaks, the code goes to the hidden code"

### Requirement: Voice track code hidden
With "V:T code" off, every voice-track line SHALL play from the hidden tail and none SHALL show, its track header included, in every profile. Copy and Open in Strudel SHALL include the hidden lines.

#### Scenario: Off while playing
- **WHEN** the listener turns "V:T code" off while a song with a voice track plays
- **THEN** no voice-track line is in the code panel and the voice track still speaks on the same bars

### Requirement: Hidden code and folded voice effects
The two toggles SHALL be independent of Technical functions → "Voice effects". With "Voice effects" on and a voice code toggle off, the voice line SHALL go to the hidden tail in its folded form, calling the same song function; nothing else in the code shown or heard SHALL change.

#### Scenario: Folded and hidden
- **WHEN** "Voice effects" is on and "V:T code" is off
- **THEN** the code panel shows no voice-track line, the hidden tail holds each voice-track line with its effects folded into one call, and the voice track sounds as with the toggle on
