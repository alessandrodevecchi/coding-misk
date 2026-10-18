## Why

The app writes only a small part of what Strudel can do (#69). `chord().voicing()`, `beat`, `sometimes`, `rib`, `seg`, `duck` and the multi-operator FM are never written (see `docs/VARIETY.md`). Before the next changes add new ways to write music (`idea-model`, `material-generator`, `growth-shapes`), we need a list of every function the installed Strudel offers, what the app already writes, and a guard that generated code only uses functions that exist in that version.

## What Changes

- **A catalog of Strudel functions.** A tool reads the JSDoc comments (`@name`, `@synonyms`, `@param`, `@example`) in the installed Strudel packages and writes every documented function to `docs/strudel/functions.json` and a readable `docs/STRUDEL-FUNCTIONS.md`. Functions the packages register without a `@name` comment are listed too, marked as undocumented.
- **Regenerated on update.** `npm run catalog:strudel` rebuilds the catalog. The output is stable: the same installed version gives the same files.
- **A coverage table.** The tool compiles every song, every live build in each profile and a set of radio songs, and lists which functions the generated code writes and which are never written. A column "useful for variety" is filled by hand in a separate file, so regenerating keeps it.
- **A check.** `npm run check:strudel` fails when generated code calls a function that is neither in the catalog nor one of the app's own helpers, and when the catalog was made from another Strudel version than the one installed.
- **Attribution.** Strudel is AGPL-3.0-or-later, like this project. The extracted docs are committed with a header that names Strudel, its version, its licence and its authors.

## Capabilities

### New Capabilities

- `tooling/strudel-catalog`: the function catalog, its regeneration, the coverage table and the generated code check.

### Modified Capabilities

None.

## Impact

- **Code:** new tools in `tools/` (catalog writer, check); `package.json` scripts `catalog:strudel` and `check:strudel`. No change to the app or to generated code.
- **Files:** `docs/strudel/functions.json`, `docs/strudel/variety.json` (hand-filled), `docs/STRUDEL-FUNCTIONS.md`.
- **Docs:** AGENTS.md tooling list and Read first table, `docs/MUSIC-ENGINE.md` (where to look before writing a new function), DEVLOG. No Guide card: the catalog is a developer tool with no part in the app.
