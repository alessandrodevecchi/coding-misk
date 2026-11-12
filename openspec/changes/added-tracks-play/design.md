# Design

## Measurements (12 November, before the change)

Seeded radio songs in Node, steered as the radio steers them (`steerSong` for Classic, `steerOnAir` with batches for Live coder and Crescendo). For each listener track (`plan.added`): the bar its batch takes, the first bar it sounds, the bars it sounds in its entry phrase, and the longest silence after it first sounds, up to the closing outros.

| Songs | "+" tracks | Not the whole entry phrase | Press to sound | Silence over 58 s after entry |
| --- | --- | --- | --- | --- |
| Live coder, 10 songs, mixed styles, batches of 1 to 4 | 39 | 0 | median 13 s, max 43 s | 0 |
| Crescendo, 10 songs, same | 41 | 0 | median 13 s, max 49 s | 0 |
| Live coder, 20 slow songs of 10 minutes (ambient, darksynth, acid, berlin-techno) | 169 | 0 | median 14 s, max 54 s | 0 |
| Live coder and Crescendo, 20 songs each, the checklist burst fx8 (3 kicks, 1 beat, 2 melodies) | 78 + 78 | 0 | max 48 s | 0 |
| Classic, 60 songs, batches on phrase starts | 453 | 0 | (on the boundary) | not measured |
| Classic, 60 songs, half of the batches on half-phrase starts, other commands, under the cap | 610 | 8 (all on half-phrase starts, all before a break) | (on the boundary) | 5 |

The 8 short tracks played 4 of their 8 bars: the "+" came in on the half-phrase start, the break on the next phrase start took the drums out, and the track came back at the drop. Without the cap (the console disables "+" at 12 tracks, so the radio never sends this), 17 of 538 half-phrase entries were short.

The 5 long silences are drums that sat out a break (16 bars) and then waited for room under the 12-track cap at the drop (D8 of after-tests-oct28: "as many as fit; the others wait for a later phrase"). Two of them did not come back before the outro, because the director's own tracks kept the room. This is the designed cap rule, not changed here; it is reported to the owner.

The Live coder and Crescendo songs measured never took a half-phrase start: those come only when the next phrase start is more than 30 s after the press (8-bar phrases under about 64 BPM, or 16-bar phrases such as ambient). The director change applies to them too, because a grown song's written form comes from the same director.

## D1. A half-phrase "+" counts as brought in on the next boundary

In `directSong`, the set `brought` (tracks the listener brings in on boundary k, which the break and the charge of k leave in) also holds the listener tracks whose bar is the half-phrase start before k (`at - phrase / 2`). The ids come from `protect` (every listener track with its bar), not from the forced moves: a later command on boundary k rewrites the song from k, and its forced moves no longer hold the earlier half-phrase "+".

## D2. Breaks and drops stay coherent

- The break still takes out every other drum: the director's own and the listener's drums that came in earlier. Only the track that came in half a phrase before the break stays, as a track brought in on the break's own boundary already does (radio-arrangement D4). The listener asked for it a few seconds before the break, so it plays through the break.
- The charge before a drop takes out another drum, never the one just added.
- The drop is unchanged: the drums that sat out the break come back on it; the track that stayed keeps playing.
- Rejected: taking the track out on the half-phrase bar of the break (one phrase heard, then the rest of the break without it). The director writes no move of its own on half-phrase bars, and a later rewrite from that half-phrase start would lose it.

## D3. No change to songs without commands

The rule reads only listener tracks, so the director's songs without console commands are the same. `npm run check:endless` keeps its fixtures, and `DIRECTOR_VERSION` stays at 20. A saved session with a "+" on a half-phrase start before a break plays that track through the break when replayed.
