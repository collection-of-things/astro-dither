import { effects, type EffectDefinition, type EffectName } from "./effects";
import { parseOrderedDither, type DitherMatrix, type OrderedDitherSettings } from "./ordered-dither";

const ELEMENT_NAME = "dither-surface";

const VERTEX = `#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_HEAD = `#version 300 es
precision mediump float;

uniform vec2 u_resolution;
uniform float u_cell;
uniform float u_matrix;
uniform float u_time;
uniform sampler2D u_image;
uniform vec4 u_palette[8];
uniform float u_colorCount;
uniform float u_levels;

out vec4 fragColor;

const float PI = 3.14159265359;
`;

const FRAGMENT_HELPERS = /* glsl */ `
float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * vnoise(p);
    p = p * 2.03 + vec2(13.7, 9.1);
    a *= 0.5;
  }
  return v;
}

float bayer2(vec2 cell) {
  vec2 p = mod(cell, 2.0);
  float i = p.y * 2.0 + p.x;
  if (i < 0.5) return 0.0;
  if (i < 1.5) return 2.0;
  if (i < 2.5) return 3.0;
  return 1.0;
}

float bayer4(vec2 cell) {
  vec2 p = mod(cell, 4.0);
  float x = p.x;
  float y = p.y;
  if (y < 0.5) return x < 0.5 ? 0.0 : x < 1.5 ? 8.0 : x < 2.5 ? 2.0 : 10.0;
  if (y < 1.5) return x < 0.5 ? 12.0 : x < 1.5 ? 4.0 : x < 2.5 ? 14.0 : 6.0;
  if (y < 2.5) return x < 0.5 ? 3.0 : x < 1.5 ? 11.0 : x < 2.5 ? 1.0 : 9.0;
  return x < 0.5 ? 15.0 : x < 1.5 ? 7.0 : x < 2.5 ? 13.0 : 5.0;
}

float bayer8(vec2 cell) {
  vec2 block = mod(cell, 8.0);
  vec2 sub = mod(block, 4.0);
  float base = bayer4(sub);
  float ox = step(3.5, block.x);
  float oy = step(3.5, block.y);
  float quadrant = oy * 2.0 + ox;
  float offset = quadrant < 0.5 ? 0.0 : quadrant < 1.5 ? 2.0 : quadrant < 2.5 ? 3.0 : 1.0;
  return base * 4.0 + offset;
}

float ign(vec2 cell) {
  return fract(52.9829189 * fract(cell.x * 0.06711056 + cell.y * 0.00583715));
}

