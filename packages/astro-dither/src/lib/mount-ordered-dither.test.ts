import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Run custom-element callbacks with observable attributes and canvas children. */
class TestElement extends EventTarget {
  private attributes = new Map<string, string>();
  dataset: { dither?: string } = {};
  children: TestElement[] = [];
  isConnected = false;
  clientWidth = 800;
  clientHeight = 600;
  style = {
    cssText: "", width: "", height: "", display: "", position: "", background: "", clipPath: "",
    removeProperty(key: string) { Reflect.deleteProperty(this, key); },
  };

  /** Deliver observed setting changes to the real element subclass. */
  setAttribute(name: string, value: string): void {
    const before = this.attributes.get(name) ?? null;
    this.attributes.set(name, value);
    if (name === "data-dither") {
      this.dataset.dither = value;
      this.attributeChangedCallback(name, before, value);
    }
  }

  /** Expose fallback and readiness state without a browser DOM. */
  hasAttribute(name: string): boolean { return this.attributes.has(name); }
  /** Clear fallback and readiness state. */
  removeAttribute(name: string): void { this.attributes.delete(name); }
  /** Mount the renderer's output canvas. */
  replaceChildren(...children: TestElement[]): void { this.children = children; }
  /** Mount the optional bloom canvas. */
  append(child: TestElement): void { this.children.push(child); }
  /** Supply the canvas removal boundary. */
  remove(): void {}
  /** Overridden by the registered custom element on connection. */
  connectedCallback(): void {}
  /** Overridden by the registered custom element on removal. */
  disconnectedCallback(): void {}
  /** Overridden by the registered custom element when settings change. */
  attributeChangedCallback(_name: string, _before: string | null, _after: string | null): void {}
}

/** Record GPU resource ownership and shader inputs without pretending to render pixels. */
function createGraphics() {
  const textures = new Set<object>();
  const uniforms = new Map<string, number>();
  return {
    textures,
    uniforms,
    NO_ERROR: 0,
    createBuffer: vi.fn(() => ({})),
    createProgram: vi.fn(() => ({})),
    createShader: vi.fn(() => ({})),
    createTexture: vi.fn(() => {
      const texture = {};
      textures.add(texture);
      return texture;
    }),
    deleteTexture: vi.fn((texture: object) => textures.delete(texture)),
    getError: vi.fn(() => 0),
    getProgramParameter: vi.fn(() => true),
    getShaderParameter: vi.fn(() => true),
    getUniformLocation: vi.fn((_program: object, name: string) => ({ name })),
    uniform1f: vi.fn((location: { name: string }, value: number) => uniforms.set(location.name, value)),
    enable: vi.fn(), blendFunc: vi.fn(), bindBuffer: vi.fn(), bufferData: vi.fn(),
    enableVertexAttribArray: vi.fn(), vertexAttribPointer: vi.fn(), shaderSource: vi.fn(),
    compileShader: vi.fn(), attachShader: vi.fn(), bindAttribLocation: vi.fn(), linkProgram: vi.fn(),
    deleteShader: vi.fn(), viewport: vi.fn(), scissor: vi.fn(), useProgram: vi.fn(),
    clearColor: vi.fn(), clear: vi.fn(), uniform2f: vi.fn(), uniform4fv: vi.fn(),
    activeTexture: vi.fn(), bindTexture: vi.fn(), uniform1i: vi.fn(), drawArrays: vi.fn(),
    pixelStorei: vi.fn(), texImage2D: vi.fn(), texParameteri: vi.fn(),
  };
}

/** Change the OS motion preference through the same event the renderer subscribes to. */
class MotionPreference extends EventTarget {
  matches = false;

  /** Notify connected surfaces after changing the preference. */
  setReduced(reduced: boolean): void {
    this.matches = reduced;
    this.dispatchEvent(new Event("change"));
  }
}

