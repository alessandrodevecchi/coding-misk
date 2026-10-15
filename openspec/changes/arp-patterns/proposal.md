## Why

The arpeggio still writes every note of every chord (16 notes per chord), so its line stays long in the short patterns (#64). Strudel's `.arp()` plays the notes of a chord in a given order: the chords are written once and the order once. A test gave the same notes (onset, length, pitch), also with chords outside the scale. The owner also wants a pure Switch style without arpeggio, closer to the reference, next to today's richer one.

## What Changes

- **Arpeggio with `.arp()`** in the short patterns generator: `note("<[a3,c4,e4,a4] [f3,a3,c4,f4] …>").arp("[0 1 2 3 2 1 0 2]*2")`, used only when every chord plays the same order of its notes; otherwise the line stays as it is.
- **Growth of the arpeggio** in the gradual and natural growth: the order string grows (`"0*4"` → `"[0 ~ 2 ~]*2"` → the written order).
- **Switch · trance pure.** A new style of the Switch family without arpeggio: one or two chords, a lead written with scale degrees and the progression added on top. The current Switch · trance stays as the rich one.

## Capabilities

### New Capabilities

- `live-build/arp-patterns`: the arpeggio written with `.arp()`, its growth, and the pure Switch style.

### Modified Capabilities

- `live-build/idiomatic-code` (change `idiomatic-code`): the arpeggio form.

## Impact

- **Code:** `src/song/idiom.js` (arpeggio form), the growth engines (order string variants), a new recipe in `styles/`.
- **Checks:** events equal for the arpeggio form on all built-in songs; the pure style's songs (one key, at most two chords, no arpeggio).
