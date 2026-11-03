import {
  DitheringTypes,
  ShaderFitOptions,
  defaultObjectSizing,
  getShaderColorFromString,
  type DitheringType,
  type ImageDitheringParams,
  type ImageDitheringUniforms,
  type ShaderFit,
  type ShaderMountUniforms,
} from "@paper-design/shaders";

/** Props for `<DitherImage />`, minus the image itself. Names match the Paper React component. */
export interface ImageDitherProps extends Omit<ImageDitheringParams, "image"> {
  /** Minimum device pixel ratio. Paper's default is 2. */
  minPixelRatio?: number;
  /**
   * Cap on physical pixels the shader will draw.
   * Paper's default is 1920 × 1080 × 4.
   */
  maxPixelCount?: number;
}

/** Settings after defaults and boundary checks. Every field is present. */
export interface ResolvedImageDither {
  colorBack: string;
  colorFront: string;
  colorHighlight: string;
  type: DitheringType;
  size: number;
  colorSteps: number;
  originalColors: boolean;
  inverted: boolean;
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

/** Paper's published image-dithering default preset, with cover fit so it fills its box like an `<img>`. */
export const defaultImageDither = {
  ...defaultObjectSizing,
  fit: "cover",
  speed: 0,
  frame: 0,
  colorBack: "#000c38",
  colorFront: "#94ffaf",
  colorHighlight: "#eaff94",
  type: "8x8",
  size: 2,
  colorSteps: 2,
  originalColors: false,
  inverted: false,
  minPixelRatio: 2,
  maxPixelCount: 1920 * 1080 * 4,
} satisfies ResolvedImageDither;

/**
 * Turn component props into the attribute the custom element reads.
 * Only known settings are kept, so `src`, `alt`, `class` and other HTML props stay out of the shader.
 */
export function imageDitherSettingsToAttribute(props: ImageDitherProps): string {
  const record: Record<string, string | number | boolean> = {};
  const colorBack = readPassedString(props.colorBack);
  const colorFront = readPassedString(props.colorFront);
  const colorHighlight = readPassedString(props.colorHighlight);
  if (colorBack !== undefined) record.colorBack = colorBack;
  if (colorFront !== undefined) record.colorFront = colorFront;
  if (colorHighlight !== undefined) record.colorHighlight = colorHighlight;
  if (isDitheringType(props.type)) record.type = props.type;
  if (isShaderFit(props.fit)) record.fit = props.fit;
  if (typeof props.originalColors === "boolean") record.originalColors = props.originalColors;
  if (typeof props.inverted === "boolean") record.inverted = props.inverted;
  writeNumber(record, "size", props.size);
  writeNumber(record, "colorSteps", props.colorSteps);
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
 * Parse props or the `data-dither` attribute. Bad values fall back to `defaultImageDither`
 * instead of reaching the shader.
 */
export function parseImageDitherSettings(input: unknown): ResolvedImageDither {
  const record = toRecord(input);
  if (record === undefined) return defaultImageDither;

  return {
    colorBack: readString(record, "colorBack", defaultImageDither.colorBack),
    colorFront: readString(record, "colorFront", defaultImageDither.colorFront),
    colorHighlight: readString(record, "colorHighlight", defaultImageDither.colorHighlight),
    type: readType(record),
    size: readNumber(record, "size", defaultImageDither.size),
    colorSteps: readNumber(record, "colorSteps", defaultImageDither.colorSteps),
    originalColors: readBoolean(record, "originalColors", defaultImageDither.originalColors),
    inverted: readBoolean(record, "inverted", defaultImageDither.inverted),
    speed: readNumber(record, "speed", defaultImageDither.speed),
    frame: readNumber(record, "frame", defaultImageDither.frame),
    fit: readFit(record),
    scale: readNumber(record, "scale", defaultImageDither.scale),
    rotation: readNumber(record, "rotation", defaultImageDither.rotation),
    originX: readNumber(record, "originX", defaultImageDither.originX),
    originY: readNumber(record, "originY", defaultImageDither.originY),
    offsetX: readNumber(record, "offsetX", defaultImageDither.offsetX),
    offsetY: readNumber(record, "offsetY", defaultImageDither.offsetY),
    worldWidth: readNumber(record, "worldWidth", defaultImageDither.worldWidth),
    worldHeight: readNumber(record, "worldHeight", defaultImageDither.worldHeight),
    minPixelRatio: readNumber(record, "minPixelRatio", defaultImageDither.minPixelRatio),
    maxPixelCount: readNumber(record, "maxPixelCount", defaultImageDither.maxPixelCount),
  };
}

/**
 * Map resolved settings and the loaded `<img>` onto the uniforms Paper expects.
 * ShaderMount turns the image element into a texture and sets `u_imageAspectRatio` itself.
 */
export function imageDitherUniforms(settings: ResolvedImageDither, image: HTMLImageElement): ShaderMountUniforms {
  const uniforms = {
    u_image: image,
    u_colorBack: getShaderColorFromString(settings.colorBack),
    u_colorFront: getShaderColorFromString(settings.colorFront),
    u_colorHighlight: getShaderColorFromString(settings.colorHighlight),
    u_type: DitheringTypes[settings.type],
    u_pxSize: settings.size,
    u_colorSteps: settings.colorSteps,
    u_originalColors: settings.originalColors,
    u_inverted: settings.inverted,
    u_fit: ShaderFitOptions[settings.fit],
    u_scale: settings.scale,
    u_rotation: settings.rotation,
    u_offsetX: settings.offsetX,
    u_offsetY: settings.offsetY,
    u_originX: settings.originX,
    u_originY: settings.originY,
    u_worldWidth: settings.worldWidth,
    u_worldHeight: settings.worldHeight,
  } satisfies ImageDitheringUniforms;
  return uniforms;
}

/** Pull a URL out of `src`, which accepts a plain path or an Astro image import. */
export function imageSource(src: string | { src: string }): string {
  return typeof src === "string" ? src : src.src;
}

function isDitheringType(value: unknown): value is DitheringType {
  return typeof value === "string" && value in DitheringTypes;
}

function isShaderFit(value: unknown): value is ShaderFit {
  return typeof value === "string" && value in ShaderFitOptions;
}

function writeNumber(record: Record<string, string | number | boolean>, key: string, value: number | undefined): void {
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

function readBoolean(record: object, key: string, fallback: boolean): boolean {
  const value = readField(record, key);
  return typeof value === "boolean" ? value : fallback;
}

function readType(record: object): DitheringType {
  const value = readField(record, "type");
  return isDitheringType(value) ? value : defaultImageDither.type;
}

function readFit(record: object): ShaderFit {
  const value = readField(record, "fit");
  return isShaderFit(value) ? value : defaultImageDither.fit;
}
