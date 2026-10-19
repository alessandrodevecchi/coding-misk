## Why

The checks fail when one track line peaks above 1.0, as if that were clipping. In the browser audio is floating point and every line passes the master level (0.6) before the output, so a line above 1.0 may never clip. Real clipping happens only at the output and in exported files. Some styles also want a louder, dirtier mix. The rule should protect the output and leave room for the style.

## What Changes

- **Output peak is the hard limit.** Checks measure the peak of the master output and of exported files; above 1.0 fails.
- **Track peaks become a warning** above the style's headroom, not an error.
- **Styles may set `headroom`** (default 1.0, at most 1.5) for louder lines in loud genres.
- **Saturation by sound.** A dirty sound comes from distortion (`crunch`, `shape`, filter drive), not from more gain; the knowledge base says so.
- **First, measure.** Confirm in the browser whether a line above 1.0 clips the output today (for example `neon-rush-reel` hats at 1.18 to 1.24).

## Capabilities

### New Capabilities

- `music/level-headroom`: output peak limit, track peak warning, style headroom.

### Modified Capabilities

None.

## Impact

- **Tools:** the level tools and the browser checks that test for clipping (`tools/snapshot-levels.cjs`, `tools/check-transitions.cjs`, `tools/check-spoken-play.cjs`, `tools/check-levels.cjs`, export checks).
- **Format:** optional `headroom` in style recipes, validated; `docs/STYLES.md`.
- **Docs:** `docs/knowledge/sound-and-levels.md`, recipes, DEVLOG.
