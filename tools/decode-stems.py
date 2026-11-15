"""Stems in the Decode bench (decode round 8, step 1), the Python half of tools/decode-stems.cjs.

  python tools/decode-stems.py separate <audio file> <out dir>   # drums, bass, other, vocals (FLAC) and time.json
  python tools/decode-stems.py score <jobs.json>                  # one JSON line per file on stdout

Scores (all at 22.05 kHz mono; the parts are the app's own tracks rendered alone, so their sum is the mix):
- sdr: per stem, 10·log10(|truth|² / |stem − truth|²); truth of drums and bass is that track, of "other" every other
  track summed (pad, lead, arp, hook), "vocals" has no truth
- gain: per stem the least-squares gains of the true parts (stem ≈ Σ g·part); 1 on its own part and 0 on the others is
  a clean split. leak: the energy of each other part inside the stem per band, in dB under the stem's own part (whole band)
- drums onset F1 (±30 ms) per band (low < 150 Hz, high > 5 kHz, all) of the drums stem against the true drums, and of
  the mix against the true drums as the baseline the stem has to beat
- bass: YIN pitch on frames where the true bass sounds; share within half a semitone (pitch) and within half a semitone
  after octave folding (chroma), for the bass stem and for the mix low-passed at 300 Hz (baseline); coverage: the share
  of frames where the part sounds (20 dB under its loud frames) in the truth and in the stem
Without truth (owner files): the stems' share of the mix's energy per band and their own band split.
"""
import json, os, shutil, subprocess, sys, tempfile, time

import numpy as np

SR = 22050
BANDS = {'low': (20, 150), 'mid': (150, 2000), 'high': (2000, 11000)}
STEMS = ['drums', 'bass', 'other', 'vocals']


