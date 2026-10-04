// 04 — Traccia completa con slider live (stile Switch Angel)
// Muovi gli slider mentre suona: è così che si fanno build-up e drop.
setcpm(138/4)

const cutoff = slider(1200, 200, 6000)

$: s("bd*4").bank("RolandTR909").gain(slider(1, 0, 1)) // porta a 0 per il break
$: s("[~ hh]*4, ~ cp ~ cp").bank("RolandTR909").gain(.55)
$: s("hh*16").bank("RolandTR909").gain(".2 .35").sometimes(x => x.speed(1.5))

$: note("<a1 f1 c2 g1>").struct("[~ x x x]*4")
  .s("sawtooth").lpf(cutoff.div(2)).lpq(6)
  .decay(.12).sustain(0).gain(.8)

$: n("0 2 4 7 4 2 <7 9> 4")
  .scale("<A3:minor F3:lydian C4:major G3:mixolydian>")
  .s("supersaw").lpf(cutoff).lpq(4)
  .decay(.2).sustain(.1)
  .delay(.35).room(.4)
  .gain(.45)

$: note("<[a2,c3,e3] [f2,a2,c3] [c3,e3,g3] [g2,b2,d3]>")
  .s("supersaw").attack(.5).release(1.2)
  .lpf(cutoff).room(.9).gain(.3)
