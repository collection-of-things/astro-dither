---
title: Matrices and cells
description: Bayer 2x2, 4x4, 8x8 or noise, at 1 to 8 CSS pixels per cell.
order: 6
section: Engine
---

Ordered dithering turns a continuous tone into a few palette steps by comparing each cell's tone to a fixed threshold pattern. The `matrix` prop picks the pattern and `cell` sets its size.

## Bayer matrices

- `2` is the 2x2 matrix: four threshold levels. The coarsest look; a two-colour palette reads like print halftone.
- `4` is 4x4: sixteen levels. A good middle ground for chunky grain with smooth ramps.
- `8` is 8x8: 64 levels, the default. Smoothest tonal range.
- `"noise"` uses a random threshold per cell instead of a matrix, for a grainier texture with no repeating pattern.

## Cell size

`cell` is one dither cell in CSS pixels, 1 to 8. It controls resolution more than look: at 1 the dither is nearly continuous, at 8 each dot is a visible square. The shader samples the field once per cell, so larger cells are also cheaper to draw.

## Picking a combination

Photographic image dithering looks best at `8` or `"noise"` with `cell` 1 or 2. Bold backgrounds read well at `4` with `cell` 3 to 5. The [effect pages](/docs/effects) have a live matrix switcher on every preview so you can see the difference immediately.
