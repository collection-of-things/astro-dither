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

  /** Use the component's colours when Paper cannot create or keep a context. */
  private showFallback = (): void => {
    const settings = parseDitherSettings(this.dataset.dither);
    this.shader?.dispose();
    this.shader = undefined;
    this.querySelectorAll("canvas").forEach((canvas) => canvas.remove());
    this.style.background = `linear-gradient(135deg, ${settings.colorBack}, ${settings.colorFront})`;
    this.setAttribute("data-dither-fallback", "");
    this.removeAttribute("data-dither-ready");
  };

  connectedCallback(): void {
    const settings = parseDitherSettings(this.dataset.dither);
    this.removeAttribute("data-dither-fallback");
    this.style.removeProperty("background");
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
      this.shader.canvasElement.addEventListener("webglcontextlost", this.showFallback, { once: true });
      // The mount draws on its first rAF, queued before this one.
      requestAnimationFrame(() => {
        if (!this.isConnected || !this.shader) return;
        this.setAttribute("data-dither-ready", "");
        this.dispatchEvent(new CustomEvent("dither:ready", { bubbles: true }));
      });
    } catch {
      this.showFallback();
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
