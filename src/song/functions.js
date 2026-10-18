// Song functions (song-functions): the data. EFFECTS, the calls a function may fold (sound shaping only); LIBRARY, the
// functions the app ships for the most frequent chains; NAMES, the words song functions are named with, per theme,
// per track type, plus generic ones. Adding a library function or a word is a new entry here: `npm run check:strudel`
// fails when a name is a Strudel function or synonym, `npm run check:functions` checks that every folded line expands
// back to the line written out. Pure data and small helpers, no Strudel.
import { hashString } from '../endless/random.js';

// calls that shape the sound: only these fold. Sounds, notes, scales, chords, rhythm, structure, masks, levels and
// the bus (s, n, note, sound, bank, scale, chord, voicing, anchor, mode, struct, beat, mask, velocity, orbit, analyze,
// gain, postgain) and time or pitch calls are never in a function.
export const NEVER = ['s', 'n', 'note', 'sound', 'bank', 'scale', 'chord', 'voicing', 'anchor', 'mode', 'struct', 'beat', 'mask', 'velocity', 'orbit', 'analyze', 'gain', 'postgain'];
export const EFFECTS = new Set([
  'attack', 'decay', 'sustain', 'release', 'hold',
  'lpf', 'hpf', 'bpf', 'lpq', 'hpq', 'bpq', 'ftype', 'lpenv', 'hpenv', 'bpenv', 'lpattack', 'lpdecay', 'lpsustain', 'lprelease', 'hpattack', 'hpdecay', 'hpsustain', 'hprelease',
  'delay', 'delaytime', 'delayfeedback', 'delaysync', 'room', 'roomsize', 'roomfade', 'roomlp', 'roomdim',
  'distort', 'distortvol', 'shape', 'crush', 'coarse', 'pan', 'vowel', 'phaser', 'phaserdepth', 'phasercenter', 'phasersweep',
  'tremolo', 'tremolodepth', 'tremolosync', 'fmi', 'fmh', 'fmenv', 'fmattack', 'fmdecay', 'fmsustain', 'vib', 'vibmod', 'detune', 'unison', 'spread', 'compressor',
  // the app's distortion with its volume (writer.js)
  'crunch',
]);

// the library: name, parameters (a, b, c), the chain they stand for, one line in both languages. Two or three letters:
// only library functions are abbreviations.
export const LIBRARY = [
  { name: 'plk', params: ['a', 'b'], chain: '.decay(a).sustain(b)', about: { en: 'envelope: decay and sustain', it: 'inviluppo: decay e sustain' } },
  { name: 'wet', params: ['a', 'b'], chain: '.delay(a).room(b)', about: { en: 'echo and reverb: delay and room', it: 'eco e riverbero: delay e room' } },
  { name: 'res', params: ['a', 'b'], chain: '.lpf(a).lpq(b)', about: { en: 'filter with resonance: lpf and lpq', it: 'filtro con risonanza: lpf e lpq' } },
  { name: 'wob', params: ['a', 'b'], chain: '.lpf(sine.range(a, b).slow(8))', about: { en: 'moving filter: lpf from a to b and back over 8 cycles', it: 'filtro che si muove: lpf da a a b e ritorno in 8 cicli' } },
];
export const LIBRARY_NAMES = LIBRARY.map(f => f.name);

