---
id: glossary
related: [profiles, radio-commands, growth-shapes, settings, songs]
code: [src/i18n.js]
checks: [npm run check:guide, npm run check:knowledge]
---

# Glossary

The owner speaks Italian; the code, the docs and this knowledge base are in English. Use these words in both languages, the same way the app does.

## Words we use

- **Song** (it: brano): the whole piece. Not "composition", which sits too close to the Compose tab.
- **Track** (it: traccia): one row of the arranger, an instrument with its settings, rack, patterns and clips.
- **Section** (it: sezione): a part of the song, like an intro or a drop. The word "scene" is no longer used in the interface; old code and saves still say scene.
- **Pattern** and **clip**: what a track plays, and where it plays it.
- **Idea** (it: idea): a pattern written as a small musical idea instead of every step.
- **Live build** (it: in divenire): a song that builds itself while it plays. A **step** (it: passo) is one timed change.
- **Narrator** (it: narratore) speaks the step comments. The **voice instrument** (it: voce strumento) speaks lines in the music.
- **Director** (it: regista): the code that writes radio songs. **Recipe** or **style** (it: stile): a JSON file the director reads.
- **Live coder** is the profile shown to people; its id stays `switch`.
- **Groove Lab** and **Listen** (it: Ascolta) are the two modes of the app.

## Interface terms

Generated from the app's own texts in `src/i18n.js`: the tabs, the profiles, the live build options, growth shapes, radio knobs and transitions, console commands, voice ways and a few other labels.

