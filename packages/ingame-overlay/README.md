# `tosu-ingame-overlay`
tosu ingame overlay

Supports OpenGL(stable, lazer), dx9(stable compat), dx11(lazer)

Overlay library used under this project: [asdf-overlay](https://github.com/storycraft/asdf-overlay)

## Performance
This projects uses shared gpu surface for rendering overlay, so no cpu work is involved.
It have same or less performance overhead than adding a OBS browser source.
Which is very small and it has no noticeable input latency.
