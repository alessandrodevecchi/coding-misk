// Ghost Protocol · hard techno cyberpunk · 60 battute, circa 1:40
//
// Costruito come in un DAW: i layer suonano per tutto il brano e ognuno ha
// un'automazione per battuta (volume, filtro, tonalità, drum machine).
// Così le sezioni si sovrappongono e sfumano invece di tagliarsi.
//
// Nel codice di supporto le stringhe usano apici singoli: per Strudel i doppi apici
// e i backtick sono mini-notation e diventerebbero pattern. mini() trasforma il
// risultato finale in pattern.
//
// lane({ sezione: valore }) produce un pattern "<…>" con un valore per battuta:
//   numero        valore fisso per tutta la sezione
//   [da, a]       rampa lungo la sezione
//   [[n, da, a]]  segmenti: n battute con rampa da → a (o fisso se manca "a")
//   ["x", "y"]    lista di pattern che si ripete battuta dopo battuta
// fade(pattern, { … }) usa la stessa lane come volume e come mute.
//
// TEMPO: il player di coding-misk legge questa riga e cambia BPM battuta per
// battuta. Su strudel.cc il brano resta al tempo di setcpm.

samples('github:tidalcycles/dirt-samples') // industrial, metal, numbers
setcpm(132/4)

const SECTIONS = [['intro', 8], ['build', 8], ['dropA', 12], ['fall', 2], ['break', 6], ['rebuild', 8], ['dropB', 12], ['outro', 4]]
const TEMPO = {'intro': 132, 'build': [132, 140], 'dropA': 140, 'fall': 140, 'break': 140, 'rebuild': [140, 148], 'dropB': 148, 'outro': 148}

const ramp = (n, a, b) => Array.from({ length: n }, (_, i) => +(a + (b - a) * (i + 1) / n).toFixed(3))
const segs = (n, v) =>
  !Array.isArray(v) ? Array(n).fill(v)
  : typeof v[0] === 'number' ? ramp(n, v[0], v[1])
  : typeof v[0] === 'string' ? Array.from({ length: n }, (_, i) => v[i % v.length])
  : v.flatMap(([k, a, b = a]) => typeof a === 'number' ? ramp(k, a, b) : Array(k).fill(a))
const lane = (vals, def = 0) => mini('<' + SECTIONS.flatMap(([name, n]) => {
  const out = segs(n, vals[name] ?? def)
  if (out.length !== n) throw new Error('lane: ' + name + ' ha ' + out.length + ' battute invece di ' + n)
  return out
}).map(v => typeof v === 'string' && /[\s,]/.test(v) ? '[' + v + ']' : v).join(' ') + '>')
const fade = (pat, vals) => { const l = lane(vals); return pat.mask(l).velocity(l) }

// tonalità: Mi frigio, poi su di un semitono nel drop B (il classico "cambio da camionista")
const key = lane({ dropB: 1, outro: 1 })
const chords = "<[e2,g2,b2,e3] [c2,g2,c3,e3] [d2,a2,d3,f#3] [b1,f#2,b2,d3]>"
const roots = "<e1 c2 d1 b0>"
const acid = "e2 e2 [e3 e2] f2 e2 g2 [e2 e3] f2"

// ---------- cassa 909: entra filtrata nell'intro, respira prima dei drop ----------
$: s(lane({
    intro: [[6, '~'], [2, 'bd*4']], build: [[7, 'bd*4'], [1, 'bd bd ~ ~']], dropA: 'bd*4',
    fall: [[1, 'bd*4'], [1, 'bd ~ ~ ~']], rebuild: [[2, '~'], [5, 'bd*4'], [1, 'bd bd ~ ~']],
    dropB: ['bd*4', 'bd*4', 'bd*4', 'bd*4, ~ ~ ~ [~ bd]'], outro: ['bd*4', 'bd*8', 'bd*16', 'bd*32'],
  }, '~'))
  .bank(lane({ dropB: ['RolandTR909', 'RolandTR909', 'RolandTR808', 'RolandTR909'] }, 'RolandTR909'))
  .lpf(lane({ intro: [[6, 300], [2, 300, 1500]], build: [1500, 8000], fall: [8000, 1500], rebuild: [[2, 300], [6, 300, 8000]], outro: [8000, 800] }, 8000))
  .distort(lane({ dropA: 1.6, fall: 1.6, rebuild: [.6, 1.8], dropB: 2, outro: [2, 3] }, 1.2)).distortvol(.45)
  .analyze("kick")

