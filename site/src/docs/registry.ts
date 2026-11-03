import { effects } from "astro-dither/effects";
import type { EffectDefinition, EffectName } from "astro-dither/effects";

export type EffectGroup = "Gradients and glows" | "Textures" | "Patterns" | "Scenes";

export interface Example {
  title: string;
  sentence: string;
  /** Effect params for the variant. */
  params?: Record<string, number>;
  palette?: readonly string[];
  cell?: number;
  matrix?: 2 | 4 | 8 | "noise";
  speed?: number;
}

export interface PropRow {
  name: string;
  type: string;
  def: string;
  desc: string;
}

export interface EffectDoc {
  slug: EffectName;
  title: string;
  group: EffectGroup;
  description: string;
  intro: string;
  propGroups: string;
  usage: string;
  examples: Example[];
  notes: string[];
}

export const EFFECT_GROUP_ORDER: EffectGroup[] = ["Gradients and glows", "Textures", "Patterns", "Scenes"];

export const PALETTE_PRESETS: { name: string; colors: string[] }[] = [
  { name: "Night", colors: ["#02060d", "#061a33", "#0b4f99", "#1f8fff", "#d6efff"] },
  { name: "Ember", colors: ["#1a0602", "#5c1a05", "#c24a12", "#ff9a4a", "#ffe6c4"] },
  { name: "Mint", colors: ["#02120c", "#0d3a23", "#1f7a4a", "#5fd4a0", "#d9ffd0"] },
  { name: "Orchid", colors: ["#0b0014", "#4a0d77", "#c72a92", "#ff8c4a", "#ffe6a8"] },
  { name: "Mono", colors: ["#000000", "#3a3a3a", "#9a9a9a", "#f2f4f7"] },
  { name: "Ice", colors: ["#000208", "#07294d", "#0f6b8f", "#5fd4c9", "#d8fff4"] },
];

