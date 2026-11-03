export { default as Dither } from "./components/Dither.astro";
export { default as DitherImage } from "./components/DitherImage.astro";
export { default as DitherGradient } from "./components/DitherGradient.astro";
export { default as DitherAurora } from "./components/DitherAurora.astro";
export { default as DitherEffect } from "./components/DitherEffect.astro";
export { default as DitherGlobe } from "./components/DitherGlobe.astro";

export { ditherPresets } from "./lib/dither";
export { effects } from "./lib/effects";
export type { EffectDefinition, EffectName, EffectParams } from "./lib/effects";
