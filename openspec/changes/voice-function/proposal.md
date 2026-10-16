## Why

With the voice code shown, every spoken comment repeats the same chain of effects of its voice track (`.speed(0.9).stretch(0.778).hpf(400).distort(3.5).delay(0.1)…`), a technical part like the bus and the level (owner's feedback, #64). With short or mixer functions it should be one short call.

## What Changes

- **A voice function.** With technical functions short or mixer, the effects of a voice track are one call registered with the other short functions: `$: s("say_it_flo").n(115).mask("<0!39 1 0!424>").voice("flo")`. The call is defined in the hidden code from the voice track's settings and rack, so each voice keeps its own sound.
- **Full functions unchanged**: the chain stays written out.
- **Same sound**: the events are the same as with the chain written out.

## Capabilities

### New Capabilities

- `live-build/voice-function`: the voice's effects as one short call.

### Modified Capabilities

- `live-build/code-writing` (change `code-writing`): short and mixer also shorten the voice line.

## Impact

- **Code:** the voice line in `build.js`, the writer and the hidden helpers (`installHelpers`, `preludeText`), the render page.
- **Checks:** events equal with the chain and with `.voice()`.
