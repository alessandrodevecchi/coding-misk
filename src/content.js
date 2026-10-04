// Lezioni, libreria suoni, riferimenti e brani mostrati nei tab, in italiano e inglese.
import neonAscent from '../patterns/05-neon-ascent.js?raw';
import ghostProtocol from '../patterns/06-ghost-protocol.js?raw';

// ogni lezione: codice + [titolo, spiegazione, "prova"] per lingua
export const LESSONS = [
  { code: '$: s("bd hh sd hh")',
    it: ['Il ciclo', 'Tutto in Strudel gira in cicli: un ciclo è una battuta. I suoni tra virgolette si dividono il ciclo in parti uguali, quindi quattro suoni durano un quarto ciascuno.', 'Aggiungi un quinto suono, per esempio "cp". Senti come si stringe tutto.'],
    en: ['The cycle', 'Everything in Strudel runs in cycles: one cycle is one bar. The sounds inside the quotes split the cycle into equal parts, so four sounds last a quarter each.', 'Add a fifth sound, for example "cp". Hear how everything squeezes together.'] },
  { code: '$: s("bd*4, [~ hh]*4, ~ cp")',
    it: ['Moltiplica, suddividi, sovrapponi', '"*" ripete un suono nello stesso spazio. Le parentesi quadre stringono più eventi in un solo passo. La virgola fa suonare due sequenze insieme. "~" è una pausa.', 'Cambia "[~ hh]*4" in "hh*8" e poi in "hh*16".'],
    en: ['Multiply, subdivide, layer', '"*" repeats a sound in the same space. Square brackets squeeze several events into one step. A comma plays two sequences at once. "~" is a rest.', 'Change "[~ hh]*4" to "hh*8", then to "hh*16".'] },
  { code: '$: s("bd*4, [~ hh]*4, <cp [cp cp]> ~")',
    it: ['Alternare tra cicli', 'Le parentesi angolari scelgono un elemento diverso a ogni ciclo. È il modo più semplice per creare variazione senza scrivere più battute.', 'Aggiungi un terzo elemento dentro < >, per esempio "[~ cp]".'],
    en: ['Alternate between cycles', 'Angle brackets pick a different element on each cycle. It is the simplest way to add variation without writing more bars.', 'Add a third element inside < >, for example "[~ cp]".'] },
  { code: '$: s("bd*4, [~ hh]*4, ~ cp").bank("RolandTR808")',
    it: ['Drum machine', '.bank() sceglie il campionario di una drum machine storica. Stesso ritmo, carattere diverso.', 'Prova "RolandTR909", "RolandTR707" o "LinnDrum".'],
    en: ['Drum machines', '.bank() picks the samples of a classic drum machine. Same rhythm, different character.', 'Try "RolandTR909", "RolandTR707" or "LinnDrum".'] },
  { code: '$: note("<[a2,c3,e3] [f2,a2,c3] [c3,e3,g3] [g2,b2,d3]>").s("sawtooth")',
    it: ['Note e accordi', 'note() suona altezze per nome. La virgola dentro le quadre crea un accordo. .s() sceglie lo strumento: qui un oscillatore a dente di sega.', 'Sostituisci "sawtooth" con "square", "triangle" o "supersaw".'],
    en: ['Notes and chords', 'note() plays pitches by name. A comma inside square brackets makes a chord. .s() picks the instrument: here a sawtooth oscillator.', 'Replace "sawtooth" with "square", "triangle" or "supersaw".'] },
  { code: '$: n("0 2 4 <7 6> 4 2").scale("A3:minor").s("triangle")',
    it: ['Scale', 'Con n() e .scale() scrivi gradi della scala invece di nomi di nota. Non sbagli mai una nota, e cambiare tonalità diventa una parola sola.', 'Cambia "A3:minor" in "C4:major" o "D3:dorian".'],
    en: ['Scales', 'With n() and .scale() you write scale degrees instead of note names. You never hit a wrong note, and changing key takes one word.', 'Change "A3:minor" to "C4:major" or "D3:dorian".'] },
  { code: '$: note("a1*8").s("sawtooth").lpf(400).lpq(15)',
    it: ['Filtro e risonanza', 'Il filtro passa-basso (.lpf) toglie le frequenze alte. .lpq aumenta la risonanza attorno al taglio. È il cuore del suono acid e trance.', 'Porta lpf da 200 a 3000 e premi Ctrl+Enter ogni volta.'],
    en: ['Filter and resonance', 'The low-pass filter (.lpf) removes high frequencies. .lpq boosts the resonance around the cutoff. It is the heart of acid and trance sounds.', 'Move lpf from 200 to 3000 and press Ctrl+Enter each time.'] },
  { code: '$: note("<a3 c4 e4 g4>*4").s("supersaw").attack(.01).decay(.1).sustain(0)',
    it: ['Inviluppo', 'attack, decay, sustain e release decidono come un suono nasce e muore. Decay corto e sustain zero danno note secche, attack lungo dà un pad che si gonfia.', 'Prova .attack(.5).release(1) per trasformarlo in un pad.'],
    en: ['Envelope', 'attack, decay, sustain and release decide how a sound starts and fades. Short decay with zero sustain gives dry notes, a long attack gives a swelling pad.', 'Try .attack(.5).release(1) to turn it into a pad.'] },
  { code: '$: note("a1*16").s("sawtooth").lpf(sine.range(200, 3000).slow(4)).lpq(10)',
    it: ['Modulazione', 'Al posto di un numero puoi passare un segnale. sine.range(a, b) oscilla tra due valori, .slow(4) lo fa durare quattro cicli. Il filtro "respira" da solo.', 'Usa saw al posto di sine per un filtro che sale e riparte.'],
    en: ['Modulation', 'Instead of a number you can pass a signal. sine.range(a, b) swings between two values, .slow(4) stretches it over four cycles. The filter breathes on its own.', 'Use saw instead of sine for a filter that rises and restarts.'] },
  { code: '$: n("0 ~ 4 ~ 7 ~ ~ ~").scale("A4:minor").s("square").delay(.5).delayfeedback(.6).room(.6).gain(.5)',
    it: ['Spazio: delay e riverbero', '.delay() ripete il suono come un\'eco, .delayfeedback() decide quante volte. .room() mette il suono in una stanza.', 'Alza delayfeedback a .85, ma attenzione al volume.'],
    en: ['Space: delay and reverb', '.delay() repeats the sound like an echo, .delayfeedback() sets how many times. .room() puts the sound in a room.', 'Raise delayfeedback to .85, but watch the volume.'] },
  { code: '$: s("hh*16").bank("RolandTR909").gain(.5).sometimes(x => x.speed(2)).degradeBy(.2)',
    it: ['Caso controllato', 'sometimes() applica una trasformazione a circa metà degli eventi, degradeBy() ne toglie una parte a caso. Il pattern resta vivo senza scrivere variazioni a mano.', 'Prova rarely() e often() al posto di sometimes().'],
    en: ['Controlled randomness', 'sometimes() applies a change to about half the events, degradeBy() drops some at random. The pattern stays alive without writing variations by hand.', 'Try rarely() and often() instead of sometimes().'] },
  { code: '$: s("bd*4").bank("RolandTR909")\n_$: s("[~ hh]*4").bank("RolandTR909")\n$: note("<a1 f1 c2 g1>").struct("[~ x x x]*4").s("sawtooth").lpf(600).decay(.1).sustain(0)',
    it: ['Layer e mute', 'Ogni riga che inizia con "$:" è un layer indipendente. Scrivi "_$:" per silenziarlo senza cancellarlo: è il modo di fare entrare e uscire le parti dal vivo.', 'Togli il trattino basso dalla seconda riga e premi Ctrl+Enter.'],
    en: ['Layers and mutes', 'Every line starting with "$:" is an independent layer. Write "_$:" to mute it without deleting it: that is how parts come in and out live.', 'Remove the underscore from the second line and press Ctrl+Enter.'] },
  { code: 'setcpm(138/4)\nconst cut = slider(800, 200, 5000)\n$: s("bd*4, [~ hh]*4").bank("RolandTR909")\n$: note("<a1 f1 c2 g1>").struct("[~ x x x]*4").s("sawtooth").lpf(cut).lpq(8).decay(.12).sustain(0)',
    it: ['Slider live', 'slider(valore, min, max) disegna un cursore dentro il codice. Muovilo mentre suona: è così che si costruiscono build-up e drop come nel video di Switch Angel.', 'Trascina il cursore lentamente verso destra per 8 battute, poi riportalo giù di colpo.'],
    en: ['Live sliders', 'slider(value, min, max) draws a slider inside the code. Move it while it plays: that is how build-ups and drops are made in the Switch Angel video.', 'Drag the slider slowly to the right for 8 bars, then pull it down at once.'] },
  { code: 'setcpm(138/4)\n$: s("bd*4, [~ hh]*4, ~ cp ~ cp").bank("RolandTR909")\n$: note("<a1 f1 c2 g1>").struct("[~ x x x]*4").s("sawtooth").lpf(700).lpq(8).decay(.12).sustain(0)\n$: note("<[a3 c4 e4 a4]*4 [f3 a3 c4 f4]*4 [g3 c4 e4 g4]*4 [g3 b3 d4 g4]*4>").s("supersaw").lpf(2400).decay(.15).sustain(.15).delay(.35).gain(.4)\n$: note("<[a2,c3,e3] [f2,a2,c3] [g2,c3,e3] [g2,b2,d3]>").s("supersaw").attack(.4).release(1.2).lpf(1400).room(.85).gain(.28)',
    it: ['Ricetta trance', 'Una traccia trance in quattro ingredienti: cassa dritta a 138 BPM, basso in levare, arpeggio sugli accordi, pad largo. Il tab Componi genera esattamente questa struttura.', 'Torna su Componi e prova le scene Intro, Build, Drop e Break.'],
    en: ['Trance recipe', 'A trance track in four ingredients: straight kick at 138 BPM, offbeat bass, arpeggio over the chords, wide pad. The Compose tab generates exactly this structure.', 'Go back to Compose and try the Intro, Build, Drop and Break scenes.'] },
];

