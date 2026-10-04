// Ghost Protocol · hard techno cyberpunk
// 36 battute, circa 60 secondi. Il tempo sale: 135 → 140 → 145 → 150 BPM.
// Ogni sezione è uno stack() indipendente: drum machine, groove, tonalità,
// suoni e effetti cambiano liberamente. arrange() le mette in fila.
//
// Trucchi usati:
//   tempo(bpm)        un evento muto con .cps() cambia il tempo all'inizio della sezione
//   .transpose(n)     cambio di tonalità: Mi frigio → Sol (break) → Fa (drop 2)
//   .bank("<a b>")    la drum machine cambia battuta per battuta
//   .distort .crush .coarse   la ruvidità: saturazione, bitcrusher, riduzione di campionamento
//   .analyze("…")     accende lo strumento nel visual Palco
samples('github:tidalcycles/dirt-samples') // industrial, metal, numbers
setcpm(135/4)

const tempo = bpm => note("c").s("sine").gain(0).cps(bpm / 240)
const kick = (bank, pat = "bd*4") => s(pat).bank(bank)
  .distort(1.6).distortvol(.45).lpf(3200).analyze("kick")
const powerChords = "<[e2,b2,e3] [f2,c3,f3] [e2,b2,e3] [d2,a2,d3]>"
const acid = "e2 e2 [e3 e2] f2 e2 g2 [e2 e3] f2"

// ---------- INTRO · 4 battute · 135 BPM · radio disturbata nel vuoto ----------
const intro = stack(
  tempo(135),
  s("numbers").n("<0 3 7 1>").crush(5).hpf(900)
    .room(.7).delay(.4).gain(.5).analyze("hook"),
  s("industrial*8").n(irand(16)).coarse(6).hpf(2000)
    .gain(.22).pan(rand).analyze("fx"),
  note("e1").s("sawtooth").lpf(sine.range(80, 400).slow(4)).lpq(12)
    .distort(2).attack(.5).release(1).gain(.35).analyze("bass"),
  s("hh*16").bank("RolandTR606").crush(4)
    .gain("[.15 .25]*8").degradeBy(.4).analyze("hats")
)

// ---------- BUILD · 8 battute · 140 BPM · entra la macchina ----------
const build = stack(
  tempo(140),
  kick("RolandTR909").mask("<0!2 1!6>"),
  s("[~ hh]*4").bank("RolandTR909").crush(6).gain(.45).analyze("hats"),
  note("e1").struct("[~ x x]*4").s("sawtooth")
    .lpf(sine.range(120, 600).slow(8)).lpq(8).distort(2.5)
    .decay(.12).sustain(0).gain(.55).mask("<0!4 1!4>").analyze("bass"),
  note(acid).s("sawtooth")
    .lpf("<300 450 650 900 1200 1600 2100 2800>").lpq(18).distort(1)
    .decay(.15).sustain(.1).gain(.4).analyze("arp"),
  s("<~!4 sd*4 sd*8 sd*16 sd*16>").bank("RolandTR909")
    .gain("<0!4 .4 .5 .6 .75>").room(.3).analyze("snare"),
  s("white*16").decay(.05).sustain(0)
    .hpf(saw.slow(8).range(200, 10000))
    .gain(saw.slow(8).range(0, .3)).analyze("riser")
)

// ---------- DROP A · 8 battute · 145 BPM · Mi frigio, tutto saturo ----------
const dropA = stack(
  tempo(145),
  kick("RolandTR909"),
  s("~ cp ~ cp").bank("RolandTR909").room(.35).gain(.7).analyze("snare"),
  s("hh*16").bank("RolandTR808").gain("[.2 .35 .25 .45]*4").crush(7).analyze("hats"),
  s("[~ oh]*4").bank("RolandTR909").gain(.35).analyze("hats"),
  note("<e1 e1 f1 d1>").struct("[~ x x]*4").s("sawtooth")
    .lpf(450).lpq(10).distort(3).decay(.1).sustain(0).gain(.55).analyze("bass"),
  note(acid).s("sawtooth")
    .lpf(sine.range(400, 3000).slow(4)).lpq(22).distort(1.4)
    .decay(.12).sustain(.1).gain(.36).jux(rev).analyze("arp"),
  note(powerChords).struct("x ~ ~ x ~ ~ x ~ ~ ~ x ~ x ~ ~ ~")
    .s("supersaw").decay(.15).sustain(0).distort(.8)
    .lpf(2800).room(.4).gain(.3).analyze("pad"),
  s("metal(3,8,2)").n("<0 2 4 6>").speed(.7).crush(6)
    .room(.3).gain(.35).analyze("fx")
)

