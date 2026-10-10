# Song soul, v1

The first generation of the song soul views (`#46`), kept as a reference while the views evolve. Ten views of one song, drawn on a 2D canvas from the song's seed, curves, parts and instruments:

- **CRT family:** A Tracker, B Terrain, C Sphere (green phosphor, amber in the HW theme).
- **Colour family:** D Lattice, E Strands, F Landscape, G Particles, H Halftone, I Aura, J Spectrum (through a retro amber filter in the HW theme).

Open `soul-v1.html` in a browser:

- `?v=a` to `?v=j` picks the view, `&song=2` the second test song, `&hw=1` the HW look, `&t=12` a time in seconds.
- `?play=1&per=6&songs=1` plays every view in turn, animated, with the "analyzing" and "recalibrating" overlays.

`song1.json` ("Humo Voltage", darksynth, build and drop) and `song2.json` ("Azul Ventana", jazz and lo-fi, waves) come from the director (`song-data.mjs`, run from the repository root with `node docs/soul/v1/song-data.mjs 1`). `compare-song-1.png` and `compare-song-2.png` show every view in both themes.
