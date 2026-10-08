# Design

## Context

Tabs are buttons `.tab[data-tab]` in one `nav.tabs`; `showTab(name)` shows `#tab-<name>` among `TABS`, re-renders some tabs and remembers the tab under `coding-misk-tab`. The settings page is a tab without a button, opened by the gear. Browser checks click `[data-tab="…"]`.

## Decisions

- **Data:** `MODES = { ascolta: ['componi', 'brani', 'playlist', 'radio'], lab: ['artisti', 'stili', 'suoni', 'guida', 'riferimenti'] }`; `modeOf(tab)`. `showTab(name)` sets the mode from the tab, so every existing caller (links, radio, Compose from artist) switches mode for free.
- **Markup:** a mode bar with two large buttons (`[data-mode]`, the tabs' names as a subtitle on desktop) above the existing `nav.tabs`; all tab buttons stay in the DOM with `data-mode`, and the ones of the other mode are hidden. The checks that click `[data-tab]` keep working once the mode is right; a click on a hidden tab is avoided by calling `showTab` through the mode first in the checks that need it.
- **Memory:** `coding-misk-mode-tabs` keeps the last tab per mode; `coding-misk-tab` stays the current tab, so an old value opens in its mode.
- **Style:** mode buttons like the large toggles of the mockup: accent fill when on in neon, mechanical latching keys with a lamp in the hardware theme; on a phone the subtitles hide and the tabs wrap into chips.
- **Settings:** unchanged; the gear works in both modes and the mode bar shows no mode as active while the settings are open.

## Risks / Trade-offs

- People used to one row need one more click to reach the Lab; the mode remembers its last tab, so going back and forth costs one click.