// ---------- BREAK · 4 battute · half-time su LinnDrum · tonalità su di 3 ----------
const brk = stack(
  tempo(145),
  s("bd ~ ~ ~ ~ ~ bd ~").bank("LinnDrum").crush(5).gain(.7).analyze("kick"),
  s("~ ~ ~ ~ sd ~ ~ ~").bank("LinnDrum").room(.5).gain(.6).analyze("snare"),
  s("hh*8").bank("LinnDrum").crush(5).gain(.35).analyze("hats"),
  note("<[e2,g2,b2,e3] [c2,g2,c3,e3] [d2,a2,d3,f#3] [b1,f#2,b2,d3]>").transpose(3)
    .s("supersaw").attack(.4).release(1.5).lpf(1800).room(.9).gain(.3).analyze("pad"),
  n("<[0 ~ 3 ~ 7 ~ 3 1] [0 ~ 3 ~ 8 7 ~ ~]>").scale("G4:phrygian")
    .s("square").fm(3).vowel("<a e i o>")
    .delay(.5).delayfeedback(.6).room(.5).gain(.25).analyze("hook"),
  s("numbers").n("<5 2>").chop(8).rev().crush(4).gain(.4).analyze("fx"),
  s("white*16").decay(.05).sustain(0)
    .hpf(saw.slow(4).range(300, 9000))
    .gain(saw.slow(4).range(0, .3)).analyze("riser")
)

// ---------- DROP B · 8 battute · 150 BPM · Fa frigio, drum machine che si alternano ----------
const dropB = stack(
  tempo(150),
  kick("<RolandTR909 RolandTR909 RolandTR808 RolandTR909>", "bd*4, ~ ~ ~ [~ bd]"),
  s("~ cp ~ [cp cp]").bank("RolandTR707").room(.35).gain(.7).analyze("snare"),
  s("hh(11,16)").bank("<RolandTR909 RolandTR707>").gain(.4).crush(6)
    .pan(sine.fast(2)).analyze("hats"),
  s("[~ rd]*4").bank("RolandTR909").gain(.3).analyze("hats"),
  note("<e1 e1 f1 d1>").transpose(1).struct("[~ x x]*4").s("sawtooth")
    .lpf(500).lpq(12).distort(3.5).decay(.1).sustain(0).gain(.55).analyze("bass"),
  note(acid).transpose(1).s("sawtooth")
    .lpf(sine.range(600, 4000).slow(2)).lpq(24).distort(1.8)
    .decay(.1).sustain(.1).gain(.34).jux(rev).analyze("arp"),
  note(powerChords).transpose(1).struct("x ~ ~ x ~ ~ x ~ ~ ~ x ~ x ~ ~ ~")
    .s("supersaw").decay(.15).sustain(0).distort(1.2)
    .lpf(3200).room(.4).gain(.3).analyze("pad"),
  n("<[0 ~ 3 ~ 7 ~ 3 1] [0 ~ 3 ~ 8 7 ~ ~]>").scale("F4:phrygian")
    .s("square").fm(4).crush(8).lpf(3500)
    .delay(.3).gain(.22).analyze("hook"),
  s("industrial*16").n(irand(16)).coarse(3).gain(.18).pan(rand).analyze("fx")
)

// ---------- OUTRO · 4 battute · 150 BPM · il segnale si sgretola ----------
const outro = stack(
  tempo(150),
  kick("RolandTR909").ply("<1 2 4 8>").gain("<1 .9 .8 .6>"),
  s("hh*16").bank("RolandTR909").crush("<8 6 4 2>").gain(.35).analyze("hats"),
  note("e1*8").transpose(1).s("sawtooth").lpf("<800 500 300 150>").lpq(15)
    .distort(4).decay(.1).sustain(0).gain(.5).analyze("bass"),
  s("numbers").n("<9 8 7 0>").crush(4).room(.8).gain(.5).analyze("hook")
)

$: arrange(
  [4, intro],
  [8, build],
  [8, dropA],
  [4, brk],
  [8, dropB],
  [4, outro],
)
