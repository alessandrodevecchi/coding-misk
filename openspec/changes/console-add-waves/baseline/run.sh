#!/bin/sh
# Baseline of console "+" waves (#82), the "before" of console-add-waves and of incremental steering.
# 1. In a scratch worktree: git apply openspec/changes/console-add-waves/baseline/instrumentation.patch
#    (temporary logging: each batch's presses, moves with reasons, the typing probes of steerOnAir; never commit it)
# 2. Start the dev server of that worktree on PORT (default 5298).
# 3. sh openspec/changes/console-add-waves/baseline/run.sh [out.jsonl]  (about 80 minutes, one browser at a time)
# 4. python3 openspec/changes/console-add-waves/baseline/table.py out.jsonl   (per-scenario table)
#    python3 openspec/changes/console-add-waves/baseline/stats.py out.jsonl   (summary per profile, moves by reason)
# Scenarios: Classic, Crescendo, Live coder (switch) x berlin-techno (126-134 BPM) and lo-fi (70-88 BPM) x 0 or many
# earlier commands (energy up and down: 8 in berlin-techno, one per phrase; 6 in lo-fi, packed in the first two
# phrases, because lo-fi songs are 48-80 bars) x press patterns: p1 one "+"; p3 three "+" 300 ms apart; p6 three "+"
# 300 ms apart, two more 15 s later, one more 5 s after those. Presses on bar 80.5 + about 1.3 bars (berlin-techno)
# or 16.5 + about 1 bar (lo-fi); fixed seeds waves-<profile>-<style>-<standing>-<pattern>.
export PLAYWRIGHT_CORE=${PLAYWRIGHT_CORE:-/opt/homebrew/opt/playwright-cli/libexec/lib/node_modules/@playwright/cli/node_modules/playwright-core}
export PORT=${PORT:-5298}
D=$(dirname "$0")
OUT=${1:-$D/results.jsonl}
for profile in classic crescendo switch; do
  node "$D/measure.cjs" "$profile" berlin-techno 0 p1,p3,p6 "$OUT"
  node "$D/measure.cjs" "$profile" berlin-techno 8 p1,p3,p6 "$OUT"
  node "$D/measure.cjs" "$profile" lo-fi 0 p1,p3,p6 "$OUT"
  PACKED=1 node "$D/measure.cjs" "$profile" lo-fi 6 p1,p3,p6 "$OUT"
done
# the Live coder song whose steering took 10-13 s, and the same case on another seed
SEEDSUFFIX=-r2 node "$D/measure.cjs" switch berlin-techno 8 p1,p3 "$OUT"
