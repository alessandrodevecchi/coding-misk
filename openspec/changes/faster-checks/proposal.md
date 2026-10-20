## Why

A few checks take most of the time of every change: `check:crescendo` about 45 minutes, `check:functions` about 10, `catalog:strudel` about 7, `check:strudel` about 5. The last three each generate the code of every song and step again from scratch, and the knowledge check fails whenever the catalog is older than the code, so every change pays for a rebuild.

## What Changes

- **Shared code cache.** The code of every song, step, profile and option is generated once and stored, keyed by a hash of its inputs (song file, profile and options, and the app code that writes it). `catalog:strudel`, `check:strudel` and `check:functions` reuse it and regenerate only what changed.
- **Crescendo in two levels.** `check:crescendo` runs a quick level by default (protected Classic and Crescendo fixtures plus a sample of songs, in a few minutes) and a full level with `--full`, in parallel on several cores.
- **Catalog when it matters.** A stale Strudel catalog becomes a warning in `check:knowledge`, not a failure. The catalog is rebuilt when Strudel, the generator or the app functions change, and before a merge to main.
- **Checks by change.** The checks map in the knowledge base says which checks a change needs, and when the full levels are required.

## Capabilities

### New Capabilities

- `tools/faster-checks`: code cache, check levels, catalog cadence.

### Modified Capabilities

None in `openspec/specs/`; the `knowledge-base` change's "Catalog freshness" requirement becomes a warning.

## Impact

- **Tools:** `tools/strudel-code.mjs`, `tools/strudel-catalog.mjs`, `tools/check-strudel.mjs`, `tools/check-functions.mjs`, `tools/check-crescendo.mjs`, `tools/check-knowledge.mjs`, a cache folder ignored by git.
- **Docs:** `AGENTS.md` (when to run full checks), `docs/knowledge/checks.md`, DEVLOG.
- **App:** none.
