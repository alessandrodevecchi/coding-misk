## Why

The visuals are fixed scenes. The owner wants visuals that go on forever without repeating, generated from rules, light enough for the live picture and the videos, and an engine that several concepts can share. The first concept is a caravan that crosses the world while it parties.

## What Changes

- **A side-scrolling engine for endless procedural visuals.** It draws at a low resolution, scaled up with sharp pixels:
  - parallax layers;
  - zones (places) drawn at random from a list, in an endless sequence;
  - objects generated per stretch of road from a seed, so the same moment always looks the same, in the app and in the fast video;
  - a day and night cycle;
  - pixel sprites written as small text maps.
- **First concept: Caravan.** A cart with the sound system, pulled by a donkey, with a dancer in front, travels to the right through places in the background:
  - Egypt with pyramids and the sphinx, Paris with the Eiffel tower, New York with the Statue of Liberty, Rome with the Colosseum, Japan with Mount Fuji and a pagoda;
  - countryside between the cities.
- **Music.** The speakers on the cart pump with the kick and the bass, the light strings flash with the hats, the dancer moves on the beat, the stars twinkle and the sun pulses in time.
- **Stops.** At every city someone joins the caravan and someone leaves.
- **Style.** Detailed 90s arcade pixel art: dark outlines, shading in a few tones, warm colours.
- **Second concept: Neon city.** A hover van with the sound system on its roof drives along a skyway through an endless cyberpunk city: districts (market, corporate spires, industrial stacks, old town, harbour, data core), megastructures in the haze, holographic screens showing the music, flying traffic, neon signs, rain.
- **New looks "Caravan" and "Neon city"** in the visual menus, the live picture and the videos.

## Capabilities

### New Capabilities

- `visuals/procedural-visuals`: the scrolling engine and the Caravan concept.

## Impact

- **Code:** `src/visuals/scroller.js` (engine), `src/visuals/caravan.js` (concept), a new look in `src/visuals.js` and `src/music.js`.
- **Checks:** same frame for the same moment, the zones change, members join and leave, a frame costs little.
