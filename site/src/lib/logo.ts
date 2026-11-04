/** Geometry shared by the dither fade tile logo and scripts/favicon.mjs (which duplicates it, since plain node cannot import TS). */
export const LOGO_BAYER2 = [
  [0, 2],
  [3, 1],
] as const;

export const LOGO_TILE = 32;
export const LOGO_RADIUS = 7;
export const LOGO_BG = "#00131f";
export const LOGO_INK = "#00b2ff";
export const LOGO_HI = "#d6efff";

export interface LogoCell {
  x: number;
  y: number;
  lit: boolean;
  /** Highlight cells: lit squares in the solid top-left corner. */
  hi: boolean;
}

/**
 * Left-to-right ordered-dither ramp in four bands on an 8x8 grid.
 * `band = floor(x / 2)` gives level 4, 3, 2, 1: columns 0-1 solid,
 * 2-3 three quarters, 4-5 a checkerboard, 6-7 one quarter.
 */
export function logoCells(): LogoCell[] {
  const cells: LogoCell[] = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const level = 4 - Math.floor(x / 2);
      const lit = LOGO_BAYER2[y % 2][x % 2] < level;
      cells.push({ x, y, lit, hi: lit && x < 2 && y < 2 });
    }
  }
  return cells;
}

/** Box for a lit cell: pitch 4 in the 32-unit viewBox, square 3 at +0.5. */
export function logoCellBox(x: number, y: number): { x: number; y: number; size: number } {
  return { x: x * 4 + 0.5, y: y * 4 + 0.5, size: 3 };
}
