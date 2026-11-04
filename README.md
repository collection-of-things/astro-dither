<div align="center">

<img src="assets/icon.svg" width="64" height="64" alt="">

# astro-dither

Dither for Astro, based on Leo's dithercn.

[![npm version](https://img.shields.io/npm/v/astro-dither)](https://www.npmjs.com/package/astro-dither)
[![npm downloads](https://img.shields.io/npm/dm/astro-dither)](https://www.npmjs.com/package/astro-dither)
[![CI](https://github.com/screen-gd/astro-dither/actions/workflows/ci.yml/badge.svg)](https://github.com/screen-gd/astro-dither/actions/workflows/ci.yml)
[![MIT licence](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

[Website](https://astro-dither.vercel.app) (placeholder URL, deployment pending) · [Docs](https://astro-dither.vercel.app/docs) · [Examples](https://astro-dither.vercel.app/examples) · [npm](https://www.npmjs.com/package/astro-dither)

</div>

![The landing page hero: a dithered aurora over a starfield](assets/readme/hero.jpg)

Animated dither backgrounds, gradients and image effects for Astro. No React.

## Features

- **No React.** Plain Astro components and one custom element. Nothing to hydrate.
- **19 effects** in one registry: aurora, waves, plasma, silk, smoke, contours, ripples, metaballs, tunnel, retro-grid, starfield, eclipse, globe, gradient, glow, mesh, beams, noise, rise.
- **Image dithering** that keeps the real `img` and its alt text in the tree.
- **One shared WebGL context** for every ordered-dither surface on a page, so many tiles cost about the same as one.
- **Pauses itself** offscreen and in hidden tabs. Respects `prefers-reduced-motion`.
- **Typed props** per effect. Your editor lists only the settings an effect has.
- **Copy-source CLI** for projects that want the code in their own repo.

## Install

```sh
pnpm add astro-dither
```

```sh
npm i astro-dither
```

```sh
bun add astro-dither
```

## Quick start

```astro
---
import { DitherAurora } from "astro-dither";
---

<section style="height: 100svh">
  <DitherAurora />
</section>
```

Any of the 19 effects works the same way:

```astro
<DitherEffect effect="plasma" />
```

## Components

| Component | What it does | Docs |
| --- | --- | --- |
| `Dither` | Paper's animated dither shapes: sphere, warp, wave, ripple, swirl, dots. | [API](https://github.com/screen-gd/astro-dither/tree/main/packages/astro-dither#dither) |
| `DitherImage` | Ordered dithering over any image. Keeps the `img` and its alt. | [API](https://github.com/screen-gd/astro-dither/tree/main/packages/astro-dither#ditherimage) |
| `DitherGradient` | Linear, radial, conic or wave gradients. | [API](https://github.com/screen-gd/astro-dither/tree/main/packages/astro-dither#wrappers) |
| `DitherAurora` | The aurora effect with all its knobs. | [API](https://github.com/screen-gd/astro-dither/tree/main/packages/astro-dither#wrappers) |
| `DitherEffect` | Any of the 19 effects below, animated or still. | [API](https://github.com/screen-gd/astro-dither/tree/main/packages/astro-dither#dithereffect) |
| `DitherGlobe` | An orthographic globe dithered from a land mask. | [API](https://github.com/screen-gd/astro-dither/tree/main/packages/astro-dither#wrappers) |

## Effects

| Group | Effects |
| --- | --- |
| Gradients and glows | `gradient`, `glow`, `mesh`, `beams`, `rise` |
| Textures | `noise`, `plasma`, `silk`, `smoke`, `waves` |
| Patterns | `contours`, `ripples`, `metaballs`, `tunnel`, `retro-grid` |
| Scenes | `aurora`, `starfield`, `eclipse`, `globe` |

Every effect takes the same props: `params` (its own typed settings), `palette` (2 to 8 colours), `cell`, `matrix` (Bayer 2x2, 4x4, 8x8 or noise), `speed`, `class`. The full parameter tables are in the [package README](https://github.com/screen-gd/astro-dither/tree/main/packages/astro-dither#effects).

## Copy the source

Prefer owning the code instead of a dependency? Copy the components into your project:

```sh
npx astro-dither add aurora
```

- `npx astro-dither add aurora image globe` copies several at once.
- `--dir src/components/ui` changes the target directory (default `src/components/dither`).
- `--force` overwrites existing files; without it, changed files are skipped.
- `npx astro-dither list` shows all six components.
- `all` copies everything, including the engine.

Relative imports and assets (like the globe's land mask) are followed automatically.

## How it works

Each component renders a `<dither-surface>` element with its settings serialised into a data attribute at build time. A small custom element mounts in the browser, opens one WebGL2 context shared by every ordered-dither surface on the page, and draws each effect's GLSL field through a Bayer threshold matrix into the palette. `DitherImage` uses the same idea on an image texture, in its own context, and leaves the original `img` in place so alt text, readers and no-JS still work.

## Browser support and accessibility

- Requires WebGL2. Where a surface cannot start it stays blank; `DitherImage` falls back to the plain `img`.
- Backgrounds render `aria-hidden` so screen readers skip them.
- `prefers-reduced-motion` gets a still frame: every surface draws its `stillTime` frame once and stops.
- IntersectionObserver and `visibilitychange` pause rendering offscreen and in hidden tabs.

## Repository layout

```
packages/astro-dither/   the npm package (components, engine, CLI, tests)
site/                  the Astro site on astro-dither.vercel.app
scripts/               repo scripts (favicon generator)
assets/                icon and README images
.github/               CI workflow, issue templates, dependabot
```

## Development

Requires Node 22.23.4 or newer (`.nvmrc`) and pnpm (`packageManager` pins 12.11.2).

```sh
pnpm install     # install the workspace
pnpm dev         # site at http://localhost:4321
pnpm test        # vitest on the package
pnpm check       # astro check on package and site
pnpm build       # build the site into site/dist
node scripts/favicon.mjs   # regenerate favicons into site/public
```

## Deploying the site

The site deploys to Vercel from the repo root. Import the GitHub repo and Vercel reads `vercel.json`: framework `astro`, install `pnpm install --frozen-lockfile`, build `pnpm build`, output `site/dist`. Nothing else to set. The production URL is picked up automatically for absolute OG tags; set `SITE_URL` only if you need to override it.

## Releasing

1. Bump `version` in `packages/astro-dither/package.json`.
2. Add an entry to `packages/astro-dither/CHANGELOG.md`.
3. `pnpm run ci` should be green.
4. `pnpm --filter astro-dither publish --access public`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Bug reports and feature requests go through [GitHub issues](https://github.com/screen-gd/astro-dither/issues); security reports through [private vulnerability reporting](https://github.com/screen-gd/astro-dither/security).

## Credits

- [Paper Shaders](https://shaders.paper.design) for the shader shapes and the image filter.
- [dithercn](https://dithercn.vercel.app) by Leo, which this project is based on.
- [Starwind UI](https://starwind.dev), [Cult UI](https://www.cult-ui.com) and [Kibo UI](https://www.kibo-ui.com) for the site's buttons and snippets.

## Licence

[MIT](LICENSE), Screen 2026.
