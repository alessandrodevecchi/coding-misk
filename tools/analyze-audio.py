"""Usage: python analyze-audio.py <input audio> <output prefix>. Needs numpy, librosa, matplotlib (see AGENTS.md)."""
import json, subprocess, sys, os
import numpy as np, librosa, matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import librosa.display

src, out = sys.argv[1], sys.argv[2]
wav = out + '.wav'
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-ac', '1', '-ar', '22050', wav], check=True)
y, sr = librosa.load(wav, sr=22050)
dur = len(y) / sr
H, P = librosa.effects.hpss(y)

tempo, beats = librosa.beat.beat_track(y=y, sr=sr, units='time')
tempo = float(np.atleast_1d(tempo)[0])
# BPM alternativi (metà/doppio) per decidere a orecchio
onset_env = librosa.onset.onset_strength(y=y, sr=sr)
tg = librosa.feature.tempogram(onset_envelope=onset_env, sr=sr)
ac = np.mean(tg, axis=1); bpms = librosa.tempo_frequencies(tg.shape[0], sr=sr)
cand = sorted([(float(ac[i]), float(bpms[i])) for i in range(1, len(bpms)) if 60 < bpms[i] < 200], reverse=True)[:5]

NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
MAJ = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MIN = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
def key_of(ch):
    best = []
    for i in range(12):
        best.append((np.corrcoef(np.roll(MAJ, i), ch)[0, 1], NOTES[i] + ' maj'))
        best.append((np.corrcoef(np.roll(MIN, i), ch)[0, 1], NOTES[i] + ' min'))
    return sorted(best, reverse=True)[:3]
chroma = librosa.feature.chroma_cqt(y=H, sr=sr)
key = key_of(chroma.mean(axis=1))

# griglia per battuta (4 beat)
bar_len = 240 / tempo
nbars = int(dur // bar_len)
def bar_slice(b):
    a, z = int(b * bar_len * sr), int(min(len(y), (b + 1) * bar_len * sr)); return a, z
# accordi per battuta: triadi maggiori/minori
TRI = {}
for i, n in enumerate(NOTES):
    v = np.zeros(12); v[[i, (i + 4) % 12, (i + 7) % 12]] = 1; TRI[n] = v
    v = np.zeros(12); v[[i, (i + 3) % 12, (i + 7) % 12]] = 1; TRI[n + 'm'] = v
fps = sr / 512
bars = []
S_full = np.abs(librosa.stft(y, n_fft=2048, hop_length=512))
freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
low = S_full[freqs < 150].sum(0); mid = S_full[(freqs >= 150) & (freqs < 2500)].sum(0); high = S_full[freqs >= 5000].sum(0)
rms = librosa.feature.rms(y=y)[0]
cent = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
bass_ch = librosa.feature.chroma_cqt(y=librosa.effects.harmonic(y), sr=sr, fmin=librosa.note_to_hz('C1'), n_octaves=3)
for b in range(nbars):
    f0, f1 = int(b * bar_len * fps), int((b + 1) * bar_len * fps)
    c = chroma[:, f0:f1].mean(1)
    chord = max(TRI, key=lambda k: np.dot(TRI[k], c) / (np.linalg.norm(c) + 1e-9))
    bass = NOTES[int(np.argmax(bass_ch[:, f0:f1].mean(1)))]
    bars.append(dict(bar=b + 1, t=round(b * bar_len, 1), chord=chord, bass=bass,
                     rms=round(float(rms[f0:f1].mean()), 4), low=round(float(low[f0:f1].mean()), 1),
                     high=round(float(high[f0:f1].mean()), 1), centroid=int(cent[f0:f1].mean())))
mx = {k: max(b[k] for b in bars) or 1 for k in ['rms', 'low', 'high']}
for b in bars:
    for k in ['rms', 'low', 'high']: b[k] = round(b[k] / mx[k], 2)

# griglia batteria a 16 passi: energia di attacco per banda, mediata sulle battute con cassa
def grid(band_mask, bars_sel):
    env = np.diff(S_full[band_mask].sum(0), prepend=0).clip(0)
    g = np.zeros(16)
    for b in bars_sel:
        for s in range(16):
            t0 = (b + s / 16) * bar_len; i0, i1 = int(t0 * fps), int((t0 + bar_len / 16) * fps)
            g[s] += env[i0:max(i0 + 1, i1)].max() if i1 > i0 else 0
    return g / (g.max() or 1)
busy = [b['bar'] - 1 for b in bars if b['low'] > .5] or list(range(nbars))
kick = grid(freqs < 120, busy); snare = grid((freqs > 1500) & (freqs < 4000), busy); hat = grid(freqs > 7000, busy)
fmt = lambda g: ''.join('x' if v > .6 else ('o' if v > .35 else '.') for v in g)

# melodia: nota dominante per mezzo beat sulla parte armonica, banda medio-alta
mel_ch = librosa.feature.chroma_cqt(y=H, sr=sr, fmin=librosa.note_to_hz('C4'), n_octaves=3)
mel = []
step = bar_len / 8
for i in range(min(int(dur / step), 8 * 16)):
    f0, f1 = int(i * step * fps), int((i + 1) * step * fps)
    c = mel_ch[:, f0:f1].mean(1); mel.append(NOTES[int(np.argmax(c))] if c.max() > .5 else '~')

# segmenti per novità (cambi di sezione)
mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
bounds = librosa.segment.agglomerative(np.vstack([mfcc, chroma]), 8)
bound_t = [round(float(t), 1) for t in librosa.frames_to_time(bounds, sr=sr)]

res = dict(file=os.path.basename(src), duration=round(dur, 1), tempo=round(tempo, 1), tempo_candidates=[round(b, 1) for _, b in cand],
           key=[(round(float(s), 2), k) for s, k in key], bars=nbars, bar_seconds=round(bar_len, 2), section_bounds=bound_t,
           percussive_ratio=round(float(np.sum(P ** 2) / (np.sum(y ** 2) + 1e-9)), 2),
           drums=dict(kick=fmt(kick), snare=fmt(snare), hat=fmt(hat)), melody_8ths_first16bars=' '.join(mel[:128]), per_bar=bars)
json.dump(res, open(out + '.json', 'w'), indent=1)

fig, ax = plt.subplots(3, 1, figsize=(16, 9), sharex=True)
D = librosa.amplitude_to_db(S_full, ref=np.max)
librosa.display.specshow(D, sr=sr, hop_length=512, x_axis='time', y_axis='log', ax=ax[0]); ax[0].set_title(os.path.basename(src))
librosa.display.specshow(chroma, sr=sr, x_axis='time', y_axis='chroma', ax=ax[1])
t = np.arange(len(low)) / fps
ax[2].plot(t, low / low.max(), label='low <150Hz'); ax[2].plot(t, mid / mid.max(), label='mid'); ax[2].plot(t, high / high.max(), label='high >5k', alpha=.7)
for bt in bound_t: [a.axvline(bt, color='w' if a is not ax[2] else 'k', ls='--', lw=1) for a in ax]
ax[2].legend(loc='upper right')
plt.tight_layout(); plt.savefig(out + '.png', dpi=70)
print(json.dumps({k: v for k, v in res.items() if k != 'per_bar'}, indent=1))
