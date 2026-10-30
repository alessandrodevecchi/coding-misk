# Design

## Context

The panel lives in the radio console (`src/radio/radio.js`). Its state today is one boolean, `savedOpen` (`radio.js:746-747`, stored as `coding-misk-radio-saved-open`, default false). `spParts` (`radio.js:1002-1022`) renders the title button `#sp-toggle` with the chevron, the toolbar (more than 8 patterns), the instrument chips, the summary and the scroll area; `open` only picks cards (`spCard`) or rows (`spRow`) and the taller scroll area (`.sp-scroll.open`, `src/style.css:1024-1025`). The click handler flips `savedOpen` (`radio.js:1320`). The console's render key includes `savedOpen` (`radio.js:877`). P focuses the search (`radio.js:1426`). The filters live in `coding-misk-radio-saved-view` (`radio.js:752-755`).

Rows show listen, preview drawing, name and type; the actions (Add as new track, Replace) are on the cards only, as today.

## Goals / Non-Goals

**Goals:**

- Hide the whole panel body with the chevron; switch rows and cards with a separate icon button; remember both.
- Keep everything inside the shown body as it is.

**Non-Goals:**

- Actions on the rows (they stay on the cards, as today).
- Changes to search, filters, groups, sorts, use counts, preview or the fit rule.

## Decisions

### D1. Two states, two keys

- `spHidden` (new key `coding-misk-radio-saved-hidden`, default false): the chevron flips it. Hidden: `spPanelHtml` renders only the title row; no toolbar, chips, scroll area or note, and no preview canvases are painted.
- The view keeps the existing key `coding-misk-radio-saved-open`, now read as "cards" (true) or "rows" (false). A listener who left the panel open as cards keeps cards, and nothing needs converting. The variable is renamed `spCards` in the code.

Alternative: one key with three values (hidden, rows, cards). Rejected: the owner asked for two separate choices, and a hidden panel must remember its view.

### D2. Title row

`[chevron] Add a saved pattern (97)` on the left, the view button on the right of the same row (`.sp-head`, a flex row). The chevron points right when hidden and down when shown (`aria-expanded`). The view button (`#sp-view`, `.btn.small.icon`) shows the icon of the view it switches to: three lines (rows) or four squares (cards), drawn as SVG in `src/icons.js` like `CHEVRON`. Its `aria-label` and tooltip name the next view ("Show as cards" / "Mostra come schede", "Show as rows" / "Mostra come righe"); `aria-pressed` is not used, since the button names an action. The chevron's tooltip changes to "Shows or hides your saved patterns that fit this song" (English and Italian), replacing `savedToggleTip`.

The view button stays visible while the panel is hidden (spec: the view changes for the next time it is shown).

### D3. Keyboard

P on a hidden panel sets `spHidden = false`, stores it, renders, then focuses the search (only when the toolbar exists, more than 8 patterns; otherwise the focus goes to the chevron). Escape and the arrows are unchanged.

### D4. Themes and phone

Neon: the view button is a small icon button like the mixer's. Hardware: the same button with the console's key look (`:root[data-ui="hw"]`), the title row unchanged. At 400 px the title row does not wrap: the title text ellipsizes before the button.

### D5. Mockup

`openspec/changes/saved-patterns-hide/mockup.html`: a static page with the panel in neon and hardware, hidden, rows and cards, at desktop and 400 px; screenshots in `notes/prove-2026-10-30/pattern-salvati/` (git-ignored notes).

## Risks / Trade-offs

- [Rows have no actions] → as today; a listener who wants to add switches to cards. If the owner wants actions on rows, it is a separate change.
- [Hidden by mistake] → the title keeps its count and the chevron, so the panel is one press away.

## Open Questions for the owner

1. The view button shows the icon of the next view (chosen). Should it show the current view instead, like a two-state switch?
