import json, sys, collections
rows = []
for f in sys.argv[1:]:
    for l in open(f):
        r = json.loads(l)
        if r['style'] == 'lo-fi' and r['standing'] == 8: continue  # invalid: standing commands after the press bar
        rows.append(r)
by = collections.defaultdict(list); why = collections.Counter(); whyp = collections.defaultdict(collections.Counter)
joinlate = 0
for r in rows:
    ph = r['phrase']
    for d in r['done']:
        p0 = d['presses'][0]['rel']; dist = (d['at'] - p0) / ph; last = (max(d['ats'] or [d['at']]) - p0) / ph
        key = (r['profile'], 'standing' if r['standing'] else 'none')
        by[key].append((dist, last, len(d['moves']), d.get('steerMs') or 0))
        for m in d['moves']: why[m['why']] += 1; whyp[r['profile']][m['why']] += 1
        if any(p['t'] > 5000 for p in d['presses'][1:]): joinlate += 1
print('| Profile | Earlier commands | Batches | Head <= 1 ph | Head <= 2 ph | Head > 2 ph | Worst head (ph) | Batches moved | Median steering |')
print('|---|---|---|---|---|---|---|---|---|')
for k in sorted(by):
    v = by[k]; n = len(v); st = sorted(x[3] for x in v)
    print(f"| {k[0]} | {k[1]} | {n} | {sum(x[0]<=1 for x in v)} | {sum(x[0]<=2 for x in v)} | {sum(x[0]>2 for x in v)} | {max(x[0] for x in v):.2f} | {sum(x[2]>0 for x in v)} | {st[n//2]/1000:.1f} s |")
print('moves by reason', dict(why)); print({k: dict(v) for k, v in whyp.items()}); print('batches with a press joined >5 s after the first', joinlate)
