// The Guide (#48): one card per feature of the app, in English and Italian. Keep it current: every user-facing
// change updates its card in the same change, and `npm run check:guide` fails when a tab or a console command has
// no card or line, or a text misses a language (tools/check-guide.mjs).
// Inline marks in texts: [Label] is a button of the app, {K} a key.
//   id: card id; tab: the tab it lives in (null for parts of the app outside the tabs); mode: 'ascolta' | 'lab';
//   show: CSS selector of the control "Show me" flashes; what, how, know: texts; parts: sub-sections (the Radio).

export const GUIDE = [
  {
    id: 'modes', tab: null, mode: null, show: '.modes',
    title: { en: 'Two modes', it: 'Due modalità' },
    what: { en: 'The app has two modes. Listen is for music: Compose, Songs, Playlists, Radio. Groove Lab is for building and learning: Artists, Styles, Genres, Sounds, Guide, Strudel lessons, References.', it: 'L\'app ha due modalità. Ascolta è per la musica: Componi, Brani, Playlist, Radio. Groove Lab è per costruire e imparare: Artisti, Stili, Generi, Suoni, Guida, Lezioni Strudel, Riferimenti.' },
    how: { en: 'Press [▶ Listen] or [⚗ Groove Lab] at the top, then a tab.', it: 'Premi [▶ Ascolta] o [⚗ Groove Lab] in alto, poi una scheda.' },
    know: { en: 'Each mode remembers its last tab. The live code on the right and the settings gear are there in both modes.', it: 'Ogni modalità ricorda la sua ultima scheda. Il codice dal vivo a destra e l\'ingranaggio delle impostazioni ci sono in tutte e due.' },
  },
  {
    id: 'player', tab: null, mode: null, show: '.pbar',
    title: { en: 'Player bar', it: 'Barra del player' },
    what: { en: 'The bar at the bottom plays whatever is on: a song, a playlist or the radio.', it: 'La barra in fondo suona quello che è acceso: un brano, una playlist o la radio.' },
    how: { en: 'Previous, play, stop, next; drag the timeline to move in the song. Shuffle, repeat (off, all, one) and Mix change how a playlist plays. Volume and mute on the right.', it: 'Precedente, play, stop, successivo; trascina la timeline per spostarti nel brano. Casuale, ripeti (spento, tutto, uno) e Mix cambiano come suona una playlist. Volume e muto a destra.' },
    know: { en: 'Mix joins saved songs with transitions, like the radio. The volume does not change exported files.', it: 'Mix unisce i brani salvati con le transizioni, come la radio. Il volume non cambia i file esportati.' },
  },
  {
    id: 'visuals', tab: null, mode: null, show: '#looks',
    title: { en: 'Visuals and the song soul', it: 'Visual e anima del brano' },
    what: { en: 'The stage at the top moves with the music. Soul shows the song playing as a retro science-fiction screen, drawn from its seed, settings, curves and instruments: every song looks different.', it: 'Il palco in alto si muove con la musica. Anima mostra il brano che suona come uno schermo di fantascienza retrò, disegnato dal suo seme, dalle impostazioni, dalle curve e dagli strumenti: ogni brano ha un aspetto diverso.' },
    how: { en: 'Pick a visual in the menu at the top right of the stage; [Fullscreen] fills the screen. Soul is locked in the menu: it needs a signal. When the soul shows, [◀] and [▶] change the view (ten of them) and [lock] keeps the view when the song changes.', it: 'Scegli un visual nel menu in alto a destra del palco; [Schermo intero] riempie lo schermo. Anima nel menu è bloccata: serve un segnale. Quando l\'anima si vede, [◀] e [▶] cambiano vista (sono dieci) e [lucchetto] tiene la vista al cambio di brano.' },
    know: { en: 'Each song starts in its own view. A new song is analyzed first; a change from the radio console makes the screen glitch while it recalibrates. Soul keeps the colours of the last visual; in the HW theme the screens turn amber. There is something hidden in the stage, too…', it: 'Ogni brano parte nella sua vista. Un brano nuovo viene prima analizzato; un cambio dalla console della radio fa disturbare lo schermo mentre si ricalibra. Anima tiene i colori dell\'ultimo visual; nel tema HW gli schermi diventano ambra. E nel palco c\'è anche qualcosa di nascosto…' },
  },
  {
    id: 'compose', tab: 'componi', mode: 'ascolta', show: '#arranger',
    title: { en: 'Compose', it: 'Componi' },
    what: { en: 'The workbench of a song: tracks, sections and their settings. Every change writes the Strudel code on the right.', it: 'Il banco di lavoro di un brano: tracce, sezioni e le loro impostazioni. Ogni modifica scrive il codice Strudel a destra.' },
    how: { en: '[Open song] or [New song]; [+ Add track] and [+ Add section]; pick a section to set tempo, key, chords, meter and entry. [▶ Play from this section], [Loop section]. [Save] or [Save as new].', it: '[Apri brano] o [Nuovo brano]; [+ Aggiungi traccia] e [+ Aggiungi sezione]; scegli una sezione per tempo, tonalità, accordi, metro ed entrata. [▶ Suona da questa sezione], [Ripeti la sezione]. [Salva] o [Salva come nuovo].' },
    know: { en: '[Live build] plays the song as it builds up, one change per phrase. [▶ Continue in radio] plays the song on from where it is, then the radio goes on after it. {Ctrl}+{Enter} plays from anywhere, {Ctrl}+{.} stops.', it: '[In divenire] suona il brano mentre si costruisce, un cambio per frase. [▶ Continua in radio] suona il brano da dove sei, poi la radio continua dopo di lui. {Ctrl}+{Enter} suona da qualsiasi punto, {Ctrl}+{.} ferma.' },
  },
  {
    id: 'hand', tab: 'componi', mode: 'ascolta', show: '#edhost',
    title: { en: 'Code by hand', it: 'Codice a mano' },
    what: { en: 'You can write in the live code while a song or the radio plays: your code takes over.', it: 'Puoi scrivere nel codice dal vivo mentre suona un brano o la radio: il tuo codice prende il controllo.' },
    how: { en: 'Type in the code and press {Ctrl}+{Enter}. [Resume live build] goes back to the song, with [from where I was] to restart at the bar where you began. [Save as new version] keeps your code as a version of the song.', it: 'Scrivi nel codice e premi {Ctrl}+{Enter}. [Riprendi il divenire] torna al brano, con [dal punto in cui ero] per ripartire dalla battuta in cui hai iniziato. [Salva come nuova versione] tiene il tuo codice come versione del brano.' },
    know: { en: 'Versions show on the original song\'s card. Touching a control of the composition writes the code again.', it: 'Le versioni compaiono sulla card del brano originale. Toccare un controllo della composizione riscrive il codice.' },
  },
  {
    id: 'songs', tab: 'brani', mode: 'ascolta', show: '#sv-q',
    title: { en: 'Songs', it: 'Brani' },
    what: { en: 'Every song: the app\'s, yours and those saved from the radio, with search, tags and favourites.', it: 'Tutti i brani: quelli dell\'app, i tuoi e quelli salvati dalla radio, con ricerca, tag e preferiti.' },
    how: { en: 'Type in the search (it understands both languages: "frigio" finds "phrygian"), tap a genre, style or kind chip, sort. ☆ adds to the favourites, [+ Playlist] adds to a playlist, [▶ Continue in radio] lets the radio go on after the song. The playlist menu on top plays one.', it: 'Scrivi nella ricerca (capisce tutte e due le lingue: "frigio" trova "phrygian"), tocca un chip di genere, stile o tipo, ordina. ☆ mette tra i preferiti, [+ Playlist] aggiunge a una playlist, [▶ Continua in radio] fa continuare la radio dopo il brano. Il menu delle playlist in alto ne suona una.' },
    know: { en: 'A tap on a tag of a card filters by it; the legend explains the tag colours. Your songs can have their own tags.', it: 'Un tocco su un tag di una card filtra per quel tag; la legenda spiega i colori. I tuoi brani possono avere tag tuoi.' },
  },
  {
    id: 'playlists', tab: 'playlist', mode: 'ascolta', show: '#tab-playlist',
    title: { en: 'Playlists', it: 'Playlist' },
    what: { en: 'Lists of songs to play in a row. Favourites is the first list and fills up with the star.', it: 'Liste di brani da suonare di fila. Preferiti è la prima lista e si riempie con la stella.' },
    how: { en: '[New playlist] here, or [+ Playlist] on any song. Reorder by dragging or with the arrows, rename, delete. Play it: it moves to the next song by itself.', it: '[Nuova playlist] qui, o [+ Playlist] su un brano. Riordina trascinando o con le frecce, rinomina, elimina. Suonala: passa da sola al brano dopo.' },
    know: { en: 'A playlist can hold radio sessions (📻): they play as you heard them, then the list moves on. After a director update a session may sound different; ❄ Freeze keeps its songs as they are. Export and import a playlist as JSON, your songs and sessions included. Shuffle, repeat and Mix are in the player bar.', it: 'Una playlist può contenere sessioni della radio (📻): suonano come le hai sentite, poi la lista va avanti. Dopo un aggiornamento del regista una sessione può suonare diversa; ❄ Congela tiene i suoi brani così come sono. Esporta e importa una playlist in JSON, con i tuoi brani e le sessioni. Casuale, ripeti e Mix sono nella barra del player.' },
  },
  {
    id: 'radio', tab: 'radio', mode: 'ascolta', show: '#radio-start',
    title: { en: 'Radio', it: 'Radio' },
    what: { en: 'A live stream that never ends: a director writes new songs in the styles you pick and plays them one after another, building each one while it plays.', it: 'Una diretta senza fine: un regista scrive brani nuovi negli stili che scegli e li passa uno dopo l\'altro, costruendo ognuno mentre suona.' },
    how: { en: 'Pick an artist or the styles, set the knobs, press [On air]. [Pause], [Skip], [Save] the song on air, [Open in Compose].', it: 'Scegli un artista o gli stili, regola le manopole, premi [In onda]. [Pausa], [Salta], [Salva] il brano in onda, [Apri in Componi].' },
    parts: [
      {
        id: 'panel', title: { en: 'Panel', it: 'Pannello' },
        what: { en: 'Artist, styles, chaos, energy, complexity and voice are the character of the radio.', it: 'Artista, stili, caos, energia, complessità e voce sono il carattere della radio.' },
        know: { en: 'They apply from the next song prepared: the next song is written when the one on air reaches 40 %. Touching a knob while an artist is chosen switches to Custom. The dice draw a random artist (keep it with Keep), random styles or a genre, one knob or all of them (in range or anywhere), and new sounds: other instruments and kits in the same styles.', it: 'Valgono dal prossimo brano preparato: il brano dopo viene scritto quando quello in onda è al 40 %. Toccare una manopola con un artista scelto passa a Personalizzato. I dadi pescano un artista casuale (lo tieni con Tieni), stili o un genere a caso, una manopola o tutte (in range o ovunque) e suoni nuovi: altri strumenti e kit negli stessi stili.' },
      },
      {
        id: 'console', title: { en: 'Console', it: 'Console' },
        what: { en: 'Changes the song on air at the next phrase: energy up or down; add or remove drums, bass, lead, pad, texture (a new instrument from the song\'s style when the song has none); more or less complex; darker, brighter, dirtier, cleaner, more space, change instrument; change chords or key; talk more or less; go to the drop, stay here, extend, end the song.', it: 'Cambia il brano in onda alla frase dopo: energia su o giù; aggiungi o togli batteria, basso, melodia, pad, texture (uno strumento nuovo dallo stile del brano se il brano non ce l\'ha); più o meno complesso; più scuro, più chiaro, più sporco, più pulito, più spazio, cambia strumento; cambia accordi o tonalità; parla di più o di meno; vai al drop, resta qui, estendi, chiudi il brano.' },
        how: { en: '{↑} {↓} energy, {1} to {5} instruments, {+} {-} complexity, {[} {]} darker and brighter, {X} dirtier, {C} cleaner, {S} space, {I} instrument, {H} chords, {K} key, {V} and {Shift}+{V} voice, {G} drop, {R} stay, {L} extend, {E} end. Waiting commands are in [Coming up], ✕ cancels one.', it: '{↑} {↓} energia, da {1} a {5} strumenti, {+} {-} complessità, {[} {]} più scuro e più chiaro, {X} più sporco, {C} più pulito, {S} spazio, {I} strumento, {H} accordi, {K} tonalità, {V} e {Shift}+{V} voce, {G} drop, {R} resta qui, {L} estendi, {E} chiudi. I comandi in attesa sono in [In arrivo], ✕ ne annulla uno.' },
        know: { en: 'A disabled button says why in its tooltip. With the switch on [The whole session], energy, complexity and voice also move the knobs for the next songs.', it: 'Un pulsante spento dice perché nel suo tooltip. Con l\'interruttore su [Vale per tutta la diretta], energia, complessità e voce spostano anche le manopole per i brani dopo.' },
        commands: ['energy-up', 'energy-down', 'add', 'remove', 'more-complex', 'less-complex', 'darker', 'brighter', 'dirtier', 'cleaner', 'more-space', 'instrument', 'progression', 'key', 'talk-more', 'talk-less', 'drop', 'stay', 'extend', 'end'],
      },
      {
        id: 'curves', title: { en: 'Curves', it: 'Curve' },
        what: { en: 'Energy is the main curve: the director writes the song to follow it. Under [Details], density, brightness, tension and voice are detail curves of the song on air.', it: 'L\'energia è la curva principale: il regista scrive il brano per seguirla. Sotto [Dettagli], densità, luminosità, tensione e voce sono curve di dettaglio del brano in onda.' },
        how: { en: 'Drag a square of a part still to come; ↺ makes a detail curve automatic again. Hover a curve to see every value of that part.', it: 'Trascina un quadratino di una parte che deve ancora venire; ↺ rimette automatica una curva di dettaglio. Passa col mouse su una curva per vedere tutti i valori di quella parte.' },
        know: { en: 'Tension of 70 or more on the part before a drop builds a charge that the drop releases. Energy wins when two targets clash.', it: 'Una tensione di 70 o più sulla parte prima di un drop costruisce una carica che il drop scarica. Quando due obiettivi si scontrano vince l\'energia.' },
        commands: ['curve', 'curve-reset'],
      },
      {
        id: 'mixer', title: { en: 'Mixer', it: 'Mixer' },
        what: { en: 'One row per track playing: volume, mute, lock (the director stops changing that track) and ♪ to change its instrument.', it: 'Una riga per ogni traccia che suona: volume, muto, lucchetto (il regista smette di cambiare quella traccia) e ♪ per cambiarne lo strumento.' },
        know: { en: 'Volume and mute apply on the next bar and stay for the rest of the song.', it: 'Volume e muto valgono dalla battuta dopo e restano per il resto del brano.' },
        commands: ['volume', 'mute', 'unmute', 'lock', 'unlock'],
      },
      {
        id: 'transitions', title: { en: 'Transitions and harmony', it: 'Transizioni e armonia' },
        what: { en: 'How one song becomes the next: mix, morph, echo, break, interlude or cut. Harmony "compatible" keeps the next song a fifth away and within 12 BPM; "free" lets it go anywhere.', it: 'Come un brano diventa il successivo: mix, morph, eco, break, interludio o taglio. Armonia "compatibile" tiene il brano dopo a una quinta e entro 12 BPM; "libera" lo lascia andare dove vuole.' },
        how: { en: 'The [Transitions] and [Harmony] menus: "the artist\'s" follows the artist\'s taste.', it: 'I menu [Transizioni] e [Armonia]: "dell\'artista" segue i gusti dell\'artista.' },
      },
      {
        id: 'recording', title: { en: 'Recording', it: 'Registrazione' },
        what: { en: 'Records the radio to an audio file, with a track list and the session recipe.', it: 'Registra la radio in un file audio, con la scaletta e la ricetta della sessione.' },
        how: { en: '[Record] starts, press again to stop and download. [Record from the start] plays the session again from its first song and records it.', it: '[Registra] parte, premi di nuovo per fermare e scaricare. [Registra dall\'inizio] rifà la sessione dal primo brano e la registra.' },
        know: { en: 'Pausing leaves no gap in the file. The format (WAV or Opus) is in the settings.', it: 'La pausa non lascia buchi nel file. Il formato (WAV o Opus) è nelle impostazioni.' },
      },
      {
        id: 'extend', title: { en: 'Extend', it: 'Estendi' },
        what: { en: 'Makes the song on air longer, a block at a time (the button says how long), before its ending: a new stretch in the song\'s character, then the outro and the transition as planned.', it: 'Allunga il brano in onda, un blocco alla volta (il pulsante dice quanto), prima del finale: un tratto nuovo nel carattere del brano, poi outro e transizione come previsto.' },
        know: { en: 'No limit. It switches off once the transition to the next song plays. The card shows the total added.', it: 'Nessun limite. Si spegne quando la transizione al brano dopo sta già suonando. La card mostra il totale aggiunto.' },
      },
      {
        id: 'continue', title: { en: 'Continue a song in the radio', it: 'Continua un brano in radio' },
        what: { en: 'A song from Compose or the Songs tab becomes the first song of a new session: it plays to its end, then a transition leads into the radio, in the styles closest to it and in a compatible key and tempo.', it: 'Un brano da Componi o dai Brani diventa il primo brano di una diretta nuova: suona fino alla fine, poi una transizione porta nella radio, negli stili più vicini e in tonalità e tempo compatibili.' },
        how: { en: '[▶ Continue in radio] in Compose (from the bar you are at) or on a song card (from the start).', it: '[▶ Continua in radio] in Componi (dalla battuta in cui sei) o sulla card di un brano (dall\'inizio).' },
        know: { en: 'Your song is not the director\'s: console, curves and Extend apply from the next song. Replay plays your song again too.', it: 'Il tuo brano non è del regista: console, curve ed Estendi valgono dal brano dopo. Riascolta rifà anche il tuo brano.' },
      },
      {
        id: 'seed', title: { en: 'Seed and replay', it: 'Seme e Riascolta' },
        what: { en: 'Same seed and same settings give the same songs. The seed of the session is shown in its field.', it: 'Stesso seme e stesse impostazioni danno gli stessi brani. Il seme della sessione è nel suo campo.' },
        how: { en: '[Replay] plays the session again from its seed, with the same console moves, curve edits and extensions. [+ Playlist] next to the controls, or on a session of the History, keeps the session in a playlist.', it: '[Riascolta] rifà la sessione dal suo seme, con le stesse mosse della console, modifiche alle curve ed estensioni. [+ Playlist] accanto ai comandi, o su una sessione della Cronologia, tiene la sessione in una playlist.' },
      },
    ],
    // what changes the song on air, what changes the next songs
    scope: [
      { what: { en: 'Panel, transitions, harmony', it: 'Pannello, transizioni, armonia' }, now: { en: 'no', it: 'no' }, next: { en: 'yes, from the next song prepared', it: 'sì, dal prossimo brano preparato' } },
      { what: { en: 'Console', it: 'Console' }, now: { en: 'yes, at the next phrase', it: 'sì, alla frase dopo' }, next: { en: 'energy, complexity and voice with "the whole session"', it: 'energia, complessità e voce con "tutta la diretta"' } },
      { what: { en: 'Curves, mixer, extend', it: 'Curve, mixer, estendi' }, now: { en: 'yes', it: 'sì' }, next: { en: 'no (they start later after an extension)', it: 'no (dopo un\'estensione partono più tardi)' } },
      { what: { en: 'Pause, skip, record', it: 'Pausa, salta, registra' }, now: { en: 'right away', it: 'subito' }, next: { en: 'no', it: 'no' } },
    ],
  },
  {
    id: 'artists', tab: 'artisti', mode: 'lab', show: '#tab-artisti',
    title: { en: 'Artists', it: 'Artisti' },
    what: { en: 'The artists who make the radio\'s music: each one has favourite styles, values, quirks and transitions, so every song differs even from the same artist.', it: 'Gli artisti che fanno la musica della radio: ognuno ha stili preferiti, valori, manie e transizioni, così ogni brano è diverso anche dallo stesso artista.' },
    how: { en: 'Open an artist to see the sheet. [New artist] makes your own. [♪ New song] on a sheet opens Compose with a new song by that artist. [Random artist] makes one with a name, a face and tastes: keep it, try again or discard it.', it: 'Apri un artista per vedere la scheda. [Nuovo artista] ne crea uno tuo. [♪ Nuovo brano] sulla scheda apre Componi con un brano nuovo di quell\'artista. [Artista casuale] ne crea uno con nome, faccia e gusti: tienilo, riprova o scartalo.' },
    know: { en: 'Your artists stay in this browser: export them to keep them.', it: 'I tuoi artisti restano in questo browser: esportali per tenerli.' },
  },
  {
    id: 'styles', tab: 'stili', mode: 'lab', show: '#tab-stili',
    title: { en: 'Styles', it: 'Stili' },
    what: { en: 'The recipes the radio and the artists write songs from: tempo, instruments, patterns, chords, voice, and the genre the style belongs to.', it: 'Le ricette da cui la radio e gli artisti scrivono i brani: tempo, strumenti, pattern, accordi, voce, e il genere a cui lo stile appartiene.' },
    how: { en: 'Open a style to see how it is made. [Duplicate] a built-in one to change it, or [New style]. [A random style in the radio] plays one you did not pick.', it: 'Apri uno stile per vedere come è fatto. [Duplica] uno incluso per cambiarlo, o [Nuovo stile]. [Uno stile a caso in radio] ne fa suonare uno che non hai scelto.' },
    know: { en: 'Your styles stay in this browser: export them to keep them.', it: 'I tuoi stili restano in questo browser: esportali per tenerli.' },
  },
  {
    id: 'genres', tab: 'generi', mode: 'lab', show: '#tab-generi .genre-card',
    title: { en: 'Genres', it: 'Generi' },
    what: { en: 'One card per genre: its styles, how many songs it has, the artists who love it.', it: 'Una card per genere: i suoi stili, quanti brani ha, gli artisti che lo amano.' },
    how: { en: 'Tap a style to open it. [▶ Listen in the radio] starts the radio in that genre; [See the songs] opens Songs filtered on it. [A random genre in the radio] picks one for you.', it: 'Tocca uno stile per aprirlo. [▶ Ascolta in radio] fa partire la radio in quel genere; [Vedi i brani] apre Brani filtrata su quel genere. [Un genere a caso in radio] ne sceglie uno per te.' },
  },
  {
    id: 'sounds', tab: 'suoni', mode: 'lab', show: '#sounds',
    title: { en: 'Sounds', it: 'Suoni' },
    what: { en: 'Every sound Strudel has loaded: drum machines, instruments, samples, synths and your own samples.', it: 'Tutti i suoni caricati da Strudel: drum machine, strumenti, campioni, synth e i tuoi campioni.' },
    how: { en: 'Click to hear one; [Use] puts it in the selected track of Compose. In the Pads view, keys play the pads.', it: 'Clic per ascoltarne uno; [Usa] lo mette nella traccia selezionata di Componi. Nella vista Pad i tasti suonano i pad.' },
  },
  {
    id: 'lessons', tab: 'lezioni', mode: 'lab', show: '#lessons',
    title: { en: 'Strudel lessons', it: 'Lezioni Strudel' },
    what: { en: 'Short steps to learn Strudel, the language the app writes, from the first kick to a full song.', it: 'Passi brevi per imparare Strudel, il linguaggio che l\'app scrive, dal primo colpo di cassa a un brano intero.' },
    how: { en: '[▶ Load and play] puts the example in the editor and starts it; change the code and press {Ctrl}+{Enter}.', it: '[▶ Carica e ascolta] mette l\'esempio nell\'editor e lo fa partire; cambia il codice e premi {Ctrl}+{Enter}.' },
  },
  {
    id: 'references', tab: 'riferimenti', mode: 'lab', show: '#refs',
    title: { en: 'References', it: 'Riferimenti' },
    what: { en: 'Where all this comes from and where to go next: Strudel, its docs, the sounds and the people behind them.', it: 'Da dove viene tutto questo e dove andare dopo: Strudel, la sua documentazione, i suoni e le persone dietro.' },
    how: { en: 'Open a link: it opens in a new tab.', it: 'Apri un link: si apre in una nuova scheda.' },
  },
  {
    id: 'settings', tab: 'impostazioni', mode: null, show: '#open-settings',
    title: { en: 'Settings', it: 'Impostazioni' },
    what: { en: 'Options used less often: theme, language, the radio\'s visual and defaults, the export format, backup.', it: 'Le opzioni usate meno spesso: tema, lingua, visual e valori della radio, formato di export, backup.' },
    how: { en: 'The ⚙ gear at the top opens and closes them. [Export everything] saves your songs, playlists, artists, styles and settings to a file; [Import] brings them into another browser.', it: 'L\'ingranaggio ⚙ in alto le apre e le chiude. [Esporta tutto] salva in un file brani, playlist, artisti, stili e impostazioni; [Importa] li porta in un altro browser.' },
    know: { en: '[Reset everything] needs two presses.', it: '[Azzera tutto] vuole due pressioni.' },
  },
];

// parts of the page that need no card, with the reason (the check accepts them)
export const GUIDE_EXEMPT = { guida: 'the Guide itself' };

const escHtml = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// a guide text with its marks: [Label] a button, {K} a key
export const guideText = s => escHtml(s).replace(/\[([^\]{}]+)\]/g, '<span class="g-b">$1</span>').replace(/\{([^}]+)\}/g, '<kbd>$1</kbd>');
