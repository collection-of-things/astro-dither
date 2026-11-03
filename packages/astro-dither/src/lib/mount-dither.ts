import { ShaderMount, ditheringFragmentShader } from "@paper-design/shaders";
import { ditherUniforms, parseDitherSettings, playbackSpeed } from "./dither";

const ELEMENT_NAME = "dither-canvas";

/** Register `<dither-canvas>` once. Astro includes this script once per page. */
export function defineDitherElement(): void {
  if (customElements.get(ELEMENT_NAME)) return;
  customElements.define(ELEMENT_NAME, DitherCanvas);
}

/** One dither surface. Reads `data-dither` and mounts Paper's shader on itself. */
class DitherCanvas extends HTMLElement {
  private shader: ShaderMount | undefined;
  private reducedMotion: MediaQueryList | undefined;

  connectedCallback(): void {
    const settings = parseDitherSettings(this.dataset.dither);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.reducedMotion = motion;
    motion.addEventListener("change", this.onMotionChange);

    try {
      this.shader = new ShaderMount(
        this,
        ditheringFragmentShader,
        ditherUniforms(settings),
        undefined,
        playbackSpeed(settings.speed, motion.matches),
        settings.frame,
        settings.minPixelRatio,
        settings.maxPixelCount,
      );
    } catch {
      this.replaceChildren();
      this.style.background = settings.colorBack;
    }
  }

  disconnectedCallback(): void {
    this.reducedMotion?.removeEventListener("change", this.onMotionChange);
    this.shader?.dispose();
    this.shader = undefined;
  }

  private onMotionChange = (): void => {
    const settings = parseDitherSettings(this.dataset.dither);
    const reduced = this.reducedMotion?.matches ?? false;
    this.shader?.setSpeed(playbackSpeed(settings.speed, reduced));
  };
}
