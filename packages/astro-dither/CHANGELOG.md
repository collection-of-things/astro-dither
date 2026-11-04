# Changelog

## Unreleased

- Show palette gradients when WebGL initialization or a context fails; retain full-size image fallbacks when Paper cannot draw.
- Clarify that the CLI image component uses Paper's image dithering filter.

## 0.1.0 - 2026-11-04

- New `astro-dither/THIRD_PARTY_NOTICES.md` export includes Paper Shaders' full Apache-2.0 LICENSE and NOTICE text. Astro consumers can import it with `?raw`; the demo displays it on `/licenses`, linked from the footer.
- `DitherAurora` takes `color`, `tipColor` and `background` (hex) and builds its palette from them, and accepts `direction="up" | "down"` and `mask="none" | "top" | "bottom" | "edges"`. Its default `spread` is now 0.11.
- New `levels` (snap tones before dithering) and `stillTime` settings on every ordered effect. `auroraPalette` is exported.
- New `bloom` and `bloomRadius` settings on every ordered effect (`DitherEffect`, `DitherGradient`, `DitherAurora`, `DitherGlobe`): a blurred copy of each frame screened on top, so lit cells bloom. CSS `--dither-bloom` and `--dither-bloom-radius` override them, so a hover rule can brighten the bloom.
- `<dither-surface>` renders one canvas pixel per dither cell and scales it up with `image-rendering: pixelated`. The result looks the same at 4 to 16 times fewer pixels per frame, which fixes scroll lag in Firefox. Cell sizes now round to whole device pixels.
- Animated effects with a transparent palette colour no longer smear: each frame clears the canvas before drawing.
- `DitherGlobe` spins by default, keeps a round shape in any box and is lit, with a dithered sea. New `sea` and `speed` props; `speed={0}` holds it still. The land mask is now a 2048×1024 equirectangular map built from Natural Earth by `scripts/land-mask.mjs`, which fixes the upside-down, stretched continents. The mask is exported as `astro-dither/assets/land.png`.
- Every dither element dispatches a bubbling `dither:ready` CustomEvent after it draws its first frame.

### Initial package

- Six components: `Dither`, `DitherImage`, `DitherGradient`, `DitherAurora`, `DitherGlobe`, `DitherEffect`.
- Nineteen effects in one registry: gradient, glow, mesh, beams, noise, plasma, waves, silk, smoke, contours, ripples, metaballs, tunnel, retro-grid, aurora, starfield, eclipse, globe, rise.
- One shared WebGL context for every ordered-dither surface on a page; `DitherImage` uses its own context per image.
- Bayer 2x2, 4x4, 8x8 and noise matrices, 2 to 8 colour palettes, per-effect typed params.
- Surfaces pause offscreen and in hidden tabs, respect prefers-reduced-motion, and `DitherImage` keeps the real `img` and its alt text.
- `astro-dither` CLI: `add`, `list`, `--dir`, `--force`. Copies component source into a project, following relative imports and assets.
- Globe ships its land mask as a bundled asset.
- Peer dependency `astro >= 5`. Runtime dependency `@paper-design/shaders` 0.0.82.