/** Stub browser-only boundaries while importing and running the actual surface implementation. */
function createEnvironment() {
  const graphics = createGraphics();
  const motion = new MotionPreference();
  const registered = new Map<string, typeof TestElement>();
  const frames = new Map<number, FrameRequestCallback>();
  const mounted = new Set<TestElement>();
  let frameId = 0;
  let now = 0;
  let webglCanvas: TestElement | undefined;

  /** Keep logical output size separate from CSS size, as a browser canvas does. */
  class TestCanvas extends TestElement {
    width = 300;
    height = 150;

    /** Substitute only WebGL and 2D drawing calls. */
    getContext(kind: string) {
      if (kind === "webgl2") {
        webglCanvas = this;
        return graphics;
      }
      return { canvas: this, clearRect: vi.fn(), drawImage: vi.fn() };
    }
  }

  const images: TestImage[] = [];
  /** Complete image requests explicitly to exercise either loading order. */
  class TestImage {
    src = "";
    crossOrigin = "";
    onload = () => {};
    onerror = () => {};

    /** Capture requests instead of making network calls. */
    constructor() { images.push(this); }
  }

  const document = Object.assign(new EventTarget(), {
    hidden: false,
    createElement: () => new TestCanvas(),
  });
  const window = { devicePixelRatio: 1, matchMedia: () => motion };
  vi.stubGlobal("HTMLElement", TestElement);
  vi.stubGlobal("Image", TestImage);
  vi.stubGlobal("document", document);
  vi.stubGlobal("window", window);
  vi.stubGlobal("getComputedStyle", () => ({ position: "relative" }));
  vi.stubGlobal("customElements", {
    get: (name: string) => registered.get(name),
    define: (name: string, element: typeof TestElement) => registered.set(name, element),
  });
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++frameId, callback);
    return frameId;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.spyOn(performance, "now").mockImplementation(() => now);

  /** Connect an instance of the real registered surface with test dimensions. */
  function mount({ data, width = 800, height = 600 }: { data: Record<string, unknown>; width?: number; height?: number }) {
    const Surface = registered.get("dither-surface");
    if (!Surface) throw new Error("dither-surface was not registered");
    const surface = new Surface();
    surface.setAttribute("data-dither", JSON.stringify(data));
    surface.clientWidth = width;
    surface.clientHeight = height;
    surface.isConnected = true;
    mounted.add(surface);
    surface.connectedCallback();
    return surface;
  }

  /** Exercise the element's real teardown and reference counting. */
  function remove(surface: TestElement) {
    surface.isConnected = false;
    surface.disconnectedCallback();
    mounted.delete(surface);
  }

  /** Advance a single animation frame with a deterministic elapsed time. */
  function frame() {
    now += 100;
    for (const [id, callback] of [...frames]) {
      frames.delete(id);
      callback(now);
    }
  }

  /** Deliver browser context events and invalidate textures on context loss. */
  function contextEvent(name: "webglcontextlost" | "webglcontextrestored") {
    if (!webglCanvas) throw new Error("WebGL context was not created");
    if (name === "webglcontextlost") graphics.textures.clear();
    webglCanvas.dispatchEvent(new Event(name, { cancelable: true }));
  }

  /** Read the renderer's public output instead of reaching into its private state. */
  function canvasFor(surface: TestElement) {
    const canvas = surface.children.find((child) => child instanceof TestCanvas);
    if (!(canvas instanceof TestCanvas)) throw new Error("Surface has no output canvas");
    return canvas;
  }

  return { graphics, motion, document, window, images, frames, mounted, mount, remove, frame, contextEvent, canvasFor };
}

let environment: ReturnType<typeof createEnvironment>;

beforeEach(async () => {
  vi.resetModules();
  environment = createEnvironment();
  const { defineOrderedDither } = await import("./mount-ordered-dither");
  defineOrderedDither();
});

