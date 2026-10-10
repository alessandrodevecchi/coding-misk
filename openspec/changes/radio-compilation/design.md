# Design

## Context

Artists already carry style weights, knob ranges, shapes, moves, quirks and transitions (`artistSongOptions`); the director plans each song from options and a seeded stream; a session recipe holds the options and the listener's changes. Genres group styles (`#43`).

## Decisions

- **A compilation is a sequence of segments.** At each change a segment is drawn with the session's random stream (a new stream name, `compilation`): its length (1, or 2 to 4), then an artist or a style set. An artist gives the song options through `artistSongOptions`; a style set gives 1 to 3 styles of one genre (two genres at most) and knob values drawn in the setup's ranges.
- **Journey:** genres sit in a fixed ring of neighbours (electronic, club, rock and metal, jazz and others); the next genre is the same or a neighbour, with a jump chance of 0.1 plus 0.3 × chaos. Free: any allowed genre.
- **Random artists** come from the maker of `random-tools`, seeded from the session seed and the segment index, so they replay too.
- **Recipe:** `compilation: { every: 'song' | 'some', setup }` in the session options; old sessions without it play as before. Director fixtures do not change (compilation off by default).
- **UI:** the button cycles off, every song, every 2 to 4; two small lamps show which. The setup opens in a panel under the radio controls: movement switch, genre and artist chips, a random artists switch, a two-handle range per knob, presets (pick, save as, delete; built-ins cannot be deleted).

## Risks / Trade-offs

- Genre jumps can feel abrupt: harmony stays on and the transition picks a cut or a break when tempo or meter are far apart (already done by the director).