def separate(src, out):
    import soundfile as sf
    os.makedirs(out, exist_ok=True)
    tmp = tempfile.mkdtemp(prefix='stems-')
    try:
        t0 = time.time()
        subprocess.run([sys.executable, '-m', 'demucs', '-n', 'htdemucs', '-d', 'cpu', '--flac', '-o', tmp, src], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        secs = time.time() - t0
        d = os.path.join(tmp, 'htdemucs')
        d = os.path.join(d, os.listdir(d)[0])
        for s in STEMS:
            shutil.move(os.path.join(d, s + '.flac'), os.path.join(out, s + '.flac'))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    dur = sf.info(os.path.join(out, 'drums.flac')).duration
    r = {'seconds': round(secs, 1), 'duration': round(dur, 1), 'ratio': round(secs / dur, 3)}
    json.dump(r, open(os.path.join(out, 'time.json'), 'w'))
    print(json.dumps(r))


def load(f):
    import soundfile as sf
    try:
        sf.info(f)
    except Exception:
        # (a format libsndfile cannot read, a video's sound: decoded by ffmpeg)
        raw = subprocess.run(['ffmpeg', '-nostdin', '-loglevel', 'error', '-i', f, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], check=True, capture_output=True).stdout
        return np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    import librosa
    x, _ = librosa.load(f, sr=SR, mono=True)
    return x.astype(np.float64)


def band(x, lo, hi):
    from scipy.signal import butter, sosfiltfilt
    sos = butter(4, [lo, min(hi, SR / 2 - 50)], btype='band', fs=SR, output='sos')
    return sosfiltfilt(sos, x)


def db(a, b):
    return round(float(10 * np.log10((a + 1e-12) / (b + 1e-12))), 1)


def lsq(stem, parts):
    names = list(parts)
    A = np.stack([parts[k] for k in names], 1)
    g, *_ = np.linalg.lstsq(A, stem, rcond=None)
    return dict(zip(names, g))


def onsets(x):
    import librosa
    return librosa.onset.onset_detect(y=x.astype(np.float32), sr=SR, hop_length=256, units='time', backtrack=False)


def f1(ref, est, tol=0.03):
    if len(ref) == 0 and len(est) == 0:
        return None
    if len(ref) == 0 or len(est) == 0:
        return 0.0
    used, hit = set(), 0
    j = 0
    for t in ref:
        while j < len(est) and est[j] < t - tol:
            j += 1
        k = j
        while k < len(est) and est[k] <= t + tol:
            if k not in used:
                used.add(k); hit += 1; break
            k += 1
    p, r = hit / len(est), hit / len(ref)
    return round(2 * p * r / (p + r), 3) if p + r else 0.0


def rms_frames(x, hop=512):
    n = len(x) // hop
    return np.sqrt((x[:n * hop].reshape(n, hop) ** 2).mean(1) + 1e-12)


def on_frames(x, hop=512):
    r = rms_frames(x, hop)
    ref = np.percentile(r, 95)
    return r > ref * 10 ** (-20 / 20)


def pitch(x):
    import librosa
    return librosa.yin(x.astype(np.float32), fmin=30, fmax=500, sr=SR, frame_length=2048, hop_length=512)


def score_bass(true_bass, stem, mix):
    from scipy.signal import butter, sosfiltfilt
    on = on_frames(true_bass)
    pt = pitch(true_bass)
    lp = sosfiltfilt(butter(6, 300, btype='low', fs=SR, output='sos'), mix)
    out = {}
    for name, sig in (('stem', stem), ('mix', lp)):
        ps = pitch(sig)
        n = min(len(pt), len(ps), len(on))
        m = on[:n]
        d = 12 * np.log2(ps[:n][m] / pt[:n][m])
        out[name + 'Pitch'] = round(float((np.abs(d) < 0.5).mean()), 3) if m.any() else None
        out[name + 'Chroma'] = round(float((np.abs(((d + 6) % 12) - 6) < 0.5).mean()), 3) if m.any() else None
    so = on_frames(stem)
    n = min(len(on), len(so))
    out['coverTruth'] = round(float(on.mean()), 3)
    out['coverStem'] = round(float(so.mean()), 3)
    out['coverAgree'] = round(float((on[:n] == so[:n]).mean()), 3)
    return out


def score(jobs):
    for j in jobs:
        st = {s: load(os.path.join(j['stems'], s + '.flac')) for s in STEMS}
        mix = load(j['mix'])
        n = min([len(mix)] + [len(v) for v in st.values()])
        tm = json.load(open(os.path.join(j['stems'], 'time.json')))
        row = {'id': j['id'], 'seconds': tm['seconds'], 'duration': tm['duration'], 'ratio': tm['ratio']}
        if not j.get('parts'):
            # no truth: each stem's share of the mix's energy per band, and its own split
            row['share'] = {}
            for s in STEMS:
                row['share'][s] = {b: round(float((band(st[s][:n], *r) ** 2).sum() / ((band(mix[:n], *r) ** 2).sum() + 1e-12)), 3) for b, r in BANDS.items()}
            row['split'] = {s: {b: round(float((band(st[s][:n], *r) ** 2).sum() / ((st[s][:n] ** 2).sum() + 1e-12)), 3) for b, r in BANDS.items()} for s in STEMS}
            row['level'] = {s: db((st[s][:n] ** 2).sum(), (mix[:n] ** 2).sum()) for s in STEMS}
            print(json.dumps(row), flush=True)
            continue
        parts = {k: load(f) for k, f in j['parts'].items()}
        n = min([n] + [len(v) for v in parts.values()])
        mix = mix[:n]; st = {k: v[:n] for k, v in st.items()}; parts = {k: v[:n] for k, v in parts.items()}
        groups = {'drums': [k for k, t in j['types'].items() if t == 'drums' and k in parts],
                  'bass': [k for k, t in j['types'].items() if t == 'bass' and k in parts]}
        groups['other'] = [k for k in parts if k not in groups['drums'] + groups['bass']]
        truth = {g: sum(parts[k] for k in ks) if ks else np.zeros(n) for g, ks in groups.items()}
        row['tracks'] = {g: ks for g, ks in groups.items()}
        row['sumSnr'] = db((mix ** 2).sum(), ((mix - sum(parts.values())) ** 2).sum())
        row['sdr'] = {g: db((truth[g] ** 2).sum(), ((st[g] - truth[g]) ** 2).sum()) for g in ('drums', 'bass', 'other') if groups[g]}
        # the absent parts: a stem's level when its part is not in the song (dB under the mix)
        row['absent'] = {g: db((st[g] ** 2).sum(), (mix ** 2).sum()) for g in ('drums', 'bass', 'other') if not groups[g]}
        row['vocals'] = db((st['vocals'] ** 2).sum(), (mix ** 2).sum())
        present = {g: truth[g] for g in ('drums', 'bass', 'other') if groups[g]}
        row['gain'] = {s: {g: round(float(v), 3) for g, v in lsq(st[s], present).items()} for s in ('drums', 'bass', 'other', 'vocals')}
        # leakage per band: energy of each other part inside the stem, in dB under the stem's own part (or the stem)
        row['leak'] = {}
        for s in ('drums', 'bass', 'other'):
            # (the reference: the stem's own part over the whole band, or the whole stem when the song lacks that part)
            ref = ((row['gain'][s][s] * present[s]) ** 2).sum() if s in present else (st[s] ** 2).sum()
            for b, r in BANDS.items():
                pb = {g: band(v, *r) for g, v in present.items()}
                g = lsq(band(st[s], *r), pb)
                for p in pb:
                    if p != s:
                        row['leak'][f'{p}>{s}:{b}'] = db(((g[p] * pb[p]) ** 2).sum(), ref)
        # the bass stem's share of the mix's high band (hats and noise that would reach a bass measure)
        hb = band(mix, *BANDS['high'])
        row['bassHighShare'] = round(float((band(st['bass'], *BANDS['high']) ** 2).sum() / ((hb ** 2).sum() + 1e-12)), 4)
        row['bassLowShare'] = round(float((band(st['bass'], *BANDS['low']) ** 2).sum() / ((band(mix, *BANDS['low']) ** 2).sum() + 1e-12)), 3)
        if groups['drums']:
            row['onset'] = {}
            for b, r in (('low', (20, 150)), ('high', (5000, 11000)), ('all', None)):
                f = (lambda x: band(x, *r)) if r else (lambda x: x)
                ref = onsets(f(truth['drums']))
                row['onset'][b] = {'stem': f1(ref, onsets(f(st['drums']))), 'mix': f1(ref, onsets(f(mix))), 'n': int(len(ref))}
        if groups['bass']:
            row['bass'] = score_bass(truth['bass'], st['bass'], mix)
        print(json.dumps(row), flush=True)


if __name__ == '__main__':
    if sys.argv[1] == 'separate':
        separate(sys.argv[2], sys.argv[3])
    elif sys.argv[1] == 'score':
        score(json.load(open(sys.argv[2])))
