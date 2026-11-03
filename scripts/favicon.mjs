import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const root = new URL('../', import.meta.url);
const size = 32;
const blue = [0, 178, 255];
const bayer = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

// Light a sphere from the upper left, then quantize it to two colors.
const grid = Array.from({ length: size }, (_, y) =>
  Array.from({ length: size }, (_, x) => {
    const nx = (x + 0.5 - size / 2) / 13;
    const ny = (y + 0.5 - size / 2) / 13;
    const radiusSquared = nx * nx + ny * ny;
    if (radiusSquared > 1) return false;
    const nz = Math.sqrt(1 - radiusSquared);
    const light = Math.max(0, -0.64 * nx - 0.48 * ny + 0.6 * nz);
    const brightness = 0.075 + 0.925 * light ** 1.15;
    return brightness > (bayer[y % 4][x % 4] + 0.5) / 16;
  }),
);

// Merge adjacent blue pixels into horizontal SVG rectangles.
function svg() {
  const runs = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!grid[y][x]) continue;
      const start = x;
      while (x + 1 < size && grid[y][x + 1]) x++;
      runs.push(`<rect x="${start}" y="${y}" width="${x - start + 1}" height="1"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges"><rect width="32" height="32" fill="#000000"/><g fill="#00b2ff">${runs.join('')}</g></svg>\n`;
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

// Sample pixel centers for crisp resizing, with an opaque black background.
function png(width) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(width, 4);
  header[8] = 8;
  header[9] = 2; // RGB, no alpha.
  const rows = Buffer.alloc(width * (1 + width * 3));
  for (let y = 0; y < width; y++) {
    for (let x = 0; x < width; x++) {
      // Alternate samples at 16px so the Bayer matrix does not alias to one phase.
      const sourceX = width === 16 ? x * 2 + x % 2 : Math.floor((x + 0.5) * size / width);
      const sourceY = width === 16 ? y * 2 + y % 2 : Math.floor((y + 0.5) * size / width);
      if (grid[sourceY][sourceX]) {
        rows.set(blue, y * (1 + width * 3) + 1 + x * 3);
      }
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
    directory[entry] = width;
    directory[entry + 1] = width;
    directory.writeUInt16LE(1, entry + 4);
    directory.writeUInt16LE(24, entry + 6);
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
const png32 = png(32);
const files = [
  ['site/public/favicon.svg', art],
  ['site/public/favicon-32.png', png32],
  ['site/public/apple-touch-icon.png', png(180)],
  ['site/public/favicon.ico', ico([{ width: 16, data: png(16) }, { width: 32, data: png32 }])],
  ['assets/icon.svg', art],
];
for (const [path, data] of files) {
  await writeFile(new URL(path, root), data);
  console.log(`Wrote ${fileURLToPath(new URL(path, root))}`);
}