// ---------- batteria half-time LinnDrum: sfuma dentro il break e fuori nel rebuild ----------
$: fade(s("bd ~ ~ ~ ~ ~ bd ~, ~ ~ ~ ~ sd ~ ~ ~, hh*8").bank("LinnDrum").crush(5),
    { fall: [[1, 0], [1, 0, .5]], break: [[2, .5, 1], [4, 1]], rebuild: [[3, 1, 0], [5, 0]] })
  .gain(.75).room(.3).analyze("snare")

// ---------- clap e rullate ----------
$: s(lane({
    build: [[4, '~'], [1, 'sd*4'], [1, 'sd*8'], [2, 'sd*16']], dropA: '~ cp ~ cp',
    fall: [[1, '~ cp ~ cp'], [1, '~ ~ ~ [cp cp cp cp]']],
    rebuild: [[4, '~'], [2, 'sd*8'], [2, 'sd*16']], dropB: ['~ cp ~ cp', '~ cp ~ [cp cp]'],
  }, '~'))
  .bank(lane({ dropB: 'RolandTR707' }, 'RolandTR909'))
  .gain(lane({ build: [[4, 0], [4, .35, .8]], rebuild: [[4, 0], [4, .4, .85]] }, .7))
  .room(.35).analyze("snare")

// ---------- hi-hat: filo continuo, cambiano macchina e sporcizia ----------
$: fade(s("hh*16").gain("[.2 .32 .24 .4]*4"),
    { intro: [.3, .7], build: .8, dropA: 1, fall: [[1, 1], [1, .5]], break: .45, rebuild: [.45, 1], dropB: 1, outro: [1, .3] })
  .bank(lane({ intro: 'RolandTR606', dropA: 'RolandTR808', dropB: ['RolandTR909', 'RolandTR707'] }, 'RolandTR909'))
  .crush(lane({ intro: 4, dropA: 7, dropB: 6, outro: [6, 2] }, 9))
  .degradeBy(lane({ intro: .45, fall: [.2, .6], break: .5 }, 0))
  .pan(sine.fast(2)).analyze("hats")

$: fade(s("[~ oh]*4").bank("RolandTR909"), { dropA: 1, fall: [[1, 1], [1, 0]], rebuild: [[6, 0], [2, .3, .8]], dropB: 1 })
  .gain(.35).analyze("hats")
$: fade(s("[~ rd]*4").bank("RolandTR909"), { dropB: [[4, 0], [8, 1]] }).gain(.3).analyze("hats")

// ---------- basso rumble in levare · sub lungo nel break: si danno il cambio ----------
$: fade(note(roots).struct("[~ x x]*4").s("sawtooth").lpq(10).decay(.1).sustain(0),
    { build: [[4, 0], [4, .5, 1]], dropA: 1, fall: [[1, 1], [1, .4]], rebuild: [[4, 0], [4, .4, 1]], dropB: 1, outro: [1, .4] })
  .transpose(key)
  .lpf(lane({ build: [200, 450], fall: [450, 150], rebuild: [150, 500], dropB: 500, outro: [500, 120] }, 450))
  .distort(lane({ dropB: 3.5 }, 3)).gain(.55).analyze("bass")

$: fade(note(roots).s("sine").attack(.05).release(.6),
    { intro: [0, .6], build: [.6, 0], fall: [[1, 0], [1, 0, .7]], break: .8, rebuild: [[4, .8], [4, .8, 0]] })
  .transpose(key).gain(.6).analyze("bass")

// ---------- acid: non si ferma mai, il filtro decide quanto si sente ----------
$: fade(note(acid).s("sawtooth").lpq(20).decay(.13).sustain(.1).jux(rev),
    { build: [.3, .9], dropA: .9, fall: .9, break: .5, rebuild: [.5, .9], dropB: 1, outro: [1, 0] })
  .transpose(key)
  .lpf(lane({ build: [300, 2800], dropA: [[4, 1400, 3000], [4, 3000, 1400], [4, 1400, 3400]],
              fall: [3000, 450], break: 380, rebuild: [400, 3600],
              dropB: [[4, 1800, 4200], [4, 4200, 2000], [4, 2000, 4800]], outro: [3000, 250] }, 300))
  .distort(lane({ dropA: 1.4, dropB: 1.8, rebuild: [.8, 1.6] }, 1)).gain(.36).analyze("arp")

