/** Ordered-dither settings for the effect engine in mount-ordered-dither.ts. */

import { effects, type EffectName } from "./effects";

export type Rgba = [number, number, number, number];

/** Bayer matrix width, or "noise" for a grainy interleaved-gradient pattern. */
export type DitherMatrix = 2 | 4 | 8 | "noise";

export interface OrderedDitherSettings {
  effect: EffectName;
  /** Every param the effect declares, resolved with its defaults. */
  params: Record<string, number>;
  palette: [Rgba, Rgba, ...Rgba[]];
  cell: number;
  matrix: DitherMatrix;
  speed: number;
  /** Image source, used by effects that sample `u_image`. */
  src: string;
}

export interface GlobePoint {
  /** 0 at the left of the globe box, 1 at the right. */
  x: number;
  /** 0 at the top of the globe box, 1 at the bottom. */
  y: number;
  visible: boolean;
}

const DEG = Math.PI / 180;

export const studioCities = [
  { name: "Warsaw", lat: 52.23, lon: 21.01 },
  { name: "Delhi", lat: 28.61, lon: 77.21 },
  { name: "Dubai", lat: 25.2, lon: 55.27 },
  { name: "Mumbai", lat: 19.08, lon: 72.88 },
] as const;

/**
 * Where a city sits on an orthographic globe.
 * `x` and `y` are fractions of the square that holds the circle.
 */
export function globePoint(lat: number, lon: number, centerLat: number, centerLon: number): GlobePoint {
  const latR = lat * DEG;
  const dLon = (lon - centerLon) * DEG;
  const lat0 = centerLat * DEG;
  const x = Math.cos(latR) * Math.sin(dLon);
  const y = Math.cos(lat0) * Math.sin(latR) - Math.sin(lat0) * Math.cos(latR) * Math.cos(dLon);
  const facing = Math.sin(lat0) * Math.sin(latR) + Math.cos(lat0) * Math.cos(latR) * Math.cos(dLon);
  return { x: (x + 1) / 2, y: (1 - y) / 2, visible: facing > 0.02 };
}

/** Encode props for the custom element. Keys are passed through as given. */
export function orderedDitherAttribute(props: Record<string, unknown>): string {
  return JSON.stringify(props);
}

/** Parse the data attribute. Bad values fall back to the effect's own defaults. */
export function parseOrderedDither(input: unknown): OrderedDitherSettings {
  const record = toRecord(input) ?? {};
  const effect = readEffect(record);
  const def = effects[effect];

  return {
    effect,
    params: readParams(record, def.params),
    palette: readPalette(record) ?? defaultPalette(def.palette),
    cell: Math.max(1, readNumber(record, "cell", 2)),
    matrix: readMatrix(record),
    speed: readSpeed(record, def.speed),
    src: readString(record, "src", ""),
  };
}

export function parseCssColor(input: string): Rgba | undefined {
  const value = input.trim().toLowerCase();
  if (value === "transparent") return [0, 0, 0, 0];
  if (!value.startsWith("#")) return undefined;
  const hex = value.slice(1);
  const doubled = hex.length === 3 || hex.length === 4 ? [...hex].map((char) => char + char).join("") : hex;
  const expanded = doubled.length === 6 ? `${doubled}ff` : doubled;
  if (!/^[0-9a-f]{8}$/.test(expanded)) return undefined;
  const channel = (start: number) => parseInt(expanded.slice(start, start + 2), 16) / 255;
  return [channel(0), channel(2), channel(4), channel(6)];
}

function isEffectName(value: unknown): value is EffectName {
  return typeof value === "string" && value in effects;
}

function readEffect(record: object): EffectName {
  const value = readField(record, "effect");
  return isEffectName(value) ? value : "gradient";
}

/** Keep only the params the effect declares, and only finite numbers. */
function readParams(record: object, defaults: Record<string, number>): Record<string, number> {
  const input = readField(record, "params");
  const params: Record<string, number> = {};
  for (const [key, fallback] of Object.entries(defaults)) {
    params[key] = fallback;
    if (typeof input === "object" && input !== null) {
      const value = readField(input, key);
      if (typeof value === "number" && Number.isFinite(value)) params[key] = value;
    }
  }
  return params;
}

function readPalette(record: object): OrderedDitherSettings["palette"] | undefined {
  const value = readField(record, "palette");
  if (!Array.isArray(value) || value.length < 2 || value.length > 8) return undefined;
  const colors: Rgba[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") return undefined;
    const color = parseCssColor(entry);
    if (color === undefined) return undefined;
    colors.push(color);
  }
  const [first, second, ...rest] = colors;
  if (first === undefined || second === undefined) return undefined;
  return [first, second, ...rest];
}

function defaultPalette(palette: readonly string[]): OrderedDitherSettings["palette"] {
  const colors = palette.map((hex) => parseCssColor(hex) ?? [0, 0, 0, 1] as Rgba);
  const [first, second, ...rest] = colors;
  return [first ?? [0, 0, 0, 1], second ?? [1, 1, 1, 1], ...rest];
}

function readMatrix(record: object): DitherMatrix {
  const value = readField(record, "matrix");
  if (value === 2 || value === 4 || value === 8 || value === "noise") return value;
  return 8;
}

function readSpeed(record: object, fallback: number): number {
  const value = readNumber(record, "speed", fallback);
  return value >= 0 ? value : fallback;
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
