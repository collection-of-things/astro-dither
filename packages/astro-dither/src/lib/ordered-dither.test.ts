import { describe, expect, it } from "vitest";
import { effects } from "./effects";
import { auroraPalette, globePoint, mixHex, parseCssColor, parseOrderedDither, studioCities } from "./ordered-dither";

describe("auroraPalette", () => {
  it("runs from the sky to a lightened edge colour", () => {
    expect(auroraPalette("#000000", "#ff0000", "#0000ff")).toEqual(["#000000", "#730000", "#ff0000", "#0000ff", "#9999ff"]);
  });

  it("leaves non-hex colours unmixed", () => {
    expect(mixHex("red", "#ffffff", 0.5)).toBe("red");
  });
});

describe("levels and stillTime", () => {
  it("defaults to every tone and the effect's own still time", () => {
    const settings = parseOrderedDither({ effect: "plasma" });
    expect(settings.levels).toBe(0);
    expect(settings.stillTime).toBe(5);
  });

  it("rounds levels and keeps a custom still time", () => {
    const settings = parseOrderedDither({ effect: "plasma", levels: 3.6, stillTime: 12 });
    expect(settings.levels).toBe(4);
    expect(settings.stillTime).toBe(12);
  });
});

describe("parseOrderedDither", () => {
  it("falls back to the gradient effect for unknown names", () => {
    expect(parseOrderedDither({ effect: "nope" }).effect).toBe("gradient");
    expect(parseOrderedDither({ effect: 42 }).effect).toBe("gradient");
    expect(parseOrderedDither("not json").effect).toBe("gradient");
  });

  it("keeps a known effect", () => {
    expect(parseOrderedDither({ effect: "aurora" }).effect).toBe("aurora");
    expect(parseOrderedDither({ effect: "retro-grid" }).effect).toBe("retro-grid");
  });

  it("keeps only the params the effect declares, and only finite numbers", () => {
    const settings = parseOrderedDither({
      effect: "glow",
      params: { radius: 0.9, bogus: 5, cx: "wide", power: Number.NaN },
    });

    expect(settings.params.radius).toBe(0.9);
    expect(settings.params.cx).toBe(effects.glow.params.cx);
    expect(settings.params.power).toBe(effects.glow.params.power);
    expect("bogus" in settings.params).toBe(false);
  });

  it("accepts 2 and 8 palette colours, rejects 1 and 9", () => {
    const two = parseOrderedDither({ effect: "plasma", palette: ["#000", "#fff"] });
    expect(two.palette).toHaveLength(2);

    const eight = parseOrderedDither({
      effect: "plasma",
      palette: ["#000000", "#111111", "#222222", "#333333", "#444444", "#555555", "#666666", "#777777"],
    });
    expect(eight.palette).toHaveLength(8);

    const one = parseOrderedDither({ effect: "plasma", palette: ["#fff"] });
    expect(one.palette).toHaveLength(effects.plasma.palette.length);

    const nine = parseOrderedDither({
      effect: "plasma",
      palette: ["#111111", "#222222", "#333333", "#444444", "#555555", "#666666", "#777777", "#888888", "#999999"],
    });
    expect(nine.palette).toHaveLength(effects.plasma.palette.length);
  });

  it("accepts 2, 4, 8 and noise matrices, rejects the rest", () => {
    expect(parseOrderedDither({ matrix: 2 }).matrix).toBe(2);
    expect(parseOrderedDither({ matrix: 4 }).matrix).toBe(4);
    expect(parseOrderedDither({ matrix: 8 }).matrix).toBe(8);
    expect(parseOrderedDither({ matrix: "noise" }).matrix).toBe("noise");
    expect(parseOrderedDither({ matrix: 16 }).matrix).toBe(8);
    expect(parseOrderedDither({ matrix: "blue" }).matrix).toBe(8);
  });

  it("defaults speed to the effect default and rejects negatives", () => {
    expect(parseOrderedDither({ effect: "aurora" }).speed).toBe(effects.aurora.speed);
    expect(parseOrderedDither({ effect: "aurora", speed: -1 }).speed).toBe(effects.aurora.speed);
    expect(parseOrderedDither({ effect: "aurora", speed: 0.3 }).speed).toBe(0.3);
    expect(parseOrderedDither({ effect: "aurora", speed: "fast" }).speed).toBe(effects.aurora.speed);
    expect(parseOrderedDither({ effect: "gradient" }).speed).toBe(0);
  });
});

describe("effects registry", () => {
  it("every effect param has a slider range that covers its default", () => {
    for (const [name, def] of Object.entries(effects)) {
      for (const [key, value] of Object.entries(def.params)) {
        const range = def.ranges?.[key];
        expect(range, `${name}.${key}`).toBeDefined();
        if (range === undefined) continue;
        expect(range.min, `${name}.${key}`).toBeLessThan(range.max);
        expect(range.step, `${name}.${key}`).toBeGreaterThan(0);
        expect(value, `${name}.${key} default`).toBeGreaterThanOrEqual(range.min);
        expect(value, `${name}.${key} default`).toBeLessThanOrEqual(range.max);
      }
    }
  });

  it("every effect has 2-8 valid palette colours and a field() definition", () => {
    for (const [name, def] of Object.entries(effects)) {
      expect(def.palette.length, name).toBeGreaterThanOrEqual(2);
      expect(def.palette.length, name).toBeLessThanOrEqual(8);
      for (const colour of def.palette) {
        expect(parseCssColor(colour), `${name} ${colour}`).toBeDefined();
      }
      expect(def.field, name).toContain("float field(");
    }
  });
});

describe("parseCssColor", () => {
  it("reads hex and transparent", () => {
    expect(parseCssColor("#fff")).toEqual([1, 1, 1, 1]);
    expect(parseCssColor("transparent")).toEqual([0, 0, 0, 0]);
    expect(parseCssColor("nope")).toBeUndefined();
  });
});

describe("globePoint", () => {
  const center = { lat: 20, lon: 48 };

  it("puts the centre of the globe in the middle", () => {
    const point = globePoint(center.lat, center.lon, center.lat, center.lon);
    expect(point.x).toBeCloseTo(0.5, 5);
    expect(point.y).toBeCloseTo(0.5, 5);
    expect(point.visible).toBe(true);
  });

  it("shows the studio cities and hides the far side", () => {
    for (const city of studioCities) {
      expect(globePoint(city.lat, city.lon, center.lat, center.lon).visible).toBe(true);
    }
    expect(globePoint(40.7, -74, center.lat, center.lon).visible).toBe(false);
  });
});
