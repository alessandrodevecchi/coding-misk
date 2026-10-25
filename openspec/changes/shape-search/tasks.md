## 1. Measure

- [x] 1.1 `growth:probe` on luci-rosse, settimo-cielo, kellerlicht, Ideas, switch-prima-luce: shapes tried, rushed growth and written steps, time, length; recorded in the DEVLOG
- [x] 1.2 Why growth steps stay rushed with the free duration (settimo-cielo 28, 49); decision written in design D4 and shown to the owner

## 2. Search

- [x] 2.1 Target on growth steps only; seeded weighted order; cap of 8, up to 16 when none meets the target; the cap as an advanced setting with its hint (radio and checks use the default)
- [x] 2.2 Free-duration fix from 1.2 (D4: no change to the bars added; the counters name why a rushed growth step stays)
- [x] 2.3 `check:crescendo -- --full`: Crescendo fixtures unchanged; Live coder fixtures rewritten with `SHAPES_VERSION` raised; `npm run durations`; `check:endless` (raise `DIRECTOR_VERSION` if its fixtures move)
- [x] 2.4 New checks: at most 8 shapes per growth, same shape for the same song; probe numbers after the change

## 3. Docs

- [x] 3.1 Knowledge notes (growth shapes, decisions), DEVLOG entry in Italian; Ideas length explained

## 4. Follow-up (owner decisions, 2026-10-25)

- [x] 4.1 Measure before: `growth:probe` on the five songs (shape, bars, length), radio rushed growth steps (check:radio-profiles), long lists in Live coder growths of every built-in song
- [x] 4.2 D6: "Try all growth shapes" with "Keep" (first good one, best one) and "Random order" in Settings, advanced (hints EN/IT, defaults not stored, Compose growth key), `growth:probe --all --keep --fixed`, check:settings and the Guide
- [x] 4.3 D7: whole songs over the long-song threshold (setting, default 15 minutes) measure every shape and keep the shortest that meets the target (Compose and radio), counters
- [x] 4.4 D8: ramp writer for long linear lists in Live coder code; same value every bar (Strudel in Node); check:mixer, check:functions, check:strudel, every hap compared (check:ramps); level snapshots not run (Classic code unchanged)
- [x] 4.5 `SHAPES_VERSION` 5: Live coder fixtures, `npm run durations`, radio growth fixtures; Crescendo fixtures and `check:code` unchanged; `check:crescendo -- --full`
- [x] 4.6 D9: kellerlicht at v0.5.0 (temporary worktree, read only), answer written in D9
- [x] 4.7 D10: growth-in-background check investigated with a real recompute; check or app fixed, finding in D10
- [x] 4.8 D11: check 5.5 rewritten over more songs and curve points (it fails: the chooser on air is not sooner; finding in D11, decision left to the owner)
- [x] 4.9 Measure after (same as 4.1), knowledge notes, DEVLOG entry in Italian
