---
title: Write your own effect
description: An effect is one GLSL field plus a registry entry. The engine does the rest.
order: 9
section: Engine
---

An effect is a `field` function and an entry in `src/lib/effects.ts`. The engine compiles your field once, declares your params as uniforms, and handles dithering, palette mapping, resizing, pausing and reduced motion.

## The field

```glsl
float field(vec2 uv, vec2 res, float t) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float d = length(p);
  float ring = smoothstep(0.02, 0.0, abs(d - (0.25 + 0.15 * sin(t * 0.6))));
  float halo = exp(-d * 3.0) * 0.4;
  return clamp(ring + halo, 0.0, 1.0);
}
```

`uv` is 0 to 1 with y up, `res` is the canvas size in cells (divide x by y for an aspect-correct space), and `t` is seconds. Return a tone 0 to 1; a negative value means transparent, which is how the globe's sea clears. `hash21`, `vnoise` and `fbm` helpers are already defined.

## Register it

```ts
ripple: {
  field: RIPPLE_FIELD,
  params: { size: 0.25 },
  ranges: { size: { min: 0.1, max: 0.6, step: 0.01 } },
  stillTime: 2,
  palette: ["#000000", "#0b3d80", "#00b2ff", "#d6efff"],
  speed: 1,
},
```

Each entry in `params` becomes a `uniform float p_<name>` read inside the field. `ranges` drives slider controls on the docs pages; `stillTime` is the moment drawn for a still or reduced-motion frame; `speed` is the default playback rate. Use `speed: 0` for static effects.

## Use it

```astro
<DitherEffect effect="ripple" params={{ size: 0.4 }} />
```

Add a palette of 2 to 8 colours, a registry test if it has params to parse, and a tile on the examples page. The catalog picks it up automatically through the registry.
