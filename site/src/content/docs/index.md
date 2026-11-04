---
title: Introduction
description: Animated dither backgrounds, gradients and image effects for Astro. No React.
order: 1
section: Get started
---

astro-dither is a set of Astro components on a small WebGL engine. It draws ordered-dithered fields, a Bayer threshold over a GLSL field function, in any palette you give it. Everything ships as source you can read: no React, no hydration framework, no build plugin.

## What is in the package

- `Dither` renders Paper's animated dither shapes: sphere, warp, wave, ripple, swirl, dots.
- `DitherImage` applies ordered dithering to a photograph. It keeps the real `img` and its alt text.
- `DitherGradient`, `DitherAurora` and `DitherGlobe` are named looks with typed props.
- `DitherEffect` renders any of the 19 effects in the registry with one consistent API.

## What you get

- One shared WebGL context for every ordered-dither surface on a page.
- Bayer 2x2, 4x4 and 8x8 matrices, or a noise threshold.
- Palettes of 2 to 8 CSS colours, including `transparent`.
- Surfaces pause offscreen and in hidden tabs, and respect `prefers-reduced-motion`.
- A copy-source CLI, `npx astro-dither add`, for projects that want the code in their own repo.

## Where to next

[Install the package](/docs/installation), browse the [effect catalog](/docs/effects), or read [how the engine works](/docs/engine/how-it-works).
