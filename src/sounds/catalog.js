// Sound catalogue built from the sounds Strudel has actually loaded (superdough's soundMap).
// Keys there are lowercase and include aliases (tr909_bd next to rolandtr909_bd): drum machines are grouped
// by their canonical name, aliases are left out.
import { MACHINES } from './machines.js';

export const CATEGORIES = ['drums', 'instruments', 'samples', 'acoustic', 'synths', 'yours'];
const machineOf = Object.fromEntries(MACHINES.map(m => [m.toLowerCase(), m]));
// General MIDI families
// order matters: "bassoon" is a reed, "lead 8 bass lead" a synth lead, "contrabass" a string
// General MIDI synth leads, pads and effects are sampled synths: they go to the Synths category
const GM_SYNTH = [['GM leads', /lead_/], ['GM pads', /pad_/], ['GM effects', /fx_/]];
const FAMILIES = [['Keys', /piano|harpsi|clavi/], ['Mallets', /celesta|glock|music_box|vibra|marimba|xylo|tubular|dulcimer/], ['Organs', /organ|accordion|harmonica|bandoneon/], ['Guitars', /guitar/], ['Reeds', /sax|oboe|english|bassoon|clarinet/], ['Ensemble', /ensemble|synth_strings|orchestra_hit|string_ensemble/], ['Strings', /violin|viola|cello|contrabass|tremolo|pizzicato|harp|timpani|string/], ['Basses', /bass/], ['Voices', /choir|voice/], ['Brass', /trumpet|trombone|tuba|horn|brass/], ['Pipes', /piccolo|flute|recorder|pan_|bottle|shakuhachi|whistle|ocarina/], ['World', /sitar|banjo|shamisen|koto|kalimba|bagpipe|fiddle|shanai/], ['Percussion', /bell|agogo|steel|woodblock|taiko|tom|drum|reverse/], ['Effects', /./]];
export const familyOf = name => FAMILIES.find(([, r]) => r.test(name))[0];
// sample banks by kind (dirt-samples and the uzu drumkit are collections, not kinds)
const KIND_LISTS = {
  Drums: '808 808bd 808cy 808hc 808ht 808lc 808lt 808mc 808mt 808oh 808sd 909 bd sn sd hh hh27 cp cr ht lt mt cb clubkick hardkick kicklinn linnhats popkick reverbkick realclaps drum dr dr2 dr55 dr_few drumtraks gretsch ifdrums perc hand rm rs tabla tabla2 tablex sequential stomp tok tink peri odx ho oc ul ulgab',
  Breaks: 'amencutup breaks125 breaks152 breaks157 breaks165 jungle gabba gabbaloud gabbalouder hardcore house techno tech jazz',
  Bass: 'bass bass0 bass1 bass2 bass3 bassdm bassfoo jungbass jvbass wobble moog sid',
  Melodic: 'arp arpy casio juno pad padlong pluck sitar gtr notes newnotes sax simplesine fm stab hoover rave rave2 ravemono trump xmas east world psr',
  Voices: 'alphabet numbers num speech speakspell speechless diphone diphone2 yeah miniyeah mouth baa baa2 hmm breath koy kurt alex',
  'Glitch & electro': 'glitch glitch2 bleep blip click electro1 future noise noise2 dist industrial metal print proc procshort control bin dork2 dorkbot led bend chin clak coins tacscan invaders cosmicg subroc3d sundance armora battles toys',
  'Nature & space': 'birds birds3 crow insect wind outdoor fire seawolf space bubble pebbles can bottle glasstap',
};
const KIND = Object.fromEntries(Object.entries(KIND_LISTS).flatMap(([k, v]) => v.split(' ').map(x => [x, k])));
export const sampleKind = key => KIND[key] || (/kick|snare|drum|hat|clap|tom/.test(key) ? 'Drums' : 'Misc');
// acoustic instruments (VCSL) by family
const ACOUSTIC = [['Keys & organs', /piano|steinway|kawai|organ|clavisynth/], ['Mallets & bells', /balafon|glock|handbell|handchime|kalimba|marimba|tubularbell|vibraphone|xylophone|wineglass/], ['Strings', /dantranh|harp|psaltery|strumstick/], ['Winds', /didgeridoo|harmonica|ocarina|recorder|sax|super64/], ['Percussion', /./]];
export const acousticFamily = key => ACOUSTIC.find(([, r]) => r.test(key))[0];
// "RolandTR909" → "Roland TR-909", "AkaiMPC60" → "Akai MPC60"
const BRANDS = ['Roland', 'Korg', 'Yamaha', 'Casio', 'Boss', 'Akai', 'Alesis', 'Emu', 'Linn', 'Oberheim', 'Sequential Circuits', 'Simmons', 'Moog', 'Rhodes', 'Doepfer', 'Serge', 'Univox', 'Sakata', 'Soundmasters', 'Visco', 'Xdrum'];
export function machineLabel(m) {
  if (m === 'LinnDrum') return m;
  const b = BRANDS.find(x => m.startsWith(x.replace(' ', '')));
  if (!b) return m;
  let model = m.slice(b.replace(' ', '').length);
  if (b === 'Roland') model = model.replace(/^(TR|CR|MC|SH|JD|DDR|MT|D|S|R)(\d)/, '$1-$2');
  return model ? `${b} ${model}` : b;
}
export const prettyName = name => name.replace(/^gm_/, '').replace(/_/g, ' ');