// ---------- accordi: stab saturi nei drop, pad largo che fa da ponte ----------
$: fade(note(chords).struct("x ~ ~ x ~ ~ x ~ ~ ~ x ~ x ~ ~ ~").s("supersaw").decay(.15).sustain(0),
    { dropA: [[2, .6, 1], [10, 1]], fall: [[1, 1], [1, .2]], rebuild: [[6, 0], [2, 0, .6]], dropB: 1, outro: [1, 0] })
  .transpose(key)
  .lpf(lane({ fall: [2800, 600], rebuild: [[6, 600], [2, 600, 2800]], dropB: 3400 }, 2800))
  .distort(lane({ dropB: 1.2 }, .8)).room(.4).gain(.3).analyze("pad")

$: fade(note(chords).s("supersaw").attack(.6).release(1.8),
    { intro: [[2, 0, .8], [6, .8]], build: [.8, .25], dropA: [[10, 0], [2, 0, .5]], fall: .8, break: 1, rebuild: [1, .2], outro: [0, .7] })
  .transpose(key)
  .lpf(lane({ intro: [500, 1400], break: [1400, 2400], rebuild: [2400, 800] }, 1400))
  .room(.9).gain(.28).analyze("pad")

// ---------- hook FM: anticipato a fine drop A, protagonista nel break, ritorna nel drop B ----------
$: fade(n("<[0 ~ 3 ~ 7 ~ 3 1] [0 ~ 3 ~ 8 7 ~ ~]>").s("square").vowel("<a e i o>"),
    { dropA: [[8, 0], [4, 0, .6]], fall: .7, break: 1, rebuild: [[4, 1], [4, 1, .4]], dropB: [[4, .5], [8, 1]], outro: [1, 0] })
  .scale(lane({ dropB: 'F4:phrygian', outro: 'F4:phrygian' }, 'E4:phrygian'))
  .fm(lane({ break: 3, dropB: 4 }, 2)).crush(lane({ dropB: 8 }, 16))
  .delay(.45).delayfeedback(lane({ fall: .7, break: .6 }, .4))
  .room(lane({ fall: .7, break: .6 }, .3)).lpf(3500).gain(.24).analyze("hook")

// ---------- voce radio e texture ----------
$: fade(s("numbers").n("<0 3 7 1>").crush(5).hpf(900),
    { intro: 1, build: [1, 0], break: [[2, 0, .8], [4, .8]], rebuild: [.8, 0], outro: [0, 1] })
  .room(.7).delay(.4).gain(.5).analyze("hook")
$: fade(s("industrial*8").n(irand(16)).coarse(lane({ dropB: 3 }, 6)).hpf(2000).pan(rand),
    { intro: [.4, 1], build: [1, .3], break: .4, dropB: [[4, 0], [8, .8]] })
  .gain(.22).analyze("fx")
$: fade(s("metal(3,8,2)").n("<0 2 4 6>").speed(.7).crush(6), { dropA: [[4, 0], [8, 1]], fall: [1, 0], dropB: .8 })
  .room(.3).gain(.35).analyze("fx")

// ---------- crash e boom sul primo colpo dei drop ----------
$: s(lane({ dropA: [[1, 'cr'], [11, '~']], dropB: [[1, 'cr'], [11, '~']], break: [[1, 'cr'], [5, '~']] }, '~'))
  .bank("RolandTR909").gain(.55).room(.4).analyze("fx")
$: s(lane({ dropA: [[1, 'bd ~ ~ ~'], [11, '~']], dropB: [[1, 'bd ~ ~ ~'], [11, '~']] }, '~'))
  .bank("RolandTR808").speed(.5).room(.9).gain(.8).analyze("fx")

// ---------- riser prima dei drop, downlifter nel fall ----------
$: fade(s("white*16").decay(.05).sustain(0),
    { build: [[4, 0], [4, .1, .35]], fall: [.35, .05], rebuild: [[4, 0], [4, .1, .4]] })
  .hpf(lane({ build: [[4, 300], [4, 1200, 10000]], fall: [8000, 300], rebuild: [[4, 300], [4, 1200, 11000]] }, 300))
  .analyze("riser")
