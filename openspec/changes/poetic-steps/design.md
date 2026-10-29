## Context

`narration(song, upTo, lang)` in `src/song/build.js` returns what the narrator says in the code of one state. With the poetic style it gives the images of the entries (after-tests-oct28 D5) and, with Narrated growth, the step line of the state's step (`sayStep`), unless an image takes that bar (voice-full-controls D11). `narratorLines`, `voiceCode` and `spokenSchedule` read `narration`; `voiceSamples` lists the texts to warm up on its own.

## Decisions

### D1. Which steps change
A step changes when the poetic style and Narrated growth are on, it has a step line (`say`), it does not bring the voice instrument in, and no step on its bar brings a track in. Such a step says a movement line instead of its step line. A step on an entry's bar keeps the step line, as D11 says (its image is said the bar before). Steps without `say` stay silent, so the number of spoken lines does not change.

### D2. One neutral group
One group `move` of twelve short images, neither rising nor falling ("the light shifts", "the river bends"), because a step can open a filter, add a function, mute a line or take something away. Groups by direction were considered: a step keeps no record of its kind (only `say`), so the direction would be guessed from the actions, and a neutral list reads well on both.

### D3. Which line
`movementLine(song, index)` in `src/song/spoken.js`: the list is the song's `narrator.lines.move`, else its style's, else `POETIC.move`. A start drawn from the song's seed on the spoken stream (`poetic-move`), plus the step's index in the build: consecutive steps take consecutive lines, so a line comes back only after the whole list. The music's random streams are untouched.

### D4. Stage and lists
The stage keeps the step line (`sayAt`), which says what the code does, as D11 does on a shared bar. The radio's Coming next shows the movement line (it reads `spokenSchedule`). Compose's narrator lines list keeps listing the step lines; changing it is out of scope.

### D5. Samples
`POETIC.move` is part of `poeticTexts()`, so `npm run voices` makes its samples for every narrator speaker in both languages. The samples are git-ignored (`public/samples/say_*/`), as for every spoken line; a line with no sample stays silent, like every narrator line.