afterEach(() => {
  for (const surface of environment.mounted) environment.remove(surface);
  expect(environment.frames.size).toBe(0);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("surface sizing", () => {
  it.each([
    { width: 5120, height: 600, cell: 1, dpr: 1 },
    { width: 1200, height: 16000, cell: 2, dpr: 2 },
    { width: 10000, height: 9000, cell: 1, dpr: 1.25 },
  ])("fills a $width × $height container within the canvas limit", ({ width, height, cell, dpr }) => {
    environment.window.devicePixelRatio = dpr;
    const surface = environment.mount({ width, height, data: { effect: "gradient", cell, speed: 0, bloom: 1 } });
    const canvas = environment.canvasFor(surface);
    const cssWidth = parseFloat(canvas.style.width);
    const cssHeight = parseFloat(canvas.style.height);

    expect(canvas.width).toBeLessThanOrEqual(4096);
    expect(canvas.height).toBeLessThanOrEqual(4096);
    expect(cssWidth).toBeGreaterThanOrEqual(width);
    expect(cssHeight).toBeGreaterThanOrEqual(height);
    expect(cssWidth / canvas.width).toBeCloseTo(cssHeight / canvas.height);
    expect(surface.children[1]?.style.width).toBe(canvas.style.width);
    expect(surface.children[1]?.style.height).toBe(canvas.style.height);
  });

  it("keeps the requested cell size below the limit", () => {
    const surface = environment.mount({ width: 801, height: 601, data: { effect: "gradient", cell: 2, speed: 0 } });
    const canvas = environment.canvasFor(surface);
    expect(canvas.width).toBe(401);
    expect(canvas.height).toBe(301);
    expect(canvas.style.width).toBe("802px");
    expect(canvas.style.height).toBe("602px");
  });
});

describe("live playback settings", () => {
  it("uses the exact still time after playback and preserves the clock when resumed", () => {
    const settings = { effect: "plasma", speed: 1, stillTime: 5 };
    const surface = environment.mount({ data: settings });
    environment.frame();
    environment.frame();
    const movingTime = environment.graphics.uniforms.get("u_time");
    expect(movingTime).toBeCloseTo(5.2);

    surface.setAttribute("data-dither", JSON.stringify({ ...settings, speed: 0, stillTime: 12 }));
    expect(environment.graphics.uniforms.get("u_time")).toBe(12);
    expect(environment.frames.size).toBe(0);
    surface.setAttribute("data-dither", JSON.stringify({ ...settings, speed: 0, stillTime: 24 }));
    expect(environment.graphics.uniforms.get("u_time")).toBe(24);

    surface.setAttribute("data-dither", JSON.stringify(settings));
    expect(environment.graphics.uniforms.get("u_time")).toBe(movingTime);
    environment.frame();
    expect(environment.graphics.uniforms.get("u_time")).toBeCloseTo(5.3);
  });

  it("draws the requested still frame when reduced motion is enabled during playback", () => {
    const settings = { effect: "plasma", speed: 1, stillTime: 5 };
    const surface = environment.mount({ data: settings });
    environment.frame();
    environment.motion.setReduced(true);
    expect(environment.graphics.uniforms.get("u_time")).toBe(5);
    expect(environment.frames.size).toBe(0);

    surface.setAttribute("data-dither", JSON.stringify({ ...settings, stillTime: 12 }));
    expect(environment.graphics.uniforms.get("u_time")).toBe(12);
    environment.motion.setReduced(false);
    environment.frame();
    expect(environment.graphics.uniforms.get("u_time")).toBeCloseTo(12.2);
  });

  it("updates moving effects without replacing their canvas or restarting their clock", () => {
    const settings = { effect: "plasma", speed: 1, stillTime: 5 };
    const surface = environment.mount({ data: settings });
    const canvas = environment.canvasFor(surface);
    environment.frame();
    surface.setAttribute("data-dither", JSON.stringify({ ...settings, palette: ["#000", "#fff"] }));
    expect(environment.canvasFor(surface)).toBe(canvas);
    expect(environment.graphics.uniforms.get("u_time")).toBeCloseTo(5.1);
  });
});

describe("globe texture ownership", () => {
  it("shares an image until the last surface is removed", async () => {
    const data = { effect: "globe", src: "/land.png", speed: 0 };
    const first = environment.mount({ data });
    const second = environment.mount({ data });
    expect(environment.images).toHaveLength(1);
    environment.images[0]?.onload();
    await vi.waitFor(() => expect(first.hasAttribute("data-dither-ready")).toBe(true));
    expect(environment.graphics.createTexture).toHaveBeenCalledTimes(1);
    environment.remove(first);
    expect(environment.graphics.deleteTexture).not.toHaveBeenCalled();
    environment.remove(second);
    await vi.waitFor(() => expect(environment.graphics.textures.size).toBe(0));
    expect(environment.graphics.deleteTexture).toHaveBeenCalledTimes(1);
  });

  it.each(["stale-first", "replacement-first"])("ignores a stale load after recovery: %s", async (order) => {
    const surface = environment.mount({ data: { effect: "globe", src: "/land.png", speed: 0 } });
    environment.contextEvent("webglcontextlost");
    expect(surface.hasAttribute("data-dither-fallback")).toBe(true);
    environment.contextEvent("webglcontextrestored");
    expect(environment.images).toHaveLength(2);

    for (const index of order === "stale-first" ? [0, 1] : [1, 0]) {
      environment.images[index]?.onload();
      await Promise.resolve();
    }
    await vi.waitFor(() => expect(surface.hasAttribute("data-dither-ready")).toBe(true));
    expect(environment.graphics.createTexture).toHaveBeenCalledTimes(1);
    expect(environment.graphics.textures.size).toBe(1);
    environment.remove(surface);
    await vi.waitFor(() => expect(environment.graphics.textures.size).toBe(0));
    expect(environment.graphics.deleteTexture).toHaveBeenCalledTimes(1);
  });

  it("releases an image that finishes loading after its surface is removed", async () => {
    const surface = environment.mount({ data: { effect: "globe", src: "/land.png", speed: 0 } });
    environment.remove(surface);
    environment.images[0]?.onload();
    await vi.waitFor(() => expect(environment.graphics.deleteTexture).toHaveBeenCalledTimes(1));
    expect(environment.graphics.textures.size).toBe(0);
  });
});
