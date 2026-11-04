import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

// "Dither fade tile" mark: a left-to-right ordered-dither ramp in four bands
// (solid, 3/4, checkerboard, 1/4) on a very dark blue rounded square. The
// cell math is duplicated in site/src/lib/logo.ts (plain node cannot import
// the TS file).
const root = new URL('../', import.meta.url);
const TILE = 32;
const BG = [0x00, 0x13, 0x1f];
const INK = [0x00, 0xb2, 0xff];
const HI = [0xd6, 0xef, 0xff];
const BAYER2 = [
  [0, 2],
  [3, 1],
];

// 8x8 cells: band = floor(x / 2), level = 4 - band. Lit when bayer < level.
// Columns 0-1 are solid, 2-3 three quarters, 4-5 a checkerboard, 6-7 a
// quarter. Only the four lit cells in the top-left corner are highlighted.
function cells() {
  const out = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const level = 4 - Math.floor(x / 2);
      const lit = BAYER2[y % 2][x % 2] < level;
      out.push({ x, y, lit, hi: lit && x < 2 && y < 2 });
    }
  }
  return out;
}
const GRID = cells();

// SVG for >=24px: cell pitch 4 in a 32-unit viewBox, square 3 at +0.5, rx 0.5.
// The grid fills the tile and the clip trims the corner cells.
function svg() {
  const rects = GRID.filter((c) => c.lit)
    .map(
      (c) =>
        `<rect x="${c.x * 4 + 0.5}" y="${c.y * 4 + 0.5}" width="3" height="3" rx="0.5" fill="${c.hi ? '#d6efff' : '#00b2ff'}"/>`,
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><clipPath id="tile"><rect width="32" height="32" rx="7"/></clipPath></defs><rect width="32" height="32" rx="7" fill="#00131f"/><g clip-path="url(#tile)">${rects}</g></svg>\n`;
}

// PNG chunks use CRC-32 over the chunk type and payload.
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (const byte of body) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, body, checksum]);
}

function inRoundRect(x, y, half, r) {
  const qx = Math.max(Math.abs(x - half) - (half - r), 0);
  const qy = Math.max(Math.abs(y - half) - (half - r), 0);
  return qx * qx + qy * qy <= r * r;
}

// Rasterize the mark to RGBA. In pixel space each of the 8x8 cells spans
// px/8 pixels; the lit square covers the middle 75% of the cell (3px at
// 32px, 1.5px at 16px evaluated by sampling). `r` is the corner radius in
// pixels; `opaque` fills the whole square for iOS.
function png(px, r, opaque) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(px, 0);
  header.writeUInt32BE(px, 4);
  header[8] = 8;
  header[9] = 6; // RGBA.
  const pitch = px / 8;
  const size = pitch * 0.75;
  const inset = (pitch - size) / 2;
  const SUB = 4;
  const rows = Buffer.alloc(px * (1 + px * 4));
  for (let y = 0; y < px; y++) {
    for (let x = 0; x < px; x++) {
      let R = 0, G = 0, B = 0, A = 0;
      for (let sy = 0; sy < SUB; sy++) {
        for (let sx = 0; sx < SUB; sx++) {
          const ux = x + (sx + 0.5) / SUB;
          const uy = y + (sy + 0.5) / SUB;
          if (!opaque && !inRoundRect(ux, uy, px / 2, r)) continue;
          const gx = Math.min(7, Math.floor(ux / pitch));
          const gy = Math.min(7, Math.floor(uy / pitch));
          const cell = GRID[gy * 8 + gx];
          const inside =
            cell.lit && ux >= gx * pitch + inset && ux < gx * pitch + inset + size &&
            uy >= gy * pitch + inset && uy < gy * pitch + inset + size;
          const c = inside ? (cell.hi ? HI : INK) : BG;
          R += c[0]; G += c[1]; B += c[2]; A += 255;
        }
      }
      const samples = SUB * SUB;
      const off = y * (1 + px * 4) + 1 + x * 4;
      rows[off] = Math.round(R / samples);
      rows[off + 1] = Math.round(G / samples);
      rows[off + 2] = Math.round(B / samples);
      rows[off + 3] = opaque ? 255 : Math.round(A / samples);
    }
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// At 16px every cell is exactly 2x2 pixels, lit or dark, no gaps.
function png16(r) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(16, 0);
  header.writeUInt32BE(16, 4);
  header[8] = 8;
  header[9] = 6;
  const SUB = 4;
  const rows = Buffer.alloc(16 * (1 + 16 * 4));
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const cell = GRID[Math.floor(y / 2) * 8 + Math.floor(x / 2)];
      let A = 0;
      for (let sy = 0; sy < SUB; sy++) {
        for (let sx = 0; sx < SUB; sx++) {
          if (inRoundRect(x + (sx + 0.5) / SUB, y + (sy + 0.5) / SUB, 8, r)) A += 255;
        }
      }
      const c = cell.lit ? (cell.hi ? HI : INK) : BG;
      const off = y * (1 + 16 * 4) + 1 + x * 4;
      rows[off] = c[0];
      rows[off + 1] = c[1];
      rows[off + 2] = c[2];
      rows[off + 3] = Math.round(A / (SUB * SUB));
    }
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Pack PNG payloads behind standard ICO directory entries.
function ico(images) {
  const directory = Buffer.alloc(6 + images.length * 16);
  directory.writeUInt16LE(1, 2);
  directory.writeUInt16LE(images.length, 4);
  let offset = directory.length;
  images.forEach(({ width, data }, index) => {
    const entry = 6 + index * 16;
    directory[entry] = width === 256 ? 0 : width;
    directory[entry + 1] = width === 256 ? 0 : width;
    directory.writeUInt16LE(1, entry + 4);
    directory.writeUInt16LE(32, entry + 6);
    directory.writeUInt32LE(data.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([directory, ...images.map(({ data }) => data)]);
}

for (const folder of ['site/public/', 'assets/']) {
  await mkdir(new URL(folder, root), { recursive: true });
}
const art = svg();
const files = [
  ['site/public/favicon.svg', art],
  ['site/public/logo.svg', art],
  ['site/public/favicon-32.png', png(32, 7, false)],
  ['site/public/apple-touch-icon.png', png(180, 39, true)],
  ['site/public/favicon.ico', ico([
    { width: 16, data: png16(3) },
    { width: 32, data: png(32, 7, false) },
  ])],
  ['assets/icon.svg', art],
];
for (const [path, data] of files) {
  await writeFile(new URL(path, root), data);
  console.log(`Wrote ${fileURLToPath(new URL(path, root))}`);
}
