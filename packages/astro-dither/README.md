<img src="https://raw.githubusercontent.com/screen-gd/astro-dither/main/assets/icon.svg" width="64" height="64" alt="">

# astro-dither

Animated dither backgrounds, gradients and image effects for Astro. No React. The shapes and image filter use [Paper Shaders](https://shaders.paper.design)' vanilla package; gradients and the other effects run on a small custom Bayer engine that shares one WebGL context.

[Website](https://astro-dither.vercel.app) · [Docs](https://astro-dither.vercel.app/docs) · [GitHub](https://github.com/screen-gd/astro-dither)

![Dither for Astro, with blue aurora artwork rendered from its shader](https://raw.githubusercontent.com/screen-gd/astro-dither/main/assets/readme/hero.jpg)

## Install

Requires Astro 5 or newer. No Astro integration or React dependency is needed. Give each component's parent an explicit height.

```sh
pnpm add astro-dither
```

```sh
npm i astro-dither
```

```sh
bun add astro-dither
```

## Or copy the source

Prefer owning the code? The CLI copies a component and the files it needs into your project, so you can edit them like your own components:

```sh
npx astro-dither add aurora
```

Files land in `src/components/dither` (`--dir` to change, `--force` to overwrite). `astro-dither list` shows all six; `add` takes several names or `all`.

## Dither

Ordered dithering over a moving shape (noise, warp, dots, wave, ripple, swirl, or a sphere). Give the component a height. It fills its parent.

```astro
---
import { Dither } from "astro-dither";
---

<div style="height: 100vh">
  <Dither colorFront="#00b2ff" shape="sphere" type="4x4" size={2} speed={1} />
</div>
```

| Prop | Default | Values |
| --- | --- | --- |
| `colorBack` | `#000000` | Hex, `rgb()`, or `hsl()` |
| `colorFront` | `#00b2ff` | Hex, `rgb()`, or `hsl()` |
| `shape` | `sphere` | `simplex`, `warp`, `dots`, `wave`, `ripple`, `swirl`, `sphere` |
| `type` | `4x4` | `random`, `2x2`, `4x4`, `8x8` |
| `size` | `2` | Pixel size of the dither grid |
| `speed` | `1` | `0` draws one still frame |
| `scale` | `0.6` | Zoom of the shape |
| `fit` | `none` | `none`, `contain`, `cover` |

`frame`, `rotation`, `offsetX`, `offsetY`, `originX`, `originY`, `worldWidth`, and `worldHeight` match the Paper component.

## DitherImage

Paper's image dithering filter over a photo. The `<img>` is the no-JS fallback and stays readable by screen readers once the shader takes over.

```astro
---
import { DitherImage } from "astro-dither";
---

<div style="height: 400px">
  <DitherImage src="/photo.jpg" alt="A forest" colorFront="#f4f1ea" colorBack="#000000" type="8x8" />
</div>
```

| Prop | Default | Values |
| --- | --- | --- |
| `src` | Required | Path, remote URL, or `ImageMetadata` import |
| `alt` | Required | Alt text for the `<img>` |
| `colorBack` | `#000c38` | Hex, `rgb()`, or `hsl()` |
| `colorFront` | `#94ffaf` | Hex, `rgb()`, or `hsl()` |
| `colorHighlight` | `#eaff94` | Colour for the brightest pixels |
| `type` | `8x8` | `random`, `2x2`, `4x4`, `8x8` |
| `size` | `2` | Pixel size of the dither grid |
| `colorSteps` | `2` | Brightness levels, 1 to 7 |
| `originalColors` | `false` | Keep the photo's own colours |
| `inverted` | `false` | Invert the photo's luminance |
| `fit` | `cover` | `none`, `contain`, `cover` |
| `speed` | `0` | `0` draws one still frame |

Remote images need CORS headers because the shader reads their pixels.

## DitherEffect

![Six registry effects rendered with their default settings](https://raw.githubusercontent.com/screen-gd/astro-dither/main/assets/readme/effects.jpg)

One component for the 18 procedural registry effects. Use `DitherGlobe` for the nineteenth effect: it supplies the required land mask, which `DitherEffect` does not accept. Each effect is a small GLSL field mapped onto a dithered palette ramp. The element fills its parent.

```astro
---
import { DitherEffect } from "astro-dither";
---

<div style="height: 400px">
  <DitherEffect effect="aurora" palette={["#000000", "#06281f", "#14b87a", "#a8ffd9"]} />
</div>
```

| Prop | Default | Values |
| --- | --- | --- |
| `effect` | Required | One of the effect names below |
| `params` | Effect defaults | Object of numbers, unknown keys are dropped |
| `palette` | Effect default | 2 to 8 colours, dark first |
| `cell` | `2` | Dither cell size in pixels |
| `matrix` | `8` | `2`, `4`, `8`, or `"noise"` |
| `speed` | Effect default | `0` draws one still frame |
| `levels` | `0` | `0` keeps continuous tones; values above `1` snap tones before dithering |
| `stillTime` | Effect default | Animation time in seconds for a still frame |
| `bloom` | `0` | Bloom strength; `0` disables the blurred overlay |
| `bloomRadius` | `10` | Bloom blur radius in CSS pixels |
| `class` | None | CSS class on the custom element |

Ordered palettes accept hex colours (including alpha) and `transparent`. Set a positive `bloom` prop first (for example, `bloom={0.5}`) to create the overlay, then override it in CSS with `--dither-bloom` and `--dither-bloom-radius`. CSS variables alone have no effect when the prop remains `0`.

The loop pauses offscreen and in hidden tabs. With reduced motion enabled, or `speed={0}`, it draws the effect at `stillTime` and stops.

| Effect | Params (defaults) | Look |
| --- | --- | --- |
| `gradient` | `mode` (1), `angle` (180), `cx`, `cy` (0.5, 0), `radius` (1.05), `from`, `to` (1, 0) | Linear, radial, conic or wave ramp; angles drift when animated |
| `glow` | `cx`, `cy` (0.5, 0.55), `radius` (0.6), `power` (2) | Soft spotlight, gently breathing |
| `mesh` | `size` (0.42), `sway` (0.15) | Drifting blobs melting into a multi-colour mesh |
| `aurora` | `curtains` (3), `height` (0.42), `spread` (0.11), `sway` (1), `turbulence` (0.6), `rays` (8), `length` (0.45), `glow` (0.9), `intensity` (0.95), `shimmer` (0.2), `scale` (1), `tilt` (0), `drift` (0), `direction` (1), `mask` (0) | A bright folding edge with rays rising into a dark sky |
| `noise` | `scale` (2.5), `warp` (1.5), `gain` (1.2) | Slow domain-warped folds |
| `waves` | `horizon` (0.62), `gain` (1) | Layered swells under a glowing horizon |
| `plasma` | `scale` (2) | Classic flowing plasma |
| `rise` | `height` (0.72), `wave` (0.05), `grain` (0.3) | Vertical ramp, dark top to bright bottom, wavy drifting edge |
| `beams` | `cx`, `cy` (0.5, 1.15), `fade` (1.6) | God rays sweeping slowly from a point |
| `silk` | `sharp` (3), `warp` (5) | Smooth folds with bright crests |
| `smoke` | `scale` (3), `rise` (0.15), `gain` (1.2) | Billowing upward and thinning |
| `contours` | `scale` (2), `lines` (10) | Topographic lines over drifting hills |
| `ripples` | `freq` (28) | Rings from three points crossing |
| `metaballs` | `size` (0.14) | Gooey blobs merging |
| `tunnel` | `twist` (3), `spokes` (4) | Rings zooming toward the viewer |
| `retro-grid` | none | Perspective grid floor and striped sun |
| `starfield` | `gain` (1.2) | Three parallax twinkling layers |
| `eclipse` | `radius` (0.22) | Dark disc, glowing rim, breathing corona |
| `globe` | `lat` (20), `lon` (48), `sea` (0.12) | Spinning, lit globe from a land mask |

### Add your own effect

Add an entry to `effects` in `src/lib/effects.ts`: a `field` function in GLSL that takes `(vec2 uv, vec2 res, float t)` and returns a tone (0 to 1, negative means transparent), plus `params`, `stillTime`, `palette`, and `speed`. The engine declares `p_<name>` uniforms for each param and provides `u_resolution`, `u_time`, `u_image`, `hash21`, `vnoise`, and `fbm`.

## Wrappers

These components expose named props for specific registry effects. All accept `palette`, `cell`, `matrix`, `speed`, `levels`, `stillTime`, `bloom`, `bloomRadius`, and `class`.

### DitherAurora

```astro
---
import { DitherAurora } from "astro-dither";
---

<section style="height: 480px">
  <DitherAurora color="#3d8bff" tipColor="#6a4cff" background="#000000" cell={3} bloom={0.55} />
</section>
```

Accepts the aurora parameters listed above as direct props. `color`, `tipColor`, and `background` build a palette from hex colours; an explicit `palette` overrides them. `background="transparent"` keeps the page visible. `direction` accepts `"up"`, `"down"`, `1`, or `-1`. `mask` accepts `"none"`, `"top"`, `"bottom"`, `"edges"`, or their numeric values `0` through `3`. Its default spread is `0.11`.

### DitherGradient

Accepts `mode` (`"linear"`, `"radial"`, `"conic"`, or `"wave"`; default `"radial"`), `angle`, `centerX`, `centerY`, `radius`, `from`, and `to`. Numeric settings use the gradient defaults above. The default speed is `0`.

### DitherGlobe

Accepts `src` (a same-origin custom equirectangular land-mask URL), `lat` (`20`), `lon` (`48`), and `sea` (`0.12`). The bundled mask is used if `src` is omitted. Cross-origin mask URLs are not supported by the current loader, even if the server allows CORS. The default palette is `["transparent", "#f4f1ea"]`, with `cell={2.5}`, `matrix={4}`, and `speed={1}`. Set `speed={0}` to hold the globe still. It stays round in rectangular containers. The mask is also exported as `astro-dither/assets/land.png`.

## Runtime and accessibility

Every component fills its parent. Ordered effects share one WebGL2 context; Paper shapes and image filters each use their own context. The loops pause offscreen and in hidden tabs. Reduced motion draws a still frame: ordered effects use `stillTime`, and Paper shapes use `frame`.

Background elements are `aria-hidden`. Put meaningful text alongside them. If WebGL2 is unavailable, ordered surfaces stay blank, `Dither` uses its background colour, and `DitherImage` keeps the original photo. Every component dispatches a bubbling `dither:ready` event after drawing its first frame.

`@paper-design/shaders` is pinned because it publishes breaking changes under `0.0.x`.

## Exports

Import components, `ditherPresets`, `effects`, and `auroraPalette` from `astro-dither`. The package also exports the types `EffectDefinition`, `EffectName`, and `EffectParams`.

Individual component exports, such as `astro-dither/DitherAurora.astro`, are available. `astro-dither/effects` exposes the registry and its types. Astro consumes the shipped `.astro` and TypeScript source directly; no separate library build is needed.

`astro-dither/THIRD_PARTY_NOTICES.md` exports the attribution document. In Astro, import it with `?raw` to display its text.

## Credits and licence

[Paper Shaders](https://shaders.paper.design) supplies the animated shapes and image filter. [Leo's dithercn](https://dithercn.vercel.app) inspired the project. The remaining effects use this package's own GLSL and ordered-dither renderer.

Paper Shaders is Copyright 2026 Paper, licensed under Apache-2.0. Its full LICENSE and NOTICE text are preserved in the included [THIRD_PARTY_NOTICES.md](https://github.com/screen-gd/astro-dither/blob/main/packages/astro-dither/THIRD_PARTY_NOTICES.md) and on the demo site's [licenses page](https://astro-dither.vercel.app/licenses).

MIT, Screen 2026. See [LICENSE](https://github.com/screen-gd/astro-dither/blob/main/packages/astro-dither/LICENSE).
