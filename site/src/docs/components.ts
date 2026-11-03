import type { PropRow } from "./registry";
import { SHARED as C } from "./component-props";

export interface ComponentDoc {
  slug: string;
  title: string;
  component: string;
  description: string;
  intro: string;
  usage: string;
  rows: PropRow[];
  /** Element tag for live previews and the data-dither payload to seed it. */
  element: "dither-surface" | "dither-image" | "dither-canvas";
  seed: Record<string, unknown>;
  controls: ControlSpec[];
}

export type ControlSpec =
  | { kind: "slider"; key: string; label: string; min: number; max: number; step: number; param?: boolean }
  | { kind: "select"; key: string; label: string; options: { value: string; label: string }[]; param?: boolean }
  | { kind: "triplet"; key: string; label: string; options: { value: string; label: string }[] }
  | { kind: "toggle"; key: string; label: string; param?: boolean };

export const COMPONENT_DOCS: ComponentDoc[] = [
  {
    slug: "dither",
    title: "Dither",
    component: "Dither",
    description: "Paper's animated dither shapes: sphere, warp, wave, ripple, swirl and dots.",
    intro:
      "The original Paper dithering shader, driving six shape families. It runs in its own WebGL context per element and takes colour, pattern and motion props straight from the Paper API.",
    usage: '<Dither shape="sphere" size={2} speed={0.4} />',
    rows: C.dither,
    element: "dither-canvas",
    seed: { shape: "sphere", size: 2, speed: 0.4, colorBack: "#000000", colorFront: "#00b2ff" },
    controls: [
      { kind: "select", key: "shape", label: "Shape", options: ["sphere", "warp", "wave", "ripple", "swirl", "dots"].map((v) => ({ value: v, label: v })) },
      { kind: "slider", key: "size", label: "Size", min: 0.5, max: 4, step: 0.1 },
      { kind: "slider", key: "speed", label: "Speed", min: 0, max: 3, step: 0.1 },
      { kind: "slider", key: "scale", label: "Scale", min: 0.2, max: 3, step: 0.1 },
    ],
  },
  {
    slug: "dither-image",
    title: "DitherImage",
    component: "DitherImage",
    description: "Ordered dithering over any photograph, keeping the img and its alt.",
    intro:
      "Paper's image dithering shader over your photo, in its own context. The img stays in the tree as the fallback and for screen readers, so alt text keeps working with or without the shader.",
    usage: '<DitherImage src="/examples/portrait.jpg" alt="A dithered portrait" />',
    rows: C.image,
    element: "dither-image",
    seed: {
      src: "/examples/portrait.jpg",
      colorBack: "#000000",
      colorFront: "#00b2ff",
      colorHighlight: "#d6efff",
      type: "8x8",
      size: 2,
    },
    controls: [
      { kind: "triplet", key: "colors", label: "Colours", options: [
        { value: "#000000,#00b2ff,#d6efff", label: "Blue" },
        { value: "#000000,#f4f1ea,#ffffff", label: "Ink" },
        { value: "#1a0602,#ff9a4a,#ffe6c4", label: "Ember" },
        { value: "#02120c,#5fd4a0,#d9ffd0", label: "Mint" },
      ] },
      { kind: "select", key: "type", label: "Type", options: ["random", "2x2", "4x4", "8x8"].map((v) => ({ value: v, label: v })) },
      { kind: "slider", key: "size", label: "Size", min: 1, max: 8, step: 1 },
      { kind: "slider", key: "colorSteps", label: "Colour steps", min: 1, max: 5, step: 1 },
      { kind: "toggle", key: "originalColors", label: "Original colours" },
      { kind: "toggle", key: "inverted", label: "Inverted" },
    ],
  },
  {
    slug: "dither-gradient",
    title: "DitherGradient",
    component: "DitherGradient",
    description: "Linear, radial, conic or wave gradients through the ordered-dither engine.",
    intro:
      "A typed wrapper over the gradient effect. `mode` picks the ramp and `palette` the colours; everything else is the shared effect API.",
    usage: '<DitherGradient mode="linear" palette={["#000000", "#00b2ff"]} />',
    rows: C.gradient,
    element: "dither-surface",
    seed: { effect: "gradient" },
    controls: [],
  },
  {
    slug: "dither-aurora",
    title: "DitherAurora",
    component: "DitherAurora",
    description: "The aurora effect with all fifteen of its knobs typed.",
    intro:
      "The signature look: folding curtains of light. This wrapper gives you the aurora's full param set as typed props instead of a params object.",
    usage: "<DitherAurora />",
    rows: C.aurora,
    element: "dither-surface",
    seed: { effect: "aurora" },
    controls: [
      { kind: "slider", key: "height", label: "Height", min: 0, max: 0.9, step: 0.01, param: true },
      { kind: "slider", key: "curtains", label: "Curtains", min: 1, max: 6, step: 1, param: true },
      { kind: "slider", key: "rays", label: "Rays", min: 2, max: 20, step: 1, param: true },
      { kind: "slider", key: "sway", label: "Sway", min: 0, max: 3, step: 0.1, param: true },
      { kind: "slider", key: "intensity", label: "Intensity", min: 0, max: 1, step: 0.05, param: true },
    ],
  },
  {
    slug: "dither-effect",
    title: "DitherEffect",
    component: "DitherEffect",
    description: "Any of the 18 registry effects through one component.",
    intro:
      "The generic surface: pick an `effect`, pass its typed `params`, and the engine does the rest. Effect pages document each field's own params.",
    usage: '<DitherEffect effect="plasma" params={{ scale: 3 }} />',
    rows: C.effect,
    element: "dither-surface",
    seed: { effect: "plasma" },
    controls: [],
  },
  {
    slug: "dither-globe",
    title: "DitherGlobe",
    component: "DitherGlobe",
    description: "An orthographic globe dithered from a bundled land mask.",
    intro:
      "The globe effect with the land mask bundled as an asset. `lat` and `lon` rotate the view; the palette styles the land.",
    usage: "<DitherGlobe />",
    rows: C.globe,
    element: "dither-surface",
    seed: { effect: "globe", src: "/_astro/land.DQQLgLH3.png", palette: ["transparent", "#f4f1ea"] },
    controls: [
      { kind: "slider", key: "lat", label: "Latitude", min: -90, max: 90, step: 1, param: true },
      { kind: "slider", key: "lon", label: "Longitude", min: -180, max: 180, step: 1, param: true },
    ],
  },
];
