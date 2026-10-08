# Proposal

## Why

Radio songs and playlist songs change with a plain end and start, which sounds like a jukebox rather than a set (#23). The owner wants the moves a DJ makes between songs, chosen by the artist's taste, in the radio and in playlists.

## What Changes

- **Six transitions:**
  - **Mix:** over the last 8 or 16 bars the next song's drums come in under the current one, the outgoing melodic parts fade and filter out, the tempo slides to the new one.
  - **Morph:** the tracks of the current song are swapped one at a time for those of the next, over 2 to 4 phrases, like a live build.
  - **Break and riser:** the current song drops to a break with a riser and a rising filter, then the next one starts on its drop.
  - **Echo out:** the current song ends into a delay and reverb tail, the next one starts as the tail fades.
  - **Interlude:** a long near-silence with a few sparse sounds and spoken comments, then the next song.
  - **Cut:** a plain end and start, as today.
- **Who chooses:** each artist has preferred transitions with weights, their lengths, and a harmony mode; chaos adds surprises. The Radio gets two menus: "Transitions" (the artist's, or always one kind) and "Harmony" (the artist's, compatible, free).
- **Harmony:** in compatible mode the director picks the next song's key a fifth up or down from the current one and a tempo the transition can reach with a ramp; in free mode keys and tempos stay as today and the transition adapts (a big jump makes the director prefer a break, an interlude or a cut).
- **Playlists:** a choice in the player bar between cut and mix for playlists; composed songs mix, code songs always cut.
- **Built-in artists** get transition preferences (for example HYPERDROP breaks, Lumen Drift long mixes and interludes, Wake Horizon morphs, The Purist cuts).
- **Out of scope:**
  - continuing a Compose song in the radio (`#29`);
  - long spoken passages such as speeches, poems or book excerpts, recorded or generated on the spot (new issue). The interlude uses the existing spoken comments.

## Capabilities

### New Capabilities

- `endless/transitions`: the six transitions, how the director writes them, artist preferences, the radio menus, harmony modes, transitions in playlists.

### Modified Capabilities

- `endless/radio-playback`: songs no longer always change with a plain end and start; the next song may overlap the current one.
- `endless/director`: the variety rule on keys gains the harmony modes.

## Impact

- `src/endless/`: a new transitions module; the director plans each transition and the next song's key and tempo; the radio window joins two songs with an overlap; artists gain `transitions` (format version kept, defaults for old artists).
- `src/radio/radio.js` (two menus), `src/main.js` (playlist mix through the same window as the radio, player bar choice), `src/i18n.js`, `src/style.css`.
- `artists/*.json`, `docs/ENDLESS.md`, `docs/ARTISTS.md`, seed fixtures (sessions change), checks for every transition kind.
