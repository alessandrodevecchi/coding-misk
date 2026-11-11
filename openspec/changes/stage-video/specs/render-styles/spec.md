## ADDED Requirements

### Requirement: Render styles on the Video look

Every render style (Normal, CRT, LED, 1-bit, ASCII, Terminal) SHALL apply to the Video look as to a scene look: the pass over the finished frame, after the video and the stage widgets (ASCII and Terminal drawing the widgets natively after it). The Video look SHALL have its own light gain for 1-bit and ASCII.

#### Scenario: Terminal on a video

- **WHEN** the render is Terminal on the Video look
- **THEN** the video shows as half-block cells inside the text interface, with the tab bar and the status bar

### Requirement: Video passes within the budget

A pass on the Video look SHALL read only its own low-resolution work picture, never the full-size video frame on the CPU. On the stage, each pass on the Video look SHALL stay within the render performance budget, and the light form on slow devices SHALL work as on the other looks.

#### Scenario: LED on a video

- **WHEN** the Video look shows a stage video with the LED render on a 1080p stage
- **THEN** the video is drawn as round dots and the pass takes at most 4 ms median