// item: { key, name, cat, group, n } (n = number of variants for samples)
export function buildCatalog(soundMap, customBanks = []) {
  const items = [], own = new Set(customBanks.map(x => x.toLowerCase()));
  for (const [key, v] of Object.entries(soundMap || {})) {
    if (key.startsWith('_')) continue;
    const d = (v && v.data) || {}, base = d.baseUrl || '';
    const n = Array.isArray(d.samples) ? d.samples.length : d.samples && typeof d.samples === 'object' ? Object.keys(d.samples).length : 0;
    if (d.type === 'soundfont') { const gm = GM_SYNTH.find(([, r]) => r.test(key)); items.push(gm ? { key, name: key, cat: 'synths', group: gm[0], n: 0 } : { key, name: key, cat: 'instruments', group: familyOf(key), n: 0 }); continue; }
    if (d.type === 'synth') { if (key !== 'user' && key !== 'one') items.push({ key, name: key, cat: 'synths', group: /^z_|zzfx/.test(key) ? 'ZzFX' : /white|pink|brown|crackle/.test(key) ? 'Noise' : 'Oscillators', n: 0 }); continue; }
    if (d.type !== 'sample') continue;
    if (own.has(key)) { items.push({ key, name: key, cat: 'yours', group: 'public/samples', n }); continue; }
    if (base.includes('tidal-drum-machines')) {
      const [m, ...rest] = key.split('_'), canon = machineOf[m];
      if (canon) items.push({ key, name: rest.join('_'), cat: 'drums', group: canon, n });
      continue;
    }
    if (base.includes('VCSL') || base.includes('mrid') || key === 'piano') { items.push({ key, name: key, cat: 'acoustic', group: base.includes('mrid') ? 'Mridangam' : key === 'piano' ? 'Keys & organs' : acousticFamily(key), n, source: base.includes('mrid') ? 'mridangam' : key === 'piano' ? 'Salamander piano' : 'VCSL' }); continue; }
    items.push({ key, name: key, cat: 'samples', group: base.includes('uzu-drumkit') ? 'Drums' : sampleKind(key), n, source: base.includes('uzu-drumkit') ? 'uzu drumkit' : 'dirt-samples' });
  }
  items.sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
  return items;
}