<!-- generated:glossary -->
| Area | English | Italian | Key |
| --- | --- | --- | --- |
| Tabs | Artists | Artisti | `tabArtisti` |
| Tabs | Styles | Stili | `tabStili` |
| Tabs | Genres | Generi | `tabGeneri` |
| Tabs | Playlists | Playlist | `tabPlaylist` |
| Tabs | Compose | Componi | `tabComponi` |
| Tabs | Songs | Brani | `tabBrani` |
| Tabs | Guide | Guida | `tabGuida` |
| Tabs | Strudel lessons | Lezioni Strudel | `tabLezioni` |
| Tabs | Sounds | Suoni | `tabSuoni` |
| Tabs | References | Riferimenti | `tabRiferimenti` |
| Tabs | Radio | Radio | `tabRadio` |
| Tabs | Patterns | Pattern | `tabPattern` |
| Profiles | Classic | Classico | `profile:classic` |
| Profiles | Crescendo | Crescendo | `profile:crescendo` |
| Profiles | Live coder | Live coder | `profile:switch` |
| Live build options | Build style | Andamento | `liveStyle` |
| Live build options | Growth | Crescita | `growthLbl` |
| Live build options | Growth duration | Durata della crescita | `durLbl` |
| Live build options | Narrator voice | Voce narrante | `liveNarrator` |
| Live build options | Narrated growth | Crescita raccontata | `liveNarrated` |
| Live build options | Narrator style | Stile del narratore | `narratorStyleLbl` |
| Live build options | Code typing | Scrittura del codice | `setTyping` |
| Live build options | Code view | Vista del codice | `liveCodeView` |
| Live build options | Generator | Generatore | `liveGen` |
| Live build options | Title | Titolo | `liveTitle` |
| Live build options | Lit notes | Note accese | `liveHl` |
| Live build options | Line breaks | A capo | `liveWrap` |
| Live build options | Human typing | Scrittura umana | `liveHuman` |
| Live build options | Typing mistakes | Errori di battitura | `liveMistakes` |
| Live build options | Tracks | Tracce | `cOpt:tracks` |
| Live build options | Notes | Note | `cOpt:notes` |
| Live build options | Phrases | Frasi | `cOpt:steps` |
| Live build options | Voice code | Codice della voce | `cOpt:voice` |
| Live build options | Bus | Bus | `fOpt:fnBus` |
| Live build options | Mixer | Mixer | `fOpt:fnLevel` |
| Live build options | Distortion | Distorsione | `fOpt:fnCrunch` |
| Live build options | Voice | Voce | `fOpt:fnVoice` |
| Live build options | Song | Del brano | `fOpt:fnSong` |
| Live build options | Library | Libreria | `fOpt:fnLib` |
| Live build options | Sections | Sezioni | `fOpt:fnLanes` |
| Live build options | Opening | Apertura | `openingLbl` |
| Live build options | Pace | Velocità | `paceLbl` |
| Live build options | Development | Sviluppo | `developmentLbl` |
| Growth shape values | Slow | Lenta | `opening:slow` |
| Growth shape values | full kick | cassa intera | `opening:full-kick` |
| Growth shape values | from silence | dal silenzio | `opening:typed` |
| Growth shape values | broken beat | ritmo spezzato | `opening:broken` |
| Growth shape values | filtered kick | cassa filtrata | `opening:filtered` |
| Growth shape values | arpeggio or melody | arpeggio o melodia | `opening:melodic` |
| Growth shape values | pad or drone | pad o bordone | `opening:pad` |
| Growth shape values | voice | voce | `opening:voice` |
| Growth shape values | muted base | base muta | `opening:muted-base` |
| Growth shape values | mid-set | a metà set | `opening:mid-set` |
| Growth shape values | slow | lenta | `pace:slow` |
| Growth shape values | medium | media | `pace:medium` |
| Growth shape values | fast | veloce | `pace:fast` |
| Growth shape values | by type | per tipo | `development:by-type` |
| Growth shape values | as written | come scritto | `development:as-written` |
| Growth shape values | masks | maschere | `development:masks` |
| Growth shape values | parameters only | solo parametri | `development:parameters` |
| Growth shape values | second section | seconda sezione | `development:second-section` |
| Growth shape values | metamorphosis | metamorfosi | `development:metamorphosis` |
| Radio | Chaos | Caos | `radioChaos` |
| Radio | Energy | Energia | `radioEnergy` |
| Radio | Complexity | Complessità | `radioComplexity` |
| Radio | Narrator | Narratore | `radioTalk` |
| Radio | Transitions | Transizioni | `radioTransition` |
| Radio | Harmony | Armonia | `radioHarmony` |
| Radio | Material | Materiale | `matSource` |
| Radio | Profile | Profilo | `radioProfile` |
| Radio | Mix | Mix | `tx:mix` |
| Radio | Morph | Morph | `tx:morph` |
| Radio | Break and riser | Break con riser | `tx:break` |
| Radio | Echo out | Eco in uscita | `tx:echo` |
| Radio | Interlude | Interludio | `tx:interlude` |
| Radio | Cut | Stacco netto | `tx:cut` |
| Radio | Varied | Variati | `matShort:varied` |
| Radio | Composed | Composti | `matShort:composed` |
| Radio | Mix | Misto | `matShort:mix` |
| Console commands | ▲ More energy | ▲ Più energia | `steer:energy-up` |
| Console commands | ▼ Less energy | ▼ Meno energia | `steer:energy-down` |
| Console commands | More complex | Più complesso | `steer:more-complex` |
| Console commands | Simpler | Più semplice | `steer:less-complex` |
| Console commands | Darker | Più scuro | `steer:darker` |
| Console commands | Brighter | Più brillante | `steer:brighter` |
| Console commands | Dirtier | Più sporco | `steer:dirtier` |
| Console commands | Cleaner | Più pulito | `steer:cleaner` |
| Console commands | More space | Più spazio | `steer:more-space` |
| Console commands | Change instrument | Cambia strumento | `steer:instrument` |
| Console commands | Change chords | Cambia accordi | `steer:progression` |
| Console commands | Change key | Cambia tonalità | `steer:key` |
| Console commands | Talk more | Parla di più | `steer:talk-more` |
| Console commands | Talk less | Parla di meno | `steer:talk-less` |
| Console commands | Voice instrument | Voce strumento | `steer:voice` |
| Console commands | Go to the drop | Vai al drop | `steer:drop` |
| Console commands | Stay here | Resta qui | `steer:stay` |
| Console commands | End the song | Chiudi il brano | `steer:end` |
| Console commands | Curve | Curva | `steer:curve` |
| Voice | spoken passage | passaggio parlato | `way:passage` |
| Voice | refrain | ritornello | `way:refrain` |
| Voice | chop | taglio | `way:chop` |
| Voice | opening | apertura | `way:opening` |
| Other | Artist | Artista | `radioArtist` |
| Other | Custom | Personalizzato | `radioCustom` |
| Other | Favourite styles | Stili preferiti | `artStyles` |
| Other | Quirks | Manie | `artQuirks` |
| Other | Keys | Tonalità | `libKeys` |
| Other | Progressions | Progressioni | `libProgressions` |
| Other | Meters | Metri | `libMeters` |
| Other | Energy shapes | Curve di energia | `libShapes` |
| Other | Title words | Parole dei titoli | `libWords` |
| Other | Favourites | Preferiti | `favourites` |
| Other | Resume live build | Riprendi il divenire | `handResume` |
| Other | BY HAND | A MANO | `handTag` |
| Other | Save as pattern | Salva come pattern | `ptSaveAs` |
| Other | Player | Player | `player` |
| Other | Compilation | Compilation | `compBtn` |
<!-- /generated -->

To find any other text, search its English or Italian words in `src/i18n.js`: both languages share the key.
