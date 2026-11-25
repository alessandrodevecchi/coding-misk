# Spec Delta

## Purpose

Rack devices that move a melodic track's sound over time, inside held notes and across bars: Sweep, LFO and Pump.

## ADDED Requirements

### Requirement: Movement devices in the rack
The rack SHALL offer three ordinary devices, Sweep (Italian "Apertura"), LFO ("Oscillazione") and Pump ("Pompa"), in a new group "Movement" (Italian "Movimento") of the existing rack menu ("+ Add device"), with the arguments and defaults of design D4, D5 and D6. No separate panel SHALL be added for them.

#### Scenario: Adding a Sweep in Compose
- **WHEN** the user adds Apertura to a pad track
- **THEN** a device card appears with target Filter, from 400, to 4000, 8 bars, curve exponential, repeat once, and its code preview

### Requirement: Where movement devices go
Movement devices SHALL be offered on bass, arp, hook, pad, guitar and code tracks only. A track SHALL hold at most two movement devices, at most one Pump, and at most one Sweep and one LFO per target; the validator SHALL report more.

#### Scenario: Drums track
- **WHEN** the user opens "+ Add device" on a drums track
- **THEN** the menu shows no Movement group

#### Scenario: Three movement devices
- **WHEN** a song's pad track has a Sweep, an LFO and a Pump
- **THEN** `node tools/song.mjs validate` reports an error at the third device

#### Scenario: Two Pumps
- **WHEN** a song's pad track has two Pump devices
- **THEN** `node tools/song.mjs validate` reports an error at the second device

### Requirement: Deterministic movement
Movement devices SHALL hold no random value: the same song SHALL produce the same code and the same sound at every play, in real time and in the fast export.

#### Scenario: Compile twice
- **WHEN** a song with a Sweep, an LFO and a Pump is compiled twice
- **THEN** both compilations are byte for byte equal

### Requirement: Existing songs unchanged
A song without movement devices SHALL compile byte for byte as before this change.

#### Scenario: Built-in songs
- **WHEN** `npm run check:code` runs after this change
- **THEN** no generated code differs from the snapshots

### Requirement: Absolute depth and a base value
Every generic modulator the app writes (`lfo`, `env`, `bmod`) SHALL use an absolute depth (`da`). When the line holds no value for the modulated control, the writer SHALL add a base value (the track's own setting, else the device's centre), merged so a line holds one call per control.

#### Scenario: LFO on reverb send of a dry track
- **WHEN** a pad with no reverb gets an LFO with target `room`
- **THEN** the line holds exactly one `.room(…)` call before `.lfo({ c: 'room', … da: … })`

### Requirement: Sweep
Sweep SHALL move its target from `from` to `to` over `bars` bars aligned to the clip's start, exponentially or linearly, holding `to` afterwards when `repeat` is `once` and starting again when it is `loop`. On tracks whose notes last a bar or more, the value SHALL also glide inside each held note toward the next bar's value. A Sweep SHALL replace the track's own automation of the same control on its line, with a validator warning.

#### Scenario: Filter opening on a held pad
- **WHEN** a pad holding one chord per bar has Sweep filter 400 → 4000 over 8 bars and plays
- **THEN** the low-pass cutoff measured in the middle of bar 4 lies between the values at the starts of bars 4 and 5, and the cutoff reaches 4000 within the last bar

#### Scenario: Sweep with the track's cutoff ramp
- **WHEN** a track with `cutoffEnd` gets a Sweep on the filter
- **THEN** the validator warns that the Sweep replaces the cutoff ramp, and the line holds the Sweep's ramp only

### Requirement: LFO
LFO SHALL sway its target (filter, pan, reverb send or delay send) at a rate in bars from 1/16 to 4, in time with the song's tempo, with a depth from 0 to 1 and a shape (sine, triangle, saw, ramp, square). It SHALL move inside held notes. Gain SHALL NOT be an LFO target.

#### Scenario: Pan LFO
- **WHEN** a pad gets an LFO on pan at 1/2 bar, depth 1, sine, and holds a chord for a bar
- **THEN** the pad's stereo position goes from one side to the other and back twice within the bar

### Requirement: Pump with a kick
When a section plays a kick (row `bd` of a drums track that is not muted), a Pump SHALL add to every such kick line the sidechain to the pumped track's orbit, with its depth and recovery time, one entry per pumped track. The pumped track's line SHALL be unchanged, and no other track SHALL be ducked.

#### Scenario: Two pumped pads
- **WHEN** two pads on orbits 6 and 9 have Pump depths 0.6 and 0.4 and a kick plays
- **THEN** the kick line carries `.duck("6:9").duckdepth("0.6:0.4")` and a recovery for each, and the bass is not ducked

### Requirement: Pump without a kick
In a section without a playing kick, a Pump SHALL dip the pumped track's gain at its rate (1/4, 1/8 or 1/16 bar), never above the track's own gain.

#### Scenario: Break without drums
- **WHEN** a pumped pad plays in a section with no drums
- **THEN** the pad's level dips on every beat and its peak is at most its peak without Pump plus 0.02

### Requirement: Never louder
A track's peak level with a movement device SHALL be at most its peak without the device plus 0.02, except a Sweep or LFO on the filter, whose peak SHALL be at most the peak with the filter at the sweep's or sway's most open value plus 0.02.

#### Scenario: Level check
- **WHEN** `tools/check-modulation.cjs` plays each example song with and without its devices
- **THEN** every measured peak keeps within this rule and the master never passes 0.97

### Requirement: Movement and per-hit variation
A track MAY hold both #94's `vary` and movement devices. A `vary` entry SHALL be kept when its control is moved by an LFO or a Pump, so the per-hit value is the base and the movement sways around it. A `vary` entry SHALL be skipped, with #94's warning, when a Sweep writes the same control. Each rack device SHALL declare the controls it writes as a base value, and #94's skip rule SHALL read that declaration.

#### Scenario: Vary with an LFO on the filter
- **WHEN** a pad has `vary` on `lpf` and an LFO on the filter
- **THEN** the line holds the seeded `.lpf(rand.range(…).rib(…))` and the filter LFO, with no warning

#### Scenario: Vary with a Sweep on the filter
- **WHEN** a pad has `vary` on `lpf` and a Sweep on the filter
- **THEN** the validator warns at the `vary` entry that it is left out, and the line holds the Sweep's ramp

### Requirement: Installed Strudel only
Every function the devices write SHALL exist in the installed Strudel and be listed in the catalog, so `npm run check:strudel` passes.

#### Scenario: Catalog
- **WHEN** `npm run catalog:strudel` and `npm run check:strudel` run on the example songs with every device
- **THEN** the catalog lists `lfo`, `env`, `lpsync`, `lpdepth`, `lpshape`, `rangex`, `duckorbit`, `duckdepth` and `duckattack` as written, and the check passes
