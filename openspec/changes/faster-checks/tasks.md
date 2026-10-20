## 1. Code cache

- [ ] 1.1 Cache of generated code keyed by input hash, in a git-ignored folder; used by `catalog:strudel`, `check:strudel`, `check:functions`; measure first and second run times
- [ ] 1.2 Same results with and without the cache (a `--no-cache` run compared once)

## 2. Crescendo levels

- [ ] 2.1 Quick level by default: protected fixtures plus a fixed sample of songs; `--full` for every song
- [ ] 2.2 Full level in parallel on the available cores; measure both levels

## 3. Catalog cadence and docs

- [ ] 3.1 Stale catalog is a warning in `check:knowledge`
- [ ] 3.2 Checks map, `AGENTS.md` (full checks before a merge and after growth changes), knowledge notes, DEVLOG entry in Italian
