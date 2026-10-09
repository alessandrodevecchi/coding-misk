# Spec Delta

## Purpose

How the radio draws the curves of the song on air: a clear main energy curve, detail curves folded by default, a neon look in the normal theme and an oscilloscope look in the HW theme.

## ADDED Requirements

### Requirement: Points and lines
Every curve SHALL draw one small square per double phrase: hollow when the part is automatic, filled when the listener set it. Lines SHALL be solid. In the normal theme a set part and the segments next to it SHALL glow in the curve's colour. Parts already played SHALL be shaded. Handles SHALL stay draggable only on parts still to come.

#### Scenario: A set part glows
- **WHEN** the listener sets the tension of a part to come
- **THEN** that square is filled and the segments around it glow, while the other squares stay hollow

### Requirement: Energy as the main curve
The energy curve SHALL be taller than the detail lanes and drawn first, with grid lines at 0, 50 and 100, the name of each part under the curve where the part changes, and a shaded "charge" zone on the part before a drop when its tension is 70 or more.

#### Scenario: Charge zone
- **WHEN** a part before a drop has a tension of 70 or more
- **THEN** the energy curve shows a shaded zone labelled "charge" on that part

### Requirement: Details folded by default
The four detail lanes SHALL be folded by default under the energy curve, replaced by a one-line summary of their values for the part playing. Pressing the summary SHALL open the lanes, and pressing again SHALL fold them. The choice SHALL be remembered in the browser for the next visits.

#### Scenario: Open the details
- **WHEN** the listener presses the summary line
- **THEN** the four lanes open, and they are still open after a reload

### Requirement: Values on hover
With a pointer that hovers, moving over any curve SHALL show a vertical line on the part under the pointer and a box with the values of energy and of the four curves for that part. While dragging a handle, on any device, the box SHALL show the values of the part being dragged.

#### Scenario: Hover a part
- **WHEN** the pointer moves over the energy curve above a part
- **THEN** a vertical line and a box with energy, density, brightness, tension and voice for that part appear, and they go away when the pointer leaves

### Requirement: HW oscilloscope look
In the HW theme every curve SHALL be drawn in a black screen with a grid, amber lines with a phosphor glow, set parts in warm white and the position line in green.

#### Scenario: HW theme
- **WHEN** the HW theme is on and a song plays in the radio
- **THEN** the curves show as amber traces on dark grids

### Requirement: Phone width
The curves, the summary line and the hover box SHALL fit the card at phone width without horizontal scroll.

#### Scenario: Phone
- **WHEN** the window is 390 px wide with the details open
- **THEN** every curve fits the card and the page does not scroll sideways
