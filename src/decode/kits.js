// The app's drum machines measured from their first kick and closed hat samples by tools/decode-kits.mjs (decode-refine
// D3): the kick's decay (seconds to -20 dB in the kick band) and the closed hat's brightness (centroid above 2 kHz, Hz).
// Made by the tool; do not edit.
export const KIT_MEASURES = {
  RolandTR909: { kickDecay: 0.055, hatBright: 6657 },
  RolandTR808: { kickDecay: 0.045, hatBright: 11073 },
  RolandTR707: { kickDecay: 0.065, hatBright: 6398 },
  RolandTR606: { kickDecay: 0.075, hatBright: 8326 },
  LinnDrum: { kickDecay: 0.04, hatBright: 8060 },
  AkaiLinn: { kickDecay: 0.05, hatBright: 7135 },
  LinnLM1: { kickDecay: 0.05, hatBright: 9332 },
  OberheimDMX: { kickDecay: 0.07, hatBright: 8236 },
  EmuSP12: { kickDecay: 0.235, hatBright: 7267 },
  AkaiMPC60: { kickDecay: 0.05, hatBright: 9117 },
  AkaiXR10: { kickDecay: 0.055, hatBright: 9084 },
  AlesisHR16: { kickDecay: 0.07, hatBright: 12132 },
  YamahaRX5: { kickDecay: 0.05, hatBright: 7457 },
  RolandR8: { kickDecay: 0.04, hatBright: 7050 },
  KorgM1: { kickDecay: 0.075, hatBright: 8109 },
  RolandMC303: { kickDecay: 0.08, hatBright: 7857 },
  RolandTR505: { kickDecay: 0.045, hatBright: 6382 },
  RolandTR626: { kickDecay: 0.04, hatBright: 8974 },
  BossDR110: { kickDecay: 0.035, hatBright: 8723 },
  AlesisSR16: { kickDecay: 0.03, hatBright: 9682 },
  YamahaRY30: { kickDecay: 0.125, hatBright: 9415 },
  RolandCompurhythm78: { kickDecay: 0.06, hatBright: 8815 },
  MPC1000: { kickDecay: 0.525, hatBright: 11428 },
};
