---
title: Installation
description: Add astro-dither to an Astro project with pnpm, npm or bun.
order: 2
section: Get started
---

## Install the package

```sh
pnpm add astro-dither
```

```sh
npm i astro-dither
```

```sh
bun add astro-dither
```

The package needs Astro 5 or newer and has one runtime dependency, `@paper-design/shaders`.

## Use a component

```astro
---
import { DitherAurora } from "astro-dither";
---

<section style="height: 100svh">
  <DitherAurora />
</section>
```

The component fills its parent, so give the parent a size. That is the whole setup: no client directive, no provider, no config file.

## Add more

```astro
---
import { DitherEffect, DitherImage } from "astro-dither";
---

<DitherEffect effect="contours" />
<DitherImage src="/photo.jpg" alt="A dithered photograph" />
```

Every component also has a per-file export if you prefer that: `astro-dither/DitherAurora.astro`, `astro-dither/DitherImage.astro`, and so on. `astro-dither/effects` exports the effect names and types for building your own registry-driven UI.
