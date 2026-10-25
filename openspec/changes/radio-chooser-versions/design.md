## Context

`src/endless/waypoints.js` holds `AIR_CHOOSERS` (`normal-1`, `radio-1`) and `AIR_CHOOSER = 'normal-1'`. `steerOnAir` takes a version id, so the radio's worker gets it too. `airChooserOf(recipe)` in `src/endless/items.js` gives `normal-1` to growth marker 3 and `radio-1` to marker 2. There is no setting yet.

## Goals / Non-Goals

**Goals:** pick the chooser on air in Settings; keep replays exact; add versions without touching the setting or the check.

**Non-Goals:** a new chooser; a choice per session in the radio console; a chooser for Compose growths.

## Decisions

### D1. Names and ids
A version is `{ id, name: { en, it } }` next to its rule in `AIR_CHOOSERS`. The id is `<family>-<n>`: `normal` for the growth chooser, `radio` for choosers written for steering. The name of the default says "(current)" ("(attuale)"); the name of a version that was the default before says "(previous on air)" ("(la precedente in onda)"). The names are data, so a new version shows up in the select without other code.

### D2. Where it lives
Settings, Advanced card, after Long song from: label "Chooser on air" / "Scelta delle mosse in onda". Hint: "The order of the typed moves when you steer a grown song on the radio. Normal v1 is the order of every growth. Applies to radio sessions started after the change." / "L'ordine delle mosse scritte quando guidi un brano cresciuto in radio. Normale v1 è l'ordine di ogni crescita. Vale per le sessioni radio avviate dopo la modifica." The Advanced card already holds the growth search choices, and this one is for trials.

### D3. Storage
Key `coding-misk-air-chooser` in the browser store, removed when the default is chosen (as `coding-misk-shape-cap`). The backup includes it. On read, an id not in `AIR_CHOOSERS` gives `AIR_CHOOSER`.

### D4. Recipes
A new session writes `chooser: <id>` in its recipe, only when it is not the default, so the default recipes stay as today and the radio fixtures do not move. `airChooserOf(recipe)`: the recorded id when it exists in `AIR_CHOOSERS`, else marker 2 → `radio-1`, else `AIR_CHOOSER`. A recorded id that no longer exists falls back to the default and makes `sessionOutdated` warn.

### D5. Check 5.5
Already compares every version in `AIR_CHOOSERS` on the same pairs (only pairs every version places at the same boundary) and fails when another version needs fewer bars in all than the default. The task adds a replay case with `chooser: 'radio-1'` in the recipe and one with an unknown id.

## Risks / Trade-offs

- More versions make check 5.5 slower: it steers every pair once per version.
- A user who picks a slower version hears later arrivals; check 5.5 prints by how many bars.