export const EFFECTS: EffectDoc[] = [
  {
    slug: "gradient",
    title: "Gradient",
    group: "Gradients and glows",
    description: "A linear, radial, conic or wave gradient drawn as a dither.",
    intro:
      "Four modes under one prop: linear sweeps along an angle, radial grows from a point, conic spins around it, and wave strips the screen horizontally. The ramp itself is two stops, `from` and `to`, blended through the palette.",
    propGroups:
      "Shape: `mode`, `angle`, `cx`, `cy`, `radius`. Ramp: `from` and `to`, blended through `palette`. Motion: `speed` rotates linear and conic modes.",
    usage: '<DitherEffect effect="gradient" palette={["#000000", "#00b2ff", "#d6efff"]} />',
    examples: [
      {
        title: "Conic spin",
        sentence: "`mode` 2 turns the ramp around its centre, and `speed` keeps it turning.",
        params: { mode: 2, cx: 0.5, cy: 0.5 },
        speed: 0.4,
      },
      {
        title: "Horizontal wave",
        sentence: "`mode` 3 drops the ramp for soft horizontal bands that drift.",
        params: { mode: 3 },
        speed: 0.6,
      },
    ],
    notes: [],
  },
  {
    slug: "glow",
    title: "Glow",
    group: "Gradients and glows",
    description: "A soft dithered spotlight from any point, breathing slowly.",
    intro:
      "A single radial falloff from `cx`, `cy`. `radius` sets how far it reaches and `power` how sharply it drops. The field adds a slow breath on top, so the edge pulses a little even at full brightness.",
    propGroups: "Placement: `cx`, `cy`. Falloff: `radius`, `power`.",
    usage: '<DitherEffect effect="glow" params={{ cx: 0.5, cy: 0.4, radius: 0.7 }} />',
    examples: [
      {
        title: "Corner light",
        sentence: "Push the centre to a corner and stretch the radius for a side-lit wall.",
        params: { cx: 0.1, cy: 0.15, radius: 0.9, power: 1.4 },
      },
      {
        title: "Hard spotlight",
        sentence: "High `power` tightens the falloff into a stage spotlight.",
        params: { radius: 0.4, power: 5 },
      },
    ],
    notes: [],
  },
  {
    slug: "mesh",
    title: "Mesh gradient",
    group: "Gradients and glows",
    description: "Colour blobs that drift and melt into each other.",
    intro:
      "Four blobs weighted across the palette range wander slowly. `size` sets each blob's reach and `sway` how far they roam, so small values freeze the mesh and large ones smear it.",
    propGroups: "Shape: `size`, `sway`. Colour: `palette`, blob by blob.",
    usage: '<DitherEffect effect="mesh" />',
    examples: [
      {
        title: "Wide melt",
        sentence: "Large `size` and `sway` blend the palette into one soft wash.",
        params: { size: 0.8, sway: 0.35 },
      },
      {
        title: "Confetti",
        sentence: "Small `size` keeps each blob distinct over the paper colour.",
        params: { size: 0.18, sway: 0.2 },
      },
    ],
    notes: [],
  },
  {
    slug: "beams",
    title: "Beams",
    group: "Gradients and glows",
    description: "Shafts of light from a point that fade with distance.",
    intro:
      "Noise-streaked rays fan out from `cx`, `cy`. `fade` controls how quickly they die out, so high values give short candlelight rays and low values let the beams cross the whole surface.",
    propGroups: "Placement: `cx`, `cy`. Falloff: `fade`.",
    usage: '<DitherEffect effect="beams" />',
    examples: [
      {
        title: "Edge light",
        sentence: "A centre above the box makes rays drop like stage lights.",
        params: { cx: 0.5, cy: -0.2, fade: 0.8 },
      },
      {
        title: "Short shimmer",
        sentence: "High `fade` pins the light close to its source.",
        params: { cx: 0.5, cy: 0.5, fade: 4 },
      },
    ],
    notes: [],
  },
  {
    slug: "noise",
    title: "Noise",
    group: "Textures",
    description: "A slow, folding noise texture.",
    intro:
      "Domain-warped fractal noise that slides over itself. `scale` zooms the texture, `warp` bends it, and `gain` pushes the contrast up until the palette steps read as hard bands.",
    propGroups: "Texture: `scale`, `warp`. Contrast: `gain`.",
    usage: '<DitherEffect effect="noise" />',
    examples: [
      {
        title: "Fog",
        sentence: "Low `scale` and low `gain` give a flat, quiet wash.",
        params: { scale: 1, gain: 0.7 },
      },
      {
        title: "Marble",
        sentence: "More `warp` folds the noise into veined, marble-like streaks.",
        params: { scale: 3, warp: 3.2, gain: 1.6 },
      },
    ],
    notes: [],
  },
  {
    slug: "plasma",
    title: "Plasma",
    group: "Textures",
    description: "Overlapping sine waves that flow into each other.",
    intro:
      "The classic demo-scene plasma: four sine fields summed and smoothed through the palette. `scale` controls the density of the pattern.",
    propGroups: "Texture: `scale`.",
    usage: '<DitherEffect effect="plasma" />',
    examples: [
      {
        title: "Fine grain",
        sentence: "Double the scale for a denser, cellular pattern.",
        params: { scale: 4 },
      },
      {
        title: "Two-tone",
        sentence: "A two-colour palette snaps the plasma into a duotone print.",
        palette: ["#000000", "#00b2ff"],
      },
    ],
    notes: [],
  },
  {
    slug: "silk",
    title: "Silk",
    group: "Textures",
    description: "Folds of silk with a bright highlight along each crest.",
    intro:
      "A sine sheet warped by noise. `warp` bends the folds and `sharp` decides how the crests catch the light, from soft cloth to hard moire.",
    propGroups: "Fold: `warp`. Highlight: `sharp`.",
    usage: '<DitherEffect effect="silk" />',
    examples: [
      {
        title: "Soft cloth",
        sentence: "Low `sharp` flattens the crests into a gentle sheen.",
        params: { sharp: 1.5, warp: 3 },
      },
      {
        title: "Deep folds",
        sentence: "High `warp` pulls the sheet into tight, overlapping ridges.",
        params: { sharp: 4, warp: 8 },
      },
    ],
    notes: [],
  },
  {
    slug: "smoke",
    title: "Smoke",
    group: "Textures",
    description: "Soft smoke that billows upward and thins out.",
    intro:
      "Rising fractal noise masked to the lower half, so the surface clears for text on top. `scale` sets the blob size, `rise` the speed of the drift, `gain` the density.",
    propGroups: "Texture: `scale`, `rise`. Density: `gain`.",
    usage: '<DitherEffect effect="smoke" />',
    examples: [
      {
        title: "Embers",
        sentence: "An ember palette turns the smoke into heat under a dark sky.",
        palette: ["#000000", "#2a0a02", "#7a2808", "#e86a20", "#ffd9a0"],
      },
      {
        title: "Dense fog",
        sentence: "Low `scale` and high `gain` fill the bottom with a solid bank.",
        params: { scale: 1.5, gain: 2.2 },
      },
    ],
    notes: [],
  },
  {
    slug: "waves",
    title: "Waves",
    group: "Textures",
    description: "Layered swells under a glowing horizon.",
    intro:
      "Three stacked swells rolling toward a bright edge. `horizon` moves the glow line up and down the frame, `gain` pushes the bands brighter.",
    propGroups: "Placement: `horizon`. Brightness: `gain`.",
    usage: '<DitherEffect effect="waves" />',
    examples: [
      {
        title: "Low tide",
        sentence: "Drop `horizon` for a taller sea under a thin sky.",
        params: { horizon: 0.4 },
      },
      {
        title: "Overexposed",
        sentence: "High `gain` burns the crests to the lightest palette colour.",
        params: { gain: 1.8 },
      },
    ],
    notes: [],
  },
  {
    slug: "contours",
    title: "Contours",
    group: "Patterns",
    description: "A topographic map: contour lines over slowly drifting hills.",
    intro:
      "Fractal height sliced into contour bands, with the hillshade kept under the lines. `scale` zooms the terrain and `lines` sets how many elevation bands the map draws.",
    propGroups: "Terrain: `scale`, `lines`.",
    usage: '<DitherEffect effect="contours" />',
    examples: [
      {
        title: "Flat land",
        sentence: "Few `lines` read like a calm, low-relief map.",
        params: { lines: 4 },
      },
      {
        title: "Alps",
        sentence: "More `lines` at a bigger `scale` give dense alpine ridges.",
        params: { scale: 3.5, lines: 24 },
      },
    ],
    notes: [],
  },
  {
    slug: "ripples",
    title: "Ripples",
    group: "Patterns",
    description: "Concentric rings spreading from three points.",
    intro:
      "Sine rings radiating from three fixed centres, crossing like drops on still water. `freq` controls how tight the rings sit.",
    propGroups: "Pattern: `freq`.",
    usage: '<DitherEffect effect="ripples" />',
    examples: [
      {
        title: "Calm",
        sentence: "Low `freq` widens the rings into slow, rolling circles.",
        params: { freq: 10 },
      },
      {
        title: "Rain",
        sentence: "High `freq` packs the rings into fine interference bands.",
        params: { freq: 50 },
      },
    ],
    notes: [],
  },
  {
    slug: "metaballs",
    title: "Metaballs",
    group: "Patterns",
    description: "Soft blobs that drift, merge and split like a lava lamp.",
    intro:
      "Four charges orbiting the centre, summed until they blob together. `size` sets each charge's radius.",
    propGroups: "Shape: `size`.",
    usage: '<DitherEffect effect="metaballs" />',
    examples: [
      {
        title: "Spores",
        sentence: "Small `size` splits the field into separate drifting dots.",
        params: { size: 0.07 },
      },
      {
        title: "Mercury",
        sentence: "Large `size` keeps the blobs merged in one slow mass.",
        params: { size: 0.3 },
      },
    ],
    notes: [],
  },
  {
    slug: "tunnel",
    title: "Tunnel",
    group: "Patterns",
    description: "A slow flight down a tunnel of glowing rings.",
    intro:
      "Polar rings rushing inward with a spiral twist. `twist` sets the depth of the spiral and `spokes` how many wall segments wrap around.",
    propGroups: "Pattern: `twist`, `spokes`.",
    usage: '<DitherEffect effect="tunnel" />',
    examples: [
      {
        title: "Straight well",
        sentence: "`twist` 0 and no `spokes` leave plain concentric rings.",
        params: { twist: 0, spokes: 0 },
      },
      {
        title: "Fan",
        sentence: "More `spokes` cut the walls into a spinning turbine.",
        params: { twist: 6, spokes: 9 },
      },
    ],
    notes: [],
  },
  {
    slug: "retro-grid",
    title: "Retro grid",
    group: "Patterns",
    description: "A perspective grid floor scrolling toward a striped sun.",
    intro:
      "The synthwave floor: a perspective grid under a sunset with scanline stripes. It takes no params; palette and cell size do the styling.",
    propGroups: "No params. Style it with `palette`, `cell` and `matrix`.",
    usage: '<DitherEffect effect="retro-grid" />',
    examples: [
      {
        title: "Neon",
        sentence: "A cold palette turns the sunset into a neon signboard.",
        palette: ["#02060d", "#0b3d80", "#00b2ff", "#d6efff"],
      },
      {
        title: "Coarse print",
        sentence: "Bigger cells give the grid a chunkier, poster-like grain.",
        cell: 5,
        matrix: 4,
      },
    ],
    notes: [],
  },
  {
    slug: "aurora",
    title: "Aurora",
    group: "Scenes",
    description: "Curtains of light that fold, sway and shimmer.",
    intro:
      "Each curtain has a bright lower edge that folds slowly, with rays that fade as they rise. Further curtains hang higher and dimmer. `height` sets where the lowest edge hangs, so you can keep the area under it clear for text.",
    propGroups:
      "Shape: `curtains`, `height`, `spread`, `sway`, `turbulence`, `rays`, `length`. Light: `glow`, `intensity`, `shimmer`. Placement and motion: `tilt`, `scale`, `drift`, `direction`, `mask`, plus `speed`, `cell` and `matrix`.",
    usage: "<DitherAurora />",
    examples: [
      {
        title: "Above a headline",
        sentence: "Raising `height` lifts the curtains so the lower third stays clear.",
        params: { height: 0.62 },
      },
      {
        title: "Northern lights",
        sentence: "A green-to-violet palette with more curtains and longer rays.",
        params: { curtains: 5, rays: 12, length: 0.7, tilt: -6, drift: 0.4 },
        palette: ["#010604", "#04291a", "#0f7a3a", "#4ade80", "#c4b5fd"],
      },
      {
        title: "Hanging down",
        sentence: "`direction` -1 flips it so rays fall from a bright top edge.",
        params: { direction: -1, height: 0.14, curtains: 2, rays: 5, length: 0.4 },
      },
    ],
    notes: [],
  },
  {
    slug: "starfield",
    title: "Starfield",
    group: "Scenes",
    description: "Stars in three parallax layers that twinkle and drift.",
    intro:
      "Three layers of hashed stars, each drifting at a different speed and twinkling on its own clock. `gain` scales the overall brightness.",
    propGroups: "Brightness: `gain`.",
    usage: '<DitherEffect effect="starfield" />',
    examples: [
      {
        title: "Sparse",
        sentence: "Low `gain` thins the field to a few bright stars.",
        params: { gain: 0.5 },
      },
      {
        title: "Dense",
        sentence: "High `gain` lets the far layers show through too.",
        params: { gain: 2.4 },
      },
    ],
    notes: [],
  },
  {
    slug: "eclipse",
    title: "Eclipse",
    group: "Scenes",
    description: "A dark disc with a glowing rim and a breathing corona.",
    intro:
      "A black disc edged by a bright ring, with a noise-streaked corona that slowly breathes. `radius` sizes the disc against the surface.",
    propGroups: "Shape: `radius`.",
    usage: '<DitherEffect effect="eclipse" />',
    examples: [
      {
        title: "Transit",
        sentence: "A small disc reads as a distant transit over a quiet sky.",
        params: { radius: 0.12 },
      },
      {
        title: "Annular",
        sentence: "A large disc fills the frame, leaving only the corona.",
        params: { radius: 0.4 },
      },
    ],
    notes: [],
  },
  {
    slug: "globe",
    title: "Globe",
    group: "Scenes",
    description: "An orthographic globe dithered from a land mask.",
    intro:
      "The bundled land mask sampled onto a sphere. `lat` and `lon` set which point faces the viewer. It ships a two-colour palette that reads as paper land on a transparent sea.",
    propGroups: "Placement: `lat`, `lon`.",
    usage: "<DitherGlobe />",
    examples: [
      {
        title: "Pacific",
        sentence: "Rotate the view to centre the ocean.",
        params: { lat: 0, lon: -140 },
      },
      {
        title: "Brand blue",
        sentence: "Swap the palette for inked land on transparent water.",
        palette: ["transparent", "#00b2ff", "#d6efff"],
      },
    ],
    notes: [],
  },
];

