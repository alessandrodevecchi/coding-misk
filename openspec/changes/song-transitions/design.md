# Design

## Context

The director makes one song at a time (`createSession(...).next(options)`), each a complete v2 song with build steps. The radio keeps a stream of items `{ song, n, start, bars }` where each song starts on the bar after the previous one (`start = prev.start + prev.bars`), and plays a window song (`windowSong`) of the song on air plus the next one, on absolute bars. Skip and restart move the following starts. Playlists play songs one by one through the card path (`startCard`), with a cut. Build steps can add and remove tracks, set settings (gain, cutoff and others) and add rack devices (delay, reverb) at any bar.

## Goals / Non-Goals

**Goals:**
- Transitions written as data (sections, clips, build steps), so they compile like any song, open in Compose, and stay deterministic.
- One join function used by the radio, by joined sessions (`--join`) and by playlists.
- Artist preferences with defaults, so older artists and sessions keep working.

**Non-Goals:**
- Continuing a Compose song in the radio (`#29`).
- Long spoken passages (new issue); beat matching of code songs.

## Decisions

### The director plans, the join writes

Each session entry gets `transition: { kind, bars, ramp }`, the transition from this song to the next, drawn when the next song is made (it needs both tempos): kind from the artist's weights (or the override), raised by chaos toward less preferred kinds; length from the artist's range rounded to phrases; a mix or morph over a tempo gap above 12 BPM falls back to another preferred kind without an overlap. The draw uses a new named random stream `transition`, so adding it does not shift the other streams more than needed; seed fixtures are rewritten once, with the reason in the commit.

The songs themselves stay as generated. `joinPair(a, b, transition)` (pure, in `src/endless/transitions.js`) turns the end of A and the start of B into the joined material on the shared timeline:

- **Overlap kinds (mix, morph, echo out)** place B's start `overlap` bars before A's end. A's last section is split at the overlap start; the overlap bars keep A's key and chords, with `bpm` A to `bpmEnd` B for a ramp. B's sections that fall inside the overlap are dropped from the timeline (B's intro is shortened, as a DJ mixes an intro under an outro), and B's clips are shifted by `-overlap`.
  - **Mix:** during the overlap only B's drums and texture tracks sound (they do not depend on the key); B's other tracks start after it. Steps on A's melodic tracks lower gain and cutoff phrase by phrase to silence at the end; A's drums leave on the last bar.
  - **Morph:** the overlap is split in steps on half phrases; each step removes one of A's tracks and adds one of B's (by type: drums for drums, bass for bass first), the second half of the overlap takes B's key and chords.
  - **Echo out:** overlap of 1 or 2 bars: A's tracks get a delay and a reverb device on the overlap's first bar and are removed on its last; B starts on the overlap's first bar with drums only, the rest as written.
- **Break and riser:** no overlap. A's last phrase keeps pad and texture, the rest is removed, a riser track and a rising cutoff are added; B starts with a crash on its first section.
- **Interlude:** a short segment between A and B: one to four phrases in A's key at B's tempo, with at most two quiet tracks taken from A (pad or texture) at low gain, one sparse sound on some bars, and one or two spoken comments from a new "interlude" pool. In the stream it belongs to A (A's length grows by the interlude bars).
- **Cut:** nothing changes.

The radio computes each start as `prev.start + prev.bars + interlude - overlap`. `windowSong` and `joinSession` call `joinPair` for every pair. Skip and restart drop the planned transition of the song they cut (a skip always cuts).

### Artist format

`transitions: { kinds: { mix, morph, break, echo, interlude, cut }, bars: [lo, hi], harmony: 'compatible' | 'free' }`, all optional; defaults `{ mix: 3, cut: 2, morph: 1, break: 1, echo: 1, interlude: 0.5 }`, `[8, 16]`, `compatible`. The validator checks the kinds and ranges; the Artists tab shows them as bars like the other weights, and the form edits them. Built-in artists get tuned preferences: Night Owl long mixes and echo, HYPERDROP break and riser, Lumen Drift mixes and interludes, Jukebox Joe cuts and breaks, The Purist cuts and mixes, Wake Horizon morphs and mixes.

### Harmony

Compatible mode picks the next key among the style's keys a fifth up or down from the current key (the app's keys are minor, so a fifth keeps most notes in common), and a tempo within 12 BPM when the styles' ranges allow; otherwise it falls back to the old rule and the transition picks a kind without overlap. Free mode keeps the old rule. The radio's "Harmony" menu and the artist's `harmony` choose the mode; the session recipe records it.

### Playlists

The player bar gets a small "Mix" switch for playlists (remembered as `coding-misk-playlist-mix`). With mix on, a run of consecutive composed songs in the playlist's play order is joined with `joinPair(..., { kind: 'mix', bars: 8 })` into one long song, played as one live build; a code song breaks the run and plays with a cut. The queue keeps working on songs: the player bar reads the playing song and its position from a bar map of the run; previous and next seek inside the run; shuffle decides the order before the run is joined; repeat one turns the mix off for that song.

## Risks / Trade-offs

- During a mix B's bass and melody wait until the overlap ends, so the mix sounds like a drum blend; with compatible keys a later step could bring B's bass in earlier.
- Morph halfway changes key under A's remaining tracks; with compatible keys (a fifth) the clash is small, in free mode it is audible and becomes part of the artist's character.
- Long joined runs in playlists compile more code; runs are joined lazily, two songs ahead.
- Seed fixtures and any saved session recipe change meaning; sessions recorded before this change replay without transitions only if the recipe says `transitions: cut`, which old recipes do not have. Accepted: the radio is not yet released to others.
