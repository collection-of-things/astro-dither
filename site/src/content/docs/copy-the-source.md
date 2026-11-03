---
title: Copy the source
description: Copy component source into your project instead of depending on the package.
order: 3
section: Get started
---

The `astro-dither` CLI copies component source, the engine files it imports, and any assets into your project. Use it when you want to own the code or tweak a field yourself.

## Add a component

```sh
npx astro-dither add aurora
```

This writes the component, the lib files it needs, and nothing else. Then import it with a relative path:

```astro
---
import DitherAurora from "../components/dither/components/DitherAurora.astro";
---
```

## Options

- `npx astro-dither add aurora image globe` copies several at once.
- `--dir src/components/ui` changes the target directory. The default is `src/components/dither`.
- `--force` overwrites existing files. Without it, changed files are skipped and reported.
- `all` copies every component and the full engine.
- `npx astro-dither list` prints the names it accepts.

## What it copies

The CLI follows relative imports recursively from each component: other components, lib modules, and assets like the globe's land mask. Test files are never copied. If a copied file imports `@paper-design/shaders` it prints the install command for your package manager, detected from your lockfile. It never runs installs itself.
