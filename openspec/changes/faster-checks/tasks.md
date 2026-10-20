## 1. Code cache

- [ ] 1.1 Cache of generated code keyed by input hash, in a git-ignored folder; used by `catalog:strudel`, `check:strudel`, `check:functions`; measure first and second run times
- [ ] 1.2 Same results with and without the cache (a `--no-cache` run compared once)

## 2. Crescendo levels

- [ ] 2.1 Quick level by default: protected fixtures plus a fixed sample of songs; `--full` for every song
- [ ] 2.2 Full level in parallel on the available cores; measure both levels

## 3. Catalog cadence and docs

- [ ] 3.1 Stale catalog is a warning in `check:knowledge`
- [ ] 3.2 Checks map, `AGENTS.md` (full checks before a merge and after growth changes), knowledge notes, DEVLOG entry in Italian

## 4. Machine and reruns

- [ ] 4.1 Low priority (`taskpolicy -b` on macOS, `nice` elsewhere) and workers: 4 by day (08:00-20:00), all cores but one at night, `CHECK_WORKERS` overrides; measure the full level by day and by night setting
- [ ] 4.2 `--only <check>` and `--songs <list>` filters in `check:crescendo`; the rule "targeted rerun, then quick level; full level after growth changes and before merge" in the checks map and `AGENTS.md`
- [ ] 4.3 Weekend day default 6 workers; `.check-workers` control file read before each song (git-ignored), lowering lets workers finish their song, raising starts new ones; a test that changes it during a run
