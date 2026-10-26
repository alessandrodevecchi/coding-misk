## Why

After the growth, a Live coder song plays its written part, and its code of the moment is rewritten section by section. A track that is silent in a section disappears from the code and is typed again from scratch when it comes back, even when it comes back almost unchanged. On luci-rosse the drums vanish in Taglio (2 bars) and Ombra (4 bars); Scontro 2 brings them back with only `crunch(1.6)` turned into `crunch(1.5)` and one mask value changed. Typing a line takes about 9.5 s; muting it with `_$:` 0.6 s, unmuting it 0.2 s, changing a number in place 0.7 s. The change before Scontro 2 needs 58 s of typing in 4.6 s, so the app pastes it, and the code jumps instead of looking played.

## What Changes

- **Silent tracks stay muted.** In code edited in place (Live coder, and any profile with the Sections option), a track silent in a section stays in the code with its last lines muted (`_$:`) when it plays again later in the song. A track that never plays again is removed.
- **Returning lines edited in place.** When a muted track plays again, its lines are unmuted and only the values that changed are edited.
- **Mute or delete, per line.** Muting and editing is not always cheaper: a line that returns much changed costs more to edit than to type again. For each line that goes silent and returns, the typing estimates both ways (mute now and edit on return, or delete now and type again on return) and takes the cheaper one, with seeded variation when the two are close, as a person would.
- **Same sound.** Muted lines play nothing; the sound, the length and the hidden mixer stay the same.
- **Later, not here.** Code blocks that return become variables or song functions, called in short (a separate change after this one is measured).

## Capabilities

### New Capabilities

- `live-build/written-like-coder`: how the written part of a song is written in code edited in place.

### Modified Capabilities

None in `openspec/specs/`.

## Impact

- **Code:** `src/song/compile-compact.js` (`compileNow`: silent tracks that return shown muted, or left out when typing them again is cheaper), `src/live/live-code.js` (which tracks return), `src/song/typing.js` (the cost of each way).
- **Code look changes, sound does not:** `check:mixer -- --full` and `check-compact-code` must pass; the Live coder code fixtures and typing checks move where the written part is shown; the growth does not change when `shape-search` judges shapes on growth steps only (this change goes after it).
- **Checks:** `growth:probe` on the written part of luci-rosse, settimo-cielo and kellerlicht before and after (typing time per section change, pasted lines).
- **Depends on:** `shape-search`.
