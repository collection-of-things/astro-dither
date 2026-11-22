import { ShaderMount, imageDitheringFragmentShader } from "@paper-design/shaders";
import { imageDitherUniforms, parseImageDitherSettings } from "./image-dither";
import { playbackSpeed } from "./dither";

const ELEMENT_NAME = "dither-image";

/** Register `<dither-image>` once. Astro includes this script once per page. */
export function defineImageDitherElement(): void {
  if (customElements.get(ELEMENT_NAME)) return;
  customElements.define(ELEMENT_NAME, DitherImage);
}

/**
 * Dithers its `<img>` child with Paper's image shader. The img is the no-JS
 * fallback: it stays visible until the shader mounts, then it is kept in the
 * tree at opacity 0 so screen readers still announce its alt text.
 */
class DitherImage extends HTMLElement {
  static observedAttributes = ["data-dither"];

  private shader: ShaderMount | undefined;
  private reducedMotion: MediaQueryList | undefined;
  private lostContext = false;
  private request = 0;

  attributeChangedCallback(_name: string, before: string | null, after: string | null): void {
    if (!this.isConnected || before === after || this.reducedMotion === undefined) return;
    const img = this.querySelector("img");
    if (!(img instanceof HTMLImageElement)) return;
    const shader = this.shader;
    if (!shader) {
      this.load(img);
      return;
    }
    const settings = parseImageDitherSettings(this.dataset.dither);
    shader.setUniforms(imageDitherUniforms(settings, img));
    const speed = playbackSpeed(settings.speed, this.reducedMotion.matches);
    shader.setSpeed(speed);
    shader.setMinPixelRatio(settings.minPixelRatio);
    shader.setMaxPixelCount(settings.maxPixelCount);
    // A still image shows exactly the requested frame; a moving one keeps its clock.
    if (speed === 0) shader.setFrame(settings.frame);
  }

  connectedCallback(): void {
    const img = this.querySelector("img");
    if (!(img instanceof HTMLImageElement)) return;
    // Apply to dynamically inserted elements as well as Astro's scoped markup.
    img.style.cssText = "display:block;position:absolute;inset:0;width:100%;height:100%;object-fit:cover";
    this.removeAttribute("data-dither-fallback");

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.reducedMotion = motion;
    motion.addEventListener("change", this.onMotionChange);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    this.load(img);
  }

  private load(img: HTMLImageElement): void {
    const request = ++this.request;
    void img
      .decode()
      .then(() => {
        if (request === this.request) this.mount(img, this.reducedMotion?.matches ?? false);
      })
      .catch(() => {
        // The photo stays as the fallback.
      });
  }

  disconnectedCallback(): void {
    this.request++;
    this.reducedMotion?.removeEventListener("change", this.onMotionChange);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    this.shader?.canvasElement.removeEventListener("webglcontextlost", this.onContextLost);
    this.shader?.dispose();
    this.shader = undefined;
    this.revealImage();
  }

  private mount(img: HTMLImageElement, reduced: boolean): void {
    if (!this.isConnected || this.shader !== undefined) return;
    this.lostContext = false;
    this.removeAttribute("data-dither-fallback");
    const settings = parseImageDitherSettings(this.dataset.dither);
    try {
      this.shader = new ShaderMount(
        this,
        imageDitheringFragmentShader,
        imageDitherUniforms(settings, img),
        undefined,
        playbackSpeed(settings.speed, reduced),
        settings.frame,
        settings.minPixelRatio,
        settings.maxPixelCount,
      );
    } catch {
      this.showFallback();
      return;
    }
    this.shader.canvasElement.setAttribute("aria-hidden", "true");
    this.shader.canvasElement.addEventListener("webglcontextlost", this.onContextLost, { once: true });
    // The mount draws on its first rAF, queued before this one.
    requestAnimationFrame(() => {
      if (!this.isConnected || !this.shader) return;
      this.hideImage(img);
      this.setAttribute("data-dither-ready", "");
      this.dispatchEvent(new CustomEvent("dither:ready", { bubbles: true }));
    });
  }

  /** Remove Paper's partially constructed canvas and keep the full-size photograph. */
  private showFallback = (): void => {
    this.shader?.canvasElement.removeEventListener("webglcontextlost", this.onContextLost);
    this.shader?.dispose();
    this.shader = undefined;
    this.querySelectorAll("canvas").forEach((canvas) => canvas.remove());
    this.revealImage();
    this.setAttribute("data-dither-fallback", "");
    this.removeAttribute("data-dither-ready");
  };

  private onContextLost = (): void => {
    this.lostContext = true;
    this.showFallback();
  };

  /** Browsers drop contexts of background tabs; try again when the visitor comes back. */
  private onVisibilityChange = (): void => {
    if (document.hidden || !this.lostContext) return;
    const img = this.querySelector("img");
    if (img instanceof HTMLImageElement) this.load(img);
  };

  private hideImage(img: HTMLImageElement): void {
    img.style.position = "absolute";
    img.style.inset = "0";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.opacity = "0";
    img.style.pointerEvents = "none";
  }

  private revealImage(): void {
    const img = this.querySelector("img");
    if (img instanceof HTMLImageElement) {
      img.style.cssText = "display:block;position:absolute;inset:0;width:100%;height:100%;object-fit:cover";
    }
  }

  private onMotionChange = (): void => {
    const settings = parseImageDitherSettings(this.dataset.dither);
    const reduced = this.reducedMotion?.matches ?? false;
    this.shader?.setSpeed(playbackSpeed(settings.speed, reduced));
  };
}
