## Context

`crescendoSong` builds the growth from per-track plans (setup at bar 0, fullness and colour units) and interleaves them. Settings start at neutral values (cutoff closed, drive 0), so every function is in the code from the start. The typing schedule (`typingPlan`) types each edit once.

## Decisions

### D1. Rules as parameters

`crescendoSong(song, { rules })` with `rules = { entry: 'full' | 'minimal', reveal: false | true, clone: 0..1, spacing: [min, max], pauses: true, trials: 0..1 }`. The Crescendo profile passes today's values (unchanged output); Switch passes the natural ones. `CRESCENDO_VERSION` stays for the Crescendo rules; natural growth has its own fixture set.

### D2. Reveal: absent until a step brings it

Each track carries `reveal`, the list of settings and devices already written. The compiler leaves out the functions of a setting not yet revealed (no `.lpf`, no `.lpq`, no envelope, gain at its default). A reveal step adds one function at its first value; later steps move it. At the end of the growth every function of the written song is revealed. The setup of a track becomes: its pattern at the simplest level, nothing revealed.

The first value of a revealed setting is the neutral one (a closed filter that then opens), so the sound grows as in Crescendo.

### D3. Notes inside the quotes

For notes and rows, the simplest level is one note or one hit per bar; the levels in between are the thinned variants, written with the short pattern forms so each step changes a few characters.

### D4. Clones

When a melodic track enters and another melodic track already plays, with probability `clone` the entry step copies the playing track's block and changes its sound and notes; in the code this is typed as a paste (instant) followed by small edits. The new track's own settings are then revealed or moved as usual.

### D5. Spacing and pauses

Gaps are drawn from `spacing` (4 to 8 bars at the start, 2 to 6 later). After an entry, the arrival of the progression or a break return, the next gap gets 4 to 8 more bars. The growth stays within three times the written length; when it would not, pauses shorten first.

### D6. Trials

With probability `trials`, a step that moves a number (cutoff, room, delay, gain) is typed as one or two tries: the typing schedule types a first value, waits for one evaluation (the bar), then edits to the next. Each try is a real step with its own bar, so the sound follows the code.

### D7. What is hidden

Gain stays written from the start (an absent gain would play louder than the song). With less detail fewer functions are hidden (cutoff, drive, room and delay, then only cutoff), so short songs still have room for pauses. Hide and reveal are two new build actions (`hide`, `reveal` with `keys`).

## Risks / Trade-offs

- **[Longer growth]** → sparse steps and pauses make the growth longer; the limit of three times the written length holds, and short songs use fewer steps.
- **[Reveal changes the code shape]** → only for profiles that ask for it; Crescendo keeps neutral values written from the start.
