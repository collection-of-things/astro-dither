# Changelog

## 0.1.0

First public release.

- Six components: `Dither`, `DitherImage`, `DitherGradient`, `DitherAurora`, `DitherGlobe`, `DitherEffect`.
- Eighteen effects in one registry: gradient, glow, mesh, beams, noise, plasma, waves, silk, smoke, contours, ripples, metaballs, tunnel, retro-grid, aurora, starfield, eclipse, globe.
- One shared WebGL context for every ordered-dither surface on a page; `DitherImage` uses its own context per image.
- Bayer 2x2, 4x4, 8x8 and noise matrices, 2 to 8 colour palettes, per-effect typed params.
- Surfaces pause offscreen and in hidden tabs, respect prefers-reduced-motion, and `DitherImage` keeps the real `img` and its alt text.
- `astro-dither` CLI: `add`, `list`, `--dir`, `--force`. Copies component source into a project, following relative imports and assets.
- Globe ships its land mask as a bundled asset.
- Peer dependency `astro >= 5`. Runtime dependency `@paper-design/shaders` 0.0.82.
