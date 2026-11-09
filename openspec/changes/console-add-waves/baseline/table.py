import json, sys
rows = [json.loads(l) for l in open(sys.argv[1])]
NAMES = {'classic': 'Classic', 'crescendo': 'Crescendo', 'switch': 'Live coder'}
print('| Profile | Style | Standing | Presses | Batch | Badge at 1st press | First bar → entry (head) | Head dist (ph) | Last line (ph) | Moves (reason) | Steering | Typing probe at entry boundary |')
print('|---|---|---|---|---|---|---|---|---|---|---|---|')
for r in rows:
    if r['style'] == 'lo-fi' and r['standing'] == 8: continue  # invalid: standing commands after the press bar
    ph = r['phrase']
    for d in r['done']:
        pr = d['presses']; p0 = pr[0]['rel']
        # badge shown right after this batch's first press
        bad = next((p['badge']['text'] for p in r['presses'] if abs(p['rel'] - p0) < 0.05 and p['badge']), '-')
        joins = ' '.join(f"+{p['t']/1000:.1f}s" for p in pr[1:]) if len(pr) > 1 else ''
        last = max(d['ats']) if d['ats'] else d['at']
        mv = '; '.join(f"{m['from']+1}→{m['to']+1} {m['why']}" + (f" (prep {m['prepMs']/1000:.1f}s)" if m.get('prepMs') and m['why'] != 'typing' else '') for m in d['moves']) or 'none'
        dg = d.get('lastDiag')
        ty = '-'
        if dg:
            ty = ', '.join(f"b{x['b']+1}:{'fit' if x['fits'] else 'no'} {x['need']}/{x['usable']}s" for x in dg['tried']) + f"; k={dg['k']}/{dg['n']}" + (' fallback' if dg['fallback'] else '')
        st = d.get('steerMs') or (d.get('times') or {}).get('steer')
        print(f"| {NAMES[r['profile']]} | {r['style']} ({r['phraseSec']} s/ph) | {r['standing']}{' (seed r2)' if r['seed'].endswith('-r2') else ''} | {r['pat']}: {len(pr)} ({joins}) | b{d['id']} | {bad} | {d['at0']+1} → {d['at']+1} | {(d['at']-p0)/ph:.2f} | {(last-p0)/ph:.2f} | {mv} | {st/1000 if st else 0:.1f} s | {ty} |")
