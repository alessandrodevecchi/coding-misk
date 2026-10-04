// 01 — Batteria four-on-the-floor
// Mini-notation: "bd*4" = 4 colpi per ciclo, "~" = pausa, "[a b]" = suddivisione.
setcpm(138/4) // 138 BPM, 4 battiti per ciclo

$: s("bd*4").bank("RolandTR909")
$: s("[~ hh]*4").bank("RolandTR909").gain(.6)
$: s("~ cp ~ cp").bank("RolandTR909").room(.3)
$: s("hh*16").bank("RolandTR909").gain(".25 .4").pan(sine.slow(4))
