// 03 — Arpeggio + pad, progressione Am F C G
setcpm(138/4)

$: s("bd*4").bank("RolandTR909")
$: s("[~ hh]*4").bank("RolandTR909").gain(.5)

$: note("<[a3 c4 e4 a4]*2 [f3 a3 c4 f4]*2 [c4 e4 g4 c5]*2 [g3 b3 d4 g4]*2>")
  .s("sawtooth")
  .lpf(sine.range(800, 4000).slow(16))
  .decay(.15).sustain(.2)
  .delay(.4)
  .gain(.5)

$: note("<[a2,c3,e3] [f2,a2,c3] [c3,e3,g3] [g2,b2,d3]>")
  .s("supersaw")
  .attack(.4).release(1)
  .lpf(1400)
  .room(.8)
  .gain(.35)
