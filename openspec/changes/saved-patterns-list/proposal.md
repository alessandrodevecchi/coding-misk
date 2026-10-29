# Proposal

## Why

The radio console's "Aggiungi un pattern salvato (n)" panel (radio-arrangement, #83) lists every saved pattern that fits the song on air, all at once. The owner noted in test ar9 that showing only the saved ones is right, but that the panel needs a plan for when there are many: paging or scrolling.

Measured today on a dev server with seeded patterns (berlin-techno song on air, Italian UI):

| Saved | Listed (fit) | Panel closed (desktop / 400 px) | Panel open (desktop / 400 px) | Console render with the panel |
| --- | --- | --- | --- | --- |
| 10 | 10 | 153 / 286 px | 895 / 1630 px | 29 ms |
| 40 | 32 | 471 / 913 px | 2911 / 5262 px | 70 ms |
| 120 | 97 | 1345 / 2635 px | 8423 / 15593 px | 205 ms |

With 120 saved patterns the open panel is taller than 8 desktop screens, the controls below it (Sound, Harmony, Voice, Song, queue, mixer) move far down the page, and each row paints its own preview canvas (97 canvases). The console rebuilds all its HTML at every phrase, so a scroll position, a search field or a focused button inside the panel would be lost every few seconds.

## What Changes

The recommended option (C in the design) keeps the panel in the console and makes it findable:

- **A toolbar** when more than 8 patterns fit: a search field (name, instrument, style), a chip "Adatti al brano" (the song's style or no style, tempo within 1.5 times), a Stile menu and an Ordina menu (Recenti, Più usati, Nome, Tempo vicino).
- **Instrument chips** with counts (only the instruments present), like the Patterns tab kind chips.
- **Groups by instrument** when no filter or search is set: a collapsible header per instrument with its count, the first 4 patterns and "Mostra tutti (n)", as the Patterns tab groups its kinds. With a filter, a search or another sort, one flat list.
- **A scroll area of fixed height** around the list and the cards, so the panel never grows past about one screen; the rest of the console stays in place.
- **Use counters**: a saved pattern records how many times it was brought into a song and when it was last used (console and Compose), for "Più usati" and "Recenti".
- **Stable while the song plays**: the panel keeps its scroll position, the search text and the focus across the console's phrase renders, and draws only the previews in view.
- **Keyboard**: P focuses the search; Esc clears it, then leaves it; the arrows move from the search to the first pattern.
- **Phone and hardware theme**: toolbar wraps, the scroll area is at most 60 % of the screen; in the hardware theme the scroll area is a recessed well and the search an LCD-like field.

The folded list and the open cards stay as today, with the same actions (listen, Aggiungi come traccia nuova, Sostituisci) and the same fit rule. The other options (scroll with chips only, pages, a "Sfoglia" window with suggestions) are compared in the design.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `endless/steering`: a new requirement for finding a saved pattern among many in the console panel; the use counters of saved patterns.

## Impact

- `src/radio/radio.js` (the panel, its state, its partial render), a new pure module for filtering and sorting saved patterns (testable in Node), `src/library/patterns.js` (use counters, `created` and the counters passed by `forRadio`), Compose's Add to song (counter), `src/i18n.js`, `src/style.css`, `src/guide.js`.
- Checks: `npm run check:patterns` (counters, filter and sort), `tools/check-steering.cjs` (panel with 120 patterns), `npm run check:guide`, `npm run check:knowledge`.
- No change to the director, the replay of sessions or `DIRECTOR_VERSION`: the commands still carry a copy of the pattern.
