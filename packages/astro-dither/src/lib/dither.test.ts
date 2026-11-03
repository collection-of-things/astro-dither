import { DitheringShapes, DitheringTypes, ShaderFitOptions, getShaderColorFromString } from "@paper-design/shaders";
import { describe, expect, it } from "vitest";
import {
  defaultDither,
  ditherSettingsToAttribute,
  ditherUniforms,
  parseDitherSettings,
  playbackSpeed,
} from "./dither";

describe("parseDitherSettings", () => {
  it("uses the Paper default when nothing is passed", () => {
    expect(parseDitherSettings(undefined)).toEqual(defaultDither);
    expect(parseDitherSettings("{}")).toEqual(defaultDither);
    expect(parseDitherSettings("not json")).toEqual(defaultDither);
  });

  it("keeps a known shape, matrix, and fit", () => {
    const settings = parseDitherSettings({
      shape: "swirl",
      type: "8x8",
      fit: "contain",
      size: 3,
      speed: 0.5,
    });

    expect(settings.shape).toBe("swirl");
    expect(settings.type).toBe("8x8");
    expect(settings.fit).toBe("contain");
    expect(settings.size).toBe(3);
    expect(settings.speed).toBe(0.5);
    expect(settings.colorFront).toBe(defaultDither.colorFront);
  });

  it("drops values the shader does not understand", () => {
    const settings = parseDitherSettings({
      shape: "hex",
      type: "floyd",
      fit: "stretch",
      size: Number.NaN,
      speed: "fast",
    });

    expect(settings).toEqual(defaultDither);
  });

  it("round-trips props through the data attribute", () => {
    const encoded = ditherSettingsToAttribute({
      colorFront: "#ffffff",
      shape: "wave",
      size: 11,
    });

    expect(JSON.parse(encoded)).toEqual({
      colorFront: "#ffffff",
      shape: "wave",
      size: 11,
    });
    expect(parseDitherSettings(encoded)).toMatchObject({
      colorFront: "#ffffff",
      shape: "wave",
      size: 11,
      colorBack: defaultDither.colorBack,
    });
  });
});

describe("ditherUniforms", () => {
  it("maps names onto Paper's uniform numbers", () => {
    const uniforms = ditherUniforms(defaultDither);

    expect(uniforms.u_shape).toBe(DitheringShapes.sphere);
    expect(uniforms.u_type).toBe(DitheringTypes["4x4"]);
    expect(uniforms.u_fit).toBe(ShaderFitOptions.none);
    expect(uniforms.u_pxSize).toBe(2);
    expect(uniforms.u_colorFront).toEqual(getShaderColorFromString("#00b2ff"));
    expect(uniforms.u_colorBack).toEqual(getShaderColorFromString("#000000"));
  });
});

describe("playbackSpeed", () => {
  it("stops the loop when the user prefers reduced motion", () => {
    expect(playbackSpeed(1, true)).toBe(0);
    expect(playbackSpeed(0.4, false)).toBe(0.4);
  });
});