// code to audition an item, and to use it in a song
export function auditionCode(item, mode = 'auto') {
  const q = s => JSON.stringify(s);
  if (item.cat === 'drums') {
    const bank = item.group;
    if (mode === 'variants' && item.n > 1) return `$: s(${q(item.name)}).bank(${q(bank)}).n("<${Array.from({ length: Math.min(item.n, 8) }, (_, i) => i).join(' ')}>")`;
    return `$: s(${q(`${item.name}*4`)}).bank(${q(bank)})`;
  }
  if (item.cat === 'instruments' || item.cat === 'synths') {
    const pitched = item.group !== 'Noise';
    if (!pitched) return `$: s(${q(`${item.name}*8`)}).decay(.08).sustain(0).gain(.5)`;
    if (mode === 'notes') return `$: note("a3 c4 e4 a4").s(${q(item.name)}).release(.3)`;
    return `$: note("<[a2,c3,e3] [f2,a2,c3] [g2,b2,d3] [e2,g#2,b2]>").s(${q(item.name)}).release(.4)`;
  }
  if (mode === 'rhythm') return `$: s(${q(`${item.name}*4`)}).n(0)`;
  return `$: s(${q(item.name)}).n("<${Array.from({ length: Math.max(1, Math.min(item.n || 1, 8)) }, (_, i) => i).join(' ')}>")`;
}
export function usageCode(item) {
  if (item.cat === 'drums') return `s("${item.name}").bank("${item.group}")`;
  if (item.cat === 'instruments' || item.cat === 'synths') return `note("a3").s("${item.name}")`;
  return `s("${item.name}").n(0)`;
}
// a drum machine as a 4-bar groove that plays every sound it has (variant 0 of each):
// bars 1-2 the basic beat, bars 3-4 every other sound joins in its usual role, a tom fill closes bar 4.
// Machine sound names come from a small set (bd sd cp hh oh cr rd rim cb sh tb perc misc fx ht mt lt);
// any other name is played once in the last beat of bar 3.
const TOMS = ['ht', 'mt', 'lt'];
const KNOWN = ['bd', 'sd', 'cp', 'hh', 'oh', 'cr', 'rd', 'rim', 'cb', 'sh', 'tb', 'perc', 'misc', 'fx', ...TOMS];
export function grooveCode(machine, sounds) {
  const has = x => sounds.includes(x), kick = has('bd') ? 'bd' : ['lt', 'mt'].find(has), snare = has('sd') ? 'sd' : has('cp') ? 'cp' : null, fill = TOMS.filter(has);
  const late = '.mask("<0 0 1 1>")';
  const lines = [
    // the basic beat, all 4 bars
    kick && [`s("${kick}*4")`, kick === 'bd' ? 'kick on every beat' : 'low tom as the kick (no bass drum)'],
    snare && [`s("~ ${snare} ~ ${snare}")${fill.length ? '.mask("<1 1 1 [1 1 1 0]>")' : ''}`, `${snare === 'sd' ? 'snare' : 'clap'} on 2 and 4${fill.length ? ', rests under the fill' : ''}`],
    has('hh') && ['s("[~ hh]*4")' + (has('oh') ? '.mask("[1 1 1 0]")' : ''), 'closed hat on the offbeats'],
    has('oh') && ['s("~ ~ ~ [~ oh]")', 'open hat on the last offbeat'],
    // bars 3-4: the rest of the machine
    has('cr') && ['s("cr")' + '.mask("<0 0 1 0>")', 'crash where the new sounds come in (bar 3)'],
    has('rd') && ['s("rd*4")' + late, 'ride on the beats'],
    snare === 'sd' && has('cp') && ['s("~ cp ~ cp")' + late, 'clap with the snare'],
    has('tb') && ['s("~ tb ~ tb")' + late, 'tambourine with the snare'],
    has('rim') && ['s("[~ ~ ~ rim ~ ~ ~ ~]*2")' + late, 'rimshot, syncopated'],
    has('cb') && ['s("[~ ~ ~ ~ ~ ~ ~ cb]*2")' + late, 'cowbell closing each half bar'],
    has('perc') && ['s("[~ ~ ~ ~ ~ perc ~ ~]*2")' + late, 'percussion in the gaps'],
    has('sh') && ['s("sh*16").gain(.6)' + late, 'shaker on sixteenths'],
    has('misc') && ['s("[~ misc ~ ~] ~ ~ ~")' + late, 'misc sound after the first beat'],
    has('fx') && ['s("~ ~ [~ fx ~ ~] ~")' + late, 'effect after the third beat'],
  ].filter(Boolean);
  const other = sounds.filter(x => x && !KNOWN.includes(x));
  if (other.length) lines.push([`s("~ ~ ~ [${other.join(' ')}]")` + '.mask("<0 0 1 0>")', 'other sounds, once in bar 3']);
  if (fill.length) lines.push([`s("~ ~ ~ [${fill.length === 1 ? `${fill[0]} ${fill[0]}` : fill.join(' ')}]")` + '.mask("<0 0 0 1>")', 'tom fill, high to low (bar 4)']);
  // nothing for the basic beat (a percussion-only machine): the rest plays from bar 1
  const basic = kick || snare || has('hh') || has('oh');
  const code = lines.map(([p, why]) => `$: ${basic ? p : p.replace(late, '')}.bank("${machine}") // ${why}`);
  return `// ${machineLabel(machine)}: 4 bars, every sound of the machine (bars 1-2 the beat, 3-4 the rest)\n${code.join('\n')}`;
}
