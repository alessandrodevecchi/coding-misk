# Design

## Context

The panel "Aggiungi un pattern salvato (n)" sits in the radio console under the Parts group (radio-arrangement D9). It shows the saved patterns that fit the song on air (`fitsAir`: an instrument the style plays or the song holds, the same steps per bar) and counts the others ("5 in un altro metro · 18 per uno strumento che lo stile non suona"). Closed, it is a two-column list (listen, 64×20 drawing, name, instrument chip); open, a grid of cards (key, tempo, styles, a 220×44 drawing, Aggiungi come traccia nuova, Sostituisci). The open state is remembered (`coding-misk-radio-saved-open`).

The console is rebuilt with `innerHTML` whenever its render key changes: every phrase, every queued command, a preview starting or stopping, a change of the saved patterns. The panel is part of that rebuild.

Saved patterns live in `coding-misk-patterns` with `{ id, name, kind, type, pattern, sound, settings, context { key, chords, meter, bpm, mode }, styles, source, seed, why, created }`. `forRadio` passes name, kind, type, pattern, sound, settings, styles and context to the radio, not `created`. Nothing records how often a pattern is used.

Lists elsewhere in the app:

- Songs tab (#34, #67): search, filter chips, sort menu, pages of 20 with a pager above and below (`pageOf`, "1-20 di 97").
- Patterns tab (#72): search, source chips, kind chips with counts; with all kinds and no search, groups by kind with a few cards each and "Mostra tutti (n)"; otherwise a flat list with "Mostra altri (n)".

### Measurements (2026-10-29)

A temporary browser profile on a dev server at port 5208, 0, 10, 40 and 120 patterns made from the built-in catalogue (mixed instruments, keys, tempos, styles, about 8 % in 7/8), radio on berlin-techno. The owner's data was not touched.

| Saved | Fit | Closed panel, desktop | Closed, 400 px | Open, desktop | Open, 400 px | Console nodes (closed / open) | Render with the panel |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | 0 | 43 px | 61 px | 43 px | 61 px | 220 / 220 | 18 ms |
| 10 | 10 | 153 px | 286 px | 895 px | 1630 px | 310 / 360 | 29 ms |
| 40 | 32 | 471 px | 913 px | 2911 px | 5262 px | 509 / 671 | 70 ms (100 ms phone) |
| 120 | 97 | 1345 px | 2635 px | 8423 px | 15593 px | 1094 / 1582 | 205 ms |

With 120 saved: the console is 2377 px tall closed and 9454 px open on desktop (1074 px with no patterns); on a phone the open panel alone is about 18 screens. The render time is the console rebuild plus the preview drawings, measured on the toggle; the same rebuild runs at every phrase. Screenshots: `notes/prove-2026-10-29/pattern-salvati-radio/oggi-120-pattern-*.png`.

Findings that hold for every option:

- F1. A scroll position, a typed search or a focused button inside the panel is lost at the next phrase, because the console is rebuilt. Any option needs the panel to keep its own state and restore it after a rebuild (the typed line of the Voice group already restores its caret this way).
- F2. Painting every preview at every rebuild costs most of the 205 ms. Draw only what is shown (groups, a page, or the rows inside the scroll area).
- F3. The open cards are about 6 times as tall as the folded rows; any option must bound the open view too, not only the list.

## Goals / Non-Goals

**Goals:** find a pattern fast among 100 or more while the radio plays; keep the console's other groups within reach; the same look and words as the Songs and Patterns tabs; phone, hardware theme and keyboard.

**Non-Goals:** changing the fit rule, the actions or the sound of a saved pattern; editing patterns from the radio (the Patterns tab does it); favourites or votes (pattern-library D8, later).

## Options

### A. Scroll area and instrument chips

What the owner sees: the panel as today, with a row of instrument chips (Tutti 97, melodia 31, basso 19, ...) above a box of fixed height (about 300 px closed, 420 px open) that scrolls; a count under it ("97 pattern · scorri per vederli tutti"). Mockups: `A1-scorri-filtro-strumento.png`, `A2-scorri-schede-basso.png`.

- Phone: the box takes at most 60 % of the screen height; the chips wrap. A scroll box inside a scrolling page is easy to get stuck in with a thumb.
- Hardware theme: the box as a recessed well (dark inset), chips as the usual hardware keys.
- Keyboard: Tab through chips, then through the rows; no search.
- Cost: about 3 agent hours (box, chips, restore scroll after a rebuild, paint in view, check, guide).
- Pros: smallest change; one gesture; the console stays short.
- Cons: with 30 melodies the owner still reads a long list; no way to find "the bass I used yesterday"; nested scrolling on the phone.

### B. Pages, like the Songs tab

What the owner sees: 12 patterns per page, "1-12 di 97" and the pager (‹ 1 2 3 … 9 ›) above and below, the same as the Songs tab. Mockups: `B1-pagine-elenco.png`, `B2-pagine-schede.png`, `B3-telefono.png`.

- Phone: 12 rows fit about one screen; the pager chips are small targets.
- Hardware theme: pager chips as hardware keys, the current page lit.
- Keyboard: Tab to the pager; could add PageUp and PageDown on the panel.
- Cost: about 3 agent hours (reuses `pageOf` and the pager markup; keep the page across rebuilds; check, guide).
- Pros: consistent with the Songs tab; fixed height; cheap; no nested scrolling.
- Cons: the wanted pattern is on "some page"; paging while a song plays is slow; pages shift when a pattern is saved; still no search.

### C. Search, filters, sort and groups (recommended)

What the owner sees: when more than 8 patterns fit, a toolbar with a search field ("Cerca tra 97 pattern"), a chip "Adatti al brano", a Stile menu and an Ordina menu (Come nei Pattern, Recenti, Più usati, Nome, Tempo vicino); instrument chips with counts. With no filter and no search, one collapsible group per instrument with its count, its first 4 patterns and "Mostra tutti (n)" (as the Patterns tab groups its kinds). With a filter, a search or a sort other than the default, one flat list, closed as rows or open as cards, with a line "6 di 97 · basso · adatti al brano · più usati". The list and the cards sit in a scroll area of fixed height. Open cards show "usato 4 volte · 5 giorni fa". Mockups: `C1-cerca-filtri-gruppi.png`, `C2-cerca-piu-usati-schede.png`, `C3-telefono-hw.png` (phone, hardware theme).

- Phone: toolbar wraps to two lines (search and the fit chip, then the two menus); chips wrap; the scroll area is at most 60 % of the screen; groups keep the closed panel short even with no filter.
- Hardware theme: search as a dark LCD field with the accent text, menus as the amber LCD selects already used in the console, the scroll area as a recessed well (see `C3`).
- Keyboard: P focuses the search (P is free in the console's keys); Esc clears it, a second Esc leaves it; ArrowDown from the search goes to the first pattern's listen button; Enter on a group header opens or closes it. The console's other keys stay off while typing (the handler already ignores inputs).
- Cost: about 8 agent hours (7 to 10), see tasks.
- Pros: finds a known pattern by name in two keys; the owner's own habits (recent, most used) come first; "Adatti al brano" narrows to what will sound right without hiding the rest; the same words and chips as the Patterns and Songs tabs; works for 10 and for 500.
- Cons: more controls in an already dense console (hidden under 9 patterns); needs use counters in the store; the most code to test.

### D. Suggestions in the console, "Sfoglia" in a window

What the owner sees: the panel shows only 6 suggested patterns for this song, each with why it is suggested ("parte scelta: melodia", "stile del brano", "tempo vicino", "usato ieri"), and a button "Sfoglia tutti (97)" (key P). The button opens a window over the page with the search, filters, sort and the full grid of cards; the radio goes on, Esc closes it. Mockups: `D1-suggeriti-sfoglia.png`, `D2-sfoglia-finestra.png`.

- Phone: the window takes the full screen, like a sheet; the console stays short.
- Hardware theme: the window as a hardware panel with screws, the grid in a well.
- Keyboard: P opens, focus moves to the search, Tab stays inside the window, Esc closes and gives the focus back.
- Cost: about 11 agent hours (C's filter and sort, a scoring of suggestions, the window with focus handling, phone sheet, checks).
- Pros: the shortest console of all options; the best pattern is often one click away without searching; the full browser has room for big cards.
- Cons: suggestions can be wrong and hide what the owner wants; a window over the radio covers the scope, the queue and the mixer while choosing; the most cost; a new UI pattern (no other window like this in the app).

### Comparison

| | A scroll + chips | B pages | C search + filters + groups | D suggestions + window |
| --- | --- | --- | --- | --- |
| Console height with 120 | bounded | bounded | bounded | shortest |
| Find a known pattern | scroll | flip pages | type 2 to 3 letters | type in the window |
| Owner habits (recent, most used) | no | no | yes | yes |
| Consistent with | Patterns tab chips | Songs tab pager | Patterns tab groups, Songs tab search and sort | nothing yet |
| Phone | nested scroll | small pager | good | good |
| Cost (agent hours) | about 3 | about 3 | about 8 | about 11 |

### Recommendation

C. It answers the owner's note for any number of patterns, reuses the look and words of the Patterns tab (chips, groups, "Mostra tutti") and the Songs tab (search, sort), and includes A's bounded scroll area, so it is never worse than A. B's pages solve height but not finding. D is better for a very large library but costs more and hides the console while browsing; its "why suggested" tags can come later as a sort "Più adatti" inside C.

If time is short, A is a safe first step: C's scroll area and chips are A, and the rest adds on without rework.

## Decisions (for option C)

### D1. State of the panel

Kept in the radio's closure, not in the console's HTML: `q` (search), `inst` (instrument chip, `all` by default), `fit` (bool), `style` (`all` or a style id), `sort` (`saved` by default, `recent`, `used`, `name`, `tempo`), `closedGroups` (instruments collapsed), `scrollTop`. `inst`, `fit`, `style`, `sort` and `closedGroups` are remembered in `coding-misk-radio-saved-view` (like the open state); `q` lives while the page is open. A chip, a menu or the search re-renders only the panel's body, not the console. After a console rebuild the panel restores `scrollTop`, the search text and its caret, and the focused element by its data attribute.

### D2. Filter and sort, pure

A new module `src/radio/saved-view.js` (no DOM): `savedView(patterns, view, song)` returns `{ groups | items, total, shown }`. Search: accent-folded words (the Songs tab's `fold`), each word in the name, the instrument name, the kind or a style. Fit chip: a style tag equal to the song's style or no style tag (`any`), and the saved tempo within 1.5 times the song's tempo (the threshold of today's tempo hint). Key is not a filter: a saved pattern always moves to the song's key. Sorts: Come nei Pattern (the default) keeps the order the patterns were saved in, oldest first, as the Patterns tab of the Groove Lab and today's panel list them; Recenti by the later of `lastUsed` and `created`, then name; Più usati by `uses`, then Recenti; Nome by the folded name; Tempo vicino by the ratio to the song's tempo. Groups: instruments in the console's order (ARR_ROWS), a group only when it has patterns.

### D3. When the toolbar shows

Up to 8 fitting patterns: the panel as today, no toolbar, no groups. From 9: toolbar, chips, groups. The threshold is one constant.

### D4. Scroll area

Closed list: `max-height` 320 px (about 11 rows in two columns); open cards: 440 px; on a phone `min(60vh, 440px)`. A soft fade at the bottom says there is more. Preview drawings are painted when they scroll into view (IntersectionObserver on the area) and kept while the patterns do not change.

### D5. Use counters

`uses` (number) and `lastUsed` (ISO date) on a saved pattern. Raised when the console queues Aggiungi come traccia nuova or Sostituisci, and when Compose's Add to song adds it. A preview listen does not count. A session replay does not count. The fields go through `forRadio` together with `created`; they are part of the pattern, so the backup and its merge carry them (the newer `lastUsed` and the larger `uses` win on merge). Patterns saved before this change read as `uses: 0`, no `lastUsed`.

### D6. Count in the title

"Aggiungi un pattern salvato (97)" stays the number that fit. With a filter or search, the line above the list says "6 di 97" and what is applied; no matches: "Nessun pattern con questi filtri" and a button "Togli i filtri". The unfit counts stay under the panel.

### D7. Texts (Italian and English)

Cerca tra {n} pattern / Search {n} patterns; Adatti al brano / Fit this song; Stile / Style; Ordina / Sort; Come nei Pattern / As in Patterns; Recenti / Recent; Più usati / Most used; Nome / Name; Tempo vicino / Closest tempo; Mostra tutti ({n}) / Show all ({n}); {n} di {total} / {n} of {total}; usato {n} volte · {d} giorni fa / used {n} times · {d} days ago; mai usato / never used; Nessun pattern con questi filtri / No pattern matches these filters; Togli i filtri / Clear filters. The Guide card of the console gains a line for the panel's search and the P key.

## Risks / Trade-offs

- A dense console gets denser: the toolbar shows only from 9 patterns, and groups keep the closed panel to about 4 rows per instrument.
- Restoring focus after a rebuild can fight the user if the rebuild happens mid-click: restore only when the focus was inside the panel.
- Counters change the stored pattern shape: optional fields, so older backups and the director's pool read as before.

## Open Questions

Each with the recommended answer.

1. **Which option?** Recommended: C, in one change. Alternative: A now (about 3 hours) and C later on top of it.
2. **From how many patterns do the toolbar and groups show?** Recommended: from 9 (up to 8 the panel stays as today).
3. **Default sort?** Recommended: Recenti (saved or used most recently), since use counts start at zero. **Owner's answer:** the same order as the Patterns tab of the Groove Lab, so the two lists do not disagree. That tab does not sort: it lists the saved patterns in the order they were saved, oldest first (by kind, after the built-in ones), and the panel did the same. The default is that order ("Come nei Pattern"); Recenti, Più usati, Nome and Tempo vicino stay in the menu.
4. **What counts as a use?** Recommended: Aggiungi come traccia nuova and Sostituisci in the console, and Add to song in Compose; not a preview listen, not a replay.
5. **Should the instrument chip follow the part picked in Parti (melodia, basso, ...)?** Recommended: no, independent and remembered, so a choice in Parti for Vary does not hide patterns.
6. **"Adatti al brano" on by default?** Recommended: off, so every saved pattern that fits stays visible, as the owner likes today.
7. **Shortcut for the search?** Recommended: P (free in the console); "/" as a second key is possible.
8. **Groups: open or closed at first?** Recommended: open with 4 patterns each; collapsed groups are remembered.
9. **The same Più usati and Recenti sort in the Patterns tab?** Recommended: yes, but as a separate follow-up issue, not in this change. **Owner's answer:** a separate follow-up, not in this change.
