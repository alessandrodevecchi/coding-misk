# Design

## Context

The Guide tab (`#tab-guida`) renders `LESSONS` from `src/content.js`. Tabs belong to a mode through `data-mode-of`; `showTab` switches mode as needed. Texts use `t()` from `src/i18n.js`, and data with both languages uses `{ en, it }` objects read with `tx()`.

## Goals / Non-Goals

**Goals:** a readable guide for every feature, reachable from every tab, that a check keeps complete.

**Non-Goals:** screenshots or videos; a guided tour; changes to the lessons.

## Decisions

- **Tabs:** the existing `guida` tab id stays for the app guide (links and remembered tabs keep working); the lessons move to a new `lezioni` tab right after it. A remembered `guida` from before this change opens `lezioni` once, through a stored migration flag.
- **Data:** `src/guide.js` exports `GUIDE`, a list of `{ id, tab, mode, title, what, how, know?, show, parts? }`, every text as `{ en, it }`; `parts` holds the Radio sub-sections and the scope table; `show` is a CSS selector for "Show me". Simple inline markup in texts: `[Button]` renders as a button chip, `<key>` as a key.
- **Show me:** `showTab(card.tab)`, then `scrollIntoView` and a `.flash` class for 2 s on `show`.
- **"?":** added by script to each tab's `.intro` from `GUIDE` (no markup in `index.html`), so new tabs get it when their card exists.
- **Check:** `tools/check-guide.mjs` reads `index.html` for `data-tab` ids and `src/endless/steering.js` for `COMMANDS`, imports `GUIDE`, and checks cards, command mentions (each command id listed in the Radio console part's `commands`), both languages and exemptions (`GUIDE_EXEMPT` with reasons).
- **Theme:** colours from tokens, so the HW theme turns the accents amber.

## Risks / Trade-offs

- Guide texts can drift from the app in ways the check cannot see (a renamed button). The rule in `AGENTS.md` keeps them in the same change; the check catches missing entries only.
