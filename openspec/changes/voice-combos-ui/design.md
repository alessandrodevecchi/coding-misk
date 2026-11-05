# Design

## Context

`src/voices/combos.js` reads `combos.json` into a module-level `table`; `setCombos(next)` swaps it and the functions take an optional table argument `t` (default `table`). Draws in `src/endless/director.js` call `allowedForDraw` and `allowedCharacters` and `voiceFor` fixes the narrator speaker; the director takes `opts`. The radio recipe already carries per-session user data this way: `recipe.mine` (my phrases) is recorded by `mineRecord()` in `src/radio/radio.js` and fed back by `withMine(o, recipe)` in `src/endless/items.js`, so a Replay reads the phrases of the session, not the current collection. User data lives in `localStorage` keys `coding-misk-*`; `src/settings/backup.js` exports every such key not in `SKIP` and merges known keys by rule, any other key by "backup wins" and counted as settings.

## Goals / Non-Goals

Goals: toggle styles per voice in the UI; layer over the file; reset per voice; backup; stable Replay; Guide.
Non-goals: bounding numeric knob ranges; restricting manual choices; editing `combos.json` from the app; a per-language edit (the grid edits both languages, see D2); the fallback (D8, deferred).

## Decisions

### D1. Storage: `coding-misk-voice-combos`, sparse overrides

```json
{ "format": 1, "en": { "albert": ["clear", "deep"] }, "it": { "default": ["clear", "radio"] } }
```

Same shape as `combos.json` so `allowedStyles` needs no change. Only changed speakers appear. The list is full (not a diff), so a later edit of the committed defaults does not silently change a speaker the user already chose; a speaker without an override follows the file. Saving an entry equal to the default deletes it. Read and write go through a small `combos-store.js` (try/catch, like the other stores) that fires a `combos-changed` event; the Voices tab, pickers and the radio read the effective table on use.

Alternative considered: store a diff (added and removed ids). Rejected: a changed default would then mix with the user's intent, and the effective list is harder to read in a backup.

### D2. What the grid edits

One card per speaker, as today. A toggle sets the style in the lists the draw reads. `allowedForDraw` already intersects the languages, so the grid shows the draw result: for a speaker that speaks a language, `en.<speaker>`; for the default voice, `en.default` and `it.default`. Concretely:

- English-only speakers (albert, fred, junior, kathy): the toggle edits `en.<speaker>`. The card shows a note: "in Italian Alice speaks for this voice, so Alice's list also limits it".
- Samantha (default `en`) and Alice (`it`) cards edit `en.default` and `it.default`. Each of the two cards edits the one language it speaks, so a style off for Alice is off for every speaker through the intersection. The note says so.
- The toggle state shown is the draw result (`allowedForDraw`), so what the user sees is what the radio does. A style that is on in this card but off through the other language shows on with a small "limited by Alice" mark (read-only).

This keeps one model: the user edits the list of a voice in its own language, the intersection is explained, nothing else is hidden.

### D3. Effective table

New pure functions in `combos.js`:

- `normalizeOverrides(json)` → a clean `{ format: 1, en?, it? }` keeping only known languages, speakers (that speak the language, or `default`) and style ids, de-duplicated, `clear` added, dropping entries equal to the default.
- `effectiveCombos(defaults, overrides)` → a new table object (defaults with entries replaced).
- `overridesErrors(json)` → list for checks (unknown ids etc.); the app uses `normalizeOverrides`, which never throws.

`setCombos(table)` stays for the checks. The app sets `table = effectiveCombos(COMBOS, stored)` at start and on `combos-changed`. Node checks never touch the browser key, so they see only the file.

### D4. Draw wiring

The director must not read module state for a session, or Replay would follow the current overrides. Draw functions take the table from `opts.combos` when present: `voiceFor`, the voice instrument draw and the narrator step pass `opts.combos || undefined` as `t` to `allowedForDraw`, `allowedCharacters`, `allowedStyles`. With no `opts.combos` they use the module table (the committed file in Node, the effective table in the browser for non-radio uses such as the picker hints). Radio starts always pass the table explicitly (D5), so on air nothing depends on global state.

Filtering keeps its rule: no change in how many random values are drawn, so the music of a seed stays the same.

### D5. Determinism and sessions: record the effective table (recommended)

A radio session is a recipe (`seed`, `options`, `changes`, ...). Overrides change `allowedForDraw`, hence which character a seed gets. Options considered:

1. Do nothing: Replay follows current overrides. Rejected: a saved session would sound different after the user edits a toggle, and shared links would differ between browsers.
2. Record the effective table in the recipe when overrides exist (`recipe.combos`), like `recipe.mine`. Chosen. `comboRecord()` next to `mineRecord()` in `radio.js` returns `{ combos }` only if the effective table differs from the committed one, else `{}`. `withCombos(o, recipe)` in `items.js` (twin of `withMine`) puts it on the director options. Replay copies the recipe (`clone(recipe)`), so it reads the recorded table.
3. Version the overrides. Rejected: heavier, no gain.

