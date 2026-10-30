# Tasks

Estimate: about 3.5 agent hours (3 to 4.5).

## 1. Panel state and rendering (about 1.5 h)

- [x] 1.1 `src/radio/radio.js`: `spHidden` with the key `coding-misk-radio-saved-hidden` (default false); `savedOpen` read as the view (`spCards`, same key `coding-misk-radio-saved-open`); both in the console's render key.
- [x] 1.2 `spParts` / `spPanelHtml`: the title row with the chevron (`#sp-toggle`, hides or shows the body) and the view button (`#sp-view`); hidden renders only the title row.
- [x] 1.3 Click handlers: `#sp-toggle` flips `spHidden`, `#sp-view` flips the view (scroll position reset as today); P on a hidden panel shows it and focuses the search.
- [x] 1.4 `src/icons.js`: rows and cards icons (SVG, drawn); `src/style.css`: `.sp-head`, the view button in neon, hardware and light, 400 px.
- [x] 1.5 `src/i18n.js`: the chevron tooltip and the view button labels, English and Italian.

## 2. Checks (about 1.5 h)

- [x] 2.1 `tools/check-steering.cjs`: the saved-pattern steps that click `#sp-toggle` to switch rows and cards (around lines 125-160) click `#sp-view`; new steps: the chevron hides the body (no `.sp-tools`, `.sp-scroll`, `.sp-note`; the title count stays), the hidden state survives a reload and the next song, the view button while hidden, P on a hidden panel, the old `coding-misk-radio-saved-open = true` gives cards, 400 px and hardware theme.
- [x] 2.2 `PORT=5245 node tools/check-steering.cjs --many` and the full run; `npm run check:patterns`; `npm run check:guide`.

## 3. Docs (about 0.5 h)

- [x] 3.1 `src/guide.js`: the console card's saved-pattern line, English and Italian.
- [x] 3.2 `docs/knowledge/` console note; `npm run knowledge`, `npm run check:knowledge`.
- [x] 3.3 DEVLOG entry (Italian) with screenshots of the three states.
