# Soul display, v1

Mockups of the Soul display concepts for `#46` phase 2 (task 4.0), before any code. Open `display-v1.html` in a browser: it is self-contained (the app's soul renderer is inlined) and uses real frames of the Edgerunners visual from `assets/`.

## What it shows

- **Hatch:** "⏻ Soul display" on the stage shrinks the stage, slides in a bay at its right, opens its doors, brings the display out from the depth of the bay and switches it on (about three seconds). Power off plays the reverse.
- **Four shells**, changed with the red lever on the bay's right edge (the display goes back into the bay and the next one comes out):
  - **A · MISK/OS 6000:** industrial sci-fi terminal, cream plastic, square keys, a guarded toggle for the override. Default in the HW theme.
  - **B · Field terminal:** wasteland terminal, olive steel with rust, rounded tube with a monochrome green screen (amber in HW), bakelite knobs and bat toggles.
  - **C · Sphera:** space-age orb, white gloss and chrome, neon ring in the theme's accent, round chrome buttons and a sliding override. Default in the neon theme.
  - **D · MiskVision:** 2000s CRT monitor, silver plastic, small front buttons, blue power LED, green on-screen messages (AV1, VIEW 3/10, HOLD ON, INPUT ▸ STAGE).
- **Power on per shell:** CRT turn-on line and boot text (A, B), an iris opening in a neon ring (C), a degauss wobble (D).
- **Override visual:** the override control runs a cable from the display's port to a "SOUL IN" socket on the stage; when it plugs in, sparks fly, the stage glitches and shows the soul with an "OVERRIDE" tag. Turning it off brings Edgerunners back and the cable retracts.
- The stage row grows a little in height while the display is open, so the display can be bigger.

## Files

- `display-v1.html`: interactive (click the controls on the display, the lever, NEON and HW in the top bar). `?demo=1` plays the script of the video, `?demo=1&t=13.2` freezes it at a time, `?state=open&shell=B&view=c&hw=1` shows a state.
- `compare-shells.png`: the four shells in both themes.
- `frames-open.png`, `frames-cable.png`, `frames-shell.png`, `frames-off.png`: frames of each animation.
- Videos of the whole script (neon and HW) stay local in `notes/soul/display-v1/`.
