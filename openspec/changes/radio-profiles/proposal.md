## Why

The radio still builds every song in blocks. Since this change was put on hold (2026-10-16), Compose gained the Live coder growth with growth shapes (openings, paces, developments, free or fitted duration, typing that waits), the code of the moment with section lanes in the hidden mixer, compact technical functions with library and song functions, human typing with mistakes and pasting rules, the voice instrument and the poetic narrator. The radio gained the compilation, Continue in radio, sessions in playlists, the fast export, Vary, Swap and the material source in the console. `radio-variation` task 5.1 waits for this change.

The owner raised three questions this rewrite answers: how profiles work when saved songs play in a stream, how a session can be "only Live coder" when artists carry profile weights, and which source wins when several name a profile.

## What Changes

- **One resolution rule for the profile of every radio song.** Generated songs: the session's Profile control, then the compilation setup, then the artist's weights, then the style's declared profile, then Classic. Saved songs (song 0, frozen sessions, the playlist Mix): the song's own profile, then the session's forced profile, then the player default. Draws use their own seeded stream, so nothing else moves.
- **A session-level Profile control** next to Transitions and Harmony: "as the artist" (default) or one profile for every generated song. "Only Live coder" is this control set to Live coder. It overrides artist and style weights; it never filters artists out.
- **Artists and compilations name profiles.** Artist fields `profiles` (weights) and `growth` (duration and shape weights). Random artists draw them. A new built-in artist made for the Live coder. The compilation setup may limit or weight profiles.
- **Growths on air.** Crescendo and Live coder songs grow on air from the director's song, with the growth shape resolved as in Compose. Duration is fitted by default in the radio; free makes the song longer and moves the next one.
- **The code on air.** The panel shows only the song on air, in its profile's view: code of the moment, section lanes in the hidden mixer, compact and song functions, lit notes, line breaks, human typing with mistakes. The incoming song and the tail of the outgoing one play from hidden code, in full form on their own buses; an option shows both as today.
- **Commands become small edits.** On a grown song a command, a curve point or End becomes the next waypoint, reached by small typed moves. Vary and Swap are typed as notes edits (closes `radio-variation` 5.1). Mute is `_$:`, a volume is a `.gain()` on the line.
- **Same session, same sound.** Recipes record the Profile option. Recipes saved before this change replay in blocks, as heard. Saved sessions record the shapes version when they hold a grown song and warn when it differs. Freeze stores grown songs as heard.
- **Exports.** Fast export, radio ranges, session video and fast video play grown songs with the hidden code; the video shows the song on air only.

## Capabilities

### New Capabilities

- `endless/radio-profiles`: profile resolution for radio songs, the session Profile control, artist and compilation profiles, growths on air, the code on air with the hidden incoming song, commands as waypoints and small edits, saved songs in streams, replay, versions and exports.

### Modified Capabilities

None in their requirements. Steering, compilation, artists, playlists and exports gain behaviour described in the new capability.

## Impact

- **Code:** new `src/endless/profile.js` (resolution) and `src/endless/growth.js` (growth of a radio song, steering as waypoints); `src/endless/director.js` (`entry.profile`), `src/endless/artist.js`, `src/endless/artist-maker.js`, `src/endless/compilation.js`, `src/endless/steering.js`, `src/endless/join.js` (per-song controls, hidden parts); `src/song/crescendo.js` and `src/song/coder.js` (given waypoints, a start state); `src/radio/radio.js` (control, now playing, queue); `src/main.js` (radio playable, shown and evaluated code, Mix); `src/render/page.js` and the video for hidden code; `src/i18n.js`, `src/guide.js`; a new artist in `artists/`.
- **Checks:** a new `npm run check:radio-profiles` (Node), plus `check:endless`, `check:compilation`, `check:random`, `check:crescendo`, `check:typing`, `check:functions`, `check:export`, `check:video`, `check:guide`, `check:knowledge`, and the browser checks `check-radio`, `check-steering`, `check-transitions`, `check-playlists`, `check-export`, `check-video`, `check-compact-code`.
- **Docs:** `docs/ENDLESS.md`, `docs/ARTISTS.md`, the knowledge notes listed in the design (D14), the Guide, `DEVLOG.md`.
- **Depends on:** `growth-shapes`, `song-functions`, `material-generator`, `voice-instrument`, `radio-variation`, `radio-compilation`, `continue-in-radio`, `radio-sessions-in-playlists`, `radio-fast-export` (all in place). Replaces the 2026-10-16 version of this change.
