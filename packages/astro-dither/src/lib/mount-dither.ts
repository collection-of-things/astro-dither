import { ShaderMount, ditheringFragmentShader } from "@paper-design/shaders";
import { ditherUniforms, parseDitherSettings, playbackSpeed } from "./dither";

const ELEMENT_NAME = "dither-canvas";

/** Register `<dither-canvas>` once. Astro includes this script once per page. */
export function defineDitherElement(): void {
  if (customElements.get(ELEMENT_NAME)) return;
  customElements.define(ELEMENT_NAME, DitherCanvas);
}

/**
 * One dither surface. Reads `data-dither` and mounts Paper's shader on itself.
 * Changing `data-dither` updates the running shader in place.
 */
class DitherCanvas extends HTMLElement {
  static observedAttributes = ["data-dither"];

  private shader: ShaderMount | undefined;
  private reducedMotion: MediaQueryList | undefined;
  private lostContext = false;

  /** Use the component's colours when Paper cannot create or keep a context. */
  private showFallback = (): void => {
    const settings = parseDitherSettings(this.dataset.dither);
    this.unmount();
    this.querySelectorAll("canvas").forEach((canvas) => canvas.remove());
    this.style.background = `linear-gradient(135deg, ${settings.colorBack}, ${settings.colorFront})`;
    this.setAttribute("data-dither-fallback", "");
    this.removeAttribute("data-dither-ready");
  };

  private onContextLost = (): void => {
    this.lostContext = true;
    this.showFallback();
  };

  connectedCallback(): void {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.reducedMotion = motion;
    motion.addEventListener("change", this.onMotionChange);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    this.mount();
  }

  disconnectedCallback(): void {
    this.reducedMotion?.removeEventListener("change", this.onMotionChange);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    this.unmount();
  }

  attributeChangedCallback(_name: string, before: string | null, after: string | null): void {
    if (!this.isConnected || before === after || this.reducedMotion === undefined) return;
    const shader = this.shader;
    if (!shader) {
      this.mount();
      return;
    }
    const settings = parseDitherSettings(this.dataset.dither);
    shader.setUniforms(ditherUniforms(settings));
    const speed = playbackSpeed(settings.speed, this.reducedMotion.matches);
    shader.setSpeed(speed);
    shader.setMinPixelRatio(settings.minPixelRatio);
    shader.setMaxPixelCount(settings.maxPixelCount);
    // A still surface shows exactly the requested frame; a moving one keeps its clock.
    if (speed === 0) shader.setFrame(settings.frame);
  }

  private mount(): void {
    if (this.shader) return;
    const settings = parseDitherSettings(this.dataset.dither);
    this.lostContext = false;
    this.removeAttribute("data-dither-fallback");
    this.style.removeProperty("background");
    try {
      this.shader = new ShaderMount(
        this,
        ditheringFragmentShader,
        ditherUniforms(settings),
        undefined,
        playbackSpeed(settings.speed, this.reducedMotion?.matches ?? false),
        settings.frame,
        settings.minPixelRatio,
        settings.maxPixelCount,
      );
      this.shader.canvasElement.addEventListener("webglcontextlost", this.onContextLost, { once: true });
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

  private unmount(): void {
    this.shader?.canvasElement.removeEventListener("webglcontextlost", this.onContextLost);
    this.shader?.dispose();
    this.shader = undefined;
  }

  private onMotionChange = (): void => {
    const settings = parseDitherSettings(this.dataset.dither);
    const reduced = this.reducedMotion?.matches ?? false;
    this.shader?.setSpeed(playbackSpeed(settings.speed, reduced));
  };

  /** Browsers drop contexts of background tabs; try again when the visitor comes back. */
  private onVisibilityChange = (): void => {
    if (!document.hidden && this.lostContext) this.mount();
  };
}