export const SHARED_PROP_ROWS: PropRow[] = [
  { name: "palette", type: "string[]", def: "the effect's", desc: "2 to 8 colours, paper first, brightest last. `transparent` works." },
  { name: "cell", type: "number", def: "2", desc: "Size of one dither cell in CSS pixels, 1 to 8." },
  { name: "matrix", type: "2 | 4 | 8 | \"noise\"", def: "8", desc: "The Bayer threshold size, or noise for a random look." },
  { name: "speed", type: "number", def: "1", desc: "Playback speed. 0 draws one still frame." },
  { name: "class", type: "string", def: "undefined", desc: "Classes on the surface element, for size and position." },
];

export function effectParamRows(slug: EffectName): PropRow[] {
  const def: EffectDefinition = effects[slug];
  return Object.entries(def.params).map(([name, value]) => {
    const range = def.ranges?.[name];
    const rangeText = range ? ` ${range.min} to ${range.max}.` : "";
    return { name, type: "number", def: String(value), desc: `${propDescription(slug, name)}${rangeText}` };
  });
}

const PROP_DESCRIPTIONS: Partial<Record<EffectName, Record<string, string>>> = {
  gradient: {
    mode: "0 linear, 1 radial, 2 conic, 3 wave.",
    angle: "Ramp direction in degrees (linear and conic).",
    cx: "Centre x, 0 to 1.",
    cy: "Centre y, 0 to 1.",
    radius: "Radial reach.",
    from: "Ramp start stop.",
    to: "Ramp end stop.",
  },
  glow: { cx: "Centre x, 0 to 1.", cy: "Centre y, 0 to 1.", radius: "How far the light reaches.", power: "Falloff sharpness." },
  mesh: { size: "Each blob's radius.", sway: "How far the blobs wander." },
  beams: { cx: "Source x, 0 to 1.", cy: "Source y, can sit off the surface.", fade: "How quickly the rays die out." },
  noise: { scale: "Texture zoom.", warp: "How much the noise bends.", gain: "Contrast." },
  plasma: { scale: "Pattern density." },
  silk: { sharp: "Crest highlight sharpness.", warp: "Fold bending." },
  smoke: { scale: "Blob size.", rise: "Upward drift speed.", gain: "Density." },
  waves: { horizon: "Height of the glowing edge, 0 to 1.", gain: "Band brightness." },
  contours: { scale: "Terrain zoom.", lines: "Contour bands drawn." },
  ripples: { freq: "Ring density." },
  metaballs: { size: "Each blob's radius." },
  tunnel: { twist: "Spiral depth.", spokes: "Wall segments around the ring." },
  starfield: { gain: "Overall star brightness." },
  eclipse: { radius: "Disc size relative to the surface." },
  globe: { lat: "Latitude facing the viewer, degrees.", lon: "Longitude facing the viewer, degrees." },
  aurora: {
    curtains: "How many curtains. Each hangs higher and dimmer.",
    height: "Where the lowest bright edge hangs, 0 to 1.",
    spread: "Vertical gap between curtains.",
    sway: "How far the edges fold.",
    turbulence: "Fine ripples along each edge.",
    rays: "How many rays fit across.",
    length: "How far the rays reach up.",
    glow: "Brightness of the line along each edge.",
    intensity: "Overall curtain brightness.",
    shimmer: "A slow brightness ripple.",
    scale: "Horizontal zoom.",
    tilt: "Tilt of the curtains in degrees.",
    drift: "Sideways travel.",
    direction: "1 rises, -1 hangs the rays from a bright top edge.",
    mask: "0 none, 1 fades the top, 2 fades the bottom, 3 fades the sides.",
  },
};

function propDescription(slug: EffectName, name: string): string {
  return PROP_DESCRIPTIONS[slug]?.[name] ?? "Effect parameter.";
}
