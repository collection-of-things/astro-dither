---
title: Theming and palettes
description: Palettes, cells and matrices are how the effects pick up your site's look.
order: 4
section: Get started
---

Every ordered effect is a tone field quantized through a palette. Three props control the look on any of them: `palette`, `cell` and `matrix`.

## Palette

```astro
<DitherEffect effect="plasma" palette={["#02060d", "#0b3d80", "#00b2ff", "#d6efff"]} />
```

Two to eight CSS colours, paper first, brightest last. `transparent` is allowed anywhere in the list, which is how the globe renders land over a clear sea. The effect's tone maps onto this range: tone 0 gets the first colour, tone 1 the last, and the dither steps between them.

## Cell

`cell` is the size of one dither cell in CSS pixels, 1 to 8. Small cells read as a fine screen; large cells are chunky poster grain. The same effect at `cell={2}` and `cell={6}` looks like different materials.

## Matrix

`matrix` picks the threshold pattern: `2`, `4`, `8` for Bayer matrices or `"noise"` for a random threshold. Smaller matrices have fewer steps, so palettes read as harder bands. Noise breaks the pattern up into a grainier texture. See [Matrices and cells](/docs/engine/matrices).

## Speed

`speed` scales animation time, 0 to 3. Setting `speed={0}` draws one still frame at the effect's chosen moment.