// gruppi di suoni: [nome bilingue, [[etichetta, codice], …]]
export const SOUND_GROUPS = [
  ['Drum machine · TR-909', ['bd', 'sd', 'cp', 'hh', 'oh', 'rim', 'lt', 'mt', 'ht', 'cr', 'rd'].map(x => [x, `$: s("${x}*2").bank("RolandTR909")`])],
  ['Drum machine · TR-808', ['bd', 'sd', 'cp', 'hh', 'oh', 'rim', 'cb', 'perc', 'sh', 'lt', 'ht'].map(x => [x, `$: s("${x}*2").bank("RolandTR808")`])],
  [{ it: 'Drum machine · altre', en: 'Drum machines · others' }, [['707 bd', '$: s("bd*2, [~ hh]*2").bank("RolandTR707")'], ['LinnDrum', '$: s("bd [~ bd] sd ~, hh*8").bank("LinnDrum")'], ['AkaiLinn', '$: s("bd [~ bd] sd ~, hh*8").bank("AkaiLinn")'], ['TR-606', '$: s("bd ~ sd ~, hh*8").bank("RolandTR606")'], ['Minipops', '$: s("bd hh sd hh").bank("KorgMinipops")']]],
  [{ it: 'Oscillatori', en: 'Oscillators' }, ['sawtooth', 'supersaw', 'square', 'triangle', 'sine'].map(w => [w, `$: note("a2 c3 e3 g3").s("${w}").decay(.25).sustain(.2).lpf(3000)`])],
  [{ it: 'Rumore', en: 'Noise' }, ['white', 'pink', 'brown'].map(w => [w, `$: s("${w}*8").decay(.06).sustain(0).gain(.5)`])],
  [{ it: 'Suoni ruvidi', en: 'Rough sounds' }, [
    ['distort', '$: note("e1*8").s("sawtooth").lpf(600).distort(3).decay(.1).sustain(0)'],
    ['crush', '$: s("hh*16").bank("RolandTR909").crush("<8 6 4 3>")'],
    ['coarse', '$: s("industrial*8").n(irand(16)).coarse(6)'],
    ['fm', '$: n("0 3 7 3").scale("E3:phrygian").s("square").fm("<1 3 6>")'],
    ['vowel', '$: note("e2*8").s("sawtooth").vowel("<a e i o>")'],
    ['acid', '$: note("e2 e2 [e3 e2] f2 e2 g2 [e2 e3] f2").s("sawtooth").lpf(sine.range(300, 3000).slow(2)).lpq(22).distort(1.2).decay(.12).sustain(.1)'],
  ]],
  [{ it: 'Campioni da dirt-samples (n sceglie la variante)', en: 'dirt-samples (n picks the variant)' }, ['arpy', 'casio', 'east', 'jvbass', 'pluck', 'sitar', 'jazz', 'metal', 'glitch', 'future', 'feel', 'industrial'].map(x => [x, `$: s("${x}*4").n("<0 1 2 3>")`])],
  [{ it: 'Atmosfere', en: 'Atmospheres' }, ['space', 'wind', 'birds', 'crow', 'numbers'].map(x => [x, `$: s("${x}").n("<0 1 2 3>").slow(2).room(.5)`])],
];

