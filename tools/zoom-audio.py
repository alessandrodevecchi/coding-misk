# Usage: python zoom-audio.py <wav> <start s> <end s> <out.png>: spectrogram and onsets per band.
import sys, numpy as np, librosa, librosa.display, matplotlib
matplotlib.use('Agg'); import matplotlib.pyplot as plt
wav, t0, t1, out = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
y, sr = librosa.load(wav, sr=22050, offset=t0, duration=t1 - t0)
S = np.abs(librosa.stft(y, n_fft=1024, hop_length=128)); f = librosa.fft_frequencies(sr=sr, n_fft=1024)
fps = sr / 128; t = np.arange(S.shape[1]) / fps + t0
bands = {'kick <120': f < 120, 'snare 1.5-4k': (f > 1500) & (f < 4000), 'hat >7k': f > 7000}
fig, ax = plt.subplots(len(bands) + 1, 1, figsize=(18, 10), sharex=True)
librosa.display.specshow(librosa.amplitude_to_db(S, ref=np.max), sr=sr, hop_length=128, x_axis='time', y_axis='log', ax=ax[0])
for i, (n, m) in enumerate(bands.items()):
    e = S[m].sum(0); ax[i + 1].plot(np.arange(len(e)) / fps, e / e.max()); ax[i + 1].set_ylabel(n)
    on = librosa.onset.onset_detect(onset_envelope=np.diff(e, prepend=0).clip(0), sr=sr, hop_length=128, units='time')
    d = np.diff(on); print(n, 'onsets', len(on), 'median gap', round(float(np.median(d)), 3) if len(d) else None, 'first', [round(x + t0, 2) for x in on[:12]])
plt.tight_layout(); plt.savefig(out, dpi=60)
