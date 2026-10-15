## 1. Typing schedule

- [x] 1.1 Token diff inside changed lines; replacements in order, with pauses
- [x] 1.2 Schedule with durations (small and large speed, deletes, pauses), total duration, scaling to a deadline
- [x] 1.3 Frames by time instead of progress; keep `settleOthers`

## 2. Wiring

- [x] 2.1 Live build and resume: start time from the schedule and the gap since the previous step
- [x] 2.2 Video feed: same schedule and timing
- [x] 2.3 Smooth scroll of the code panel
- [x] 2.4 Setting `coding-misk-typing` (slow, normal, fast) in Settings, English and Italian

## 3. Checks and docs

- [x] 3.1 Node check: only changed tokens touched, last frame equals the new code, speeds, deadline kept
- [x] 3.2 Existing checks (`check:crescendo`, `check-crescendo-play`, `check:video`, `check-hand`)
- [ ] 3.3 A short video for the owner; Guide, `docs/ARCHITECTURE.md`, DEVLOG