// words for song functions: lowercase, at most 12 letters, never a Strudel function or synonym
export const NAMES = {
  themes: {
    acid: ['squelch', 'burble', 'rubber', 'sizzle', 'gurgle', 'chirp', 'fizzle', 'ooze'],
    house: ['groove', 'jack', 'soulful', 'bounce', 'strut', 'disco', 'warehouse', 'swagger'],
    trance: ['euphoria', 'uplift', 'shimmer', 'soar', 'glide', 'halo', 'aurora', 'starlight'],
    techno: ['pulse', 'steel', 'tunnel', 'bunker', 'strobe', 'grind', 'concrete', 'machine'],
    industrial: ['rust', 'scrap', 'hammer', 'piston', 'foundry', 'rivet', 'smelter'],
    cyber: ['neon', 'chrome', 'grid', 'glitch', 'circuit', 'laser', 'hologram', 'mainframe'],
    ambient: ['drift', 'haze', 'mist', 'cloud', 'tide', 'bloom', 'horizon'],
    lofi: ['dusty', 'vinyl', 'mellow', 'smoky', 'sleepy', 'tape', 'rainy'],
    dnb: ['roller', 'amen', 'jungle', 'reese', 'liquid', 'stepper'],
    metal: ['riff', 'thrash', 'anvil', 'molten', 'forge', 'shred', 'inferno'],
    rock: ['riff', 'amplifier', 'stomp', 'arena', 'shred', 'roadie'],
    phonk: ['cowbell', 'memphis', 'smoke', 'chopped', 'slowed'],
    pop: ['shine', 'sparkle', 'candy', 'glow', 'starry', 'bubble'],
    country: ['twang', 'prairie', 'porch', 'banjo', 'saloon'],
    experimental: ['oddity', 'fractal', 'quirk', 'mutant', 'prism'],
    // the live coder family: words of the craft
    coder: ['patch', 'tweak', 'knob', 'fader', 'jamming', 'sketch', 'scribble', 'noodle'],
  },
  tracks: {
    bass: ['rumble', 'growl', 'thump', 'boom', 'wobble', 'undertow'],
    arp: ['ripple', 'spark', 'cascade', 'twinkle', 'flicker'],
    hook: ['tune', 'motif', 'whistle', 'refrain', 'chant'],
    pad: ['wash', 'blanket', 'veil', 'glow', 'cushion'],
    drums: ['punch', 'knock', 'smack', 'thud', 'clatter'],
    guitar: ['chug', 'fuzz', 'twang', 'strum', 'plectrum'],
    texture: ['grain', 'dust', 'hiss', 'rustle', 'crackle'],
    riser: ['lift', 'swell', 'surge', 'climb', 'ascend'],
    code: ['bleep', 'blip', 'byte', 'beep'],
    voice: ['mouth', 'whisper', 'tell', 'narrate', 'murmur'],
  },
  generic: ['tone', 'flavor', 'shade', 'tint', 'glaze', 'coat', 'mood', 'vibe', 'spice', 'touch', 'charm', 'aura'],
};
// style ids and genres → theme (styles/*.json ids; the live coder family is in its own list)
export const THEMES = {
  acid: 'acid', house: 'house', 'progressive-house': 'house', trance: 'trance', 'gated-trance': 'trance', 'pure-trance': 'trance',
  'berlin-techno': 'techno', techno: 'techno', industrial: 'industrial', 'dark-cyberpunk': 'cyber', 'dreamy-cyberpunk': 'cyber', darksynth: 'cyber',
  synthwave: 'cyber', ambient: 'ambient', 'lo-fi': 'lofi', jazz: 'lofi', 'hip-hop': 'lofi', 'drum-and-bass': 'dnb', 'melodic-metal': 'metal', metal: 'metal',
  'classic-rock': 'rock', rock: 'rock', phonk: 'phonk', pop: 'pop', country: 'country', experimental: 'experimental', 'live-coder': 'coder', crescendo: 'coder',
};
// every word a song function can take (the checks read it)
export const ALL_NAMES = [...new Set([...Object.values(NAMES.themes).flat(), ...Object.values(NAMES.tracks).flat(), ...NAMES.generic])];

// the themes of a song, most specific first: its styles, its genres, its free tags, the live coder profile
export function themesOf(song = {}) {
  const t = song.tags || {}, out = [];
  for (const x of [...(t.styles || []), ...(t.genres || []), ...(t.free || []), ...(song.profile === 'switch' ? ['live-coder'] : [])]) if (THEMES[x] && !out.includes(THEMES[x])) out.push(THEMES[x]);
  return out;
}
// the names a song's functions are drawn from, in order: theme lists, the track type's list, generic; each list starts
// at a place the song id picks, so the same song always gets the same names
export function nameOrder(song = {}, type) {
  const seed = hashString(String(song.id || song.title || 'song')), lists = [...themesOf(song).map(k => NAMES.themes[k]), NAMES.tracks[type] || [], NAMES.generic];
  return [...new Set(lists.flatMap(l => l.map((_, i) => l[(i + seed) % l.length])))];
}
