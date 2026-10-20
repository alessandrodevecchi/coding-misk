// Grows radio songs away from the page (radio-profiles stage 4): a growth takes up to a few seconds, and the page
// must keep the music on time meanwhile. The same pure growth as the radio's rebuild and the Node checks (growth.js),
// with the voice instrument's context of the page, so a song grows here exactly as it would in the page.
// Steering a grown song (stage 5, D9: commands as waypoints, waypoints.js) runs here too: it measures the typing of
// the code, and grows the song first when the page has not got it yet.
import { growOnAir } from './growth.js';
import { steerOnAir } from './waypoints.js';
import { setSpokenContext } from '../song/spoken.js';

self.onmessage = e => {
  const { id, song, ctx, spoken, steer } = e.data || {};
  try {
    if (spoken) setSpokenContext(spoken);
    if (steer) { const r = steerOnAir(steer); self.postMessage({ id, steered: { song: r.song, grown: r.grown, commands: r.commands } }); return; }
    self.postMessage({ id, song: growOnAir(song, ctx) });
  } catch (err) { self.postMessage({ id, error: String((err && err.message) || err) }); }
};
