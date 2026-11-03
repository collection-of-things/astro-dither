---
title: Performance
description: One shared context, draw-on-resize surfaces, and a loop that only runs while visible.
order: 7
section: Engine
---

## One WebGL context

Every `<dither-surface>` on a page shares one WebGL2 context. Browsers limit how many live contexts a page can hold, so a docs page with twenty effect previews would not work if each owned one. The shared renderer compiles one program per effect and caches it, so the twenty-first surface of an effect is nearly free.

`DitherImage` and `Dither` each use their own context per element. Keep those to a few per page.

## Only draw when needed

A surface draws on mount, on resize, and on each animation frame while playing. The frame loop runs only when all of these hold:

- the surface intersects the viewport (IntersectionObserver),
- the tab is visible (`visibilitychange`),
- `prefers-reduced-motion` is off,
- `speed` is above 0.

When the loop stops, the surface holds its last frame. Nothing renders in a hidden tab.

## Cost per frame

Each frame is one fullscreen draw of the field plus a copy into the surface's 2D canvas. Param count does not change the draw cost; fields with more noise octaves or loop iterations cost a little more per pixel. Larger `cell` values sample fewer cells and are cheaper.
