import { describe, expect, it } from "vitest";
import {
  defaultImageDither,
  imageDitherSettingsToAttribute,
  imageSource,
  parseImageDitherSettings,
} from "./image-dither";

describe("parseImageDitherSettings", () => {
  it("uses the Paper default when nothing is passed", () => {
    expect(parseImageDitherSettings(undefined)).toEqual(defaultImageDither);
    expect(parseImageDitherSettings("{}")).toEqual(defaultImageDither);
    expect(parseImageDitherSettings("not json")).toEqual(defaultImageDither);
  });

  it("keeps a known type, fit, and flags", () => {
    const settings = parseImageDitherSettings({
      type: "2x2",
      fit: "contain",
      size: 3,
      colorSteps: 4,
      originalColors: true,
      inverted: true,
    });

    expect(settings.type).toBe("2x2");
    expect(settings.fit).toBe("contain");
    expect(settings.size).toBe(3);
    expect(settings.colorSteps).toBe(4);
    expect(settings.originalColors).toBe(true);
    expect(settings.inverted).toBe(true);
  });

  it("drops values the shader does not understand", () => {
    const settings = parseImageDitherSettings({
      type: "floyd",
      fit: "stretch",
      size: "big",
      colorSteps: Number.NaN,
      originalColors: "yes",
      inverted: 1,
    });

    expect(settings).toEqual(defaultImageDither);
  });

  it("round-trips props through the data attribute", () => {
    const encoded = imageDitherSettingsToAttribute({
      colorFront: "#f4f1ea",
      type: "random",
      fit: "cover",
      size: 1.5,
      originalColors: true,
      inverted: true,
      speed: 0.5,
    });

    expect(JSON.parse(encoded)).toEqual({
      colorFront: "#f4f1ea",
      type: "random",
      fit: "cover",
      size: 1.5,
      originalColors: true,
      inverted: true,
      speed: 0.5,
    });
    expect(parseImageDitherSettings(encoded)).toMatchObject({
      colorFront: "#f4f1ea",
      type: "random",
      originalColors: true,
      inverted: true,
      speed: 0.5,
      colorBack: defaultImageDither.colorBack,
    });
  });

  it("writes only the keys the shader knows", () => {
    const encoded = imageDitherSettingsToAttribute({});
    expect(JSON.parse(encoded)).toEqual({});
  });
});

describe("imageSource", () => {
  it("reads a path and an Astro image import", () => {
    expect(imageSource("/examples/portrait.jpg")).toBe("/examples/portrait.jpg");
    expect(imageSource({ src: "/_astro/portrait.hash.jpg" })).toBe("/_astro/portrait.hash.jpg");
  });
});
