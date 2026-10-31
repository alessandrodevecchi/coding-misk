## Context

The code panel (`#edhost`) is scrolled by `followEdit` in `src/main.js` each time the typed code changes (`typeFrame`), with a short glide. Nothing can stop it. The panel header (`.codehead .code-tools`) holds the full-screen and collapse buttons.

## Goals / Non-Goals

**Goals:** a remembered on/off toggle; a pause after manual scrolling; no change to how the code is typed or lit.

**Non-Goals:** the code views of videos, fragments and Code over; hand takeover (when the person types, the app already stops typing).

## Decisions

- **D1. Where.** A toggle button in `.code-tools`, before the full-screen button, with an icon and `aria-pressed`. A text label would not fit the header on a phone; the tooltip and aria label carry "Follow edits". Alternative considered: a setting in Settings; rejected because the person needs it while reading the code.
- **D2. Storage.** A localStorage key (`coding-misk-code-follow`), read with the existing store helper; it goes into the settings backup like the other UI choices.
- **D3. Manual scroll detection.** `wheel`, `touchmove`, `keydown` (arrows, Page Up/Down, Home, End) on the panel, and `pointerdown` on its scrollbar, start the pause. The app's own glide does not listen to these events, so it never starts a pause. A `scroll` event alone is not used, because the glide fires it too.
- **D4. Pause length.** 10 seconds after the last manual scroll, a constant in the code (the owner can change it later). When the pause ends, the panel follows from the next edit, it does not jump at once.
- **D5. Paused look.** The toggle keeps `aria-pressed="true"` and gets a paused class (dimmed, with a small clock or pause mark), and its tooltip says "Paused while you read: follows again in a few seconds. Press to follow now."

## Risks / Trade-offs

- A person scrolling with the keyboard inside the editor to edit by hand starts a pause: harmless, since hand editing stops the typing anyway.
- 10 seconds may feel long or short; it is one constant.
