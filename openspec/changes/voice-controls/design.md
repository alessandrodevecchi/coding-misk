## Context

`narratorStyle(song)` (`src/song/spoken.js`) reads `song.narrator`, set by the director from the style's `narrator`. `spokenFor` (`src/endless/director.js`) gives a song at most one spoken track with one pattern, by the style's `spoken.weight`, one way drawn from `spoken.ways`, one line; `spokenPlace` finds its bar.

## Decisions

### D1. Narrator style
A profile control `narratorStyle`: `auto` (default; the song's own), `explain`, `poetic`. It overrides `song.narrator` when not `auto`. It is a sound control, so in the radio it applies from the next song.

### D2. Narrated growth
Same control `narrated`, new name and hint, moved into the Voices group. No change in what it does.

### D3. Voice instrument options
`voice: { preset, phrases, kind, ways, presence }` in the director options (radio) and in the new-song-from-artist dialog. `phrases`: `1`, `2-3`, `4-5`, `6-8`, `many` (up to 12); `kind`: `different`, `repeated`, `mixed`; `ways`: subset; `presence`: `never`, `style`, `often` (style weight × 2, at most 0.9). Default preset `style` reproduces today's draw exactly (same random stream), so the fixtures do not move.

### D4. Several phrases
The spoken track gets one pattern per line (A, B, C…) and one clip per phrase. Places: quiet parts (intro, break, outro, few tracks), at most one phrase per part, spread across the song; a phrase that finds no place is dropped (the count is a ceiling). `repeated`: one line reused; `mixed`: one refrain line plus different lines.

### D5. Presets
Discreet: 1 phrase, different, all ways. Present: 2 to 3, mixed. Obsessive: 6 to 8, repeated, refrain and chop. In the radio they also set presence (Discreet: style, Present and Obsessive: often).

## Risks / Trade-offs

- Many phrases on a short song have few quiet parts: the ceiling and the one-per-part rule keep it listenable; `check:spoken` measures how many fit.
