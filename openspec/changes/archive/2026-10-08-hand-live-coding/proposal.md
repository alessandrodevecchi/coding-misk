# Proposal

## Why

During a live build, anything typed in the code panel is overwritten by the next step (#20). Live coding by hand is the spirit of the project, so the user should be able to take over a song that builds itself, play their own code, and give control back to the song when they want.

## What Changes

- **Take over by typing**: the first character typed in the code panel (not a click, a selection or a copy) switches the song to "by hand": steps stop writing the code, the music keeps playing the last code evaluated, and Ctrl+Enter plays the user's code as usual.
- **Song keeps time**: tempo and sections go on as written; at the end of the song the music does not stop and keeps playing the user's code until stop.
- **Resume live build**: a button brings the code back to what the song would have at the current bar, typing it from the user's code, and the steps start again from there. The user's last code is kept in a collapsible "your last code" block under the editor, with copy and "back to this code".
- **Where**: Compose (songs with their own steps and the "Live build" switch) and the Radio (the song on air is held, no song change, until resume).
- **Visible state**: a "BY HAND" label next to the code title with the resume button; spoken comments are silent while by hand.

## Capabilities

### New Capabilities

- `live-build/hand-takeover`: taking over a live build by typing, playing by hand, resuming the build, the kept code, behaviour in Compose and in the Radio.

### Modified Capabilities

None as specs: the live build (`#17`) and the radio (`endless-radio`) have no archived specs yet; their behaviour changes only while "by hand" is on.

## Impact

- `src/main.js`: editor input detection, a "by hand" state in the player and the transport (no steps, no stop at the end, no comments), resume.
- `src/radio/radio.js`: hold and resume the stream.
- `index.html`, `src/style.css`, `src/i18n.js`: label, resume button, last-code block.
- Saving the hand-written code as a new song version is a later issue (#33).
