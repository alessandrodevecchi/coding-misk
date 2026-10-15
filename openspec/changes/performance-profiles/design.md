## Context

Separate settings today: `coding-misk-live` and `coding-misk-live-style` (build style), `coding-misk-live-narrated`, `coding-misk-typing`, `coding-misk-live-code` (view), `coding-misk-live-gen` (generator). Songs and styles may declare `buildStyle`.

## Decisions

### D1. Profile = settings bundle

```js
PROFILES = {
  classic:   { build: 'blocks',    growth: null,       typing: 'normal', view: 'sections', gen: 'standard', comments: { title: true, level: 'all' },       highlights: false },
  crescendo: { build: 'crescendo', growth: 'crescendo', typing: 'normal', view: 'now',      gen: 'standard', comments: { title: true, level: 'all' },       highlights: false },
  switch:    { build: 'crescendo', growth: 'natural',   typing: 'normal', view: 'now',      gen: 'idiomatic', comments: { title: true, level: 'essential' }, highlights: true },
}
```

`profileOf(song, style, choice, overrides)` returns the controls in force: the song's profile, else its style's, else the Compose choice; overrides on top make it "custom". `buildStyle` in old files maps to classic or crescendo.

### D2. Settings

`coding-misk-profile` (choice) and `coding-misk-profile-overrides` (controls changed by hand). The old keys are read once to build the first overrides, then left alone.

### D3. Comments

Comment options go to the compilers as `{ title, level }`:
- all: today's output;
- essential: the header line, the track headers;
- none: no comment lines, a blank line between blocks.

Track headers persist: once a track has come in, its header stays in the code of later bars even if no layer of the track plays (compiled from the build: tracks added before the bar).

### D4. Highlights

The video and live code panel draws a box around the tokens of the layers that sound at the frame, from the onsets the render already collects, per instrument; the editor in the app keeps Strudel's own highlights.

## Risks / Trade-offs

- **[Many controls]** → the profile hides them; the custom state shows which one was changed.
