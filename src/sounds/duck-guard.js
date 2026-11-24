// Pump (sound-modulation D6): a kick line ducks the pumped track's orbit with `duck`. Superdough skips the duck and logs
// "duck target orbit N does not exist" while that orbit has played no note yet, which happens on the first kick of a
// song or a section (the kick and the pad start together, the kick first). The guard makes the missing orbit first,
// so the first kick ducks too and nothing is logged. A duck at the very start of a render (t under 10 ms) would ask
// Web Audio for a stop time below 0 (superdough schedules it 10 ms early) and lose the kick: it moves to 10 ms.
// It patches the controller's class once per page (the live player and the render page each have their own copy of
// superdough).
// offline (the fast export's render page): superdough schedules each duck from a timer that reads the context's
// current time, which in an OfflineAudioContext depends on how far the render has run, so two renders differ. There
// the orbit's duck is scheduled on the audio clock instead (hold, dip, recover), the same shape every time.
export function guardDuck(controller, { offline = false } = {}) {
  const P = controller && Object.getPrototypeOf(controller);
  if (!P || typeof P.duck !== 'function' || P.__codingMiskDuck) return;
  const duck = P.duck;
  P.duck = function (targets, t, ...rest) {
    for (const o of [targets].flat()) {
      if (o == null || !this.nodes || typeof this.getOrbit !== 'function') continue;
      const orbit = this.nodes[o] == null ? this.getOrbit(o) : this.nodes[o];
      if (offline && orbit) clockDuck(Object.getPrototypeOf(orbit));
    }
    return duck.call(this, targets, Math.max(Number(t) || 0, 0.0101), ...rest);
  };
  P.__codingMiskDuck = true;
}
function clockDuck(O) {
  if (!O || O.__codingMiskClockDuck || typeof O.duck !== 'function') return;
  O.duck = function (t, onsettime = 0, attacktime = 0.1, depth = 1) {
    const g = this.output && this.output.gain;
    if (!g) return;
    const at = Math.max(attacktime, 0.002), low = Math.min(1, Math.max(0.01, 1 - Math.sqrt(depth))), t0 = Math.max(0, t);
    // the dip is immediate at the kick (as superdough's own with no onset), then the level climbs back over `at`
    g.cancelScheduledValues(t0);
    g.setValueAtTime(low, t0 + Math.max(0, onsettime));
    g.exponentialRampToValueAtTime(1, t0 + Math.max(0, onsettime) + at);
  };
  O.__codingMiskClockDuck = true;
}
