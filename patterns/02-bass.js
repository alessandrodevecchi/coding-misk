// 02 — Rolling bass trance (offbeat a sedicesimi)
// "<a b c>" = un valore diverso per ogni ciclo. struct() impone il ritmo.
setcpm(138/4)

$: s("bd*4").bank("RolandTR909")
$: note("<a1 f1 c2 g1>")
  .struct("[~ x x x]*4")
  .s("sawtooth")
  .lpf(sine.range(300, 900).slow(8)) // filtro che "respira" ogni 8 cicli
  .lpq(8)
  .decay(.12).sustain(0)
  .gain(.8)
