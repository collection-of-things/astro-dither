---
title: How it works
description: One WebGL context, one field per effect, one threshold matrix.
order: 5
section: Engine
---

Each component renders a custom element with its settings serialised into a `data-dither` attribute at build time. In the browser a small element script mounts once per element type and reads the attribute.

## Ordered effects

`<dither-surface>` is the element behind `DitherEffect` and the gradient, aurora and globe wrappers. All of them share one WebGL2 context on the page. Each surface owns a 2D canvas; the shared context renders the effect's GLSL field into it, applies a Bayer or noise threshold, and quantizes the result through the palette. Browsers cap live WebGL contexts, so one context keeps a page full of effects cheap.

Every effect is the same shape: a `field(vec2 uv, vec2 res, float t)` function that returns a tone from 0 to 1, a map of numeric params that become `p_<name>` uniforms, a default palette, a still time and a speed.

## Image dithering

`<dither-image>` runs Paper's image dithering shader over a photo in its own context. The `img` stays in the tree as the no-JS and screen-reader fallback: the shader draws over it, and the element reveals the photo again if anything goes wrong.

## Shapes

`<dither-canvas>` runs Paper's animated dithering shapes and is the engine inside `Dither`. Same settings-attribute idea, one context per element.
