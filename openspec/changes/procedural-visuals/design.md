## Decisions

### D1. Low resolution, sharp pixels

The engine draws into a 384×216 canvas and scales it to the stage or the video frame without smoothing. A frame is a few dozen small images: cheap for the live picture and the fast video.

### D2. Everything from the bar

The position on the road, the time of day and the members of the caravan are functions of the cycle, not of the time between frames, so seeking, the fast video and the live loop agree. Objects of a stretch of road come from a hash of the layer, the stretch and the seed, and are kept in a small cache.

### D3. Concepts plug into the engine

A concept gives its zones (sky tint, ground, a generator per layer), its actors and its music links; the engine gives layers, zones, the day and night cycle, sprites and the beat. Another concept can reuse it with other zones and actors.

### D4. Pixel art by hand and by rule

Characters, animals, the cart and small landmarks are hand-made sprites (text maps with a palette, outlines and three tones). Large things (pyramids, the Eiffel tower, the Colosseum, skylines, hills) are drawn by rule with the same palette and shading steps.
