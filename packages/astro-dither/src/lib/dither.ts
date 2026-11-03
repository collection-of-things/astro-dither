import {
  DitheringShapes,
  DitheringTypes,
  ShaderFitOptions,
  defaultPatternSizing,
  getShaderColorFromString,
  type DitheringParams,
  type DitheringShape,
  type DitheringType,
  type DitheringUniforms,
  type ShaderFit,
  type ShaderMountUniforms,
} from "@paper-design/shaders";

/** Props for `<Dither />`. Names match the Paper React component. */
export interface DitherProps extends DitheringParams {
  /** Minimum device pixel ratio. Paper's default is 2. */
  minPixelRatio?: number;
  /**
   * Cap on physical pixels the shader will draw.
   * Paper's default is 1920 × 1080 × 4.
   */
  maxPixelCount?: number;
}

/** Settings after defaults and boundary checks. Every field is present. */
export interface ResolvedDither {
  colorBack: string;
  colorFront: string;
  shape: DitheringShape;
  type: DitheringType;
  size: number;
  speed: number;
  frame: number;
  fit: ShaderFit;
  scale: number;
  rotation: number;
  originX: number;
  originY: number;
  offsetX: number;
  offsetY: number;
  worldWidth: number;
  worldHeight: number;
  minPixelRatio: number;
  maxPixelCount: number;
}

/** Paper's published default: a blue sphere on black, 4×4 Bayer. */
export const defaultDither = {
  ...defaultPatternSizing,
  speed: 1,
  frame: 0,
  scale: 0.6,
  colorBack: "#000000",
  colorFront: "#00b2ff",
  shape: "sphere",
  type: "4x4",
  size: 2,
  minPixelRatio: 2,
  maxPixelCount: 1920 * 1080 * 4,
} satisfies ResolvedDither;

export interface DitherPreset {
  name: string;
  params: DitherProps;
}

/** Same looks as the Paper React presets, so the Astro component can be compared side by side. */
export const ditherPresets = [
  { name: "Sphere", params: {} },
  {
    name: "Warp",
    params: {
      fit: "contain",
      colorBack: "#301c2a",
      colorFront: "#56ae6c",
      shape: "warp",
      type: "4x4",
      size: 2.5,
      scale: 1,
    },
  },
  {
    name: "Wave",
    params: {
      colorBack: "#730d54",
      colorFront: "#00becc",
      shape: "wave",
      type: "4x4",
      size: 11,
      scale: 1.2,
    },
  },
  {
    name: "Ripple",
    params: {
      fit: "contain",
      colorBack: "#603520",
      colorFront: "#c67953",
      shape: "ripple",
      type: "2x2",
      size: 3,
      scale: 1,
    },
  },
  {
    name: "Dots",
    params: {
      colorBack: "#000000",
      colorFront: "#008000",
      shape: "dots",
      type: "random",
      size: 9,
      scale: 1,
    },
  },
  {
    name: "Swirl",
    params: {
      fit: "contain",
      colorBack: "#00000000",
      colorFront: "#47a8e1",
      shape: "swirl",
      type: "8x8",
      size: 2,
      scale: 1,
    },
  },
] satisfies DitherPreset[];

/**
 * Turn component props into the attribute the custom element reads.
 * Only known settings are kept, so `class` and other HTML props stay out of the shader.
 */
export function ditherSettingsToAttribute(props: DitherProps): string {
  const record: Record<string, string | number> = {};
  const colorBack = readPassedString(props.colorBack);
  const colorFront = readPassedString(props.colorFront);
  if (colorBack !== undefined) record.colorBack = colorBack;
  if (colorFront !== undefined) record.colorFront = colorFront;
  if (isDitheringShape(props.shape)) record.shape = props.shape;
  if (isDitheringType(props.type)) record.type = props.type;
  if (isShaderFit(props.fit)) record.fit = props.fit;
  writeNumber(record, "size", props.size);
  writeNumber(record, "speed", props.speed);
  writeNumber(record, "frame", props.frame);
  writeNumber(record, "scale", props.scale);
  writeNumber(record, "rotation", props.rotation);
  writeNumber(record, "originX", props.originX);
  writeNumber(record, "originY", props.originY);
  writeNumber(record, "offsetX", props.offsetX);
  writeNumber(record, "offsetY", props.offsetY);
  writeNumber(record, "worldWidth", props.worldWidth);
  writeNumber(record, "worldHeight", props.worldHeight);
  writeNumber(record, "minPixelRatio", props.minPixelRatio);
  writeNumber(record, "maxPixelCount", props.maxPixelCount);
  return JSON.stringify(record);
}

