// Neon Ascent · techno trance in La minore
// 128 BPM, 32 battute = 60 secondi esatti
// Intro 1-4 · Build 5-12 · Drop 13-20 · Break 21-24 · Drop 25-32
// Ogni .mask("<...>") ha 32 valori, uno per battuta: 1 suona, 0 tace.
// "1!8" vuol dire "1 ripetuto per 8 battute".
// .analyze("…") accende lo strumento corrispondente nel visual Palco.
setcpm(128/4)

// sezioni e tempo letti dal player di coding-misk (timeline, salto a una battuta)
const SECTIONS = [['intro', 4], ['build', 8], ['dropA', 8], ['break', 4], ['dropB', 8]]
const TEMPO = {'intro': 128, 'build': 128, 'dropA': 128, 'break': 128, 'dropB': 128}

const kit = "RolandTR909"

// ---------- batteria ----------
$: s("bd*4").bank(kit).gain(1)
  .mask("<0!4 1!16 0!4 1!8>").analyze("kick")
$: s("~ cp ~ cp").bank(kit).gain(.75).room(.2)
  .mask("<0!12 1!8 0!4 1!8>").analyze("snare")
$: s("[~ oh]*4").bank(kit).gain(.4)
  .mask("<1!20 0!4 1!8>").analyze("hats")
$: s("hh*16").bank(kit).gain("[.18 .3]*8")
  .mask("<0!8 1!12 0!4 1!8>").analyze("hats")
$: s("[~ rd]*4").bank(kit).gain(.3)          // ride solo nel secondo drop
  .mask("<0!24 1!8>").analyze("hats")
$: s("lt mt ht ht").fast(2).bank(kit).gain(.6) // fill di tom prima dei drop
  .mask("<0!11 1 0!11 1 0!8>").analyze("fx")
$: s("cr").bank(kit).gain(.55)               // crash sul primo colpo dei drop
  .mask("<0!12 1 0!11 1 0!7>").analyze("fx")

// ---------- basso rolling ----------
$: note("<a1 f1 c2 g1>").struct("[~ x x x]*4")
  .s("sawtooth").lpf(sine.range(400, 1100).slow(8)).lpq(10)
  .decay(.11).sustain(0).gain(.85)
  .mask("<0!8 1!12 0!4 1!8>").analyze("bass")

// ---------- arpeggio: il filtro si apre battuta dopo battuta nel build ----------
$: note("<[a3 c4 e4 a4]*4 [f3 a3 c4 f4]*4 [g3 c4 e4 g4]*4 [g3 b3 d4 g4]*4>")
  .s("supersaw").lpq(5)
  .lpf("<600!4 800 1100 1500 2000 2600 3200 3800 4200 4200!8 2000!4 4200!8>")
  .decay(.14).sustain(.1).delay(.3).gain(.38)
  .mask("<0!4 1!28>").analyze("arp")

// ---------- pad lungo per intro e break ----------
$: note("<[a2,c3,e3] [f2,a2,c3] [g2,c3,e3] [g2,b2,d3]>")
  .s("supersaw").attack(.8).release(1.5).lpf(1400).room(.9).gain(.3)
  .mask("<1!4 0!16 1!4 0!8>").analyze("pad")

// ---------- accordi in levare nei drop: l'effetto "pompa" della trance ----------
$: note("<[a2,c3,e3] [f2,a2,c3] [g2,c3,e3] [g2,b2,d3]>").struct("[~ x]*4")
  .s("supersaw").attack(.02).decay(.25).sustain(.2).release(.3)
  .lpf(2200).room(.5).gain(.3)
  .mask("<0!12 1!8 0!4 1!8>").analyze("pad")

// ---------- hook ----------
$: n("<[0 ~ 0 2 ~ 4 ~ 7] [5 ~ 4 ~ 2 ~ 0 ~] [4 ~ 4 5 ~ 7 ~ 9] [7 ~ 5 ~ 4 2 ~ ~]>")
  .scale("A4:minor").s("square").lpf(3200)
  .decay(.2).sustain(.25).delay(.4).delayfeedback(.45).room(.4)
  .gain(.28)
  .mask("<0!12 1!20>").analyze("hook")

// ---------- riser: rumore che sale per 4 battute prima di ogni drop ----------
$: s("white*16").decay(.06).sustain(0)
  .hpf(saw.slow(4).range(300, 9000))
  .gain(saw.slow(4).range(0, .3))
  .mask("<0!8 1!4 0!8 1!4 0!8>").analyze("riser")