Details:

- Recorded value is the full effective table (not the diff), so it keeps working if the committed file changes later. Size is small (two languages, six entries, ten ids).
- A session with no overrides records nothing; it uses the committed table. A recipe from before this change has no `combos` and so uses the committed table, as it did when it was saved (assuming the file has not changed since; the same assumption `voice-style-combos` already makes).
- Changing a toggle while a session is on air does not change that session's next songs; it takes effect for the next session. The grid shows a one-line note "Applies to the next radio session" when a session is on air. Recommended: yes; the alternative (record a change as a `changes` step so the on-air session follows) is possible but adds a recipe field and Replay cases for little value.
- Compose growth, Crescendo and Live coder songs use the module table at build time (browser effective table). Those songs are saved as written code, so Replay is not an issue there.
- Shared links: if the recipe has `combos`, the link carries it (a few hundred bytes). Check the current share size limit during implementation; if it does not fit, drop `combos` from the link and fall back to the committed table (stated in the task).
- No `DIRECTOR_VERSION` bump: with no `opts.combos` and no overrides the draws are identical.

### D6. Backup

`makeBackup` already includes the key (not in `SKIP`). `mergeBackup` gets a branch like `coding-misk-song-presets`: take `normalizeOverrides` of both, then per language and speaker the backup's entry wins, others stay; counted under `settings`. A backup without the key leaves the browser unchanged. The import never deletes an override. Radio history entries carry their recipe, so `combos` travels with them.

### D7. UI

- Grid: ten chips per card using the existing `chips` pattern (`aria-pressed`), `clear` disabled and on. Style names from `voiceStyle:<id>`. A changed toggle gets a dot (same mark as the picker hint, so one visual idea). Keyboard: chips are buttons.
- "Reset to defaults" is a text button at the card foot, shown only with overrides, no confirmation (one click, easy to redo); a toast says it was reset and offers nothing else. A global "Reset all" is not added.
- The existing "ten voice styles" row (`vt-styles`) stays as the hearing row; the grid goes in each card, below the test line. A card may grow tall: collapse the grid behind a "Draw styles" disclosure per card, closed by default, with a summary like "8 of 10 allowed" (the count includes `clear`).
- Hearing: pressing a chip label does not play; the existing card "Listen" plays the voice. Optional later: long press to hear that style. Not in tasks.
- The Voices tab bench status and the picker hints already read `isAllowed`, so they follow the effective table with no change besides the table swap.
- Strings in `src/i18n.js` in both languages; icons drawn, not emoji.

### D8. Optional, deferred: fallback when a drawn style is excluded

Today a draw filters the character list, so an excluded style is simply never drawn; the same voice gets another style, or `clear`. Fallback modes per voice would instead keep the drawn style and change the voice:

1. Same voice, other style (today).
2. System voice with that style: if the style is excluded for the speaker, play the style on the default system voice.
3. Nearest voice with that style: pick the closest speaker (by a pitch or character table) that allows it.
4. Any: draw any speaker that allows it.

Cost estimate: model and UI (a select per card, stored in the same override key as `fallback`): 1.5 h; draw wiring in `voiceFor`, the voice instrument and the narrator step, with the rule that the extra random draw only runs on a conflict so all-allowed sessions are unchanged: 2.5 h; nearest-voice table and its check: 1.5 h; session snapshot and backup extension: 0.5 h; tests, Guide, docs: 1.5 h. About 7.5 agent hours. Risks: it changes which speaker a song has, so interacts with artists' speaker lists and the language intersection, and it needs fixtures per mode. Recommendation: not now. Ship the grid first, see whether the owner still wants it after using it.

## Risks / Trade-offs

- **Radio session size and Replay.** Recording the table adds a small field; handled by D5.
- **Two sources of truth.** The user sees a mark where an override differs from the file; Reset restores the file. Documented in the Guide.
- **The file changes after the user overrode a speaker.** The user's list wins for that speaker. Reset shows the new defaults.
- **Intersection surprise.** Turning `robot` on for Albert does nothing if Alice has it off. D2 shows a "limited by Alice" mark so it is not silent.
- **Browser data loss.** Overrides are lost with site data; backup covers it.

## Migration Plan

1. Implement on `develop` with no overrides: no fixture moves.
2. Rollback: remove the grid and the key reads; stored values are ignored harmlessly.

## Open Questions

1. Replay uses the recorded table (D5). Recommended: yes.
2. A style change applies from the next session, not the on-air one (D5). Recommended: yes.
3. The grid sits behind a per-card disclosure (D7). Recommended: yes.
4. Fallback options (D8). Recommended: defer.
5. Should the app also offer "Copy as combos.json" so a good set can be committed as the new defaults? Recommended: yes, later, small (about 1 h); not in these tasks.