export const REFS = [
  ['Coding Trance Music', { it: 'Switch Angel costruisce una traccia trance dal vivo in Strudel. Il punto di partenza di questo progetto.', en: 'Switch Angel builds a trance track live in Strudel. The starting point of this project.' }, 'https://www.youtube.com/watch?v=GWXCCBsOMSg'],
  [{ it: 'Switch Angel su YouTube', en: 'Switch Angel on YouTube' }, { it: 'Altre sessioni di live coding melodico e trance.', en: 'More melodic and trance live coding sessions.' }, 'https://www.youtube.com/@Switch-Angel'],
  ['Strudel REPL', { it: 'L\'editor ufficiale nel browser, con esempi casuali a ogni apertura.', en: 'The official in-browser editor, with a random example each time it opens.' }, 'https://strudel.cc/'],
  [{ it: 'Workshop di Strudel', en: 'Strudel workshop' }, { it: 'Il corso introduttivo ufficiale, passo per passo.', en: 'The official step-by-step introduction.' }, 'https://strudel.cc/workshop/getting-started/'],
  ['Mini-notation', { it: 'Riferimento completo della sintassi tra virgolette.', en: 'Full reference for the syntax inside quotes.' }, 'https://strudel.cc/learn/mini-notation/'],
  [{ it: 'Synth ed effetti', en: 'Synths and effects' }, { it: 'Oscillatori, filtri, inviluppi, delay e riverbero.', en: 'Oscillators, filters, envelopes, delay and reverb.' }, 'https://strudel.cc/learn/effects/'],
  ['TidalCycles', { it: 'Il linguaggio originale in Haskell da cui nasce Strudel. Serve SuperCollider.', en: 'The original Haskell language Strudel comes from. Needs SuperCollider.' }, 'https://tidalcycles.org/'],
  ['Tidal Club', { it: 'Forum della comunità Tidal e Strudel: domande, pezzi, eventi.', en: 'Forum of the Tidal and Strudel community: questions, tracks, events.' }, 'https://club.tidalcycles.org/'],
  ['Algorave', { it: 'Eventi dove si balla musica scritta dal vivo con il codice.', en: 'Events where people dance to music written live in code.' }, 'https://algorave.com/'],
  ['Tidal drum machines', { it: 'L\'archivio di campioni dietro a .bank(): 909, 808 e molte altre.', en: 'The sample archive behind .bank(): 909, 808 and many more.' }, 'https://github.com/ritchse/tidal-drum-machines'],
  [{ it: 'Codice di Strudel', en: 'Strudel source code' }, { it: 'Il repository del progetto, per capire come funziona dentro.', en: 'The project repository, to see how it works inside.' }, 'https://codeberg.org/uzu/strudel'],
];

// Brani completi: ogni sezione è [nome, prima battuta, ultima battuta].
export const SONGS = [
  { id: 'ghost-protocol', title: 'Ghost Protocol', bpm: '135→150', bars: 36, seconds: 60, look: 'palco', code: ghostProtocol,
    style: { it: 'Hard techno cyberpunk · Mi frigio · il tempo sale, cambiano drum machine e tonalità', en: 'Cyberpunk hard techno · E phrygian · tempo climbs, drum machines and key change' },
    sections: [['Intro', 1, 4], ['Build', 5, 12], ['Drop', 13, 20], ['Break', 21, 24], ['Drop 2', 25, 32], ['Outro', 33, 36]] },
  { id: 'neon-ascent', title: 'Neon Ascent', bpm: '128', bars: 32, seconds: 60, look: 'tramonto', code: neonAscent,
    style: { it: 'Techno trance · La minore', en: 'Techno trance · A minor' },
    sections: [['Intro', 1, 4], ['Build', 5, 12], ['Drop', 13, 20], ['Break', 21, 24], ['Drop 2', 25, 32]] },
];
