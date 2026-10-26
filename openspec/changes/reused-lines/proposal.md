## Why

In Live coder songs a line that was typed before, or a near copy of it, is sometimes typed again from scratch, and fast. The owner heard it on kellerlicht: the acid line typed in the growth around 7:00 is deleted at Tunnel (bar 280) and typed again at bar 320 (Körper, 9:42) in 11.4 s instead of the 31.7 s a person needs (2.8 times a person's pace). Over the 38 built-in songs, 45 new lines are typed from scratch although a line at least 80% alike was typed before and has gone (28 identical), 39 of them in the written part and 39 of them faster than a person can type (up to 34 times on neon-rush-reel). A person keeps such a line muted, unmutes it, copies it from earlier code, or edits only what differs.

A person with time to spare also gets ahead: in quiet bars they type, muted, a line the next section needs, so the section change only unmutes it. The written part types every new line at its own step, so section changes stay crowded while the bars before them leave time unused.

The radio grows every Live coder song with the default shape search (8 shapes), whatever Settings, Advanced says. The owner wants the radio to respect "Growth shapes tried", "Try all growth shapes" and "Random order", with 8 shapes and the random order still the defaults, and the next song ready in time.

## What Changes

- **Mute or delete costed on the code shown.** The choice between keeping a silent line muted and deleting it (written-like-coder D5) is costed on the line as the code shows it (long linear lists typed as ramps), and on the line's own share of its track's typing, not on the whole track. On kellerlicht's acid line the edit of the muted line costs 7.2 s against 41.1 s typed new; today both costs read about 51 s (the list of 130 literal values before the ramp), so a seeded draw deletes it.
- **A line replaced by another pattern stays muted when it returns.** When a track's line is replaced by an unlike line (another pattern of the same track) and comes back later, the old line stays muted next to the new one, and on its return it is unmuted and the other muted or deleted. Today they share one place and the old line is typed again (kellerlicht: the rolling bass at Druck, the floor kick at Abstieg).
- **Copy from earlier code.** A new line that is the same as, or close to, a line typed earlier in the song and no longer in the code is pasted as a copy of that line and edited where it differs, as a line like one above it is today. It applies to the growth too (one way of typing for the whole song), so the shape kept by some songs may change.
- **Edit returning lines while muted.** A muted line that returns changed is edited into its return form while still muted, in the step of its silence that leaves the most time, so the step it returns on only unmutes it.
- **Type new lines ahead, muted.** When a step of the written part leaves time to spare (quiet bars, a long gap before the next change), a brand-new line of a coming step, preferably a crowded section change, is typed there muted in its final form, and its own step only unmutes it. Limits keep the screen readable: few lines ahead at once, a short look-ahead, none when the code already shows many muted lines.
- **Radio shape settings.** "Growth shapes tried" (default 8), "Try all growth shapes" with "Keep", and "Random order" (default on) also apply to the radio. "Long song from" stays Compose only for now (the radio keeps 15 minutes). The radio stores them in the session it starts, grows each song first with the default search and then, in the background, with the settings; the wider result replaces the default one only when it is ready before a time limit, and the session records which growth each song played, so a replay or an export grows the same song.
- **Same sound.** Muted lines play nothing; every hap of every step stays the same in every profile.

## Capabilities

### New Capabilities

- `live-build/reused-lines`: how a Live coder build writes and types a line that was in the code before (muted, replaced, copied, edited while muted), and a new line typed ahead, muted.
- `endless/radio-shape-search`: the growth shape settings on air, their time limit and their record in the session.

### Modified Capabilities

None in `openspec/specs/`. This change supersedes the open change `shape-search` where it says that the radio uses the default search (requirements "A cap on the shapes tried" and "Try all shapes and random order": the cap, try all and random order now apply on air; "Long song from" keeps its default on air), and refines `written-like-coder` D5.

## Impact

- **Code:** `src/song/compile-compact.js` (`muteOrDelete`, `returnKeys`, `withReturning`, `compileNow`), `src/live/live-code.js` (the text transform passed to the costs, the steps that edit muted lines), `src/song/typing.js` (`typingPlan`: copy from earlier lines), `src/live/typing-load.js`, `tools/growth-probe.mjs`, `src/main.js` (`makeTyping` passes the earlier lines), `src/endless/growth.js`, `src/endless/grow-worker.js`, `src/radio/radio.js`, `src/settings/settings.js`, `src/i18n.js` (hints that say the radio uses 8), `src/guide.js`.
- **Versions and fixtures:** the Live coder code fixtures move (written part); the typing measure of the growth changes only through the copy from earlier code, so `SHAPES_VERSION` goes up when the Live coder fixtures move (`SHAPES_SEED` stays 5); Crescendo fixtures do not move. `npm run durations` in the same commit. The radio fixtures do not move with the default settings; `DIRECTOR_VERSION` does not change.
- **Checks:** `check:mixer -- --full`, `check-compact-code.cjs`, `check:typing`, `check:crescendo -- --full`, `check:live-code`, `check:profiles`, `check:radio-profiles`, `check-settings.cjs`, `check-radio.cjs`, `check:guide`, `check:knowledge`; the reused-line count in `growth:probe`.
- **Depends on:** `written-like-coder`, `shape-search` (both merged in `develop`).
