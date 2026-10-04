// Testi dell'interfaccia in italiano e inglese.
// t('chiave', { var }) restituisce la stringa nella lingua corrente.
// tx({ it, en }) sceglie la variante giusta di un valore bilingue.

const STR = {
  it: {
    tag: 'synth lab per Strudel', lang: 'Lingua',
    key: 'Tonalità', chords: 'Accordi', bpmDown: 'BPM meno', bpmUp: 'BPM più',
    stage: 'Visual a ritmo', looks: 'Tema visual', scenes: 'Scene', scene: 'Scena',
    fullscreen: 'Schermo intero', fsNo: 'Schermo intero non disponibile qui',
    tabComponi: 'Componi', tabBrani: 'Brani', tabGuida: 'Guida', tabSuoni: 'Suoni', tabRiferimenti: 'Riferimenti',
    drums: 'Batteria', drumsHint: 'Tocca i passi. Il nome della riga la silenzia.', drumMachine: 'Drum machine',
    volume: 'Volume', groove: 'Groove', pickGroove: 'Scegli un groove…',
    muteRow: 'Silenzia o riattiva {name}', stepAria: '{name} passo {n}', onoff: '{name} on/off',
    bass: 'Basso', bassHint: 'la spinta sotto la cassa',
    arp: 'Arpeggio', arpHint: 'gli accordi suonati una nota alla volta',
    hook: 'Hook', hookHint: 'la melodia che resta in testa',
    pad: 'Pad', padHint: 'il tappeto armonico',
    riser: 'Riser', riserHint: 'tensione prima del drop',
    rhythm: 'Ritmo', sound: 'Suono', filter: 'Filtro', filterMove: 'Movimento filtro', figure: 'Figura',
    speed: 'Velocità', delay: 'Delay', melody: 'Melodia', reverb: 'Riverbero', length: 'Durata',
    sixteenths: 'Sedicesimi', eighths: 'Ottavi', nBars: '{n} battute',
    introSongs: 'Brani completi scritti a mano in Strudel. Ognuno riparte dalla prima battuta e si ferma da solo alla fine. Guarda il codice a destra: le sezioni, i cambi di tempo e di tonalità sono tutti lì.',
    introGuide: 'Quattordici passi brevi, dal primo colpo di cassa a una traccia trance. Ogni esempio si carica nell\'editor e parte subito. Modifica il codice e premi <kbd>Ctrl</kbd>+<kbd>Enter</kbd> per sentire il cambiamento.',
    introSounds: 'Tocca un suono per ascoltarlo in loop. Il codice che lo produce compare nell\'editor, pronto da copiare nella tua traccia.',
    introRefs: 'Da dove viene tutto questo e dove andare dopo.',
    code: 'Codice Strudel', liveCode: 'Codice live', fromComp: 'generato dalla composizione', back: 'Torna alla composizione',
    share: 'Apri su strudel.cc ↗', copy: 'Copia codice', reset: 'Ripristina composizione',
    note: '<kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>Enter</kbd> suona o aggiorna, da qualsiasi punto della pagina. <kbd>Ctrl</kbd>+<kbd>.</kbd> ferma. Puoi scrivere nel codice, ma toccando un controllo della composizione il codice viene rigenerato.',
    copied: 'Codice copiato', copyNo: 'Copia non disponibile qui: usa "Apri su strudel.cc"', resetDone: 'Composizione ripristinata',
    srcGuide: 'Guida: {name}', srcSound: 'Suono: {name}', srcSong: 'Brano: {name}',
    tryIt: 'Prova:', loadPlay: '▶ Carica e ascolta',
    songMeta: '{bpm} BPM · {bars} battute · {sec} secondi', songPlay: '▶ Ascolta dall\'inizio', barsRange: 'Battute {a}-{b}',
    rdBar: 'battuta', rdPaused: 'in pausa', rdHint: 'premi Play o Ctrl+Enter',
    cDrums: 'Batteria', cBass: 'Basso', cArp: 'Arpeggio', c16: 'sedicesimi', c8: 'ottavi', cPad: 'Pad',
    cRiser: 'Riser · rumore bianco che sale in {n} battute', cVis: 'collega i visual all\'audio',
    cTag: 'ogni .analyze("…") accende il suo strumento nel visual Palco',
  },
  en: {
    tag: 'synth lab for Strudel', lang: 'Language',
    key: 'Key', chords: 'Chords', bpmDown: 'BPM down', bpmUp: 'BPM up',
    stage: 'Beat-synced visuals', looks: 'Visual theme', scenes: 'Scenes', scene: 'Scene',
    fullscreen: 'Fullscreen', fsNo: 'Fullscreen is not available here',
    tabComponi: 'Compose', tabBrani: 'Tracks', tabGuida: 'Guide', tabSuoni: 'Sounds', tabRiferimenti: 'References',
    drums: 'Drums', drumsHint: 'Tap the steps. Tap a row name to mute it.', drumMachine: 'Drum machine',
    volume: 'Volume', groove: 'Groove', pickGroove: 'Pick a groove…',
    muteRow: 'Mute or unmute {name}', stepAria: '{name} step {n}', onoff: '{name} on/off',
    bass: 'Bass', bassHint: 'the push under the kick',
    arp: 'Arpeggio', arpHint: 'chords played one note at a time',
    hook: 'Hook', hookHint: 'the melody that sticks',
    pad: 'Pad', padHint: 'the harmonic bed',
    riser: 'Riser', riserHint: 'tension before the drop',
    rhythm: 'Rhythm', sound: 'Sound', filter: 'Filter', filterMove: 'Filter motion', figure: 'Pattern',
    speed: 'Speed', delay: 'Delay', melody: 'Melody', reverb: 'Reverb', length: 'Length',
    sixteenths: '16th notes', eighths: '8th notes', nBars: '{n} bars',
    introSongs: 'Complete tracks written by hand in Strudel. Each one restarts from bar 1 and stops on its own at the end. Read the code on the right: sections, tempo changes and key changes are all there.',
    introGuide: 'Fourteen short steps, from the first kick to a trance track. Each example loads into the editor and starts right away. Edit the code and press <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to hear the change.',
    introSounds: 'Tap a sound to hear it in a loop. The code that makes it appears in the editor, ready to copy into your track.',
    introRefs: 'Where all this comes from and where to go next.',
    code: 'Strudel code', liveCode: 'Live code', fromComp: 'generated from the composition', back: 'Back to the composition',
    share: 'Open in strudel.cc ↗', copy: 'Copy code', reset: 'Reset composition',
    note: '<kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>Enter</kbd> plays or updates from anywhere on the page. <kbd>Ctrl</kbd>+<kbd>.</kbd> stops. You can edit the code, but touching a composition control regenerates it.',
    copied: 'Code copied', copyNo: 'Copy is not available here: use "Open in strudel.cc"', resetDone: 'Composition reset',
    srcGuide: 'Guide: {name}', srcSound: 'Sound: {name}', srcSong: 'Track: {name}',
    tryIt: 'Try:', loadPlay: '▶ Load and play',
    songMeta: '{bpm} BPM · {bars} bars · {sec} seconds', songPlay: '▶ Play from the start', barsRange: 'Bars {a}-{b}',
    rdBar: 'bar', rdPaused: 'paused', rdHint: 'press Play or Ctrl+Enter',
    cDrums: 'Drums', cBass: 'Bass', cArp: 'Arpeggio', c16: '16ths', c8: '8ths', cPad: 'Pad',
    cRiser: 'Riser · white noise rising over {n} bars', cVis: 'connect the visuals to the audio',
    cTag: 'each .analyze("…") lights up its instrument in the Stage visual',
  },
};

const browserLang = (navigator.language || 'it').toLowerCase().startsWith('it') ? 'it' : 'en';
let lang = browserLang;
try { lang = localStorage.getItem('coding-misk-lang') || browserLang; } catch (e) {}
if (!STR[lang]) lang = 'it';

export const getLang = () => lang;
export function setLang(l) {
  lang = STR[l] ? l : 'it';
  document.documentElement.lang = lang;
  try { localStorage.setItem('coding-misk-lang', lang); } catch (e) {}
}
export const t = (key, vars = {}) =>
  (STR[lang][key] ?? STR.it[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
export const tx = v => (v && typeof v === 'object' && !Array.isArray(v) ? (v[lang] ?? v.it) : v);
