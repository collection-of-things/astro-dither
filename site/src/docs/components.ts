import type { PropRow } from "./registry";
import { SHARED as C } from "./component-props";
import land from "astro-dither/assets/land.png";
import { effects, type EffectDefinition, type EffectName } from "astro-dither/effects";

const SELECT_PARAMS: Record<string, { value: string; label: string }[]> = {
  direction: [
    { value: "1", label: "up" },
    { value: "-1", label: "down" },
  ],
  mask: [
    { value: "0", label: "none" },
    { value: "1", label: "top" },
    { value: "2", label: "bottom" },
    { value: "3", label: "edges" },
  ],
};

/** Plainer labels and units for params whose names are terse. */
const PARAM_LABELS: Record<string, string> = { length: "Ray length", glow: "Edge glow", direction: "Rays point" };
const PARAM_UNITS: Record<string, string> = { tilt: "°", angle: "°", lat: "°", lon: "°" };

const label = (key: string) => PARAM_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);

/** One control per effect param: a slider over its range, or a choice for direction and mask. */
export function effectControls(name: EffectName): ControlSpec[] {
  const def: EffectDefinition = effects[name];
  return Object.entries(def.params).map(([key, value]): ControlSpec => {
    const options = SELECT_PARAMS[key];
    if (options) return { kind: "select", key, label: label(key), options, param: true };
    const r = def.ranges?.[key];
    const unit = PARAM_UNITS[key];
    return r
      ? { kind: "slider", key, label: label(key), min: r.min, max: r.max, step: r.step, param: true, unit }
      : { kind: "slider", key, label: label(key), min: 0, max: value <= 1 ? 1 : value * 2, step: value <= 1 ? 0.01 : 0.1, param: true, unit };
  });
}

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
  /** Show the engine controls every ordered effect shares: palette, matrix, cell, speed, levels, bloom. */
  shared?: boolean;
  /** The component takes params as their own props, so print them that way in the code tab. */
  flatParams?: boolean;
}

export type ControlSpec =
  | { kind: "slider"; key: string; label: string; min: number; max: number; step: number; param?: boolean; unit?: string; group?: string }
  | { kind: "select"; key: string; label: string; options: { value: string; label: string }[]; param?: boolean; group?: string }
  | { kind: "triplet"; key: string; label: string; options: { value: string; label: string }[]; group?: string }
  | { kind: "toggle"; key: string; label: string; param?: boolean; group?: string }
  | { kind: "swatch"; key: string; label: string; options: string[]; value: string; group?: string };

/** Site colour chips for colour props, in place of the browser's own picker. */
export const SWATCHES = ["#1f8fff", "#8b5cf6", "#c4b5fd", "#4ade80", "#f472b6", "#fb923c", "#ef4444", "#f2f4f7"];
const SKIES = ["#02060d", "#000000", "#0b0714", "#03110a", "#140805", "transparent"];

/** Aurora params grouped into control tabs. */
const AURORA_GROUPS: Record<string, string> = {
  curtains: "Shape",
  height: "Shape",
  spread: "Shape",
  scale: "Shape",
  tilt: "Shape",
  direction: "Shape",
  mask: "Shape",
  rays: "Light",
  length: "Light",
  glow: "Light",
  intensity: "Light",
  shimmer: "Light",
  sway: "Motion",
  turbulence: "Motion",
  drift: "Motion",
};

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
    description: "Curtains of light that fold, sway and shimmer, with every knob typed.",
    intro:
      "The signature look: folding curtains of light. Shape it with `curtains`, `height`, `spread`, `sway`, `turbulence`, `rays` and `length`; light it with `color`, `tipColor`, `background`, `glow`, `intensity` and `shimmer`; place it with `scale`, `tilt`, `drift`, `direction` and `mask`. `cell`, `matrix`, `levels` and `bloom` set how it is drawn.",
    usage: '<DitherAurora color="#4ade80" tipColor="#c4b5fd" bloom={0.6} />',
    rows: C.aurora,
    element: "dither-surface",
    seed: { effect: "aurora", params: { ...effects.aurora.params }, cell: 2, matrix: 8, speed: 1 },
    controls: [
      { kind: "swatch", key: "color", label: "Edge colour", options: SWATCHES, value: "#1f8fff", group: "Colour" },
      { kind: "swatch", key: "tipColor", label: "Tip colour", options: SWATCHES, value: "#1f8fff", group: "Colour" },
      { kind: "swatch", key: "background", label: "Sky", options: SKIES, value: "#02060d", group: "Colour" },
      ...effectControls("aurora").map((c) => ({ ...c, group: AURORA_GROUPS[c.key] })),
    ],
    shared: true,
    flatParams: true,
  },
  {
    slug: "dither-effect",
    title: "DitherEffect",
    component: "DitherEffect",
    description: "Any of the 19 registry effects through one component.",
    intro:
      "The generic surface: pick an `effect`, pass its typed `params`, and the engine does the rest. Effect pages document each field's own params.",
    usage: '<DitherEffect effect="plasma" params={{ scale: 3 }} />',
    rows: C.effect,
    element: "dither-surface",
    seed: { effect: "plasma", params: { ...effects.plasma.params }, cell: 2, matrix: 8, speed: 1 },
    controls: effectControls("plasma"),
    shared: true,
  },
  {
    slug: "dither-globe",
    title: "DitherGlobe",
    component: "DitherGlobe",
    description: "A spinning, lit globe dithered from a bundled land mask.",
    intro:
      "The globe effect with the land mask bundled as an asset. It turns on its own; `lat` and `lon` set the starting view, `sea` how much ocean shows, and the palette styles the land.",
    usage: "<DitherGlobe />",
    rows: C.globe,
    element: "dither-surface",
    seed: { effect: "globe", src: land.src, palette: ["transparent", "#f4f1ea"] },
    controls: [
      { kind: "slider", key: "lat", label: "Latitude", min: -90, max: 90, step: 1, param: true },
      { kind: "slider", key: "lon", label: "Longitude", min: -180, max: 180, step: 1, param: true },
      { kind: "slider", key: "sea", label: "Sea", min: 0, max: 0.5, step: 0.01, param: true },
    ],
    shared: true,
    flatParams: true,
  },
];