float threshold(vec2 cell) {
  if (u_matrix < 1.5) return ign(cell);
  if (u_matrix < 3.0) return (bayer2(cell) + 0.5) / 4.0;
  if (u_matrix < 6.0) return (bayer4(cell) + 0.5) / 16.0;
  return (bayer8(cell) + 0.5) / 64.0;
}
`;

const FRAGMENT_MAIN = /* glsl */ `
void main() {
  float cell = max(u_cell, 1.0);
  vec2 cellCoord = floor(gl_FragCoord.xy / cell);
  vec2 samplePx = (cellCoord + 0.5) * cell;
  vec2 uv = samplePx / u_resolution;
  vec2 res = u_resolution / cell;

  float tone = field(uv, res, u_time);
  if (tone < 0.0) {
    fragColor = vec4(0.0);
    return;
  }

  if (u_levels > 1.5) tone = floor(clamp(tone, 0.0, 1.0) * (u_levels - 1.0) + 0.5) / (u_levels - 1.0);

  float steps = max(u_colorCount - 1.0, 1.0);
  float scaled = clamp(tone, 0.0, 1.0) * steps;
  float base = floor(scaled);
  float frac = scaled - base;
  float quant = clamp(base + step(threshold(cellCoord), frac), 0.0, steps);
  fragColor = u_palette[int(quant + 0.5)];
}
`;

const SHARED_UNIFORMS = [
  "u_resolution",
  "u_cell",
  "u_matrix",
  "u_time",
  "u_image",
  "u_palette[0]",
  "u_colorCount",
  "u_levels",
];

interface OrderedRenderer {
  gl: WebGL2RenderingContext;
  canvas: HTMLCanvasElement;
  programs: Map<EffectName, EffectProgram | "failed">;
}

interface EffectProgram {
  program: WebGLProgram;
  locations: Record<string, WebGLUniformLocation | null>;
}

let renderer: OrderedRenderer | "failed" | undefined;

/** One shared GL context for every `<dither-surface>`. Browsers cap live WebGL contexts per page, so each element owns a 2D canvas and copies its frame out. */
function getRenderer(): OrderedRenderer | undefined {
  if (renderer === "failed") return undefined;
  if (renderer) return renderer;
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2", { alpha: true, antialias: false, premultipliedAlpha: false });
  if (!gl) {
    renderer = "failed";
    return undefined;
  }
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.SCISSOR_TEST);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  renderer = { gl, canvas, programs: new Map() };
  return renderer;
}

/** Compile and cache one program per effect, with the shared and `p_*` uniform locations. */
function getProgram(name: EffectName): EffectProgram | undefined {
  const shared = getRenderer();
  if (shared === undefined) return undefined;
  const cached = shared.programs.get(name);
  if (cached === "failed") return undefined;
  if (cached) return cached;

  const { gl } = shared;
  const def = effects[name];
  const decls = Object.keys(def.params)
    .map((key) => `uniform float p_${key};`)
    .join("\n");
  const source = `${FRAGMENT_HEAD}${decls}\n${FRAGMENT_HELPERS}${def.field}${FRAGMENT_MAIN}`;
  const program = createProgram(gl, VERTEX, source, name);
  if (program === undefined) {
    shared.programs.set(name, "failed");
    return undefined;
  }
  const locations: Record<string, WebGLUniformLocation | null> = {};
  for (const uniform of SHARED_UNIFORMS) locations[uniform] = gl.getUniformLocation(program, uniform);
  for (const key of Object.keys(def.params)) locations[`p_${key}`] = gl.getUniformLocation(program, `p_${key}`);
  const entry: EffectProgram = { program, locations };
  shared.programs.set(name, entry);
  return entry;
}

/** Register `<dither-surface>` once per page. */
export function defineOrderedDither(): void {
  if (customElements.get(ELEMENT_NAME)) return;
  customElements.define(ELEMENT_NAME, DitherSurface);
}

/**
 * One ordered-dither canvas. Draws once, and again when the box resizes. Speed above 0 runs a frame loop.
 * With `bloom` above 0 a blurred copy of each frame sits on top in screen blend, so lit cells bloom.
 * The bloom reads `--dither-bloom` (strength) and `--dither-bloom-radius` (blur) from CSS, so pages can
 * change it on hover or with a transition.
 */
class DitherSurface extends HTMLElement {
  private canvas: HTMLCanvasElement | undefined;
  private ctx2d: CanvasRenderingContext2D | undefined;
  private bloomCtx: CanvasRenderingContext2D | undefined;
  private texture: WebGLTexture | undefined;
  private resizeObserver: ResizeObserver | undefined;
  private intersectionObserver: IntersectionObserver | undefined;
  private reducedMotion: MediaQueryList | undefined;
  private settings: OrderedDitherSettings | undefined;
  private rafId: number | undefined;
  private inViewport = true;
  private clock = 0;
  private lastTick = 0;
  private readySent = false;
  private glCanvas: HTMLCanvasElement | undefined;

  connectedCallback(): void {
    const settings = parseOrderedDither(this.dataset.dither);
    this.settings = settings;
    this.removeAttribute("data-dither-fallback");
    this.removeAttribute("data-dither-ready");
    this.style.removeProperty("background");
    this.bloomCtx = undefined;
    this.readySent = false;
    const canvas = document.createElement("canvas");
    // The canvas is sized in whole cells, so it can overhang the host by part of one; draw()
    // clips that part off. Taking it out of flow keeps it from feeding back into the host's size.
    canvas.style.cssText = "position:absolute;left:0;top:0;display:block;image-rendering:pixelated";
    if (getComputedStyle(this).position === "static") this.style.position = "relative";
    this.canvas = canvas;
    this.replaceChildren(canvas);
    this.ctx2d = canvas.getContext("2d") ?? undefined;
    if (this.ctx2d === undefined || getRenderer() === undefined || getProgram(settings.effect) === undefined) {
      this.showFallback();
      return;
    }
    this.glCanvas = getRenderer()?.canvas;
    this.glCanvas?.addEventListener("webglcontextlost", this.onContextLost);
    if (settings.bloom > 0) this.bloomCtx = this.createBloom(settings);

    this.resizeObserver = new ResizeObserver(() => this.draw());
    this.resizeObserver.observe(this);
    this.intersectionObserver = new IntersectionObserver((entries) => {
      this.inViewport = entries[0]?.isIntersecting ?? true;
      this.updatePlayback();
    });
    this.intersectionObserver.observe(this);
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.reducedMotion.addEventListener("change", this.onPreferenceChange);
    document.addEventListener("visibilitychange", this.onPreferenceChange);

    const def: EffectDefinition = effects[settings.effect];
    if (def.usesImage === true && settings.src !== "") {
      const image = new Image();
      image.onload = () => {
        if (!this.isConnected) return;
        const shared = getRenderer();
        try {
          if (shared) this.texture = createTexture(shared.gl, image);
        } catch {
          this.showFallback();
          return;
        }
        if (!this.texture) {
          this.showFallback();
          return;
        }
        this.draw();
        this.updatePlayback();
      };
      image.onerror = () => this.showFallback();
      image.src = settings.src;
      return;
    }
    if (def.usesImage === true) {
      this.showFallback();
      return;
    }
    this.draw();
    this.updatePlayback();
  }

  disconnectedCallback(): void {
    this.pause();
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    this.reducedMotion?.removeEventListener("change", this.onPreferenceChange);
    document.removeEventListener("visibilitychange", this.onPreferenceChange);
    if (renderer !== undefined && renderer !== "failed" && this.texture) {
      renderer.gl.deleteTexture(this.texture);
    }
    this.texture = undefined;
    this.glCanvas?.removeEventListener("webglcontextlost", this.onContextLost);
  }

  /** Keep a visible palette preview when WebGL or the globe texture cannot draw. */
  private showFallback(): void {
    this.pause();
    const settings = this.settings;
    if (!settings) return;
    const colors = settings.palette.map((color) =>
      `rgb(${color.slice(0, 3).map((value) => Math.round(value * 255)).join(" ")} / ${color[3]})`,
    );
    this.style.background = settings.effect === "globe"
      ? `radial-gradient(circle closest-side, ${colors.join(", ")}, transparent 100%)`
      : `linear-gradient(135deg, ${colors.join(", ")})`;
    if (this.canvas) this.canvas.style.display = "none";
    if (this.bloomCtx) this.bloomCtx.canvas.style.display = "none";
    this.setAttribute("data-dither-fallback", "");
    this.removeAttribute("data-dither-ready");
  }

  private onContextLost = (): void => {
    renderer = "failed";
    this.showFallback();
  };

  /** The bloom layer: a half-resolution copy, smoothly scaled, blurred and screened over the dither. */
  private createBloom(settings: OrderedDitherSettings): CanvasRenderingContext2D | undefined {
    const glow = document.createElement("canvas");
    glow.setAttribute("data-dither-bloom", "");
    glow.style.cssText = [
      "position:absolute",
      "left:0",
      "top:0",
      "display:block",
      "pointer-events:none",
      "mix-blend-mode:screen",
      `opacity:var(--dither-bloom, ${settings.bloom})`,
      `filter:blur(var(--dither-bloom-radius, ${settings.bloomRadius}px)) saturate(1.4)`,
      "transition:opacity 300ms ease",
    ].join(";");
    this.append(glow);
    return glow.getContext("2d") ?? undefined;
  }

  private draw(): void {
    if (this.hasAttribute("data-dither-fallback")) return;
    const shared = getRenderer();
    const ctx2d = this.ctx2d;
    const settings = this.settings;
    const canvas = this.canvas;
    if (!shared || !ctx2d || !settings || !canvas) return;
    const def: EffectDefinition = effects[settings.effect];
    if (def.usesImage === true && this.texture === undefined) return;
    const entry = getProgram(settings.effect);
    if (entry === undefined) return;

    // The shader output is flat inside each dither cell, so render one canvas
    // pixel per cell and let CSS scale it up with hard edges. That is cell² × dpr²
    // fewer pixels to shade and to copy out of the shared context.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cellPx = Math.max(1, Math.round(settings.cell * dpr));
    const width = Math.max(1, Math.ceil((this.clientWidth * dpr) / cellPx));
    const height = Math.max(1, Math.ceil((this.clientHeight * dpr) / cellPx));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      // Exact multiples of the cell keep every cell the same size; clip the overhang.
      const cssWidth = (width * cellPx) / dpr;
      const cssHeight = (height * cellPx) / dpr;
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      const overX = Math.max(0, cssWidth - this.clientWidth);
      const overY = Math.max(0, cssHeight - this.clientHeight);
      canvas.style.clipPath = `inset(0 ${overX}px ${overY}px 0)`;
      const glow = this.bloomCtx?.canvas;
      if (glow) {
        glow.width = Math.max(1, Math.ceil(width / 2));
        glow.height = Math.max(1, Math.ceil(height / 2));
        glow.style.width = `${cssWidth}px`;
        glow.style.height = `${cssHeight}px`;
      }
    }
    if (shared.canvas.width < width) shared.canvas.width = width;
    if (shared.canvas.height < height) shared.canvas.height = height;

    const { gl } = shared;
    const { program, locations } = entry;
    gl.viewport(0, 0, width, height);
    gl.scissor(0, 0, width, height);
    gl.useProgram(program);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    setFloat(locations, gl, "u_cell", 1);
    setFloat(locations, gl, "u_matrix", matrixNumber(settings.matrix));
    setVec2(locations, gl, "u_resolution", width, height);
    setFloat(locations, gl, "u_time", settings.stillTime + this.clock);
    for (const [key, value] of Object.entries(settings.params)) {
      setFloat(locations, gl, `p_${key}`, value);
    }
    const flat = settings.palette.flat();
    gl.uniform4fv(locations["u_palette[0]"], flat.concat(new Array(32 - flat.length).fill(0)));
    setFloat(locations, gl, "u_colorCount", settings.palette.length);
    setFloat(locations, gl, "u_levels", settings.levels);

    if (this.texture) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.uniform1i(locations.u_image, 0);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    // Palettes may hold transparent colours, so wipe the last frame before copying the new one.
    ctx2d.clearRect(0, 0, width, height);
    ctx2d.drawImage(shared.canvas, 0, shared.canvas.height - height, width, height, 0, 0, width, height);
    const bloomCtx = this.bloomCtx;
    if (bloomCtx) {
      const { width: gw, height: gh } = bloomCtx.canvas;
      bloomCtx.clearRect(0, 0, gw, gh);
      bloomCtx.drawImage(canvas, 0, 0, gw, gh);
    }
    if (!this.readySent) {
      this.readySent = true;
      this.setAttribute("data-dither-ready", "");
      this.dispatchEvent(new CustomEvent("dither:ready", { bubbles: true }));
    }
  }

  /** The loop only runs while the element is on screen, the tab is visible, and motion is allowed. */
  private updatePlayback(): void {
    const settings = this.settings;
    const animate =
      settings !== undefined &&
      !this.hasAttribute("data-dither-fallback") &&
      settings.speed > 0 &&
      this.inViewport &&
      !document.hidden &&
      !(this.reducedMotion?.matches ?? false);
    if (animate) {
      this.play();
    } else {
      this.pause();
    }
  }

  private play(): void {
    if (this.rafId !== undefined) return;
    this.lastTick = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  private pause(): void {
    if (this.rafId === undefined) return;
    cancelAnimationFrame(this.rafId);
    this.rafId = undefined;
  }

  private tick = (now: number): void => {
    const speed = this.settings?.speed ?? 0;
    this.clock += (Math.max(0, now - this.lastTick) / 1000) * speed;
    this.lastTick = now;
    this.draw();
    this.rafId = requestAnimationFrame(this.tick);
  };

  private onPreferenceChange = (): void => {
    this.updatePlayback();
  };
}

function matrixNumber(matrix: DitherMatrix): number {
  return matrix === "noise" ? 1 : matrix;
}

function setFloat(
  locations: Record<string, WebGLUniformLocation | null>,
  gl: WebGL2RenderingContext,
  name: string,
  value: number,
): void {
  const location = locations[name];
  if (location) gl.uniform1f(location, value);
}

function setVec2(
  locations: Record<string, WebGLUniformLocation | null>,
  gl: WebGL2RenderingContext,
  name: string,
  x: number,
  y: number,
): void {
  const location = locations[name];
  if (location) gl.uniform2f(location, x, y);
}

function createTexture(gl: WebGL2RenderingContext, image: HTMLImageElement): WebGLTexture | undefined {
  const texture = gl.createTexture();
  if (texture === null) return undefined;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

function createProgram(gl: WebGL2RenderingContext, vertex: string, fragment: string, effectName: EffectName): WebGLProgram | undefined {
  const program = gl.createProgram();
  const vs = compile(gl, gl.VERTEX_SHADER, vertex, effectName);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragment, effectName);
  if (program === null || vs === undefined || fs === undefined) return undefined;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.bindAttribLocation(program, 0, "a_position");
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(`dither-surface: program link failed for effect "${effectName}":`, gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return undefined;
  }
  return program;
}

function compile(gl: WebGL2RenderingContext, type: number, source: string, effectName: EffectName): WebGLShader | undefined {
  const shader = gl.createShader(type);
  if (shader === null) return undefined;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const stage = type === gl.VERTEX_SHADER ? "vertex" : "fragment";
    console.error(`dither-surface: ${stage} shader compile failed for effect "${effectName}":`, gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return undefined;
  }
  return shader;
}