/**
 * Parse props or the `data-dither` attribute. Bad values fall back to `defaultDither`
 * instead of reaching the shader.
 */
export function parseDitherSettings(input: unknown): ResolvedDither {
  const record = toRecord(input);
  if (record === undefined) return defaultDither;

  return {
    colorBack: readString(record, "colorBack", defaultDither.colorBack),
    colorFront: readString(record, "colorFront", defaultDither.colorFront),
    shape: readShape(record),
    type: readType(record),
    size: readNumber(record, "size", defaultDither.size),
    speed: readNumber(record, "speed", defaultDither.speed),
    frame: readNumber(record, "frame", defaultDither.frame),
    fit: readFit(record),
    scale: readNumber(record, "scale", defaultDither.scale),
    rotation: readNumber(record, "rotation", defaultDither.rotation),
    originX: readNumber(record, "originX", defaultDither.originX),
    originY: readNumber(record, "originY", defaultDither.originY),
    offsetX: readNumber(record, "offsetX", defaultDither.offsetX),
    offsetY: readNumber(record, "offsetY", defaultDither.offsetY),
    worldWidth: readNumber(record, "worldWidth", defaultDither.worldWidth),
    worldHeight: readNumber(record, "worldHeight", defaultDither.worldHeight),
    minPixelRatio: readNumber(record, "minPixelRatio", defaultDither.minPixelRatio),
    maxPixelCount: readNumber(record, "maxPixelCount", defaultDither.maxPixelCount),
  };
}

/**
 * Map resolved settings onto the fragment-shader uniforms Paper expects.
 * The return type is what `ShaderMount` accepts. `satisfies` keeps the field list checked.
 */
export function ditherUniforms(settings: ResolvedDither): ShaderMountUniforms {
  const uniforms = {
    u_colorBack: getShaderColorFromString(settings.colorBack),
    u_colorFront: getShaderColorFromString(settings.colorFront),
    u_shape: DitheringShapes[settings.shape],
    u_type: DitheringTypes[settings.type],
    u_pxSize: settings.size,
    u_fit: ShaderFitOptions[settings.fit],
    u_scale: settings.scale,
    u_rotation: settings.rotation,
    u_offsetX: settings.offsetX,
    u_offsetY: settings.offsetY,
    u_originX: settings.originX,
    u_originY: settings.originY,
    u_worldWidth: settings.worldWidth,
    u_worldHeight: settings.worldHeight,
  } satisfies DitheringUniforms;
  return uniforms;
}

/** Animation speed after the user's reduced-motion setting. A static frame still draws. */
export function playbackSpeed(speed: number, reducedMotion: boolean): number {
  return reducedMotion ? 0 : speed;
}

function isDitheringShape(value: unknown): value is DitheringShape {
  return typeof value === "string" && value in DitheringShapes;
}

function isDitheringType(value: unknown): value is DitheringType {
  return typeof value === "string" && value in DitheringTypes;
}

function isShaderFit(value: unknown): value is ShaderFit {
  return typeof value === "string" && value in ShaderFitOptions;
}

function writeNumber(record: Record<string, string | number>, key: string, value: number | undefined): void {
  if (typeof value === "number" && Number.isFinite(value)) record[key] = value;
}

function readPassedString(value: string | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function toRecord(input: unknown): object | undefined {
  if (typeof input === "string") {
    try {
      return toRecord(JSON.parse(input));
    } catch {
      return undefined;
    }
  }
  if (typeof input === "object" && input !== null && !Array.isArray(input)) return input;
  return undefined;
}

function readField(record: object, key: string): unknown {
  if (!(key in record)) return undefined;
  return Reflect.get(record, key);
}

function readString(record: object, key: string, fallback: string): string {
  const value = readField(record, key);
  return typeof value === "string" ? value : fallback;
}

function readNumber(record: object, key: string, fallback: number): number {
  const value = readField(record, key);
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readShape(record: object): DitheringShape {
  const value = readField(record, "shape");
  return isDitheringShape(value) ? value : defaultDither.shape;
}

function readType(record: object): DitheringType {
  const value = readField(record, "type");
  return isDitheringType(value) ? value : defaultDither.type;
}

function readFit(record: object): ShaderFit {
  const value = readField(record, "fit");
  return isShaderFit(value) ? value : defaultDither.fit;
}
