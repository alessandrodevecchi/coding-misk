# Tasks

## 1. Engine

- [ ] 1.1 Add `curves` (auto by default) to each double phrase of a plan, and the density, brightness and tension measures next to energy.
- [ ] 1.2 Score moves against set curve targets in the director, with one more move when a target is far.
- [ ] 1.3 Build the charge before a drop on high tension, and use the strong progression on high tension parts (sections split where chords change).
- [ ] 1.4 Use the voice target of a part for comments, with 0 meaning silent.
- [ ] 1.5 Add the `curve` (with `curve` field) and `curve-reset` steering commands; keep old energy curve commands working.
- [ ] 1.6 Extend `check:endless`: no edits gives the same songs; density, brightness, tension, charge and silent voice move the song the right way; replay is deterministic.

## 2. Radio

- [ ] 2.1 Draw the four lanes with measured (dashed) and set (solid) values, the shared position line and the value of the part playing.
- [ ] 2.2 Drag handles per lane and the reset button; queue labels for curve edits and resets.
- [ ] 2.3 Styles for both themes and phone width; i18n strings in English and Italian.
- [ ] 2.4 Extend `check-steering.cjs`: lanes shown, drag queues an edit, reset, phone width, no page errors.

## 3. Docs

- [ ] 3.1 Update `docs/ENDLESS.md` (curves), README in both languages, `docs/PROVE-v0.6.0.md`, DEVLOG.
